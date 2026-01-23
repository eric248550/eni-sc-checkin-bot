import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { DAILY_TARGETS, formatDate } from './constants.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Count new wallets (received_amount = 0) for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Count of new wallets (active and excess)
 */
async function countNewWalletsForDate(date) {
  // Count active new wallets (note != 'not on whitelist')
  const activeQuery = `
    SELECT COUNT(*) as count
    FROM kaia_2048_users ku
    INNER JOIN eni_wallet ew ON ku.eni_wallet_address = ew.address
    WHERE DATE(ku.connected_at) = DATE($1)
      AND ku.platform = 'tofu'
      AND ku.note != 'not on whitelist'
      AND ew.received_amount = 0
  `;
  
  // Count excess new wallets (note = 'not on whitelist')
  const excessQuery = `
    SELECT COUNT(*) as count
    FROM kaia_2048_users ku
    INNER JOIN eni_wallet ew ON ku.eni_wallet_address = ew.address
    WHERE DATE(ku.connected_at) = DATE($1)
      AND ku.platform = 'tofu'
      AND ku.note = 'not on whitelist'
      AND ew.received_amount = 0
  `;
  
  try {
    const [activeResult, excessResult] = await Promise.all([
      pool.query(activeQuery, [date]),
      pool.query(excessQuery, [date])
    ]);
    
    return {
      active: parseInt(activeResult.rows[0].count),
      excess: parseInt(excessResult.rows[0].count)
    };
  } catch (error) {
    console.error(`Error counting new wallets for ${date}:`, error);
    throw error;
  }
}


/**
 * Exchange wallets between two dates
 * - Move active wallets (note != 'not on whitelist') from surplusDate to shortageDate
 * - Move reserve wallets (note = 'not on whitelist') from shortageDate to surplusDate
 * @param {string} surplusDate - Date with surplus active wallets
 * @param {string} shortageDate - Date with shortage of active wallets
 * @param {number} count - Number of wallets to exchange
 * @returns {Promise<Object>} Result with counts
 */
async function exchangeWallets(surplusDate, shortageDate, count) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Step 1: Move active wallets from surplusDate to shortageDate
    const moveActiveQuery = `
      UPDATE kaia_2048_users ku
      SET connected_at = $1
      FROM eni_wallet ew
      WHERE ku.eni_wallet_address = ew.address
        AND ku.id IN (
          SELECT ku2.id
          FROM kaia_2048_users ku2
          INNER JOIN eni_wallet ew2 ON ku2.eni_wallet_address = ew2.address
          WHERE DATE(ku2.connected_at) = DATE($2)
            AND ku2.platform = 'tofu'
            AND ku2.note != 'not on whitelist'
            AND ew2.received_amount = 0
          ORDER BY ku2.id
          LIMIT $3
        )
      RETURNING ku.id
    `;
    const activeResult = await client.query(moveActiveQuery, [shortageDate, surplusDate, count]);
    const activeMoved = activeResult.rowCount;
    
    // Step 2: Move reserve wallets from shortageDate to surplusDate
    const moveReserveQuery = `
      UPDATE kaia_2048_users ku
      SET connected_at = $1
      FROM eni_wallet ew
      WHERE ku.eni_wallet_address = ew.address
        AND ku.id IN (
          SELECT ku2.id
          FROM kaia_2048_users ku2
          INNER JOIN eni_wallet ew2 ON ku2.eni_wallet_address = ew2.address
          WHERE DATE(ku2.connected_at) = DATE($2)
            AND ku2.platform = 'tofu'
            AND ku2.note = 'not on whitelist'
            AND ew2.received_amount = 0
          ORDER BY ku2.id
          LIMIT $3
        )
      RETURNING ku.id
    `;
    const reserveResult = await client.query(moveReserveQuery, [surplusDate, shortageDate, count]);
    const reserveMoved = reserveResult.rowCount;
    
    await client.query('COMMIT');
    
    return {
      activeMoved,
      reserveMoved,
      success: activeMoved === count && reserveMoved === count
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error exchanging wallets between ${surplusDate} and ${shortageDate}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Main function to balance wallet distribution
 */
async function balanceWalletDates() {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 新钱包分配平衡检查 (只借满足 newWallets 后多余的钱包)');
  console.log('='.repeat(80));
  
  try {
    // First pass: Check all dates and identify shortages and excesses
    const dateAnalysis = [];
    
    for (const [date, target] of Object.entries(DAILY_TARGETS)) {
      const newWallets = await countNewWalletsForDate(date);
      
      // Calculate wallet status based on ACTIVE wallets only
      const newWalletTotal = newWallets.active + newWallets.excess;
      // 激活钱包的缺口（需要从其他日期借入激活钱包）
      const activeShortage = Math.max(0, target.newWallets - newWallets.active);
      // 激活钱包的盈余（可以借出给其他日期）
      const activeSurplus = Math.max(0, newWallets.active - target.newWallets);
      // 可用于交换的储备钱包数（用于换回激活钱包）
      const availableReserve = newWallets.excess;
      
      dateAnalysis.push({
        date,
        target: target,
        newWallets: {
          active: newWallets.active,
          reserve: newWallets.excess,
          total: newWalletTotal,
          required: target.newWallets,
          activeShortage: activeShortage,
          activeSurplus: activeSurplus,
          availableReserve: availableReserve
        }
      });
      
      let statusEmoji = '✅';
      if (activeShortage > 0) {
        if (availableReserve >= activeShortage) {
          statusEmoji = '⚠️'; // 缺少激活钱包，但有足够储备可以换
        } else {
          statusEmoji = '❌'; // 缺少激活钱包，且储备不足
        }
      } else if (activeSurplus > 0) {
        statusEmoji = '💰'; // 有多余的激活钱包可以借出
      }
      
      console.log(`\n${statusEmoji} ${date}:`);
      console.log(`   需要激活钱包: ${target.newWallets.toLocaleString()}`);
      console.log(`   激活钱包: ${newWallets.active.toLocaleString()} (note != 'not on whitelist')`);
      console.log(`   储备钱包: ${newWallets.excess.toLocaleString()} (note = 'not on whitelist')`);
      console.log(`   总计: ${newWalletTotal.toLocaleString()}`);
      
      if (activeShortage > 0) {
        console.log(`   ⚠️  激活钱包缺口: ${activeShortage.toLocaleString()}`);
        if (availableReserve >= activeShortage) {
          console.log(`   ✓  有足够储备钱包可以交换`);
        } else {
          console.log(`   ❌  储备钱包也不足 (还缺 ${(activeShortage - availableReserve).toLocaleString()})`);
        }
      } else if (activeSurplus > 0) {
        console.log(`   💰 可借出激活钱包: ${activeSurplus.toLocaleString()}`);
      }
    }
    
    // Second pass: Exchange wallets between dates
    console.log('\n' + '='.repeat(80));
    console.log('🔄 钱包交换平衡 (激活钱包 ↔ 储备钱包)');
    console.log('='.repeat(80));
    
    // 找出有激活钱包盈余的日期（可以借出激活钱包）
    const activeSurplus = dateAnalysis
      .filter(d => d.newWallets.activeSurplus > 0)
      .sort((a, b) => b.newWallets.activeSurplus - a.newWallets.activeSurplus);
    
    // 找出缺少激活钱包但有储备钱包的日期（按日期顺序，优先补充前面的）
    const activeShortage = dateAnalysis
      .filter(d => d.newWallets.activeShortage > 0 && d.newWallets.availableReserve > 0)
      .sort((a, b) => a.date.localeCompare(b.date)); // 按日期排序，优先前面的
    
    if (activeShortage.length === 0) {
      console.log('\n✅ 所有日期的激活钱包数量都已满足！');
    } else if (activeSurplus.length === 0) {
      console.log('\n❌ 错误：没有可借出的激活钱包！');
      console.log('   所有日期都需要先满足自己的激活钱包需求');
    } else {
      let totalExchanged = 0;
      
      for (const shortage of activeShortage) {
        let remainingShortage = shortage.newWallets.activeShortage;
        const maxCanExchange = Math.min(remainingShortage, shortage.newWallets.availableReserve);
        
        console.log(`\n📅 处理 ${shortage.date}:`);
        console.log(`   需要激活钱包: ${remainingShortage.toLocaleString()}`);
        console.log(`   可用储备钱包交换: ${shortage.newWallets.availableReserve.toLocaleString()}`);
        console.log(`   实际可交换: ${maxCanExchange.toLocaleString()}`);
        
        let exchangedForThisDate = 0;
        
        for (const surplus of activeSurplus) {
          if (exchangedForThisDate >= maxCanExchange) break;
          if (surplus.newWallets.activeSurplus <= 0) continue;
          
          const toExchange = Math.min(
            maxCanExchange - exchangedForThisDate,
            surplus.newWallets.activeSurplus
          );
          
          console.log(`   🔄 与 ${surplus.date} 交换 ${toExchange.toLocaleString()} 个钱包...`);
          console.log(`      → 借入 ${toExchange.toLocaleString()} 个激活钱包 (note != 'not on whitelist')`);
          console.log(`      ← 借出 ${toExchange.toLocaleString()} 个储备钱包 (note = 'not on whitelist')`);
          
          const result = await exchangeWallets(surplus.date, shortage.date, toExchange);
          
          if (result.success) {
            console.log(`   ✅ 成功交换 ${result.activeMoved.toLocaleString()} 个钱包`);
            exchangedForThisDate += result.activeMoved;
            surplus.newWallets.activeSurplus -= result.activeMoved;
            totalExchanged += result.activeMoved;
          } else {
            console.log(`   ⚠️  交换不完整: 激活=${result.activeMoved}, 储备=${result.reserveMoved}`);
          }
        }
        
        if (exchangedForThisDate < remainingShortage) {
          console.log(`   ⚠️  仍然缺少 ${(remainingShortage - exchangedForThisDate).toLocaleString()} 个激活钱包`);
        }
      }
      
      console.log('\n' + '='.repeat(80));
      console.log(`✅ 交换完成 - 总共交换: ${totalExchanged.toLocaleString()} 个钱包`);
      console.log('='.repeat(80));
    }
    
    // Third pass: Verify final state
    console.log('\n' + '='.repeat(80));
    console.log('📊 最终验证 (激活钱包数量)');
    console.log('='.repeat(80));
    
    let allPassing = true;
    
    for (const [date, target] of Object.entries(DAILY_TARGETS)) {
      const newWallets = await countNewWalletsForDate(date);
      
      const passing = newWallets.active >= target.newWallets;
      allPassing = allPassing && passing;
      
      const statusEmoji = passing ? '✅' : '❌';
      const surplus = newWallets.active - target.newWallets;
      
      console.log(`${statusEmoji} ${date}:`);
      console.log(`   激活钱包: ${newWallets.active.toLocaleString()} / ${target.newWallets.toLocaleString()}`);
      console.log(`   储备钱包: ${newWallets.excess.toLocaleString()}`);
      console.log(`   总计: ${(newWallets.active + newWallets.excess).toLocaleString()}`);
      
      if (passing) {
        if (surplus > 0) {
          console.log(`   💰 盈余: ${surplus.toLocaleString()} 个激活钱包`);
        } else {
          console.log(`   ✓ 刚好满足`);
        }
      } else {
        console.log(`   ❌ 不足: ${(-surplus).toLocaleString()} 个激活钱包`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    if (allPassing) {
      console.log('🎉 所有日期的激活钱包数量都已满足 newWallets 需求！');
    } else {
      console.log('⚠️  部分日期的激活钱包仍然不足');
      console.log('   需要更多有激活钱包盈余的日期来交换');
    }
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Error during balance operation:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('\n✅ 数据库连接已关闭');
  }
}

// Run the balance check
balanceWalletDates().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

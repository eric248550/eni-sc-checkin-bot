import { ethers } from 'ethers';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool settings to avoid blocking DB
  max: 5, // Max 5 connections (won't hog all DB connections)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const CHAIN_ID = 173; // ENI mainnet
const IS_TESTNET = false;

// SAFE BATCH SIZES (choose based on your needs):
// - 100: Ultra-safe, minimal DB blocking, ~10-30 min for 1M wallets
// - 250: Very safe, low DB impact, ~5-15 min for 1M wallets
// - 500: Safe default, balanced, ~3-10 min for 1M wallets
// - 1000: Higher throughput, slight DB load, ~2-8 min for 1M wallets
// - 2000+: Fast but may block other queries during batch commits
const BATCH_SIZE = 1000; // Recommended: 500 for safety

// Delay between batches (ms) - gives DB time to breathe
const BATCH_DELAY = 200; // 500ms = 0.5 second pause between batches

/**
 * Generate a new wallet
 */
function createWallet() {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic
  };
}

/**
 * Get users where eni_wallet_address is null and platform = 'tofu'
 */
async function getTofuUsersWithoutWallet() {
  const query = `
    SELECT id, platform
    FROM kaia_2048_users
    WHERE eni_wallet_address IS NULL 
      AND platform = 'tofu'
    ORDER BY id
  `;
  
  try {
    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} tofu users without wallet`);
    return result.rows;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

/**
 * Insert wallet into eni_wallet table (single)
 */
async function insertWallet(walletData) {
  const query = `
    INSERT INTO eni_wallet (
      id,
      address,
      private_key,
      chain_id,
      is_testnet,
      created_at,
      has_incoming,
      received_amount,
      has_payment,
      has_game_record
    )
    VALUES (
      gen_random_uuid(),
      $1,
      $2,
      $3,
      $4,
      NOW(),
      FALSE,
      0,
      FALSE,
      FALSE
    )
    RETURNING id, address
  `;
  
  try {
    const result = await pool.query(query, [
      walletData.address,
      walletData.privateKey,
      CHAIN_ID,
      IS_TESTNET
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('Error inserting wallet:', error);
    throw error;
  }
}

/**
 * Batch insert wallets into eni_wallet table
 */
async function insertWalletsBatch(walletsData) {
  if (walletsData.length === 0) return [];
  
  // Build VALUES clause dynamically
  const values = [];
  const params = [];
  let paramIndex = 1;
  
  for (let i = 0; i < walletsData.length; i++) {
    const wallet = walletsData[i];
    values.push(`(gen_random_uuid(), $${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, NOW(), FALSE, 0, FALSE, FALSE)`);
    params.push(wallet.address, wallet.privateKey, CHAIN_ID, IS_TESTNET);
    paramIndex += 4;
  }
  
  const query = `
    INSERT INTO eni_wallet (
      id,
      address,
      private_key,
      chain_id,
      is_testnet,
      created_at,
      has_incoming,
      received_amount,
      has_payment,
      has_game_record
    )
    VALUES ${values.join(', ')}
    RETURNING id, address
  `;
  
  try {
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error batch inserting wallets:', error);
    throw error;
  }
}

/**
 * Batch update users' eni_wallet_address
 */
async function updateUserWalletAddressesBatch(userWalletPairs) {
  if (userWalletPairs.length === 0) return;
  
  // Build UPDATE query with CASE statement for batch update
  const userIds = userWalletPairs.map(p => p.userId);
  const caseStatements = userWalletPairs.map((p, i) => 
    `WHEN $${i * 2 + 2} THEN $${i * 2 + 3}`
  ).join(' ');
  
  const params = [userIds];
  userWalletPairs.forEach(p => {
    params.push(p.userId, p.walletAddress);
  });
  
  const query = `
    UPDATE kaia_2048_users
    SET eni_wallet_address = CASE id
      ${caseStatements}
    END
    WHERE id = ANY($1::uuid[])
  `;
  
  try {
    await pool.query(query, params);
  } catch (error) {
    console.error('Error batch updating user wallet addresses:', error);
    throw error;
  }
}

/**
 * Update user's eni_wallet_address
 */
async function updateUserWalletAddress(userId, walletAddress) {
  const query = `
    UPDATE kaia_2048_users
    SET eni_wallet_address = $1
    WHERE id = $2
  `;
  
  try {
    await pool.query(query, [walletAddress, userId]);
  } catch (error) {
    console.error('Error updating user wallet address:', error);
    throw error;
  }
}

/**
 * Main function to create wallets and bind to users (BATCH MODE)
 */
async function main() {
  console.log('🚀 Starting wallet creation and binding for tofu users...\n');
  console.log('⚙️  Configuration:');
  console.log(`   Batch size: ${BATCH_SIZE} wallets per batch`);
  console.log(`   Batch delay: ${BATCH_DELAY}ms between batches`);
  console.log(`   Max DB connections: ${pool.options.max || 10}`);
  console.log(`   Transaction isolation: READ COMMITTED (low lock contention)\n`);
  
  try {
    // Get all tofu users without wallet
    const users = await getTofuUsersWithoutWallet();
    
    if (users.length === 0) {
      console.log('✅ No users found without wallet. All done!');
      return;
    }
    
    console.log(`📝 Processing ${users.length.toLocaleString()} users in batches...\n`);
    
    const totalUsers = users.length;
    const totalBatches = Math.ceil(totalUsers / BATCH_SIZE);
    let successCount = 0;
    let errorCount = 0;
    const startTime = Date.now();
    
    // Process in batches
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchStart = batchNum * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, totalUsers);
      const batchUsers = users.slice(batchStart, batchEnd);
      const batchSize = batchUsers.length;
      
      console.log(`\n📦 Batch ${batchNum + 1}/${totalBatches} (${batchStart + 1}-${batchEnd} of ${totalUsers})`);
      
      try {
        // Start transaction
        const client = await pool.connect();
        
        try {
          // Use READ COMMITTED isolation to minimize lock contention
          await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
          
          // Generate wallets for this batch
          console.log(`   🔑 Generating ${batchSize} wallets...`);
          const wallets = [];
          for (let i = 0; i < batchSize; i++) {
            wallets.push(createWallet());
          }
          
          // Batch insert wallets
          console.log(`   💾 Inserting ${batchSize} wallets into eni_wallet...`);
          const insertedWallets = await client.query({
            text: (() => {
              const values = [];
              const params = [];
              let paramIndex = 1;
              
              for (let i = 0; i < wallets.length; i++) {
                const wallet = wallets[i];
                values.push(`(gen_random_uuid(), $${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, NOW(), FALSE, 0, FALSE, FALSE)`);
                params.push(wallet.address, wallet.privateKey, CHAIN_ID, IS_TESTNET);
                paramIndex += 4;
              }
              
              return `
                INSERT INTO eni_wallet (
                  id, address, private_key, chain_id, is_testnet,
                  created_at, has_incoming, received_amount, has_payment, has_game_record
                )
                VALUES ${values.join(', ')}
                RETURNING id, address
              `;
            })(),
            values: (() => {
              const params = [];
              for (let i = 0; i < wallets.length; i++) {
                params.push(wallets[i].address, wallets[i].privateKey, CHAIN_ID, IS_TESTNET);
              }
              return params;
            })()
          });
          
          // Batch update users
          console.log(`   🔗 Updating ${batchSize} users with wallet addresses...`);
          const userIds = batchUsers.map(u => u.id);
          const caseStatements = batchUsers.map((u, i) => 
            `WHEN $${i * 2 + 2}::uuid THEN $${i * 2 + 3}`
          ).join(' ');
          
          const updateParams = [userIds];
          batchUsers.forEach((u, i) => {
            updateParams.push(u.id, wallets[i].address);
          });
          
          await client.query({
            text: `
              UPDATE kaia_2048_users
              SET eni_wallet_address = CASE id
                ${caseStatements}
              END
              WHERE id = ANY($1::uuid[])
            `,
            values: updateParams
          });
          
          await client.query('COMMIT');
          
          successCount += batchSize;
          
          // Calculate progress
          const progress = ((batchEnd / totalUsers) * 100).toFixed(1);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (successCount / (Date.now() - startTime) * 1000).toFixed(0);
          const eta = ((totalUsers - successCount) / rate).toFixed(0);
          
          console.log(`   ✅ Batch completed successfully`);
          console.log(`   📊 Progress: ${progress}% (${successCount.toLocaleString()}/${totalUsers.toLocaleString()})`);
          console.log(`   ⏱️  Time: ${elapsed}s | Rate: ${rate} wallets/sec | ETA: ${eta}s`);
          
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`   ❌ Batch ${batchNum + 1} failed:`, error.message);
          errorCount += batchSize;
        } finally {
          client.release();
        }
        
      } catch (error) {
        console.error(`   ❌ Error getting database client:`, error.message);
        errorCount += batchSize;
      }
      
      // Delay between batches to avoid overwhelming the database
      // This gives other DB operations time to execute
      if (batchNum < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgRate = (successCount / (Date.now() - startTime) * 1000).toFixed(0);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Summary:');
    console.log(`   Total users: ${totalUsers.toLocaleString()}`);
    console.log(`   ✅ Success: ${successCount.toLocaleString()}`);
    console.log(`   ❌ Errors: ${errorCount.toLocaleString()}`);
    console.log(`   ⏱️  Total time: ${totalTime}s`);
    console.log(`   🚀 Average rate: ${avgRate} wallets/sec`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await pool.end();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
main();

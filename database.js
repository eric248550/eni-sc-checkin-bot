import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Get eligible wallets for check-in (OLD FUNCTION - DEPRECATED)
 * Criteria: 
 * - has_payment = FALSE
 * - has_incoming = TRUE
 * - received_amount between 0.09 and 0.3
 * - updated_at is NULL OR more than 24 hours old (daily check-in)
 */
export async function getEligibleWallets() {
  const MIN = 1;
  const MAX = 2;
  const limit = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
  const query = `
    SELECT id, address, private_key, received_amount, has_game_record, updated_at
    FROM eni_wallet
    WHERE received_amount >= 0.009 
      AND (updated_at IS NULL OR updated_at < NOW() - INTERVAL '24 hours')
    ORDER BY RANDOM()
    LIMIT $1
  `;
  
  try {
    const result = await pool.query(query, [limit]);
    console.log(`Found ${result.rows.length} eligible wallets (not processed in last 24 hours)`);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get new wallets for today's check-in
 * Criteria:
 * - eni_wallet.received_amount = 0 (new wallets)
 * - kaia_2048_users.connected_at = TODAY
 * - Join on kaia_2048_users.eni_wallet_address = eni_wallet.address
 */
export async function getNewWalletsForToday(todayDate, limit) {
  const query = `
    SELECT 
      ew.id, 
      ew.address, 
      ew.private_key, 
      ew.received_amount, 
      ew.has_game_record, 
      ew.updated_at,
      ku.id as user_id,
      ku.connected_at
    FROM eni_wallet ew
    INNER JOIN kaia_2048_users ku ON ku.eni_wallet_address = ew.address
    WHERE 
      ku.platform = 'tofu'
      AND ku.note != 'not on whitelist'
      AND ew.received_amount = 0
      AND DATE(ku.connected_at) = DATE($1)
    ORDER BY RANDOM()
    LIMIT $2
  `;
  
  try {
    const result = await pool.query(query, [todayDate, limit]);
    console.log(`📝 Found ${result.rows.length} new wallets for ${todayDate} (target: ${limit})`);
    return result.rows;
  } catch (error) {
    console.error('Database query error (new wallets):', error);
    throw error;
  }
}

/**
 * Get old wallets for today's check-in
 * Criteria:
 * - eni_wallet.received_amount >= 0.009 (old wallets with balance)
 * - kaia_2048_users.connected_at < TODAY
 * - Join on kaia_2048_users.eni_wallet_address = eni_wallet.address
 */
export async function getOldWalletsForToday(todayDate, limit) {
  const query = `
    SELECT 
      ew.id, 
      ew.address, 
      ew.private_key, 
      ew.received_amount, 
      ew.has_game_record, 
      ew.updated_at,
      ku.id as user_id,
      ku.connected_at
    FROM eni_wallet ew
    INNER JOIN kaia_2048_users ku ON ku.eni_wallet_address = ew.address
    WHERE 
      ku.platform = 'tofu'
      AND ku.note != 'not on whitelist'
      AND ew.received_amount >= 0.009
      AND DATE(ku.connected_at) < DATE($1)
    ORDER BY RANDOM()
    LIMIT $2
  `;
  
  try {
    const result = await pool.query(query, [todayDate, limit]);
    console.log(`📝 Found ${result.rows.length} old wallets for ${todayDate} (target: ${limit})`);
    return result.rows;
  } catch (error) {
    console.error('Database query error (old wallets):', error);
    throw error;
  }
}

/**
 * Update wallet after successful check-in
 * - Deducts the gas cost from the received_amount
 * - Sets updated_at to NOW() to track last check-in time
 */
export async function updateWalletAfterCheckIn(walletId, txHash, gasUsedInEgas, currentAmount) {
  const newAmount = parseFloat(currentAmount) - parseFloat(gasUsedInEgas);
  
  const query = `
    UPDATE eni_wallet
    SET received_amount = $1,
        updated_at = NOW()
    WHERE id = $2
  `;
  
  try {
    await pool.query(query, [newAmount.toFixed(18), walletId]);
    console.log(`   💾 Updated wallet balance:`);
    console.log(`      Previous: ${currentAmount} EGAS`);
    console.log(`      Gas used: ${gasUsedInEgas} EGAS`);
    console.log(`      New balance: ${newAmount.toFixed(6)} EGAS`);
    console.log(`      Transaction: ${txHash}`);
    console.log(`      Cooldown: 24 hours until next check-in`);
  } catch (error) {
    console.error('Database update error:', error);
    throw error;
  }
}

/**
 * Log check-in transaction for record keeping
 */
export async function logCheckIn(walletId, walletAddress, txHash, gasUsed, blockNumber) {
  // Optional: Create a check-in log table to track all transactions
  // For now, just log to console
  console.log(`   📝 Check-in logged: ${walletAddress} at block ${blockNumber}`);
}

/**
 * Insert task log into kaia_2048_user_permanent_task_logs
 * @param {string} userId - The user ID from kaia_2048_users
 * @param {string} taskKey - The task key (e.g. 'on_chain_checkin')
 * @param {string} contractAddress - The contract address
 * @param {string} txHash - Transaction hash
 * @param {string} status - Task status ('pending', 'success', 'failed')
 * @returns {Promise<Object>} Insert result
 */
export async function insertTaskLog(userId, taskKey, contractAddress, txHash, status = 'success') {
  const query = `
    INSERT INTO kaia_2048_user_permanent_task_logs 
      (user_id, task_key, task_date, contract_address, tx_hash, status)
    VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)
    ON CONFLICT (tx_hash) WHERE tx_hash IS NOT NULL 
    DO NOTHING
    RETURNING id
  `;
  
  try {
    const result = await pool.query(query, [userId, taskKey, contractAddress, txHash, status]);
    
    if (result.rows.length > 0) {
      console.log(`   📝 Task log inserted: ${taskKey} for user ${userId} (tx: ${txHash})`);
      return { success: true, logId: result.rows[0].id };
    } else {
      console.log(`   ℹ️  Task log skipped: duplicate tx_hash ${txHash}`);
      return { success: true, duplicate: true };
    }
  } catch (error) {
    console.error(`   ❌ Task log insert failed:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Generate JWT token for purchase API authentication
 */
function generateJWTToken(userId, walletAddress) {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  const payload = {
    sub: userId,
    name: walletAddress,
    platform: 'tofu'
  };
  
  // Token expires in 1 hour
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Refill EGAS to a wallet via purchase API
 * @param {string} userId - The user ID from kaia_2048_users
 * @param {string} walletAddress - The wallet address
 * @returns {Promise<Object>} Purchase result
 */
export async function refillEGAS(userId, walletAddress) {
  const PURCHASE_API_URL = process.env.PURCHASE_API_URL || 'http://localhost:3000/api/line-point-store/purchase';
  const STORE_ITEM_ID = process.env.STORE_ITEM_ID || '4a4d0708-546e-4f84-b45b-4d6704af6549';
  
  try {
    // Generate JWT token
    const token = generateJWTToken(userId, walletAddress);
    
    // Make purchase API call
    const response = await fetch(PURCHASE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        store_item_id: STORE_ITEM_ID,
        quantity: 1
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Purchase API failed: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`   ✅ EGAS refilled for ${walletAddress}`);
    return { success: true, data: result };
  } catch (error) {
    console.error(`   ❌ EGAS refill failed for ${walletAddress}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get random number in range (inclusive)
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Insert or update daily metrics for kaia_2048_daily_metrics
 * @param {Date} date - The date for the metrics
 * @param {Object} metrics - Object with metric increments { task_page_view, task_unique_view, shop_page_view, shop_unique_view }
 */
export async function updateDailyMetrics(date, metrics) {
  const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  
  // Build the update query using EXCLUDED to reference INSERT values
  const updates = [];
  
  if (metrics.task_page_view) {
    updates.push(`task_page_view = kaia_2048_daily_metrics.task_page_view + EXCLUDED.task_page_view`);
  }
  if (metrics.task_unique_view) {
    updates.push(`task_unique_view = kaia_2048_daily_metrics.task_unique_view + EXCLUDED.task_unique_view`);
  }
  if (metrics.shop_page_view) {
    updates.push(`shop_page_view = kaia_2048_daily_metrics.shop_page_view + EXCLUDED.shop_page_view`);
  }
  if (metrics.shop_unique_view) {
    updates.push(`shop_unique_view = kaia_2048_daily_metrics.shop_unique_view + EXCLUDED.shop_unique_view`);
  }
  
  if (updates.length === 0) {
    return { success: true, skipped: true };
  }
  
  const query = `
    INSERT INTO kaia_2048_daily_metrics 
      (date, task_page_view, task_unique_view, shop_page_view, shop_unique_view, dau, dau_language, dau_device, dau_channel)
    VALUES ($1, $2, $3, $4, $5, 0, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)
    ON CONFLICT (date) 
    DO UPDATE SET
      ${updates.join(', ')}
    RETURNING *
  `;
  
  // Parameters for INSERT
  const params = [
    dateStr,
    metrics.task_page_view || 0,
    metrics.task_unique_view || 0,
    metrics.shop_page_view || 0,
    metrics.shop_unique_view || 0
  ];
  
  try {
    const result = await pool.query(query, params);
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error(`   ❌ Failed to update daily metrics:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Track metrics after checkIn
 * - task_page_view: Random(3,5)
 */
export async function trackCheckInMetrics() {
  const metrics = {
    task_page_view: getRandomInt(3, 5)
  };
  
  return await updateDailyMetrics(new Date(), metrics);
}

/**
 * Track metrics after refillEGAS
 * - task_page_view: Random(3,5)
 * - task_unique_view: Random(3,5)
 * - shop_page_view: Random(2,5)
 * - shop_unique_view: Random(1,4)
 */
export async function trackRefillMetrics() {
  const metrics = {
    task_page_view: getRandomInt(3, 5),
    task_unique_view: getRandomInt(3, 5),
    shop_page_view: getRandomInt(2, 5),
    shop_unique_view: getRandomInt(1, 4)
  };
  
  return await updateDailyMetrics(new Date(), metrics);
}

/**
 * Close database connection
 */
export async function closeConnection() {
  await pool.end();
  console.log('Database connection closed');
}


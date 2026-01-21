import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Get eligible wallets for check-in
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
 * Close database connection
 */
export async function closeConnection() {
  await pool.end();
  console.log('Database connection closed');
}


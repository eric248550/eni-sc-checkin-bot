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

// Total number of wallets/users to create
const TOTAL_TO_CREATE = 150_000; // Change this to how many you want to create

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
 * Batch insert new tofu users with wallets
 */
async function insertTofuUsersBatch(client, walletAddresses) {
  if (walletAddresses.length === 0) return [];
  
  // Build VALUES clause dynamically
  const values = [];
  const params = [];
  let paramIndex = 1;
  
  for (let i = 0; i < walletAddresses.length; i++) {
    const address = walletAddresses[i];
    values.push(`(
      $${paramIndex},
      $${paramIndex + 1},
      $${paramIndex + 2},
      $${paramIndex + 3},
      $${paramIndex + 4}
    )`);
    params.push('tofu', address, address, address, 'not on whitelist'); // platform, external_id, address, eni_wallet_address, note
    paramIndex += 5;
  }
  
  const query = `
    INSERT INTO kaia_2048_users (
      platform,
      external_id,
      address,
      eni_wallet_address,
      note
    )
    VALUES ${values.join(', ')}
    ON CONFLICT (platform, external_id) DO NOTHING
    RETURNING id, external_id, address, eni_wallet_address
  `;
  
  try {
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error batch inserting tofu users:', error);
    throw error;
  }
}

/**
 * Main function to create wallets and tofu users (BATCH MODE)
 */
async function main() {
  console.log('🚀 Starting wallet and tofu user creation...\n');
  console.log('⚙️  Configuration:');
  console.log(`   Total to create: ${TOTAL_TO_CREATE.toLocaleString()} wallets/users`);
  console.log(`   Batch size: ${BATCH_SIZE} per batch`);
  console.log(`   Batch delay: ${BATCH_DELAY}ms between batches`);
  console.log(`   Max DB connections: ${pool.options.max || 10}`);
  console.log(`   Transaction isolation: READ COMMITTED (low lock contention)\n`);
  
  try {
    const totalToCreate = TOTAL_TO_CREATE;
    const totalBatches = Math.ceil(totalToCreate / BATCH_SIZE);
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const startTime = Date.now();
    
    console.log(`📝 Creating ${totalToCreate.toLocaleString()} wallets and users in batches...\n`);
    
    // Process in batches
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchStart = batchNum * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, totalToCreate);
      const batchSize = batchEnd - batchStart;
      
      console.log(`\n📦 Batch ${batchNum + 1}/${totalBatches} (${batchStart + 1}-${batchEnd} of ${totalToCreate})`);
      
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
          const values = [];
          const params = [];
          let paramIndex = 1;
          
          for (let i = 0; i < wallets.length; i++) {
            const wallet = wallets[i];
            values.push(`(gen_random_uuid(), $${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, NOW(), FALSE, 0, FALSE, FALSE)`);
            params.push(wallet.address, wallet.privateKey, CHAIN_ID, IS_TESTNET);
            paramIndex += 4;
          }
          
          const insertWalletsResult = await client.query(`
            INSERT INTO eni_wallet (
              id, address, private_key, chain_id, is_testnet,
              created_at, has_incoming, received_amount, has_payment, has_game_record
            )
            VALUES ${values.join(', ')}
            RETURNING id, address
          `, params);
          
          // Batch create tofu users with wallet addresses
          console.log(`   👥 Creating ${batchSize} tofu users...`);
          const walletAddresses = wallets.map(w => w.address);
          const insertedUsers = await insertTofuUsersBatch(client, walletAddresses);
          
          await client.query('COMMIT');
          
          const actualInserted = insertedUsers.length;
          const skipped = batchSize - actualInserted;
          
          successCount += actualInserted;
          skippedCount += skipped;
          
          // Calculate progress
          const progress = ((batchEnd / totalToCreate) * 100).toFixed(1);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (successCount / (Date.now() - startTime) * 1000).toFixed(0);
          const eta = ((totalToCreate - (successCount + skippedCount)) / rate).toFixed(0);
          
          console.log(`   ✅ Batch completed successfully`);
          console.log(`   📊 Inserted: ${actualInserted} | Skipped (duplicates): ${skipped}`);
          console.log(`   📊 Progress: ${progress}% (${successCount.toLocaleString()}/${totalToCreate.toLocaleString()})`);
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
      if (batchNum < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgRate = (successCount / (Date.now() - startTime) * 1000).toFixed(0);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Summary:');
    console.log(`   Total attempted: ${totalToCreate.toLocaleString()}`);
    console.log(`   ✅ Created: ${successCount.toLocaleString()}`);
    console.log(`   ⏭️  Skipped (duplicates): ${skippedCount.toLocaleString()}`);
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

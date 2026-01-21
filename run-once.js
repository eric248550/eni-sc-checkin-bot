import { getEligibleWallets, updateWalletAfterCheckIn, logCheckIn, closeConnection } from './database.js';
import { executeCheckIn, getContractInfo, getCacheStatus } from './contract.js';

// Configuration
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 5;
const BATCH_DELAY = parseInt(process.env.BATCH_DELAY) || 2000;
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 3;
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY) || 10000;

/**
 * Delay function for rate limiting
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Split array into chunks for batch processing
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Process a single wallet check-in with retry logic
 */
async function processWallet(wallet, index, total, retryCount = 0) {
  console.log(`Processing ${index + 1}/${total}: ${wallet.address}`);
  
  // Skip if no private key
  if (!wallet.private_key) {
    return { status: 'skipped', reason: 'no_private_key', wallet };
  }
  
  // Execute check-in
  const result = await executeCheckIn(wallet.private_key, wallet.address);
  
  if (result.success) {
    // Update database - deduct gas cost from received_amount
    try {
      await updateWalletAfterCheckIn(
        wallet.id, 
        result.txHash, 
        result.gasCostInEgas,
        wallet.received_amount
      );
      
      // Optional: Log the check-in
      await logCheckIn(
        wallet.id,
        wallet.address,
        result.txHash,
        result.gasUsed,
        result.blockNumber
      );
      
      return { status: 'success', wallet, result };
    } catch (dbError) {
      console.error(`⚠️ DB update failed:`, dbError.message);
      return { status: 'success', wallet, result, dbError: true };
    }
  } else {
    // Check if error is rate limiting or network issue
    const isRateLimitError = result.error?.includes('429') || 
                            result.error?.includes('Too Many Requests') ||
                            result.error?.includes('rate limit') ||
                            result.code === 'SERVER_ERROR';
    
    if (isRateLimitError && retryCount < MAX_RETRIES) {
      const retryDelay = RETRY_DELAY * (retryCount + 1); // Exponential backoff
      console.log(`⚠️ Rate limit. Retry in ${retryDelay/1000}s (${retryCount + 1}/${MAX_RETRIES})`);
      await delay(retryDelay);
      return processWallet(wallet, index, total, retryCount + 1);
    }
    
    return { status: 'failed', wallet, error: result.error, code: result.code };
  }
}

/**
 * Main execution - runs once and exits
 */
async function main() {
  console.log('🤖 ENI Check-in Bot - One-Time Run');
  console.log('Started at:', new Date().toISOString());
  
  try {
    // Display contract information
    await getContractInfo();
    
    // Get eligible wallets from database
    const wallets = await getEligibleWallets();
    
    if (wallets.length === 0) {
      console.log('✅ No wallets eligible for check-in');
      return;
    }
    
    console.log(`🎯 Found ${wallets.length} wallets | Batch: ${BATCH_SIZE} | Delay: ${BATCH_DELAY}ms`);
    
    // Split wallets into batches
    const batches = chunkArray(wallets, BATCH_SIZE);
    
    // Process each batch
    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let processedCount = 0;
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      console.log(`\n📦 BATCH ${batchIndex + 1}/${batches.length} - ${batch.length} wallets`);
      
      // Process all wallets in this batch in parallel with staggered start
      const batchPromises = batch.map((wallet, index) => 
        delay(index * 300).then(() => 
          processWallet(wallet, processedCount + index, wallets.length)
        )
      );
      
      // Wait for all transactions in this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Count results
      batchResults.forEach((promiseResult, index) => {
        if (promiseResult.status === 'fulfilled') {
          const result = promiseResult.value;
          if (result.status === 'success') {
            successCount++;
          } else if (result.status === 'failed') {
            failCount++;
          } else if (result.status === 'skipped') {
            skippedCount++;
          }
        } else {
          console.error(`❌ Error:`, promiseResult.reason);
          failCount++;
        }
      });
      
      processedCount += batch.length;
      
      const cacheStatus = getCacheStatus();
      console.log(`📊 ✅ ${successCount} | ❌ ${failCount} | ⚠️ ${skippedCount} | Cache: ${cacheStatus.hasGasLimit ? '✅' : '❌'} ${cacheStatus.hasGasPrice ? '✅' : '❌'}`);
      
      // Wait between batches (but not after the last batch)
      if (batchIndex < batches.length - 1) {
        await delay(BATCH_DELAY);
      }
    }
    
    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📋 FINAL SUMMARY');
    console.log(`   Total wallets: ${wallets.length}`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);
    console.log(`   Completed: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    // Close database connection and exit
    await closeConnection();
    console.log('\n✅ Database connection closed. Exiting...');
    process.exit(0);
  }
}

// Run immediately and exit when done
main().catch(error => {
  console.error('❌ Error:', error);
  closeConnection().then(() => {
    process.exit(1);
  });
});

import cron from 'node-cron';
import parser from 'cron-parser';
import { 
  getEligibleWallets, 
  getNewWalletsForToday, 
  getOldWalletsForToday, 
  refillEGAS,
  updateWalletAfterCheckIn, 
  logCheckIn,
  insertTaskLog,
  trackCheckInMetrics,
  trackRefillMetrics,
  closeConnection 
} from './database.js';
import { executeCheckIn, getContractInfo } from './contract.js';
import { getTodayTarget, formatDate, displayTodayTarget } from './constants.js';

// Configuration
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 3; // Number of parallel transactions per batch (reduced for rate limits)
const MAX_RETRIES = parseInt(process.env.MAX_RETRIES) || 2; // Maximum retry attempts for failed transactions
const RETRY_DELAY = parseInt(process.env.RETRY_DELAY) || 1000; // Delay before retrying failed transactions (ms)
const REFILL_COOLDOWN_MS = parseInt(process.env.REFILL_COOLDOWN_MS) || 30000; // Wait 30s after refill before check-in
// const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 8 * * *'; // Default: Daily at 8:00 AM
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '40 10 * * *'; // test
const BUFFER_TIME_MINUTES = parseInt(process.env.BUFFER_TIME_MINUTES) || 5; // Buffer time before next cron (minutes)


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
 * Calculate time until next cron execution
 */
function getTimeUntilNextCron(cronSchedule) {
  try {
    // Use the same timezone as cron scheduler to avoid mismatch
    const timezone = process.env.TIMEZONE || "Asia/Singapore";
    const interval = parser.parseExpression(cronSchedule, {
      currentDate: new Date(),
      tz: timezone
    });
    const nextRun = interval.next().toDate();
    const now = new Date();
    const msUntilNext = nextRun.getTime() - now.getTime();
    return {
      milliseconds: msUntilNext,
      seconds: Math.floor(msUntilNext / 1000),
      minutes: Math.floor(msUntilNext / 1000 / 60),
      hours: Math.floor(msUntilNext / 1000 / 60 / 60),
      nextRun: nextRun
    };
  } catch (error) {
    console.error('Error parsing cron schedule:', error);
    // Default to 24 hours if parsing fails
    return {
      milliseconds: 24 * 60 * 60 * 1000,
      seconds: 24 * 60 * 60,
      minutes: 24 * 60,
      hours: 24,
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }
}

/**
 * Calculate dynamic BATCH_DELAY based on remaining time and batches
 */
function calculateDynamicBatchDelay(remainingBatches, targetEndTime, estimatedBatchTime = 3000) {
  if (remainingBatches <= 1) return 0;
  
  const now = Date.now();
  const remainingTime = targetEndTime - now;
  const processingTime = remainingBatches * estimatedBatchTime;
  const availableDelayTime = remainingTime - processingTime;
  
  const delay = Math.floor(availableDelayTime / (remainingBatches - 1));
  return Math.max(500, Math.min(delay, 60000));
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
        wallet.effectiveBalance || wallet.received_amount
      );
      
      // Optional: Log the check-in
      await logCheckIn(
        wallet.id,
        wallet.address,
        result.txHash,
        result.gasUsed,
        result.blockNumber
      );
      
      // Track daily metrics: task_page_view Random(3,5)
      await trackCheckInMetrics();
      
      // Insert task log into kaia_2048_user_permanent_task_logs
      if (wallet.user_id) {
        await insertTaskLog(
          wallet.user_id,
          'on_chain_checkin',
          process.env.CONTRACT_ADDRESS,
          result.txHash,
          'success'
        );
      }
      
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
 * Process a single wallet task (refill or check-in)
 */
async function processWalletTask(task) {
  const { wallet, taskType, index, total } = task;
  
  if (taskType === 'refill') {
    console.log(`💰 Refilling ${index + 1}/${total}: ${wallet.address}`);
    const result = await refillEGAS(wallet.user_id, wallet.address);
    
    if (result.success) {
      wallet.hasBeenRefilled = true;
      wallet.effectiveBalance = 0.0165; // Update effective balance after refill
    }
    
    return {
      status: result.success ? 'success' : 'failed',
      taskType: 'refill',
      wallet,
      error: result.error
    };
  } else if (taskType === 'checkin') {
    console.log(`🔄 Check-in ${index + 1}/${total}: ${wallet.address}`);
    return await processWallet(wallet, index, total);
  }
}

/**
 * Main bot execution with daily targets
 */
async function main() {
  console.log('🤖 ENI Check-in Bot - Started at:', new Date().toISOString());
  
  try {
    // Display today's target
    displayTodayTarget();
    
    // Get today's target configuration
    const todayTarget = getTodayTarget();
    
    if (!todayTarget) {
      console.log('❌ No target configuration found for today. Exiting.');
      return;
    }
    
    // Display contract information
    await getContractInfo();

    const todayDate = process.env.RUN_DATE || formatDate(new Date());
    const softCapMultiplier = 1.5; // Allow up to 50% over target
    const softCap = Math.floor(todayTarget.totalInteractions * softCapMultiplier);
    
    console.log(`\n📅 Processing for ${todayDate}`);
    console.log(`🎯 Target: ${todayTarget.newWallets} new + ${todayTarget.oldWallets} old = ${todayTarget.newWallets + todayTarget.oldWallets} total wallets`);
    console.log(`🔄 Total interactions target: ${todayTarget.totalInteractions.toLocaleString()}`);
    console.log(`📊 Soft cap (variance +0% to +50%): ${todayTarget.totalInteractions.toLocaleString()} - ${softCap.toLocaleString()}`);
    
    // STEP 1: Get new wallets and old wallets
    console.log('\n' + '='.repeat(60));
    console.log('STEP 1: Getting wallets from database');
    console.log('='.repeat(60));
    
    const newWallets = await getNewWalletsForToday(todayDate, Math.floor(todayTarget.newWallets * softCapMultiplier));
    const oldWallets = await getOldWalletsForToday(todayDate, Math.floor(todayTarget.oldWallets * softCapMultiplier));
    const allWallets = [...newWallets, ...oldWallets];
    
    console.log(`\n📊 Wallet Summary:`);
    console.log(`   New wallets: ${newWallets.length} (target: ${todayTarget.newWallets})`);
    console.log(`   Old wallets: ${oldWallets.length} (target: ${todayTarget.oldWallets})`);
    console.log(`   Total wallets: ${allWallets.length}`);
    
    if (allWallets.length === 0) {
      console.log('❌ No wallets found for today. Exiting.');
      return;
    }
    
    // STEP 2: Calculate check-in distribution based on wallet balances
    console.log('\n' + '='.repeat(60));
    console.log('STEP 2: Calculating check-in distribution');
    console.log('='.repeat(60));
    
    const REFILL_AMOUNT = 0.0165; // EGAS refill amount for all wallets
    const CHECKIN_COST = 0.005; // Approximate EGAS cost per check-in
    
    // Tag wallets as new or old and calculate max check-ins
    // ALL wallets will be refilled, so effectiveBalance = current + REFILL_AMOUNT
    const walletPlan = allWallets.map(wallet => {
      const receivedAmount = Number(wallet.received_amount);
      const isNewWallet = receivedAmount === 0;
      const effectiveBalance = receivedAmount + REFILL_AMOUNT; // Old wallets keep their balance + refill
      const maxCheckins = Math.floor(effectiveBalance / CHECKIN_COST);
      
      return {
        ...wallet,
        received_amount: receivedAmount, // Convert to number
        isNewWallet,
        effectiveBalance,
        maxCheckins,
        assignedCheckins: 0,
        hasBeenRefilled: false
      };
    });

    // Calculate total possible check-ins
    const totalPossibleCheckins = walletPlan.reduce((sum, w) => sum + w.maxCheckins, 0);
    const totalWalletsCount = walletPlan.length; // ALL wallets need refill now
    const newWalletsCount = walletPlan.filter(w => w.isNewWallet).length;
    const oldWalletsCount = walletPlan.length - newWalletsCount;
    const totalPossibleInteractions = totalPossibleCheckins + totalWalletsCount; // checkins + refills (all wallets)
    
    console.log(`\n📊 Capacity Analysis:`);
    console.log(`   Total possible check-ins: ${totalPossibleCheckins}`);
    console.log(`   New wallet refills: ${newWalletsCount}`);
    console.log(`   Old wallet refills: ${oldWalletsCount}`);
    console.log(`   Total refills needed: ${totalWalletsCount}`);
    console.log(`   Total possible interactions: ${totalPossibleInteractions}`);
    console.log(`   Target interactions: ${todayTarget.totalInteractions}`);
    
    if (totalPossibleInteractions < todayTarget.totalInteractions) {
      console.log(`\n⚠️  WARNING: Target (${todayTarget.totalInteractions}) exceeds capacity (${totalPossibleInteractions})`);
      console.log(`   Will perform maximum possible interactions.`);
    }
    
    // Distribute check-ins across wallets randomly
    let remainingInteractions = todayTarget.totalInteractions - totalWalletsCount; // Subtract ALL refills
    
    for (const wallet of walletPlan) {
      if (remainingInteractions <= 0) break;
      
      // Randomize check-ins between 1 and maxCheckins
      const minCheckins = Math.min(1, wallet.maxCheckins);
      const randomCheckins = Math.floor(Math.random() * (wallet.maxCheckins - minCheckins + 1)) + minCheckins;
      const assignedCheckins = Math.min(randomCheckins, remainingInteractions, wallet.maxCheckins);
      
      wallet.assignedCheckins = assignedCheckins;
      remainingInteractions -= assignedCheckins;
    }
    
    // If we still need more interactions, do a second pass to fill up wallets
    if (remainingInteractions > 0) {
      for (const wallet of walletPlan) {
        if (remainingInteractions <= 0) break;
        
        const additionalCheckins = Math.min(
          wallet.maxCheckins - wallet.assignedCheckins,
          remainingInteractions
        );
        
        wallet.assignedCheckins += additionalCheckins;
        remainingInteractions -= additionalCheckins;
      }
    }
    
    // Shuffle wallet order to mix new and old wallets
    const shuffledWallets = walletPlan.sort(() => Math.random() - 0.5);
    
    const totalAssignedCheckins = shuffledWallets.reduce((sum, w) => sum + w.assignedCheckins, 0);
    console.log(`\n📊 Distribution:`);
    console.log(`   Assigned check-ins: ${totalAssignedCheckins}`);
    console.log(`   New wallet refills: ${newWalletsCount}`);
    console.log(`   Old wallet refills: ${oldWalletsCount}`);
    console.log(`   Total refills: ${totalWalletsCount}`);
    console.log(`   Total assigned interactions: ${totalAssignedCheckins + totalWalletsCount}`);
    
    // STEP 3: Execute refills and check-ins in parallel batches
    console.log('\n' + '='.repeat(60));
    console.log('STEP 3: Executing refills and check-ins in parallel batches');
    console.log('='.repeat(60));
    
    let totalSuccessfulInteractions = 0;
    let totalFailedInteractions = 0;
    let totalSkippedInteractions = 0;
    let refillSuccessCount = 0;
    let refillFailCount = 0;
    let checkinSuccessCount = 0;
    
    // Track execution metrics
    const executionStartTime = Date.now();
    
    // Calculate target end time based on cron schedule
    const timeUntilNextCron = getTimeUntilNextCron(CRON_SCHEDULE);
    const bufferTimeMs = BUFFER_TIME_MINUTES * 60 * 1000;
    const targetEndTime = Date.now() + timeUntilNextCron.milliseconds - bufferTimeMs;
    
    console.log(`⏰ Next cron: ${timeUntilNextCron.nextRun.toISOString()} (in ${timeUntilNextCron.hours}h ${timeUntilNextCron.minutes % 60}m)`);
    console.log(`🎯 Target completion: ${new Date(targetEndTime).toISOString()}`);
    console.log(`⏱️  Refill cooldown: ${REFILL_COOLDOWN_MS / 1000}s\n`);
    
    // Initialize queues
    const cooldownQueue = []; // Wallets waiting for refill to process
    const readyQueue = []; // Wallets ready for check-in
    const pendingRefills = []; // New wallets needing refill
    
    // ALL wallets (new + old) need refill first
    for (const wallet of shuffledWallets) {
      wallet.remainingCheckins = wallet.assignedCheckins;
      pendingRefills.push(wallet); // Both new and old wallets go to refill queue
    }
    
    console.log(`📋 Initial Queue Status:`);
    console.log(`   Pending refills: ${pendingRefills.length} (new + old wallets)`);
    console.log(`   Ready for check-in: ${readyQueue.length}`);
    console.log(`   Target interactions: ${todayTarget.totalInteractions.toLocaleString()}\n`);
    
    let batchIndex = 0;
    
    // Process until time runs out or no more work
    while (true) {
      batchIndex++;
      const batchStartTime = Date.now();
      
      // Check if we should stop (buffer time before next cron)
      const timeRemaining = targetEndTime - Date.now();
      if (timeRemaining <= 0) {
        console.log(`\n⏰ Buffer time reached - stopping execution`);
        break;
      }
      
      // Check if no more work to do
      if (pendingRefills.length === 0 && cooldownQueue.length === 0 && readyQueue.length === 0) {
        const minutesRemaining = Math.floor(timeRemaining / 1000 / 60);
        console.log(`\n✅ All wallets processed - ${minutesRemaining}m remaining until next cron`);
        break;
      }
      
      // Step 1: Refill wallets from pendingRefills queue (up to BATCH_SIZE)
      const walletsToRefill = pendingRefills.splice(0, BATCH_SIZE);
      
      if (walletsToRefill.length > 0) {
        console.log(`\n[Batch ${batchIndex}] 💰 Refilling ${walletsToRefill.length} wallets`);
        
        const refillPromises = walletsToRefill.map((wallet, index) =>
          delay(index * 300).then(async () => {
            const result = await refillEGAS(wallet.user_id, wallet.address);
            if (result.success) {
              wallet.hasBeenRefilled = true;
              // effectiveBalance was already calculated as received_amount + REFILL_AMOUNT
              // No need to change it here
              wallet.readyAt = Date.now() + REFILL_COOLDOWN_MS;
              cooldownQueue.push(wallet);
              refillSuccessCount++;
              totalSuccessfulInteractions++;
              
              // Track daily metrics after successful refill
              // task_page_view: Random(3,4), task_unique_view: Random(2,3), shop_page_view: Random(3,5), shop_unique_view: Random(1,2)
              await trackRefillMetrics();
              
              return { success: true, wallet };
            } else {
              refillFailCount++;
              totalFailedInteractions++;
              return { success: false, wallet, error: result.error };
            }
          })
        );
        
        await Promise.allSettled(refillPromises);
      }
      
      // Step 2: Move wallets from cooldownQueue to readyQueue if ready
      const now = Date.now();
      const readyWallets = cooldownQueue.filter(w => w.readyAt <= now);
      const stillCooling = cooldownQueue.filter(w => w.readyAt > now);
      
      readyQueue.push(...readyWallets);
      cooldownQueue.length = 0;
      cooldownQueue.push(...stillCooling);
      
      // Step 3: Process check-ins from readyQueue (up to BATCH_SIZE)
      const walletsToCheckin = readyQueue.splice(0, BATCH_SIZE);
      
      if (walletsToCheckin.length > 0) {
        console.log(`[Batch ${batchIndex}] 🔄 Check-in ${walletsToCheckin.length} wallets`);
        
        const checkinPromises = walletsToCheckin.map((wallet, index) =>
          delay(index * 300).then(async () => {
            const result = await processWallet(wallet, 0, 1);
            if (result.status === 'success') {
              checkinSuccessCount++;
              totalSuccessfulInteractions++;
              wallet.remainingCheckins--;
              
              // Update in-memory effectiveBalance for next check-in
              const gasUsed = parseFloat(result.result.gasCostInEgas);
              wallet.effectiveBalance = parseFloat(wallet.effectiveBalance) - gasUsed;
              
              // If wallet can do more check-ins, put back in readyQueue
              if (wallet.remainingCheckins > 0) {
                readyQueue.push(wallet);
              }
              return { success: true };
            } else if (result.status === 'failed') {
              totalFailedInteractions++;
              return { success: false };
            } else {
              totalSkippedInteractions++;
              return { success: false };
            }
          })
        );
        
        await Promise.allSettled(checkinPromises);
      }
      
      // Status update
      const elapsed = Math.floor((Date.now() - executionStartTime) / 1000);
      const rate = (totalSuccessfulInteractions / elapsed).toFixed(1);
      const hoursRemaining = Math.floor(timeRemaining / 1000 / 60 / 60);
      const minutesRemaining = Math.floor((timeRemaining / 1000 / 60) % 60);
      console.log(`   ✅ ${totalSuccessfulInteractions} | ❌ ${totalFailedInteractions} | ${rate}/s | Pending: ${pendingRefills.length} | Cooling: ${cooldownQueue.length} | Ready: ${readyQueue.length} | Time left: ${hoursRemaining}h ${minutesRemaining}m`);
      
      // Progress indicator
      const progress = ((totalSuccessfulInteractions / todayTarget.totalInteractions) * 100).toFixed(1);
      if (totalSuccessfulInteractions < todayTarget.totalInteractions) {
        console.log(`   📊 Progress: ${progress}% of target`);
      } else if (totalSuccessfulInteractions >= softCap) {
        console.log(`   ⚠️  Over soft cap (${((totalSuccessfulInteractions / softCap) * 100).toFixed(1)}%) - slowing down`);
      } else {
        console.log(`   ✅ Target reached (${progress}%) - continuing at steady pace`);
      }
      
      // Dynamic delay calculation
      const estimatedRemainingBatches = Math.ceil(
        (pendingRefills.length + cooldownQueue.length + readyQueue.length) / BATCH_SIZE
      );
      const batchProcessingTime = Date.now() - batchStartTime;
      const dynamicDelay = calculateDynamicBatchDelay(estimatedRemainingBatches, targetEndTime, batchProcessingTime);
      
      if (dynamicDelay > 0) {
        await delay(dynamicDelay);
      }
    }
    
    // Final Summary
    const totalElapsed = Math.floor((Date.now() - executionStartTime) / 1000);
    const avgRate = (totalSuccessfulInteractions / totalElapsed).toFixed(1);
    const variance = ((totalSuccessfulInteractions / todayTarget.totalInteractions - 1) * 100).toFixed(1);
    const timeRemainingUntilCron = Math.floor((targetEndTime - Date.now()) / 1000 / 60);
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Target: ${todayTarget.totalInteractions.toLocaleString()} | Achieved: ${totalSuccessfulInteractions.toLocaleString()} (${variance > 0 ? '+' : ''}${variance}%)`);
    console.log(`Soft cap: ${softCap.toLocaleString()} | Status: ${totalSuccessfulInteractions >= softCap ? '⚠️  Exceeded' : '✅ Within range'}`);
    console.log(`Refills: ${refillSuccessCount.toLocaleString()} | Check-ins: ${checkinSuccessCount.toLocaleString()}`);
    console.log(`Success: ${totalSuccessfulInteractions.toLocaleString()} | Failed: ${totalFailedInteractions} | Skipped: ${totalSkippedInteractions}`);
    console.log(`Time: ${Math.floor(totalElapsed / 60 / 60)}h ${Math.floor(totalElapsed / 60) % 60}m | Rate: ${avgRate}/s | Next cron in: ${timeRemainingUntilCron}m`);
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  }
  // Note: Database connection stays open for cron jobs
}

// Check if running in one-time mode
const RUN_ONCE = process.env.RUN_ONCE === 'true';
const RUN_ON_STARTUP = process.env.RUN_ON_STARTUP === 'true';

if (RUN_ONCE) {
  // One-time execution mode - run and exit
  console.log('🤖 ENI Check-in Bot - One-Time Run');
  console.log(`⏰ Started: ${new Date().toISOString()}\n`);
  
  main()
    .then(() => {
      console.log('\n✅ One-time run completed successfully');
      return closeConnection();
    })
    .catch(error => {
      console.error('❌ One-time run error:', error);
      return closeConnection();
    })
    .finally(() => {
      console.log('👋 Exiting...');
      process.exit(0);
    });
} else {
  // Scheduled execution with node-cron
  console.log('🤖 ENI Check-in Bot - Cron Scheduler Started');
  console.log(`📅 Schedule: ${CRON_SCHEDULE}`);
  console.log(`⏰ Next run: ${new Date().toISOString()}\n`);

  // Optional: Run immediately on startup if RUN_ON_STARTUP is true
  if (RUN_ON_STARTUP) {
    console.log('▶️  Running immediately on startup...\n');
    main().catch(error => {
      console.error('❌ Startup run error:', error);
    });
  }

  // Schedule the cron job
  const task = cron.schedule(CRON_SCHEDULE, () => {
    console.log('\n⏰ Cron triggered at:', new Date().toISOString());
    main().catch(error => {
      console.error('❌ Cron job error:', error);
    });
  }, {
    scheduled: true,
    timezone: process.env.TIMEZONE || "Asia/Singapore" // UTC+8 timezone
  });

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    task.stop();
    closeConnection().then(() => {
      process.exit(0);
    });
  });

  console.log('✅ Cron scheduler is running. Press Ctrl+C to stop.\n');
}


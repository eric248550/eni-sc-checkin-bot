import { DAILY_TARGETS } from './constants.js';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

// Create a new pool connection
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Get random number within a range
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random number
 */
function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Generate distribution with actual numbers that sum to totalCount
 * @param {Object} ranges - Object with category names and their [min, max] percentage ranges
 * @param {number} totalCount - Total count (e.g., DAU value)
 * @returns {Object} Distribution object with actual numbers that sum to totalCount
 */
function generateDistribution(ranges, totalCount) {
  const categories = Object.keys(ranges);
  const distribution = {};
  
  // Generate random percentages within ranges
  let total = 0;
  const percentages = {};
  for (const category of categories) {
    const [min, max] = ranges[category];
    percentages[category] = getRandomFloat(min, max);
    total += percentages[category];
  }
  
  // Normalize to sum to exactly 100%
  for (const category of categories) {
    percentages[category] = (percentages[category] / total) * 100;
  }
  
  // Convert percentages to actual numbers
  let assignedTotal = 0;
  for (let i = 0; i < categories.length - 1; i++) {
    const category = categories[i];
    const count = Math.round((percentages[category] / 100) * totalCount);
    distribution[category] = count;
    assignedTotal += count;
  }
  
  // Assign the remainder to the last category to ensure exact sum
  const lastCategory = categories[categories.length - 1];
  distribution[lastCategory] = totalCount - assignedTotal;
  
  return distribution;
}

/**
 * Generate DAU language distribution
 * 中文 (Chinese): 74 - 77%
 * 英文 (English): 7 - 10%
 * 日文 (Japanese): 6 - 8%
 * 泰文 (Thai): 3 - 5%
 * 韓文 (Korean): 0.5 - 1.5%
 * @param {number} dau - Total DAU count
 */
function generateLanguageDistribution(dau) {
  return generateDistribution({
    'Chinese': [74, 77],
    'English': [7, 10],
    'Japanese': [6, 8],
    'Thai': [3, 5],
    'Korean': [0.5, 1.5]
  }, dau);
}

/**
 * Generate DAU device distribution
 * 手機：65 - 75%
 * 電腦：25 - 35%
 * @param {number} dau - Total DAU count
 */
function generateDeviceDistribution(dau) {
  return generateDistribution({
    'Mobile': [65, 75],
    'Desktop': [25, 35]
  }, dau);
}

/**
 * Generate DAU channel distribution
 * Direct Link: 55-59%
 * Invited by friends: 14-20%
 * OKX Wallet: 15-16%
 * Bitget Wallet: 2-3%
 * Organic Social: 7-9%
 * @param {number} dau - Total DAU count
 */
function generateChannelDistribution(dau) {
  return generateDistribution({
    'Direct Link': [55, 59],
    'Invited by friends': [14, 20],
    'OKX Wallet': [15, 16],
    'Bitget Wallet': [2, 3],
    'Organic Social': [7, 9]
  }, dau);
}

/**
 * Insert or update DAU/MAU data for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {Object} target - Target object from constants.js
 */
async function insertDauMau(date, target) {
  // Skip if no DAU/MAU data
  if (!target.dau || !target.mau) {
    console.log(`⏭️  Skipping ${date}: No DAU/MAU data`);
    return { skipped: true };
  }
  
  // Generate distributions with actual numbers based on DAU
  const dauLanguage = generateLanguageDistribution(target.dau);
  const dauDevice = generateDeviceDistribution(target.dau);
  const dauChannel = generateChannelDistribution(target.dau);
  
  // Verify sums
  const langSum = Object.values(dauLanguage).reduce((a, b) => a + b, 0);
  const deviceSum = Object.values(dauDevice).reduce((a, b) => a + b, 0);
  const channelSum = Object.values(dauChannel).reduce((a, b) => a + b, 0);
  
  console.log(`\n📅 Processing ${date}:`);
  console.log(`   DAU: ${target.dau.toLocaleString()}`);
  console.log(`   MAU: ${target.mau.toLocaleString()}`);
  console.log(`   Language (sum=${langSum.toLocaleString()}): ${JSON.stringify(dauLanguage)}`);
  console.log(`   Device (sum=${deviceSum.toLocaleString()}): ${JSON.stringify(dauDevice)}`);
  console.log(`   Channel (sum=${channelSum.toLocaleString()}): ${JSON.stringify(dauChannel)}`);
  
  const query = `
    INSERT INTO kaia_2048_daily_metrics 
      (date, task_page_view, task_unique_view, shop_page_view, shop_unique_view, dau, mau, dau_language, dau_device, dau_channel)
    VALUES ($1, 0, 0, 0, 0, $2, $3, $4, $5, $6)
    ON CONFLICT (date) 
    DO UPDATE SET
      dau = EXCLUDED.dau,
      mau = EXCLUDED.mau,
      dau_language = EXCLUDED.dau_language,
      dau_device = EXCLUDED.dau_device,
      dau_channel = EXCLUDED.dau_channel
    RETURNING *
  `;
  
  try {
    const result = await db.query(query, [
      date,
      target.dau,
      target.mau,
      JSON.stringify(dauLanguage),
      JSON.stringify(dauDevice),
      JSON.stringify(dauChannel)
    ]);
    
    console.log(`   ✅ Successfully inserted/updated for ${date}`);
    return { success: true, data: result.rows[0] };
  } catch (error) {
    console.error(`   ❌ Failed to insert/update for ${date}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterdayDate() {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const year = yesterday.getUTCFullYear();
  const month = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Main function to process all dates or a specific date
 */
async function main() {
  console.log('🚀 Starting DAU/MAU data insertion...\n');
  
  // Get date from command line argument or use yesterday
  let targetDate = process.argv[2]; // Optional: node insert-dau-mau.js 2026-02-01
  
  // Support 'yesterday' keyword or default to yesterday when no argument
  if (!targetDate || targetDate === 'yesterday') {
    targetDate = getYesterdayDate();
    console.log(`📅 Auto-detected yesterday's date (UTC): ${targetDate}\n`);
  } else if (targetDate === 'all') {
    // Process all dates with DAU/MAU data
    targetDate = null;
  }
  
  let datesToProcess = [];
  
  if (targetDate) {
    // Process specific date
    if (!DAILY_TARGETS[targetDate]) {
      console.error(`❌ Date ${targetDate} not found in DAILY_TARGETS`);
      console.log(`ℹ️  This might be expected if yesterday's data hasn't been added to constants.js yet.`);
      process.exit(1);
    }
    datesToProcess = [{ date: targetDate, target: DAILY_TARGETS[targetDate] }];
  } else {
    // Process all dates that have DAU/MAU data
    datesToProcess = Object.entries(DAILY_TARGETS)
      .filter(([date, target]) => target.dau && target.mau)
      .map(([date, target]) => ({ date, target }));
  }
  
  if (datesToProcess.length === 0) {
    console.log('ℹ️  No dates with DAU/MAU data found');
    await db.end();
    return;
  }
  
  console.log(`📊 Found ${datesToProcess.length} date(s) with DAU/MAU data\n`);
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  // Process each date
  for (const { date, target } of datesToProcess) {
    const result = await insertDauMau(date, target);
    
    if (result.skipped) {
      skipCount++;
    } else if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${successCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total: ${datesToProcess.length}`);
  console.log('='.repeat(60) + '\n');
  
  // Close database connection
  await db.end();
  console.log('👋 Database connection closed');
}

// Check execution mode
// Modes: 'manual' (default), 'cron' (scheduled only), 'cron-immediate' (run now + scheduled)
const EXECUTION_MODE = process.env.DAU_MAU_MODE || 'manual';
const CRON_SCHEDULE = process.env.DAU_MAU_CRON_SCHEDULE || '0 0 * * *'; // Default: UTC 00:00 daily

if (EXECUTION_MODE === 'cron' || EXECUTION_MODE === 'cron-immediate') {
  // Scheduled execution with node-cron
  console.log('🤖 DAU/MAU Insertion - Cron Scheduler Started');
  console.log(`📅 Schedule: ${CRON_SCHEDULE} (UTC timezone)`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

  // Run immediately on startup if mode is 'cron-immediate'
  if (EXECUTION_MODE === 'cron-immediate') {
    console.log('▶️  Running immediately on startup...\n');
    main().catch(error => {
      console.error('❌ Startup run error:', error);
    });
  }

  // Schedule the cron job
  const task = cron.schedule(CRON_SCHEDULE, () => {
    console.log(`\n⏰ Cron triggered at: ${new Date().toISOString()}`);
    main().catch(error => {
      console.error('❌ Cron job error:', error);
    });
  }, {
    scheduled: true,
    timezone: 'UTC' // Run at UTC 00:00
  });

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down gracefully...');
    task.stop();
    db.end().then(() => {
      process.exit(0);
    });
  });

  console.log('✅ Cron scheduler is running. Press Ctrl+C to stop.\n');
} else {
  // One-time execution mode (manual)
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { DAILY_TARGETS } from './constants.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ============================================================
// CONFIGURATION: Set your date range here
// ============================================================
const START_DATE = '2026-02-09';  // Start date (inclusive)
const END_DATE = '2026-03-15';    // End date (inclusive)
// ============================================================

/**
 * Update connected_at for kaia_2048_users with note='bot' based on daily targets
 * Each date updates a number of records equal to the difference from the previous date
 */
async function updateBotConnectedDates() {
  try {
    // Get all dates from DAILY_TARGETS and sort them chronologically
    const allDates = Object.keys(DAILY_TARGETS).sort();
    
    // Filter dates within the specified range
    const dates = allDates.filter(date => date >= START_DATE && date <= END_DATE);
    
    console.log('🤖 Starting to update connected_at for bot users');
    console.log(`📅 Date Range: ${START_DATE} to ${END_DATE}`);
    console.log(`📅 Processing ${dates.length} dates from ${dates[0]} to ${dates[dates.length - 1]}\n`);
    
    if (dates.length === 0) {
      console.log('❌ No dates found in the specified range!');
      return;
    }
    
    let totalUpdated = 0;
    
    // Get the previous date's gameConnectedWallets to calculate the first difference
    const firstDate = dates[0];
    const firstDateIndex = allDates.indexOf(firstDate);
    let previousGameConnected = firstDateIndex > 0 
      ? DAILY_TARGETS[allDates[firstDateIndex - 1]].gameConnectedWallets 
      : 0;
    
    // Show expected update counts
    console.log('📋 Expected updates per date:');
    let tempPrevious = previousGameConnected;
    let totalExpected = 0;
    dates.forEach(date => {
      const count = DAILY_TARGETS[date].gameConnectedWallets - tempPrevious;
      if (count > 0) {
        console.log(`   ${date}: ${count.toLocaleString()}`);
        totalExpected += count;
      }
      tempPrevious = DAILY_TARGETS[date].gameConnectedWallets;
    });
    console.log(`   Total expected: ${totalExpected.toLocaleString()}\n`);
    
    // First, check how many records need to be updated
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM kaia_2048_users 
      WHERE connected_at IS NULL AND note = 'bot'
    `;
    const checkResult = await pool.query(checkQuery);
    const availableRecords = parseInt(checkResult.rows[0].count);
    console.log(`📊 Available bot records to update: ${availableRecords.toLocaleString()}\n`);
    
    // Process each date
    for (const date of dates) {
      const target = DAILY_TARGETS[date];
      
      // Calculate the difference from previous date
      const currentGameConnected = target.gameConnectedWallets;
      const updateCount = currentGameConnected - previousGameConnected;
      
      if (updateCount <= 0) {
        console.log(`⚠️  ${date}: Skipping (count: ${updateCount})`);
        previousGameConnected = currentGameConnected;
        continue;
      }
      
      // Update records with LIMIT
      const updateQuery = `
        UPDATE kaia_2048_users 
        SET connected_at = $1
        WHERE id IN (
          SELECT id 
          FROM kaia_2048_users 
          WHERE connected_at IS NULL AND note = 'bot'
          LIMIT $2
        )
      `;
      
      const result = await pool.query(updateQuery, [date, updateCount]);
      const actualUpdated = result.rowCount;
      totalUpdated += actualUpdated;
      
      const status = actualUpdated === updateCount ? '✅' : '⚠️';
      console.log(
        `${status} ${date}: Updated ${actualUpdated.toLocaleString()}/${updateCount.toLocaleString()} records ` +
        `(cumulative: ${currentGameConnected.toLocaleString()})`
      );
      
      // If we couldn't update all records, we've run out
      if (actualUpdated < updateCount) {
        console.log(`\n⚠️  Insufficient records! Needed ${updateCount.toLocaleString()} but only ${actualUpdated.toLocaleString()} available.`);
        break;
      }
      
      previousGameConnected = currentGameConnected;
    }
    
    console.log('\n' + '='.repeat(70));
    console.log(`✨ Update Complete!`);
    console.log(`📊 Total bot records updated: ${totalUpdated.toLocaleString()}`);
    console.log('='.repeat(70) + '\n');
    
    // Verify the results
    const verifyQuery = `
      SELECT 
        connected_at,
        COUNT(*) as count
      FROM kaia_2048_users
      WHERE note = 'bot' AND connected_at IS NOT NULL
      GROUP BY connected_at
      ORDER BY connected_at
    `;
    
    console.log('📋 Verification - Bot records per date:');
    const verifyResult = await pool.query(verifyQuery);
    
    let cumulativeCount = 0;
    verifyResult.rows.forEach(row => {
      cumulativeCount += parseInt(row.count);
      const expected = DAILY_TARGETS[row.connected_at]?.gameConnectedWallets || '?';
      console.log(
        `   ${row.connected_at}: ${parseInt(row.count).toLocaleString()} records ` +
        `(cumulative: ${cumulativeCount.toLocaleString()}, expected: ${expected.toLocaleString()})`
      );
    });
    
    // Check remaining NULL records
    const remainingResult = await pool.query(checkQuery);
    const remainingRecords = parseInt(remainingResult.rows[0].count);
    console.log(`\n   Remaining NULL bot records: ${remainingRecords.toLocaleString()}\n`);
    
  } catch (error) {
    console.error('❌ Error updating bot connected dates:', error);
    throw error;
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
updateBotConnectedDates();

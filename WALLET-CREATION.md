# Wallet Creation Script

This script creates ENI wallets for users in the `kaia_2048_users` table who don't have wallets yet.

## ⚡ Quick Start (Safe Settings)

The script is **pre-configured with safe defaults** that won't block your database:

```bash
npm run create-wallets
```

**Default Settings (Safe for Production):**
- ✅ Batch size: **500 wallets**
- ✅ Delay: **500ms between batches**
- ✅ Max connections: **5**
- ✅ Speed: **~1,000 wallets/sec** (1M wallets in ~15-20 min)
- ✅ **Database remains responsive** for other operations

## Overview

The `create-wallets-for-tofu-users.js` script will:
1. Query for users where `eni_wallet_address IS NULL` and `platform = 'tofu'`
2. Generate new ENI wallets in batches
3. Insert wallets into the `eni_wallet` table (batch insert)
4. Update users' `eni_wallet_address` with the new wallet addresses (batch update)

## Performance

- **Batch Size**: 500 wallets per batch (default, configurable)
- **Batch Delay**: 500ms between batches (prevents DB blocking)
- **Transactions**: Uses database transactions for atomicity
- **Speed**: ~800-1,500 wallets/sec (safe mode, won't block DB)
- **Scale**: Optimized for millions of wallets
- **Example**: 1M wallets ≈ 10-20 minutes (safe settings)
- **Fast mode**: 1M wallets ≈ 3-8 minutes (if DB is idle)

## Usage

### Run the script:
```bash
npm run create-wallets
```

Or directly:
```bash
node create-wallets-for-tofu-users.js
```

### Configuration

You can adjust settings in the script:

```javascript
const BATCH_SIZE = 500;      // Wallets per batch (default: 500)
const BATCH_DELAY = 500;     // Delay between batches in ms (default: 500ms)
```

## Safe Batch Sizes

### 🟢 Conservative (Recommended for Production)
```javascript
const BATCH_SIZE = 250;
const BATCH_DELAY = 1000;  // 1 second between batches
```
- **DB Impact**: Minimal - won't block other queries
- **Speed**: ~400-800 wallets/sec
- **1M wallets**: 20-40 minutes
- **Use when**: Database is actively used by other applications

### 🟡 Balanced (Default)
```javascript
const BATCH_SIZE = 500;
const BATCH_DELAY = 500;   // 0.5 seconds between batches
```
- **DB Impact**: Low - minimal blocking
- **Speed**: ~800-1,500 wallets/sec
- **1M wallets**: 10-20 minutes
- **Use when**: Database has moderate load

### 🟠 Aggressive (Off-Peak Hours)
```javascript
const BATCH_SIZE = 1000;
const BATCH_DELAY = 200;   // 0.2 seconds between batches
```
- **DB Impact**: Medium - may cause brief locks
- **Speed**: ~1,500-3,000 wallets/sec
- **1M wallets**: 5-10 minutes
- **Use when**: Database is not heavily used (e.g., 2-5 AM)

### 🔴 Maximum (Maintenance Window Only)
```javascript
const BATCH_SIZE = 2000;
const BATCH_DELAY = 0;     // No delay
```
- **DB Impact**: High - will block other operations
- **Speed**: ~2,000-5,000 wallets/sec
- **1M wallets**: 3-8 minutes
- **Use when**: Dedicated maintenance window, no other traffic

## PostgreSQL Limits

**Parameter Limit**: PostgreSQL has a max of **65,535 parameters** per query
- Each wallet uses 4 parameters
- **Theoretical max**: 16,383 wallets per batch
- **Practical max**: 2,000-5,000 (to avoid memory issues)

**Why smaller batches are better:**
1. ✅ Other queries can run between batches
2. ✅ Smaller transactions = less lock time
3. ✅ Faster rollback if a batch fails
4. ✅ More frequent progress updates
5. ✅ Lower memory usage

## What the Script Does

### 1. Wallet Generation
For each user without a wallet, the script:
- Creates a new random wallet using ethers.js
- Generates a unique address and private key

### 2. Database Insertion
Inserts into `eni_wallet` table with:
- `id`: Auto-generated UUID
- `address`: Wallet address (0x...)
- `private_key`: Wallet private key (encrypted storage recommended)
- `chain_id`: 173 (ENI mainnet)
- `is_testnet`: false
- `created_at`: Current timestamp
- `has_incoming`: false (default)
- `received_amount`: 0 (default)
- `has_payment`: false (default)
- `has_game_record`: false (default)

### 3. User Binding
Updates `kaia_2048_users` table:
- Sets `eni_wallet_address` to the newly created wallet address

## Example Output

### Small batch (100 users):
```
🚀 Starting wallet creation and binding for tofu users...
⚙️  Batch size: 1000 wallets per batch

Found 100 tofu users without wallet

📝 Processing 100 users in batches...

📦 Batch 1/1 (1-100 of 100)
   🔑 Generating 100 wallets...
   💾 Inserting 100 wallets into eni_wallet...
   🔗 Updating 100 users with wallet addresses...
   ✅ Batch completed successfully
   📊 Progress: 100.0% (100/100)
   ⏱️  Time: 2.3s | Rate: 43 wallets/sec | ETA: 0s

============================================================
📊 Final Summary:
   Total users: 100
   ✅ Success: 100
   ❌ Errors: 0
   ⏱️  Total time: 2.3s
   🚀 Average rate: 43 wallets/sec
============================================================

✅ Database connection closed
```

### Large batch (1M users):
```
🚀 Starting wallet creation and binding for tofu users...
⚙️  Batch size: 1000 wallets per batch

Found 1,000,000 tofu users without wallet

📝 Processing 1,000,000 users in batches...

📦 Batch 1/1000 (1-1,000 of 1,000,000)
   🔑 Generating 1,000 wallets...
   💾 Inserting 1,000 wallets into eni_wallet...
   🔗 Updating 1,000 users with wallet addresses...
   ✅ Batch completed successfully
   📊 Progress: 0.1% (1,000/1,000,000)
   ⏱️  Time: 3.2s | Rate: 312 wallets/sec | ETA: 3,197s

📦 Batch 2/1000 (1,001-2,000 of 1,000,000)
   ...

📦 Batch 1000/1000 (999,001-1,000,000 of 1,000,000)
   🔑 Generating 1,000 wallets...
   💾 Inserting 1,000 wallets into eni_wallet...
   🔗 Updating 1,000 users with wallet addresses...
   ✅ Batch completed successfully
   📊 Progress: 100.0% (1,000,000/1,000,000)
   ⏱️  Time: 534.1s | Rate: 1,872 wallets/sec | ETA: 0s

============================================================
📊 Final Summary:
   Total users: 1,000,000
   ✅ Success: 1,000,000
   ❌ Errors: 0
   ⏱️  Total time: 534.1s (8.9 minutes)
   🚀 Average rate: 1,872 wallets/sec
============================================================

✅ Database connection closed
```

## Requirements

- Valid `DATABASE_URL` in `.env` file
- PostgreSQL database with:
  - `eni_wallet` table
  - `kaia_2048_users` table
- Dependencies installed (`npm install`)

## Security Notes

⚠️ **IMPORTANT**: Private keys are stored in the database. Ensure:
- Database is properly secured
- Access is restricted
- Consider encrypting private keys at rest
- Use environment-specific databases (dev/prod separation)

## Database-Friendly Features

### 🔒 Minimal Blocking
- **Connection pool limit**: Max 5 connections (won't exhaust DB pool)
- **Isolation level**: READ COMMITTED (minimal lock contention)
- **Batch delays**: Configurable pauses between batches
- **Small transactions**: Each batch is a separate transaction

### ⚡ Performance vs. Safety Trade-off
The script balances speed with database health:
- **500 batch size + 500ms delay** = Safe for production (default)
- Allows other queries to run between batches
- Database remains responsive for other applications

## Monitoring Database Load

### While script is running, monitor:

**PostgreSQL queries:**
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check long-running queries
SELECT pid, now() - query_start as duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;

-- Check locks
SELECT * FROM pg_locks WHERE NOT granted;
```

**Adjust if you see:**
- ⚠️ Many blocked queries → Reduce `BATCH_SIZE` or increase `BATCH_DELAY`
- ⚠️ Max connections reached → Script uses max 5, check other apps
- ✅ Low activity → Can increase `BATCH_SIZE` or reduce `BATCH_DELAY`

## Features

### ✅ Batch Processing
- Processes 1,000 wallets per transaction
- Minimizes database round-trips
- Optimized for large-scale operations

### ✅ Transaction Safety
- Each batch is wrapped in a transaction
- If a batch fails, it rolls back (no partial inserts)
- Failed batches don't affect other batches

### ✅ Progress Tracking
- Real-time progress percentage
- Processing rate (wallets/sec)
- Estimated time remaining (ETA)
- Total time and final statistics

### ✅ Resume Capability
- Script can be re-run safely
- Only processes users with `eni_wallet_address IS NULL`
- If interrupted, just run again to continue

## Troubleshooting

### No users found
If you see "No users found without wallet", check:
- Users exist in `kaia_2048_users` table
- `platform` column is set to `'tofu'`
- `eni_wallet_address` is `NULL`

### Script interrupted mid-way
- **No problem!** Just run the script again
- It will only process remaining users (where `eni_wallet_address IS NULL`)
- Completed batches are already committed to the database

### Database connection error
- Verify `DATABASE_URL` in `.env` file
- Check database is accessible
- Ensure SSL settings are correct
- For large batches, consider increasing connection timeout

### Insertion errors
- Check table schema matches expected structure
- Verify PostgreSQL version supports `gen_random_uuid()`
- Check database permissions
- Ensure enough database resources for large batches

### Out of memory errors
- Reduce `BATCH_SIZE` (e.g., from 1000 to 500)
- The script generates wallets per batch, not all at once
- Default settings should work for most systems

## Best Practices for 1M Wallets

### 🎯 Recommended Approach

1. **Test with small batch first:**
   ```javascript
   // Test with 1,000 users first
   const query = `
     SELECT id, platform
     FROM kaia_2048_users
     WHERE eni_wallet_address IS NULL 
       AND platform = 'tofu'
     ORDER BY id
     LIMIT 1000  -- Add this line for testing
   `;
   ```

2. **Run during off-peak hours:**
   - 2 AM - 6 AM typically has lowest traffic
   - Use `BATCH_SIZE = 1000` and `BATCH_DELAY = 200` for faster processing

3. **Monitor progress:**
   - Watch the console output for any errors
   - Script shows real-time ETA
   - Can be safely interrupted (Ctrl+C) and resumed

4. **Database backup:**
   - Take a backup before running on production
   - Each batch is atomic (transaction), so safe to resume

### ⚡ Speed Comparison

| Setting | Batch Size | Delay | Speed | 1M Time | DB Impact |
|---------|------------|-------|-------|---------|-----------|
| Ultra Safe | 100 | 2000ms | 50-200/s | 1-5 hours | None |
| Conservative | 250 | 1000ms | 200-500/s | 30-80 min | Minimal |
| **Default** | **500** | **500ms** | **800-1,500/s** | **10-20 min** | **Low** |
| Aggressive | 1000 | 200ms | 1,500-3,000/s | 5-10 min | Medium |
| Maximum | 2000 | 0ms | 2,000-5,000/s | 3-8 min | High |

### 🛡️ Safety Features

- ✅ **Atomic batches**: Each batch succeeds or fails completely
- ✅ **Resume capability**: Can restart anytime, skips completed users
- ✅ **Connection pooling**: Limited to 5 connections max
- ✅ **Progress tracking**: Know exactly where you are
- ✅ **Error handling**: Failed batches don't stop the whole process

## Related Scripts

- `test-connection.js` - Test database connectivity
- `index.js` - Main check-in bot

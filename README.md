# ENI Check-in Bot 🤖

An automated bot that executes check-in transactions on an ENI blockchain smart contract using wallet credentials stored in a PostgreSQL database.

## Features

- ✅ Fetches eligible wallets from PostgreSQL database (randomized order)
- ✅ Executes check-in smart contract function automatically
- ✅ **Parallel batch processing** for high-speed execution
- ✅ Updates database after successful transactions (deducts gas costs)
- ✅ Comprehensive error handling and logging
- ✅ Configurable batch size and rate limiting
- ✅ Gas estimation and balance checking
- ✅ Event parsing and confirmation tracking

## Prerequisites

- Node.js 18+ (for ES modules support)
- PostgreSQL database access
- Wallets with sufficient EGAS balance for gas fees

## Installation

1. Clone or navigate to the project directory:
```bash
cd sc-checkin-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your configuration:
```bash
# Copy the example configuration
DATABASE_URL=postgres://username:password@host:port/database
CONTRACT_ADDRESS=0x34473292ceb92186e31ff4cb6db53eac17f89104
RPC_URL=https://rpc.eniac.network
CHAIN_ID=173
```

## Configuration

### Performance Tuning

You can adjust batch processing parameters based on your needs:

```bash
# .env file
BATCH_SIZE=10      # Process 10 wallets in parallel
BATCH_DELAY=3000   # Wait 3 seconds between batches
```

**Recommendations:**
- **Small scale (< 100 wallets)**: `BATCH_SIZE=5-10`
- **Medium scale (100-1000 wallets)**: `BATCH_SIZE=10-20`
- **Large scale (> 1000 wallets)**: `BATCH_SIZE=20-50`

**Note:** Higher batch sizes process faster but may hit RPC rate limits. Adjust based on your RPC endpoint's capabilities.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `CONTRACT_ADDRESS` | Smart contract address | `0x34473292ceb92186e31ff4cb6db53eac17f89104` |
| `RPC_URL` | ENI RPC endpoint | `https://rpc.eniac.network` |
| `CHAIN_ID` | Network chain ID | `173` |
| `BATCH_SIZE` | Number of parallel transactions per batch | `10` |
| `BATCH_DELAY` | Delay between batches (milliseconds) | `3000` |

### Database Schema

The bot expects an `eni_wallet` table with the following structure:

```sql
- id (uuid)
- address (text) - Wallet address
- private_key (text) - Private key for signing transactions
- has_payment (boolean) - Payment status flag
- has_incoming (boolean) - Incoming transaction flag
- received_amount (numeric) - Amount received
- has_game_record (boolean) - Check-in completion flag
```

### Eligibility Criteria

Wallets are selected based on:
- `has_payment = FALSE`
- `has_incoming = TRUE`
- `received_amount >= 0.09 AND received_amount <= 0.3`

## Usage

### Run check-in once (recommended):
```bash
npm run once
```
This runs the check-in immediately and exits when complete.

### Alternative - Run once using index.js:
```bash
npm run run-once
# or
RUN_ONCE=true node index.js
```

### Run as cron scheduler (keeps running):
```bash
npm start
# or
npm run cron
```
This starts the cron scheduler that runs check-ins at scheduled times (default: daily at 8 AM).

### Run in development mode (with auto-reload):
```bash
npm run dev
```

### Manual cron setup (optional):
If you prefer system cron instead of node-cron, add to crontab:
```bash
0 9 * * * cd /path/to/sc-checkin-bot && npm run once >> logs/checkin.log 2>&1
```

## How It Works

1. **Initialization**: Bot connects to database and verifies contract
2. **Wallet Selection**: Queries database for eligible wallets
3. **Check-in Execution**:
   - Validates wallet balance
   - Estimates gas requirements
   - Sends check-in transaction
   - Waits for confirmation
4. **Batch Processing**: Splits wallets into batches (default: 10 per batch)
5. **Parallel Execution**: Processes multiple transactions simultaneously
6. **Database Update**: Updates `received_amount` by deducting gas costs
7. **Rate Limiting**: Configurable delay between batches
8. **Summary Report**: Displays success/failure statistics

## Smart Contract Details

- **Contract Address**: `0x34473292ceb92186e31ff4cb6db53eac17f89104`
- **Network**: ENI Mainnet (Chain ID: 173)
- **Function**: `checkIn()` - Non-payable function with no parameters
- **Event**: `CheckIn(address indexed user, uint256 day)`

## Error Handling

The bot handles various error scenarios:

- **Insufficient Balance**: Skips wallet if insufficient gas
- **Already Checked In**: Detects and skips (CALL_EXCEPTION)
- **Nonce Errors**: Handles pending transaction conflicts
- **Database Errors**: Logs but continues processing
- **Network Issues**: Retry logic and timeout handling

## Output Example

```
============================================================
🤖 ENI Check-in Bot Starting...
============================================================
Started at: 2025-12-30T10:00:00.000Z

Contract Address: 0x34473292ceb92186e31ff4cb6db53eac17f89104
RPC URL: https://rpc.eniac.network
✅ Contract verified

📊 Fetching eligible wallets from database...
Found 25 eligible wallets

🎯 Found 25 wallet(s) to process
⚡ Batch size: 10 parallel transactions
⏱️  Delay between batches: 3000ms

📦 Split into 3 batch(es)

============================================================
📦 BATCH 1/3 - Processing 10 wallet(s) in parallel
============================================================

────────────────────────────────────────────────────────────
Processing 1/25: 0x1234...5678

🔄 Processing wallet: 0x1234...5678
   Balance: 0.15 EGAS
   Estimated gas: 50000
   Sending check-in transaction...
   Transaction sent: 0xabcd...
   Waiting for confirmation...
   ✅ Check-in successful!
   Block: 123456789
   Gas used: 45000
   Check-in day: 5
   💾 Updated wallet balance:
      Previous: 0.15 EGAS
      Gas used: 0.000945 EGAS
      New balance: 0.149055 EGAS
      Transaction: 0xabcd...
   📝 Check-in logged: 0x1234...5678 at block 123456789

📊 Batch 1 complete: ✅ 8 success, ❌ 1 failed, ⚠️ 1 skipped

⏳ Waiting 3000ms before next batch...

============================================================
📦 BATCH 2/3 - Processing 10 wallet(s) in parallel
============================================================
...

============================================================
📋 SUMMARY
============================================================
Total wallets processed: 25
✅ Successful check-ins: 23
❌ Failed check-ins: 1
⚠️  Skipped: 1
Completed at: 2025-12-30T10:01:30.000Z
============================================================

👋 Bot execution completed
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Private Keys**: Never commit `.env` file or expose private keys
2. **Database Access**: Use read-only credentials if possible
3. **SSL/TLS**: Ensure database connections use SSL
4. **Rate Limiting**: Built-in 2-second delay prevents spam
5. **Gas Limits**: Set reasonable gas limits to prevent excessive costs

## Troubleshooting

### "CALL_EXCEPTION" Error
- User may have already checked in today
- Contract might be paused or have restrictions
- Check contract state and user eligibility

### "INSUFFICIENT_FUNDS" Error
- Wallet doesn't have enough EGAS for gas
- Top up wallet balance before retrying

### Connection Timeout
- Check RPC endpoint availability
- Try alternative RPC endpoints (see config.example.js)

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check SSL settings for remote databases
- Ensure firewall allows connections

## Alternative RPC Endpoints

If the default RPC has issues, try these alternatives:

```bash
# ENI Mainnet (HTTP)
RPC_URL=https://rpc.eniac.network

# ENI Mainnet (WebSocket)
RPC_URL=wss://rpc.eniac.network/ws/

# ENI Testnet (HTTP)
RPC_URL=https://rpc-testnet.eniac.network
CHAIN_ID=174

# ENI Testnet (WebSocket)
RPC_URL=wss://rpc-testnet.eniac.network/ws/
CHAIN_ID=174
```

**Note:** Use the official ENI endpoint `https://rpc.eniac.network` for best reliability.
**Block Explorer:** https://scan.eniac.network/

## License

MIT

## Support

For issues or questions, please check:
- ENI documentation: https://eniac.network
- ENI Block Explorer: https://scan.eniac.network
- Ethers.js documentation: https://docs.ethers.org


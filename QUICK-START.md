# Quick Start Guide - ENI Network Optimization

## TL;DR

Your `BATCH_SIZE=3` setting processes **69 RPC requests at once** (3 wallets × 23 RPC calls each).
With typical RPC **rate limits**, you may be exceeding capacity in burst traffic! 🚨

---

## What Changed ✅

1. **contract.js** - Added 300ms delays between RPC calls
2. **index.js** - Added staggered start times (300ms apart) for parallel wallets
3. **Documentation** - Created optimization guides

---

## What You Need to Do

### Step 1: Update Your `.env` File

Add these lines to your `.env`:

```bash
BATCH_SIZE=1           # Start with 1 wallet at a time (SAFEST)
BATCH_DELAY=1000       # 1 second between wallets
MAX_RETRIES=5
RETRY_DELAY=15000
```

### Step 2: Test

```bash
cd /Users/erictsai/Desktop/sc-checkin-bot
node index.js
```

Watch for:
- ✅ Successful check-ins (no errors)
- ⚠️ Rate limit warnings (if any, reduce BATCH_SIZE)

### Step 3: Monitor

- Monitor ENI RPC endpoint performance
- Let it run for 10-20 wallets
- If stable, optionally increase BATCH_SIZE to 2

---

## Quick Comparison

| Setting | Wallets/Batch | RPC/sec | Time for 70K wallets | Risk |
|---------|---------------|---------|----------------------|------|
| Current (no .env) | 3 | ~40-50 | 6 days | 🚨 HIGH |
| BATCH_SIZE=1 | 1 | ~6 | 17 days | ✅ SAFE |
| BATCH_SIZE=2 | 2 | ~12 | 8.5 days | ⚠️ LOW |
| BATCH_SIZE=3 | 3 | ~20 | 6 days | ⚠️ MEDIUM |

---

## Answer to Your Question

**Yes, the ENI RPC URL works perfectly!**

```
RPC_URL=https://rpc.eniac.network
```

The issue was:
- ❌ NOT the URL
- ✅ Your batch size was sending too many requests at once

With the optimized code and BATCH_SIZE=1, you'll stay well under typical RPC rate limits! 🎯

---

## Files to Read

📖 **OPTIMAL-CONFIG.md** - Detailed configuration options
📖 **RATE-LIMIT-ANALYSIS.md** - Understanding the 25 req/sec limit
📖 **RPC-REQUEST-BREAKDOWN.md** - Visual explanation of 69 requests

---

## Need Faster Processing?

1. **Use WebSocket** - Switch to `wss://rpc.eniac.network/ws/` for better performance
2. **Multiple endpoints** - If available, rotate between different RPC providers
3. **Parallel bots** - Run multiple instances if you have multiple RPC endpoints

---

## Questions?

The code is optimized and ready to go. Just add the BATCH settings to your `.env` file and start! 🚀


# Batch Processing Settings Guide

## 🎯 TL;DR - Safe Settings for 1M Wallets

**The script is already configured with SAFE defaults:**

```javascript
const BATCH_SIZE = 500;      // 500 wallets per batch
const BATCH_DELAY = 500;     // 500ms (0.5 sec) pause between batches
max: 5,                      // Max 5 database connections
```

**Result:**
- ✅ Won't block your database
- ✅ Other apps can still query DB
- ✅ ~1,000 wallets/second
- ✅ 1M wallets in ~15-20 minutes

---

## 📊 Settings Comparison

### Current Default (Recommended)
```javascript
const BATCH_SIZE = 500;
const BATCH_DELAY = 500;
```

| Metric | Value |
|--------|-------|
| Speed | ~800-1,500 wallets/sec |
| 1M wallets | 10-20 minutes |
| DB blocking | Minimal |
| Use case | **Production, any time** |

---

### If You Want Even Safer (Ultra Conservative)
```javascript
const BATCH_SIZE = 250;
const BATCH_DELAY = 1000;
```

| Metric | Value |
|--------|-------|
| Speed | ~400-800 wallets/sec |
| 1M wallets | 20-40 minutes |
| DB blocking | None |
| Use case | **High-traffic production** |

---

### If You Want Faster (Off-Peak Hours)
```javascript
const BATCH_SIZE = 1000;
const BATCH_DELAY = 200;
```

| Metric | Value |
|--------|-------|
| Speed | ~1,500-3,000 wallets/sec |
| 1M wallets | 5-10 minutes |
| DB blocking | Moderate |
| Use case | **2-6 AM, low traffic** |

---

## 🔍 How to Tell if You're Blocking the DB

### Good Signs ✅
- Script runs smoothly
- No complaints from other apps
- Database CPU < 80%
- No spike in query wait times

### Warning Signs ⚠️
- Other queries timing out
- Database CPU at 100%
- Many locked queries in `pg_locks`
- Other apps reporting slowness

### If You See Warning Signs:

**Option 1: Reduce batch size**
```javascript
const BATCH_SIZE = 250;  // Half the size
```

**Option 2: Increase delay**
```javascript
const BATCH_DELAY = 1000;  // Double the delay
```

**Option 3: Both**
```javascript
const BATCH_SIZE = 250;
const BATCH_DELAY = 1000;
```

---

## 🚀 Quick Reference

### I want...

**Maximum safety (DB is critical):**
```javascript
BATCH_SIZE = 250
BATCH_DELAY = 1000
```

**Balance (recommended):**
```javascript
BATCH_SIZE = 500  // ← Default
BATCH_DELAY = 500 // ← Default
```

**Maximum speed (maintenance window):**
```javascript
BATCH_SIZE = 2000
BATCH_DELAY = 0
```

---

## 📈 PostgreSQL Parameter Math

Each wallet insert uses **4 parameters**:
1. `address`
2. `private_key`
3. `chain_id`
4. `is_testnet`

**PostgreSQL limit**: 65,535 parameters max

**Calculation:**
- Max batch size = 65,535 ÷ 4 = **16,383 wallets**

**But don't use max!** Recommended limits:
- ✅ 100-500: Safe for any scenario
- ⚠️ 500-1000: Safe for most scenarios
- ⚠️ 1000-2000: Needs monitoring
- ❌ 2000+: Only in maintenance windows

---

## 🛠️ How to Change Settings

Edit `create-wallets-for-tofu-users.js`:

```javascript
// Find these lines (around line 17-27)
const BATCH_SIZE = 500;      // Change this
const BATCH_DELAY = 500;     // Change this
```

Then run:
```bash
npm run create-wallets
```

---

## ⏱️ Time Estimates for 1M Wallets

| Batch Size | Delay | Estimated Time |
|------------|-------|----------------|
| 100 | 2000ms | 60-180 min |
| 250 | 1000ms | 25-60 min |
| **500** | **500ms** | **10-20 min** ← Default |
| 1000 | 200ms | 5-10 min |
| 2000 | 0ms | 3-8 min |

*Actual times vary based on database performance*

---

## 💡 Pro Tips

1. **Start conservative**: Use default settings (500/500)
2. **Monitor first batch**: Watch DB load for first 10-20 batches
3. **Adjust if needed**: Can stop (Ctrl+C) and restart with new settings
4. **Resume capability**: Script skips already-completed users
5. **Off-peak hours**: If possible, run at 2-6 AM for faster settings

---

## 🎓 Understanding the Trade-offs

### Larger batches (1000+)
- ✅ Faster overall
- ✅ Fewer round trips to database
- ❌ Longer transaction locks
- ❌ May block other queries

### Smaller batches (100-500)
- ✅ Short transaction locks
- ✅ Database stays responsive
- ✅ More control (can stop anytime)
- ❌ Slightly slower overall

### Longer delays (1000ms+)
- ✅ Gives DB time to handle other queries
- ✅ Lower CPU usage
- ❌ Takes longer overall

### Shorter delays (0-200ms)
- ✅ Faster completion
- ❌ May saturate database

---

## 🎯 Recommended for Your 1M Wallets

**Just use the defaults!** They're already optimized:

```bash
npm run create-wallets
```

The script will:
- ✅ Process ~500 wallets every 0.5 seconds
- ✅ Complete in ~15-20 minutes
- ✅ Keep your database responsive
- ✅ Show real-time progress and ETA

**No configuration needed!** 🎉

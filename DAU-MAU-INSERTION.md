# DAU/MAU Data Insertion Script

This script inserts DAU (Daily Active Users) and MAU (Monthly Active Users) data from `constants.js` into the `kaia_2048_daily_metrics` table with randomized distributions.

## Features

- Reads DAU/MAU data from `constants.js` DAILY_TARGETS
- Generates randomized distributions within specified percentage ranges
- Converts percentages to actual user counts based on DAU value
- Ensures all distributions sum to exactly the DAU count
- Supports processing all dates or a specific date
- Uses UPSERT logic (INSERT or UPDATE if date exists)

## Distribution Rules

### Language Distribution (dau_language)
| Language | Percentage Range | Example (DAU=107,845) |
|----------|------------------|----------------------|
| Chinese  | 74-77% | ~80,100 users |
| English  | 7-10% | ~8,600 users |
| Japanese | 6-8% | ~7,200 users |
| Thai     | 3-5% | ~4,300 users |
| Korean   | 0.5-1.5% | ~1,100 users |

### Device Distribution (dau_device)
| Device  | Percentage Range | Example (DAU=107,845) |
|---------|------------------|----------------------|
| Mobile  | 65-75% | ~75,200 users |
| Desktop | 25-35% | ~32,600 users |

### Channel Distribution (dau_channel)
| Channel | Percentage Range | Example (DAU=107,845) |
|---------|------------------|----------------------|
| Direct Link | 55-59% | ~61,500 users |
| Invited by friends | 14-20% | ~18,300 users |
| OKX Wallet | 15-16% | ~16,900 users |
| Bitget Wallet | 2-3% | ~2,700 users |
| Organic Social | 7-9% | ~8,600 users |

**Note:** All distributions contain actual user counts (integers), not percentages. The total of each distribution equals the DAU value exactly.

## Usage

### Process All Dates with DAU/MAU Data

```bash
node insert-dau-mau.js
```

This will process all dates in `DAILY_TARGETS` that have both `dau` and `mau` fields defined.

### Process a Specific Date

```bash
node insert-dau-mau.js 2026-02-01
```

This will only process the specified date if it exists in `DAILY_TARGETS` and has DAU/MAU data.

## Database Schema

The script inserts/updates data in the `kaia_2048_daily_metrics` table:

```sql
CREATE TABLE kaia_2048_daily_metrics (
  date DATE PRIMARY KEY,
  
  -- Core metrics
  task_page_view INT NOT NULL,
  task_unique_view INT NOT NULL,
  shop_page_view INT NOT NULL,
  shop_unique_view INT NOT NULL,
  dau INT NOT NULL,
  mau INT NOT NULL,
  
  -- Distribution data (JSONB)
  dau_language JSONB NOT NULL,
  dau_device JSONB NOT NULL,
  dau_channel JSONB NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Example Output

```
🚀 Starting DAU/MAU data insertion...

📊 Found 1 date(s) with DAU/MAU data

📅 Processing 2026-02-01:
   DAU: 107,845
   MAU: 730,182
   Language (sum=107,845): {"Chinese":81245,"English":9631,"Japanese":7240,"Thai":4508,"Korean":1221}
   Device (sum=107,845): {"Mobile":75192,"Desktop":32653}
   Channel (sum=107,845): {"Direct Link":61523,"Invited by friends":18364,"OKX Wallet":16874,"Bitget Wallet":2716,"Organic Social":8368}
   ✅ Successfully inserted/updated for 2026-02-01

============================================================
📋 SUMMARY
============================================================
✅ Success: 1
⏭️  Skipped: 0
❌ Failed: 0
📊 Total: 1
============================================================

👋 Database connection closed
```

## Notes

- The script will skip dates that don't have `dau` and `mau` fields in `DAILY_TARGETS`
- Distribution percentages are randomized within the specified ranges on each run
- All distributions contain **actual user counts** (integers) that sum to exactly the DAU value
- The script uses UPSERT logic, so running it multiple times will update existing records with new random distributions
- `task_page_view`, `task_unique_view`, `shop_page_view`, and `shop_unique_view` are set to 0 by default (they should be updated by the main bot)

## Requirements

- Node.js environment with ES modules support
- PostgreSQL database connection configured in `.env`
- `constants.js` file with DAILY_TARGETS data

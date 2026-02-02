# DAU/MAU Auto-Scheduler Guide

This guide shows you how to set up automatic daily insertion of DAU/MAU data at UTC 00:00, updating yesterday's data.

## Quick Start

### 1. Configure Environment Variables

Add these to your `.env` file:

```bash
# Set execution mode: 'cron' for scheduled automatic updates
DAU_MAU_MODE=cron

# Run daily at UTC 00:00 (midnight)
DAU_MAU_CRON_SCHEDULE=0 0 * * *
```

**Mode Options:**
- `manual` (default) - Run once and exit
- `cron` - Run on schedule only (waits for first scheduled time)
- `cron-immediate` - Run immediately + continue on schedule (useful for testing)

### 2. Run with PM2 (Recommended for Production)

#### Install PM2 globally:
```bash
npm install -g pm2
```

#### Start the scheduler:
```bash
pm2 start insert-dau-mau.js --name dau-mau-scheduler
```

#### View logs:
```bash
pm2 logs dau-mau-scheduler
```

#### Stop the scheduler:
```bash
pm2 stop dau-mau-scheduler
```
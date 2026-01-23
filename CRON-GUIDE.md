# Node-Cron Usage Guide

The bot now supports scheduled execution using `node-cron`. The bot will run continuously and execute check-ins at scheduled times.

## Quick Start

**Set up your cron schedule in `.env`**:
```bash
# Run daily at 9:00 AM
CRON_SCHEDULE=0 9 * * *

# Optional: Set your timezone
TIMEZONE=America/Los_Angeles

# Optional: Run immediately on startup
RUN_ON_STARTUP=true
```

## Running in Production

### Using PM2 (Recommended)

1. Install PM2:
```bash
npm install -g pm2
```

2. Start the bot:
```bash
pm2 start index.js --name eni-checkin-bot
```

3. View logs:
```bash
pm2 logs eni-checkin-bot
```

4. Auto-restart on reboot:
```bash
pm2 startup
pm2 save
```

5. Stop
```bash
pm2 stop eni-checkin-bot
```

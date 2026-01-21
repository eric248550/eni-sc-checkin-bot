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

### Using nohup

```bash
nohup npm start > logs/bot.log 2>&1 &
```

### Using systemd (Linux)

Create `/etc/systemd/system/eni-checkin-bot.service`:

```ini
[Unit]
Description=ENI Check-in Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/sc-checkin-bot
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable eni-checkin-bot
sudo systemctl start eni-checkin-bot
sudo systemctl status eni-checkin-bot
```

## Testing Your Schedule

To test without waiting, you can set a frequent schedule:

```bash
# Run every minute (for testing only!)
CRON_SCHEDULE="* * * * *"
RUN_ON_STARTUP=true
```

Start the bot and watch it execute every minute. Remember to change it back to your desired schedule!

## Stopping the Bot

Press `Ctrl+C` to gracefully shut down the bot. It will:
- Stop the cron scheduler
- Close database connections
- Exit cleanly

## Logs

The bot outputs:
- Start time and schedule information
- Each cron trigger with timestamp
- Full execution logs for each run
- Any errors encountered

Redirect logs to a file for production:
```bash
npm start > logs/checkin-bot.log 2>&1
```

Or use PM2 for automatic log management.

## Troubleshooting

### Bot runs immediately but not at scheduled time
- Check your `CRON_SCHEDULE` format
- Verify your `TIMEZONE` setting
- Check system time: `date`

### Bot exits after first run
- Make sure you're using the updated `index.js` with cron support
- Check for errors in the logs

### Database connection issues
- The bot keeps database connections open between runs
- Monitor for connection pool exhaustion
- Consider database connection limits

## Example .env Configuration

```bash
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/eni

# Contract
CONTRACT_ADDRESS=0x34473292ceb92186e31ff4cb6db53eac17f89104
RPC_URL=https://rpc.eniac.network
CHAIN_ID=8217

# Cron Settings
CRON_SCHEDULE=0 9 * * *
TIMEZONE=America/Los_Angeles
RUN_ON_STARTUP=false

# Batch Settings
BATCH_SIZE=5
BATCH_DELAY=2000
```


#!/bin/bash

# Cron job setup for automatic IP whitelist updates
# Run this script to set up automatic IP monitoring

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_SCRIPT="$SCRIPT_DIR/update-atlas-ip.sh"

echo "Setting up automatic IP whitelist updates..."

# Create cron job that runs every hour
CRON_JOB="0 * * * * cd $SCRIPT_DIR && ./update-atlas-ip.sh >> /var/log/atlas-ip-update.log 2>&1"

# Add to crontab if not already present
(crontab -l 2>/dev/null | grep -v "update-atlas-ip.sh"; echo "$CRON_JOB") | crontab -

echo "✅ Cron job added successfully"
echo "📅 IP whitelist will be checked and updated every hour"
echo "📋 Logs available at: /var/log/atlas-ip-update.log"

# Also create a daily cleanup job to remove old IP entries
CLEANUP_JOB="0 2 * * * cd $SCRIPT_DIR && ./cleanup-old-ips.sh >> /var/log/atlas-cleanup.log 2>&1"
(crontab -l 2>/dev/null | grep -v "cleanup-old-ips.sh"; echo "$CLEANUP_JOB") | crontab -

echo "✅ Daily cleanup job added (runs at 2 AM)"
echo ""
echo "Current crontab:"
crontab -l

#!/bin/bash

# MongoDB Atlas IP Update Script - Production Ready
# This script automatically updates your Atlas cluster's IP whitelist
# Supports both development and production environments

set -e  # Exit on any error

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuration from environment variables
ATLAS_PUBLIC_KEY="${ATLAS_PUBLIC_KEY:-}"
ATLAS_PRIVATE_KEY="${ATLAS_PRIVATE_KEY:-}"
ATLAS_GROUP_ID="${ATLAS_GROUP_ID:-}"
ENVIRONMENT="${NODE_ENV:-development}"

# Get current public IP
echo "🔍 Detecting current IP address..."
CURRENT_IP=$(curl -s https://ipinfo.io/ip 2>/dev/null || curl -s https://api.ipify.org)

if [ -z "$CURRENT_IP" ]; then
    echo "❌ Failed to detect IP address"
    exit 1
fi

echo "📍 Current IP: $CURRENT_IP"

# Production mode - use Atlas API
if [ "$ENVIRONMENT" = "production" ] && [ -n "$ATLAS_PUBLIC_KEY" ] && [ -n "$ATLAS_PRIVATE_KEY" ] && [ -n "$ATLAS_GROUP_ID" ]; then
    echo "🚀 Production mode: Updating Atlas whitelist via API..."
    
    # Create IP access list entry
    RESPONSE=$(curl -s -u "$ATLAS_PUBLIC_KEY:$ATLAS_PRIVATE_KEY" \
        --digest \
        --header "Accept: application/json" \
        --header "Content-Type: application/json" \
        --request POST \
        "https://cloud.mongodb.com/api/atlas/v1.0/groups/$ATLAS_GROUP_ID/accessList" \
        --data "{
            \"ipAddress\": \"$CURRENT_IP\",
            \"comment\": \"Auto-updated $(date '+%Y-%m-%d %H:%M:%S')\",
            \"deleteAfterDate\": \"$(date -d '+7 days' -u +%Y-%m-%dT%H:%M:%SZ)\"
        }" 2>/dev/null)
    
    if echo "$RESPONSE" | grep -q "ipAddress"; then
        echo "✅ Successfully added IP $CURRENT_IP to Atlas whitelist"
        echo "⏰ Entry will auto-expire in 7 days"
    else
        echo "⚠️  IP might already be whitelisted or error occurred"
        echo "Response: $RESPONSE"
    fi
    
else
    echo "🛠️  Development mode or missing Atlas API credentials"
    echo ""
    echo "For automated production setup:"
    echo "1. Go to Atlas → Access Manager → API Keys"
    echo "2. Create a new API key with 'Project Owner' permissions"
    echo "3. Add these to your production environment:"
    echo "   ATLAS_PUBLIC_KEY=your-public-key"
    echo "   ATLAS_PRIVATE_KEY=your-private-key"
    echo "   ATLAS_GROUP_ID=your-project-id"
    echo "   NODE_ENV=production"
    echo ""
    echo "Manual action required:"
    echo "Add this IP to your Atlas whitelist: $CURRENT_IP/32"
fi

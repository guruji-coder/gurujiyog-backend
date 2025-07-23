#!/bin/bash

# Production deployment script with MongoDB connection handling
# This script handles IP whitelist updates and server deployment

set -e

echo "🚀 Starting production deployment..."

# Load production environment
if [ -f .env.production ]; then
    export $(grep -v '^#' .env.production | xargs)
    echo "✅ Loaded production environment"
else
    echo "❌ .env.production file not found"
    exit 1
fi

# Update Atlas IP whitelist
echo "🔄 Updating MongoDB Atlas IP whitelist..."
./update-atlas-ip.sh

# Wait for IP whitelist to propagate
echo "⏳ Waiting for IP whitelist to propagate (30 seconds)..."
sleep 30

# Test MongoDB connection
echo "🔍 Testing MongoDB connection..."
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, { 
    serverSelectionTimeoutMS: 5000 
}).then(() => {
    console.log('✅ MongoDB connection successful');
    process.exit(0);
}).catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
});
"

# Build and start the application
echo "🏗️  Building application..."
npm run build

echo "🚀 Starting production server..."
npm start

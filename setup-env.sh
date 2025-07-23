#!/bin/bash

echo "🔧 Setting up GurujiYog Environment Configuration"
echo "================================================"

# Check if .env file exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env file
echo "📝 Creating .env file..."

cat > .env << 'EOF'
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/gurujiyog

# Server Configuration
PORT=4001
NODE_ENV=development
BACKEND_URL=http://localhost:4001
FRONTEND_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Facebook OAuth Configuration
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Email Configuration (for OTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Optional: Google Maps API
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
EOF

echo "✅ .env file created successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Follow the Google API setup guide in GOOGLE_API_SETUP.md"
echo "2. Replace the placeholder values in .env with your actual API keys"
echo "3. Run 'npm run dev' to start the server"
echo ""
echo "🔑 Required API Keys:"
echo "- GOOGLE_CLIENT_ID"
echo "- GOOGLE_CLIENT_SECRET"
echo "- GOOGLE_MAPS_API_KEY (optional)"
echo ""
echo "📖 See GOOGLE_API_SETUP.md for detailed instructions" 
# Google API Setup Guide

## 🔑 Required Google API Keys

Your application needs the following Google API keys:

### 1. Google OAuth 2.0 (Required)

- **GOOGLE_CLIENT_ID**
- **GOOGLE_CLIENT_SECRET**

### 2. Google Maps API (Optional)

- **GOOGLE_MAPS_API_KEY** (for location services)

---

## 📋 Step-by-Step Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `gurujiyog`
4. Click "Create"

### Step 2: Enable Required APIs

1. In your project, go to "APIs & Services" → "Library"
2. Search and enable these APIs:
   - **Google+ API** (for OAuth)
   - **Google Maps JavaScript API** (optional, for maps)
   - **Places API** (optional, for location search)

### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Configure:
   - **Name**: `GurujiYog OAuth`
   - **Authorized JavaScript origins**:
     ```
     http://localhost:3000
     http://localhost:4001
     https://yourdomain.com (production)
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:4001/api/auth/google/callback
     https://yourdomain.com/api/auth/google/callback (production)
     ```
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

### Step 4: Create Google Maps API Key (Optional)

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API key
4. **Important**: Restrict the API key to:
   - Only the APIs you're using
   - Your domain (localhost for development)

---

## 🔧 Environment Configuration

Create a `.env` file in your backend directory:

```bash
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
```

---

## 🚀 Testing Your Setup

### Test OAuth Login

1. Start your server:

   ```bash
   cd gurujiyog-backend
   npm run dev
   ```

2. Visit: `http://localhost:4001/api/auth/google`

3. You should be redirected to Google's OAuth consent screen

### Test Google Maps (if configured)

1. Add the API key to your frontend
2. Test location services in your app

---

## 🔒 Security Best Practices

### 1. API Key Restrictions

- **OAuth Client ID**: Restrict to your domains
- **Maps API Key**: Restrict to specific APIs and domains

### 2. Environment Variables

- Never commit `.env` files to git
- Use different keys for development/production
- Rotate keys regularly

### 3. Production Setup

- Use HTTPS URLs in production
- Set up proper domain restrictions
- Monitor API usage

---

## 🆘 Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch"**
   - Check your redirect URIs in Google Console
   - Ensure exact match with your callback URL

2. **"invalid_client"**
   - Verify your Client ID and Secret
   - Check if OAuth is enabled

3. **"access_denied"**
   - Check if your app is in testing mode
   - Add test users if needed

### Getting Help:

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Maps API Documentation](https://developers.google.com/maps/documentation)

---

## 📝 Next Steps

1. Set up your `.env` file with the keys
2. Test OAuth login
3. Configure email settings for OTP
4. Set up production environment
5. Monitor API usage in Google Console

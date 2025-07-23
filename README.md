# GurujiYog Backend API

> **Modern Fastify-based backend API for yoga shala discovery and booking platform**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.4+-green)](https://www.fastify.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.0+-darkgreen)](https://www.mongodb.com/)
[![Jest](https://img.shields.io/badge/Jest-Testing-red)](https://jestjs.io/)

A high-performance backend API built with Fastify, TypeScript, and MongoDB. Features hybrid authentication, real-time caching, geospatial search, and comprehensive booking management.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd gurujiyog-backend

# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev

# Visit API documentation
open http://localhost:4001/docs
```

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)

## ✨ Features

### 🔐 Authentication & Security
- **Hybrid Authentication**: Cookie + JWT with social login (Google, Facebook)
- **Role-based Access Control**: Student, Teacher, Shala Owner permissions
- **Session Management**: Secure session handling with TTL
- **Security Headers**: Helmet integration for security best practices
- **CORS Configuration**: Flexible cross-origin resource sharing

### 🏢 Shala Management
- **Geospatial Search**: Find shalas by location with MongoDB geospatial queries
- **Smart Filtering**: Search by style, experience level, price range
- **Real-time Availability**: Live class scheduling and booking status
- **Media Management**: Image upload and processing for shala profiles

### 📅 Booking System
- **Class Booking**: Full booking lifecycle management
- **Payment Integration**: Secure payment processing
- **Calendar Management**: Schedule viewing and management
- **Notification System**: Email notifications via Resend

### ⚡ Performance
- **Smart Caching**: Memory-based caching with TTL and LRU eviction
- **Connection Pooling**: Optimized MongoDB connections
- **Request Validation**: Schema validation with Fastify's built-in validator
- **Compression**: Response compression for better performance

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │────│   Backend API    │────│   MongoDB       │
│   (Next.js)     │    │   (Fastify)      │    │   (Atlas)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ├── Authentication Layer
                                ├── Caching Layer
                                ├── Business Logic
                                ├── Data Validation
                                └── Error Handling
```

### Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify 5.4+
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with OAuth2
- **Testing**: Jest with TypeScript support
- **Deployment**: PM2 with ecosystem configuration
- **Documentation**: Swagger/OpenAPI integration

## 🛠️ Installation

### Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** (local or Atlas)
- **Git** for version control

### Local Development Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd gurujiyog-backend

# 2. Install dependencies
npm install

# 3. Environment setup
cp .env.local.example .env.local

# 4. Configure environment variables
# Edit .env.local with your settings (see Configuration section)

# 5. Start development server
npm run dev

# 6. Verify installation
curl http://localhost:4001/health
```

### Docker Setup (Optional)

```bash
# Build and run with Docker
docker build -t gurujiyog-backend .
docker run -p 4001:4001 gurujiyog-backend
```

## ⚙️ Configuration

### Environment Variables

Create `.env.local` for development or `.env.production` for production:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/gurujiyog-dev
# For Atlas: mongodb+srv://user:pass@cluster.mongodb.net/database

# Server Configuration
PORT=4001
CLIENT_URL=http://localhost:3000
BACKEND_URL=http://localhost:4001
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
SESSION_SECRET=your-session-secret-here

# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Email Service
RESEND_API_KEY=your-resend-api-key

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./public/uploads
```

### Database Setup

#### Local MongoDB
```bash
# Install MongoDB locally
brew install mongodb/brew/mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Create development database
mongosh
use gurujiyog-dev
```

#### MongoDB Atlas
1. Create cluster at [MongoDB Atlas](https://cloud.mongodb.com/)
2. Add your IP to whitelist
3. Create database user
4. Get connection string and add to `MONGODB_URI`

### OAuth Setup

#### Google OAuth
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URI: `http://localhost:4001/auth/google/callback`

#### Facebook OAuth
1. Visit [Facebook Developers](https://developers.facebook.com/)
2. Create new app
3. Add Facebook Login product
4. Add redirect URI: `http://localhost:4001/auth/facebook/callback`

## 💻 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:verbose # Run tests with detailed output

# Database
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database
npm run db:migrate   # Run database migrations
```

### Development Workflow

1. **Make Changes**: Edit TypeScript files in `src/`
2. **Auto Reload**: Server automatically restarts on file changes
3. **Test**: Write tests in `tests/` directory
4. **Lint**: Code is automatically formatted with Prettier
5. **Commit**: Use conventional commit messages

### API Development

```typescript
// Example: Creating a new route
// src/routes/example.ts

import { FastifyRequest, FastifyReply } from 'fastify';

interface ExampleRequest {
  Params: { id: string };
  Body: { name: string };
}

export async function exampleRoute(
  request: FastifyRequest<ExampleRequest>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const { name } = request.body;
  
  // Your logic here
  
  return reply.send({ success: true, data: result });
}
```

### Database Models

```typescript
// Example: Creating a new model
// src/models/Example.ts

import mongoose, { Schema, Document } from 'mongoose';

interface IExample extends Document {
  name: string;
  createdAt: Date;
}

const ExampleSchema = new Schema({
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IExample>('Example', ExampleSchema);
```

## 🧪 Testing

### Test Structure

```
tests/
├── basic.test.ts           # Basic API tests
├── hybridAuth.test.ts      # Authentication tests
├── memoryCache.test.ts     # Cache functionality tests
├── setup.ts                # Test setup and utilities
└── __mocks__/              # Mock implementations
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- hybridAuth.test.ts

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests with detailed output
npm run test:verbose
```

### Writing Tests

```typescript
// Example test file
import { build } from '../src/server';

describe('Authentication Tests', () => {
  let app: any;

  beforeAll(async () => {
    app = build({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  test('should login successfully', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('success', true);
  });
});
```

### Test Coverage

Current test coverage targets:
- **Authentication**: 95%+
- **Core APIs**: 90%+
- **Utilities**: 85%+
- **Overall**: 90%+

## 🚀 Deployment

### Production Deployment

```bash
# 1. Setup production environment
cp .env.production.example .env.production
# Edit with production values

# 2. Build application
npm run build

# 3. Deploy with PM2
npm install -g pm2
pm2 start ecosystem.config.json --env production

# 4. Monitor deployment
pm2 status
pm2 logs gurujiyog-backend
```

### Automated Deployment

Use the provided deployment script:

```bash
# Make script executable
chmod +x deploy-production.sh

# Run deployment
./deploy-production.sh
```

The script handles:
- Environment loading
- MongoDB Atlas IP whitelist updates
- Application building
- PM2 process management
- Health checks

### Environment-Specific Configurations

#### Development
- Local MongoDB instance
- Verbose logging
- Hot reload enabled
- CORS allowing localhost

#### Production
- MongoDB Atlas cluster
- Optimized logging
- Process clustering with PM2
- Restricted CORS origins
- Security headers enabled

### Health Monitoring

```bash
# Check application health
curl http://your-domain.com/health

# Check PM2 status
pm2 status

# View application logs
pm2 logs gurujiyog-backend

# Monitor performance
pm2 monit
```

## 📚 API Documentation

### Interactive Documentation

- **Swagger UI**: Available at `/docs` when server is running
- **OpenAPI Spec**: Available at `/docs/json`

### Core Endpoints

#### Authentication
```
POST   /api/auth/register      # Register new user
POST   /api/auth/login         # Login with credentials
GET    /api/auth/session       # Get current session
POST   /api/auth/logout        # Logout user
GET    /api/auth/google         # Google OAuth login
GET    /api/auth/facebook       # Facebook OAuth login
```

#### Shalas
```
GET    /api/shalas             # List all shalas with filters
GET    /api/shalas/:id         # Get specific shala
POST   /api/shalas             # Create new shala (teacher/owner)
PUT    /api/shalas/:id         # Update shala (owner)
DELETE /api/shalas/:id         # Delete shala (owner)
GET    /api/shalas/search      # Geospatial search
```

#### Bookings
```
GET    /api/bookings           # User's bookings
POST   /api/bookings           # Create new booking
GET    /api/bookings/:id       # Get booking details
PUT    /api/bookings/:id       # Update booking
DELETE /api/bookings/:id       # Cancel booking
```

#### Users
```
GET    /api/users/profile      # Get user profile
PUT    /api/users/profile      # Update profile
GET    /api/users/preferences  # Get preferences
PUT    /api/users/preferences  # Update preferences
POST   /api/users/avatar       # Upload avatar
```

### Request/Response Examples

#### Login Request
```json
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Login Response
```json
{
  "success": true,
  "user": {
    "id": "64a7b123456789abcdef0123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "student",
    "isVerified": true
  },
  "message": "Login successful"
}
```

## 📁 Project Structure

```
gurujiyog-backend/
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── authController.ts
│   │   ├── shalaController.ts
│   │   └── bookingController.ts
│   ├── models/              # Database models
│   │   ├── User.js
│   │   ├── Shala.ts
│   │   └── Booking.ts
│   ├── routes/              # API routes
│   │   ├── auth.ts
│   │   ├── shalas.ts
│   │   └── bookings.ts
│   ├── middleware/          # Custom middleware
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── errorHandler.ts
│   ├── services/            # Business logic
│   │   ├── authService.ts
│   │   ├── emailService.ts
│   │   └── cacheService.ts
│   ├── utils/               # Utility functions
│   │   ├── database.ts
│   │   ├── logger.ts
│   │   └── helpers.ts
│   ├── types/               # TypeScript definitions
│   │   └── index.ts
│   ├── constants/           # Application constants
│   │   └── index.ts
│   ├── cache/               # Caching implementation
│   │   └── memoryCache.ts
│   ├── hybridAuthPlugin.ts  # Authentication plugin
│   ├── server.ts            # Main server file
│   └── serverLocation.ts    # Server location utilities
├── tests/                   # Test files
│   ├── basic.test.ts
│   ├── hybridAuth.test.ts
│   ├── memoryCache.test.ts
│   └── setup.ts
├── docs/                    # Documentation
│   └── TokenService.md
├── public/                  # Static files
│   └── uploads/
├── dist/                    # Compiled JavaScript (gitignored)
├── ecosystem.config.json    # PM2 configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

### Key Files

- **`src/server.ts`**: Main application entry point
- **`src/hybridAuthPlugin.ts`**: Custom authentication plugin
- **`ecosystem.config.json`**: PM2 deployment configuration
- **`deploy-production.sh`**: Production deployment script
- **`.env.*.example`**: Environment configuration templates

## 🔧 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed
```bash
# Check MongoDB service status
brew services list | grep mongodb

# Restart MongoDB
brew services restart mongodb-community

# Check connection string format
echo $MONGODB_URI
```

#### 2. Port Already in Use
```bash
# Find process using port 4001
lsof -i :4001

# Kill process
kill -9 <PID>

# Or use different port
PORT=4002 npm run dev
```

#### 3. Authentication Issues
```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Check session configuration
curl -v http://localhost:4001/api/auth/session
```

#### 4. File Upload Problems
```bash
# Check upload directory permissions
ls -la public/uploads/

# Create directory if missing
mkdir -p public/uploads
chmod 755 public/uploads
```

### Debug Mode

Enable detailed logging:

```bash
# Set debug environment
DEBUG=* npm run dev

# Or specific modules
DEBUG=fastify:* npm run dev
```

### Performance Issues

```bash
# Monitor memory usage
node --inspect src/server.ts

# Profile application
npm install -g clinic
clinic doctor -- node dist/server.js
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Process

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Submit** a Pull Request

### Code Standards

- **TypeScript**: Use strict type checking
- **ESLint**: Follow configured linting rules
- **Prettier**: Code formatting is enforced
- **Testing**: Write tests for new features
- **Documentation**: Update docs for API changes

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new authentication endpoint
fix: resolve booking validation issue
docs: update API documentation
test: add integration tests for shalas
```

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [Project Wiki](https://github.com/your-org/gurujiyog-backend/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-org/gurujiyog-backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/gurujiyog-backend/discussions)

## 🙏 Acknowledgments

- [Fastify](https://www.fastify.io/) for the amazing web framework
- [MongoDB](https://www.mongodb.com/) for the database solution
- [Passport.js](http://www.passportjs.org/) for authentication strategies
- [Jest](https://jestjs.io/) for the testing framework

---

<div align="center">
  <strong>Built with ❤️ for the yoga community</strong>
</div>
# gurujiyog-backend

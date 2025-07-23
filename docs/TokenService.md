# TokenService - Production-Ready JWT Management

A comprehensive, production-ready JWT token management service with enhanced security, session management, and comprehensive error handling.

## 🌟 Features

- **Secure Token Generation**: JWT access and refresh tokens with configurable expiry
- **Session Management**: Database-backed session tracking with device information
- **Token Validation**: Comprehensive validation with detailed error reporting
- **Automatic Cleanup**: Scheduled cleanup of expired sessions
- **Type Safety**: Full TypeScript support with detailed interfaces
- **Production Ready**: Comprehensive logging, error handling, and security best practices
- **Backward Compatibility**: Legacy method support for easy migration

## 🚀 Quick Start

```typescript
import { TokenService } from './services/auth/tokenService';

// Generate token pair for user login
const tokenPair = await TokenService.generateTokenPair(userId, {
  deviceInfo: 'iPhone 13 Pro',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
});

// Verify access token for API requests
const authResult = TokenService.verifyAccessToken(accessToken);
if (authResult?.isValid) {
  // User is authenticated
  console.log('User ID:', authResult.userId);
}

// Refresh access token
const newAccessToken = await TokenService.refreshAccessToken(refreshToken);

// Logout user
await TokenService.revokeSession(refreshToken);
```

## 📋 API Reference

### Token Generation

#### `generateAccessToken(userId: string, additionalClaims?: Record<string, unknown>): string`
Generates a short-lived access token (15 minutes).

```typescript
const accessToken = TokenService.generateAccessToken('user123', {
  role: 'student',
  permissions: ['read', 'write']
});
```

#### `generateRefreshToken(userId: string): string`
Generates a long-lived refresh token (7 days).

```typescript
const refreshToken = TokenService.generateRefreshToken('user123');
```

#### `generateTokenPair(userId: string, sessionData: SessionData): Promise<{accessToken: string, refreshToken: string}>`
Generates both tokens and creates a session record.

```typescript
const { accessToken, refreshToken } = await TokenService.generateTokenPair(
  'user123',
  {
    userId: 'user123',
    deviceInfo: 'Chrome on Windows',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0...'
  }
);
```

### Token Validation

#### `verifyAccessToken(token: string): TokenValidationResult | null`
Verifies and decodes an access token.

```typescript
const result = TokenService.verifyAccessToken(token);
if (result?.isValid) {
  console.log('User ID:', result.userId);
} else {
  console.log('Invalid token:', result?.error);
}
```

#### `verifyRefreshToken(token: string): TokenValidationResult | null`
Verifies and decodes a refresh token.

```typescript
const result = TokenService.verifyRefreshToken(refreshToken);
if (result?.isValid) {
  // Token is valid
}
```

### Session Management

#### `createSession(userId: string, refreshToken: string, sessionData: SessionData): Promise<void>`
Creates a new session record in the database.

#### `validateSession(refreshToken: string): Promise<{userId: string} | null>`
Validates a session using the refresh token.

```typescript
const session = await TokenService.validateSession(refreshToken);
if (session) {
  console.log('Valid session for user:', session.userId);
}
```

#### `getUserSessions(userId: string): Promise<SessionInfo[]>`
Gets all active sessions for a user.

```typescript
const sessions = await TokenService.getUserSessions('user123');
console.log('Active sessions:', sessions.length);
```

#### `refreshAccessToken(refreshToken: string): Promise<string | null>`
Generates a new access token using a valid refresh token.

```typescript
const newAccessToken = await TokenService.refreshAccessToken(refreshToken);
if (newAccessToken) {
  // Use new access token
}
```

### Session Revocation

#### `revokeSession(refreshToken: string): Promise<void>`
Revokes a specific session (single device logout).

```typescript
await TokenService.revokeSession(refreshToken);
```

#### `revokeAllUserSessions(userId: string): Promise<number>`
Revokes all sessions for a user (logout from all devices).

```typescript
const revokedCount = await TokenService.revokeAllUserSessions('user123');
console.log(`Revoked ${revokedCount} sessions`);
```

### Maintenance

#### `cleanupExpiredSessions(): Promise<{deletedCount: number}>`
Removes expired and old revoked sessions.

```typescript
const result = await TokenService.cleanupExpiredSessions();
console.log(`Cleaned up ${result.deletedCount} sessions`);
```

#### `initializeCleanupScheduler(): void`
Starts automatic cleanup of expired sessions (call once at app startup).

```typescript
TokenService.initializeCleanupScheduler();
```

## 🔧 Configuration

Set these environment variables:

```env
# Required for production
JWT_SECRET=your-super-secure-secret-here
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-here

# Optional
JWT_ISSUER=your-app-name
JWT_AUDIENCE=your-client-app
NODE_ENV=production
```

## 🛡️ Security Features

- **Token Type Validation**: Ensures access tokens aren't used as refresh tokens
- **Session Tracking**: Database-backed session management with device fingerprinting
- **Automatic Cleanup**: Removes expired sessions to prevent database bloat
- **Secure Hashing**: Refresh tokens are hashed before database storage
- **Comprehensive Logging**: Detailed logging for security monitoring
- **Error Handling**: Custom error types with specific error codes

## 📊 Error Handling

The service uses custom `TokenError` with specific error codes:

```typescript
try {
  const token = TokenService.generateAccessToken('');
} catch (error) {
  if (error instanceof TokenError) {
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);
  }
}
```

**Error Codes:**
- `INVALID_USER_ID`: Invalid or missing user ID
- `TOKEN_GENERATION_FAILED`: Token generation failed
- `HASH_GENERATION_FAILED`: Token hashing failed
- `SESSION_CREATION_FAILED`: Database session creation failed
- `SESSION_REVOCATION_FAILED`: Session revocation failed
- `BULK_REVOCATION_FAILED`: Bulk session revocation failed
- `CLEANUP_FAILED`: Session cleanup failed
- `SESSION_RETRIEVAL_FAILED`: Failed to retrieve user sessions
- `TOKEN_PAIR_GENERATION_FAILED`: Token pair generation failed

## 🔄 Migration from Legacy Code

The service maintains backward compatibility:

```typescript
// Legacy methods still work
const token = TokenService.generateToken(userId); // → generateAccessToken
const result = TokenService.verifyToken(token);   // → verifyAccessToken
```

## 🧪 Testing

Run the comprehensive demo:

```typescript
import TokenServiceDemo from './examples/tokenServiceDemo';

// Run all demonstrations
await TokenServiceDemo.runAllDemos();

// Or run specific demos
await TokenServiceDemo.basicTokenOperations();
await TokenServiceDemo.sessionManagementOperations();
await TokenServiceDemo.errorHandlingDemo();
```

## 📈 Production Deployment

1. **Set Environment Variables**: Configure JWT secrets
2. **Initialize Cleanup**: Call `initializeCleanupScheduler()` at startup
3. **Database Indexes**: Ensure proper indexes on Session collection
4. **Monitoring**: Monitor token generation/validation metrics
5. **Logging**: Implement log aggregation for security monitoring

```typescript
// Application startup
import { TokenService } from './services/auth/tokenService';

// Initialize cleanup scheduler
TokenService.initializeCleanupScheduler();

// Optional: Run initial cleanup
await TokenService.cleanupExpiredSessions();
```

## 🔍 Monitoring & Metrics

The service provides comprehensive logging for monitoring:

- Token generation/validation success/failure rates
- Session creation/revocation events
- Cleanup operation results
- Security warnings for invalid tokens

Monitor these logs to detect:
- Unusual token validation failure patterns
- Potential brute force attacks
- Token refresh patterns
- Session management anomalies

## 🏗️ Architecture

```
TokenService
├── Token Generation (JWT with HS256)
├── Token Validation (Type + Signature + Expiry)
├── Session Management (Database-backed)
├── Security Features (Hashing + Logging)
└── Maintenance (Cleanup + Monitoring)
```

This production-ready implementation provides enterprise-grade JWT token management with comprehensive security, monitoring, and maintenance features.

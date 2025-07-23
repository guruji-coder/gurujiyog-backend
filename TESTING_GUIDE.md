# Test Examples for Hybrid Authentication System

## Overview

Here are comprehensive test examples for the Hybrid Authentication system using different testing frameworks. Choose the one that fits your project setup.

## Test Files Created

### 1. **Jest Tests** (`tests/hybridAuth.jest.test.ts`)
- Modern testing framework with excellent TypeScript support
- Includes mocking capabilities
- Great for unit and integration tests

### 2. **TAP Tests** (`tests/hybridAuth.test.ts`)
- Lightweight testing framework
- Built-in async support
- Good for Fastify projects

### 3. **Memory Cache Tests** (`tests/memoryCache.test.ts`)
- Dedicated cache testing
- Performance benchmarks
- TTL and expiry testing

## Running the Tests

### Setup Dependencies

```bash
# For Jest testing
npm install --save-dev jest @types/jest ts-jest

# For TAP testing  
npm install --save-dev tap @types/tap

# Configure Jest (add to package.json)
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "roots": ["<rootDir>/tests"],
    "testMatch": ["**/*.test.ts"]
  }
}
```

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- hybridAuth.jest.test.ts

# Run with coverage
npm run test:coverage

# Watch mode (re-run on file changes)
npm run test:watch
```

## Test Categories

### 1. **Unit Tests**
Test individual components in isolation:

```typescript
test('MemoryCache: should set and get values correctly', async () => {
  const cache = new MemoryCache();
  await cache.setex('test-key', 60, 'test-value');
  const value = await cache.get('test-key');
  
  expect(value).toBe('test-value');
  cache.destroy();
});
```

### 2. **Integration Tests**
Test complete workflows:

```typescript
test('should demonstrate the hybrid approach benefits', async () => {
  // Step 1: User visits app - no token
  // Step 2: User gets authenticated  
  // Step 3: Background data loading
  // Step 4: Session invalidation
});
```

### 3. **Performance Tests**
Test speed and efficiency:

```typescript
test('should demonstrate caching performance benefits', async () => {
  // Measure cache set/get performance
  // Verify sub-millisecond response times
  // Test concurrent operations
});
```

### 4. **Error Handling Tests**
Test graceful failure:

```typescript
test('should return 401 when no token provided', async () => {
  await authController.session(mockRequest, mockReply);
  
  expect(mockReply.code).toHaveBeenCalledWith(401);
  expect(mockReply.send).toHaveBeenCalledWith({
    authenticated: false,
    error: 'No authentication token provided'
  });
});
```

## Test Scenarios Covered

### ✅ **Authentication Flow**
- No token provided → 401 response
- Invalid token → 401 response  
- Expired token → 401 response
- Valid token → Session data response
- Token extraction from headers/cookies

### ✅ **Caching Behavior**
- Cache hit/miss scenarios
- TTL expiry testing
- Background cleanup verification
- Memory usage monitoring
- Concurrent operation safety

### ✅ **Performance Validation**
- Response time < 500ms for session endpoint
- Background endpoints don't block
- Cache operations < 100ms
- Concurrent user simulation

### ✅ **Error Scenarios**
- Malformed tokens
- Network timeouts
- Database connection failures
- Cache failures (graceful degradation)

### ✅ **Background Loading**
- Profile details endpoint
- Booking history endpoint  
- Notifications endpoint
- Non-blocking execution

## Mock Data Examples

### Session Data Mock
```typescript
const sessionData = {
  authenticated: true,
  user: {
    id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    name: 'Test User',
    role: 'student'
  },
  permissions: {
    canBookClasses: true,
    maxBookingsPerDay: 3
  },
  sessionMetadata: {
    tokenExpiresAt: new Date(),
    refreshAt: new Date(),
    cacheExpiresAt: new Date()
  }
};
```

### Fastify Request/Reply Mocks
```typescript
const mockRequest = {
  headers: { authorization: 'Bearer valid-token' },
  cookies: { token: 'cookie-token' }
};

const mockReply = {
  code: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  headers: jest.fn().mockReturnThis()
};
```

## Test Coverage Goals

- **Functions**: > 90%
- **Lines**: > 90% 
- **Branches**: > 85%
- **Statements**: > 90%

## Expected Test Results

### ✅ **Fast Execution**
- Unit tests: < 50ms each
- Integration tests: < 200ms each
- Full test suite: < 5 seconds

### ✅ **High Reliability**
- All tests pass consistently
- No flaky tests
- Proper cleanup (no memory leaks)

### ✅ **Clear Feedback**
- Descriptive test names
- Helpful error messages
- Performance metrics logging

## Adding New Tests

### For New Endpoints
```typescript
test('new endpoint should work correctly', async () => {
  // Arrange: Setup test data
  // Act: Call the endpoint
  // Assert: Verify results
});
```

### For New Cache Features
```typescript
test('new cache feature should behave correctly', async () => {
  const cache = new MemoryCache();
  // Test the new feature
  cache.destroy();
});
```

## Debugging Failed Tests

### Common Issues
1. **Token expiry**: Use longer TTL in tests
2. **Async timing**: Add proper awaits
3. **Mock cleanup**: Reset mocks between tests
4. **Memory leaks**: Always call `cache.destroy()`

### Debug Commands
```bash
# Run single test with verbose output
npm test -- --verbose hybridAuth.jest.test.ts

# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Check test coverage
npm run test:coverage
```

The test examples demonstrate the **Hybrid Approach benefits**:
- **Fast session loading** (~200ms)
- **Reliable caching** (30-minute TTL)
- **Background data loading** (non-blocking)
- **Graceful error handling** (user-friendly)

These tests ensure your authentication system is **production-ready** and **performs optimally** for your yoga platform! 🧘‍♀️

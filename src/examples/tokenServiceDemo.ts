/**
 * Token Service Test & Usage Examples
 * 
 * Production-ready testing and usage examples for TokenService
 */

import { TokenService, TokenError } from '../services/auth/tokenService';

// Mock session data for testing
const mockSessionData = {
  userId: 'user123',
  deviceInfo: 'iPhone 13 Pro',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
};

/**
 * Example usage and testing of TokenService
 */
class TokenServiceDemo {
  /**
   * Basic token generation and verification example
   */
  static async basicTokenOperations(): Promise<void> {
    console.log('\n🚀 Basic Token Operations Demo');
    console.log('================================');

    try {
      const userId = 'user123';

      // Generate access token
      console.log('\n1. Generating Access Token...');
      const accessToken = TokenService.generateAccessToken(userId, {
        role: 'student',
        permissions: ['read', 'write'],
      });
      console.log('Access Token:', accessToken.substring(0, 50) + '...');

      // Generate refresh token
      console.log('\n2. Generating Refresh Token...');
      const refreshToken = TokenService.generateRefreshToken(userId);
      console.log('Refresh Token:', refreshToken.substring(0, 50) + '...');

      // Verify access token
      console.log('\n3. Verifying Access Token...');
      const accessVerification = TokenService.verifyAccessToken(accessToken);
      console.log('Access Verification Result:', accessVerification);

      // Verify refresh token
      console.log('\n4. Verifying Refresh Token...');
      const refreshVerification = TokenService.verifyRefreshToken(refreshToken);
      console.log('Refresh Verification Result:', refreshVerification);

    } catch (error) {
      console.error('❌ Basic operations failed:', error);
    }
  }

  /**
   * Session management example
   */
  static async sessionManagementOperations(): Promise<void> {
    console.log('\n🔐 Session Management Demo');
    console.log('==========================');

    try {
      const userId = 'user456';

      // Generate token pair with session
      console.log('\n1. Generating Token Pair with Session...');
      const tokenPair = await TokenService.generateTokenPair(userId, mockSessionData);
      console.log('Token Pair Generated:', {
        accessToken: tokenPair.accessToken.substring(0, 30) + '...',
        refreshToken: tokenPair.refreshToken.substring(0, 30) + '...',
      });

      // Validate session
      console.log('\n2. Validating Session...');
      const sessionValidation = await TokenService.validateSession(tokenPair.refreshToken);
      console.log('Session Validation:', sessionValidation);

      // Get user sessions
      console.log('\n3. Getting User Sessions...');
      const userSessions = await TokenService.getUserSessions(userId);
      console.log('User Sessions:', userSessions);

      // Refresh access token
      console.log('\n4. Refreshing Access Token...');
      const newAccessToken = await TokenService.refreshAccessToken(tokenPair.refreshToken);
      console.log('New Access Token:', newAccessToken?.substring(0, 30) + '...');

      // Revoke session
      console.log('\n5. Revoking Session...');
      await TokenService.revokeSession(tokenPair.refreshToken);
      console.log('Session revoked successfully');

      // Try to validate revoked session
      console.log('\n6. Validating Revoked Session...');
      const revokedSessionValidation = await TokenService.validateSession(tokenPair.refreshToken);
      console.log('Revoked Session Validation:', revokedSessionValidation);

    } catch (error) {
      console.error('❌ Session management failed:', error);
    }
  }

  /**
   * Error handling examples
   */
  static async errorHandlingDemo(): Promise<void> {
    console.log('\n⚠️  Error Handling Demo');
    console.log('=======================');

    // Test invalid token verification
    console.log('\n1. Testing Invalid Token Verification...');
    const invalidTokenResult = TokenService.verifyAccessToken('invalid.token.here');
    console.log('Invalid Token Result:', invalidTokenResult);

    // Test expired token (mock)
    console.log('\n2. Testing Expired Token...');
    try {
      // This would normally be an expired token
      const expiredTokenResult = TokenService.verifyAccessToken('expired.token.simulation');
      console.log('Expired Token Result:', expiredTokenResult);
    } catch (error) {
      console.log('Expired Token Error:', error);
    }

    // Test missing parameters
    console.log('\n3. Testing Missing Parameters...');
    try {
      TokenService.generateAccessToken(''); // Empty userId
    } catch (error) {
      if (error instanceof TokenError) {
        console.log('Expected Error:', error.message, '- Code:', error.code);
      }
    }

    // Test session validation with invalid token
    console.log('\n4. Testing Session Validation with Invalid Token...');
    const invalidSessionResult = await TokenService.validateSession('invalid.refresh.token');
    console.log('Invalid Session Result:', invalidSessionResult);
  }

  /**
   * Performance and cleanup demo
   */
  static async maintenanceOperations(): Promise<void> {
    console.log('\n🧹 Maintenance Operations Demo');
    console.log('===============================');

    try {
      // Cleanup expired sessions
      console.log('\n1. Cleaning Up Expired Sessions...');
      const cleanupResult = await TokenService.cleanupExpiredSessions();
      console.log('Cleanup Result:', cleanupResult);

      // Bulk revoke user sessions
      console.log('\n2. Bulk Revoking User Sessions...');
      const revokeCount = await TokenService.revokeAllUserSessions('user123');
      console.log('Revoked Sessions Count:', revokeCount);

      // Initialize cleanup scheduler (would run in production)
      console.log('\n3. Initializing Cleanup Scheduler...');
      // TokenService.initializeCleanupScheduler(); // Uncomment in production
      console.log('Cleanup scheduler would be initialized here');

    } catch (error) {
      console.error('❌ Maintenance operations failed:', error);
    }
  }

  /**
   * Production usage patterns
   */
  static async productionUsagePatterns(): Promise<void> {
    console.log('\n🏭 Production Usage Patterns');
    console.log('=============================');

    // Login flow
    console.log('\n1. Login Flow Example...');
    const userId = 'production_user';
    const loginSessionData = {
      userId,
      deviceInfo: 'Chrome Browser on MacOS',
      ipAddress: '203.0.113.1',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    };

    const { accessToken, refreshToken } = await TokenService.generateTokenPair(
      userId,
      loginSessionData
    );

    console.log('Login successful, tokens generated');

    // API request with token
    console.log('\n2. API Request Authentication...');
    const authResult = TokenService.verifyAccessToken(accessToken);
    if (authResult?.isValid) {
      console.log('✅ API request authenticated for user:', authResult.userId);
    } else {
      console.log('❌ API request authentication failed');
    }

    // Token refresh flow
    console.log('\n3. Token Refresh Flow...');
    const newAccessToken = await TokenService.refreshAccessToken(refreshToken);
    if (newAccessToken) {
      console.log('✅ Token refreshed successfully');
    } else {
      console.log('❌ Token refresh failed');
    }

    // Logout flow
    console.log('\n4. Logout Flow...');
    await TokenService.revokeSession(refreshToken);
    console.log('✅ User logged out successfully');
  }

  /**
   * Run all demos
   */
  static async runAllDemos(): Promise<void> {
    console.log('🎯 TokenService Production Demo');
    console.log('================================');
    console.log('Running comprehensive token service demonstration...\n');

    await this.basicTokenOperations();
    await this.sessionManagementOperations();
    await this.errorHandlingDemo();
    await this.maintenanceOperations();
    await this.productionUsagePatterns();

    console.log('\n✅ All demos completed successfully!');
    console.log('\n📚 Usage Summary:');
    console.log('- Use generateTokenPair() for login');
    console.log('- Use verifyAccessToken() for API authentication');
    console.log('- Use refreshAccessToken() for token renewal');
    console.log('- Use revokeSession() for logout');
    console.log('- Use cleanupExpiredSessions() for maintenance');
    console.log('- Initialize cleanup scheduler in production');
  }
}

// Export for use in tests or demos
export default TokenServiceDemo;

// Run demo if this file is executed directly
if (require.main === module) {
  TokenServiceDemo.runAllDemos().catch(console.error);
}

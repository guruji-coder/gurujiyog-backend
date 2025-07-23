/**
 * Token Service
 * 
 * Production-ready JWT token management service
 * Handles access tokens, refresh tokens, and session management
 * 
 * Features:
 * - Secure token generation and validation
 * - Session management with database persistence
 * - Token rotation and revocation
 * - Comprehensive error handling and logging
 * - Type safety and validation
 */

import jwt, { Secret, SignOptions, Algorithm, JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import Session from "../../models/Session";

// Constants for token configuration
const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: "15m",     // 15 minutes
  REFRESH_TOKEN_EXPIRY: "7d",     // 7 days
  ALGORITHM: "HS256" as Algorithm,
  SESSION_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
} as const;

// Type definitions for better type safety
interface TokenPayload {
  userId: string;
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}

interface DecodedToken extends JwtPayload {
  userId: string;
  type: string;
}

interface SessionData {
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  userAgent?: string;
}

interface TokenValidationResult {
  userId: string;
  isValid: boolean;
  error?: string;
}

// Custom errors for better error handling
export class TokenError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "TokenError";
  }
}

/**
 * Production-ready Token Service
 * Handles all JWT token operations with enhanced security and reliability
 */
export class TokenService {
  /**
   * Get JWT secret from environment with validation
   * @param type - Type of secret (access or refresh)
   * @returns Secret string
   * @throws TokenError if secret is not configured
   */
  private static getSecret(type: "access" | "refresh"): Secret {
    const secretKey = type === "access" ? "JWT_SECRET" : "JWT_REFRESH_SECRET";
    const fallbackSecret = type === "access" ? "fallback-secret" : "fallback-refresh-secret";
    
    const secret = process.env[secretKey] || fallbackSecret;
    
    // In production, warn about fallback secrets
    if (process.env.NODE_ENV === "production" && secret === fallbackSecret) {
      console.warn(`⚠️  WARNING: Using fallback ${secretKey}. Set proper secret in production!`);
    }
    
    return secret;
  }

  /**
   * Generate JWT access token (short-lived)
   * @param userId - User identifier
   * @param additionalClaims - Optional additional claims to include
   * @returns Signed JWT access token
   */
  static generateAccessToken(userId: string, additionalClaims?: Record<string, unknown>): string {
    try {
      if (!userId || typeof userId !== "string") {
        throw new TokenError("Invalid userId provided", "INVALID_USER_ID");
      }

      const secret = this.getSecret("access");
      const payload: TokenPayload = {
        userId,
        type: "access",
        ...additionalClaims,
      };

      const options: SignOptions = {
        expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
        algorithm: TOKEN_CONFIG.ALGORITHM,
        issuer: process.env.JWT_ISSUER || "gurujiyog-api",
        audience: process.env.JWT_AUDIENCE || "gurujiyog-client",
      };

      const token = jwt.sign(payload, secret, options);
      
      console.log(`✅ Generated access token for user: ${userId}`);
      return token;
    } catch (error) {
      console.error("❌ Access token generation failed:", error);
      throw new TokenError("Failed to generate access token", "TOKEN_GENERATION_FAILED");
    }
  }

  /**
   * Generate JWT refresh token (long-lived)
   * @param userId - User identifier
   * @returns Signed JWT refresh token
   */
  static generateRefreshToken(userId: string): string {
    try {
      if (!userId || typeof userId !== "string") {
        throw new TokenError("Invalid userId provided", "INVALID_USER_ID");
      }

      const secret = this.getSecret("refresh");
      const payload: TokenPayload = {
        userId,
        type: "refresh",
      };

      const options: SignOptions = {
        expiresIn: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY,
        algorithm: TOKEN_CONFIG.ALGORITHM,
        issuer: process.env.JWT_ISSUER || "gurujiyog-api",
        audience: process.env.JWT_AUDIENCE || "gurujiyog-client",
      };

      const token = jwt.sign(payload, secret, options);
      
      console.log(`✅ Generated refresh token for user: ${userId}`);
      return token;
    } catch (error) {
      console.error("❌ Refresh token generation failed:", error);
      throw new TokenError("Failed to generate refresh token", "TOKEN_GENERATION_FAILED");
    }
  }

  /**
   * Verify and decode access token
   * @param token - JWT access token to verify
   * @returns Token validation result with user ID or null if invalid
   */
  static verifyAccessToken(token: string): TokenValidationResult | null {
    try {
      if (!token || typeof token !== "string") {
        return null;
      }

      // Remove Bearer prefix if present
      const cleanToken = token.replace(/^Bearer\s+/i, "");
      const secret = this.getSecret("access");
      
      const decoded = jwt.verify(cleanToken, secret) as DecodedToken;
      
      // Validate token type
      if (decoded.type !== "access") {
        console.warn(`⚠️  Invalid token type: ${decoded.type}, expected: access`);
        return null;
      }

      // Validate required fields
      if (!decoded.userId) {
        console.warn("⚠️  Token missing userId");
        return null;
      }

      console.log(`✅ Access token verified for user: ${decoded.userId}`);
      return {
        userId: decoded.userId,
        isValid: true,
      };
    } catch (error) {
      console.error("❌ Access token verification failed:", error);
      
      if (error instanceof jwt.JsonWebTokenError) {
        return {
          userId: "",
          isValid: false,
          error: "Invalid token signature",
        };
      }
      
      if (error instanceof jwt.TokenExpiredError) {
        return {
          userId: "",
          isValid: false,
          error: "Token expired",
        };
      }
      
      return null;
    }
  }

  /**
   * Verify and decode refresh token
   * @param token - JWT refresh token to verify
   * @returns Token validation result with user ID or null if invalid
   */
  static verifyRefreshToken(token: string): TokenValidationResult | null {
    try {
      if (!token || typeof token !== "string") {
        return null;
      }

      const secret = this.getSecret("refresh");
      const decoded = jwt.verify(token, secret) as DecodedToken;
      
      // Validate token type
      if (decoded.type !== "refresh") {
        console.warn(`⚠️  Invalid token type: ${decoded.type}, expected: refresh`);
        return null;
      }

      // Validate required fields
      if (!decoded.userId) {
        console.warn("⚠️  Token missing userId");
        return null;
      }

      console.log(`✅ Refresh token verified for user: ${decoded.userId}`);
      return {
        userId: decoded.userId,
        isValid: true,
      };
    } catch (error) {
      console.error("❌ Refresh token verification failed:", error);
      
      if (error instanceof jwt.JsonWebTokenError) {
        return {
          userId: "",
          isValid: false,
          error: "Invalid token signature",
        };
      }
      
      if (error instanceof jwt.TokenExpiredError) {
        return {
          userId: "",
          isValid: false,
          error: "Token expired",
        };
      }
      
      return null;
    }
  }

  /**
   * Generate cryptographically secure hash of refresh token for database storage
   * @param token - Refresh token to hash
   * @returns SHA-256 hash of the token
   */
  static hashRefreshToken(token: string): string {
    try {
      if (!token) {
        throw new TokenError("Token is required for hashing", "MISSING_TOKEN");
      }
      
      const hash = crypto.createHash("sha256").update(token).digest("hex");
      console.log("✅ Refresh token hashed successfully");
      return hash;
    } catch (error) {
      console.error("❌ Token hashing failed:", error);
      throw new TokenError("Failed to hash refresh token", "HASH_GENERATION_FAILED");
    }
  }

  /**
   * Create a new session in the database
   * @param userId - User identifier
   * @param refreshToken - Refresh token to store (will be hashed)
   * @param sessionData - Session metadata (device info, IP, etc.)
   * @returns Promise that resolves when session is created
   */
  static async createSession(
    userId: string,
    refreshToken: string,
    sessionData: SessionData
  ): Promise<void> {
    try {
      if (!userId || !refreshToken || !sessionData) {
        throw new TokenError("Missing required session data", "INVALID_SESSION_DATA");
      }

      const refreshTokenHash = this.hashRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      await Session.create({
        userId,
        refreshTokenHash,
        deviceInfo: sessionData.deviceInfo,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        expiresAt,
        isActive: true,
        createdAt: new Date(),
        lastUsed: new Date(),
      });

      console.log(`✅ Session created for user: ${userId}`);
    } catch (error) {
      console.error("❌ Session creation failed:", error);
      throw new TokenError("Failed to create session", "SESSION_CREATION_FAILED");
    }
  }

  /**
   * Validate session and refresh token
   * @param refreshToken - Refresh token to validate
   * @returns Promise with user ID if valid, null if invalid
   */
  static async validateSession(refreshToken: string): Promise<{ userId: string } | null> {
    try {
      if (!refreshToken) {
        console.warn("⚠️  No refresh token provided for validation");
        return null;
      }

      // First verify the JWT token itself
      const tokenVerification = this.verifyRefreshToken(refreshToken);
      if (!tokenVerification || !tokenVerification.isValid) {
        console.warn("⚠️  Refresh token JWT verification failed");
        return null;
      }

      // Then check if session exists in database
      const refreshTokenHash = this.hashRefreshToken(refreshToken);
      const session = await Session.findOne({
        refreshTokenHash,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        console.warn("⚠️  Session not found or expired");
        return null;
      }

      // Update last used timestamp
      session.lastUsed = new Date();
      await session.save();

      console.log(`✅ Session validated for user: ${session.userId}`);
      return { userId: session.userId.toString() };
    } catch (error) {
      console.error("❌ Session validation failed:", error);
      return null;
    }
  }

  /**
   * Revoke a specific session (logout from single device)
   * @param refreshToken - Refresh token of the session to revoke
   * @returns Promise that resolves when session is revoked
   */
  static async revokeSession(refreshToken: string): Promise<void> {
    try {
      if (!refreshToken) {
        throw new TokenError("Refresh token is required", "MISSING_TOKEN");
      }

      const refreshTokenHash = this.hashRefreshToken(refreshToken);
      const result = await Session.updateOne(
        { refreshTokenHash },
        { 
          isActive: false,
          revokedAt: new Date(),
        }
      );

      if (result.matchedCount === 0) {
        console.warn("⚠️  Session not found for revocation");
      } else {
        console.log("✅ Session revoked successfully");
      }
    } catch (error) {
      console.error("❌ Session revocation failed:", error);
      throw new TokenError("Failed to revoke session", "SESSION_REVOCATION_FAILED");
    }
  }

  /**
   * Revoke all sessions for a user (logout from all devices)
   * @param userId - User identifier
   * @returns Promise with count of revoked sessions
   */
  static async revokeAllUserSessions(userId: string): Promise<number> {
    try {
      if (!userId) {
        throw new TokenError("User ID is required", "MISSING_USER_ID");
      }

      const result = await Session.updateMany(
        { userId, isActive: true },
        { 
          isActive: false,
          revokedAt: new Date(),
        }
      );

      console.log(`✅ Revoked ${result.modifiedCount} sessions for user: ${userId}`);
      return result.modifiedCount;
    } catch (error) {
      console.error("❌ Failed to revoke all user sessions:", error);
      throw new TokenError("Failed to revoke user sessions", "BULK_REVOCATION_FAILED");
    }
  }

  /**
   * Clean up expired and revoked sessions from database
   * Should be run periodically as a cleanup job
   * @returns Promise with cleanup statistics
   */
  static async cleanupExpiredSessions(): Promise<{ deletedCount: number }> {
    try {
      const result = await Session.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { isActive: false, revokedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, // 30 days old
        ],
      });

      console.log(`✅ Cleaned up ${result.deletedCount} expired/revoked sessions`);
      return { deletedCount: result.deletedCount || 0 };
    } catch (error) {
      console.error("❌ Session cleanup failed:", error);
      throw new TokenError("Failed to cleanup sessions", "CLEANUP_FAILED");
    }
  }

  /**
   * Get active sessions for a user
   * @param userId - User identifier
   * @returns Promise with array of active sessions
   */
  static async getUserSessions(userId: string): Promise<Array<{
    id: string;
    deviceInfo: string;
    ipAddress: string;
    lastUsed: Date;
    createdAt: Date;
  }>> {
    try {
      const sessions = await Session.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      }).select('deviceInfo ipAddress lastUsed createdAt');

      return sessions.map(session => ({
        id: (session as any)._id.toString(),
        deviceInfo: session.deviceInfo,
        ipAddress: session.ipAddress,
        lastUsed: session.lastUsed,
        createdAt: session.createdAt,
      }));
    } catch (error) {
      console.error("❌ Failed to get user sessions:", error);
      throw new TokenError("Failed to retrieve user sessions", "SESSION_RETRIEVAL_FAILED");
    }
  }

  /**
   * Generate token pair (access + refresh)
   * @param userId - User identifier
   * @param sessionData - Session metadata
   * @returns Promise with access and refresh tokens
   */
  static async generateTokenPair(
    userId: string,
    sessionData: SessionData
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const accessToken = this.generateAccessToken(userId);
      const refreshToken = this.generateRefreshToken(userId);
      
      await this.createSession(userId, refreshToken, sessionData);
      
      console.log(`✅ Generated token pair for user: ${userId}`);
      return { accessToken, refreshToken };
    } catch (error) {
      console.error("❌ Token pair generation failed:", error);
      throw new TokenError("Failed to generate token pair", "TOKEN_PAIR_GENERATION_FAILED");
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Valid refresh token
   * @returns Promise with new access token or null if invalid
   */
  static async refreshAccessToken(refreshToken: string): Promise<string | null> {
    try {
      const session = await this.validateSession(refreshToken);
      if (!session) {
        console.warn("⚠️  Invalid session for token refresh");
        return null;
      }

      const newAccessToken = this.generateAccessToken(session.userId);
      console.log(`✅ Access token refreshed for user: ${session.userId}`);
      
      return newAccessToken;
    } catch (error) {
      console.error("❌ Token refresh failed:", error);
      return null;
    }
  }

  // Legacy methods for backward compatibility
  // @deprecated Use generateAccessToken instead
  static generateToken = this.generateAccessToken;
  
  // @deprecated Use verifyAccessToken instead  
  static verifyToken = this.verifyAccessToken;

  /**
   * Initialize cleanup scheduler
   * Call this once when application starts
   */
  static initializeCleanupScheduler(): void {
    setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        console.error("❌ Scheduled cleanup failed:", error);
      }
    }, TOKEN_CONFIG.SESSION_CLEANUP_INTERVAL);
    
    console.log("✅ Token cleanup scheduler initialized");
  }
}

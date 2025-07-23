/**
 * Token Service - Object Pattern
 * 
 * Lightweight alternative to class-based approach
 * Better for stateless services with grouped functionality
 */

import jwt, { Secret, SignOptions, Algorithm, JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import Session from "../../models/Session";

// Constants and types (same as before)
const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: "15m",
  REFRESH_TOKEN_EXPIRY: "7d", 
  ALGORITHM: "HS256" as Algorithm,
  SESSION_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000,
} as const;

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

export class TokenError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "TokenError";
  }
}

/**
 * Token Service as Object - More lightweight than class
 */
export const TokenService = {
  /**
   * Get JWT secret from environment with validation
   */
  getSecret(type: "access" | "refresh"): Secret {
    const secretKey = type === "access" ? "JWT_SECRET" : "JWT_REFRESH_SECRET";
    const fallbackSecret = type === "access" ? "fallback-secret" : "fallback-refresh-secret";
    
    const secret = process.env[secretKey] || fallbackSecret;
    
    if (process.env.NODE_ENV === "production" && secret === fallbackSecret) {
      console.warn(`⚠️  WARNING: Using fallback ${secretKey}. Set proper secret in production!`);
    }
    
    return secret;
  },

  /**
   * Generate JWT access token (short-lived)
   */
  generateAccessToken(userId: string, additionalClaims?: Record<string, unknown>): string {
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
  },

  /**
   * Generate JWT refresh token (long-lived)
   */
  generateRefreshToken(userId: string): string {
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
  },

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): TokenValidationResult | null {
    try {
      if (!token || typeof token !== "string") {
        return null;
      }

      const cleanToken = token.replace(/^Bearer\s+/i, "");
      const secret = this.getSecret("access");
      
      const decoded = jwt.verify(cleanToken, secret) as DecodedToken;
      
      if (decoded.type !== "access") {
        console.warn(`⚠️  Invalid token type: ${decoded.type}, expected: access`);
        return null;
      }

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
  },

  /**
   * Generate token pair (access + refresh)
   */
  async generateTokenPair(
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
  },

  /**
   * Create session in database
   */
  async createSession(
    userId: string,
    refreshToken: string,
    sessionData: SessionData
  ): Promise<void> {
    try {
      if (!userId || !refreshToken || !sessionData) {
        throw new TokenError("Missing required session data", "INVALID_SESSION_DATA");
      }

      const refreshTokenHash = this.hashRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
  },

  /**
   * Hash refresh token for storage
   */
  hashRefreshToken(token: string): string {
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
  },

  /**
   * Initialize cleanup scheduler
   */
  initializeCleanupScheduler(): void {
    setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        console.error("❌ Scheduled cleanup failed:", error);
      }
    }, TOKEN_CONFIG.SESSION_CLEANUP_INTERVAL);
    
    console.log("✅ Token cleanup scheduler initialized");
  },

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<{ deletedCount: number }> {
    try {
      const result = await Session.deleteMany({
        $or: [
          { expiresAt: { $lt: new Date() } },
          { isActive: false, revokedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      });

      console.log(`✅ Cleaned up ${result.deletedCount} expired/revoked sessions`);
      return { deletedCount: result.deletedCount || 0 };
    } catch (error) {
      console.error("❌ Session cleanup failed:", error);
      throw new TokenError("Failed to cleanup sessions", "CLEANUP_FAILED");
    }
  },
} as const;

// Legacy exports for backward compatibility
export const generateToken = TokenService.generateAccessToken;
export const verifyToken = TokenService.verifyAccessToken;

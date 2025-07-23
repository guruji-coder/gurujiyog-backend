/**
 * Token Service - Functional Pattern
 * 
 * Pure functions approach - best for tree-shaking and functional programming
 * Each function can be imported individually
 */

import jwt, { Secret, SignOptions, Algorithm, JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import Session from "../../models/Session";

// Constants and types
const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: "15m",
  REFRESH_TOKEN_EXPIRY: "7d",
  ALGORITHM: "HS256" as Algorithm,
  SESSION_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000,
} as const;

export interface TokenPayload {
  userId: string;
  sub?: string;        // Subject (user ID) - standard JWT claim
  email?: string;      // User email
  name?: string;       // User name
  role?: string;       // User role
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}

export interface DecodedToken extends JwtPayload {
  userId: string;
  type: string;
}

export interface SessionData {
  userId: string;
  deviceInfo: string;
  ipAddress: string;
  userAgent?: string;
}

export interface TokenValidationResult {
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

// Private helper functions
function getSecret(type: "access" | "refresh"): Secret {
  const secretKey = type === "access" ? "JWT_SECRET" : "JWT_REFRESH_SECRET";
  const fallbackSecret = type === "access" ? "fallback-secret" : "fallback-refresh-secret";
  
  const secret = process.env[secretKey] || fallbackSecret;
  
  if (process.env.NODE_ENV === "production" && secret === fallbackSecret) {
    console.warn(`⚠️  WARNING: Using fallback ${secretKey}. Set proper secret in production!`);
  }
  
  return secret;
}

// Public functions - can be imported individually

/**
 * Generate JWT access token (short-lived)
 */
export function generateAccessToken(
  userId: string, 
  userInfo?: { email?: string; name?: string; role?: string },
  additionalClaims?: Record<string, unknown>
): string {
  try {
    if (!userId || typeof userId !== "string") {
      throw new TokenError("Invalid userId provided", "INVALID_USER_ID");
    }

    const secret = getSecret("access");
    const payload: TokenPayload = {
      userId,
      sub: userId,     // Standard JWT subject claim
      type: "access",
      ...(userInfo?.email && { email: userInfo.email }),
      ...(userInfo?.name && { name: userInfo.name }),
      ...(userInfo?.role && { role: userInfo.role }),
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
 */
export function generateRefreshToken(userId: string): string {
  try {
    if (!userId || typeof userId !== "string") {
      throw new TokenError("Invalid userId provided", "INVALID_USER_ID");
    }

    const secret = getSecret("refresh");
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
 */
export function verifyAccessToken(token: string): TokenValidationResult | null {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }

    const cleanToken = token.replace(/^Bearer\s+/i, "");
    const secret = getSecret("access");
    
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
}

/**
 * Verify and decode refresh token
 */
export function verifyRefreshToken(token: string): TokenValidationResult | null {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }

    const secret = getSecret("refresh");
    const decoded = jwt.verify(token, secret) as DecodedToken;
    
    if (decoded.type !== "refresh") {
      console.warn(`⚠️  Invalid token type: ${decoded.type}, expected: refresh`);
      return null;
    }

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
 * Hash refresh token for storage
 */
export function hashRefreshToken(token: string): string {
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
 * Create session in database
 */
export async function createSession(
  userId: string,
  refreshToken: string,
  sessionData: SessionData
): Promise<void> {
  try {
    if (!userId || !refreshToken || !sessionData) {
      throw new TokenError("Missing required session data", "INVALID_SESSION_DATA");
    }

    const refreshTokenHash = hashRefreshToken(refreshToken);
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
}

/**
 * Generate token pair (access + refresh)
 */
export async function generateTokenPair(
  userId: string,
  sessionData: SessionData,
  userInfo?: { email?: string; name?: string; role?: string }
): Promise<{ accessToken: string; refreshToken: string }> {
  try {
    const accessToken = generateAccessToken(userId, userInfo);
    const refreshToken = generateRefreshToken(userId);
    
    await createSession(userId, refreshToken, sessionData);
    
    console.log(`✅ Generated token pair for user: ${userId}`);
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("❌ Token pair generation failed:", error);
    throw new TokenError("Failed to generate token pair", "TOKEN_PAIR_GENERATION_FAILED");
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<{ deletedCount: number }> {
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
}

/**
 * Initialize cleanup scheduler
 */
export function initializeCleanupScheduler(): void {
  setInterval(async () => {
    try {
      await cleanupExpiredSessions();
    } catch (error) {
      console.error("❌ Scheduled cleanup failed:", error);
    }
  }, TOKEN_CONFIG.SESSION_CLEANUP_INTERVAL);
  
  console.log("✅ Token cleanup scheduler initialized");
}

// Convenience object for those who prefer grouped imports
export const TokenService = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshToken,
  createSession,
  generateTokenPair,
  cleanupExpiredSessions,
  initializeCleanupScheduler,
} as const;

// Legacy exports with updated signatures
export const generateToken = (userId: string, userInfo?: { email?: string; name?: string; role?: string }) => 
  generateAccessToken(userId, userInfo);
export const verifyToken = verifyAccessToken;

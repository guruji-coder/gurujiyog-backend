/**
 * Token Helper Functions
 * Utilities for JWT token operations
 */

import jwt from 'jsonwebtoken';

// JWT payload interface (flexible to handle different token formats)
export interface JWTPayload {
  // Standard JWT claims
  sub?: string;        // User ID (standard claim)
  email?: string;      // User email  
  name?: string;       // User name
  role?: string;       // User role
  iat: number;         // Issued at
  exp: number;         // Expires at
  
  // Your custom claims
  userId?: string;     // Your custom user ID field
  type?: string;       // Token type (access/refresh)
}

// User data extracted from token (make fields optional to handle missing data)
export interface TokenUserData {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  issuedAt: Date;
  expiresAt: Date;
}

/**
 * Decode JWT token without verification (for reading payload)
 * Use this when you just need to read token data
 */
export function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    
    // Decode without verification (just read the payload)
    const decoded = jwt.decode(cleanToken) as JWTPayload;
    
    if (!decoded || typeof decoded !== 'object') {
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Verify and decode JWT token with secret
 * Use this for authentication/authorization
 */
export function verifyJWTToken(token: string, secret: string): JWTPayload | null {
  try {
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    const decoded = jwt.verify(cleanToken, secret) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Error verifying JWT:', error);
    return null;
  }
}

/**
 * Extract user data from JWT token
 * Handles both standard JWT format (sub, email, name, role) and custom format (userId)
 */
export function extractUserDataFromToken(token: string): TokenUserData | null {
  const payload = decodeJWTPayload(token);
  
  if (!payload) {
    return null;
  }

  // Get user ID from either 'sub' (standard) or 'userId' (custom)
  const userId = payload.sub || payload.userId;
  
  if (!userId) {
    console.warn('Token missing user ID (neither sub nor userId found)');
    return null;
  }

  return {
    id: userId,
    email: payload.email || undefined,
    name: payload.name || undefined,
    role: payload.role || undefined,
    issuedAt: new Date(payload.iat * 1000),
    expiresAt: new Date(payload.exp * 1000)
  };
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWTPayload(token);
  if (!payload) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Get token expiry time remaining in seconds
 */
export function getTokenTimeRemaining(token: string): number {
  const payload = decodeJWTPayload(token);
  if (!payload) return 0;
  
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
}

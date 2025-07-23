import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { IUser as UserType } from '../models/User';

/**
 * Interface for authenticated requests
 */
interface AuthenticatedRequest extends FastifyRequest {
  token?: string;
  user?: any;
}

/**
 * Cache interface - works with both memory cache and Redis
 */
interface CacheInterface {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  del(key: string): Promise<void>;
}

/**
 * Hybrid Authentication Controller
 * 
 * Implements the "Recommended Hybrid Approach" for optimal performance:
 * - Single session endpoint with all critical data
 * - Smart caching with automatic expiry
 * - Background loading for detailed data
 */
export class HybridAuthController {
  private cache: CacheInterface;
  
  // Cache configuration
  private readonly CACHE_KEY_PREFIX = 'user_session:';
  private readonly CACHE_TTL_SECONDS = 1800; // 30 minutes
  private readonly REFRESH_BEFORE_EXPIRY_SECONDS = 300; // 5 minutes

  constructor(cacheInstance: CacheInterface) {
    this.cache = cacheInstance;
  }

  /**
   * GET /auth/session
   * 
   * The CORE endpoint of the hybrid approach.
   * Returns all critical data needed to render the UI immediately.
   * 
   * Flow:
   * 1. Extract and verify JWT token
   * 2. Check cache first (fast path)
   * 3. Build fresh data if cache miss/expired
   * 4. Return session data with cache headers
   */
  session = async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    try {
      // Step 1: Extract token from Authorization header or cookies
      const authToken = this.extractToken(request);
      
      if (!authToken) {
        reply.code(401).send({
          authenticated: false,
          error: 'No authentication token provided'
        });
        return;
      }

      // Step 2: Get session data (cached or fresh)
      const sessionData = await this.getSessionData(authToken);
      
      if (!sessionData.authenticated) {
        reply.code(401).send(sessionData);
        return;
      }

      // Step 3: Set cache headers for browser optimization
      const cacheTimeRemaining = Math.floor(
        (sessionData.sessionMetadata.cacheExpiresAt.getTime() - Date.now()) / 1000
      );
      
      reply.headers({
        'Cache-Control': `private, max-age=${Math.max(0, cacheTimeRemaining)}`,
        'X-Session-Expires': sessionData.sessionMetadata.tokenExpiresAt.toISOString(),
        'X-Refresh-At': sessionData.sessionMetadata.refreshAt.toISOString()
      });

      // Step 4: Send successful response
      reply.code(200).send(sessionData);
      
    } catch (error) {
      console.error('Session endpoint error:', error);
      reply.code(500).send({
        authenticated: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Core session data retrieval with caching
   */
  private async getSessionData(token: string): Promise<any> {
    try {
      // Verify token
      const decoded = this.verifyToken(token);
      if (!decoded) {
        return { authenticated: false, error: 'Invalid token' };
      }

      const userId = decoded.userId;
      const cacheKey = `${this.CACHE_KEY_PREFIX}${userId}`;

      // Try cache first
      const cachedSession = await this.getCachedSession(cacheKey);
      if (cachedSession && !this.shouldRefreshCache(cachedSession)) {
        return cachedSession;
      }

      // Fetch fresh data
      const sessionData = await this.buildSessionData(userId);
      
      if (!sessionData) {
        return { authenticated: false, error: 'User not found' };
      }

      // Cache the session data
      await this.cacheSession(cacheKey, sessionData);

      return sessionData;
    } catch (error) {
      console.error('Session fetch error:', error);
      return { authenticated: false, error: 'Session validation failed' };
    }
  }

  /**
   * Build session data from database
   */
  private async buildSessionData(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId).lean() as UserType;
      
      if (!user || !user.isActive) {
        return null;
      }

      // Generate role-based permissions
      const permissions = this.generatePermissions(user.role);

      // Calculate token and cache expiry times
      const now = new Date();
      const tokenExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      const refreshAt = new Date(tokenExpiresAt.getTime() - this.REFRESH_BEFORE_EXPIRY_SECONDS * 1000);
      const cacheExpiresAt = new Date(now.getTime() + this.CACHE_TTL_SECONDS * 1000);

      return {
        authenticated: true,
        user: {
          id: (user as any)._id.toString(),
          email: user.email,
          name: user.name,
          avatar: (user as any).avatar,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
          preferences: (user as any).preferences || {
            theme: 'light',
            language: 'en',
            notifications: true
          },
          lastLogin: (user as any).lastLogin
        },
        recentBookings: [], // TODO: Fetch from RecentBooking model
        permissions,
        sessionMetadata: {
          tokenExpiresAt,
          refreshAt,
          cacheExpiresAt
        }
      };
    } catch (error) {
      console.error('Error building session data:', error);
      return null;
    }
  }

  /**
   * Generate role-based permissions
   */
  private generatePermissions(role: string): any {
    const basePermissions = {
      canBookClasses: false,
      canTeach: false,
      canManageShaalas: false,
      canViewAnalytics: false,
      maxBookingsPerDay: 0
    };

    switch (role) {
      case 'student':
        return {
          ...basePermissions,
          canBookClasses: true,
          maxBookingsPerDay: 3
        };
      case 'teacher':
        return {
          ...basePermissions,
          canBookClasses: true,
          canTeach: true,
          canViewAnalytics: true,
          maxBookingsPerDay: 5
        };
      case 'shaala_owner':
        return {
          ...basePermissions,
          canBookClasses: true,
          canTeach: true,
          canManageShaalas: true,
          canViewAnalytics: true,
          maxBookingsPerDay: 10
        };
      default:
        return basePermissions;
    }
  }

  /**
   * Cache management methods
   */
  private async getCachedSession(cacheKey: string): Promise<any> {
    try {
      const cached = await this.cache.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  private async cacheSession(cacheKey: string, sessionData: any): Promise<void> {
    try {
      await this.cache.setex(cacheKey, this.CACHE_TTL_SECONDS, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  private shouldRefreshCache(cachedSession: any): boolean {
    const now = new Date();
    return now >= new Date(cachedSession.sessionMetadata.refreshAt);
  }

  /**
   * Token verification
   */
  private verifyToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      return { userId: decoded.userId };
    } catch (error) {
      return null;
    }
  }

  /**
   * Utility method to extract token from request
   */
  private extractToken(request: AuthenticatedRequest): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check for token in cookies
    return request.cookies?.token || null;
  }

  /**
   * Background data loading endpoints
   * These are called AFTER the main UI is rendered
   */
  detailedProfile = async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    reply.code(200).send({ 
      message: 'Detailed profile endpoint - loads non-critical user data',
      description: 'Full profile settings, social connections, detailed preferences',
      data: {} 
    });
  };

  bookingHistory = async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    reply.code(200).send({ 
      message: 'Full booking history endpoint - loads complete booking data',
      description: 'All historical bookings, payment records, analytics',
      data: {} 
    });
  };

  notifications = async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    reply.code(200).send({ 
      message: 'Notifications endpoint - loads user notifications',
      description: 'System messages, class reminders, updates',
      data: {} 
    });
  };

  /**
   * SESSION MANAGEMENT
   */
  invalidateSession = async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
    try {
      const token = this.extractToken(request);
      if (token) {
        const decoded = this.verifyToken(token);
        if (decoded) {
          await this.cache.del(`${this.CACHE_KEY_PREFIX}${decoded.userId}`);
        }
      }
      
      reply.code(200).send({ 
        success: true, 
        message: 'Session cache cleared - user will need to re-authenticate' 
      });
    } catch (error) {
      console.error('Session invalidation error:', error);
      reply.code(500).send({ 
        error: 'Failed to invalidate session',
        message: 'Please try again or contact support'
      });
    }
  };
}

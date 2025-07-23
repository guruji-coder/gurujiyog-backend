import { User, ActiveSubscription, RecentBooking } from '../../models/User';
import { AuthSessionResponse, SessionResponse, RolePermissions } from '../types/auth';
import jwt from 'jsonwebtoken';

// Redis type definition for compatibility
interface RedisClient {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<void>;
  del(key: string): Promise<void>;
}

export class AuthService {
  private redis: RedisClient;
  private readonly CACHE_PREFIX = 'session:';
  private readonly CACHE_TTL = 1800; // 30 minutes
  private readonly REFRESH_THRESHOLD = 300; // 5 minutes before expiry

  constructor(redisClient: RedisClient) {
    this.redis = redisClient;
  }

  /**
   * Get comprehensive user session data with smart caching
   * This is the core endpoint for the hybrid approach
   */
  async getSession(token: string): Promise<AuthSessionResponse> {
    try {
      // Decode and verify token
      const decoded = this.verifyToken(token);
      if (!decoded) {
        return { authenticated: false, error: 'Invalid token' };
      }

      const userId = decoded.userId;
      const cacheKey = `${this.CACHE_PREFIX}${userId}`;

      // Try cache first
      const cachedSession = await this.getCachedSession(cacheKey);
      if (cachedSession && !this.shouldRefreshCache(cachedSession)) {
        return cachedSession;
      }

      // Fetch fresh data if cache miss or stale
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
   * Build complete session data from database
   * Optimized with parallel queries for performance
   */
  private async buildSessionData(userId: string): Promise<SessionResponse | null> {
    try {
      // Parallel database queries for optimal performance
      const [user, activeSubscription, recentBookings] = await Promise.all([
        User.findById(userId).lean(),
        ActiveSubscription.findOne({ userId, status: 'active' }).lean(),
        RecentBooking.find({ userId })
          .sort({ scheduledAt: -1 })
          .limit(parseInt(process.env.RECENT_BOOKINGS_LIMIT || '5'))
          .lean()
      ]);

      if (!user || !user.isActive) {
        return null;
      }

      // Generate role-based permissions
      const permissions = this.generatePermissions(user.role);

      // Calculate token and cache expiry times
      const now = new Date();
      const tokenExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
      const refreshAt = new Date(tokenExpiresAt.getTime() - this.REFRESH_THRESHOLD * 1000);
      const cacheExpiresAt = new Date(now.getTime() + this.CACHE_TTL * 1000);

      return {
        authenticated: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          isActive: user.isActive,
          isVerified: user.isVerified,
          preferences: user.preferences,
          lastLogin: user.lastLogin
        },
        activeSubscription: activeSubscription ? {
          id: activeSubscription._id.toString(),
          type: activeSubscription.type,
          status: activeSubscription.status,
          expiresAt: activeSubscription.expiresAt,
          remainingClasses: activeSubscription.remainingClasses,
          shaalas: activeSubscription.shaalas.map((id: any) => id.toString())
        } : undefined,
        recentBookings: recentBookings.map((booking: any) => ({
          id: booking._id.toString(),
          className: booking.className,
          shaalaName: booking.shaalanName,
          teacherName: booking.teacherName,
          status: booking.status,
          scheduledAt: booking.scheduledAt,
          bookedAt: booking.bookedAt
        })),
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
  private generatePermissions(role: string): RolePermissions {
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
  private async getCachedSession(cacheKey: string): Promise<SessionResponse | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  private async cacheSession(cacheKey: string, sessionData: SessionResponse): Promise<void> {
    try {
      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  private shouldRefreshCache(cachedSession: SessionResponse): boolean {
    const now = new Date();
    return now >= cachedSession.sessionMetadata.refreshAt;
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
   * Invalidate user session cache
   */
  async invalidateSession(userId: string): Promise<void> {
    try {
      await this.redis.del(`${this.CACHE_PREFIX}${userId}`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
}

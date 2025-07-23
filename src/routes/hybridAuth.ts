import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { HybridAuthController } from '../controllers/hybridAuthController';
import { createCache } from '../cache/memoryCache';

/**
 * Initialize session cache
 * - Uses memory cache for development (no setup required)
 * - Automatically upgrades to Redis in production if available
 */
const sessionCache = createCache();

/**
 * Initialize the authentication controller with caching
 */
const authController = new HybridAuthController(sessionCache);

/**
 * Hybrid Authentication Routes Plugin for Fastify
 * 
 * This plugin implements the "Recommended Hybrid Approach":
 * 1. Single /session endpoint returns ALL critical data (~200ms)
 * 2. Background endpoints load detailed data progressively
 * 3. Smart caching reduces database hits
 */
export default async function hybridAuthRoutes(
  fastify: FastifyInstance, 
  options: FastifyPluginOptions
) {
  
  /**
   * PRIMARY ENDPOINT - Critical Data Only
   * GET /auth/session
   * 
   * Returns everything needed to render the UI immediately:
   * - User profile (name, email, avatar, role)
   * - Permissions (what user can do)
   * - Recent bookings (last 3-5 for dashboard)
   * - Active subscriptions
   * 
   * Response time: ~200ms (cached: ~50ms)
   */
  fastify.get('/session', authController.session);

  /**
   * BACKGROUND ENDPOINTS - Non-Critical Data
   * These load after the UI is already rendered
   */
  
  /**
   * GET /auth/profile/detailed
   * Loads complete profile data, settings, preferences
   */
  fastify.get('/profile/detailed', authController.detailedProfile);
  
  /**
   * GET /auth/bookings/history  
   * Loads full booking history, payment records
   */
  fastify.get('/bookings/history', authController.bookingHistory);
  
  /**
   * GET /auth/notifications
   * Loads user notifications, system messages
   */
  fastify.get('/notifications', authController.notifications);

  /**
   * SESSION MANAGEMENT
   */
  
  /**
   * POST /auth/session/invalidate
   * Clears session cache, forces re-authentication
   */
  fastify.post('/session/invalidate', authController.invalidateSession);
}

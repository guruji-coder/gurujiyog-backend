/**
 * Route Helper Functions
 * 
 * Utility functions for working with routes constants
 */

import { ROUTES, ROUTE_SEGMENTS, ROUTE_TAGS } from './routes';

/**
 * Get the full API URL for a route
 */
export function getFullApiUrl(baseUrl: string, route: string): string {
  return `${baseUrl}${route}`;
}

/**
 * Build parameterized route URLs
 */
export function buildRouteUrl(template: string, params: Record<string, string>): string {
  let url = template;
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, value);
  });
  return url;
}

/**
 * Example usage functions
 */
export const RouteBuilders = {
  // User routes
  user: {
    getById: (id: string) => buildRouteUrl(ROUTES.USERS.BY_ID(''), { id }),
    updateById: (id: string) => buildRouteUrl(ROUTES.USERS.BY_ID(''), { id }),
    deleteById: (id: string) => buildRouteUrl(ROUTES.USERS.BY_ID(''), { id }),
  },
  
  // Shala routes
  shala: {
    getById: (id: string) => buildRouteUrl(ROUTES.SHALAS.BY_ID(''), { id }),
    getClasses: (id: string) => ROUTES.SHALAS.CLASSES(id),
    getClassById: (shalaId: string, classId: string) => ROUTES.SHALAS.CLASS_BY_ID(shalaId, classId),
    getReviews: (id: string) => ROUTES.SHALAS.REVIEWS(id),
    uploadImage: (id: string) => ROUTES.SHALAS.UPLOAD_IMAGES(id),
  },
  
  // Booking routes
  booking: {
    getById: (id: string) => buildRouteUrl(ROUTES.BOOKINGS.BY_ID(''), { id }),
    cancel: (id: string) => ROUTES.BOOKINGS.CANCEL(id),
    checkin: (id: string) => ROUTES.BOOKINGS.CHECKIN(id),
    checkout: (id: string) => ROUTES.BOOKINGS.CHECKOUT(id),
  }
};

/**
 * Route validation helpers
 */
export function isValidRoute(route: string): boolean {
  const allRoutes = Object.values(ROUTES).flatMap(section => 
    typeof section === 'object' ? Object.values(section) : [section]
  );
  return allRoutes.some(validRoute => 
    typeof validRoute === 'string' && validRoute === route
  );
}

/**
 * Get route segments for specific modules
 */
export function getRouteSegments(module: keyof typeof ROUTE_SEGMENTS) {
  return ROUTE_SEGMENTS[module];
}

/**
 * Get route tags for Swagger documentation
 */
export function getRouteTag(module: keyof typeof ROUTE_TAGS) {
  return ROUTE_TAGS[module];
}

/**
 * Common route patterns for reuse
 */
export const COMMON_ROUTE_PATTERNS = {
  BY_ID: '/:id',
  WITH_PAGINATION: '?page=:page&limit=:limit',
  SEARCH: '?search=:search',
  FILTER_BY_STATUS: '?status=:status',
  DATE_RANGE: '?startDate=:startDate&endDate=:endDate',
} as const;

/**
 * Route middleware mappings
 */
export const ROUTE_MIDDLEWARE = {
  REQUIRE_AUTH: ['auth'],
  REQUIRE_ADMIN: ['auth', 'admin'],
  REQUIRE_OWNER: ['auth', 'owner'],
  PUBLIC: [],
} as const;

/**
 * Generate OpenAPI/Swagger route documentation
 */
export function generateRouteDoc(
  method: string,
  path: string,
  tag: string,
  summary: string,
  description?: string
) {
  return {
    method: method.toLowerCase(),
    path,
    schema: {
      tags: [tag],
      summary,
      description: description || summary,
    }
  };
}

export default {
  getFullApiUrl,
  buildRouteUrl,
  RouteBuilders,
  isValidRoute,
  getRouteSegments,
  getRouteTag,
  generateRouteDoc,
};

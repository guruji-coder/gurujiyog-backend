/**
 * API Routes Constants
 * 
 * Centralized route definitions for better maintainability and consistency
 */

// Base API prefix
export const API_PREFIX = "/api";

// Auth Routes
export const AUTH_ROUTES = {
  BASE: "/auth",
  REGISTER: "/register",
  LOGIN: "/login",
  LOGOUT: "/logout",
  REFRESH: "/refresh",
  VERIFY_OTP: "/verify-otp",
  RESEND_OTP: "/resend-otp",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  GOOGLE: {
    BASE: "/google",
    CALLBACK: "/google/callback",
  },
  FACEBOOK: {
    BASE: "/facebook", 
    CALLBACK: "/facebook/callback",
  },
} as const;

// User Routes
export const USER_ROUTES = {
  BASE: "/users",
  EXTRACT_TOKEN_DATA: "/extract-token-data",
  BY_ID: "/:id",
  STATS: {
    OVERVIEW: "/stats/overview",
  },
  BULK_UPDATE: "/bulk-update",
} as const;

// Shala Routes
export const SHALA_ROUTES = {
  BASE: "/shalas",
  BY_ID: "/:id",
  SEARCH: "/search",
  NEARBY: "/nearby",
  BY_OWNER: "/by-owner",
  STATS: {
    OVERVIEW: "/stats/overview",
  },
  CLASSES: {
    BASE: "/:id/classes",
    BY_CLASS_ID: "/:id/classes/:classId",
  },
  REVIEWS: {
    BASE: "/:id/reviews",
    BY_REVIEW_ID: "/:id/reviews/:reviewId",
  },
  IMAGES: {
    BASE: "/:id/images",
    UPLOAD: "/:id/images/upload",
    DELETE: "/:id/images/:imageId",
  },
} as const;

// Booking Routes
export const BOOKING_ROUTES = {
  BASE: "/bookings",
  BY_ID: "/:id",
  MY_BOOKINGS: "/my-bookings",
  CANCEL: "/:id/cancel",
  CHECKIN: "/:id/checkin",
  CHECKOUT: "/:id/checkout",
  STATS: {
    OVERVIEW: "/stats/overview",
  },
} as const;

// Health Routes
export const HEALTH_ROUTES = {
  BASE: "/health",
  CHECK: "/check",
  DATABASE: "/database",
} as const;

// Upload Routes
export const UPLOAD_ROUTES = {
  BASE: "/upload",
  IMAGE: "/image",
  AVATAR: "/avatar",
  SHALA_IMAGES: "/shala-images",
} as const;

// Admin Routes
export const ADMIN_ROUTES = {
  BASE: "/admin",
  USERS: "/users",
  SHALAS: "/shalas",
  BOOKINGS: "/bookings",
  ANALYTICS: "/analytics",
  SYSTEM: {
    BASE: "/system",
    LOGS: "/system/logs",
    CLEANUP: "/system/cleanup",
  },
} as const;

// Complete route builders
export const ROUTES = {
  // Auth
  AUTH: {
    REGISTER: `${API_PREFIX}${AUTH_ROUTES.BASE}${AUTH_ROUTES.REGISTER}`,
    LOGIN: `${API_PREFIX}${AUTH_ROUTES.BASE}${AUTH_ROUTES.LOGIN}`,
    LOGOUT: `${API_PREFIX}${AUTH_ROUTES.BASE}${AUTH_ROUTES.LOGOUT}`,
    REFRESH: `${API_PREFIX}${AUTH_ROUTES.BASE}${AUTH_ROUTES.REFRESH}`,
    VERIFY_OTP: `${API_PREFIX}${AUTH_ROUTES.BASE}${AUTH_ROUTES.VERIFY_OTP}`,
    RESEND_OTP: `${API_PREFIX}${AUTH_ROUTES.BASE}${AUTH_ROUTES.RESEND_OTP}`,
    FORGOT_PASSWORD: `${API_PREFIX}${AUTH_ROUTES.BASE}${AUTH_ROUTES.FORGOT_PASSWORD}`,
    RESET_PASSWORD: `${API_PREFIX}${AUTH_ROUTES.BASE}${AUTH_ROUTES.RESET_PASSWORD}`,
    GOOGLE: `${API_PREFIX}${AUTH_ROUTES.BASE}${AUTH_ROUTES.GOOGLE.BASE}`,
    GOOGLE_CALLBACK: `${API_PREFIX}${AUTH_ROUTES.BASE}${AUTH_ROUTES.GOOGLE.CALLBACK}`,
    FACEBOOK: `${API_PREFIX}${AUTH_ROUTES.BASE}${AUTH_ROUTES.FACEBOOK.BASE}`,
    FACEBOOK_CALLBACK: `${API_PREFIX}${AUTH_ROUTES.BASE}${AUTH_ROUTES.FACEBOOK.CALLBACK}`,
  },
  
  // Users
  USERS: {
    BASE: `${API_PREFIX}${USER_ROUTES.BASE}`,
    EXTRACT_TOKEN_DATA: `${API_PREFIX}${USER_ROUTES.BASE}${USER_ROUTES.EXTRACT_TOKEN_DATA}`,
    BY_ID: (id: string) => `${API_PREFIX}${USER_ROUTES.BASE}/${id}`,
    STATS_OVERVIEW: `${API_PREFIX}${USER_ROUTES.BASE}${USER_ROUTES.STATS.OVERVIEW}`,
    BULK_UPDATE: `${API_PREFIX}${USER_ROUTES.BASE}${USER_ROUTES.BULK_UPDATE}`,
  },
  
  // Shalas
  SHALAS: {
    BASE: `${API_PREFIX}${SHALA_ROUTES.BASE}`,
    BY_ID: (id: string) => `${API_PREFIX}${SHALA_ROUTES.BASE}/${id}`,
    SEARCH: `${API_PREFIX}${SHALA_ROUTES.BASE}${SHALA_ROUTES.SEARCH}`,
    NEARBY: `${API_PREFIX}${SHALA_ROUTES.BASE}${SHALA_ROUTES.NEARBY}`,
    BY_OWNER: `${API_PREFIX}${SHALA_ROUTES.BASE}${SHALA_ROUTES.BY_OWNER}`,
    STATS_OVERVIEW: `${API_PREFIX}${SHALA_ROUTES.BASE}${SHALA_ROUTES.STATS.OVERVIEW}`,
    CLASSES: (shalaId: string) => `${API_PREFIX}${SHALA_ROUTES.BASE}/${shalaId}/classes`,
    CLASS_BY_ID: (shalaId: string, classId: string) => `${API_PREFIX}${SHALA_ROUTES.BASE}/${shalaId}/classes/${classId}`,
    REVIEWS: (shalaId: string) => `${API_PREFIX}${SHALA_ROUTES.BASE}/${shalaId}/reviews`,
    REVIEW_BY_ID: (shalaId: string, reviewId: string) => `${API_PREFIX}${SHALA_ROUTES.BASE}/${shalaId}/reviews/${reviewId}`,
    IMAGES: (shalaId: string) => `${API_PREFIX}${SHALA_ROUTES.BASE}/${shalaId}/images`,
    UPLOAD_IMAGES: (shalaId: string) => `${API_PREFIX}${SHALA_ROUTES.BASE}/${shalaId}/images/upload`,
    DELETE_IMAGE: (shalaId: string, imageId: string) => `${API_PREFIX}${SHALA_ROUTES.BASE}/${shalaId}/images/${imageId}`,
  },
  
  // Bookings
  BOOKINGS: {
    BASE: `${API_PREFIX}${BOOKING_ROUTES.BASE}`,
    BY_ID: (id: string) => `${API_PREFIX}${BOOKING_ROUTES.BASE}/${id}`,
    MY_BOOKINGS: `${API_PREFIX}${BOOKING_ROUTES.BASE}${BOOKING_ROUTES.MY_BOOKINGS}`,
    CANCEL: (id: string) => `${API_PREFIX}${BOOKING_ROUTES.BASE}/${id}/cancel`,
    CHECKIN: (id: string) => `${API_PREFIX}${BOOKING_ROUTES.BASE}/${id}/checkin`,
    CHECKOUT: (id: string) => `${API_PREFIX}${BOOKING_ROUTES.BASE}/${id}/checkout`,
    STATS_OVERVIEW: `${API_PREFIX}${BOOKING_ROUTES.BASE}${BOOKING_ROUTES.STATS.OVERVIEW}`,
  },
  
  // Health
  HEALTH: {
    BASE: `${API_PREFIX}${HEALTH_ROUTES.BASE}`,
    CHECK: `${API_PREFIX}${HEALTH_ROUTES.BASE}${HEALTH_ROUTES.CHECK}`,
    DATABASE: `${API_PREFIX}${HEALTH_ROUTES.BASE}${HEALTH_ROUTES.DATABASE}`,
  },
  
  // Upload
  UPLOAD: {
    BASE: `${API_PREFIX}${UPLOAD_ROUTES.BASE}`,
    IMAGE: `${API_PREFIX}${UPLOAD_ROUTES.BASE}${UPLOAD_ROUTES.IMAGE}`,
    AVATAR: `${API_PREFIX}${UPLOAD_ROUTES.BASE}${UPLOAD_ROUTES.AVATAR}`,
    SHALA_IMAGES: `${API_PREFIX}${UPLOAD_ROUTES.BASE}${UPLOAD_ROUTES.SHALA_IMAGES}`,
  },
  
  // Admin
  ADMIN: {
    BASE: `${API_PREFIX}${ADMIN_ROUTES.BASE}`,
    USERS: `${API_PREFIX}${ADMIN_ROUTES.BASE}${ADMIN_ROUTES.USERS}`,
    SHALAS: `${API_PREFIX}${ADMIN_ROUTES.BASE}${ADMIN_ROUTES.SHALAS}`,
    BOOKINGS: `${API_PREFIX}${ADMIN_ROUTES.BASE}${ADMIN_ROUTES.BOOKINGS}`,
    ANALYTICS: `${API_PREFIX}${ADMIN_ROUTES.BASE}${ADMIN_ROUTES.ANALYTICS}`,
    SYSTEM_LOGS: `${API_PREFIX}${ADMIN_ROUTES.BASE}${ADMIN_ROUTES.SYSTEM.LOGS}`,
    SYSTEM_CLEANUP: `${API_PREFIX}${ADMIN_ROUTES.BASE}${ADMIN_ROUTES.SYSTEM.CLEANUP}`,
  },
} as const;

// Route path segments (for use in Fastify route definitions)
export const ROUTE_SEGMENTS = {
  AUTH: AUTH_ROUTES,
  USERS: USER_ROUTES,
  SHALAS: SHALA_ROUTES,
  BOOKINGS: BOOKING_ROUTES,
  HEALTH: HEALTH_ROUTES,
  UPLOAD: UPLOAD_ROUTES,
  ADMIN: ADMIN_ROUTES,
} as const;

// HTTP Methods
export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
} as const;

// Route Tags (for Swagger documentation)
export const ROUTE_TAGS = {
  AUTH: "Authentication",
  USERS: "Users",
  SHALAS: "Shalas",
  BOOKINGS: "Bookings",
  HEALTH: "Health",
  UPLOAD: "Upload",
  ADMIN: "Admin",
} as const;

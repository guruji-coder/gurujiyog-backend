// ===============================
// Auth Routes (Fastify)
// -------------------------------
// All authentication-related API endpoints for GurujiYog.
// - Registration, login, OTP, password, profile, OAuth
// - All routes are POST/GET endpoints under /api/auth
// - Handlers are in AuthControllerFastify
// ===============================

import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { AuthControllerFastify } from "../controllers/authControllerFastify";
import { OAuthControllerFastify } from "../controllers/oauthControllerFastify";
import { authMiddleware } from "../middleware/authFastify";
import { ROUTE_SEGMENTS, ROUTE_TAGS } from "../constants/routes";

// Extend FastifyInstance to include OAuth2 plugins (for Google/Facebook login)
declare module "fastify" {
  interface FastifyInstance {
    googleOAuth2: {
      generateAuthorizationUri: (request: any, reply: any) => any;
      getAccessTokenFromAuthorizationCodeFlow: (
        request: any
      ) => Promise<{ token: { access_token: string } }>;
    };
    facebookOAuth2: {
      generateAuthorizationUri: (request: any, reply: any) => any;
      getAccessTokenFromAuthorizationCodeFlow: (
        request: any
      ) => Promise<{ token: { access_token: string } }>;
    };
  }
}

// Main function to register all auth routes
const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // -------------------
  // Register new user
  // POST /api/auth/register
  // -------------------
  fastify.post(
    ROUTE_SEGMENTS.AUTH.REGISTER,
    {
      schema: {
        tags: [ROUTE_TAGS.AUTH],
        summary: "Register a new user",
        description: "Create a new user account with email and password",
        body: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: {
              type: "string",
              minLength: 2,
              description: "User's full name",
            },
            email: {
              type: "string",
              format: "email",
              description: "User's email address",
            },
            password: {
              type: "string",
              minLength: 6,
              description: "User's password (min 6 characters)",
            },
            phone: {
              type: "string",
              description: "User's phone number (optional)",
            },
            role: {
              type: "string",
              enum: ["student", "instructor", "shala_owner", "admin"],
              description: "User's role in the system",
              default: "student",
            },
          },
        },
        response: {
          201: { description: "User registered successfully" },
          400: { description: "Validation error or user exists" },
          500: { description: "Internal server error" },
        },
      },
    },
    AuthControllerFastify.register
  );

  // -------------------
  // Login with email/password
  // POST /api/auth/login
  // -------------------
  fastify.post(
    "/login",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Login with email and password",
        description:
          "Authenticate user with email and password, returns JWT token",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "User's email address",
            },
            password: { type: "string", description: "User's password" },
          },
        },
        response: {
          200: { description: "Login successful" },
          401: { description: "Invalid credentials" },
          500: { description: "Internal server error" },
        },
      },
    },
    AuthControllerFastify.login
  );

  // -------------------
  // Send OTP to email
  // POST /api/auth/send-otp
  // -------------------
  fastify.post(
    "/send-otp",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Send OTP to email",
        description:
          "Send a 6-digit OTP to the provided email address for authentication",
        body: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Email address to send OTP to",
            },
          },
        },
        response: {
          200: { description: "OTP sent successfully" },
          400: { description: "Invalid email" },
          500: { description: "Failed to send OTP" },
        },
      },
    },
    AuthControllerFastify.sendOTP
  );

  // -------------------
  // Verify OTP and login/register
  // POST /api/auth/verify-otp
  // -------------------
  fastify.post(
    "/verify-otp",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Verify OTP and authenticate",
        description:
          "Verify the 6-digit OTP and authenticate user. Creates new account if user doesn't exist.",
        body: {
          type: "object",
          required: ["email", "otp"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Email address used for OTP",
            },
            otp: {
              type: "string",
              minLength: 6,
              maxLength: 6,
              description: "6-digit OTP code",
            },
            name: {
              type: "string",
              description:
                "User's name (optional, used for new account creation)",
            },
          },
        },
        response: {
          200: { description: "OTP verified successfully" },
          400: { description: "Invalid or expired OTP" },
          500: { description: "Internal server error" },
        },
      },
    },
    AuthControllerFastify.verifyOTP
  );

  // -------------------
  // Set password after OTP verification
  // POST /api/auth/set-password
  // -------------------
  fastify.post(
    "/set-password",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Set password after OTP verification",
        description: "Set password for new user after OTP verification",
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Email address used for OTP",
            },
            password: {
              type: "string",
              minLength: 6,
              description: "User's password (minimum 6 characters)",
            },
            name: { type: "string", description: "User's name (optional)" },
          },
        },
        response: {
          200: { description: "Password set successfully" },
          400: { description: "Invalid request or no verified OTP" },
          500: { description: "Internal server error" },
        },
      },
    },
    AuthControllerFastify.setPasswordAfterOTP
  );

  // -------------------
  // Refresh access token
  // POST /api/auth/refresh-token
  // -------------------
  fastify.post(
    "/refresh-token",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Refresh access token",
        description:
          "Get a new access token using the refresh token from HTTP-only cookie",
        response: {
          200: { description: "Access token refreshed successfully" },
          401: { description: "Invalid or expired refresh token" },
          500: { description: "Internal server error" },
        },
      },
    },
    AuthControllerFastify.refreshToken
  );

  // -------------------
  // Logout user
  // POST /api/auth/logout
  // -------------------
  fastify.post(
    "/logout",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Logout user",
        description: "Clear authentication cookies and logout user",
        response: {
          200: { description: "Logout successful" },
        },
      },
    },
    AuthControllerFastify.logout
  );

  // -------------------
  // Get current user profile
  // GET /api/auth/profile
  // -------------------
  fastify.get(
    "/profile",
    {
      preHandler: authMiddleware,
      schema: {
        tags: ["Authentication"],
        summary: "Get current user profile",
        description: "Get the profile of the currently authenticated user",
        response: {
          200: { description: "Profile retrieved successfully" },
          401: { description: "User not authenticated" },
        },
      },
    },
    AuthControllerFastify.getProfile
  );

  // -------------------
  // Update current user profile
  // PUT /api/auth/profile
  // -------------------
  fastify.put(
    "/profile",
    {
      preHandler: authMiddleware,
      schema: {
        tags: ["Authentication"],
        summary: "Update current user profile",
        description: "Update the profile of the currently authenticated user",
        body: {
          type: "object",
          properties: {
            name: { type: "string", description: "User's name" },
            phone: { type: "string", description: "User's phone number" },
            role: {
              type: "string",
              enum: ["student", "instructor", "shala_owner", "admin"],
              description: "User's role",
            },
          },
        },
        response: {
          200: { description: "Profile updated successfully" },
          401: { description: "User not authenticated" },
        },
      },
    },
    AuthControllerFastify.updateProfile
  );

  // -------------------
  // Google OAuth login (initiate)
  // GET /api/auth/google
  // -------------------
  fastify.get(
    "/google",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Initiate Google OAuth",
        description: "Redirects user to Google OAuth consent screen",
        response: {
          302: { description: "Redirect to Google OAuth" },
        },
      },
    },
    async (request, reply) => {
      const googleOAuth2 = fastify.googleOAuth2;
      return googleOAuth2.generateAuthorizationUri(request, reply);
    }
  );

  // -------------------
  // Google OAuth callback
  // GET /api/auth/google/callback
  // -------------------
  fastify.get(
    "/google/callback",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Google OAuth callback",
        description: "Handles Google OAuth callback and authenticates user",
        response: {
          302: { description: "Redirect to frontend with token or error" },
        },
      },
    },
    OAuthControllerFastify.googleCallback
  );

  // -------------------
  // Facebook OAuth login (initiate)
  // GET /api/auth/facebook
  // -------------------
  fastify.get(
    "/facebook",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Initiate Facebook OAuth",
        description: "Redirects user to Facebook OAuth consent screen",
        response: {
          302: { description: "Redirect to Facebook OAuth" },
        },
      },
    },
    async (request, reply) => {
      const facebookOAuth2 = fastify.facebookOAuth2;
      return facebookOAuth2.generateAuthorizationUri(request, reply);
    }
  );

  // -------------------
  // Facebook OAuth callback
  // GET /api/auth/facebook/callback
  // -------------------
  fastify.get(
    "/facebook/callback",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Facebook OAuth callback",
        description: "Handles Facebook OAuth callback and authenticates user",
        response: {
          302: { description: "Redirect to frontend with token or error" },
        },
      },
    },
    OAuthControllerFastify.facebookCallback
  );
};

export default authRoutes;

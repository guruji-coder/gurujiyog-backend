import {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  FastifyPluginAsync,
} from "fastify";

// Extend FastifyInstance to include OAuth2 plugins
declare module "fastify" {
  interface FastifyInstance {
    googleOAuth2: {
      generateAuthorizationUri: (
        request: FastifyRequest,
        reply: FastifyReply
      ) => any;
      getAccessTokenFromAuthorizationCodeFlow: (
        request: FastifyRequest
      ) => Promise<{ token: { access_token: string } }>;
    };
    facebookOAuth2: {
      generateAuthorizationUri: (
        request: FastifyRequest,
        reply: FastifyReply
      ) => any;
      getAccessTokenFromAuthorizationCodeFlow: (
        request: FastifyRequest
      ) => Promise<{ token: { access_token: string } }>;
    };
  }
}
import User from "../models/User";
import { IUser as UserType } from "../models/User";
import OTP from "../models/OTP";
import { IOTP } from "../models/OTP";
import { sendOTPEmail, generateOTP } from "../utils/emailService";
import jwt, { Secret, SignOptions, Algorithm } from "jsonwebtoken";
import { OTPService } from "../services/auth/otpService";
import { AuthService } from "../services/auth/authService";
import { TokenService } from "../services/auth/tokenService";

// Define request types
interface SendOTPRequest {
  Body: {
    email: string;
  };
}

interface VerifyOTPRequest {
  Body: {
    email: string;
    otp: string;
    name?: string;
  };
}

interface LoginRequest {
  Body: {
    email: string;
    password: string;
  };
}

interface RegisterRequest {
  Body: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
  };
}

// Generate JWT token
const generateToken = (userId: string, expiresIn?: number): string => {
  const secret: Secret = process.env.JWT_SECRET || "fallback-secret";
  const options: SignOptions = {
    expiresIn: expiresIn || 15 * 60, // Default 15 minutes for access tokens
    algorithm: "HS256" as Algorithm,
  };
  return jwt.sign({ userId }, secret, options);
};

const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Register
  fastify.post<RegisterRequest>(
    "/register",
    {
      schema: {
        tags: ["Authentication"],
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
          201: {
            description: "User registered successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              token: {
                type: "string",
                description: "JWT token for authentication",
              },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  role: { type: "string" },
                  isVerified: { type: "boolean" },
                },
              },
            },
          },
          400: {
            description:
              "Bad request - validation error or user already exists",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          500: {
            description: "Internal server error",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<RegisterRequest>, reply: FastifyReply) => {
      try {
        const { name, email, password, phone, role = "student" } = request.body;

        // Use the auth service
        const result = await AuthService.register({
          name,
          email,
          password,
          phone,
          role,
        });

        if (!result.success) {
          return reply.status(400).send({
            success: false,
            message: result.message,
          });
        }

        // Set secure HttpOnly cookie if token is provided
        if (result.token) {
          reply.setCookie("auth_token", result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: "/",
          });
        }

        reply.status(201).send({
          success: true,
          message: result.message,
          user: result.user,
        });
      } catch (error) {
        fastify.log.error("Registration error:", error);
        reply.status(500).send({
          success: false,
          message: "Server error during registration",
        });
      }
    }
  );

  // Login
  fastify.post<LoginRequest>(
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
          200: {
            description: "Login successful",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              token: {
                type: "string",
                description: "JWT token for authentication",
              },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  role: { type: "string" },
                  isVerified: { type: "boolean" },
                },
              },
            },
          },
          401: {
            description: "Invalid credentials",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          500: {
            description: "Internal server error",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<LoginRequest>, reply: FastifyReply) => {
      try {
        const { email, password } = request.body;

        // Use the auth service
        const result = await AuthService.login({
          email,
          password,
        });

        if (!result.success) {
          return reply.status(401).send({
            success: false,
            message: result.message,
          });
        }

        reply.send({
          success: true,
          message: result.message,
          token: result.token,
          user: result.user,
        });
      } catch (error) {
        fastify.log.error("Login error:", error);
        reply.status(500).send({
          success: false,
          message: "Server error during login",
        });
      }
    }
  );

  // Send OTP to email
  fastify.post<SendOTPRequest>(
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
          200: {
            description: "OTP sent successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          400: {
            description: "Bad request - invalid email",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          500: {
            description: "Failed to send OTP",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<SendOTPRequest>, reply: FastifyReply) => {
      try {
        const { email } = request.body;

        // Use the OTP service
        const result = await OTPService.sendOTP(email);

        if (!result.success) {
          return reply.status(500).send({
            success: false,
            message: result.message,
          });
        }

        reply.send({
          success: true,
          message: result.message,
        });
      } catch (error) {
        fastify.log.error("Send OTP error:", error);
        reply.status(500).send({
          success: false,
          message: "Failed to send OTP. Please try again.",
        });
      }
    }
  );

  // Verify OTP and login/register
  fastify.post<VerifyOTPRequest>(
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
          200: {
            description: "OTP verified successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              token: {
                type: "string",
                description: "JWT token for authentication",
              },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  role: { type: "string" },
                  isVerified: { type: "boolean" },
                },
              },
            },
          },
          400: {
            description: "Invalid or expired OTP",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          500: {
            description: "Internal server error",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<VerifyOTPRequest>, reply: FastifyReply) => {
      try {
        const { email, otp: otpCode, name } = request.body;

        // Use the OTP service
        const result = await OTPService.verifyOTP({
          email,
          otp: otpCode,
          name,
        });

        if (!result.success) {
          return reply.status(400).send({
            success: false,
            message: result.message,
          });
        }

        // Set secure HttpOnly cookie if token is provided
        if (result.token) {
          reply.setCookie("auth_token", result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60 * 1000, // 15 minutes
            path: "/",
          });
        }

        reply.send({
          success: true,
          message: result.message,
          user: result.user,
        });
      } catch (error) {
        fastify.log.error("Verify OTP error:", error);
        reply.status(500).send({
          success: false,
          message: "Server error during OTP verification",
        });
      }
    }
  );

  // Logout
  fastify.post(
    "/logout",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Logout user",
        description: "Clear authentication cookies and logout user",
        response: {
          200: {
            description: "Logout successful",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      // Clear authentication cookies
      reply.clearCookie("auth_token", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      reply.send({
        success: true,
        message: "Logout successful",
      });
    }
  );

  // Google OAuth initiate
  fastify.get(
    "/google",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Initiate Google OAuth",
        description: "Redirects user to Google OAuth consent screen",
        response: {
          302: {
            description: "Redirect to Google OAuth",
          },
        },
      },
    },
    async (request, reply) => {
      const googleOAuth2 = fastify.googleOAuth2;
      return googleOAuth2.generateAuthorizationUri(request, reply);
    }
  );

  // Google OAuth callback
  fastify.get(
    "/google/callback",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Google OAuth callback",
        description: "Handles Google OAuth callback and authenticates user",
        response: {
          302: {
            description: "Redirect to frontend with token or error",
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const googleOAuth2 = fastify.googleOAuth2;
        const { token } =
          await googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

        // Get user info from Google
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          {
            headers: {
              Authorization: `Bearer ${token.access_token}`,
            },
          }
        );

        const googleUser = (await response.json()) as {
          id: string;
          name: string;
          email: string;
        };

        // Check if user exists
        let user = (await User.findOne({
          $or: [{ googleId: googleUser.id }, { email: googleUser.email }],
        })) as UserType;

        if (user) {
          // Update Google ID if not set
          if (!user.googleId) {
            user.googleId = googleUser.id;
            user.isVerified = true;
            await user.save();
          }
        } else {
          // Create new user
          user = new User({
            googleId: googleUser.id,
            name: googleUser.name,
            email: googleUser.email,
            password: "oauth_user",
            role: "student",
            isVerified: true,
          }) as UserType;

          await user.save();
        }

        // Generate token
        const authToken = generateToken(
          (user as unknown as { _id: { toString(): string } })._id.toString()
        );

        // Redirect to frontend with token
        reply.redirect(
          `${process.env.FRONTEND_URL}/auth/success?token=${authToken}`
        );
      } catch (error) {
        fastify.log.error("Google OAuth callback error:", error);
        reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
      }
    }
  );

  // Facebook OAuth initiate
  fastify.get(
    "/facebook",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Initiate Facebook OAuth",
        description: "Redirects user to Facebook OAuth consent screen",
        response: {
          302: {
            description: "Redirect to Facebook OAuth",
          },
        },
      },
    },
    async (request, reply) => {
      const facebookOAuth2 = fastify.facebookOAuth2;
      return facebookOAuth2.generateAuthorizationUri(request, reply);
    }
  );

  // Facebook OAuth callback
  fastify.get(
    "/facebook/callback",
    {
      schema: {
        tags: ["Authentication"],
        summary: "Facebook OAuth callback",
        description: "Handles Facebook OAuth callback and authenticates user",
        response: {
          302: {
            description: "Redirect to frontend with token or error",
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const facebookOAuth2 = fastify.facebookOAuth2;
        const { token } =
          await facebookOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

        // Get user info from Facebook
        const response = await fetch(
          `https://graph.facebook.com/me?fields=id,name,email&access_token=${token.access_token}`
        );
        const facebookUser = (await response.json()) as {
          id: string;
          name: string;
          email: string;
        };

        // Check if user exists
        let user = (await User.findOne({
          $or: [{ facebookId: facebookUser.id }, { email: facebookUser.email }],
        })) as UserType;

        if (user) {
          // Update Facebook ID if not set
          if (!user.facebookId) {
            user.facebookId = facebookUser.id;
            user.isVerified = true;
            await user.save();
          }
        } else {
          // Create new user
          user = new User({
            facebookId: facebookUser.id,
            name: facebookUser.name,
            email: facebookUser.email,
            password: "oauth_user",
            role: "student",
            isVerified: true,
          }) as UserType;

          await user.save();
        }

        // Generate token
        const authToken = generateToken(
          (user as unknown as { _id: { toString(): string } })._id.toString()
        );

        // Redirect to frontend with token
        reply.redirect(
          `${process.env.FRONTEND_URL}/auth/success?token=${authToken}`
        );
      } catch (error) {
        fastify.log.error("Facebook OAuth callback error:", error);
        reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
      }
    }
  );
};

export default authRoutes;

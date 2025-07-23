import { FastifyRequest, FastifyReply } from "fastify";
import { TokenService } from "../services/auth/tokenService";
import User from "../models/User";

// Extend FastifyRequest to include user
declare module "fastify" {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}

// Auth middleware for protected routes
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Get access token from Authorization header
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return reply.status(401).send({
        success: false,
        message: "Access token required",
      });
    }

    // Verify access token
    const decoded = TokenService.verifyAccessToken(token);
    if (!decoded) {
      return reply.status(401).send({
        success: false,
        message: "Invalid or expired access token",
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select("-password");
    if (!user || !user.isActive) {
      return reply.status(401).send({
        success: false,
        message: "User not found or inactive",
      });
    }

    // Attach user to request
    request.user = {
      id: (user._id as any).toString(),
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      message: "Authentication failed",
    });
  }
}

// Optional auth middleware (doesn't fail if no token)
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return; // No token, but don't fail
    }

    const decoded = TokenService.verifyAccessToken(token);
    if (!decoded) {
      return; // Invalid token, but don't fail
    }

    const user = await User.findById(decoded.userId).select("-password");
    if (user && user.isActive) {
      request.user = {
        id: (user._id as any).toString(),
        email: user.email,
        role: user.role,
      };
    }
  } catch (error) {
    // Don't fail, just continue without user
  }
}

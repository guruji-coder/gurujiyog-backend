import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { UserControllerFastify } from "../controllers/userControllerFastify";
import { extractUserDataFromToken, isTokenExpired } from "../utils/tokenHelpers";
import { ROUTE_SEGMENTS, ROUTE_TAGS } from "../constants/routes";

const userRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Extract user data from access token
  fastify.post(
    ROUTE_SEGMENTS.USERS.EXTRACT_TOKEN_DATA,
    {
      schema: {
        tags: [ROUTE_TAGS.USERS],
        summary: "Extract user data from access token",
        description: "Decode JWT token and return user information",
        body: {
          type: "object",
          required: ["accessToken"],
          properties: {
            accessToken: { 
              type: "string", 
              description: "JWT access token to decode" 
            },
          },
        },
        response: {
          200: {
            description: "Token decoded successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              userData: {
                type: "object",
                properties: {
                  id: { type: "string", description: "User ID" },
                  email: { type: "string", description: "User email (if available in token)" },
                  name: { type: "string", description: "User name (if available in token)" },
                  role: { type: "string", description: "User role (if available in token)" },
                  issuedAt: { type: "string", description: "Token issued at (ISO string)" },
                  expiresAt: { type: "string", description: "Token expires at (ISO string)" },
                },
              },
              isExpired: { type: "boolean" },
              timeRemaining: { type: "number" },
            },
          },
          400: {
            description: "Invalid token",
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
      try {
        const { accessToken } = request.body as { accessToken: string };
        
        // Extract user data from token
        const userData = extractUserDataFromToken(accessToken);
        
        if (!userData) {
          return reply.status(400).send({
            success: false,
            message: "Invalid or malformed token"
          });
        }
        
        // Check if token is expired
        const expired = isTokenExpired(accessToken);
        
        // Calculate time remaining
        const timeRemaining = Math.max(0, userData.expiresAt.getTime() - Date.now()) / 1000;
        
        return reply.send({
          success: true,
          userData: {
            id: userData.id,
            email: userData.email || "Not available",
            name: userData.name || "Not available", 
            role: userData.role || "Not available",
            issuedAt: userData.issuedAt.toISOString(),
            expiresAt: userData.expiresAt.toISOString(),
          },
          isExpired: expired,
          timeRemaining: Math.floor(timeRemaining)
        });
      } catch (error) {
        console.error("Token extraction error:", error);
        return reply.status(400).send({
          success: false,
          message: "Failed to extract token data"
        });
      }
    }
  );
  // Get all users (admin only)
  fastify.get(
    "/",
    {
      schema: {
        tags: [ROUTE_TAGS.USERS],
        summary: "Get all users",
        description: "Get a paginated list of all users (admin only)",
        querystring: {
          type: "object",
          properties: {
            page: { type: "string", default: "1" },
            limit: { type: "string", default: "10" },
            role: { type: "string" },
            search: { type: "string" },
          },
        },
        response: {
          200: {
            description: "Users retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              users: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    email: { type: "string" },
                    role: { type: "string" },
                    isVerified: { type: "boolean" },
                    isActive: { type: "boolean" },
                    createdAt: { type: "string" },
                  },
                },
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "number" },
                  limit: { type: "number" },
                  total: { type: "number" },
                  pages: { type: "number" },
                },
              },
            },
          },
          401: {
            description: "User not authenticated",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          403: {
            description: "User not authorized",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    UserControllerFastify.getAllUsers
  );

  // Get user by ID
  fastify.get(
    ROUTE_SEGMENTS.USERS.BY_ID,
    {
      schema: {
        tags: [ROUTE_TAGS.USERS],
        summary: "Get user by ID",
        description: "Get a specific user by their ID",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "User ID" },
          },
        },
        response: {
          200: {
            description: "User retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  role: { type: "string" },
                  isVerified: { type: "boolean" },
                  isActive: { type: "boolean" },
                  createdAt: { type: "string" },
                },
              },
            },
          },
          404: {
            description: "User not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    UserControllerFastify.getUserById
  );

  // Update user by ID (admin only)
  fastify.put(
    ROUTE_SEGMENTS.USERS.BY_ID,
    {
      schema: {
        tags: [ROUTE_TAGS.USERS],
        summary: "Update user by ID",
        description: "Update a specific user by their ID (admin only)",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "User ID" },
          },
        },
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
            isActive: { type: "boolean", description: "User's active status" },
            isVerified: {
              type: "boolean",
              description: "User's verification status",
            },
          },
        },
        response: {
          200: {
            description: "User updated successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              user: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  email: { type: "string" },
                  role: { type: "string" },
                  isVerified: { type: "boolean" },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
          404: {
            description: "User not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          403: {
            description: "User not authorized",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    UserControllerFastify.updateUserById
  );

  // Delete user by ID (admin only)
  fastify.delete(
    ROUTE_SEGMENTS.USERS.BY_ID,
    {
      schema: {
        tags: [ROUTE_TAGS.USERS],
        summary: "Delete user by ID",
        description: "Delete a specific user by their ID (admin only)",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "User ID" },
          },
        },
        response: {
          200: {
            description: "User deleted successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          404: {
            description: "User not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          403: {
            description: "User not authorized",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    UserControllerFastify.deleteUserById
  );

  // Get user statistics (admin only)
  fastify.get(
    ROUTE_SEGMENTS.USERS.STATS.OVERVIEW,
    {
      schema: {
        tags: [ROUTE_TAGS.USERS],
        summary: "Get user statistics",
        description: "Get comprehensive user statistics (admin only)",
        response: {
          200: {
            description: "Statistics retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              stats: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  verified: { type: "number" },
                  active: { type: "number" },
                  recent: { type: "number" },
                  byRole: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        _id: { type: "string" },
                        count: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "User not authenticated",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          403: {
            description: "User not authorized",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    UserControllerFastify.getUserStats
  );

  // Bulk update users (admin only)
  fastify.put(
    ROUTE_SEGMENTS.USERS.BULK_UPDATE,
    {
      schema: {
        tags: [ROUTE_TAGS.USERS],
        summary: "Bulk update users",
        description: "Update multiple users at once (admin only)",
        body: {
          type: "object",
          required: ["userIds", "updates"],
          properties: {
            userIds: {
              type: "array",
              items: { type: "string" },
              description: "Array of user IDs to update",
            },
            updates: {
              type: "object",
              properties: {
                role: {
                  type: "string",
                  enum: ["student", "instructor", "shala_owner", "admin"],
                },
                isActive: { type: "boolean" },
                isVerified: { type: "boolean" },
              },
              description: "Fields to update for all specified users",
            },
          },
        },
        response: {
          200: {
            description: "Users updated successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              modifiedCount: { type: "number" },
            },
          },
          400: {
            description: "Bad request",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          403: {
            description: "User not authorized",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    UserControllerFastify.bulkUpdateUsers
  );
};

export default userRoutes;

import { FastifyRequest, FastifyReply } from "fastify";
import User from "../models/User";
import { IUser as UserType } from "../models/User";

// Define request types
interface GetUserRequest {
  Params: {
    id: string;
  };
}

interface UpdateUserRequest {
  Params: {
    id: string;
  };
  Body: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    isActive?: boolean;
    isVerified?: boolean;
  };
}

interface DeleteUserRequest {
  Params: {
    id: string;
  };
}

interface ListUsersRequest {
  Querystring: {
    page?: string;
    limit?: string;
    role?: string;
    search?: string;
  };
}

export class UserControllerFastify {
  // Get all users (admin only)
  static async getAllUsers(
    request: FastifyRequest<ListUsersRequest>,
    reply: FastifyReply
  ) {
    try {
      const { page = "1", limit = "10", role, search } = request.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query: any = {};
      if (role) query.role = role;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Get users with pagination
      const users = await User.find(query)
        .select("-password")
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 });

      // Get total count
      const total = await User.countDocuments(query);

      reply.send({
        success: true,
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      request.log.error("Get all users error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while fetching users",
      });
    }
  }

  // Get user by ID
  static async getUserById(
    request: FastifyRequest<GetUserRequest>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;

      const user = await User.findById(id).select("-password");

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: "User not found",
        });
      }

      reply.send({
        success: true,
        user,
      });
    } catch (error) {
      request.log.error("Get user by ID error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while fetching user",
      });
    }
  }

  // Update user by ID (admin only)
  static async updateUserById(
    request: FastifyRequest<UpdateUserRequest>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const updateData = request.body;

      // Remove sensitive fields that shouldn't be updated directly
      delete updateData.email; // Email should be updated through a separate process

      const user = await User.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: "User not found",
        });
      }

      reply.send({
        success: true,
        message: "User updated successfully",
        user,
      });
    } catch (error) {
      request.log.error("Update user error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while updating user",
      });
    }
  }

  // Delete user by ID (admin only)
  static async deleteUserById(
    request: FastifyRequest<DeleteUserRequest>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;

      const user = await User.findByIdAndDelete(id);

      if (!user) {
        return reply.status(404).send({
          success: false,
          message: "User not found",
        });
      }

      reply.send({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      request.log.error("Delete user error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while deleting user",
      });
    }
  }

  // Get user statistics (admin only)
  static async getUserStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const totalUsers = await User.countDocuments();
      const verifiedUsers = await User.countDocuments({ isVerified: true });
      const activeUsers = await User.countDocuments({ isActive: true });

      // Get users by role
      const usersByRole = await User.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ]);

      // Get recent users (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentUsers = await User.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
      });

      reply.send({
        success: true,
        stats: {
          total: totalUsers,
          verified: verifiedUsers,
          active: activeUsers,
          recent: recentUsers,
          byRole: usersByRole,
        },
      });
    } catch (error) {
      request.log.error("Get user stats error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while fetching user statistics",
      });
    }
  }

  // Bulk update users (admin only)
  static async bulkUpdateUsers(
    request: FastifyRequest<{
      Body: {
        userIds: string[];
        updates: {
          role?: string;
          isActive?: boolean;
          isVerified?: boolean;
        };
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { userIds, updates } = request.body;

      if (!userIds || userIds.length === 0) {
        return reply.status(400).send({
          success: false,
          message: "No user IDs provided",
        });
      }

      const result = await User.updateMany({ _id: { $in: userIds } }, updates);

      reply.send({
        success: true,
        message: `Updated ${result.modifiedCount} users`,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      request.log.error("Bulk update users error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while bulk updating users",
      });
    }
  }
}

import User from "../../models/User";
import { IUser as UserType } from "../../models/User";

export interface UserQuery {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}

export interface UserUpdateData {
  name?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface UserResult {
  success: boolean;
  message: string;
  user?: any;
  users?: any[];
  pagination?: any;
}

export class UserService {
  // Get all users with pagination and filtering
  static async getAllUsers(query: UserQuery): Promise<UserResult> {
    try {
      const { page = 1, limit = 10, role, search } = query;
      const skip = (page - 1) * limit;

      // Build query
      const filterQuery: any = {};
      if (role) filterQuery.role = role;
      if (search) {
        filterQuery.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Get users with pagination
      const users = await User.find(filterQuery)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      // Get total count
      const total = await User.countDocuments(filterQuery);

      return {
        success: true,
        message: "Users retrieved successfully",
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get all users error:", error);
      return {
        success: false,
        message: "Server error while fetching users",
      };
    }
  }

  // Get user by ID
  static async getUserById(id: string): Promise<UserResult> {
    try {
      const user = await User.findById(id).select("-password");

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      return {
        success: true,
        message: "User retrieved successfully",
        user,
      };
    } catch (error) {
      console.error("Get user by ID error:", error);
      return {
        success: false,
        message: "Server error while fetching user",
      };
    }
  }

  // Update user by ID
  static async updateUserById(
    id: string,
    updateData: UserUpdateData
  ): Promise<UserResult> {
    try {
      // Remove sensitive fields that shouldn't be updated directly
      const safeUpdateData = { ...updateData };

      const user = await User.findByIdAndUpdate(id, safeUpdateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      return {
        success: true,
        message: "User updated successfully",
        user,
      };
    } catch (error) {
      console.error("Update user error:", error);
      return {
        success: false,
        message: "Server error while updating user",
      };
    }
  }

  // Delete user by ID
  static async deleteUserById(id: string): Promise<UserResult> {
    try {
      const user = await User.findByIdAndDelete(id);

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      return {
        success: true,
        message: "User deleted successfully",
      };
    } catch (error) {
      console.error("Delete user error:", error);
      return {
        success: false,
        message: "Server error while deleting user",
      };
    }
  }

  // Bulk update users
  static async bulkUpdateUsers(
    userIds: string[],
    updates: UserUpdateData
  ): Promise<UserResult> {
    try {
      if (!userIds || userIds.length === 0) {
        return {
          success: false,
          message: "No user IDs provided",
        };
      }

      const result = await User.updateMany({ _id: { $in: userIds } }, updates);

      return {
        success: true,
        message: `Updated ${result.modifiedCount} users`,
      };
    } catch (error) {
      console.error("Bulk update users error:", error);
      return {
        success: false,
        message: "Server error while bulk updating users",
      };
    }
  }

  // Find or create user (for OAuth)
  static async findOrCreateUser(
    email: string,
    name?: string
  ): Promise<UserType> {
    try {
      let user = await User.findOne({ email });

      if (!user) {
        user = new User({
          name: name || email.split("@")[0],
          email,
          password: "oauth_user",
          role: "student",
          isVerified: true,
          // Don't set preferredLocation unless coordinates are provided
        });

        await user.save();
      } else {
        // Update verification status
        user.isVerified = true;
        await user.save();
      }

      return user;
    } catch (error) {
      console.error("Find or create user error:", error);
      throw error;
    }
  }

  // Format user response
  static formatUserResponse(user: UserType): any {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}

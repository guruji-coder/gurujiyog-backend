import User from "../../models/User";
import { IUser as UserType } from "../../models/User";
import { TokenService } from "./tokenService";

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
  token?: string;
  user?: any;
}

export class AuthService {
  // Register new user
  static async register(data: RegisterData): Promise<AuthResult> {
    try {
      const { name, email, password, phone, role = "student" } = data;

      // Check if user exists
      const existingUser = (await User.findOne({ email })) as UserType | null;
      if (existingUser) {
        return {
          success: false,
          message: "User already exists with this email",
        };
      }

      // Create user
      const user = new User({
        name,
        email,
        password,
        phone,
        role,
      }) as UserType;

      await user.save();

      // Generate access token
      const token = TokenService.generateToken((user as any)._id.toString());

      return {
        success: true,
        message: "User registered successfully",
        token,
        user: {
          id: (user as any)._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        message: "Server error during registration",
      };
    }
  }

  // Login user
  static async login(data: LoginData): Promise<AuthResult> {
    try {
      const { email, password } = data;

      // Check if user exists
      const user = (await User.findOne({ email })) as UserType | null;
      if (!user || !user.isActive) {
        return {
          success: false,
          message: "Invalid credentials",
        };
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return {
          success: false,
          message: "Invalid credentials",
        };
      }

      // Generate token
      const token = TokenService.generateToken((user as any)._id.toString());

      return {
        success: true,
        message: "Login successful",
        token,
        user: {
          id: (user as any)._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: "Server error during login",
      };
    }
  }

  // Get user profile
  static async getProfile(userId: string): Promise<AuthResult> {
    try {
      const user = (await User.findById(userId).select(
        "-password"
      )) as UserType | null;

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      return {
        success: true,
        message: "Profile retrieved successfully",
        user,
      };
    } catch (error) {
      console.error("Get profile error:", error);
      return {
        success: false,
        message: "Server error while fetching profile",
      };
    }
  }

  // Update user profile
  static async updateProfile(
    userId: string,
    updateData: any
  ): Promise<AuthResult> {
    try {
      const { name, phone, role, experience, preferredStyles, maxDistance } =
        updateData;
      const dataToUpdate: any = {};

      if (name) dataToUpdate.name = name;
      if (phone) dataToUpdate.phone = phone;
      if (role) dataToUpdate.role = role;
      if (experience) dataToUpdate.experience = experience;
      if (preferredStyles) dataToUpdate.preferredStyles = preferredStyles;
      if (maxDistance) dataToUpdate.maxDistance = maxDistance;

      // Add updatedAt timestamp
      dataToUpdate.updatedAt = Date.now();

      const user = (await User.findByIdAndUpdate(userId, dataToUpdate, {
        new: true,
        runValidators: true,
      }).select("-password")) as UserType | null;

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      return {
        success: true,
        message: "Profile updated successfully",
        user,
      };
    } catch (error) {
      console.error("Update profile error:", error);
      return {
        success: false,
        message: "Server error while updating profile",
      };
    }
  }
}

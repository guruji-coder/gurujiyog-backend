import { FastifyRequest, FastifyReply } from "fastify";
import User from "../models/User";
import { IUser as UserType } from "../models/User";
import OTP from "../models/OTP";
import { IOTP } from "../models/OTP";
import { sendOTPEmail, generateOTP } from "../utils/emailService";
import jwt, { Secret, SignOptions, Algorithm } from "jsonwebtoken";
import { OTPService } from "../services/auth/otpService";
import { AuthService } from "../services/auth/authService";
import { TokenService } from "../services/auth/tokenService";
import { OTPValidationService } from "../services/auth/otpValidationService";
import { UserService } from "../services/user/userService";
import bcrypt from "bcrypt";

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

interface ProfileRequest {
  Body: {
    name?: string;
    phone?: string;
    role?: string;
  };
}

// Helper function to get device info and IP
function getDeviceInfo(request: FastifyRequest): {
  deviceInfo: string;
  ipAddress: string;
  userAgent?: string;
} {
  const userAgent = request.headers["user-agent"] || "Unknown";
  const ipAddress = (
    request.ip ||
    request.socket.remoteAddress ||
    "unknown"
  ).replace("::ffff:", "");

  // Simple device detection
  let deviceInfo = "Unknown Device";
  if (userAgent.includes("Mobile")) deviceInfo = "Mobile Device";
  else if (userAgent.includes("Chrome")) deviceInfo = "Chrome Browser";
  else if (userAgent.includes("Firefox")) deviceInfo = "Firefox Browser";
  else if (userAgent.includes("Safari")) deviceInfo = "Safari Browser";

  return { deviceInfo, ipAddress, userAgent };
}

// Helper function to set auth cookies and return tokens
async function setAuthResponse(
  reply: FastifyReply,
  request: FastifyRequest,
  userId: string,
  user: any
): Promise<{ accessToken: string; user: any }> {
  // Generate tokens
  const accessToken = TokenService.generateAccessToken(userId);
  const refreshToken = TokenService.generateRefreshToken(userId);

  // Get device info
  const { deviceInfo, ipAddress, userAgent } = getDeviceInfo(request);

  // Create session in database
  await TokenService.createSession(
    userId,
    refreshToken,
    {
      userId,
      deviceInfo,
      ipAddress,
      userAgent,
    }
  );

  // Set refresh token in HTTP-only cookie
  reply.setCookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });

  return { accessToken, user };
}

export class AuthControllerFastify {
  // Register new user
  static async register(
    request: FastifyRequest<RegisterRequest>,
    reply: FastifyReply
  ) {
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

      // Set auth cookies and return access token
      const authResponse = await setAuthResponse(
        reply,
        request,
        result.user!.id,
        result.user
      );

      reply.status(201).send({
        success: true,
        message: result.message,
        accessToken: authResponse.accessToken,
        user: authResponse.user,
      });
    } catch (error) {
      request.log.error("Registration error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error during registration",
      });
    }
  }

  // Login with email and password
  static async login(
    request: FastifyRequest<LoginRequest>,
    reply: FastifyReply
  ) {
    try {
      const { email, password } = request.body;

      // Use the auth service
      const result = await AuthService.login({ email, password });

      if (!result.success) {
        return reply.status(401).send({
          success: false,
          message: result.message,
        });
      }

      // Set auth cookies and return access token
      const authResponse = await setAuthResponse(
        reply,
        request,
        result.user!.id,
        result.user
      );

      reply.send({
        success: true,
        message: result.message,
        accessToken: authResponse.accessToken,
        user: authResponse.user,
      });
    } catch (error) {
      request.log.error("Login error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error during login",
      });
    }
  }

  // Send OTP to email
  static async sendOTP(
    request: FastifyRequest<SendOTPRequest>,
    reply: FastifyReply
  ) {
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
      request.log.error("Send OTP error:", error);
      reply.status(500).send({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }
  }

  // Verify OTP and login/register
  static async verifyOTP(
    request: FastifyRequest<VerifyOTPRequest>,
    reply: FastifyReply
  ) {
    try {
      const { email, otp: otpCode, name } = request.body;

      // Validate OTP using the validation service
      const validationResult =
        await OTPValidationService.validateOTPForVerification(email, otpCode);

      if (!validationResult.isValid) {
        return reply.status(400).send({
          success: false,
          message: validationResult.message,
        });
      }

      // Mark OTP as verified but don't save it yet - we need password first
      const otpRecord = validationResult.otpRecord!;
      otpRecord.verified = true;
      await otpRecord.save();

      // Check if user already exists
      let user = await User.findOne({ email });

      if (user) {
        // Existing user - complete login
        user.isVerified = true;
        await user.save();

        // Set auth cookies and return access token
        const authResponse = await setAuthResponse(
          reply,
          request,
          (user as any)._id.toString(),
          UserService.formatUserResponse(user)
        );

        // Clean up OTP
        await OTP.deleteMany({ email });

        return reply.send({
          success: true,
          message: "Login successful",
          accessToken: authResponse.accessToken,
          user: authResponse.user,
          requiresPassword: false,
        });
      }

      // New user - requires password
      return reply.send({
        success: true,
        message: "OTP verified. Please set your password.",
        requiresPassword: true,
        email,
        name: name || email.split("@")[0],
      });
    } catch (error) {
      request.log.error("Verify OTP error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error during OTP verification",
      });
    }
  }

  // Set password after OTP verification for new users
  static async setPasswordAfterOTP(
    request: FastifyRequest<{
      Body: {
        email: string;
        password: string;
        name?: string;
      };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { email, password, name } = request.body;

      // Validate that there's a verified OTP for this email
      const verifiedOTP = await OTP.findOne({
        email,
        verified: true,
        expiresAt: { $gt: new Date() },
      });

      if (!verifiedOTP) {
        return reply.status(400).send({
          success: false,
          message: "No verified OTP found. Please verify OTP first.",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return reply.status(400).send({
          success: false,
          message: "User already exists",
        });
      }

      // Validate password strength
      if (password.length < 6) {
        return reply.status(400).send({
          success: false,
          message: "Password must be at least 6 characters long",
        });
      }

      // Create new user with password
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = new User({
        name: name || email.split("@")[0],
        email,
        password: hashedPassword,
        role: "student",
        isVerified: true,
      });

      await user.save();

      // Set auth cookies and return access token
      const authResponse = await setAuthResponse(
        reply,
        request,
        (user as any)._id.toString(),
        UserService.formatUserResponse(user)
      );

      // Clean up OTP
      await OTP.deleteMany({ email });

      reply.send({
        success: true,
        message: "Account created successfully",
        accessToken: authResponse.accessToken,
        user: authResponse.user,
      });
    } catch (error) {
      request.log.error("Set password error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error during password setup",
      });
    }
  }

  // Refresh access token using refresh token
  static async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      const refreshToken = request.cookies.refreshToken;

      if (!refreshToken) {
        return reply.status(401).send({
          success: false,
          message: "No refresh token provided",
        });
      }

      // Validate session and refresh token
      const sessionResult = await TokenService.validateSession(refreshToken);
      if (!sessionResult) {
        return reply.status(401).send({
          success: false,
          message: "Invalid or expired refresh token",
        });
      }

      // Generate new access token
      const accessToken = TokenService.generateAccessToken(
        sessionResult.userId
      );

      reply.send({
        success: true,
        accessToken,
      });
    } catch (error) {
      request.log.error("Refresh token error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error during token refresh",
      });
    }
  }

  // Logout user
  static async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const refreshToken = request.cookies.refreshToken;

      if (refreshToken) {
        // Revoke the session
        await TokenService.revokeSession(refreshToken);
      }

      // Clear refresh token cookie
      reply.clearCookie("refreshToken", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      reply.send({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      request.log.error("Logout error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error during logout",
      });
    }
  }

  // Get current user profile
  static async getProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: "User not authenticated",
        });
      }

      const user = await User.findById(userId).select("-password");
      if (!user) {
        return reply.status(404).send({
          success: false,
          message: "User not found",
        });
      }

      reply.send({
        success: true,
        user: UserService.formatUserResponse(user),
      });
    } catch (error) {
      request.log.error("Get profile error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while fetching profile",
      });
    }
  }

  // Update current user profile
  static async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: "User not authenticated",
        });
      }

      const { name, phone, role } = request.body as {
        name: string;
        phone: string;
        role: string;
      };

      const user = await User.findById(userId);
      if (!user) {
        return reply.status(404).send({
          success: false,
          message: "User not found",
        });
      }

      // Update fields if provided
      if (name) user.name = name;
      if (phone) user.phone = phone;
      const validRoles = [
        "student",
        "instructor",
        "shala_owner",
        "admin",
      ] as const;
      if (role && validRoles.includes(role as (typeof validRoles)[number]))
        user.role = role as (typeof validRoles)[number];

      await user.save();

      reply.send({
        success: true,
        message: "Profile updated successfully",
        user: UserService.formatUserResponse(user),
      });
    } catch (error) {
      request.log.error("Update profile error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while updating profile",
      });
    }
  }
}

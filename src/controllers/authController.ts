import { Request, Response } from "express";
import { validationResult } from "express-validator";
import User from "../models/User";
import { IUser as UserType } from "../models/User";
import OTP from "../models/OTP";
import { IOTP } from "../models/OTP";
import { sendOTPEmail, generateOTP } from "../utils/emailService";
import jwt, { Secret, SignOptions, Algorithm } from "jsonwebtoken";

// Generate JWT token
const generateToken = (userId: string, expiresIn?: number): string => {
  const secret: Secret = process.env.JWT_SECRET || "fallback-secret";
  const options: SignOptions = {
    expiresIn: expiresIn || 15 * 60, // Default 15 minutes for access tokens
    algorithm: "HS256" as Algorithm,
  };
  return jwt.sign({ userId }, secret, options);
};

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone, role = "student" } = req.body;

      // Check if user exists
      const existingUser = (await User.findOne({ email })) as UserType;
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists with this email",
        });
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
      const accessToken = generateToken(
        (user as unknown as { _id: { toString(): string } })._id.toString()
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        token: accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during registration",
      });
    }
  }

  // Login user
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Check if user exists
      const user = (await User.findOne({ email })) as UserType;
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Generate token
      const token = generateToken(
        (user as unknown as { _id: { toString(): string } })._id.toString()
      );

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during login",
      });
    }
  }

  // Send OTP to email
  static async sendOTP(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { email } = req.body;

      // Delete any existing OTPs for this email
      await OTP.deleteMany({ email });

      // Generate new OTP
      const otpCode = generateOTP();

      // Save OTP to database
      const otp = new OTP({
        email,
        otp: otpCode,
      });

      await otp.save();

      // Send OTP email
      await sendOTPEmail(email, otpCode);

      res.json({
        success: true,
        message: "OTP sent to your email",
      });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }
  }

  // Verify OTP and login/register
  static async verifyOTP(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { email, otp: otpCode, name } = req.body;

      // Debug: Check all OTP records for this email
      const allOtpRecords = await OTP.find({ email });
      console.log("All OTP records for email:", allOtpRecords);

      // Check with case-insensitive email
      const allOtpRecordsCaseInsensitive = await OTP.find({
        email: { $regex: new RegExp(`^${email}$`, "i") },
      });
      console.log(
        "All OTP records (case insensitive):",
        allOtpRecordsCaseInsensitive
      );

      // Check each condition separately for debugging
      const byEmail = await OTP.findOne({ email });
      console.log("By email only:", byEmail);

      const byOtp = await OTP.findOne({ otp: otpCode });
      console.log("By OTP only:", byOtp);

      const byVerified = await OTP.findOne({ email, verified: false });
      console.log("By email and not verified:", byVerified);

      const byExpiry = await OTP.findOne({
        email,
        expiresAt: { $gt: new Date() },
      });
      console.log("By email and not expired:", byExpiry);

      // Find OTP record
      const otpRecord = (await OTP.findOne({
        email,
        otp: otpCode,
        verified: false,
        expiresAt: { $gt: new Date() },
      })) as IOTP;

      console.log("Specific OTP record found:", otpRecord);
      console.log("Query params:", {
        email,
        otpCode,
        otpCodeType: typeof otpCode,
        currentTime: new Date(),
      });

      if (!otpRecord) {
        // Check if there's an OTP record to increment attempts
        const existingOtp = await OTP.findOne({ email, verified: false });
        if (existingOtp) {
          existingOtp.attempts += 1;
          if (existingOtp.attempts >= 3) {
            await OTP.deleteOne({ _id: existingOtp._id });
            return res.status(400).json({
              success: false,
              message: "Too many failed attempts. Please request a new OTP.",
            });
          }
          await existingOtp.save();
        }

        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP",
        });
      }

      // Mark OTP as verified
      otpRecord.verified = true;
      await otpRecord.save();

      // Check if user exists
      let user = (await User.findOne({ email })) as UserType;

      if (!user) {
        // Create new user
        user = new User({
          name: name || email.split("@")[0],
          email,
          password: "oauth_user", // Placeholder for OAuth users
          role: "student",
          isVerified: true,
        }) as UserType;

        await user.save();
      } else {
        // Update verification status
        user.isVerified = true;
        await user.save();
      }

      // Generate token
      const token = generateToken(
        (user as unknown as { _id: { toString(): string } })._id.toString()
      );

      // Clean up OTP
      await OTP.deleteMany({ email });

      res.json({
        success: true,
        message: user ? "Login successful" : "Account created and logged in",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      });
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during OTP verification",
      });
    }
  }

  // Logout user
  static async logout(req: Request, res: Response) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // by removing the token. Server-side, we could implement a blacklist
      // for additional security if needed.

      res.json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during logout",
      });
    }
  }

  // Get current user profile
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const user = await User.findById(userId).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching profile",
      });
    }
  }

  // Update user profile
  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const { name, phone, role } = req.body;
      const updateData: any = {};

      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (role) updateData.role = role;

      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      }).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "Profile updated successfully",
        user,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating profile",
      });
    }
  }
}

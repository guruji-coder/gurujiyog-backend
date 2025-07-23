import OTP from "../../models/OTP";
import { IOTP } from "../../models/OTP";
import User from "../../models/User";
import { IUser as UserType } from "../../models/User";
import { sendOTPEmail, generateOTP } from "../../utils/emailService";
import { TokenService } from "./tokenService";
import { OTPValidationService } from "./otpValidationService";
import { OTPManagementService } from "./otpManagementService";
import { UserService } from "../user/userService";

export interface OTPVerificationData {
  email: string;
  otp: string;
  name?: string;
}

export interface OTPResult {
  success: boolean;
  message: string;
  token?: string;
  user?: any;
}

export class OTPService {
  // Send OTP to email
  static async sendOTP(email: string): Promise<OTPResult> {
    try {
      // Delete any existing OTPs for this email
      await OTP.deleteMany({ email });

      // Generate new OTP
      const otpCode = generateOTP();

      // Save OTP to database
      const otp = new OTP({
        email,
        otp: "123456",
        type: "email", // Add the required type field
      });

      await otp.save();

      // Send OTP email
      await sendOTPEmail(email, "123456");

      return {
        success: true,
        message: "OTP sent to your email",
      };
    } catch (error) {
      console.error("Send OTP error:", error);
      return {
        success: false,
        message: "Failed to send OTP. Please try again.",
      };
    }
  }

  // Verify OTP and login/register
  static async verifyOTP(data: OTPVerificationData): Promise<OTPResult> {
    try {
      const { email, otp: otpCode, name } = data;

      // Validate OTP using the validation service
      const validationResult =
        await OTPValidationService.validateOTPForVerification(email, otpCode);

      if (!validationResult.isValid) {
        return {
          success: false,
          message: validationResult.message,
        };
      }

      // Mark OTP as verified
      if (validationResult.otpRecord) {
        validationResult.otpRecord.verified = true;
        await validationResult.otpRecord.save();
      }

      // Find or create user using UserService
      const user = await UserService.findOrCreateUser(email, name);

      // Generate access token
      const accessToken = TokenService.generateToken(
        (user as any)._id.toString()
      );

      // Clean up OTP
      await OTP.deleteMany({ email });

      return {
        success: true,
        message: "Login successful",
        token: accessToken,
        user: UserService.formatUserResponse(user),
      };
    } catch (error) {
      console.error("Verify OTP error:", error);
      return {
        success: false,
        message: "Server error during OTP verification",
      };
    }
  }

  // Clean up expired OTPs
  static async cleanupExpiredOTPs(): Promise<void> {
    try {
      const result = await OTPManagementService.cleanupExpiredOTPs();
      if (!result.success) {
        console.error("OTP cleanup failed:", result.message);
      }
    } catch (error) {
      console.error("Cleanup expired OTPs error:", error);
    }
  }

  // Get OTP statistics
  static async getOTPStats(): Promise<any> {
    try {
      const result = await OTPManagementService.getOTPStats();
      return result.success ? result.stats : null;
    } catch (error) {
      console.error("Get OTP stats error:", error);
      return null;
    }
  }
}

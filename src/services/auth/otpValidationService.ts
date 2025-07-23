import OTP from "../../models/OTP";
import { ValidationService } from "../common/validationService";

export interface OTPValidationResult {
  isValid: boolean;
  message: string;
  otpRecord?: any;
}

export class OTPValidationService {
  // Validate OTP format
  static validateOTPFormat(otp: string): OTPValidationResult {
    const validation = ValidationService.validateOTP(otp);

    if (!validation.isValid) {
      return {
        isValid: false,
        message: validation.errors?.join(", ") || "Invalid OTP format",
      };
    }

    return {
      isValid: true,
      message: "OTP format is valid",
    };
  }

  // Validate email format
  static validateEmailFormat(email: string): OTPValidationResult {
    const validation = ValidationService.validateEmail(email);

    if (!validation.isValid) {
      return {
        isValid: false,
        message: validation.errors?.join(", ") || "Invalid email format",
      };
    }

    return {
      isValid: true,
      message: "Email format is valid",
    };
  }

  // Check if OTP exists and is valid
  static async validateOTPRecord(
    email: string,
    otp: string
  ): Promise<OTPValidationResult> {
    try {
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

      const byOtp = await OTP.findOne({ otp });
      console.log("By OTP only:", byOtp);

      const byVerified = await OTP.findOne({ email, verified: false });
      console.log("By email and not verified:", byVerified);

      const byExpiry = await OTP.findOne({
        email,
        expiresAt: { $gt: new Date() },
      });
      console.log("By email and not expired:", byExpiry);

      // Find OTP record with all conditions
      const otpRecord = await OTP.findOne({
        email,
        otp,
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      console.log("Specific OTP record found:", otpRecord);
      console.log("Query params:", {
        email,
        otp,
        otpType: typeof otp,
        currentTime: new Date(),
      });

      if (!otpRecord) {
        return {
          isValid: false,
          message: "Invalid or expired OTP",
        };
      }

      return {
        isValid: true,
        message: "OTP is valid",
        otpRecord,
      };
    } catch (error) {
      console.error("OTP validation error:", error);
      return {
        isValid: false,
        message: "Error validating OTP",
      };
    }
  }

  // Check OTP attempts
  static async checkOTPAttempts(email: string): Promise<OTPValidationResult> {
    try {
      const existingOtp = await OTP.findOne({ email, verified: false });

      if (existingOtp && existingOtp.attempts >= 3) {
        // Delete OTP if too many attempts
        await OTP.deleteOne({ _id: existingOtp._id });
        return {
          isValid: false,
          message: "Too many failed attempts. Please request a new OTP.",
        };
      }

      return {
        isValid: true,
        message: "OTP attempts are within limit",
      };
    } catch (error) {
      console.error("Check OTP attempts error:", error);
      return {
        isValid: false,
        message: "Error checking OTP attempts",
      };
    }
  }

  // Increment OTP attempts
  static async incrementOTPAttempts(email: string): Promise<void> {
    try {
      const existingOtp = await OTP.findOne({ email, verified: false });
      if (existingOtp) {
        existingOtp.attempts += 1;
        await existingOtp.save();
      }
    } catch (error) {
      console.error("Increment OTP attempts error:", error);
    }
  }

  // Validate OTP for verification
  static async validateOTPForVerification(
    email: string,
    otp: string
  ): Promise<OTPValidationResult> {
    try {
      // First validate format
      const formatValidation = this.validateOTPFormat(otp);
      if (!formatValidation.isValid) {
        return formatValidation;
      }

      // Check attempts
      const attemptsValidation = await this.checkOTPAttempts(email);
      if (!attemptsValidation.isValid) {
        return attemptsValidation;
      }

      // Validate OTP record
      const recordValidation = await this.validateOTPRecord(email, otp);
      if (!recordValidation.isValid) {
        // Increment attempts on failure
        await this.incrementOTPAttempts(email);
        return recordValidation;
      }

      return recordValidation;
    } catch (error) {
      console.error("OTP verification validation error:", error);
      return {
        isValid: false,
        message: "Error validating OTP for verification",
      };
    }
  }
}

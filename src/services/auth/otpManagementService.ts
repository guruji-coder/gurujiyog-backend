import OTP from "../../models/OTP";

export interface OTPStats {
  total: number;
  verified: number;
  expired: number;
  pending: number;
  byEmail: Array<{ _id: string; count: number }>;
}

export interface OTPManagementResult {
  success: boolean;
  message: string;
  stats?: OTPStats;
  data?: any;
}

export class OTPManagementService {
  // Clean up expired OTPs
  static async cleanupExpiredOTPs(): Promise<OTPManagementResult> {
    try {
      const result = await OTP.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      return {
        success: true,
        message: `Cleaned up ${result.deletedCount} expired OTPs`,
        data: { deletedCount: result.deletedCount },
      };
    } catch (error) {
      console.error("Cleanup expired OTPs error:", error);
      return {
        success: false,
        message: "Failed to cleanup expired OTPs",
      };
    }
  }

  // Get comprehensive OTP statistics
  static async getOTPStats(): Promise<OTPManagementResult> {
    try {
      const totalOTPs = await OTP.countDocuments();
      const verifiedOTPs = await OTP.countDocuments({ verified: true });
      const expiredOTPs = await OTP.countDocuments({
        expiresAt: { $lt: new Date() },
      });
      const pendingOTPs = await OTP.countDocuments({
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      // Get OTPs by email
      const otpsByEmail = await OTP.aggregate([
        {
          $group: {
            _id: "$email",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      const stats: OTPStats = {
        total: totalOTPs,
        verified: verifiedOTPs,
        expired: expiredOTPs,
        pending: pendingOTPs,
        byEmail: otpsByEmail,
      };

      return {
        success: true,
        message: "OTP statistics retrieved successfully",
        stats,
      };
    } catch (error) {
      console.error("Get OTP stats error:", error);
      return {
        success: false,
        message: "Failed to retrieve OTP statistics",
      };
    }
  }

  // Get OTPs for a specific email
  static async getOTPsByEmail(email: string): Promise<OTPManagementResult> {
    try {
      const otps = await OTP.find({ email }).sort({ createdAt: -1 });

      return {
        success: true,
        message: `Found ${otps.length} OTPs for ${email}`,
        data: { otps },
      };
    } catch (error) {
      console.error("Get OTPs by email error:", error);
      return {
        success: false,
        message: "Failed to retrieve OTPs for email",
      };
    }
  }

  // Delete all OTPs for an email
  static async deleteOTPsByEmail(email: string): Promise<OTPManagementResult> {
    try {
      const result = await OTP.deleteMany({ email });

      return {
        success: true,
        message: `Deleted ${result.deletedCount} OTPs for ${email}`,
        data: { deletedCount: result.deletedCount },
      };
    } catch (error) {
      console.error("Delete OTPs by email error:", error);
      return {
        success: false,
        message: "Failed to delete OTPs for email",
      };
    }
  }

  // Reset OTP attempts for an email
  static async resetOTPAttempts(email: string): Promise<OTPManagementResult> {
    try {
      const result = await OTP.updateMany(
        { email, verified: false },
        { $set: { attempts: 0 } }
      );

      return {
        success: true,
        message: `Reset attempts for ${result.modifiedCount} OTPs`,
        data: { modifiedCount: result.modifiedCount },
      };
    } catch (error) {
      console.error("Reset OTP attempts error:", error);
      return {
        success: false,
        message: "Failed to reset OTP attempts",
      };
    }
  }

  // Get OTP activity over time
  static async getOTPActivity(days: number = 7): Promise<OTPManagementResult> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activityData = await OTP.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            count: { $sum: 1 },
            verified: {
              $sum: { $cond: ["$verified", 1, 0] },
            },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      return {
        success: true,
        message: "OTP activity data retrieved successfully",
        data: { activityData },
      };
    } catch (error) {
      console.error("Get OTP activity error:", error);
      return {
        success: false,
        message: "Failed to retrieve OTP activity data",
      };
    }
  }

  // Force expire OTPs for an email
  static async forceExpireOTPs(email: string): Promise<OTPManagementResult> {
    try {
      const result = await OTP.updateMany(
        { email, verified: false },
        { $set: { expiresAt: new Date() } }
      );

      return {
        success: true,
        message: `Force expired ${result.modifiedCount} OTPs for ${email}`,
        data: { modifiedCount: result.modifiedCount },
      };
    } catch (error) {
      console.error("Force expire OTPs error:", error);
      return {
        success: false,
        message: "Failed to force expire OTPs",
      };
    }
  }

  // Get OTP performance metrics
  static async getOTPPerformanceMetrics(): Promise<OTPManagementResult> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // OTPs created in different time periods
      const otpsLast24Hours = await OTP.countDocuments({
        createdAt: { $gte: oneDayAgo },
      });

      const otpsLast7Days = await OTP.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
      });

      // Verification rate
      const totalOTPs = await OTP.countDocuments();
      const verifiedOTPs = await OTP.countDocuments({ verified: true });
      const verificationRate =
        totalOTPs > 0 ? (verifiedOTPs / totalOTPs) * 100 : 0;

      // Average attempts
      const avgAttempts = await OTP.aggregate([
        {
          $group: {
            _id: null,
            avgAttempts: { $avg: "$attempts" },
          },
        },
      ]);

      return {
        success: true,
        message: "OTP performance metrics retrieved successfully",
        data: {
          last24Hours: otpsLast24Hours,
          last7Days: otpsLast7Days,
          verificationRate: Math.round(verificationRate * 100) / 100,
          totalOTPs,
          verifiedOTPs,
          avgAttempts: avgAttempts[0]?.avgAttempts || 0,
        },
      };
    } catch (error) {
      console.error("Get OTP performance metrics error:", error);
      return {
        success: false,
        message: "Failed to retrieve OTP performance metrics",
      };
    }
  }
}

import User from "../../models/User";

export interface UserStats {
  total: number;
  verified: number;
  active: number;
  recent: number;
  byRole: Array<{ _id: string; count: number }>;
}

export interface UserStatsResult {
  success: boolean;
  message: string;
  stats?: UserStats;
}

export class UserStatsService {
  // Get comprehensive user statistics
  static async getUserStats(): Promise<UserStatsResult> {
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

      const stats: UserStats = {
        total: totalUsers,
        verified: verifiedUsers,
        active: activeUsers,
        recent: recentUsers,
        byRole: usersByRole,
      };

      return {
        success: true,
        message: "User statistics retrieved successfully",
        stats,
      };
    } catch (error) {
      console.error("Get user stats error:", error);
      return {
        success: false,
        message: "Server error while fetching user statistics",
      };
    }
  }

  // Get user growth over time
  static async getUserGrowth(days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const growthData = await User.aggregate([
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
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      return {
        success: true,
        message: "User growth data retrieved successfully",
        growthData,
      };
    } catch (error) {
      console.error("Get user growth error:", error);
      return {
        success: false,
        message: "Server error while fetching user growth data",
      };
    }
  }

  // Get user activity statistics
  static async getUserActivityStats(): Promise<any> {
    try {
      // Users by verification status
      const verificationStats = await User.aggregate([
        {
          $group: {
            _id: "$isVerified",
            count: { $sum: 1 },
          },
        },
      ]);

      // Users by activity status
      const activityStats = await User.aggregate([
        {
          $group: {
            _id: "$isActive",
            count: { $sum: 1 },
          },
        },
      ]);

      // Users by role
      const roleStats = await User.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ]);

      return {
        success: true,
        message: "User activity statistics retrieved successfully",
        stats: {
          verification: verificationStats,
          activity: activityStats,
          roles: roleStats,
        },
      };
    } catch (error) {
      console.error("Get user activity stats error:", error);
      return {
        success: false,
        message: "Server error while fetching user activity statistics",
      };
    }
  }

  // Get user engagement metrics
  static async getUserEngagementMetrics(): Promise<any> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // New users in different time periods
      const newUsers30Days = await User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      });

      const newUsers7Days = await User.countDocuments({
        createdAt: { $gte: sevenDaysAgo },
      });

      const newUsers1Day = await User.countDocuments({
        createdAt: { $gte: oneDayAgo },
      });

      // Verified users percentage
      const totalUsers = await User.countDocuments();
      const verifiedUsers = await User.countDocuments({ isVerified: true });
      const verificationRate =
        totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0;

      return {
        success: true,
        message: "User engagement metrics retrieved successfully",
        metrics: {
          newUsers: {
            last30Days: newUsers30Days,
            last7Days: newUsers7Days,
            last24Hours: newUsers1Day,
          },
          verificationRate: Math.round(verificationRate * 100) / 100,
          totalUsers,
          verifiedUsers,
        },
      };
    } catch (error) {
      console.error("Get user engagement metrics error:", error);
      return {
        success: false,
        message: "Server error while fetching user engagement metrics",
      };
    }
  }
}

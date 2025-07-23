import User from "../../models/User";
import { IUser as UserType } from "../../models/User";
import { TokenService } from "./tokenService";

export interface OAuthProfile {
  id: string;
  name: string;
  email: string;
}

export interface OAuthResult {
  success: boolean;
  message: string;
  token?: string;
  user?: any;
}

export class OAuthService {
  // Handle OAuth user creation/update
  static async handleOAuthUser(
    profile: OAuthProfile,
    provider: "google" | "facebook"
  ): Promise<UserType> {
    try {
      const { id, name, email } = profile;

      // Check if user exists
      let user = await User.findOne({
        $or: [{ [`${provider}Id`]: id }, { email }],
      });

      if (user) {
        // Update provider ID if not set
        if (!user[`${provider}Id`]) {
          user[`${provider}Id`] = id;
          user.isVerified = true;
          await user.save();
        }
      } else {
        // Create new user
        user = new User({
          [`${provider}Id`]: id,
          name,
          email,
          password: "oauth_user", // Placeholder for OAuth users
          role: "student",
          isVerified: true,
        });

        await user.save();
      }

      return user;
    } catch (error) {
      console.error(`OAuth user handling error (${provider}):`, error);
      throw error;
    }
  }

  // Process Google OAuth
  static async processGoogleOAuth(accessToken: string): Promise<OAuthResult> {
    try {
      // Get user info from Google
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const googleUser = (await response.json()) as OAuthProfile;

      // Handle OAuth user
      const user = await this.handleOAuthUser(googleUser, "google");

      // Generate token
      const authToken = TokenService.generateToken(user._id.toString());

      return {
        success: true,
        message: "Google OAuth successful",
        token: authToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      };
    } catch (error) {
      console.error("Google OAuth error:", error);
      return {
        success: false,
        message: "Google OAuth failed",
      };
    }
  }

  // Process Facebook OAuth
  static async processFacebookOAuth(accessToken: string): Promise<OAuthResult> {
    try {
      // Get user info from Facebook
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
      );
      const facebookUser = (await response.json()) as OAuthProfile;

      // Handle OAuth user
      const user = await this.handleOAuthUser(facebookUser, "facebook");

      // Generate token
      const authToken = TokenService.generateToken(user._id.toString());

      return {
        success: true,
        message: "Facebook OAuth successful",
        token: authToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      };
    } catch (error) {
      console.error("Facebook OAuth error:", error);
      return {
        success: false,
        message: "Facebook OAuth failed",
      };
    }
  }

  // Link OAuth account to existing user
  static async linkOAuthAccount(
    userId: string,
    profile: OAuthProfile,
    provider: "google" | "facebook"
  ): Promise<OAuthResult> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Check if OAuth account is already linked to another user
      const existingUser = await User.findOne({
        [`${provider}Id`]: profile.id,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return {
          success: false,
          message: `${provider} account is already linked to another user`,
        };
      }

      // Link OAuth account
      user[`${provider}Id`] = profile.id;
      user.isVerified = true;
      await user.save();

      return {
        success: true,
        message: `${provider} account linked successfully`,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      };
    } catch (error) {
      console.error(`Link OAuth account error (${provider}):`, error);
      return {
        success: false,
        message: "Failed to link OAuth account",
      };
    }
  }

  // Unlink OAuth account
  static async unlinkOAuthAccount(
    userId: string,
    provider: "google" | "facebook"
  ): Promise<OAuthResult> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      // Unlink OAuth account
      user[`${provider}Id`] = undefined;
      await user.save();

      return {
        success: true,
        message: `${provider} account unlinked successfully`,
      };
    } catch (error) {
      console.error(`Unlink OAuth account error (${provider}):`, error);
      return {
        success: false,
        message: "Failed to unlink OAuth account",
      };
    }
  }
}

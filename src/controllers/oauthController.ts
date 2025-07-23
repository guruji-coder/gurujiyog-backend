import { Request, Response } from "express";
import User from "../models/User";
import { IUser as UserType } from "../models/User";
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

export class OAuthController {
  // Google OAuth callback
  static async googleCallback(req: Request, res: Response) {
    try {
      const user = req.user as UserType;

      if (!user) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=oauth_failed`
        );
      }

      const token = generateToken(
        (user as unknown as { _id: { toString(): string } })._id.toString()
      );

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
    } catch (error) {
      console.error("Google OAuth callback error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }

  // Facebook OAuth callback
  static async facebookCallback(req: Request, res: Response) {
    try {
      const user = req.user as UserType;

      if (!user) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/login?error=oauth_failed`
        );
      }

      const token = generateToken(
        (user as unknown as { _id: { toString(): string } })._id.toString()
      );

      // Redirect to frontend with token
      res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
    } catch (error) {
      console.error("Facebook OAuth callback error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }

  // Handle OAuth user creation/update
  static async handleOAuthUser(profile: any, provider: "google" | "facebook") {
    try {
      const { id, name, email } = profile;

      // Check if user exists
      let user = (await User.findOne({
        $or: [{ [`${provider}Id`]: id }, { email }],
      })) as UserType;

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
        }) as UserType;

        await user.save();
      }

      return user;
    } catch (error) {
      console.error(`OAuth user handling error (${provider}):`, error);
      throw error;
    }
  }
}

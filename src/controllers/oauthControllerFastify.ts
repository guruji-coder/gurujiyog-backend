import { FastifyRequest, FastifyReply } from "fastify";
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

export class OAuthControllerFastify {
  // Google OAuth callback
  static async googleCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const googleOAuth2 = (request.server as any).googleOAuth2;
      const { token } =
        await googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      // Get user info from Google
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        }
      );

      const googleUser = (await response.json()) as {
        id: string;
        name: string;
        email: string;
      };

      // Handle OAuth user
      const user = await OAuthControllerFastify.handleOAuthUser(
        googleUser,
        "google"
      );

      // Generate token
      const authToken = generateToken(
        (user as unknown as { _id: { toString(): string } })._id.toString()
      );

      // Redirect to frontend with token
      reply.redirect(
        `${process.env.FRONTEND_URL}/auth/success?token=${authToken}`
      );
    } catch (error) {
      request.log.error("Google OAuth callback error:", error);
      reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }

  // Facebook OAuth callback
  static async facebookCallback(request: FastifyRequest, reply: FastifyReply) {
    try {
      const facebookOAuth2 = (request.server as any).facebookOAuth2;
      const { token } =
        await facebookOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      // Get user info from Facebook
      const response = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email&access_token=${token.access_token}`
      );
      const facebookUser = (await response.json()) as {
        id: string;
        name: string;
        email: string;
      };

      // Handle OAuth user
      const user = await OAuthControllerFastify.handleOAuthUser(
        facebookUser,
        "facebook"
      );

      // Generate token
      const authToken = generateToken(
        (user as unknown as { _id: { toString(): string } })._id.toString()
      );

      // Redirect to frontend with token
      reply.redirect(
        `${process.env.FRONTEND_URL}/auth/success?token=${authToken}`
      );
    } catch (error) {
      request.log.error("Facebook OAuth callback error:", error);
      reply.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }

  // Handle OAuth user creation/update
  static async handleOAuthUser(
    profile: any,
    provider: "google" | "facebook"
  ): Promise<UserType> {
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

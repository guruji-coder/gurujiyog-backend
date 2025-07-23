import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import User from "../models/User";
import { IUser as UserType } from "../models/User";

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = (await User.findOne({
          $or: [
            { googleId: profile.id },
            { email: profile.emails?.[0]?.value },
          ],
        })) as UserType;

        if (user) {
          // Update Google ID if not set
          if (!user.googleId) {
            user.googleId = profile.id;
            user.isVerified = true;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          password: "oauth_user", // Placeholder for OAuth users
          role: "student",
          isVerified: true,
        }) as UserType;

        await user.save();
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

// Facebook OAuth Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
      callbackURL: "/api/auth/facebook/callback",
      profileFields: ["id", "displayName", "emails"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = (await User.findOne({
          $or: [
            { facebookId: profile.id },
            { email: profile.emails?.[0]?.value },
          ],
        })) as UserType;

        if (user) {
          // Update Facebook ID if not set
          if (!user.facebookId) {
            user.facebookId = profile.id;
            user.isVerified = true;
            await user.save();
          }
          return done(null, user);
        }

        // Create new user
        user = new User({
          facebookId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value,
          password: "oauth_user", // Placeholder for OAuth users
          role: "student",
          isVerified: true,
        }) as UserType;

        await user.save();
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

export default passport;

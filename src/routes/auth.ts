import express from "express";
import { body, validationResult } from "express-validator";
import jwt, { Secret, SignOptions, Algorithm } from "jsonwebtoken";
import { authenticate, AuthRequest } from "../middleware/auth";
import { Request, Response } from "express";
import passport from "../utils/passport";
import { AuthService } from "../services/auth/authService";
import { OTPService } from "../services/auth/otpService";

const router = express.Router();

// Generate JWT token
const generateToken = (userId: string): string => {
  const secret: Secret = process.env.JWT_SECRET || "fallback-secret";
  const options: SignOptions = {
    expiresIn: Number(process.env.JWT_EXPIRE) || 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    algorithm: "HS256" as Algorithm,
  };
  return jwt.sign({ userId }, secret, options);
};

// Register
router.post(
  "/register",
  [
    body("name")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { name, email, password, phone, role = "student" } = req.body;

      // Use the service layer
      const result = await AuthService.register({
        name,
        email,
        password,
        phone,
        role,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during registration",
      });
    }
  }
);

// Login
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("password").exists().withMessage("Password is required"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Use the service layer
      const result = await AuthService.login({ email, password });

      if (!result.success) {
        return res.status(401).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during login",
      });
    }
  }
);

// Get current user profile
router.get("/profile", authenticate as any, async (req: any, res: Response) => {
  try {
    const result = await AuthService.getProfile(req.userId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Update profile
router.put(
  "/profile",
  authenticate as any,
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters"),
    body("phone")
      .optional()
      .isMobilePhone("any")
      .withMessage("Please provide a valid phone number"),
  ],
  async (req: any, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { name, phone, experience, preferredStyles, maxDistance } =
        req.body;

      // Use the service layer
      const result = await AuthService.updateProfile(req.userId, {
        name,
        phone,
        experience,
        preferredStyles,
        maxDistance,
      });

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during profile update",
      });
    }
  }
);

// Send OTP to email
router.post(
  "/send-otp",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
  ],
  async (req: Request, res: Response) => {
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

      // Use the service layer
      const result = await OTPService.sendOTP(email);

      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }
  }
);

// Verify OTP and login/register
router.post(
  "/verify-otp",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email"),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be 6 digits"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { email, otp, name } = req.body;

      // Use the service layer
      const result = await OTPService.verifyOTP({
        email,
        otp,
        name,
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during OTP verification",
        error: error,
      });
    }
  }
);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req: any, res: Response) => {
    try {
      const user = req.user as any;
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
);

// Facebook OAuth routes
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { session: false }),
  async (req: any, res: Response) => {
    try {
      const user = req.user as any;
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
);

export default router;

import mongoose, { Document, Schema } from "mongoose";

export interface IOTP extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  createdAt: Date;
  phoneNumber: string;
  type: "email" | "sms";
}

const OTPSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
    length: 6,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  },
  verified: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  phoneNumber: { type: String, trim: true },
  type: {
    type: String,
    enum: ["email", "sms"],
    required: true,
  },
});

// Index for auto-deletion of expired OTPs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for quick email lookups
OTPSchema.index({ email: 1 });

export default mongoose.model<IOTP>("OTP", OTPSchema);

import mongoose, { Schema, Document } from "mongoose";

// Session interface
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  deviceInfo: string;
  ipAddress: string;
  userAgent?: string;
  expiresAt: Date;
  lastUsed: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Session schema
const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    deviceInfo: {
      type: String,
      default: "Unknown Device",
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
sessionSchema.index({ userId: 1, isActive: 1 });
sessionSchema.index({ refreshTokenHash: 1, isActive: 1 });

const Session = mongoose.model<ISession>("Session", sessionSchema);

export default Session;

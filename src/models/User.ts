import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";

export interface IActivePackage {
  shala: mongoose.Types.ObjectId;
  packageId: mongoose.Types.ObjectId;
  classesRemaining: number;
  expiryDate: Date;
}

export interface IPreferredLocation {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: Date;
  experience: "beginner" | "intermediate" | "advanced";
  preferredStyles: string[];
  preferredLocation?: IPreferredLocation;
  maxDistance: number;
  activePackages: IActivePackage[];
  emailNotifications: boolean;
  smsNotifications: boolean;
  role: "student" | "instructor" | "shala_owner" | "admin";
  isVerified: boolean;
  isActive: boolean;
  googleId?: string;
  facebookId?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  wishlist: mongoose.Types.ObjectId[];
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  experience: {
    type: String,
    enum: ["beginner", "intermediate", "advanced"],
    default: "beginner",
  },
  preferredStyles: [
    {
      type: String,
      enum: [
        "hatha",
        "vinyasa",
        "ashtanga",
        "iyengar",
        "kundalini",
        "bikram",
        "hot_yoga",
        "yin",
        "restorative",
        "meditation",
      ],
    },
  ],

  preferredLocation: {
    type: {
      type: String,
      enum: ["Point"],
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: function (coords: number[]) {
          return !coords || coords.length === 2;
        },
        message:
          "Coordinates must be an array of 2 numbers [longitude, latitude]",
      },
    },
  },
  maxDistance: { type: Number, default: 10 },

  wishlist: [
    {
      type: Schema.Types.ObjectId,
      ref: "YogaShala",
    },
  ],

  activePackages: [
    {
      shala: { type: Schema.Types.ObjectId, ref: "YogaShala" },
      packageId: { type: Schema.Types.ObjectId },
      classesRemaining: { type: Number },
      expiryDate: { type: Date },
    },
  ],

  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: false },

  role: {
    type: String,
    enum: ["student", "instructor", "shala_owner", "admin"],
    default: "student",
  },

  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  googleId: { type: String },
  facebookId: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Hash password before saving
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Validate preferredLocation before saving
UserSchema.pre("save", function (next) {
  // If preferredLocation is set but doesn't have valid coordinates, remove it
  if (
    this.preferredLocation &&
    (!this.preferredLocation.coordinates ||
      this.preferredLocation.coordinates.length !== 2)
  ) {
    this.preferredLocation = undefined;
  }
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes - only create geospatial index if preferredLocation exists and has coordinates
UserSchema.index(
  {
    preferredLocation: "2dsphere",
  },
  {
    sparse: true,
    partialFilterExpression: {
      "preferredLocation.coordinates": { $exists: true, $ne: null },
    },
  }
);

export default mongoose.model<IUser>("User", UserSchema);

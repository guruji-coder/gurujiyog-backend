import mongoose, { Document, Schema } from "mongoose";

export interface ITimeSlot {
  day:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  startTime: string;
  endTime: string;
  className: string;
  instructor: string;
  capacity: number;
  price: number;
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ILocation {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface IPackage {
  name: string;
  classes: number;
  price: number;
  validityDays: number;
}

export interface IYogaShala extends Document {
  name: string;
  description: string;
  images: string[];
  address: IAddress;
  location: ILocation;
  phone: string;
  email: string;
  website?: string;
  amenities: string[];
  schedule: ITimeSlot[];
  dropInRate?: number;
  packages: IPackage[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
  owner: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotSchema = new Schema<ITimeSlot>({
  day: {
    type: String,
    enum: [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ],
    required: true,
  },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  className: { type: String, required: true },
  instructor: { type: String, required: true },
  capacity: { type: Number, default: 20 },
  price: { type: Number, required: true },
});

const LocationSchema = new Schema<ILocation>({
  type: {
    type: String,
    enum: ["Point"],
    default: "Point",
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

const YogaShalaSchema = new Schema<IYogaShala>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  images: [{ type: String }],

  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: "India" },
  },
  location: {
    type: LocationSchema,
    required: true,
  },

  phone: { type: String, required: true },
  email: { type: String, required: true },
  website: { type: String },

  amenities: [
    {
      type: String,
      enum: [
        "parking",
        "showers",
        "lockers",
        "props",
        "mats",
        "towels",
        "water",
        "tea",
        "meditation_room",
        "outdoor_space",
        "ac",
        "heating",
        "music_system",
        "wifi",
        "changing_rooms",
      ],
    },
  ],

  schedule: [TimeSlotSchema],
  dropInRate: { type: Number },
  packages: [
    {
      name: { type: String, required: true },
      classes: { type: Number, required: true },
      price: { type: Number, required: true },
      validityDays: { type: Number, required: true },
    },
  ],

  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },

  isActive: { type: Boolean, default: true },
  owner: { type: Schema.Types.ObjectId, ref: "User" },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes
YogaShalaSchema.index({ location: "2dsphere" });
YogaShalaSchema.index({ "address.city": 1 });
YogaShalaSchema.index({ rating: -1 });
YogaShalaSchema.index({ name: "text", description: "text" });

export default mongoose.model<IYogaShala>("YogaShala", YogaShalaSchema);

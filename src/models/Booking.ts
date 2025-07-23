import mongoose, { Document, Schema } from 'mongoose';

export interface IPackageUsed {
  packageId: mongoose.Types.ObjectId;
  classesUsed: number;
}

export interface IBooking extends Document {
  user: mongoose.Types.ObjectId;
  shala: mongoose.Types.ObjectId;
  className: string;
  instructor: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show';
  paymentMethod: 'package' | 'drop_in' | 'trial' | 'free';
  amountPaid: number;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  packageUsed?: IPackageUsed;
  checkedIn: boolean;
  checkInTime?: Date;
  notes?: string;
  specialRequests?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  refundAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  shala: { 
    type: Schema.Types.ObjectId, 
    ref: 'YogaShala', 
    required: true 
  },
  
  className: { type: String, required: true },
  instructor: { type: String, required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  
  status: {
    type: String,
    enum: ['confirmed', 'pending', 'cancelled', 'completed', 'no_show'],
    default: 'confirmed'
  },
  
  paymentMethod: {
    type: String,
    enum: ['package', 'drop_in', 'trial', 'free'],
    required: true
  },
  amountPaid: { type: Number, required: true },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: { type: String },
  
  packageUsed: {
    packageId: { type: Schema.Types.ObjectId },
    classesUsed: { type: Number, default: 1 }
  },
  
  checkedIn: { type: Boolean, default: false },
  checkInTime: { type: Date },
  
  notes: { type: String },
  specialRequests: { type: String },
  
  cancellationReason: { type: String },
  cancelledAt: { type: Date },
  refundAmount: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
BookingSchema.index({ user: 1, date: -1 });
BookingSchema.index({ shala: 1, date: 1, startTime: 1 });
BookingSchema.index({ date: 1, status: 1 });
BookingSchema.index({ status: 1 });

export default mongoose.model<IBooking>('Booking', BookingSchema); 
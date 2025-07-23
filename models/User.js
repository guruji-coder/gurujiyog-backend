const mongoose = require('mongoose');

// Performance-First Session Data Schema - Single query for 200ms load
const sessionDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  
  // Denormalized user data (duplicate for speed)
  user: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: String,
    role: { 
      type: String, 
      enum: ['student', 'teacher', 'shaala_owner'], 
      default: 'student',
      required: true 
    },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 }
  },
  
  // UI preferences (critical for instant theming)
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    language: { type: String, default: 'en' },
    location: String,
    favoriteStyles: [String],
    preferredTime: { type: String, enum: ['morning', 'afternoon', 'evening'], default: 'morning' },
    maxDistance: { type: Number, default: 10 },
    notifications: { type: Boolean, default: true }
  },
  
  // Gamification (show immediately in navbar)
  gamification: {
    currentStreak: { type: Number, default: 0 },
    level: { type: String, default: 'Beginner' },
    totalPoints: { type: Number, default: 0 },
    weeklyGoal: {
      target: { type: Number, default: 3 },
      completed: { type: Number, default: 0 },
      weekStartDate: Date
    },
    nextBadge: String,
    lastActivity: Date
  },
  
  // Next class (denormalized for instant display)
  nextClass: {
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    scheduledAt: Date,
    teacherName: String,
    shalaName: String,
    shalaAddress: String,
    status: { type: String, enum: ['confirmed', 'waitlist', 'cancelled'], default: 'confirmed' },
    spotsLeft: Number,
    canCancel: { type: Boolean, default: true },
    cancelDeadline: Date
  },
  
  // Permissions (role-based UI rendering)
  permissions: {
    canBookClasses: { type: Boolean, default: true },
    canTeach: { type: Boolean, default: false },
    canManageShaalas: { type: Boolean, default: false },
    maxBookingsPerDay: { type: Number, default: 3 },
    canCancelBookings: { type: Boolean, default: true },
    hasActiveSubscription: { type: Boolean, default: false }
  },
  
  // Filter defaults (instant filter setup)
  filterDefaults: {
    location: {
      coordinates: [Number], // [lng, lat]
      address: String,
      radius: { type: Number, default: 10 }
    },
    styles: [String],
    timePreference: String,
    priceRange: [Number],
    intensity: String
  },
  
  // Quick stats (dashboard widgets)
  quickStats: {
    totalClassesAttended: { type: Number, default: 0 },
    currentMonthClasses: { type: Number, default: 0 },
    favoriteTeacher: String,
    mostFrequentShala: String,
    averageRating: { type: Number, default: 0 }
  },
  
  // Cache metadata
  lastUpdated: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 60 * 1000) }, // 30 min TTL
  version: { type: Number, default: 1 }
});

// Traditional User Schema for authentication and core data
const userCriticalSchema = new mongoose.Schema({
  // Authentication & Identity
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: { type: String },
  
  // Role & Permissions - Critical for UI rendering
  role: { 
    type: String, 
    enum: ['student', 'teacher', 'shaala_owner'], 
    default: 'student',
    required: true 
  },
  
  // Account Status - Critical for access control
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  
  // OAuth Data
  googleId: String,
  facebookId: String,
  
  // Session Management
  lastLogin: Date,
  tokenVersion: { type: Number, default: 0 },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Live Activity Schema - Real-time updates
const liveActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true },
  
  // Upcoming bookings (next 7 days)
  upcomingBookings: [{
    bookingId: mongoose.Schema.Types.ObjectId,
    classId: mongoose.Schema.Types.ObjectId,
    className: String,
    scheduledAt: Date,
    teacherName: String,
    shalaName: String,
    shalaAddress: String,
    status: { type: String, enum: ['confirmed', 'waitlist', 'cancelled'], default: 'confirmed' },
    spotsLeft: Number,
    reminderSent: { type: Boolean, default: false },
    checkedIn: { type: Boolean, default: false }
  }],
  
  // Today's activity
  todayActivity: {
    classesAttended: { type: Number, default: 0 },
    lastClassCompleted: Date,
    streakUpdated: { type: Boolean, default: false },
    pointsEarned: { type: Number, default: 0 },
    badgeEarned: String,
    checkins: [String]
  },
  
  // Live notifications (last 10, unread first)
  notifications: [{
    id: String,
    type: { type: String, enum: ['booking_reminder', 'class_cancelled', 'achievement', 'social'] },
    title: String,
    message: String,
    data: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    actionable: { type: Boolean, default: false },
    action: mongoose.Schema.Types.Mixed
  }],
  
  // Streak information
  streakInfo: {
    currentStreak: { type: Number, default: 0 },
    streakStartDate: Date,
    lastActivityDate: Date,
    nextStreakMilestone: Number,
    streakFreezeAvailable: { type: Number, default: 2 },
    longestStreak: { type: Number, default: 0 }
  },
  
  lastSync: { type: Date, default: Date.now },
  syncVersion: { type: Number, default: 1 }
});

// Active Subscription Summary - Critical for role-based features
const activeSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['monthly', 'yearly', 'class_pack'], required: true },
  status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
  expiresAt: Date,
  remainingClasses: Number, // For class packs
  shaalas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shaala' }], // Access permissions
  createdAt: { type: Date, default: Date.now }
});

// Recent Bookings Summary - Critical for dashboard preview
const recentBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  shaalaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shaala', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Quick access data
  className: String,
  shaalanName: String,
  teacherName: String,
  
  status: { 
    type: String, 
    enum: ['confirmed', 'cancelled', 'completed', 'no_show'], 
    default: 'confirmed' 
  },
  
  scheduledAt: { type: Date, required: true },
  bookedAt: { type: Date, default: Date.now }
});

// Role-specific data schemas
const teacherProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bio: String,
  specializations: [String],
  certifications: [String],
  experience: Number, // years
  hourlyRate: Number,
  shaalas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shaala' }],
  isApproved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const shaalaOwnerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessName: String,
  businessLicense: String,
  shaalas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shaala' }],
  isApproved: { type: Boolean, default: false },
  verificationDocuments: [String],
  createdAt: { type: Date, default: Date.now }
});

// Indexes for critical data optimization
sessionDataSchema.index({ userId: 1 }); // Primary lookup
sessionDataSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
sessionDataSchema.index({ "user.email": 1 }); // Email lookup
sessionDataSchema.index({ lastUpdated: -1 }); // Cache management

userCriticalSchema.index({ email: 1 });
userCriticalSchema.index({ role: 1, isActive: 1 });
liveActivitySchema.index({ userId: 1 });
liveActivitySchema.index({ "notifications.read": 1, "notifications.createdAt": -1 });
liveActivitySchema.index({ lastSync: -1 });
activeSubscriptionSchema.index({ userId: 1, status: 1 });
recentBookingSchema.index({ userId: 1, scheduledAt: -1 });

// Models
const SessionData = mongoose.model('SessionData', sessionDataSchema);
const User = mongoose.model('User', userCriticalSchema);
const LiveActivity = mongoose.model('LiveActivity', liveActivitySchema);
const ActiveSubscription = mongoose.model('ActiveSubscription', activeSubscriptionSchema);
const RecentBooking = mongoose.model('RecentBooking', recentBookingSchema);
const TeacherProfile = mongoose.model('TeacherProfile', teacherProfileSchema);
const ShaalaOwnerProfile = mongoose.model('ShaalaOwnerProfile', shaalaOwnerProfileSchema);

module.exports = {
  SessionData,
  User,
  LiveActivity,
  ActiveSubscription,
  RecentBooking,
  TeacherProfile,
  ShaalaOwnerProfile
};

export interface UserCriticalData {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'student' | 'teacher' | 'shaala_owner';
  isActive: boolean;
  isVerified: boolean;
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
  };
  lastLogin?: Date;
}

export interface ActiveSubscription {
  id: string;
  type: 'monthly' | 'yearly' | 'class_pack';
  status: 'active' | 'expired' | 'cancelled';
  expiresAt?: Date;
  remainingClasses?: number;
  shaalas: string[];
}

export interface RecentBooking {
  id: string;
  className: string;
  shaalaName: string;
  teacherName: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  scheduledAt: Date;
  bookedAt: Date;
}

export interface RolePermissions {
  canBookClasses: boolean;
  canTeach: boolean;
  canManageShaalas: boolean;
  canViewAnalytics: boolean;
  maxBookingsPerDay: number;
}

export interface SessionResponse {
  authenticated: true;
  user: UserCriticalData;
  activeSubscription?: ActiveSubscription;
  recentBookings: RecentBooking[];
  permissions: RolePermissions;
  sessionMetadata: {
    tokenExpiresAt: Date;
    refreshAt: Date;
    cacheExpiresAt: Date;
  };
}

export interface UnauthenticatedResponse {
  authenticated: false;
  error?: string;
  requiresVerification?: boolean;
}

export type AuthSessionResponse = SessionResponse | UnauthenticatedResponse;

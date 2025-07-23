import Booking from "../../models/Booking";
import YogaShala from "../../models/YogaShala";
import { IBooking as BookingType } from "../../models/Booking";

export interface BookingData {
  shalaId: string;
  classId: string;
  date: string;
  timeSlot: {
    startTime: string;
    endTime: string;
  };
  paymentMethod: string;
  amount: number;
}

export interface BookingUpdateData {
  status?: string;
  paymentStatus?: string;
  notes?: string;
}

export interface BookingQuery {
  page?: number;
  limit?: number;
  status?: string;
  userId?: string;
  shalaId?: string;
}

export interface BookingResult {
  success: boolean;
  message: string;
  booking?: any;
  bookings?: any[];
  pagination?: any;
}

export class BookingService {
  // Create new booking
  static async createBooking(
    userId: string,
    bookingData: BookingData
  ): Promise<BookingResult> {
    try {
      const { shalaId, classId, date, timeSlot, paymentMethod, amount } =
        bookingData;

      // Check if shala exists and is active
      const shala = await YogaShala.findById(shalaId);
      if (!shala || !shala.isActive) {
        return {
          success: false,
          message: "Shala not found or inactive",
        };
      }

      // Check if class exists in shala schedule
      const classExists = shala.schedule.some((day) =>
        day.timeSlots.some(
          (slot) =>
            slot.startTime === timeSlot.startTime &&
            slot.endTime === timeSlot.endTime
        )
      );

      if (!classExists) {
        return {
          success: false,
          message: "Class not found in shala schedule",
        };
      }

      // Check if booking already exists for this user, class, and date
      const existingBooking = await Booking.findOne({
        user: userId,
        shala: shalaId,
        date,
        status: { $in: ["confirmed", "pending"] },
      });

      if (existingBooking) {
        return {
          success: false,
          message: "Booking already exists for this class and date",
        };
      }

      // Create new booking
      const booking = new Booking({
        user: userId,
        shala: shalaId,
        classId,
        date,
        timeSlot,
        paymentMethod,
        amount,
        status: "pending",
        paymentStatus: "pending",
      });

      await booking.save();

      // Populate shala details
      await booking.populate("shala", "name address contact");

      return {
        success: true,
        message: "Booking created successfully",
        booking,
      };
    } catch (error) {
      console.error("Create booking error:", error);
      return {
        success: false,
        message: "Server error while creating booking",
      };
    }
  }

  // Get booking by ID
  static async getBookingById(
    id: string,
    userId: string,
    isAdmin: boolean = false
  ): Promise<BookingResult> {
    try {
      const booking = await Booking.findById(id)
        .populate("shala", "name address contact")
        .populate("user", "name email");

      if (!booking) {
        return {
          success: false,
          message: "Booking not found",
        };
      }

      // Check if user owns this booking or is admin
      if (booking.user.toString() !== userId && !isAdmin) {
        return {
          success: false,
          message: "Not authorized to view this booking",
        };
      }

      return {
        success: true,
        message: "Booking retrieved successfully",
        booking,
      };
    } catch (error) {
      console.error("Get booking by ID error:", error);
      return {
        success: false,
        message: "Server error while fetching booking",
      };
    }
  }

  // Update booking
  static async updateBooking(
    id: string,
    userId: string,
    updateData: BookingUpdateData,
    isAdmin: boolean = false
  ): Promise<BookingResult> {
    try {
      const booking = await Booking.findById(id);

      if (!booking) {
        return {
          success: false,
          message: "Booking not found",
        };
      }

      // Check authorization
      const isOwner = booking.user.toString() === userId;
      const isShalaOwner = await this.isShalaOwner(
        userId,
        booking.shala.toString()
      );

      if (!isOwner && !isAdmin && !isShalaOwner) {
        return {
          success: false,
          message: "Not authorized to update this booking",
        };
      }

      // Update booking
      const updatedBooking = await Booking.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("shala", "name address contact")
        .populate("user", "name email");

      return {
        success: true,
        message: "Booking updated successfully",
        booking: updatedBooking,
      };
    } catch (error) {
      console.error("Update booking error:", error);
      return {
        success: false,
        message: "Server error while updating booking",
      };
    }
  }

  // Cancel booking
  static async cancelBooking(
    id: string,
    userId: string
  ): Promise<BookingResult> {
    try {
      const booking = await Booking.findById(id);

      if (!booking) {
        return {
          success: false,
          message: "Booking not found",
        };
      }

      // Check if user owns this booking
      if (booking.user.toString() !== userId) {
        return {
          success: false,
          message: "Not authorized to cancel this booking",
        };
      }

      // Check if booking can be cancelled
      if (booking.status === "cancelled") {
        return {
          success: false,
          message: "Booking is already cancelled",
        };
      }

      // Update booking status
      booking.status = "cancelled";
      booking.cancelledAt = new Date();
      await booking.save();

      return {
        success: true,
        message: "Booking cancelled successfully",
      };
    } catch (error) {
      console.error("Cancel booking error:", error);
      return {
        success: false,
        message: "Server error while cancelling booking",
      };
    }
  }

  // Get user's bookings
  static async getUserBookings(
    userId: string,
    query: BookingQuery
  ): Promise<BookingResult> {
    try {
      const { page = 1, limit = 10, status } = query;
      const skip = (page - 1) * limit;

      // Build query
      const filterQuery: any = { user: userId };
      if (status) filterQuery.status = status;

      const bookings = await Booking.find(filterQuery)
        .populate("shala", "name address contact")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Booking.countDocuments(filterQuery);

      return {
        success: true,
        message: "Bookings retrieved successfully",
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get user bookings error:", error);
      return {
        success: false,
        message: "Server error while fetching bookings",
      };
    }
  }

  // Get all bookings (admin/shala owner)
  static async getAllBookings(
    userId: string,
    query: BookingQuery,
    isAdmin: boolean = false
  ): Promise<BookingResult> {
    try {
      const { page = 1, limit = 10, status, shalaId } = query;
      const skip = (page - 1) * limit;

      // Build query
      const filterQuery: any = {};
      if (status) filterQuery.status = status;
      if (shalaId) filterQuery.shala = shalaId;

      // Check if user is admin or shala owner
      if (!isAdmin) {
        // Filter by shalas owned by user
        const userShalas = await YogaShala.find({ owner: userId }).select(
          "_id"
        );
        const shalaIds = userShalas.map((shala) => shala._id);
        filterQuery.shala = { $in: shalaIds };
      }

      const bookings = await Booking.find(filterQuery)
        .populate("shala", "name address contact")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Booking.countDocuments(filterQuery);

      return {
        success: true,
        message: "Bookings retrieved successfully",
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error("Get all bookings error:", error);
      return {
        success: false,
        message: "Server error while fetching bookings",
      };
    }
  }

  // Helper method to check if user is shala owner
  private static async isShalaOwner(
    userId: string,
    shalaId: string
  ): Promise<boolean> {
    try {
      const shala = await YogaShala.findById(shalaId);
      return shala?.owner.toString() === userId;
    } catch (error) {
      console.error("Check shala owner error:", error);
      return false;
    }
  }

  // Format booking response
  static formatBookingResponse(booking: BookingType): any {
    return {
      id: booking._id,
      user: booking.user,
      shala: booking.shala,
      classId: booking.classId,
      date: booking.date,
      timeSlot: booking.timeSlot,
      paymentMethod: booking.paymentMethod,
      amount: booking.amount,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      notes: booking.notes,
      createdAt: booking.createdAt,
      cancelledAt: booking.cancelledAt,
    };
  }
}

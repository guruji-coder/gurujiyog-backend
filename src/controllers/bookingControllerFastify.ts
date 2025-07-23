import { FastifyRequest, FastifyReply } from "fastify";
import Booking from "../models/Booking";
import YogaShala from "../models/YogaShala";
import { IBooking as BookingType } from "../models/Booking";

// Define request types
interface CreateBookingRequest {
  Body: {
    shalaId: string;
    classId: string;
    date: string;
    timeSlot: {
      startTime: string;
      endTime: string;
    };
    paymentMethod: string;
    amount: number;
  };
}

interface GetBookingRequest {
  Params: {
    id: string;
  };
}

interface UpdateBookingRequest {
  Params: {
    id: string;
  };
  Body: {
    status?: string;
    paymentStatus?: string;
    notes?: string;
  };
}

interface CancelBookingRequest {
  Params: {
    id: string;
  };
}

interface ListBookingsRequest {
  Querystring: {
    page?: string;
    limit?: string;
    status?: string;
    userId?: string;
    shalaId?: string;
  };
}

export class BookingControllerFastify {
  // Create new booking
  static async createBooking(
    request: FastifyRequest<CreateBookingRequest>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: "User not authenticated",
        });
      }

      const { shalaId, classId, date, timeSlot, paymentMethod, amount } =
        request.body;

      // Check if shala exists and is active
      const shala = await YogaShala.findById(shalaId);
      if (!shala || !shala.isActive) {
        return reply.status(404).send({
          success: false,
          message: "Shala not found or inactive",
        });
      }

      // Check if class exists in shala schedule
      const classExists = shala.schedule.some(
        (slot) =>
          slot.startTime === timeSlot.startTime &&
          slot.endTime === timeSlot.endTime
      );

      if (!classExists) {
        return reply.status(400).send({
          success: false,
          message: "Class not found in shala schedule",
        });
      }

      // Check if booking already exists for this user, class, and date
      const existingBooking = await Booking.findOne({
        user: userId,
        shala: shalaId,
        date,
        status: { $in: ["confirmed", "pending"] },
      });

      if (existingBooking) {
        return reply.status(400).send({
          success: false,
          message: "Booking already exists for this class and date",
        });
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
      }) as BookingType;

      await booking.save();

      // Populate shala details
      await booking.populate("shala", "name address contact");

      reply.status(201).send({
        success: true,
        message: "Booking created successfully",
        booking,
      });
    } catch (error) {
      request.log.error("Create booking error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while creating booking",
      });
    }
  }

  // Get booking by ID
  static async getBookingById(
    request: FastifyRequest<GetBookingRequest>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: "User not authenticated",
        });
      }

      const booking = await Booking.findById(id)
        .populate("shala", "name address contact")
        .populate("user", "name email");

      if (!booking) {
        return reply.status(404).send({
          success: false,
          message: "Booking not found",
        });
      }

      // Check if user owns this booking or is admin
      if (
        booking.user.toString() !== userId &&
        (request as any).user?.role !== "admin"
      ) {
        return reply.status(403).send({
          success: false,
          message: "Not authorized to view this booking",
        });
      }

      reply.send({
        success: true,
        booking,
      });
    } catch (error) {
      request.log.error("Get booking by ID error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while fetching booking",
      });
    }
  }

  // Update booking
  static async updateBooking(
    request: FastifyRequest<UpdateBookingRequest>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const userId = (request as any).user?.id;
      const updateData = request.body;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: "User not authenticated",
        });
      }

      const booking = await Booking.findById(id);

      if (!booking) {
        return reply.status(404).send({
          success: false,
          message: "Booking not found",
        });
      }

      // Check authorization
      const isOwner = booking.user.toString() === userId;
      const isAdmin = (request as any).user?.role === "admin";
      const isShalaOwner = await this.isShalaOwner(
        userId,
        booking.shala.toString()
      );

      if (!isOwner && !isAdmin && !isShalaOwner) {
        return reply.status(403).send({
          success: false,
          message: "Not authorized to update this booking",
        });
      }

      // Update booking
      const updatedBooking = await Booking.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("shala", "name address contact")
        .populate("user", "name email");

      reply.send({
        success: true,
        message: "Booking updated successfully",
        booking: updatedBooking,
      });
    } catch (error) {
      request.log.error("Update booking error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while updating booking",
      });
    }
  }

  // Cancel booking
  static async cancelBooking(
    request: FastifyRequest<CancelBookingRequest>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: "User not authenticated",
        });
      }

      const booking = await Booking.findById(id);

      if (!booking) {
        return reply.status(404).send({
          success: false,
          message: "Booking not found",
        });
      }

      // Check if user owns this booking
      if (booking.user.toString() !== userId) {
        return reply.status(403).send({
          success: false,
          message: "Not authorized to cancel this booking",
        });
      }

      // Check if booking can be cancelled
      if (booking.status === "cancelled") {
        return reply.status(400).send({
          success: false,
          message: "Booking is already cancelled",
        });
      }

      // Update booking status
      booking.status = "cancelled";
      booking.cancelledAt = new Date();
      await booking.save();

      reply.send({
        success: true,
        message: "Booking cancelled successfully",
      });
    } catch (error) {
      request.log.error("Cancel booking error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while cancelling booking",
      });
    }
  }

  // Get user's bookings
  static async getUserBookings(
    request: FastifyRequest<ListBookingsRequest>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user?.id;
      const { page = "1", limit = "10", status } = request.query;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: "User not authenticated",
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query: any = { user: userId };
      if (status) query.status = status;

      const bookings = await Booking.find(query)
        .populate("shala", "name address contact")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      const total = await Booking.countDocuments(query);

      reply.send({
        success: true,
        bookings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      request.log.error("Get user bookings error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while fetching bookings",
      });
    }
  }

  // Get all bookings (admin/shala owner)
  static async getAllBookings(
    request: FastifyRequest<ListBookingsRequest>,
    reply: FastifyReply
  ) {
    try {
      const userId = (request as any).user?.id;
      const { page = "1", limit = "10", status, shalaId } = request.query;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: "User not authenticated",
        });
      }

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      const query: any = {};
      if (status) query.status = status;
      if (shalaId) query.shala = shalaId;

      // Check if user is admin or shala owner
      const isAdmin = (request as any).user?.role === "admin";
      if (!isAdmin) {
        // Filter by shalas owned by user
        const userShalas = await YogaShala.find({ owner: userId }).select(
          "_id"
        );
        const shalaIds = userShalas.map((shala) => shala._id);
        query.shala = { $in: shalaIds };
      }

      const bookings = await Booking.find(query)
        .populate("shala", "name address contact")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      const total = await Booking.countDocuments(query);

      reply.send({
        success: true,
        bookings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      request.log.error("Get all bookings error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while fetching bookings",
      });
    }
  }

  // Get booking statistics
  static async getBookingStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.id;

      if (!userId) {
        return reply.status(401).send({
          success: false,
          message: "User not authenticated",
        });
      }

      const isAdmin = (request as any).user?.role === "admin";
      let query: any = {};

      if (!isAdmin) {
        // Filter by shalas owned by user
        const userShalas = await YogaShala.find({ owner: userId }).select(
          "_id"
        );
        const shalaIds = userShalas.map((shala) => shala._id);
        query.shala = { $in: shalaIds };
      }

      const totalBookings = await Booking.countDocuments(query);
      const confirmedBookings = await Booking.countDocuments({
        ...query,
        status: "confirmed",
      });
      const pendingBookings = await Booking.countDocuments({
        ...query,
        status: "pending",
      });
      const cancelledBookings = await Booking.countDocuments({
        ...query,
        status: "cancelled",
      });

      // Get bookings by status
      const bookingsByStatus = await Booking.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      // Get recent bookings (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentBookings = await Booking.countDocuments({
        ...query,
        createdAt: { $gte: sevenDaysAgo },
      });

      reply.send({
        success: true,
        stats: {
          total: totalBookings,
          confirmed: confirmedBookings,
          pending: pendingBookings,
          cancelled: cancelledBookings,
          recent: recentBookings,
          byStatus: bookingsByStatus,
        },
      });
    } catch (error) {
      request.log.error("Get booking stats error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while fetching booking statistics",
      });
    }
  }

  // Helper method to check if user is shala owner
  private static async isShalaOwner(
    userId: string,
    shalaId: string
  ): Promise<boolean> {
    const shala = await YogaShala.findById(shalaId);
    return shala?.owner.toString() === userId;
  }
}

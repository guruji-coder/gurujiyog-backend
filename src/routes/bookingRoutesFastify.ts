import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { BookingControllerFastify } from "../controllers/bookingControllerFastify";

const bookingRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Create new booking
  fastify.post(
    "/",
    {
      schema: {
        tags: ["Bookings"],
        summary: "Create new booking",
        description: "Create a new yoga class booking",
        body: {
          type: "object",
          required: [
            "shalaId",
            "classId",
            "date",
            "timeSlot",
            "paymentMethod",
            "amount",
          ],
          properties: {
            shalaId: { type: "string", description: "ID of the shala" },
            classId: { type: "string", description: "ID of the class" },
            date: {
              type: "string",
              format: "date",
              description: "Booking date",
            },
            timeSlot: {
              type: "object",
              required: ["startTime", "endTime"],
              properties: {
                startTime: { type: "string", description: "Class start time" },
                endTime: { type: "string", description: "Class end time" },
              },
            },
            paymentMethod: {
              type: "string",
              description: "Payment method used",
            },
            amount: { type: "number", description: "Booking amount" },
          },
        },
        response: {
          201: {
            description: "Booking created successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              booking: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  user: { type: "string" },
                  shala: { type: "object" },
                  classId: { type: "string" },
                  date: { type: "string" },
                  timeSlot: { type: "object" },
                  paymentMethod: { type: "string" },
                  amount: { type: "number" },
                  status: { type: "string" },
                  paymentStatus: { type: "string" },
                  createdAt: { type: "string" },
                },
              },
            },
          },
          400: {
            description:
              "Bad request - validation error or booking already exists",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          401: {
            description: "User not authenticated",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          404: {
            description: "Shala not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    BookingControllerFastify.createBooking
  );

  // Get booking by ID
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Bookings"],
        summary: "Get booking by ID",
        description: "Get detailed information about a specific booking",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "Booking ID" },
          },
        },
        response: {
          200: {
            description: "Booking retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              booking: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  user: { type: "object" },
                  shala: { type: "object" },
                  classId: { type: "string" },
                  date: { type: "string" },
                  timeSlot: { type: "object" },
                  paymentMethod: { type: "string" },
                  amount: { type: "number" },
                  status: { type: "string" },
                  paymentStatus: { type: "string" },
                  notes: { type: "string" },
                  createdAt: { type: "string" },
                  cancelledAt: { type: "string" },
                },
              },
            },
          },
          404: {
            description: "Booking not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          403: {
            description: "Not authorized to view this booking",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    BookingControllerFastify.getBookingById
  );

  // Update booking
  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["Bookings"],
        summary: "Update booking",
        description: "Update a booking (owner, admin, or shala owner only)",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "Booking ID" },
          },
        },
        body: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["pending", "confirmed", "cancelled", "completed"],
            },
            paymentStatus: {
              type: "string",
              enum: ["pending", "paid", "failed", "refunded"],
            },
            notes: { type: "string", description: "Additional notes" },
          },
        },
        response: {
          200: {
            description: "Booking updated successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              booking: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  user: { type: "object" },
                  shala: { type: "object" },
                  status: { type: "string" },
                  paymentStatus: { type: "string" },
                  notes: { type: "string" },
                },
              },
            },
          },
          404: {
            description: "Booking not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          403: {
            description: "Not authorized to update this booking",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    BookingControllerFastify.updateBooking
  );

  // Cancel booking
  fastify.post(
    "/:id/cancel",
    {
      schema: {
        tags: ["Bookings"],
        summary: "Cancel booking",
        description: "Cancel a booking (owner only)",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "Booking ID" },
          },
        },
        response: {
          200: {
            description: "Booking cancelled successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          400: {
            description: "Booking is already cancelled",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          404: {
            description: "Booking not found",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          403: {
            description: "Not authorized to cancel this booking",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    BookingControllerFastify.cancelBooking
  );

  // Get user's bookings
  fastify.get(
    "/my-bookings",
    {
      schema: {
        tags: ["Bookings"],
        summary: "Get user's bookings",
        description: "Get all bookings for the authenticated user",
        querystring: {
          type: "object",
          properties: {
            page: { type: "string", default: "1" },
            limit: { type: "string", default: "10" },
            status: {
              type: "string",
              enum: ["pending", "confirmed", "cancelled", "completed"],
            },
          },
        },
        response: {
          200: {
            description: "Bookings retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              bookings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    shala: { type: "object" },
                    classId: { type: "string" },
                    date: { type: "string" },
                    timeSlot: { type: "object" },
                    status: { type: "string" },
                    paymentStatus: { type: "string" },
                    amount: { type: "number" },
                    createdAt: { type: "string" },
                  },
                },
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "number" },
                  limit: { type: "number" },
                  total: { type: "number" },
                  pages: { type: "number" },
                },
              },
            },
          },
          401: {
            description: "User not authenticated",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    BookingControllerFastify.getUserBookings
  );

  // Get all bookings (admin/shala owner)
  fastify.get(
    "/admin/all",
    {
      schema: {
        tags: ["Bookings"],
        summary: "Get all bookings",
        description: "Get all bookings (admin or shala owner only)",
        querystring: {
          type: "object",
          properties: {
            page: { type: "string", default: "1" },
            limit: { type: "string", default: "10" },
            status: {
              type: "string",
              enum: ["pending", "confirmed", "cancelled", "completed"],
            },
            shalaId: { type: "string", description: "Filter by shala ID" },
          },
        },
        response: {
          200: {
            description: "Bookings retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              bookings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    user: { type: "object" },
                    shala: { type: "object" },
                    classId: { type: "string" },
                    date: { type: "string" },
                    timeSlot: { type: "object" },
                    status: { type: "string" },
                    paymentStatus: { type: "string" },
                    amount: { type: "number" },
                    createdAt: { type: "string" },
                  },
                },
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "number" },
                  limit: { type: "number" },
                  total: { type: "number" },
                  pages: { type: "number" },
                },
              },
            },
          },
          401: {
            description: "User not authenticated",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          403: {
            description: "User not authorized",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    BookingControllerFastify.getAllBookings
  );

  // Get booking statistics
  fastify.get(
    "/stats/overview",
    {
      schema: {
        tags: ["Bookings"],
        summary: "Get booking statistics",
        description:
          "Get comprehensive booking statistics (admin or shala owner only)",
        response: {
          200: {
            description: "Statistics retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              stats: {
                type: "object",
                properties: {
                  total: { type: "number" },
                  confirmed: { type: "number" },
                  pending: { type: "number" },
                  cancelled: { type: "number" },
                  recent: { type: "number" },
                  byStatus: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        _id: { type: "string" },
                        count: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            description: "User not authenticated",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
          403: {
            description: "User not authorized",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    BookingControllerFastify.getBookingStats
  );
};

export default bookingRoutes;

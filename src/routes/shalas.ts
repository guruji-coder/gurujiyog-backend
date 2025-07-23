import express from "express";
import { body, query, validationResult } from "express-validator";
import YogaShala from "../models/YogaShala";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";
import { Request, Response } from "express";

const router = express.Router();

// Enhanced search with aggregation pipeline and caching
router.get(
  "/",
  [
    query("lat")
      .optional()
      .isFloat()
      .withMessage("Latitude must be a valid number"),
    query("lng")
      .optional()
      .isFloat()
      .withMessage("Longitude must be a valid number"),
    query("radius")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Radius must be between 1-100 km"),
    query("city").optional().trim().escape(),
    query("search").optional().trim().escape(),
    query("minRating")
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage("Min rating must be 0-5"),
    query("amenities").optional().isString(),
    query("sortBy")
      .optional()
      .isIn(["distance", "rating", "price", "newest"])
      .withMessage("Invalid sort option"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const {
        lat,
        lng,
        radius = 10,
        city,
        search,
        minRating = 0,
        amenities,
        sortBy = "distance",
        page = 1,
        limit = 10,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build aggregation pipeline for optimal performance
      const pipeline: any[] = [
        // Match active shalas first (most selective)
        { $match: { isActive: true } },
      ];

      // Location-based filtering using $geoNear for better performance
      if (lat && lng) {
        const geoNearStage = {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: [
                parseFloat(lng as string),
                parseFloat(lat as string),
              ],
            },
            distanceField: "distance",
            maxDistance: parseInt(radius as string) * 1000, // Convert km to meters
            spherical: true,
            distanceMultiplier: 0.001, // Convert meters back to km
          },
        };
        pipeline.unshift(geoNearStage); // Must be first stage when using $geoNear
        pipeline.shift(); // Remove the initial $match since $geoNear replaces it
        pipeline.push({ $match: { isActive: true } }); // Re-add after geoNear
      }

      // City filter
      if (city) {
        pipeline.push({
          $match: {
            "address.city": new RegExp(city as string, "i"),
          },
        });
      }

      // Text search
      if (search) {
        pipeline.push({
          $match: {
            $text: { $search: search as string },
          },
        });
        pipeline.push({
          $addFields: {
            textScore: { $meta: "textScore" },
          },
        });
      }

      // Rating filter
      if (minRating && parseFloat(minRating as string) > 0) {
        pipeline.push({
          $match: {
            rating: { $gte: parseFloat(minRating as string) },
          },
        });
      }

      // Amenities filter
      if (amenities) {
        const amenityList = (amenities as string)
          .split(",")
          .map((a) => a.trim());
        if (amenityList.length > 0) {
          pipeline.push({
            $match: {
              amenities: { $all: amenityList },
            },
          });
        }
      }

      // Add calculated fields for enhanced data
      pipeline.push({
        $addFields: {
          // Calculate average class price from schedule
          avgClassPrice: {
            $avg: "$schedule.price",
          },
          // Count available time slots for today
          todaySlots: {
            $size: {
              $filter: {
                input: "$schedule",
                cond: {
                  $eq: [
                    "$$this.day",
                    {
                      $toLower: { $dayOfWeek: new Date() },
                    },
                  ],
                },
              },
            },
          },
          // Calculate occupancy rate (simple estimation)
          occupancyRate: {
            $divide: [
              { $multiply: ["$reviewCount", 0.1] }, // Estimate based on reviews
              { $avg: "$schedule.capacity" },
            ],
          },
        },
      });

      // Populate owner data
      pipeline.push({
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
        },
      });

      pipeline.push({
        $unwind: {
          path: "$owner",
          preserveNullAndEmptyArrays: true,
        },
      });

      // Sorting
      let sortStage: any = {};
      switch (sortBy) {
        case "distance":
          if (lat && lng) {
            sortStage = { distance: 1, rating: -1 };
          } else {
            sortStage = { rating: -1, createdAt: -1 };
          }
          break;
        case "rating":
          sortStage = { rating: -1, reviewCount: -1 };
          break;
        case "price":
          sortStage = { avgClassPrice: 1, rating: -1 };
          break;
        case "newest":
          sortStage = { createdAt: -1 };
          break;
        default:
          if (search) {
            sortStage = { textScore: { $meta: "textScore" }, rating: -1 };
          } else {
            sortStage = { rating: -1, createdAt: -1 };
          }
      }

      pipeline.push({ $sort: sortStage });

      // Get total count for pagination
      const countPipeline = [...pipeline, { $count: "total" }];

      // Add pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limitNum });

      // Project final fields
      pipeline.push({
        $project: {
          __v: 0,
          "owner.password": 0,
          "owner.__v": 0,
        },
      });

      // Execute aggregation
      const [shalas, countResult] = await Promise.all([
        YogaShala.aggregate(pipeline),
        YogaShala.aggregate(countPipeline),
      ]);

      const total = countResult[0]?.total || 0;

      // Add cache headers for performance
      res.set({
        "Cache-Control": "public, max-age=300", // 5 minutes cache
        ETag: `W/"shalas-${lat}-${lng}-${radius}-${page}"`,
      });

      res.json({
        success: true,
        data: shalas,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
        filters: {
          location:
            lat && lng
              ? {
                  lat: parseFloat(lat as string),
                  lng: parseFloat(lng as string),
                  radius: parseInt(radius as string),
                }
              : null,
          city,
          search,
          minRating: parseFloat(minRating as string),
          amenities: amenities ? (amenities as string).split(",") : [],
          sortBy,
        },
      });
    } catch (error) {
      console.error("Enhanced shalas search error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while searching shalas",
      });
    }
  }
);

// Get nearby shalas with real-time availability
router.get(
  "/nearby",
  [
    query("lat")
      .isFloat()
      .withMessage("Latitude is required and must be a valid number"),
    query("lng")
      .isFloat()
      .withMessage("Longitude is required and must be a valid number"),
    query("radius")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Radius must be between 1-50 km"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const { lat, lng, radius = 5 } = req.query;
      const coordinates = [
        parseFloat(lng as string),
        parseFloat(lat as string),
      ];

      // Optimized pipeline for nearby search
      const pipeline = [
        {
          $geoNear: {
            near: { type: "Point", coordinates },
            distanceField: "distance",
            maxDistance: parseInt(radius as string) * 1000,
            spherical: true,
            distanceMultiplier: 0.001,
            query: { isActive: true },
          },
        },
        {
          $addFields: {
            // Calculate current availability
            currentAvailability: {
              $size: {
                $filter: {
                  input: "$schedule",
                  cond: {
                    $and: [
                      {
                        $eq: [
                          "$$this.day",
                          { $toLower: { $dayOfWeek: new Date() } },
                        ],
                      },
                      { $gte: ["$$this.capacity", 5] }, // At least 5 spots available
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $project: {
            name: 1,
            address: 1,
            location: 1,
            distance: 1,
            rating: 1,
            reviewCount: 1,
            dropInRate: 1,
            amenities: 1,
            currentAvailability: 1,
            phone: 1,
            images: { $slice: ["$images", 1] }, // Only first image for performance
          },
        },
        {
          $sort: { distance: 1, rating: -1 },
        },
        {
          $limit: 20, // Limit for performance
        },
      ];

      const nearbyshalas = await YogaShala.aggregate(pipeline as any);

      res.set("Cache-Control", "public, max-age=180"); // 3 minutes cache for real-time data

      res.json({
        success: true,
        data: nearbyshalas,
        location: {
          lat: parseFloat(lat as string),
          lng: parseFloat(lng as string),
        },
        searchRadius: parseInt(radius as string),
      });
    } catch (error) {
      console.error("Nearby shalas error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while finding nearby shalas",
      });
    }
  }
);

// Get shala by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const shala = await YogaShala.findById(req.params.id).populate(
      "owner",
      "name email phone"
    );

    if (!shala) {
      return res.status(404).json({
        success: false,
        message: "Shala not found",
      });
    }

    res.json({
      success: true,
      data: shala,
    });
  } catch (error) {
    console.error("Shala fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching shala",
    });
  }
});

// Create new shala (shala_owner only)
router.post(
  "/",
  authenticate,
  authorize("shala_owner", "admin"),
  [
    body("name")
      .trim()
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters"),
    body("description")
      .trim()
      .isLength({ min: 10 })
      .withMessage("Description must be at least 10 characters"),
    body("address.street")
      .trim()
      .notEmpty()
      .withMessage("Street address is required"),
    body("address.city").trim().notEmpty().withMessage("City is required"),
    body("address.state").trim().notEmpty().withMessage("State is required"),
    body("address.zipCode")
      .trim()
      .notEmpty()
      .withMessage("Zip code is required"),
    body("location.coordinates")
      .isArray({ min: 2, max: 2 })
      .withMessage("Location coordinates must be [longitude, latitude]"),
    body("phone")
      .isMobilePhone("any")
      .withMessage("Please provide a valid phone number"),
    body("email").isEmail().withMessage("Please provide a valid email"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const shalaData = {
        ...req.body,
        owner: req.userId,
      };

      const shala = new YogaShala(shalaData);
      await shala.save();

      res.status(201).json({
        success: true,
        message: "Shala created successfully",
        data: shala,
      });
    } catch (error) {
      console.error("Shala creation error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while creating shala",
      });
    }
  }
);

// Update shala
router.put(
  "/:id",
  authenticate,
  authorize("shala_owner", "admin"),
  async (req: AuthRequest, res) => {
    try {
      const shala = await YogaShala.findById(req.params.id);

      if (!shala) {
        return res.status(404).json({
          success: false,
          message: "Shala not found",
        });
      }

      // Check ownership (unless admin)
      if (req.user?.role !== "admin" && shala.owner.toString() !== req.userId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this shala",
        });
      }

      const updatedShala = await YogaShala.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedAt: Date.now() },
        { new: true, runValidators: true }
      );

      res.json({
        success: true,
        message: "Shala updated successfully",
        data: updatedShala,
      });
    } catch (error) {
      console.error("Shala update error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating shala",
      });
    }
  }
);

// Delete shala
router.delete(
  "/:id",
  authenticate,
  authorize("shala_owner", "admin"),
  async (req: AuthRequest, res) => {
    try {
      const shala = await YogaShala.findById(req.params.id);

      if (!shala) {
        return res.status(404).json({
          success: false,
          message: "Shala not found",
        });
      }

      // Check ownership (unless admin)
      if (req.user?.role !== "admin" && shala.owner.toString() !== req.userId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this shala",
        });
      }

      await YogaShala.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Shala deleted successfully",
      });
    } catch (error) {
      console.error("Shala deletion error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while deleting shala",
      });
    }
  }
);

// Get shala schedule
router.get("/:id/schedule", async (req, res) => {
  try {
    const shala = await YogaShala.findById(req.params.id).select(
      "name schedule"
    );

    if (!shala) {
      return res.status(404).json({
        success: false,
        message: "Shala not found",
      });
    }

    res.json({
      success: true,
      data: {
        shalaName: shala.name,
        schedule: shala.schedule,
      },
    });
  } catch (error) {
    console.error("Schedule fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching schedule",
    });
  }
});

// Get owner's shalas
router.get(
  "/my-shalas",
  authenticate,
  authorize("shala_owner", "admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const shalas = await YogaShala.find({ owner: req.userId })
        .select("-__v")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: shalas,
      });
    } catch (error) {
      console.error("My shalas fetch error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching your shalas",
      });
    }
  }
);

// Get shala bookings (shala owner only)
router.get(
  "/:id/bookings",
  authenticate,
  authorize("shala_owner", "admin"),
  [
    query("status")
      .optional()
      .isIn(["confirmed", "pending", "cancelled", "completed", "no_show"]),
    query("date").optional().isISO8601().withMessage("Valid date required"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const shala = await YogaShala.findById(req.params.id);
      if (!shala) {
        return res.status(404).json({
          success: false,
          message: "Shala not found",
        });
      }

      // Check ownership (unless admin)
      if (req.user?.role !== "admin" && shala.owner.toString() !== req.userId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view this shala's bookings",
        });
      }

      const { status, date, page = 1, limit = 10 } = req.query;

      let query: any = { shala: req.params.id };
      if (status) {
        query.status = status;
      }
      if (date) {
        query.date = new Date(date as string);
      }

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const Booking = require("../models/Booking").default;
      const bookings = await Booking.find(query)
        .populate("user", "name email phone")
        .sort({ date: -1, startTime: -1 })
        .skip(skip)
        .limit(limitNum);

      const total = await Booking.countDocuments(query);

      res.json({
        success: true,
        data: bookings,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
      });
    } catch (error) {
      console.error("Shala bookings fetch error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching shala bookings",
      });
    }
  }
);

// Get shala analytics (shala owner only)
router.get(
  "/:id/analytics",
  authenticate,
  authorize("shala_owner", "admin"),
  [
    query("startDate")
      .optional()
      .isISO8601()
      .withMessage("Valid start date required"),
    query("endDate")
      .optional()
      .isISO8601()
      .withMessage("Valid end date required"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation errors",
          errors: errors.array(),
        });
      }

      const shala = await YogaShala.findById(req.params.id);
      if (!shala) {
        return res.status(404).json({
          success: false,
          message: "Shala not found",
        });
      }

      // Check ownership (unless admin)
      if (req.user?.role !== "admin" && shala.owner.toString() !== req.userId) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to view this shala's analytics",
        });
      }

      const { startDate, endDate } = req.query;

      // Default to last 30 days if no date range provided
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const Booking = require("../models/Booking").default;

      // Base query for date range
      const dateQuery = {
        shala: req.params.id,
        date: { $gte: start, $lte: end },
      };

      // Total bookings in date range
      const totalBookings = await Booking.countDocuments(dateQuery);

      // Total revenue
      const revenueResult = await Booking.aggregate([
        {
          $match: { ...dateQuery, status: { $in: ["confirmed", "completed"] } },
        },
        { $group: { _id: null, total: { $sum: "$amountPaid" } } },
      ]);
      const totalRevenue = revenueResult[0]?.total || 0;

      // Checked in users today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkedInUsers = await Booking.countDocuments({
        shala: req.params.id,
        date: today,
        checkedIn: true,
      });

      // Popular classes
      const popularClasses = await Booking.aggregate([
        { $match: dateQuery },
        { $group: { _id: "$className", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { className: "$_id", count: 1, _id: 0 } },
      ]);

      // Revenue by day (last 7 days)
      const revenueByDay = await Booking.aggregate([
        {
          $match: {
            shala: req.params.id,
            date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            status: { $in: ["confirmed", "completed"] },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            revenue: { $sum: "$amountPaid" },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: "$_id", revenue: 1, _id: 0 } },
      ]);

      // Booking status distribution
      const statusDistribution = await Booking.aggregate([
        { $match: dateQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      const bookingStatusDistribution = statusDistribution.reduce(
        (acc: any, curr: any) => {
          acc[curr._id] = curr.count;
          return acc;
        },
        {
          confirmed: 0,
          pending: 0,
          cancelled: 0,
          completed: 0,
          no_show: 0,
        }
      );

      res.json({
        success: true,
        data: {
          totalBookings,
          totalRevenue,
          checkedInUsers,
          popularClasses,
          revenueByDay,
          bookingStatusDistribution,
        },
      });
    } catch (error) {
      console.error("Shala analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching shala analytics",
      });
    }
  }
);

export default router;

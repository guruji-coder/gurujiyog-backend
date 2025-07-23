import { FastifyRequest, FastifyReply } from "fastify";
import YogaShala from "../models/YogaShala";
import { IYogaShala as ShalaType } from "../models/YogaShala";

// Define request types
interface SearchShalasRequest {
  Querystring: {
    lat?: string;
    lng?: string;
    radius?: string;
    city?: string;
    search?: string;
    minRating?: string;
    amenities?: string;
    sortBy?: string;
    page?: string;
    limit?: string;
  };
}

interface GetShalaRequest {
  Params: {
    id: string;
  };
}

interface CreateShalaRequest {
  Body: {
    name: string;
    description: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    location: {
      type: string;
      coordinates: number[];
    };
    contact: {
      phone: string;
      email: string;
      website?: string;
    };
    amenities: string[];
    schedule: Array<{
      day: string;
      timeSlots: Array<{
        startTime: string;
        endTime: string;
        classType: string;
        instructor: string;
        capacity: number;
        price: number;
      }>;
    }>;
    pricing: {
      singleClass: number;
      monthly: number;
      yearly: number;
    };
    images: string[];
  };
}

interface UpdateShalaRequest {
  Params: {
    id: string;
  };
  Body: Partial<CreateShalaRequest["Body"]>;
}

interface DeleteShalaRequest {
  Params: {
    id: string;
  };
}

export class ShalaControllerFastify {
  // Search and get all shalas
  static async searchShalas(
    request: FastifyRequest<SearchShalasRequest>,
    reply: FastifyReply
  ) {
    try {
      const {
        lat,
        lng,
        radius = "10",
        city,
        search,
        minRating = "0",
        amenities,
        sortBy = "distance",
        page = "1",
        limit = "10",
      } = request.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      // Now that we know schema is the issue, restore normal functionality
      const shalas = await YogaShala.find({ isActive: true })
        .skip(skip)
        .limit(limitNum)
        .lean();

      const total = await YogaShala.countDocuments({ isActive: true });

      reply.send({
        success: true,
        shalas,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
      });
    } catch (error) {
      request.log.error("Search shalas error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while searching shalas",
      });
    }
  }

  // Get shala by ID
  static async getShalaById(
    request: FastifyRequest<GetShalaRequest>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;

      const shala = await YogaShala.findById(id)
        .populate("owner", "name email phone")
        .populate("reviews.user", "name");

      if (!shala) {
        return reply.status(404).send({
          success: false,
          message: "Shala not found",
        });
      }

      reply.send({
        success: true,
        shala,
      });
    } catch (error) {
      request.log.error("Get shala by ID error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while fetching shala",
      });
    }
  }

  // Create new shala
  static async createShala(
    request: FastifyRequest<CreateShalaRequest>,
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

      const shalaData = request.body;

      // Create new shala
      const shala = new YogaShala({
        ...shalaData,
        owner: userId,
        rating: 0,
        reviewCount: 0,
        isActive: true,
      }) as ShalaType;

      await shala.save();

      reply.status(201).send({
        success: true,
        message: "Shala created successfully",
        shala,
      });
    } catch (error) {
      request.log.error("Create shala error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while creating shala",
      });
    }
  }

  // Update shala
  static async updateShala(
    request: FastifyRequest<UpdateShalaRequest>,
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

      // Check if shala exists and user owns it
      const shala = await YogaShala.findById(id);

      if (!shala) {
        return reply.status(404).send({
          success: false,
          message: "Shala not found",
        });
      }

      if (shala.owner.toString() !== userId) {
        return reply.status(403).send({
          success: false,
          message: "Not authorized to update this shala",
        });
      }

      // Update shala
      const updatedShala = await YogaShala.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("owner", "name email phone");

      reply.send({
        success: true,
        message: "Shala updated successfully",
        shala: updatedShala,
      });
    } catch (error) {
      request.log.error("Update shala error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while updating shala",
      });
    }
  }

  // Delete shala
  static async deleteShala(
    request: FastifyRequest<DeleteShalaRequest>,
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

      // Check if shala exists and user owns it
      const shala = await YogaShala.findById(id);

      if (!shala) {
        return reply.status(404).send({
          success: false,
          message: "Shala not found",
        });
      }

      if (shala.owner.toString() !== userId) {
        return reply.status(403).send({
          success: false,
          message: "Not authorized to delete this shala",
        });
      }

      // Soft delete by setting isActive to false
      await YogaShala.findByIdAndUpdate(id, { isActive: false });

      reply.send({
        success: true,
        message: "Shala deleted successfully",
      });
    } catch (error) {
      request.log.error("Delete shala error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while deleting shala",
      });
    }
  }

  // Get shala statistics
  static async getShalaStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const totalShalas = await YogaShala.countDocuments({ isActive: true });
      const totalReviews = await YogaShala.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: "$reviewCount" } } },
      ]);

      // Get shalas by city
      const shalasByCity = await YogaShala.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$address.city", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      // Get average rating
      const avgRating = await YogaShala.aggregate([
        { $match: { isActive: true, rating: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]);

      reply.send({
        success: true,
        stats: {
          total: totalShalas,
          totalReviews: totalReviews[0]?.total || 0,
          avgRating: avgRating[0]?.avg || 0,
          byCity: shalasByCity,
        },
      });
    } catch (error) {
      request.log.error("Get shala stats error:", error);
      reply.status(500).send({
        success: false,
        message: "Server error while fetching shala statistics",
      });
    }
  }

  // Debug endpoint to test images
  static async debugImages(request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log("=== DEBUG IMAGES ENDPOINT ===");

      // Test 1: Raw mongoose query
      const rawShala = await YogaShala.findOne({ isActive: true }).lean();
      console.log("Raw shala keys:", Object.keys(rawShala || {}));
      console.log("Raw shala images:", rawShala?.images);

      // Test 2: With find query
      const findShalas = await YogaShala.find({ isActive: true })
        .limit(1)
        .lean();
      console.log("Find shala images:", findShalas[0]?.images);

      // Test 3: Response
      reply.send({
        success: true,
        rawShala: rawShala,
        findShala: findShalas[0],
        debug: {
          rawHasImages: !!rawShala?.images,
          findHasImages: !!findShalas[0]?.images,
          rawImagesLength: rawShala?.images?.length || 0,
          findImagesLength: findShalas[0]?.images?.length || 0,
        },
      });
    } catch (error) {
      request.log.error("Debug images error:", error);
      reply.status(500).send({
        success: false,
        message: "Debug error",
      });
    }
  }

  // Simple test endpoint for images
  static async testImages(request: FastifyRequest, reply: FastifyReply) {
    try {
      const shalas = await YogaShala.find({ isActive: true }).limit(1).lean();

      reply.send({
        success: true,
        shalas: shalas,
        test: "simple endpoint",
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        message: "Test error",
      });
    }
  }
}

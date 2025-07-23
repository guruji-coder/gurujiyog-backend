import YogaShala from "../../models/YogaShala";
import { IYogaShala as ShalaType } from "../../models/YogaShala";

export interface ShalaData {
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
}

export interface ShalaResult {
  success: boolean;
  message: string;
  shala?: any;
  shalas?: any[];
  pagination?: any;
}

export class ShalaService {
  // Create new shala
  static async createShala(
    userId: string,
    shalaData: ShalaData
  ): Promise<ShalaResult> {
    try {
      // Create new shala
      const shala = new YogaShala({
        ...shalaData,
        owner: userId,
        rating: 0,
        reviewCount: 0,
        isActive: true,
      });

      await shala.save();

      return {
        success: true,
        message: "Shala created successfully",
        shala,
      };
    } catch (error) {
      console.error("Create shala error:", error);
      return {
        success: false,
        message: "Server error while creating shala",
      };
    }
  }

  // Get shala by ID
  static async getShalaById(id: string): Promise<ShalaResult> {
    try {
      const shala = await YogaShala.findById(id)
        .populate("owner", "name email phone")
        .populate("reviews.user", "name");

      if (!shala) {
        return {
          success: false,
          message: "Shala not found",
        };
      }

      return {
        success: true,
        message: "Shala retrieved successfully",
        shala,
      };
    } catch (error) {
      console.error("Get shala by ID error:", error);
      return {
        success: false,
        message: "Server error while fetching shala",
      };
    }
  }

  // Update shala
  static async updateShala(
    id: string,
    userId: string,
    updateData: Partial<ShalaData>
  ): Promise<ShalaResult> {
    try {
      // Check if shala exists and user owns it
      const shala = await YogaShala.findById(id);

      if (!shala) {
        return {
          success: false,
          message: "Shala not found",
        };
      }

      if (shala.owner.toString() !== userId) {
        return {
          success: false,
          message: "Not authorized to update this shala",
        };
      }

      // Update shala
      const updatedShala = await YogaShala.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      }).populate("owner", "name email phone");

      return {
        success: true,
        message: "Shala updated successfully",
        shala: updatedShala,
      };
    } catch (error) {
      console.error("Update shala error:", error);
      return {
        success: false,
        message: "Server error while updating shala",
      };
    }
  }

  // Delete shala
  static async deleteShala(id: string, userId: string): Promise<ShalaResult> {
    try {
      // Check if shala exists and user owns it
      const shala = await YogaShala.findById(id);

      if (!shala) {
        return {
          success: false,
          message: "Shala not found",
        };
      }

      if (shala.owner.toString() !== userId) {
        return {
          success: false,
          message: "Not authorized to delete this shala",
        };
      }

      // Soft delete by setting isActive to false
      await YogaShala.findByIdAndUpdate(id, { isActive: false });

      return {
        success: true,
        message: "Shala deleted successfully",
      };
    } catch (error) {
      console.error("Delete shala error:", error);
      return {
        success: false,
        message: "Server error while deleting shala",
      };
    }
  }

  // Get shalas by owner
  static async getShalasByOwner(userId: string): Promise<ShalaResult> {
    try {
      const shalas = await YogaShala.find({ owner: userId })
        .populate("owner", "name email phone")
        .sort({ createdAt: -1 });

      return {
        success: true,
        message: "Shalas retrieved successfully",
        shalas,
      };
    } catch (error) {
      console.error("Get shalas by owner error:", error);
      return {
        success: false,
        message: "Server error while fetching shalas",
      };
    }
  }

  // Check if user is shala owner
  static async isShalaOwner(userId: string, shalaId: string): Promise<boolean> {
    try {
      const shala = await YogaShala.findById(shalaId);
      return shala?.owner.toString() === userId;
    } catch (error) {
      console.error("Check shala owner error:", error);
      return false;
    }
  }

  // Format shala response
  static formatShalaResponse(shala: ShalaType): any {
    return {
      id: shala._id,
      name: shala.name,
      description: shala.description,
      address: shala.address,
      location: shala.location,
      contact: shala.contact,
      amenities: shala.amenities,
      schedule: shala.schedule,
      pricing: shala.pricing,
      rating: shala.rating,
      reviewCount: shala.reviewCount,
      images: shala.images,
      isActive: shala.isActive,
      owner: shala.owner,
      createdAt: shala.createdAt,
    };
  }
}

import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { ShalaControllerFastify } from "../controllers/shalaControllerFastify";
import YogaShala from "../models/YogaShala";

const shalaRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Test endpoint
  fastify.get("/test", async (request, reply) => {
    try {
      const shalas = await YogaShala.find({ isActive: true }).limit(1).lean();
      reply.send({
        success: true,
        count: shalas.length,
        keys: shalas[0] ? Object.keys(shalas[0]) : [],
        shala: shalas[0] || null,
      });
    } catch (error) {
      reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Search and get all shalas
  fastify.get(
    "/",
    {
      schema: {
        tags: ["Shalas"],
        summary: "Search and get all shalas",
        description:
          "Search and get all active yoga shalas with filtering and pagination",
        querystring: {
          type: "object",
          properties: {
            lat: {
              type: "string",
              description: "Latitude for location-based search",
            },
            lng: {
              type: "string",
              description: "Longitude for location-based search",
            },
            radius: {
              type: "string",
              default: "10",
              description: "Search radius in km",
            },
            city: { type: "string", description: "Filter by city" },
            search: { type: "string", description: "Text search term" },
            minRating: {
              type: "string",
              default: "0",
              description: "Minimum rating filter",
            },
            amenities: {
              type: "string",
              description: "Comma-separated list of amenities",
            },
            sortBy: {
              type: "string",
              enum: ["distance", "rating", "price", "newest"],
              default: "distance",
              description: "Sort order",
            },
            page: { type: "string", default: "1", description: "Page number" },
            limit: {
              type: "string",
              default: "10",
              description: "Items per page",
            },
          },
        },
        // Removed response schema to allow all fields including images
      },
    },
    ShalaControllerFastify.searchShalas
  );

  // Get shala by ID
  fastify.get(
    "/:id",
    {
      schema: {
        tags: ["Shalas"],
        summary: "Get shala by ID",
        description: "Get detailed information about a specific shala",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "Shala ID" },
          },
        },
        response: {
          200: {
            description: "Shala retrieved successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              shala: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  address: {
                    type: "object",
                    properties: {
                      street: { type: "string" },
                      city: { type: "string" },
                      state: { type: "string" },
                      zipCode: { type: "string" },
                      country: { type: "string" },
                    },
                  },
                  location: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      coordinates: {
                        type: "array",
                        items: { type: "number" },
                      },
                    },
                  },
                  contact: {
                    type: "object",
                    properties: {
                      phone: { type: "string" },
                      email: { type: "string" },
                      website: { type: "string" },
                    },
                  },
                  rating: { type: "number" },
                  reviewCount: { type: "number" },
                  amenities: {
                    type: "array",
                    items: { type: "string" },
                  },
                  schedule: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day: { type: "string" },
                        timeSlots: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              startTime: { type: "string" },
                              endTime: { type: "string" },
                              classType: { type: "string" },
                              instructor: { type: "string" },
                              capacity: { type: "number" },
                              price: { type: "number" },
                            },
                          },
                        },
                      },
                    },
                  },
                  pricing: {
                    type: "object",
                    properties: {
                      singleClass: { type: "number" },
                      monthly: { type: "number" },
                      yearly: { type: "number" },
                    },
                  },
                  images: {
                    type: "array",
                    items: { type: "string" },
                  },
                  owner: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                    },
                  },
                  reviews: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        rating: { type: "number" },
                        comment: { type: "string" },
                        user: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                          },
                        },
                        createdAt: { type: "string" },
                      },
                    },
                  },
                },
              },
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
    ShalaControllerFastify.getShalaById
  );

  // Create new shala
  fastify.post(
    "/",
    {
      schema: {
        tags: ["Shalas"],
        summary: "Create new shala",
        description: "Create a new yoga shala (authenticated users only)",
        body: {
          type: "object",
          required: [
            "name",
            "description",
            "address",
            "location",
            "contact",
            "amenities",
            "schedule",
            "pricing",
          ],
          properties: {
            name: { type: "string", minLength: 2, description: "Shala name" },
            description: { type: "string", description: "Shala description" },
            address: {
              type: "object",
              required: ["street", "city", "state", "zipCode", "country"],
              properties: {
                street: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                zipCode: { type: "string" },
                country: { type: "string" },
              },
            },
            location: {
              type: "object",
              required: ["type", "coordinates"],
              properties: {
                type: { type: "string", enum: ["Point"] },
                coordinates: {
                  type: "array",
                  items: { type: "number" },
                  minItems: 2,
                  maxItems: 2,
                },
              },
            },
            contact: {
              type: "object",
              required: ["phone", "email"],
              properties: {
                phone: { type: "string" },
                email: { type: "string", format: "email" },
                website: { type: "string", format: "uri" },
              },
            },
            amenities: {
              type: "array",
              items: { type: "string" },
              description: "List of available amenities",
            },
            schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "string" },
                  timeSlots: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        startTime: { type: "string" },
                        endTime: { type: "string" },
                        classType: { type: "string" },
                        instructor: { type: "string" },
                        capacity: { type: "number" },
                        price: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
            pricing: {
              type: "object",
              required: ["singleClass", "monthly", "yearly"],
              properties: {
                singleClass: { type: "number" },
                monthly: { type: "number" },
                yearly: { type: "number" },
              },
            },
            images: {
              type: "array",
              items: { type: "string" },
              description: "Array of image URLs",
            },
          },
        },
        response: {
          201: {
            description: "Shala created successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              shala: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  address: { type: "object" },
                  contact: { type: "object" },
                  amenities: { type: "array" },
                  schedule: { type: "array" },
                  pricing: { type: "object" },
                  owner: { type: "string" },
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
          400: {
            description: "Bad request - validation error",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    ShalaControllerFastify.createShala
  );

  // Update shala
  fastify.put(
    "/:id",
    {
      schema: {
        tags: ["Shalas"],
        summary: "Update shala",
        description: "Update an existing shala (owner only)",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "Shala ID" },
          },
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 2 },
            description: { type: "string" },
            address: {
              type: "object",
              properties: {
                street: { type: "string" },
                city: { type: "string" },
                state: { type: "string" },
                zipCode: { type: "string" },
                country: { type: "string" },
              },
            },
            location: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["Point"] },
                coordinates: {
                  type: "array",
                  items: { type: "number" },
                  minItems: 2,
                  maxItems: 2,
                },
              },
            },
            contact: {
              type: "object",
              properties: {
                phone: { type: "string" },
                email: { type: "string", format: "email" },
                website: { type: "string", format: "uri" },
              },
            },
            amenities: {
              type: "array",
              items: { type: "string" },
            },
            schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  day: { type: "string" },
                  timeSlots: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        startTime: { type: "string" },
                        endTime: { type: "string" },
                        classType: { type: "string" },
                        instructor: { type: "string" },
                        capacity: { type: "number" },
                        price: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
            pricing: {
              type: "object",
              properties: {
                singleClass: { type: "number" },
                monthly: { type: "number" },
                yearly: { type: "number" },
              },
            },
            images: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
        response: {
          200: {
            description: "Shala updated successfully",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              shala: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  name: { type: "string" },
                  description: { type: "string" },
                  address: { type: "object" },
                  contact: { type: "object" },
                  amenities: { type: "array" },
                  schedule: { type: "array" },
                  pricing: { type: "object" },
                  owner: { type: "object" },
                },
              },
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
          403: {
            description: "Not authorized to update this shala",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    ShalaControllerFastify.updateShala
  );

  // Delete shala
  fastify.delete(
    "/:id",
    {
      schema: {
        tags: ["Shalas"],
        summary: "Delete shala",
        description: "Delete a shala (owner only)",
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string", description: "Shala ID" },
          },
        },
        response: {
          200: {
            description: "Shala deleted successfully",
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
          403: {
            description: "Not authorized to delete this shala",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
            },
          },
        },
      },
    },
    ShalaControllerFastify.deleteShala
  );

  // Get shala statistics
  fastify.get(
    "/stats/overview",
    {
      schema: {
        tags: ["Shalas"],
        summary: "Get shala statistics",
        description: "Get comprehensive shala statistics",
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
                  totalReviews: { type: "number" },
                  avgRating: { type: "number" },
                  byCity: {
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
        },
      },
    },
    ShalaControllerFastify.getShalaStats
  );
};

export default shalaRoutes;

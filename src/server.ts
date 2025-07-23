// ===============================
// GurujiYog Fastify Server
// -------------------------------
// This is the main entrypoint for the backend API server.
// - Uses Fastify (not Express)
// - Handles all API routes, plugins, and error handling
// - To run: `npm start` or `node dist/server.js`
// ===============================

import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import fastifySession from "@fastify/session";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyFormbody from "@fastify/formbody";
import fastifyOAuth2 from "@fastify/oauth2";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import dotenv from "dotenv";
import { connectDB } from "./utils/database";

dotenv.config(); // Load environment variables from .env file

// Create Fastify instance with pretty logging
const fastify: FastifyInstance = Fastify({
  logger: {
    level: "info",
    transport: {
      target: "pino-pretty",
    },
  },
});

// Connect to MongoDB
connectDB();

// Register all Fastify plugins (CORS, session, OAuth, docs, etc)
async function registerPlugins() {
  // Allow frontend to call API (CORS)
  await fastify.register(fastifyCors, {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
  });

  // Parse form bodies (for POST requests)
  await fastify.register(fastifyFormbody);

  // Cookie support (needed for sessions)
  await fastify.register(fastifyCookie);

  // Session support (for login sessions)
  await fastify.register(fastifySession, {
    secret:
      process.env.SESSION_SECRET ||
      "fallback-session-secret-that-is-long-enough-for-production-use",
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  });

  // API docs (Swagger)
  await fastify.register(fastifySwagger, {
    swagger: {
      info: {
        title: "GurujiYog API",
        description:
          "API documentation for GurujiYog - Yoga Shala Discovery App",
        version: "1.0.0",
        contact: {
          name: "GurujiYog Team",
          email: "support@gurujiyog.com",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      host: process.env.BACKEND_HOST || "localhost:4001",
      schemes: ["http", "https"],
      consumes: ["application/json"],
      produces: ["application/json"],
      tags: [
        { name: "Health", description: "Health check endpoints" },
        { name: "OTP", description: "OTP endpoints" },
        { name: "Users", description: "User management endpoints" },
        { name: "Shalas", description: "Yoga shala endpoints" },
        { name: "Bookings", description: "Booking management endpoints" },
      ],
      securityDefinitions: {
        Bearer: {
          type: "apiKey",
          name: "Authorization",
          in: "header",
          description: "JWT token in format: Bearer <token>",
        },
      },
    },
  });

  // Swagger UI (API docs web interface)
  await fastify.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  // Google OAuth2 login
  await fastify.register(fastifyOAuth2, {
    name: "googleOAuth2",
    scope: ["profile", "email"],
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID!,
        secret: process.env.GOOGLE_CLIENT_SECRET!,
      },
      auth: fastifyOAuth2.GOOGLE_CONFIGURATION,
    },
    callbackUri: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/auth/google/callback`,
  });

  // Facebook OAuth2 login
  await fastify.register(fastifyOAuth2, {
    name: "facebookOAuth2",
    scope: ["email"],
    credentials: {
      client: {
        id: process.env.FACEBOOK_APP_ID!,
        secret: process.env.FACEBOOK_APP_SECRET!,
      },
      auth: fastifyOAuth2.FACEBOOK_CONFIGURATION,
    },
    callbackUri: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/auth/facebook/callback`,
  });
}

// Register all API routes (auth, shalas, users, bookings)
async function registerRoutes() {
  // Import route modules
  const authRoutes = await import("./routes/authRoutesFastify");
  const shalaRoutes = await import("./routes/shalaRoutesFastify");
  const userRoutes = await import("./routes/userRoutesFastify");
  const bookingRoutes = await import("./routes/bookingRoutesFastify");
  const hybridAuthRoutes = await import("./routes/hybridAuth");

  // Register each route module with a prefix
  await fastify.register(authRoutes.default, { prefix: "/api/auth" });
  await fastify.register(hybridAuthRoutes.default, { prefix: "/api/auth" });
  await fastify.register(shalaRoutes.default, { prefix: "/api/shalas" });
  await fastify.register(userRoutes.default, { prefix: "/api/users" });
  await fastify.register(bookingRoutes.default, { prefix: "/api/bookings" });
}

// Health check endpoint (for monitoring, uptime, etc)
fastify.get(
  "/",
  {
    schema: {
      tags: ["Health"],
      summary: "Health check",
      description: "Check if the API is running",
      response: {
        200: {
          description: "API is running",
          type: "object",
          properties: {
            message: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            version: { type: "string" },
          },
        },
      },
    },
  },
  async (request, reply) => {
    return {
      message: "GurujiYog API is running 🚀",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    };
  }
);

// Global error handler (catches all unhandled errors)
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// Start the server (main entrypoint)
const start = async () => {
  try {
    await registerPlugins(); // Register all plugins
    await registerRoutes(); // Register all routes

    // Optionally fix database issues on startup
    // try {
    //   await fixPreferredLocationData();
    // } catch (error) {
    //   console.error("Warning: Could not fix database issues:", error);
    // }

    const port = Number(process.env.PORT) || 4001;
    await fastify.listen({ port, host: "0.0.0.0" });

    console.log(`🚀 Server ready at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start(); // Start the server!

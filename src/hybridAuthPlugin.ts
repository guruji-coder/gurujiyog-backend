import { FastifyInstance } from 'fastify';
import hybridAuthRoutes from './routes/hybridAuth';

/**
 * Register the Hybrid Authentication plugin with your main Fastify server
 * Add this to your main server.ts file
 */

export async function registerHybridAuth(fastify: FastifyInstance) {
  // Register the hybrid auth routes under /auth prefix
  await fastify.register(hybridAuthRoutes, { prefix: '/auth' });
}

// Example usage in server.ts:
/*
import { registerHybridAuth } from './hybridAuthPlugin';

const fastify = Fastify({
  logger: true
});

// Register hybrid auth routes
await registerHybridAuth(fastify);

// Your other routes and plugins...

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 4001, host: '0.0.0.0' });
    console.log('Server running on http://0.0.0.0:4001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
*/

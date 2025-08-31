// server.js
import Fastify from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';

import { getSQLPool } from './db/sql.js';
import { initMongo } from './db/mongo.js';
import { initRedis } from './db/redis.js';
import { initRabbitMQ } from './mq/rabbit.js';

dotenv.config();

const fastify = Fastify({ logger: true });

// CORS
fastify.register(cors, {
  origin: 'http://localhost:3000',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  preflight: true
});

const useSQL = process.env.USE_SQL === 'true';

// Routes SQL/JSON
let tasksRoutes, projectsRoutes, usersRoutes;
if (useSQL) {
  tasksRoutes = (await import('./sql/tasks.js')).default;
  projectsRoutes = (await import('./sql/projects.js')).default;
  usersRoutes = (await import('./sql/users.js')).default;
} else {
  tasksRoutes = (await import('./json/tasks.js')).default;
  projectsRoutes = (await import('./json/projects.js')).default;
  usersRoutes = (await import('./json/users.js')).default;
}

// Mongo (comments)
const commentsRoute = (await import('./mongoDB/commentsRoute.js')).commentsRoutes;

// Register routes
fastify.register(tasksRoutes, { prefix: '/tasks' });
fastify.register(projectsRoutes, { prefix: '/projects' });
fastify.register(usersRoutes, { prefix: '/users' });
fastify.register(commentsRoute, { prefix: '/tasks/:taskId/comments' });

// Health - מינימלי
fastify.get('/', async () => {
  return { message: 'Server is running!' };
});

// SQL test
fastify.get('/sql-test', async (request, reply) => {
  try {
    const pool = await getSQLPool();
    const result = await pool.request().query('SELECT 1 + 1 AS result');
    return { result: result.recordset[0].result };
  } catch (err) {
    request.log.error('SQL test failed:', err);
    return reply.status(500).send({ error: 'SQL test failed', details: err.message });
  }
});

const startServer = async () => {
  try {
    // SQL
    if (useSQL) {
      try {
        const pool = await getSQLPool();
        fastify.decorate('sqlPool', pool);
        fastify.log.info('✅ SQL database ready');
      } catch (err) {
        fastify.log.error('❌ Could not connect to SQL: ' + err.message);
      }
    }

    // Mongo
    try {
      await initMongo();
      fastify.log.info('✅ MongoDB connected');
    } catch (err) {
      fastify.log.error('❌ MongoDB connection failed: ' + err.message);
    }

    // Redis
    try {
      const redisClient = await initRedis();
      if (redisClient) {
        fastify.decorate('redis', redisClient);
        fastify.log.info('✅ Redis ready');
      }
    } catch {
      fastify.log.warn('⚠ Redis not connected, skipping...');
    }

    // RabbitMQ
    try {
      const rabbit = await initRabbitMQ();
      if (rabbit) {
        fastify.decorate('rabbit', rabbit);
        fastify.log.info('✅ RabbitMQ ready');
      }
    } catch {
      fastify.log.warn('⚠ RabbitMQ not connected, skipping...');
    }

    const PORT = process.env.PORT || 3001;
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Server listening on port ${PORT}`);
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
};

startServer();

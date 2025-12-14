import { FastifyRequest, FastifyReply } from 'fastify';
import { testConnection } from '../services/importService';

export async function healthHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const dbConnected = await testConnection();

    if (!dbConnected) {
      return reply.status(503).send({
        success: false,
        status: 'unhealthy',
        database: 'disconnected',
      });
    }

    return reply.send({
      success: true,
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return reply.status(503).send({
      success: false,
      status: 'unhealthy',
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

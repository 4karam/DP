import { FastifyRequest, FastifyReply } from 'fastify';
import { Pool } from 'pg';

interface TestConnectionRequest {
  Body: {
    databaseUrl: string;
  };
}

export async function testConnectionHandler(
  request: FastifyRequest<TestConnectionRequest>,
  reply: FastifyReply
) {
  try {
    const { databaseUrl } = request.body;

    if (!databaseUrl) {
      return reply.status(400).send({
        success: false,
        error: 'databaseUrl is required',
      });
    }

    // Create a temporary pool to test the connection
    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        client.release();
        await pool.end();

        return reply.send({
          success: true,
          message: 'Database connection successful',
        });
      } catch (error) {
        client.release();
        await pool.end();
        throw error;
      }
    } catch (error) {
      await pool.end().catch(() => {}); // Suppress error on pool end
      throw error;
    }
  } catch (error) {
    console.error('Connection test error:', error);
    return reply.status(400).send({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to database',
    });
  }
}

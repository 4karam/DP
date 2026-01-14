import { FastifyInstance } from 'fastify';
import { setupTestApp, teardownTestApp } from './setup';

describe('Health and Connection Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  describe('GET /api/health', () => {
    it('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
      expect(body.timestamp).toBeDefined();
    });

    it('should include database connection status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      const body = JSON.parse(response.body);
      expect(body.database).toBeDefined();
      expect(body.database.connected).toBe(true);
    });

    it('should include service information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      const body = JSON.parse(response.body);
      expect(body.service).toBeDefined();
      expect(body.service.name).toBe('excel-to-postgres-backend');
      expect(body.service.version).toBeDefined();
    });

    it('should respond quickly', async () => {
      const startTime = Date.now();

      await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Health check should respond in less than 100ms
      expect(responseTime).toBeLessThan(100);
    });

    it('should handle multiple concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        app.inject({
          method: 'GET',
          url: '/api/health',
        })
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.status).toBe('healthy');
      });
    });
  });

  describe('POST /api/testConnection', () => {
    it('should successfully test valid database connection', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/testConnection',
        payload: {
          databaseUrl: process.env.DATABASE_URL,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Database connection successful');
    });

    it('should reject connection with invalid host', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/testConnection',
        payload: {
          databaseUrl: 'postgresql://user:password@invalid-host:5432/db',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('should reject connection with invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/testConnection',
        payload: {
          databaseUrl: 'postgresql://invalid_user:invalid_pass@localhost:5432/excel_import',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('should reject connection with invalid database name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/testConnection',
        payload: {
          databaseUrl: 'postgresql://excel_user:excel_password@localhost:5432/non_existent_db',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('should reject malformed connection strings', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/testConnection',
        payload: {
          databaseUrl: 'not-a-valid-connection-string',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('should reject empty connection string', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/testConnection',
        payload: {
          databaseUrl: '',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should reject missing connection string', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/testConnection',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should properly close test connections', async () => {
      // Make multiple test connections
      const promises = Array.from({ length: 5 }, () =>
        app.inject({
          method: 'POST',
          url: '/api/testConnection',
          payload: {
            databaseUrl: process.env.DATABASE_URL,
          },
        })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach((response) => {
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
      });

      // Wait a bit for connections to close
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Health check should still work (no connection leaks)
      const healthResponse = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(healthResponse.statusCode).toBe(200);
    });

    it('should handle connection timeout gracefully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/testConnection',
        payload: {
          databaseUrl: 'postgresql://user:password@1.2.3.4:5432/db',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    }, 10000); // Increase timeout for this test
  });
});

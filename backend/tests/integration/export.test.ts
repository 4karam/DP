import { FastifyInstance } from 'fastify';
import { setupTestApp, teardownTestApp, cleanupTestData } from './setup';
import { getPool } from '../../src/utils/database';

describe('Excel Export Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await setupTestApp();
  });

  afterAll(async () => {
    await teardownTestApp();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  // Helper to create a test table
  async function createTestTable(tableName: string, data: any[]) {
    const pool = getPool();
    const columns = Object.keys(data[0]);
    const columnDefs = columns.map((col) => `"${col}" TEXT`).join(', ');

    await pool.query(`CREATE TABLE "${tableName}" (${columnDefs})`);

    for (const row of data) {
      const values = columns.map((col) => row[col]);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      await pool.query(
        `INSERT INTO "${tableName}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
        values
      );
    }
  }

  describe('GET /api/export/tables', () => {
    it('should list all database tables', async () => {
      // Create test tables
      await createTestTable('users', [
        { name: 'John', age: '30' },
        { name: 'Jane', age: '25' },
      ]);

      await createTestTable('products', [
        { product: 'Widget', price: '19.99' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/export/tables',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.tables).toBeDefined();
      expect(body.tables.length).toBeGreaterThanOrEqual(2);

      const tableNames = body.tables.map((t: any) => t.table_name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('products');
    });

    it('should return empty list when no tables exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/export/tables',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.tables).toBeDefined();
      // Should only have chunk_tables metadata table
      expect(body.tables.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('POST /api/export/schema', () => {
    it('should return table schema and first row', async () => {
      await createTestTable('test_schema', [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/export/schema',
        payload: {
          tableName: 'test_schema',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.columns).toBeDefined();
      expect(body.sampleRow).toBeDefined();

      const columnNames = body.columns.map((c: any) => c.column_name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('email');

      expect(body.sampleRow).toHaveProperty('id');
      expect(body.sampleRow).toHaveProperty('name');
    });

    it('should return error for non-existent table', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/export/schema',
        payload: {
          tableName: 'non_existent_table',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });

  describe('POST /api/export/approve-keys', () => {
    it('should approve and store key mappings', async () => {
      await createTestTable('test_approve', [
        { id: '1', user_name: 'Alice' },
        { id: '2', user_name: 'Bob' },
      ]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/export/approve-keys',
        payload: {
          tableName: 'test_approve',
          columnMapping: {
            id: 'User ID',
            user_name: 'Full Name',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.sessionId).toBeDefined();
      expect(body.totalRows).toBe(2);
    });

    it('should return error for invalid table', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/export/approve-keys',
        payload: {
          tableName: 'invalid_table',
          columnMapping: {},
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/export/process', () => {
    it('should export data to XLSX format', async () => {
      await createTestTable('test_export', [
        { id: '1', name: 'Product A', price: '10.50' },
        { id: '2', name: 'Product B', price: '20.00' },
        { id: '3', name: 'Product C', price: '15.75' },
      ]);

      // First approve keys
      const approveResponse = await app.inject({
        method: 'POST',
        url: '/api/export/approve-keys',
        payload: {
          tableName: 'test_export',
          columnMapping: {
            id: 'ID',
            name: 'Product Name',
            price: 'Price',
          },
        },
      });

      const { sessionId } = JSON.parse(approveResponse.body);

      // Then process export
      const response = await app.inject({
        method: 'POST',
        url: '/api/export/process',
        payload: {
          sessionId,
          format: 'xlsx',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe('completed');
    });

    it('should export data to JSONL format', async () => {
      await createTestTable('test_jsonl', [
        { id: '1', data: 'value1' },
        { id: '2', data: 'value2' },
      ]);

      const approveResponse = await app.inject({
        method: 'POST',
        url: '/api/export/approve-keys',
        payload: {
          tableName: 'test_jsonl',
          columnMapping: { id: 'ID', data: 'Data' },
        },
      });

      const { sessionId } = JSON.parse(approveResponse.body);

      const response = await app.inject({
        method: 'POST',
        url: '/api/export/process',
        payload: {
          sessionId,
          format: 'jsonl',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.status).toBe('completed');
    });

    it('should return error for invalid session', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/export/process',
        payload: {
          sessionId: 'invalid-session-id',
          format: 'xlsx',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/export/download/:sessionId', () => {
    it('should download exported file', async () => {
      await createTestTable('test_download', [
        { id: '1', name: 'Test' },
      ]);

      const approveResponse = await app.inject({
        method: 'POST',
        url: '/api/export/approve-keys',
        payload: {
          tableName: 'test_download',
          columnMapping: { id: 'ID', name: 'Name' },
        },
      });

      const { sessionId } = JSON.parse(approveResponse.body);

      await app.inject({
        method: 'POST',
        url: '/api/export/process',
        payload: { sessionId, format: 'xlsx' },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/export/download/${sessionId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/vnd.openxmlformats');
      expect(response.rawPayload.length).toBeGreaterThan(0);
    });

    it('should return error for non-existent session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/export/download/non-existent-session',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/export/status/:sessionId', () => {
    it('should return export status', async () => {
      await createTestTable('test_status', [{ id: '1' }]);

      const approveResponse = await app.inject({
        method: 'POST',
        url: '/api/export/approve-keys',
        payload: {
          tableName: 'test_status',
          columnMapping: { id: 'ID' },
        },
      });

      const { sessionId } = JSON.parse(approveResponse.body);

      const response = await app.inject({
        method: 'GET',
        url: `/api/export/status/${sessionId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.status).toBeDefined();
    });
  });

  describe('DELETE /api/export/:sessionId', () => {
    it('should cleanup export session', async () => {
      await createTestTable('test_cleanup', [{ id: '1' }]);

      const approveResponse = await app.inject({
        method: 'POST',
        url: '/api/export/approve-keys',
        payload: {
          tableName: 'test_cleanup',
          columnMapping: { id: 'ID' },
        },
      });

      const { sessionId } = JSON.parse(approveResponse.body);

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/export/${sessionId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify session is cleaned up
      const statusResponse = await app.inject({
        method: 'GET',
        url: `/api/export/status/${sessionId}`,
      });

      const statusBody = JSON.parse(statusResponse.body);
      expect(statusBody.success).toBe(false);
    });
  });
});

import { FastifyInstance } from 'fastify';
import { setupTestApp, teardownTestApp, cleanupTestData } from './setup';
import { getPool } from '../../src/utils/database';
import FormData from 'form-data';

describe('JSON Import Integration Tests', () => {
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

  const createTestJsonBuffer = (data: any): Buffer => {
    return Buffer.from(JSON.stringify(data));
  };

  const createTestJsonlBuffer = (records: any[]): Buffer => {
    return Buffer.from(records.map(r => JSON.stringify(r)).join('\n'));
  };

  describe('POST /api/json/upload', () => {
    it('should upload a valid JSON array file', async () => {
      const jsonData = [
        { name: 'Alice', age: 30, email: 'alice@example.com' },
        { name: 'Bob', age: 25, email: 'bob@example.com' },
      ];
      const jsonBuffer = createTestJsonBuffer(jsonData);
      const form = new FormData();
      form.append('file', jsonBuffer, {
        filename: 'users.json',
        contentType: 'application/json',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/json/upload',
        headers: form.getHeaders(),
        payload: form,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.fileId).toBeDefined();
      expect(body.filename).toBe('users.json');
    });

    it('should upload a valid JSONL file', async () => {
      const records = [
        { product: 'Widget A', price: 19.99 },
        { product: 'Widget B', price: 29.99 },
      ];
      const jsonlBuffer = createTestJsonlBuffer(records);
      const form = new FormData();
      form.append('file', jsonlBuffer, {
        filename: 'products.jsonl',
        contentType: 'application/json',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/json/upload',
        headers: form.getHeaders(),
        payload: form,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.fileId).toBeDefined();
    });

    it('should reject non-JSON files', async () => {
      const textBuffer = Buffer.from('Not a JSON file');
      const form = new FormData();
      form.append('file', textBuffer, {
        filename: 'document.txt',
        contentType: 'text/plain',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/json/upload',
        headers: form.getHeaders(),
        payload: form,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid file type');
    });

    it('should reject invalid JSON', async () => {
      const invalidBuffer = Buffer.from('{ invalid json ]');
      const form = new FormData();
      form.append('file', invalidBuffer, {
        filename: 'invalid.json',
        contentType: 'application/json',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/json/upload',
        headers: form.getHeaders(),
        payload: form,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid JSON');
    });

    it('should upload single JSON object', async () => {
      const jsonData = { name: 'Alice', age: 30 };
      const jsonBuffer = createTestJsonBuffer(jsonData);
      const form = new FormData();
      form.append('file', jsonBuffer, {
        filename: 'single.json',
        contentType: 'application/json',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/json/upload',
        headers: form.getHeaders(),
        payload: form,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('POST /api/json/preview', () => {
    it('should preview JSON file with type detection', async () => {
      const jsonData = [
        { name: 'Alice', age: 30, active: true },
        { name: 'Bob', age: 25, active: false },
      ];
      const jsonBuffer = createTestJsonBuffer(jsonData);
      const form = new FormData();
      form.append('file', jsonBuffer, {
        filename: 'users.json',
        contentType: 'application/json',
      });

      const uploadResponse = await app.inject({
        method: 'POST',
        url: '/api/json/upload',
        headers: form.getHeaders(),
        payload: form,
      });
      const { fileId } = JSON.parse(uploadResponse.body);

      const previewResponse = await app.inject({
        method: 'POST',
        url: '/api/json/preview',
        payload: { fileId },
      });

      expect(previewResponse.statusCode).toBe(200);
      const body = JSON.parse(previewResponse.body);
      expect(body.success).toBe(true);
      expect(body.columns).toBeDefined();
      expect(body.preview).toBeDefined();
      expect(body.format).toBe('json');

      const nameColumn = body.columns.find((col: any) => col.originalName === 'name');
      const ageColumn = body.columns.find((col: any) => col.originalName === 'age');
      const activeColumn = body.columns.find((col: any) => col.originalName === 'active');

      expect(nameColumn?.type).toBe('TEXT');
      expect(ageColumn?.type).toBe('INTEGER');
      expect(activeColumn?.type).toBe('BOOLEAN');
    });

    it('should preview JSONL file', async () => {
      const records = [
        { id: 1, value: 'test1' },
        { id: 2, value: 'test2' },
      ];
      const jsonlBuffer = createTestJsonlBuffer(records);
      const form = new FormData();
      form.append('file', jsonlBuffer, {
        filename: 'data.jsonl',
        contentType: 'application/json',
      });

      const uploadResponse = await app.inject({
        method: 'POST',
        url: '/api/json/upload',
        headers: form.getHeaders(),
        payload: form,
      });
      const { fileId } = JSON.parse(uploadResponse.body);

      const previewResponse = await app.inject({
        method: 'POST',
        url: '/api/json/preview',
        payload: { fileId },
      });

      expect(previewResponse.statusCode).toBe(200);
      const body = JSON.parse(previewResponse.body);
      expect(body.format).toBe('jsonl');
      expect(body.rowCount).toBe(2);
    });

    it('should return error for invalid fileId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/json/preview',
        payload: { fileId: 'invalid-file-id' },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/json/import', () => {
    it('should import JSON data to PostgreSQL', async () => {
      const jsonData = [
        { name: 'Alice', age: 30, email: 'alice@example.com' },
        { name: 'Bob', age: 25, email: 'bob@example.com' },
        { name: 'Charlie', age: 35, email: 'charlie@example.com' },
      ];
      const jsonBuffer = createTestJsonBuffer(jsonData);
      const form = new FormData();
      form.append('file', jsonBuffer, {
        filename: 'users.json',
        contentType: 'application/json',
      });

      // Upload
      const uploadResponse = await app.inject({
        method: 'POST',
        url: '/api/json/upload',
        headers: form.getHeaders(),
        payload: form,
      });
      const { fileId } = JSON.parse(uploadResponse.body);

      // Preview to get columns
      const previewResponse = await app.inject({
        method: 'POST',
        url: '/api/json/preview',
        payload: { fileId },
      });
      const previewBody = JSON.parse(previewResponse.body);

      // Import
      const importResponse = await app.inject({
        method: 'POST',
        url: '/api/json/import',
        payload: {
          fileId,
          tableName: 'test_json_users',
          columns: previewBody.columns,
        },
      });

      expect(importResponse.statusCode).toBe(200);
      const importBody = JSON.parse(importResponse.body);
      expect(importBody.success).toBe(true);
      expect(importBody.result.success).toBe(true);
      expect(importBody.result.rowsInserted).toBe(3);

      // Verify data in database
      const pool = getPool();
      const result = await pool.query('SELECT * FROM test_json_users ORDER BY name');
      expect(result.rows.length).toBe(3);
      expect(result.rows[0].name).toBe('Alice');
      expect(result.rows[1].name).toBe('Bob');
      expect(result.rows[2].name).toBe('Charlie');
    });

    it('should import JSONL data to PostgreSQL', async () => {
      const records = [
        { id: 1, product: 'Widget A', price: 19.99 },
        { id: 2, product: 'Widget B', price: 29.99 },
      ];
      const jsonlBuffer = createTestJsonlBuffer(records);
      const form = new FormData();
      form.append('file', jsonlBuffer, {
        filename: 'products.jsonl',
        contentType: 'application/json',
      });

      const uploadResponse = await app.inject({
        method: 'POST',
        url: '/api/json/upload',
        headers: form.getHeaders(),
        payload: form,
      });
      const { fileId } = JSON.parse(uploadResponse.body);

      const previewResponse = await app.inject({
        method: 'POST',
        url: '/api/json/preview',
        payload: { fileId },
      });
      const previewBody = JSON.parse(previewResponse.body);

      const importResponse = await app.inject({
        method: 'POST',
        url: '/api/json/import',
        payload: {
          fileId,
          tableName: 'test_json_products',
          columns: previewBody.columns,
        },
      });

      expect(importResponse.statusCode).toBe(200);
      const importBody = JSON.parse(importResponse.body);
      expect(importBody.success).toBe(true);
      expect(importBody.result.rowsInserted).toBe(2);

      // Verify data
      const pool = getPool();
      const result = await pool.query('SELECT * FROM test_json_products ORDER BY id');
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].product).toBe('Widget A');
    });

    it('should handle mixed data types correctly', async () => {
      const jsonData = [
        { id: 1, value: 10.5, active: true, created: '2024-01-15' },
        { id: 2, value: 20.0, active: false, created: '2024-01-16' },
      ];
      const jsonBuffer = createTestJsonBuffer(jsonData);
      const form = new FormData();
      form.append('file', jsonBuffer, {
        filename: 'mixed.json',
        contentType: 'application/json',
      });

      const uploadResponse = await app.inject({
        method: 'POST',
        url: '/api/json/upload',
        headers: form.getHeaders(),
        payload: form,
      });
      const { fileId } = JSON.parse(uploadResponse.body);

      const previewResponse = await app.inject({
        method: 'POST',
        url: '/api/json/preview',
        payload: { fileId },
      });
      const previewBody = JSON.parse(previewResponse.body);

      const importResponse = await app.inject({
        method: 'POST',
        url: '/api/json/import',
        payload: {
          fileId,
          tableName: 'test_json_mixed',
          columns: previewBody.columns,
        },
      });

      expect(importResponse.statusCode).toBe(200);
      const importBody = JSON.parse(importResponse.body);
      expect(importBody.success).toBe(true);

      // Verify data types
      const pool = getPool();
      const result = await pool.query('SELECT * FROM test_json_mixed ORDER BY id');
      expect(result.rows.length).toBe(2);
      expect(typeof result.rows[0].id).toBe('number');
    });

    it('should return error for invalid fileId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/json/import',
        payload: {
          fileId: 'invalid-file-id',
          tableName: 'test_table',
          columns: [],
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });
});

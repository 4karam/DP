import { FastifyInstance } from 'fastify';
import { setupTestApp, teardownTestApp, cleanupTestData } from './setup';
import {
  createSimpleUserExcel,
  createMixedTypesExcel,
  createMultiSheetExcel,
} from './fixtures';
import { getPool } from '../../src/utils/database';
import FormData from 'form-data';

describe('Excel Import Integration Tests', () => {
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

  describe('POST /api/upload', () => {
    it('should upload a valid Excel file', async () => {
      const excelBuffer = createSimpleUserExcel();
      const form = new FormData();
      form.append('file', excelBuffer, {
        filename: 'users.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/upload',
        headers: form.getHeaders(),
        payload: form,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.fileId).toBeDefined();
      expect(body.filename).toBe('users.xlsx');
    });

    it('should reject non-Excel files', async () => {
      const textBuffer = Buffer.from('Not an Excel file');
      const form = new FormData();
      form.append('file', textBuffer, {
        filename: 'document.txt',
        contentType: 'text/plain',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/upload',
        headers: form.getHeaders(),
        payload: form,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Invalid file type');
    });

    it('should reject requests without files', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/upload',
        headers: { 'content-type': 'multipart/form-data' },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/preview', () => {
    it('should preview Excel file with type detection', async () => {
      const excelBuffer = createSimpleUserExcel();
      const form = new FormData();
      form.append('file', excelBuffer, {
        filename: 'users.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // First upload the file
      const uploadResponse = await app.inject({
        method: 'POST',
        url: '/api/upload',
        headers: form.getHeaders(),
        payload: form,
      });

      const { fileId } = JSON.parse(uploadResponse.body);

      // Then preview it
      const previewResponse = await app.inject({
        method: 'POST',
        url: '/api/preview',
        payload: { fileId },
      });

      expect(previewResponse.statusCode).toBe(200);
      const body = JSON.parse(previewResponse.body);
      expect(body.success).toBe(true);
      expect(body.sheets).toBeDefined();
      expect(body.sheets.length).toBeGreaterThan(0);

      const firstSheet = body.sheets[0];
      expect(firstSheet.columns).toBeDefined();
      expect(firstSheet.preview).toBeDefined();

      // Check type detection
      const nameColumn = firstSheet.columns.find((col: any) => col.originalName === 'Name');
      const ageColumn = firstSheet.columns.find((col: any) => col.originalName === 'Age');
      const activeColumn = firstSheet.columns.find((col: any) => col.originalName === 'Active');

      expect(nameColumn?.type).toBe('TEXT');
      expect(ageColumn?.type).toBe('INTEGER');
      expect(activeColumn?.type).toBe('BOOLEAN');
    });

    it('should handle multiple sheets', async () => {
      const excelBuffer = createMultiSheetExcel();
      const form = new FormData();
      form.append('file', excelBuffer, {
        filename: 'multi.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const uploadResponse = await app.inject({
        method: 'POST',
        url: '/api/upload',
        headers: form.getHeaders(),
        payload: form,
      });

      const { fileId } = JSON.parse(uploadResponse.body);

      const previewResponse = await app.inject({
        method: 'POST',
        url: '/api/preview',
        payload: { fileId },
      });

      expect(previewResponse.statusCode).toBe(200);
      const body = JSON.parse(previewResponse.body);
      expect(body.sheets.length).toBe(2);
      expect(body.sheets[0].sheetName).toBe('Users');
      expect(body.sheets[1].sheetName).toBe('Products');
    });

    it('should return error for invalid fileId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/preview',
        payload: { fileId: 'invalid-file-id' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/import', () => {
    it('should import Excel data to PostgreSQL', async () => {
      const excelBuffer = createSimpleUserExcel();
      const form = new FormData();
      form.append('file', excelBuffer, {
        filename: 'users.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Upload
      const uploadResponse = await app.inject({
        method: 'POST',
        url: '/api/upload',
        headers: form.getHeaders(),
        payload: form,
      });
      const { fileId } = JSON.parse(uploadResponse.body);

      // Preview to get column structure
      const previewResponse = await app.inject({
        method: 'POST',
        url: '/api/preview',
        payload: { fileId },
      });
      const previewBody = JSON.parse(previewResponse.body);
      const sheet = previewBody.sheets[0];

      // Import
      const importPayload = {
        fileId,
        tables: [
          {
            sheetName: sheet.sheetName,
            tableName: 'test_users',
            columns: sheet.columns,
          },
        ],
      };

      const importResponse = await app.inject({
        method: 'POST',
        url: '/api/import',
        payload: importPayload,
      });

      expect(importResponse.statusCode).toBe(200);
      const importBody = JSON.parse(importResponse.body);
      expect(importBody.success).toBe(true);
      expect(importBody.results).toBeDefined();
      expect(importBody.results[0].success).toBe(true);
      expect(importBody.results[0].rowsInserted).toBe(3);

      // Verify data in database
      const pool = getPool();
      const result = await pool.query('SELECT * FROM test_users ORDER BY name');
      expect(result.rows.length).toBe(3);
      expect(result.rows[0].name).toBe('Bob Johnson');
      expect(result.rows[1].name).toBe('Jane Smith');
      expect(result.rows[2].name).toBe('John Doe');
    });

    it('should handle mixed data types correctly', async () => {
      const excelBuffer = createMixedTypesExcel();
      const form = new FormData();
      form.append('file', excelBuffer, {
        filename: 'products.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const uploadResponse = await app.inject({
        method: 'POST',
        url: '/api/upload',
        headers: form.getHeaders(),
        payload: form,
      });
      const { fileId } = JSON.parse(uploadResponse.body);

      const previewResponse = await app.inject({
        method: 'POST',
        url: '/api/preview',
        payload: { fileId },
      });
      const previewBody = JSON.parse(previewResponse.body);
      const sheet = previewBody.sheets[0];

      const importResponse = await app.inject({
        method: 'POST',
        url: '/api/import',
        payload: {
          fileId,
          tables: [
            {
              sheetName: sheet.sheetName,
              tableName: 'test_products',
              columns: sheet.columns,
            },
          ],
        },
      });

      expect(importResponse.statusCode).toBe(200);
      const importBody = JSON.parse(importResponse.body);
      expect(importBody.success).toBe(true);

      // Verify data types in database
      const pool = getPool();
      const result = await pool.query('SELECT * FROM test_products ORDER BY product');
      expect(result.rows.length).toBe(3);
      expect(typeof result.rows[0].price).toBe('string'); // FLOAT stored as string
      expect(typeof result.rows[0].quantity).toBe('number'); // INTEGER
      expect(result.rows[0].product).toBe('Widget A');
    });

    it('should rollback transaction on error', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/import',
        payload: {
          fileId: 'invalid-file-id',
          tables: [
            {
              sheetName: 'Sheet1',
              tableName: 'test_table',
              columns: [],
            },
          ],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.results[0].success).toBe(false);

      // Verify table was not created
      const pool = getPool();
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM pg_tables
          WHERE schemaname = 'public'
          AND tablename = 'test_table'
        )`
      );
      expect(result.rows[0].exists).toBe(false);
    });
  });

  describe('POST /api/testConnection', () => {
    it('should test valid database connection', async () => {
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
    });

    it('should reject invalid database connection', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/testConnection',
        payload: {
          databaseUrl: 'postgresql://invalid:invalid@localhost:5432/invalid',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });
});

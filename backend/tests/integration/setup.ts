import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from 'dotenv';
import { initializePool, closePool, getPool } from '../../src/utils/database';
import { uploadHandler } from '../../src/routes/upload';
import { previewHandler } from '../../src/routes/preview';
import { importHandler } from '../../src/routes/import';
import { healthHandler } from '../../src/routes/health';
import { testConnectionHandler } from '../../src/routes/testConnection';
import {
  getTablesHandler,
  getSchemaHandler,
  approveKeysHandler,
  processBatchesHandler,
  downloadHandler,
  statusHandler,
  cleanupHandler,
} from '../../src/routes/export';
import {
  getChunkTables,
  createChunkTable,
  insertChunks,
  getChunks,
  getChunkStats,
} from '../../src/routes/documentChunks';
import {
  uploadDocumentHandler,
  chunkDocumentHandler,
  cleanupFileStorage,
} from '../../src/routes/documentProcessor';
import { saveChunksHandler } from '../../src/routes/saveChunks';

// Load test environment variables
config({ path: '.env.test' });

let app: FastifyInstance | null = null;

export async function setupTestApp(): Promise<FastifyInstance> {
  if (app) {
    return app;
  }

  const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://excel_user:excel_password@localhost:5432/excel_import_test';

  // Initialize database pool
  initializePool(DATABASE_URL);

  // Initialize chunk_tables metadata table
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS chunk_tables (
        table_name TEXT PRIMARY KEY,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    client.release();
  }

  // Create Fastify instance
  app = Fastify({
    logger: false, // Disable logging for tests
    bodyLimit: 52428800, // 50MB
  });

  // Register plugins
  await app.register(cors, {
    origin: '*',
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 52428800,
    },
  });

  // Register routes
  app.get('/api/health', healthHandler);
  app.post('/api/upload', uploadHandler);
  app.post('/api/preview', previewHandler);
  app.post('/api/testConnection', testConnectionHandler);
  app.post('/api/import', importHandler);

  // Export endpoints
  app.get('/api/export/tables', getTablesHandler);
  app.post('/api/export/schema', getSchemaHandler);
  app.post('/api/export/approve-keys', approveKeysHandler);
  app.post('/api/export/process', processBatchesHandler);
  app.get('/api/export/download/:sessionId', downloadHandler);
  app.get('/api/export/status/:sessionId', statusHandler);
  app.delete('/api/export/:sessionId', cleanupHandler);

  // Document processing endpoints
  app.post('/api/upload-document', uploadDocumentHandler);
  app.post('/api/chunk-document', chunkDocumentHandler);
  app.post('/api/save-chunks', saveChunksHandler);

  // Document chunks endpoints
  app.get('/api/chunk-tables', getChunkTables);
  app.post('/api/create-chunk-table', createChunkTable);
  app.post('/api/insert-chunks', insertChunks);
  app.get('/api/chunks', getChunks);
  app.get('/api/chunk-stats', getChunkStats);

  return app;
}

export async function teardownTestApp(): Promise<void> {
  if (app) {
    cleanupFileStorage();
    await app.close();
    await closePool();
    app = null;
  }
}

export async function cleanupTestData(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    // Get all tables except system tables and chunk_tables
    const result = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename != 'chunk_tables'
    `);

    // Drop all test tables
    for (const row of result.rows) {
      await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
    }

    // Clear chunk_tables metadata
    await client.query('DELETE FROM chunk_tables');
  } finally {
    client.release();
  }
}

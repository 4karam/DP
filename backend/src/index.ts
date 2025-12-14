import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from 'dotenv';
import { initializePool, closePool } from './utils/database';
import { uploadHandler } from './routes/upload';
import { previewHandler } from './routes/preview';
import { importHandler } from './routes/import';
import { healthHandler } from './routes/health';
import { testConnectionHandler } from './routes/testConnection';
import {
  getTablesHandler,
  getSchemaHandler,
  approveKeysHandler,
  processBatchesHandler,
  downloadHandler,
  statusHandler,
  cleanupHandler,
} from './routes/export';
import {
  getChunkTables,
  createChunkTable,
  insertChunks,
  getChunks,
  getChunkStats,
} from './routes/documentChunks';
import {
  uploadDocumentHandler,
  chunkDocumentHandler,
  cleanupFileStorage,
} from './routes/documentProcessor';
import { saveChunksHandler } from './routes/saveChunks';
import { getPool } from './utils/database';

// Load environment variables
config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Initialize Fastify
const fastify = Fastify({
  logger: true,
  bodyLimit: 52428800, // 50MB
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Multipart/form-data support
  await fastify.register(multipart, {
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10),
    },
  });
}

// Initialize chunk_tables metadata table
async function initializeChunkTables() {
  try {
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
      console.log('✅ chunk_tables metadata table initialized');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('⚠️  Failed to initialize chunk_tables:', error);
    // Non-fatal, continue anyway
  }
}

// Register routes
function registerRoutes() {
  // Health check
  fastify.get('/api/health', healthHandler);

  // Upload Excel file
  fastify.post('/api/upload', uploadHandler);

  // Preview Excel data
  fastify.post('/api/preview', previewHandler);

  // Test database connection
  fastify.post('/api/testConnection', testConnectionHandler);

  // Import to PostgreSQL
  fastify.post('/api/import', importHandler);

  // ========== EXPORT ENDPOINTS ==========
  // Step 1: Get all tables
  fastify.get('/api/export/tables', getTablesHandler);

  // Step 2-3: Get table schema and first row
  fastify.post('/api/export/schema', getSchemaHandler);

  // Step 3 (Approval): Approve and modify keys
  fastify.post('/api/export/approve-keys', approveKeysHandler);

  // Step 4-6: Process batches
  fastify.post('/api/export/process', processBatchesHandler);

  // Step 7: Download file
  fastify.get('/api/export/download/:sessionId', downloadHandler);

  // Status check
  fastify.get('/api/export/status/:sessionId', statusHandler);

  // Cleanup
  fastify.delete('/api/export/:sessionId', cleanupHandler);

  // ========== DOCUMENT PROCESSING ENDPOINTS ==========
  // Upload document
  fastify.post('/api/upload-document', uploadDocumentHandler);

  // Chunk document
  fastify.post('/api/chunk-document', chunkDocumentHandler);

  // Save chunks to database
  fastify.post('/api/save-chunks', saveChunksHandler);

  // ========== DOCUMENT CHUNKS ENDPOINTS ==========
  // Get all chunk tables
  fastify.get('/api/chunk-tables', getChunkTables);

  // Create a new chunk table
  fastify.post('/api/create-chunk-table', createChunkTable);

  // Insert chunks into a table
  fastify.post('/api/insert-chunks', insertChunks);

  // Get chunks from a table with filtering
  fastify.get('/api/chunks', getChunks);

  // Get chunk statistics
  fastify.get('/api/chunk-stats', getChunkStats);
}

// Start server
async function start() {
  try {
    // Initialize database connection pool
    console.log('🔌 Connecting to PostgreSQL...');
    initializePool(DATABASE_URL!);
    console.log('✅ Database connected');

    // Initialize chunk_tables
    await initializeChunkTables();

    // Register plugins and routes
    await registerPlugins();
    registerRoutes();

    // Start listening
    await fastify.listen({ port: PORT, host: HOST });
    
    console.log('');
    console.log('🚀 Server ready!');
    console.log(`📍 API: http://localhost:${PORT}/api`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health`);
    console.log('');
  } catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  console.log('\n🛑 Shutting down gracefully...');

  try {
    // Cleanup file storage
    cleanupFileStorage();
    console.log('✅ File storage cleaned up');

    await fastify.close();
    await closePool();
    console.log('✅ Server closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
start();

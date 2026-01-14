import { FastifyInstance } from 'fastify';
import { setupTestApp, teardownTestApp, cleanupTestData } from './setup';
import { SAMPLE_CHUNKS } from './fixtures';

describe('Chunk Management Integration Tests', () => {
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

  describe('GET /api/chunk-tables', () => {
    it('should list all chunk tables', async () => {
      // Create a couple of chunk tables
      await app.inject({
        method: 'POST',
        url: '/api/create-chunk-table',
        payload: {
          tableName: 'docs_chunks',
          description: 'Document chunks',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/create-chunk-table',
        payload: {
          tableName: 'pdf_chunks',
          description: 'PDF chunks',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/chunk-tables',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.tables).toBeDefined();
      expect(body.tables.length).toBeGreaterThanOrEqual(2);

      const tableNames = body.tables.map((t: any) => t.table_name);
      expect(tableNames).toContain('docs_chunks');
      expect(tableNames).toContain('pdf_chunks');
    });

    it('should return empty list when no chunk tables exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chunk-tables',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.tables).toBeDefined();
      expect(Array.isArray(body.tables)).toBe(true);
    });
  });

  describe('POST /api/create-chunk-table', () => {
    it('should create a new chunk table', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/create-chunk-table',
        payload: {
          tableName: 'new_chunks',
          description: 'A new chunk table for testing',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.tableName).toBe('new_chunks');

      // Verify table was created
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/chunk-tables',
      });

      const listBody = JSON.parse(listResponse.body);
      const tableNames = listBody.tables.map((t: any) => t.table_name);
      expect(tableNames).toContain('new_chunks');
    });

    it('should reject invalid table names', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/create-chunk-table',
        payload: {
          tableName: 'invalid-table-name!',
          description: 'Invalid name',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('should handle duplicate table names', async () => {
      // Create first table
      await app.inject({
        method: 'POST',
        url: '/api/create-chunk-table',
        payload: {
          tableName: 'duplicate_chunks',
          description: 'First table',
        },
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/create-chunk-table',
        payload: {
          tableName: 'duplicate_chunks',
          description: 'Duplicate table',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should create table with all required columns', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/create-chunk-table',
        payload: {
          tableName: 'test_schema_chunks',
          description: 'Testing schema',
        },
      });

      expect(response.statusCode).toBe(200);

      // Insert a test chunk to verify schema
      const insertResponse = await app.inject({
        method: 'POST',
        url: '/api/insert-chunks',
        payload: {
          tableName: 'test_schema_chunks',
          chunks: SAMPLE_CHUNKS,
        },
      });

      expect(insertResponse.statusCode).toBe(200);
    });
  });

  describe('POST /api/insert-chunks', () => {
    beforeEach(async () => {
      // Create a table for insertion tests
      await app.inject({
        method: 'POST',
        url: '/api/create-chunk-table',
        payload: {
          tableName: 'insert_test_chunks',
          description: 'Table for insertion tests',
        },
      });
    });

    it('should insert chunks into table', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/insert-chunks',
        payload: {
          tableName: 'insert_test_chunks',
          chunks: SAMPLE_CHUNKS,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.insertedCount).toBe(SAMPLE_CHUNKS.length);

      // Verify chunks were inserted
      const queryResponse = await app.inject({
        method: 'GET',
        url: '/api/chunks?tableName=insert_test_chunks',
      });

      const queryBody = JSON.parse(queryResponse.body);
      expect(queryBody.chunks.length).toBe(SAMPLE_CHUNKS.length);
    });

    it('should return error for non-existent table', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/insert-chunks',
        payload: {
          tableName: 'non_existent_table',
          chunks: SAMPLE_CHUNKS,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return error for empty chunks array', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/insert-chunks',
        payload: {
          tableName: 'insert_test_chunks',
          chunks: [],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should handle large batch insertions', async () => {
      const largeChunkSet = Array.from({ length: 100 }, (_, i) => ({
        ...SAMPLE_CHUNKS[0],
        chunk_index: i,
        content: `Chunk ${i} content`,
      }));

      const response = await app.inject({
        method: 'POST',
        url: '/api/insert-chunks',
        payload: {
          tableName: 'insert_test_chunks',
          chunks: largeChunkSet,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.insertedCount).toBe(100);
    });
  });

  describe('GET /api/chunks', () => {
    beforeEach(async () => {
      // Create table and insert test chunks
      await app.inject({
        method: 'POST',
        url: '/api/create-chunk-table',
        payload: {
          tableName: 'query_test_chunks',
          description: 'Table for query tests',
        },
      });

      const testChunks = [
        {
          ...SAMPLE_CHUNKS[0],
          chunk_index: 0,
          language: 'english',
          readability_score: 85,
          source_file: 'doc1.txt',
        },
        {
          ...SAMPLE_CHUNKS[1],
          chunk_index: 1,
          language: 'english',
          readability_score: 75,
          source_file: 'doc1.txt',
        },
        {
          ...SAMPLE_CHUNKS[0],
          chunk_index: 2,
          language: 'arabic',
          readability_score: 90,
          source_file: 'doc2.txt',
        },
      ];

      await app.inject({
        method: 'POST',
        url: '/api/insert-chunks',
        payload: {
          tableName: 'query_test_chunks',
          chunks: testChunks,
        },
      });
    });

    it('should query all chunks from table', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chunks?tableName=query_test_chunks',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.chunks).toBeDefined();
      expect(body.chunks.length).toBe(3);
    });

    it('should filter chunks by source file', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chunks?tableName=query_test_chunks&sourceFile=doc1.txt',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.chunks.length).toBe(2);
      expect(body.chunks.every((c: any) => c.source_file === 'doc1.txt')).toBe(true);
    });

    it('should filter chunks by language', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chunks?tableName=query_test_chunks&language=arabic',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.chunks.length).toBe(1);
      expect(body.chunks[0].language).toBe('arabic');
    });

    it('should filter chunks by minimum readability', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chunks?tableName=query_test_chunks&minReadability=80',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.chunks.length).toBe(2);
      expect(body.chunks.every((c: any) => c.readability_score >= 80)).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chunks?tableName=query_test_chunks&sourceFile=doc1.txt&minReadability=80',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.chunks.length).toBe(1);
      expect(body.chunks[0].source_file).toBe('doc1.txt');
      expect(body.chunks[0].readability_score).toBeGreaterThanOrEqual(80);
    });

    it('should apply limit and offset for pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chunks?tableName=query_test_chunks&limit=2&offset=1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.chunks.length).toBe(2);
      expect(body.chunks[0].chunk_index).toBe(1);
    });

    it('should return error for non-existent table', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chunks?tableName=non_existent_table',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('GET /api/chunk-stats', () => {
    beforeEach(async () => {
      // Create table and insert test chunks
      await app.inject({
        method: 'POST',
        url: '/api/create-chunk-table',
        payload: {
          tableName: 'stats_test_chunks',
          description: 'Table for stats tests',
        },
      });

      const testChunks = [
        {
          ...SAMPLE_CHUNKS[0],
          chunk_index: 0,
          language: 'english',
          char_count: 100,
          word_count: 20,
          readability_score: 85,
        },
        {
          ...SAMPLE_CHUNKS[1],
          chunk_index: 1,
          language: 'english',
          char_count: 150,
          word_count: 30,
          readability_score: 75,
        },
        {
          ...SAMPLE_CHUNKS[0],
          chunk_index: 2,
          language: 'arabic',
          char_count: 120,
          word_count: 25,
          readability_score: 90,
        },
      ];

      await app.inject({
        method: 'POST',
        url: '/api/insert-chunks',
        payload: {
          tableName: 'stats_test_chunks',
          chunks: testChunks,
        },
      });
    });

    it('should return chunk statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chunk-stats?tableName=stats_test_chunks',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.stats).toBeDefined();

      // Check statistics structure
      expect(body.stats.totalChunks).toBe(3);
      expect(body.stats.avgCharCount).toBeDefined();
      expect(body.stats.avgWordCount).toBeDefined();
      expect(body.stats.avgReadability).toBeDefined();
      expect(body.stats.languageDistribution).toBeDefined();
    });

    it('should calculate correct averages', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chunk-stats?tableName=stats_test_chunks',
      });

      const body = JSON.parse(response.body);
      const stats = body.stats;

      // Average char count: (100 + 150 + 120) / 3 = 123.33
      expect(stats.avgCharCount).toBeCloseTo(123.33, 1);

      // Average word count: (20 + 30 + 25) / 3 = 25
      expect(stats.avgWordCount).toBeCloseTo(25, 0);

      // Average readability: (85 + 75 + 90) / 3 = 83.33
      expect(stats.avgReadability).toBeCloseTo(83.33, 1);
    });

    it('should return language distribution', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chunk-stats?tableName=stats_test_chunks',
      });

      const body = JSON.parse(response.body);
      const languageDistribution = body.stats.languageDistribution;

      expect(languageDistribution.english).toBe(2);
      expect(languageDistribution.arabic).toBe(1);
    });

    it('should return error for non-existent table', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/chunk-stats?tableName=non_existent_table',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });
});

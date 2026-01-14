import { FastifyInstance } from 'fastify';
import { setupTestApp, teardownTestApp, cleanupTestData } from './setup';
import { SAMPLE_TEXT_DOCUMENT } from './fixtures';
import FormData from 'form-data';

describe('Document Processing Integration Tests', () => {
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

  describe('POST /api/upload-document', () => {
    it('should upload a text document', async () => {
      const textBuffer = Buffer.from(SAMPLE_TEXT_DOCUMENT);
      const form = new FormData();
      form.append('file', textBuffer, {
        filename: 'sample.txt',
        contentType: 'text/plain',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/upload-document',
        headers: form.getHeaders(),
        payload: form,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.fileId).toBeDefined();
      expect(body.filename).toBe('sample.txt');
      expect(body.fileType).toBe('text');
    });

    it('should upload a markdown document', async () => {
      const mdBuffer = Buffer.from(SAMPLE_TEXT_DOCUMENT);
      const form = new FormData();
      form.append('file', mdBuffer, {
        filename: 'sample.md',
        contentType: 'text/markdown',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/upload-document',
        headers: form.getHeaders(),
        payload: form,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.fileType).toBe('text');
    });

    it('should reject unsupported file types', async () => {
      const buffer = Buffer.from('executable content');
      const form = new FormData();
      form.append('file', buffer, {
        filename: 'virus.exe',
        contentType: 'application/x-msdownload',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/upload-document',
        headers: form.getHeaders(),
        payload: form,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toContain('Unsupported file type');
    });

    it('should reject files without proper upload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/upload-document',
        headers: { 'content-type': 'multipart/form-data' },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });

  describe('POST /api/chunk-document', () => {
    let fileId: string;

    beforeEach(async () => {
      // Upload a document first
      const textBuffer = Buffer.from(SAMPLE_TEXT_DOCUMENT);
      const form = new FormData();
      form.append('file', textBuffer, {
        filename: 'sample.txt',
        contentType: 'text/plain',
      });

      const uploadResponse = await app.inject({
        method: 'POST',
        url: '/api/upload-document',
        headers: form.getHeaders(),
        payload: form,
      });

      const uploadBody = JSON.parse(uploadResponse.body);
      fileId = uploadBody.fileId;
    });

    it('should chunk document with character strategy', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chunk-document',
        payload: {
          fileId,
          chunkingConfig: {
            strategy: 'character',
            chunkSize: 200,
            chunkOverlap: 20,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.chunks).toBeDefined();
      expect(body.chunks.length).toBeGreaterThan(0);

      // Verify chunk structure
      const firstChunk = body.chunks[0];
      expect(firstChunk).toHaveProperty('chunk_index');
      expect(firstChunk).toHaveProperty('content');
      expect(firstChunk).toHaveProperty('char_count');
      expect(firstChunk).toHaveProperty('word_count');
      expect(firstChunk).toHaveProperty('language');
      expect(firstChunk).toHaveProperty('readability_score');
    });

    it('should chunk document with recursive strategy', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chunk-document',
        payload: {
          fileId,
          chunkingConfig: {
            strategy: 'recursive',
            chunkSize: 300,
            chunkOverlap: 30,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.chunks).toBeDefined();
      expect(body.chunks.length).toBeGreaterThan(0);
    });

    it('should chunk document with sentence strategy', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chunk-document',
        payload: {
          fileId,
          chunkingConfig: {
            strategy: 'sentence',
            sentencesPerChunk: 3,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.chunks).toBeDefined();
    });

    it('should chunk document with paragraph strategy', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chunk-document',
        payload: {
          fileId,
          chunkingConfig: {
            strategy: 'paragraph',
            paragraphsPerChunk: 2,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.chunks).toBeDefined();
    });

    it('should chunk markdown document with markdown strategy', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chunk-document',
        payload: {
          fileId,
          chunkingConfig: {
            strategy: 'markdown',
            headingLevel: 2,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.chunks).toBeDefined();
    });

    it('should return error for invalid fileId', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chunk-document',
        payload: {
          fileId: 'invalid-file-id',
          chunkingConfig: {
            strategy: 'character',
            chunkSize: 200,
          },
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should include metadata in chunks', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chunk-document',
        payload: {
          fileId,
          chunkingConfig: {
            strategy: 'character',
            chunkSize: 200,
          },
        },
      });

      const body = JSON.parse(response.body);
      const chunk = body.chunks[0];

      // Check all expected metadata fields
      expect(chunk).toHaveProperty('chunk_index');
      expect(chunk).toHaveProperty('content');
      expect(chunk).toHaveProperty('char_count');
      expect(chunk).toHaveProperty('word_count');
      expect(chunk).toHaveProperty('language');
      expect(chunk).toHaveProperty('readability_score');
      expect(chunk).toHaveProperty('has_urls');
      expect(chunk).toHaveProperty('has_numbers');
      expect(chunk).toHaveProperty('url_count');
      expect(chunk).toHaveProperty('number_count');
      expect(chunk).toHaveProperty('source_file');

      // Verify types
      expect(typeof chunk.chunk_index).toBe('number');
      expect(typeof chunk.content).toBe('string');
      expect(typeof chunk.char_count).toBe('number');
      expect(typeof chunk.word_count).toBe('number');
      expect(typeof chunk.readability_score).toBe('number');
      expect(typeof chunk.has_urls).toBe('boolean');
      expect(typeof chunk.has_numbers).toBe('boolean');
    });

    it('should link chunks with prev/next navigation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chunk-document',
        payload: {
          fileId,
          chunkingConfig: {
            strategy: 'character',
            chunkSize: 100,
          },
        },
      });

      const body = JSON.parse(response.body);
      expect(body.chunks.length).toBeGreaterThan(1);

      // First chunk should have no prev but have next
      expect(body.chunks[0].prev_chunk_id).toBeNull();
      expect(body.chunks[0].next_chunk_id).toBeDefined();

      // Middle chunks should have both prev and next
      if (body.chunks.length > 2) {
        const middleChunk = body.chunks[1];
        expect(middleChunk.prev_chunk_id).toBeDefined();
        expect(middleChunk.next_chunk_id).toBeDefined();
      }

      // Last chunk should have prev but no next
      const lastChunk = body.chunks[body.chunks.length - 1];
      expect(lastChunk.prev_chunk_id).toBeDefined();
      expect(lastChunk.next_chunk_id).toBeNull();
    });
  });

  describe('POST /api/save-chunks', () => {
    let fileId: string;
    let chunks: any[];

    beforeEach(async () => {
      // Upload and chunk a document
      const textBuffer = Buffer.from(SAMPLE_TEXT_DOCUMENT);
      const form = new FormData();
      form.append('file', textBuffer, {
        filename: 'sample.txt',
        contentType: 'text/plain',
      });

      const uploadResponse = await app.inject({
        method: 'POST',
        url: '/api/upload-document',
        headers: form.getHeaders(),
        payload: form,
      });

      const uploadBody = JSON.parse(uploadResponse.body);
      fileId = uploadBody.fileId;

      const chunkResponse = await app.inject({
        method: 'POST',
        url: '/api/chunk-document',
        payload: {
          fileId,
          chunkingConfig: {
            strategy: 'character',
            chunkSize: 200,
          },
        },
      });

      const chunkBody = JSON.parse(chunkResponse.body);
      chunks = chunkBody.chunks;
    });

    it('should save chunks to a new table', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/save-chunks',
        payload: {
          chunks,
          storage: {
            type: 'new',
            tableName: 'test_chunks',
            description: 'Test chunks table',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('saved successfully');
    });

    it('should save chunks to an existing table', async () => {
      // First, create a table
      await app.inject({
        method: 'POST',
        url: '/api/create-chunk-table',
        payload: {
          tableName: 'existing_chunks',
          description: 'Existing chunks table',
        },
      });

      // Then save chunks to it
      const response = await app.inject({
        method: 'POST',
        url: '/api/save-chunks',
        payload: {
          chunks,
          storage: {
            type: 'existing',
            tableName: 'existing_chunks',
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return error for invalid chunks', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/save-chunks',
        payload: {
          chunks: [],
          storage: {
            type: 'new',
            tableName: 'empty_chunks',
          },
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });
  });
});

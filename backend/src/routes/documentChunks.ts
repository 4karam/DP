/**
 * Document Chunks Management Routes
 * Handles storage and retrieval of document chunks in PostgreSQL
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getPool } from '../utils/database';
import { Pool, escapeIdentifier } from 'pg';

// Track custom pools for cleanup
const customPools = new Map<string, Pool>();

/**
 * Get a database client - either custom or default
 * Returns both client and pool reference for cleanup
 */
async function getClientWithPool(databaseUrl?: string): Promise<{ client: any; pool: Pool | null }> {
  if (databaseUrl) {
    let pool = customPools.get(databaseUrl);
    if (!pool) {
      pool = new Pool({ connectionString: databaseUrl });
      customPools.set(databaseUrl, pool);
    }
    return { client: await pool.connect(), pool };
  }
  return { client: await getPool().connect(), pool: null };
}

/**
 * Get all available chunk tables
 */
export async function getChunkTables(
  request: FastifyRequest<{
    Querystring: { databaseUrl?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { databaseUrl } = request.query;
    const { client, pool } = await getClientWithPool(databaseUrl);

    try {
      const result = await client.query(`
        SELECT
          table_name as id,
          table_name as name,
          table_catalog as description,
          NOW() as created_at,
          NOW() as updated_at
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'chunks_%'
        ORDER BY table_name DESC
      `);

      const tables = result.rows.map((row: any) => ({
        ...row,
        chunkCount: 0, // Will be fetched separately if needed
      }));

      return reply.send({
        success: true,
        data: tables,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching chunk tables:', error);

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch chunk tables',
        details: (error as Error).message,
      },
    });
  }
}

/**
 * Create a new chunk table
 */
export async function createChunkTable(
  request: FastifyRequest<{
    Body: { tableName: string; description?: string; databaseUrl?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { tableName, description, databaseUrl } = request.body;

    if (!tableName) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MISSING_TABLE_NAME',
          message: 'tableName is required',
        },
      });
    }

    // Sanitize table name
    const sanitizedName = tableName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .substring(0, 63);

    const escapedName = escapeIdentifier(sanitizedName);
    const escapedIdx1 = escapeIdentifier(`idx_${sanitizedName}_file_id`);
    const escapedIdx2 = escapeIdentifier(`idx_${sanitizedName}_language`);
    const escapedIdx3 = escapeIdentifier(`idx_${sanitizedName}_chunk_index`);

    const { client, pool } = await getClientWithPool(databaseUrl);

    try {
      await client.query('BEGIN');

      // Create chunks table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${escapedName} (
          id SERIAL PRIMARY KEY,
          chunk_index INTEGER NOT NULL,
          chunk_text TEXT NOT NULL,
          character_count INTEGER,
          word_count INTEGER,
          splitting_method VARCHAR(50),
          file_name VARCHAR(255),
          file_id UUID,
          page_number INTEGER,
          language VARCHAR(50),
          has_arabic BOOLEAN DEFAULT FALSE,
          has_latin BOOLEAN DEFAULT FALSE,
          contains_urls BOOLEAN DEFAULT FALSE,
          contains_numbers BOOLEAN DEFAULT FALSE,
          readability_score NUMERIC(5,2),
          confidence NUMERIC(5,2),
          metadata_json JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes for common queries
        CREATE INDEX IF NOT EXISTS ${escapedIdx1} ON ${escapedName}(file_id);
        CREATE INDEX IF NOT EXISTS ${escapedIdx2} ON ${escapedName}(language);
        CREATE INDEX IF NOT EXISTS ${escapedIdx3} ON ${escapedName}(chunk_index);
      `);

      // Store metadata about the table
      await client.query(
        `
        INSERT INTO chunk_tables (table_name, description, created_at, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (table_name) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      `,
        [sanitizedName, description || `Chunk table for ${sanitizedName}`]
      );

      await client.query('COMMIT');

      return reply.status(201).send({
        success: true,
        data: {
          tableId: sanitizedName,
          tableName: sanitizedName,
          message: `Table ${sanitizedName} created successfully`,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating chunk table:', error);

    return reply.status(500).send({
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: 'Failed to create chunk table',
        details: (error as Error).message,
      },
    });
  }
}

/**
 * Insert chunks into a table
 */
export async function insertChunks(
  request: FastifyRequest<{
    Body: {
      tableId: string;
      tableName: string;
      chunks: Array<{
        chunk_index: number;
        chunk_text: string;
        character_count: number;
        word_count: number;
        splitting_method: string;
        file_name: string;
        file_id: string;
        page_number?: number;
        language?: string;
        has_arabic?: boolean;
        has_latin?: boolean;
        contains_urls?: boolean;
        contains_numbers?: boolean;
        readability_score?: number;
        confidence?: number;
        metadata_json?: string;
      }>;
      databaseUrl?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { tableId, tableName, chunks, databaseUrl } = request.body;

    if (!tableId || !chunks || chunks.length === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Missing tableId or chunks',
        },
      });
    }

    const escapedTableId = escapeIdentifier(tableId);
    const { client, pool } = await getClientWithPool(databaseUrl);

    try {
      await client.query('BEGIN');

      let insertedCount = 0;

      for (const chunk of chunks) {
        await client.query(
          `
          INSERT INTO ${escapedTableId} (
            chunk_index, chunk_text, character_count, word_count,
            splitting_method, file_name, file_id, page_number,
            language, has_arabic, has_latin, contains_urls, contains_numbers,
            readability_score, confidence, metadata_json
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `,
          [
            chunk.chunk_index,
            chunk.chunk_text,
            chunk.character_count,
            chunk.word_count,
            chunk.splitting_method,
            chunk.file_name,
            chunk.file_id,
            chunk.page_number || null,
            chunk.language || null,
            chunk.has_arabic || false,
            chunk.has_latin || false,
            chunk.contains_urls || false,
            chunk.contains_numbers || false,
            chunk.readability_score || null,
            chunk.confidence || null,
            chunk.metadata_json || null,
          ]
        );

        insertedCount++;
      }

      await client.query('COMMIT');

      return reply.status(200).send({
        success: true,
        data: {
          tableId,
          tableName,
          insertedChunks: insertedCount,
          totalChunks: chunks.length,
          message: `Successfully inserted ${insertedCount} chunks into ${tableName}`,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error inserting chunks:', error);

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INSERT_FAILED',
        message: 'Failed to insert chunks',
        details: (error as Error).message,
      },
    });
  }
}

/**
 * Get chunks from a table with filtering
 */
export async function getChunks(
  request: FastifyRequest<{
    Querystring: {
      tableId: string;
      fileId?: string;
      language?: string;
      limit?: string;
      offset?: string;
      databaseUrl?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { tableId, fileId, language, limit = '50', offset = '0', databaseUrl } =
      request.query;

    if (!tableId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MISSING_TABLE_ID',
          message: 'tableId is required',
        },
      });
    }

    const escapedTableId = escapeIdentifier(tableId);
    const { client, pool } = await getClientWithPool(databaseUrl);

    try {
      let query = `SELECT * FROM ${escapedTableId} WHERE 1=1`;
      const params: any[] = [];

      if (fileId) {
        params.push(fileId);
        query += ` AND file_id = $${params.length}`;
      }

      if (language) {
        params.push(language);
        query += ` AND language = $${params.length}`;
      }

      query += ` ORDER BY chunk_index ASC LIMIT $${params.length + 1} OFFSET $${
        params.length + 2
      }`;

      params.push(parseInt(limit), parseInt(offset));

      const result = await client.query(query, params);

      return reply.send({
        success: true,
        data: {
          chunks: result.rows,
          count: result.rows.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching chunks:', error);

    return reply.status(500).send({
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch chunks',
        details: (error as Error).message,
      },
    });
  }
}

/**
 * Get chunk statistics
 */
export async function getChunkStats(
  request: FastifyRequest<{
    Querystring: { tableId: string; databaseUrl?: string };
  }>,
  reply: FastifyReply
) {
  try {
    const { tableId, databaseUrl } = request.query;

    if (!tableId) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'MISSING_TABLE_ID',
          message: 'tableId is required',
        },
      });
    }

    const escapedTableId = escapeIdentifier(tableId);
    const { client, pool } = await getClientWithPool(databaseUrl);

    try {
      const result = await client.query(`
        SELECT
          COUNT(*) as total_chunks,
          SUM(character_count) as total_characters,
          SUM(word_count) as total_words,
          AVG(character_count) as avg_chunk_size,
          AVG(word_count) as avg_word_count,
          COUNT(DISTINCT file_id) as files_processed,
          COUNT(DISTINCT language) as languages_count,
          SUM(CASE WHEN has_arabic THEN 1 ELSE 0 END) as arabic_chunks,
          SUM(CASE WHEN has_latin THEN 1 ELSE 0 END) as latin_chunks,
          AVG(readability_score) as avg_readability
        FROM ${escapedTableId}
      `);

      return reply.send({
        success: true,
        data: result.rows[0],
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching statistics:', error);

    return reply.status(500).send({
      success: false,
      error: {
        code: 'STATS_FAILED',
        message: 'Failed to fetch statistics',
        details: (error as Error).message,
      },
    });
  }
}

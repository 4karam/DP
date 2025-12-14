/**
 * Save Chunks Route
 * Handles saving document chunks to database
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { Pool, escapeIdentifier } from 'pg';
import { getPool } from '../utils/database';

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
 * Save chunks to database
 */
export async function saveChunksHandler(
  request: FastifyRequest<{
    Body: {
      fileId: string;
      fileName: string;
      chunks: Array<{
        index: number;
        text: string;
        characterCount: number;
        wordCount: number;
        metadata: any;
      }>;
      storageMode: 'new_table' | 'existing_table';
      customTableName?: string;
      projectId?: string;
      databaseUrl?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { fileId, fileName, chunks, storageMode, customTableName, projectId, databaseUrl } = request.body;

    if (!chunks || chunks.length === 0) {
      return reply.status(400).send({
        error: 'No chunks provided',
      });
    }

    const { client, pool } = await getClientWithPool(databaseUrl);

    try {
      let tableName: string;
      let escapedTableName: string;

      if (storageMode === 'new_table') {
        if (!customTableName) {
          return reply.status(400).send({
            error: 'customTableName is required for new_table mode',
          });
        }

        // Sanitize table name
        tableName = `chunks_${customTableName.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 55)}`;
        escapedTableName = escapeIdentifier(tableName);

        // Create table if it doesn't exist
        await client.query('BEGIN');

        await client.query(`
          CREATE TABLE IF NOT EXISTS ${escapedTableName} (
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

          CREATE INDEX IF NOT EXISTS ${escapeIdentifier(`idx_${tableName}_file_id`)} ON ${escapedTableName}(file_id);
          CREATE INDEX IF NOT EXISTS ${escapeIdentifier(`idx_${tableName}_language`)} ON ${escapedTableName}(language);
          CREATE INDEX IF NOT EXISTS ${escapeIdentifier(`idx_${tableName}_chunk_index`)} ON ${escapedTableName}(chunk_index);
        `);

        await client.query('COMMIT');
      } else {
        if (!projectId) {
          return reply.status(400).send({
            error: 'projectId is required for existing_table mode',
          });
        }
        tableName = projectId;
        escapedTableName = escapeIdentifier(projectId);
      }

      // Insert chunks
      await client.query('BEGIN');

      for (const chunk of chunks) {
        await client.query(
          `
          INSERT INTO ${escapedTableName} (
            chunk_index, chunk_text, character_count, word_count,
            splitting_method, file_name, file_id, metadata_json
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
          [
            chunk.index,
            chunk.text,
            chunk.characterCount,
            chunk.wordCount,
            chunk.metadata?.splittingMethod || 'unknown',
            chunk.metadata?.fileName || fileName,
            chunk.metadata?.fileId || fileId,
            JSON.stringify(chunk.metadata),
          ]
        );
      }

      await client.query('COMMIT');

      return reply.send({
        success: true,
        data: {
          tableId: tableName,
          tableName,
          savedChunks: chunks.length,
          totalChunks: chunks.length,
          message: `Successfully saved ${chunks.length} chunks to ${tableName}`,
        },
      });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving chunks:', error);
    return reply.status(500).send({
      error: 'Failed to save chunks',
      details: (error as Error).message,
    });
  }
}

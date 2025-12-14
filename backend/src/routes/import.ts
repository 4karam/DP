import { FastifyRequest, FastifyReply } from 'fastify';
import { getFile, deleteFile } from '../utils/fileStorage';
import { importMultipleSheets, TableConfig } from '../services/importService';

interface ImportRequest {
  Body: {
    fileId: string;
    tables: TableConfig[];
    databaseUrl?: string;
  };
}

export async function importHandler(
  request: FastifyRequest<ImportRequest>,
  reply: FastifyReply
) {
  try {
    const { fileId, tables, databaseUrl } = request.body;

    // Validate input
    if (!fileId) {
      return reply.status(400).send({
        success: false,
        error: 'fileId is required',
      });
    }

    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return reply.status(400).send({
        success: false,
        error: 'tables array is required and must not be empty',
      });
    }

    // Validate each table configuration
    for (const table of tables) {
      if (!table.tableName || !table.sheetName || !table.columns) {
        return reply.status(400).send({
          success: false,
          error: 'Each table must have tableName, sheetName, and columns',
        });
      }

      if (!Array.isArray(table.columns) || table.columns.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Each table must have at least one column',
        });
      }
    }

    // Get file from storage
    const buffer = getFile(fileId);

    if (!buffer) {
      return reply.status(404).send({
        success: false,
        error: 'File not found or expired',
      });
    }

    // Import sheets
    const results = await importMultipleSheets(buffer, tables, databaseUrl);

    // Clean up file after import
    deleteFile(fileId);

    // Check if any imports failed
    const failedImports = results.filter(r => !r.success);
    const successfulImports = results.filter(r => r.success);

    return reply.send({
      success: failedImports.length === 0,
      results,
      summary: {
        total: results.length,
        successful: successfulImports.length,
        failed: failedImports.length,
        totalRowsInserted: successfulImports.reduce((sum, r) => sum + r.rowsInserted, 0),
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to import data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

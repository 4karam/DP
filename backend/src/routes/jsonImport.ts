import { FastifyRequest, FastifyReply } from 'fastify';
import { getFile, deleteFile } from '../utils/fileStorage';
import { ImportService, TableConfig } from '../services/importService';
import { getJsonData } from '../utils/jsonParser';
import { ColumnInfo } from '../utils/excelParser';

interface JsonImportRequest {
  Body: {
    fileId: string;
    tableName: string;
    columns: ColumnInfo[];
    databaseUrl?: string;
  };
}

/**
 * Handle JSON file import to PostgreSQL
 */
export async function jsonImportHandler(
  request: FastifyRequest<JsonImportRequest>,
  reply: FastifyReply
) {
  try {
    const { fileId, tableName, columns, databaseUrl } = request.body;

    // Validate input
    if (!fileId) {
      return reply.status(400).send({
        success: false,
        error: 'fileId is required',
      });
    }

    if (!tableName) {
      return reply.status(400).send({
        success: false,
        error: 'tableName is required',
      });
    }

    if (!columns || columns.length === 0) {
      return reply.status(400).send({
        success: false,
        error: 'columns are required',
      });
    }

    // Get file from storage
    const buffer = getFile(fileId);

    if (!buffer) {
      return reply.status(404).send({
        success: false,
        error: 'File not found or expired',
      });
    }

    // Get selected column indices
    const selectedColumns = columns
      .map(col => col.columnIndex)
      .filter((idx): idx is number => idx !== undefined);

    // Import data using the ImportService
    const importService = new ImportService();

    // Create a mock buffer with the JSON data in a format the import service can handle
    // We'll use the existing import service by creating a table config
    const tableConfig: TableConfig = {
      sheetName: 'json_data', // Dummy sheet name
      tableName,
      columns,
    };

    // Create a temporary "Excel-like" buffer
    // We'll convert JSON data to the format expected by importService
    const result = await importService.importJsonData(
      buffer,
      tableConfig,
      selectedColumns,
      databaseUrl
    );

    // Clean up file
    deleteFile(fileId);

    return reply.send({
      success: true,
      result: {
        tableName: result.tableName,
        rowsInserted: result.rowsInserted,
        success: result.success,
        error: result.error,
      },
    });
  } catch (error) {
    console.error('JSON import error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to import JSON data',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

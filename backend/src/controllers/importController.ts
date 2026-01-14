import { FastifyRequest, FastifyReply } from 'fastify';
import { storeFile, getFile, deleteFile } from '../utils/fileStorage';
import { ImportService, TableConfig } from '../services/importService';

interface ImportRequest {
    Body: {
        fileId: string;
        tables: TableConfig[];
        databaseUrl?: string;
    };
}

export class ImportController {
    private service: ImportService;

    constructor() {
        this.service = new ImportService();
    }

    /**
     * Handle file upload request
     */
    async uploadFile(request: FastifyRequest, reply: FastifyReply) {
        try {
            // Get uploaded file
            const data = await request.file();

            if (!data) {
                return reply.status(400).send({
                    success: false,
                    error: 'No file uploaded',
                });
            }

            // Validate file type
            const filename = data.filename;
            const validExtensions = ['.xlsx', '.xls', '.xlsm'];
            const hasValidExtension = validExtensions.some(ext =>
                filename.toLowerCase().endsWith(ext)
            );

            if (!hasValidExtension) {
                return reply.status(400).send({
                    success: false,
                    error: 'Invalid file type. Please upload an Excel file (.xlsx, .xls, or .xlsm)',
                });
            }

            // Read file buffer
            const buffer = await data.toBuffer();

            // Validate file size (max 50MB)
            const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10);
            if (buffer.length > maxSize) {
                return reply.status(400).send({
                    success: false,
                    error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
                });
            }

            // Store file
            const fileId = await storeFile(buffer, filename);

            return reply.send({
                success: true,
                fileId,
                filename,
                size: buffer.length,
            });
        } catch (error) {
            console.error('Upload error:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to upload file',
                details: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Handle data import request
     */
    async importData(request: FastifyRequest<ImportRequest>, reply: FastifyReply) {
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
            const results = await this.service.importMultipleSheets(buffer, tables, databaseUrl);

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
}

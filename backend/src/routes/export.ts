import { FastifyRequest, FastifyReply } from 'fastify';
import * as fs from 'fs';
import {
  getAllTables,
  getTableSchema,
  createExportSession,
  updateSessionKeys,
  processBatches,
  generateDownloadLink,
  getExportSummary,
  getSession,
  getExportFile,
  cleanupSession,
  ExportSession,
} from '../services/exportService';

/**
 * ============================================================================
 * STEP 1: Get all available tables
 * ============================================================================
 * Endpoint: GET /api/export/tables
 * Description: Retrieve list of all tables in database
 * Response: { success: boolean, tables: string[], message: string }
 */
export async function getTablesHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🚀 STEP 1: GET /api/export/tables');
    console.log('═══════════════════════════════════════════════════════════');

    const tables = await getAllTables();

    return reply.send({
      success: true,
      tables,
      message: `Found ${tables.length} table(s) available for export`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in getTablesHandler:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve tables',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * ============================================================================
 * STEP 2-3: Get table schema and first row (default keys)
 * ============================================================================
 * Endpoint: POST /api/export/schema
 * Body: { tableName: string }
 * Description: Get schema and first row from table
 * Response: { success: boolean, sessionId: string, columns: string[], firstRow: object, modifiedKeys: object }
 */
export async function getSchemaHandler(
  request: FastifyRequest<{
    Body: {
      tableName: string;
      format?: 'jsonl' | 'excel';
    };
  }>,
  reply: FastifyReply
) {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🚀 STEP 2-3: POST /api/export/schema');
    console.log('═══════════════════════════════════════════════════════════');

    const { tableName, format = 'jsonl' } = request.body;

    // Validate input
    if (!tableName || typeof tableName !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'tableName is required and must be a string',
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch schema and first row
    const { columns, firstRow } = await getTableSchema(tableName);

    // Create export session with format
    const session = createExportSession(tableName, columns, format);

    console.log(`\n📋 Session Created`);
    console.log(`   Session ID: ${session.sessionId}`);
    console.log(`   Table: ${tableName}`);
    console.log(`   Format: ${format}`);
    console.log(`   Columns: ${columns.join(', ')}`);
    console.log(`   Default Keys: ${JSON.stringify(session.modifiedKeys)}`);

    return reply.send({
      success: true,
      sessionId: session.sessionId,
      tableName,
      columns,
      firstRow,
      modifiedKeys: session.modifiedKeys,
      message: 'Schema retrieved successfully. Please review and modify keys if needed.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in getSchemaHandler:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve schema',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * ============================================================================
 * STEP 3 (APPROVAL): Approve and update keys
 * ============================================================================
 * Endpoint: POST /api/export/approve-keys
 * Body: { sessionId: string, modifiedKeys: Record<string, string> }
 * Description: User confirms the keys and starts batch processing
 * Response: { success: boolean, sessionId: string, status: string }
 */
export async function approveKeysHandler(
  request: FastifyRequest<{
    Body: {
      sessionId: string;
      modifiedKeys: Record<string, string>;
      excludedColumns?: string[];
      format?: 'jsonl' | 'excel';
    };
  }>,
  reply: FastifyReply
) {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🚀 STEP 3 (APPROVAL): POST /api/export/approve-keys');
    console.log('═══════════════════════════════════════════════════════════');

    const { sessionId, modifiedKeys, excludedColumns = [], format } = request.body;

    // Validate input
    if (!sessionId || typeof sessionId !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'sessionId is required and must be a string',
        timestamp: new Date().toISOString(),
      });
    }

    if (!modifiedKeys || typeof modifiedKeys !== 'object') {
      return reply.status(400).send({
        success: false,
        error: 'modifiedKeys is required and must be an object',
        timestamp: new Date().toISOString(),
      });
    }

    // Update session with approved keys, excluded columns, and format
    const session = updateSessionKeys(sessionId, modifiedKeys, excludedColumns, format);

    console.log(`\n✅ Keys Approved`);
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Format: ${session.format}`);
    console.log(`   Modified Keys: ${JSON.stringify(modifiedKeys)}`);
    console.log(`   Excluded Columns: ${excludedColumns.length > 0 ? excludedColumns.join(', ') : 'None'}`);

    return reply.send({
      success: true,
      sessionId,
      status: session.status,
      message: 'Keys approved. Ready to start batch processing.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in approveKeysHandler:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to approve keys',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * ============================================================================
 * STEP 4-6: Process batches
 * ============================================================================
 * Endpoint: POST /api/export/process
 * Body: { sessionId: string }
 * Description: Start batch processing and return final summary
 * Response: { success: boolean, summary: ExportSummary }
 */
export async function processBatchesHandler(
  request: FastifyRequest<{
    Body: {
      sessionId: string;
      format?: 'jsonl' | 'excel';
    };
  }>,
  reply: FastifyReply
) {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🚀 STEP 4-6: POST /api/export/process');
    console.log('═══════════════════════════════════════════════════════════');

    const { sessionId, format } = request.body;

    // Validate input
    if (!sessionId || typeof sessionId !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'sessionId is required and must be a string',
        timestamp: new Date().toISOString(),
      });
    }

    // Get session
    const session = getSession(sessionId);

    // Verify keys were approved
    if (session.status !== 'keys_approved') {
      return reply.status(400).send({
        success: false,
        error: `Cannot process: Session status is ${session.status}. Keys must be approved first.`,
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`\n🔄 Starting batch processing (format: ${format || session.format})...`);

    // Process batches with progress tracking
    await processBatches(sessionId, (updatedSession) => {
      const progress = (
        (updatedSession.processedRows / updatedSession.totalRows) *
        100
      ).toFixed(2);
      console.log(`   Progress: ${progress}% (${updatedSession.processedRows}/${updatedSession.totalRows})`);
    });

    // Generate summary
    const summary = getExportSummary(sessionId);

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`✅ EXPORT COMPLETED SUCCESSFULLY (${session.format.toUpperCase()})`);
    console.log(`═══════════════════════════════════════════════════════════`);

    return reply.send({
      success: true,
      summary,
      message: 'Export completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in processBatchesHandler:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to process batches',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * ============================================================================
 * STEP 7: Download the exported file
 * ============================================================================
 * Endpoint: GET /api/export/download/:sessionId
 * Description: Download the exported JSONL file
 * Response: JSONL file binary
 */
export async function downloadHandler(
  request: FastifyRequest<{
    Params: {
      sessionId: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🚀 STEP 7: GET /api/export/download/:sessionId');
    console.log('═══════════════════════════════════════════════════════════');

    const { sessionId } = request.params;

    if (!sessionId || typeof sessionId !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'sessionId is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Get session
    const session = getSession(sessionId);

    if (session.status !== 'completed') {
      return reply.status(400).send({
        success: false,
        error: `Cannot download: Export status is ${session.status}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Get file buffer
    const fileBuffer = getExportFile(sessionId);

    // Determine file extension and content type based on format
    const extension = session.format === 'excel' ? 'xlsx' : 'jsonl';
    const contentType = session.format === 'excel'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/jsonl';

    // Send file
    const filename = `${session.tableName}_${sessionId}.${extension}`;
    console.log(`\n📥 Sending download...`);
    console.log(`   Filename: ${filename}`);
    console.log(`   Format: ${session.format}`);
    console.log(`   Size: ${fileBuffer.length} bytes`);

    reply.header('Content-Type', contentType);
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);

    return reply.send(fileBuffer);
  } catch (error) {
    console.error('❌ Error in downloadHandler:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to download file',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * ============================================================================
 * STATUS: Get current export session status
 * ============================================================================
 * Endpoint: GET /api/export/status/:sessionId
 * Description: Get the current status of an export session
 * Response: { success: boolean, session: ExportSession }
 */
export async function statusHandler(
  request: FastifyRequest<{
    Params: {
      sessionId: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🚀 GET /api/export/status/:sessionId');
    console.log('═══════════════════════════════════════════════════════════');

    const { sessionId } = request.params;

    if (!sessionId || typeof sessionId !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'sessionId is required',
        timestamp: new Date().toISOString(),
      });
    }

    const session = getSession(sessionId);

    const progress = session.totalRows > 0
      ? ((session.processedRows / session.totalRows) * 100).toFixed(2)
      : '0.00';

    return reply.send({
      success: true,
      sessionId,
      session,
      progress: `${progress}%`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in statusHandler:', error);
    return reply.status(404).send({
      success: false,
      error: 'Session not found',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * ============================================================================
 * CLEANUP: Cancel and cleanup export session
 * ============================================================================
 * Endpoint: DELETE /api/export/:sessionId
 * Description: Cancel export and cleanup files
 * Response: { success: boolean, message: string }
 */
export async function cleanupHandler(
  request: FastifyRequest<{
    Params: {
      sessionId: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🚀 DELETE /api/export/:sessionId');
    console.log('═══════════════════════════════════════════════════════════');

    const { sessionId } = request.params;

    if (!sessionId || typeof sessionId !== 'string') {
      return reply.status(400).send({
        success: false,
        error: 'sessionId is required',
        timestamp: new Date().toISOString(),
      });
    }

    cleanupSession(sessionId);

    return reply.send({
      success: true,
      sessionId,
      message: 'Session cleaned up successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error in cleanupHandler:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to cleanup session',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

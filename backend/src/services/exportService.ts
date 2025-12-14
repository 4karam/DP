import { PoolClient } from 'pg';
import { withClient, getPool } from '../utils/database';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

/**
 * Step 1: Retrieve list of all tables from database
 */
export async function getAllTables(): Promise<string[]> {
  console.log('[STEP 1] 📋 Retrieving list of tables from database...');

  try {
    const result = await withClient(async (client) => {
      const query = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name ASC
      `;
      return await client.query(query);
    });

    const tables = result.rows.map(row => row.table_name);
    console.log(`✅ [STEP 1 COMPLETE] Found ${tables.length} table(s): ${tables.join(', ')}`);

    return tables;
  } catch (error) {
    console.error('❌ [STEP 1 FAILED] Error retrieving tables:', error);
    throw new Error(`Failed to retrieve tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Step 2 & 3: Fetch first row (default keys) from selected table
 */
export async function getTableSchema(tableName: string): Promise<{
  columns: string[];
  firstRow: Record<string, any>;
}> {
  console.log(`[STEP 2-3] 🔑 Fetching table schema and first row from "${tableName}"...`);

  try {
    return await withClient(async (client) => {
      // Get column information
      const columnsQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        ORDER BY ordinal_position ASC
      `;

      const columnsResult = await client.query(columnsQuery, [tableName]);
      const columns = columnsResult.rows.map(row => row.column_name);

      // Fetch first row (excluding id and created_at)
      const dataColumns = columns.filter(col => col !== 'id' && col !== 'created_at');
      const firstRowQuery = `
        SELECT ${dataColumns.map(col => `"${col}"`).join(', ')}
        FROM "${tableName}"
        LIMIT 1
      `;

      const firstRowResult = await client.query(firstRowQuery);
      const firstRow = firstRowResult.rows[0] || {};

      console.log(`✅ [STEP 2-3 COMPLETE] Retrieved schema with ${columns.length} columns and first row`);

      return {
        columns: dataColumns,
        firstRow,
      };
    });
  } catch (error) {
    console.error(`❌ [STEP 2-3 FAILED] Error fetching schema for table "${tableName}":`, error);
    throw new Error(`Failed to fetch schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export session to track state during export process
 */
export interface ExportSession {
  sessionId: string;
  tableName: string;
  totalRows: number;
  processedRows: number;
  batchesProcessed: number;
  modifiedKeys: Record<string, string>; // Original key -> Modified key mapping
  excludedColumns: string[]; // Columns to exclude from export
  outputFilePath: string;
  format: 'jsonl' | 'excel';
  createdAt: Date;
  status: 'schema_retrieved' | 'keys_approved' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// In-memory session storage (in production, use Redis or database)
const exportSessions = new Map<string, ExportSession>();

/**
 * Create new export session with table schema
 */
export function createExportSession(tableName: string, defaultKeys: string[], format: 'jsonl' | 'excel' = 'jsonl'): ExportSession {
  console.log(`[STEP 3] 🎯 Creating export session for table "${tableName}"...`);

  const sessionId = uuidv4();
  const modifiedKeys: Record<string, string> = {};

  defaultKeys.forEach(key => {
    modifiedKeys[key] = key;
  });

  const tmpDir = path.join(process.cwd(), 'tmp', 'exports');

  // Create tmp directory if it doesn't exist
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const extension = format === 'excel' ? 'xlsx' : 'jsonl';
  const session: ExportSession = {
    sessionId,
    tableName,
    totalRows: 0,
    processedRows: 0,
    batchesProcessed: 0,
    modifiedKeys,
    excludedColumns: [],
    outputFilePath: path.join(tmpDir, `${sessionId}.${extension}`),
    format,
    createdAt: new Date(),
    status: 'schema_retrieved',
  };

  exportSessions.set(sessionId, session);
  console.log(`✅ [STEP 3 COMPLETE] Session created: ${sessionId} (format: ${format})`);

  return session;
}

/**
 * Update keys and format for export session
 */
export function updateSessionKeys(sessionId: string, modifiedKeys: Record<string, string>, excludedColumns: string[] = [], format?: 'jsonl' | 'excel'): ExportSession {
  console.log(`[STEP 3-APPROVED] 🔐 Updating keys for session "${sessionId}"...`);

  const session = exportSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  session.modifiedKeys = modifiedKeys;
  session.excludedColumns = excludedColumns;
  if (format && format !== session.format) {
    console.log(`   Format updated: ${session.format} → ${format}`);
    session.format = format;

    // Update output file path to match new format
    const tmpDir = path.dirname(session.outputFilePath);
    const newExtension = format === 'excel' ? 'xlsx' : 'jsonl';
    session.outputFilePath = path.join(tmpDir, `${session.sessionId}.${newExtension}`);
    console.log(`   Output file path updated: ${session.outputFilePath}`);
  }
  session.status = 'keys_approved';

  console.log(`✅ [STEP 3-APPROVED COMPLETE] Keys updated successfully`);

  return session;
}

/**
 * Generate Excel file from array of rows
 */
async function generateExcelFile(session: ExportSession, rows: Record<string, any>[]): Promise<void> {
  console.log(`[EXCEL] 📊 Generating Excel file from ${rows.length} rows...`);

  try {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Convert rows to worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, session.tableName.substring(0, 31)); // Excel sheet names max 31 chars

    // Write to file
    XLSX.writeFile(workbook, session.outputFilePath);

    console.log(`✅ [EXCEL] Excel file generated successfully: ${session.outputFilePath}`);
  } catch (error) {
    console.error(`❌ [EXCEL] Error generating Excel file:`, error);
    throw new Error(`Failed to generate Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Step 4-6: Fetch and process data in batches
 */
export async function processBatches(
  sessionId: string,
  onProgress?: (session: ExportSession) => void
): Promise<ExportSession> {
  const session = exportSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  console.log(`[STEP 4-6] 📦 Starting batch processing for session "${sessionId}"...`);

  try {
    session.status = 'processing';

    return await withClient(async (client) => {
      // Get total row count
      const countQuery = `SELECT COUNT(*) as count FROM "${session.tableName}"`;
      const countResult = await client.query(countQuery);
      session.totalRows = parseInt(countResult.rows[0].count, 10);

      console.log(`[STEP 4] 🔢 Total rows to process: ${session.totalRows}`);

      // Get column names
      const columnsQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name NOT IN ('id', 'created_at')
        ORDER BY ordinal_position ASC
      `;

      const columnsResult = await client.query(columnsQuery, [session.tableName]);
      let columns = columnsResult.rows.map(row => row.column_name);

      // Filter out excluded columns
      columns = columns.filter(col => !session.excludedColumns.includes(col));

      console.log(`[STEP 4] 📝 Columns to export: ${columns.join(', ')}`);
      if (session.excludedColumns.length > 0) {
        console.log(`[STEP 4] 🚫 Excluded columns: ${session.excludedColumns.join(', ')}`);
      }

      // Store rows in memory for Excel export
      const allRows: Record<string, any>[] = [];

      // For JSONL format, use file stream
      const writeStream = session.format === 'jsonl' ? fs.createWriteStream(session.outputFilePath, { flags: 'w' }) : null;

      const batchSize = 1000;
      let offset = 0;

      // Process batches
      while (offset < session.totalRows) {
        console.log(`[STEP 5] ⚙️ Processing batch ${session.batchesProcessed + 1}...`);

        const dataQuery = `
          SELECT ${columns.map(col => `"${col}"`).join(', ')}
          FROM "${session.tableName}"
          OFFSET $1
          LIMIT $2
        `;

        const batchResult = await client.query(dataQuery, [offset, batchSize]);
        const batchRows = batchResult.rows;

        // Process each row in batch
        for (const row of batchRows) {
          const jsonObject: Record<string, any> = {};

          // Map original column names to modified keys
          columns.forEach((colName) => {
            const modifiedKey = session.modifiedKeys[colName] || colName;
            jsonObject[modifiedKey] = row[colName];
          });

          if (session.format === 'jsonl' && writeStream) {
            // Write to JSONL file (one JSON object per line)
            writeStream.write(JSON.stringify(jsonObject) + '\n');
          } else if (session.format === 'excel') {
            // Store rows for Excel export
            allRows.push(jsonObject);
          }

          session.processedRows++;
        }

        session.batchesProcessed++;
        offset += batchSize;

        // Call progress callback
        if (onProgress) {
          onProgress(session);
        }

        console.log(
          `✅ Batch ${session.batchesProcessed} complete | Processed: ${session.processedRows}/${session.totalRows} rows`
        );
      }

      // Handle format-specific finalization
      if (session.format === 'jsonl' && writeStream) {
        // Close JSONL write stream
        await new Promise<void>((resolve, reject) => {
          writeStream.end(() => resolve());
          writeStream.on('error', reject);
        });
      } else if (session.format === 'excel') {
        // Generate Excel file
        await generateExcelFile(session, allRows);
      }

      console.log(`✅ [STEP 6 COMPLETE] All batches processed and written to file`);

      session.status = 'completed';
      return session;
    });
  } catch (error) {
    session.status = 'failed';
    session.error = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ [STEP 4-6 FAILED] Error processing batches:`, error);
    throw error;
  }
}

/**
 * Step 7: Generate download link (return as blob URL)
 */
export function generateDownloadLink(sessionId: string): { downloadUrl: string; filename: string } {
  const session = exportSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (session.status !== 'completed') {
    throw new Error(`Cannot download: Export status is ${session.status}`);
  }

  console.log(`[STEP 7] 📥 Generating download link for session "${sessionId}"...`);

  const extension = session.format === 'excel' ? 'xlsx' : 'jsonl';
  const filename = `${session.tableName}_${session.sessionId}.${extension}`;
  const downloadUrl = `/api/export/download/${sessionId}`;

  console.log(`✅ [STEP 7 COMPLETE] Download link generated: ${downloadUrl}`);

  return { downloadUrl, filename };
}

/**
 * Get file buffer for download
 */
export function getExportFile(sessionId: string): Buffer {
  const session = exportSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  if (!fs.existsSync(session.outputFilePath)) {
    throw new Error(`Export file not found: ${sessionId}`);
  }

  return fs.readFileSync(session.outputFilePath);
}

/**
 * Step 8: Return final API response
 */
export function getExportSummary(sessionId: string): {
  sessionId: string;
  tableName: string;
  totalRows: number;
  processedRows: number;
  batchesProcessed: number;
  fileSize: number;
  downloadLink: string;
  filename: string;
  status: string;
  completionTime: string;
} {
  const session = exportSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const fileSize = fs.existsSync(session.outputFilePath)
    ? fs.statSync(session.outputFilePath).size
    : 0;

  const { downloadUrl, filename } = generateDownloadLink(sessionId);
  const completionTime = new Date(session.createdAt).toISOString();

  console.log(`[STEP 8] 📊 Generating final response...`);
  console.log(`✅ [STEP 8 COMPLETE] Export Summary:`);
  console.log(`   - Table: ${session.tableName}`);
  console.log(`   - Total Rows: ${session.totalRows}`);
  console.log(`   - Processed Rows: ${session.processedRows}`);
  console.log(`   - Batches: ${session.batchesProcessed}`);
  console.log(`   - File Size: ${fileSize} bytes`);

  return {
    sessionId,
    tableName: session.tableName,
    totalRows: session.totalRows,
    processedRows: session.processedRows,
    batchesProcessed: session.batchesProcessed,
    fileSize,
    downloadLink: downloadUrl,
    filename,
    status: session.status,
    completionTime,
  };
}

/**
 * Get session details
 */
export function getSession(sessionId: string): ExportSession {
  const session = exportSessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  return session;
}

/**
 * Cleanup session and files
 */
export function cleanupSession(sessionId: string): void {
  const session = exportSessions.get(sessionId);
  if (!session) {
    return;
  }

  // Delete file if exists
  if (fs.existsSync(session.outputFilePath)) {
    fs.unlinkSync(session.outputFilePath);
  }

  // Remove session from memory
  exportSessions.delete(sessionId);
  console.log(`🗑️  Session cleaned up: ${sessionId}`);
}

/**
 * Cleanup old sessions (older than 1 hour)
 */
export function cleanupOldSessions(): void {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  for (const [sessionId, session] of exportSessions.entries()) {
    if (now - session.createdAt.getTime() > maxAge) {
      cleanupSession(sessionId);
    }
  }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldSessions, 30 * 60 * 1000);

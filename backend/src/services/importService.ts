import { Pool, PoolClient } from 'pg';
import { withClient, getPool } from '../utils/database';
import { ColumnInfo, ColumnType, convertValue, getSheetData } from '../utils/excelParser';

export interface TableConfig {
  tableName: string;
  sheetName: string;
  columns: ColumnInfo[];
}

export interface ImportResult {
  tableName: string;
  rowsInserted: number;
  success: boolean;
  error?: string;
}

/**
 * Sanitize table name for PostgreSQL
 */
function sanitizeTableName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^[0-9]/, 't_$&')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 63) || 'table';
}

/**
 * Get PostgreSQL type string
 */
function getPgType(type: ColumnType): string {
  switch (type) {
    case 'TEXT':
      return 'TEXT';
    case 'INTEGER':
      return 'INTEGER';
    case 'FLOAT':
      return 'DOUBLE PRECISION';
    case 'BOOLEAN':
      return 'BOOLEAN';
    case 'DATE':
      return 'DATE';
    case 'TIMESTAMP':
      return 'TIMESTAMP';
    default:
      return 'TEXT';
  }
}

/**
 * Check if table exists
 */
async function tableExists(client: PoolClient, tableName: string): Promise<boolean> {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )`,
    [tableName]
  );
  return result.rows[0].exists;
}

/**
 * Create table in PostgreSQL
 */
async function createTable(
  client: PoolClient,
  tableName: string,
  columns: ColumnInfo[]
): Promise<void> {
  const sanitizedTableName = sanitizeTableName(tableName);
  
  // Drop table if exists
  await client.query(`DROP TABLE IF EXISTS "${sanitizedTableName}" CASCADE`);

  // Build CREATE TABLE statement
  const columnDefs = columns.map(col => {
    return `"${col.name}" ${getPgType(col.type)}`;
  }).join(', ');

  const createTableSQL = `
    CREATE TABLE "${sanitizedTableName}" (
      id SERIAL PRIMARY KEY,
      ${columnDefs},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await client.query(createTableSQL);
}

/**
 * Check if a row is completely empty (all values are null after conversion)
 */
function isRowCompletelyEmpty(row: any[], columns: ColumnInfo[]): boolean {
  return columns.every((col, index) => {
    const rawValue = row[index];
    return rawValue === null || rawValue === undefined || rawValue === '';
  });
}

/**
 * Bulk insert data into table
 */
async function bulkInsertData(
  client: PoolClient,
  tableName: string,
  columns: ColumnInfo[],
  data: any[][]
): Promise<number> {
  const sanitizedTableName = sanitizeTableName(tableName);
  const batchSize = 1000;
  let totalInserted = 0;

  // Filter out completely empty rows
  const filteredData = data.filter(row => !isRowCompletelyEmpty(row, columns));

  // Process in batches for performance
  for (let i = 0; i < filteredData.length; i += batchSize) {
    const batch = filteredData.slice(i, i + batchSize);

    if (batch.length === 0) continue;

    // Build parameterized INSERT statement
    const columnNames = columns.map(col => `"${col.name}"`).join(', ');
    const values: any[] = [];
    const valuePlaceholders: string[] = [];

    batch.forEach((row, rowIndex) => {
      const rowPlaceholders: string[] = [];

      columns.forEach((col, colIndex) => {
        const rawValue = row[colIndex];
        const convertedValue = convertValue(rawValue, col.type);
        values.push(convertedValue);
        rowPlaceholders.push(`$${values.length}`);
      });

      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    });

    const insertSQL = `
      INSERT INTO "${sanitizedTableName}" (${columnNames})
      VALUES ${valuePlaceholders.join(', ')}
    `;

    await client.query(insertSQL, values);
    totalInserted += batch.length;
  }

  return totalInserted;
}

/**
 * Import sheet data into PostgreSQL table
 */
export async function importSheet(
  fileBuffer: Buffer,
  config: TableConfig,
  customDatabaseUrl?: string
): Promise<ImportResult> {
  try {
    // Use custom pool if database URL is provided, otherwise use default pool
    const pool = customDatabaseUrl ? new Pool({ connectionString: customDatabaseUrl }) : getPool();

    return await (customDatabaseUrl
      ? (async () => {
          const client = await pool.connect();
          try {
            return await executeImport(client, fileBuffer, config);
          } finally {
            client.release();
            await pool.end();
          }
        })()
      : withClient((client) => executeImport(client, fileBuffer, config))
    );
  } catch (error) {
    return {
      tableName: sanitizeTableName(config.tableName),
      rowsInserted: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute the actual import logic
 */
async function executeImport(
  client: PoolClient,
  fileBuffer: Buffer,
  config: TableConfig
): Promise<ImportResult> {
  const sanitizedTableName = sanitizeTableName(config.tableName);

  // Start transaction
  await client.query('BEGIN');

  try {
    // Create table
    await createTable(client, config.tableName, config.columns);

    // Get sheet data using column indices from config
    // Extract the original column indices for selected columns
    const columnIndices = config.columns
      .map(col => col.columnIndex !== undefined ? col.columnIndex : -1)
      .filter(idx => idx !== -1);

    const sheetData = getSheetData(
      fileBuffer,
      config.sheetName,
      columnIndices.length > 0 ? columnIndices : undefined
    );

    // Insert data
    const rowsInserted = await bulkInsertData(
      client,
      config.tableName,
      config.columns,
      sheetData
    );

    // Commit transaction
    await client.query('COMMIT');

    return {
      tableName: sanitizedTableName,
      rowsInserted,
      success: true,
    };
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    throw error;
  }
}

/**
 * Import multiple sheets
 */
export async function importMultipleSheets(
  fileBuffer: Buffer,
  configs: TableConfig[],
  customDatabaseUrl?: string
): Promise<ImportResult[]> {
  const results: ImportResult[] = [];

  for (const config of configs) {
    const result = await importSheet(fileBuffer, config, customDatabaseUrl);
    results.push(result);
  }

  return results;
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    return await withClient(async (client) => {
      await client.query('SELECT 1');
      return true;
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

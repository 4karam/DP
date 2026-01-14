import { Pool, PoolClient } from 'pg';
import { withClient, getPool } from '../utils/database';
import { ColumnInfo, getSheetData } from '../utils/excelParser';
import { ImportRepository, TableConfig } from '../repositories/importRepository';
import { getJsonData } from '../utils/jsonParser';

// Re-export TableConfig for consumers
export { TableConfig };

export interface ImportResult {
  tableName: string;
  rowsInserted: number;
  success: boolean;
  error?: string;
}

export class ImportService {
  private repository: ImportRepository;

  constructor() {
    this.repository = new ImportRepository();
  }

  /**
   * Import sheet data into PostgreSQL table
   */
  async importSheet(
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
            return await this.executeImport(client, fileBuffer, config);
          } finally {
            client.release();
            await pool.end();
          }
        })()
        : withClient((client) => this.executeImport(client, fileBuffer, config))
      );
    } catch (error) {
      return {
        tableName: config.tableName, // Note: Repository usually sanitizes this, but we return original here on error
        rowsInserted: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute the actual import logic
   */
  private async executeImport(
    client: PoolClient,
    fileBuffer: Buffer,
    config: TableConfig
  ): Promise<ImportResult> {
    // Start transaction
    await client.query('BEGIN');

    try {
      // Create table
      await this.repository.createTable(client, config.tableName, config.columns);

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
      const rowsInserted = await this.repository.bulkInsertData(
        client,
        config.tableName,
        config.columns,
        sheetData
      );

      // Commit transaction
      await client.query('COMMIT');

      return {
        tableName: config.tableName,
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
  async importMultipleSheets(
    fileBuffer: Buffer,
    configs: TableConfig[],
    customDatabaseUrl?: string
  ): Promise<ImportResult[]> {
    const results: ImportResult[] = [];

    for (const config of configs) {
      const result = await this.importSheet(fileBuffer, config, customDatabaseUrl);
      results.push(result);
    }

    return results;
  }

  /**
   * Import JSON data into PostgreSQL table
   */
  async importJsonData(
    fileBuffer: Buffer,
    config: TableConfig,
    selectedColumns?: number[],
    customDatabaseUrl?: string
  ): Promise<ImportResult> {
    try {
      // Use custom pool if database URL is provided, otherwise use default pool
      const pool = customDatabaseUrl ? new Pool({ connectionString: customDatabaseUrl }) : getPool();

      return await (customDatabaseUrl
        ? (async () => {
          const client = await pool.connect();
          try {
            return await this.executeJsonImport(client, fileBuffer, config, selectedColumns);
          } finally {
            client.release();
            await pool.end();
          }
        })()
        : withClient((client) => this.executeJsonImport(client, fileBuffer, config, selectedColumns))
      );
    } catch (error) {
      return {
        tableName: config.tableName,
        rowsInserted: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute the actual JSON import logic
   */
  private async executeJsonImport(
    client: PoolClient,
    fileBuffer: Buffer,
    config: TableConfig,
    selectedColumns?: number[]
  ): Promise<ImportResult> {
    // Start transaction
    await client.query('BEGIN');

    try {
      // Create table
      await this.repository.createTable(client, config.tableName, config.columns);

      // Get JSON data
      const jsonData = getJsonData(fileBuffer, selectedColumns);

      // Insert data
      const rowsInserted = await this.repository.bulkInsertData(
        client,
        config.tableName,
        config.columns,
        jsonData
      );

      // Commit transaction
      await client.query('COMMIT');

      return {
        tableName: config.tableName,
        rowsInserted,
        success: true,
      };
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      throw error;
    }
  }
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

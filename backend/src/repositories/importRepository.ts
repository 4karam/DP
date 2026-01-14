import { PoolClient } from 'pg';
import { ColumnInfo, ColumnType, convertValue } from '../utils/excelParser';

export interface TableConfig {
    tableName: string;
    sheetName: string;
    columns: ColumnInfo[];
}

export class ImportRepository {
    /**
     * Sanitize table name for PostgreSQL
     */
    private sanitizeTableName(name: string): string {
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
    private getPgType(type: ColumnType): string {
        switch (type) {
            case 'TEXT': return 'TEXT';
            case 'INTEGER': return 'INTEGER';
            case 'FLOAT': return 'DOUBLE PRECISION';
            case 'BOOLEAN': return 'BOOLEAN';
            case 'DATE': return 'DATE';
            case 'TIMESTAMP': return 'TIMESTAMP';
            default: return 'TEXT';
        }
    }

    /**
     * Check if table exists
     */
    async tableExists(client: PoolClient, tableName: string): Promise<boolean> {
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
    async createTable(
        client: PoolClient,
        tableName: string,
        columns: ColumnInfo[]
    ): Promise<void> {
        const sanitizedTableName = this.sanitizeTableName(tableName);

        // Drop table if exists
        await client.query(`DROP TABLE IF EXISTS "${sanitizedTableName}" CASCADE`);

        // Build CREATE TABLE statement
        const columnDefs = columns.map(col => {
            return `"${col.name}" ${this.getPgType(col.type)}`;
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
    private isRowCompletelyEmpty(row: any[], columns: ColumnInfo[]): boolean {
        return columns.every((col, index) => {
            const rawValue = row[index];
            return rawValue === null || rawValue === undefined || rawValue === '';
        });
    }

    /**
     * Bulk insert data into table
     */
    async bulkInsertData(
        client: PoolClient,
        tableName: string,
        columns: ColumnInfo[],
        data: any[][]
    ): Promise<number> {
        const sanitizedTableName = this.sanitizeTableName(tableName);
        const batchSize = 1000;
        let totalInserted = 0;

        // Filter out completely empty rows
        const filteredData = data.filter(row => !this.isRowCompletelyEmpty(row, columns));

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
}

import { ColumnType, ColumnInfo, sanitizeColumnName, detectColumnType } from './excelParser';

export interface JsonPreview {
  columns: ColumnInfo[];
  sampleData: any[][];
  rowCount: number;
  format: 'json' | 'jsonl';
}

export interface JsonData {
  preview: JsonPreview;
}

/**
 * Parse JSON file (supports both JSON array and JSONL format)
 */
export function parseJsonFile(buffer: Buffer): JsonData {
  const content = buffer.toString('utf-8');

  let records: any[];
  let format: 'json' | 'jsonl' = 'json';

  try {
    // Try parsing as JSON array first
    const parsed = JSON.parse(content);

    if (Array.isArray(parsed)) {
      records = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      // Single object, wrap in array
      records = [parsed];
    } else {
      throw new Error('JSON must be an array of objects or a single object');
    }
  } catch (jsonError) {
    // Try parsing as JSONL (JSON Lines)
    try {
      const lines = content.trim().split('\n').filter(line => line.trim());
      records = lines.map(line => JSON.parse(line));
      format = 'jsonl';
    } catch (jsonlError) {
      throw new Error('Invalid JSON format. Must be either JSON array or JSONL (one JSON object per line)');
    }
  }

  if (records.length === 0) {
    throw new Error('JSON file contains no records');
  }

  // Validate all records are objects
  if (!records.every(record => typeof record === 'object' && record !== null && !Array.isArray(record))) {
    throw new Error('All records must be objects (key-value pairs)');
  }

  // Extract all unique column names from all records
  const columnNamesSet = new Set<string>();
  records.forEach(record => {
    Object.keys(record).forEach(key => columnNamesSet.add(key));
  });

  const columnNames = Array.from(columnNamesSet);

  if (columnNames.length === 0) {
    throw new Error('No columns found in JSON data');
  }

  // Detect types for each column
  const columns: ColumnInfo[] = columnNames.map((originalName, index) => {
    const columnValues = records.map(record => record[originalName]);
    const type = detectColumnType(columnValues);
    const name = sanitizeColumnName(originalName);

    return {
      name,
      originalName,
      type,
      columnIndex: index,
    };
  });

  // Get sample data (first 10 rows)
  const sampleData = records.slice(0, 10).map(record => {
    return columnNames.map(colName => {
      const value = record[colName];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return value;
    });
  });

  return {
    preview: {
      columns,
      sampleData,
      rowCount: records.length,
      format,
    },
  };
}

/**
 * Get all data from JSON file for import
 */
export function getJsonData(
  buffer: Buffer,
  selectedColumns?: number[]
): any[][] {
  const content = buffer.toString('utf-8');

  let records: any[];

  try {
    // Try parsing as JSON array first
    const parsed = JSON.parse(content);
    records = Array.isArray(parsed) ? parsed : [parsed];
  } catch (jsonError) {
    // Try parsing as JSONL
    const lines = content.trim().split('\n').filter(line => line.trim());
    records = lines.map(line => JSON.parse(line));
  }

  // Get all column names
  const columnNamesSet = new Set<string>();
  records.forEach(record => {
    Object.keys(record).forEach(key => columnNamesSet.add(key));
  });
  const allColumnNames = Array.from(columnNamesSet);

  // Filter columns if specified
  const columnNames = selectedColumns
    ? selectedColumns.map(idx => allColumnNames[idx]).filter(Boolean)
    : allColumnNames;

  // Convert to 2D array
  return records.map(record => {
    return columnNames.map(colName => {
      const value = record[colName];
      if (value === null || value === undefined) return null;
      if (typeof value === 'object') return JSON.stringify(value);
      return value;
    });
  });
}

/**
 * Validate JSON file structure
 */
export function validateJsonFile(buffer: Buffer): { valid: boolean; error?: string } {
  try {
    parseJsonFile(buffer);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON file',
    };
  }
}

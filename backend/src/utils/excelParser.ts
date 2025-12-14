import * as XLSX from 'xlsx';

export type ColumnType = 'TEXT' | 'INTEGER' | 'FLOAT' | 'BOOLEAN' | 'DATE' | 'TIMESTAMP';

export interface ColumnInfo {
  name: string;
  type: ColumnType;
  originalName: string;
  columnIndex?: number;
}

export interface SheetPreview {
  name: string;
  columns: ColumnInfo[];
  sampleData: any[][];
  rowCount: number;
}

export interface ExcelData {
  sheets: SheetPreview[];
}

/**
 * Sanitize column name to be PostgreSQL-safe
 */
export function sanitizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 63) || 'column';
}

/**
 * Detect the most appropriate PostgreSQL type for a column
 */
export function detectColumnType(values: any[]): ColumnType {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (nonNullValues.length === 0) {
    return 'TEXT';
  }

  // Sample up to 1000 values for performance
  const sample = nonNullValues.slice(0, 1000);
  
  // Check if all values are boolean
  const booleanCount = sample.filter(v => 
    typeof v === 'boolean' || 
    (typeof v === 'string' && ['true', 'false', 'yes', 'no', '1', '0'].includes(v.toLowerCase()))
  ).length;
  
  if (booleanCount === sample.length) {
    return 'BOOLEAN';
  }

  // Check if all values are dates
  const dateCount = sample.filter(v => {
    if (v instanceof Date) return true;
    if (typeof v === 'number' && v > 25569 && v < 60000) return true; // Excel date serial
    if (typeof v === 'string') {
      const dateTest = new Date(v);
      return !isNaN(dateTest.getTime()) && v.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/);
    }
    return false;
  }).length;

  if (dateCount === sample.length && dateCount > 0) {
    // Check if any have time components
    const hasTime = sample.some(v => {
      if (v instanceof Date) return v.getHours() !== 0 || v.getMinutes() !== 0 || v.getSeconds() !== 0;
      if (typeof v === 'string') return v.includes(':');
      return false;
    });
    return hasTime ? 'TIMESTAMP' : 'DATE';
  }

  // Check if all values are integers
  const integerCount = sample.filter(v => {
    if (typeof v === 'number') return Number.isInteger(v);
    if (typeof v === 'string') return /^-?\d+$/.test(v.trim());
    return false;
  }).length;

  if (integerCount === sample.length) {
    return 'INTEGER';
  }

  // Check if all values are floats
  const floatCount = sample.filter(v => {
    if (typeof v === 'number') return !isNaN(v);
    if (typeof v === 'string') return /^-?\d*\.?\d+([eE][-+]?\d+)?$/.test(v.trim());
    return false;
  }).length;

  if (floatCount === sample.length) {
    return 'FLOAT';
  }

  // Default to TEXT
  return 'TEXT';
}

/**
 * Check if a row is completely empty (all cells are null or empty strings)
 */
function isRowEmpty(row: any[]): boolean {
  return row.every(cell => cell === null || cell === undefined || cell === '');
}

/**
 * Find non-empty columns in the dataset
 */
function findNonEmptyColumns(data: any[][], headers: any[]): number[] {
  const nonEmptyColumns: Set<number> = new Set();

  // Check headers
  headers.forEach((header, index) => {
    if (header !== null && header !== undefined && header !== '') {
      nonEmptyColumns.add(index);
    }
  });

  // Check data rows for any non-empty cells
  data.forEach(row => {
    row.forEach((cell, index) => {
      if (cell !== null && cell !== undefined && cell !== '') {
        nonEmptyColumns.add(index);
      }
    });
  });

  return Array.from(nonEmptyColumns).sort((a, b) => a - b);
}

/**
 * Filter row to only include non-empty columns
 */
function filterRowColumns(row: any[], columnIndices: number[]): any[] {
  return columnIndices.map(index => row[index] !== undefined ? row[index] : null);
}

/**
 * Parse Excel file and return structured data with type detection
 */
export function parseExcelFile(buffer: Buffer): ExcelData {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets: SheetPreview[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      raw: false
    });

    if (jsonData.length === 0) {
      continue; // Skip empty sheets
    }

    // First row is assumed to be headers
    let headers = jsonData[0];
    let dataRows = jsonData.slice(1);

    if (!headers || headers.length === 0) {
      continue; // Skip sheets without headers
    }

    // Filter out completely empty trailing rows
    while (dataRows.length > 0 && isRowEmpty(dataRows[dataRows.length - 1])) {
      dataRows.pop();
    }

    // Find columns that have at least some non-empty values
    const nonEmptyColumnIndices = findNonEmptyColumns([headers, ...dataRows], headers);

    if (nonEmptyColumnIndices.length === 0) {
      continue; // Skip sheets with no actual data
    }

    // Filter headers and data rows to only include non-empty columns
    headers = filterRowColumns(headers, nonEmptyColumnIndices);
    dataRows = dataRows.map(row => filterRowColumns(row, nonEmptyColumnIndices));

    // Detect column types
    const columns: ColumnInfo[] = headers.map((header, index) => {
      const columnValues = dataRows.map(row => row[index]);
      const detectedType = detectColumnType(columnValues);
      const originalName = String(header || `column_${index + 1}`);
      const originalColumnIndex = nonEmptyColumnIndices[index];

      return {
        name: sanitizeColumnName(originalName),
        type: detectedType,
        originalName,
        columnIndex: originalColumnIndex,
      };
    });

    // Ensure unique column names
    const nameCount: Record<string, number> = {};
    columns.forEach(col => {
      if (nameCount[col.name]) {
        nameCount[col.name]++;
        col.name = `${col.name}_${nameCount[col.name]}`;
      } else {
        nameCount[col.name] = 1;
      }
    });

    // Get sample data (first 10 rows)
    const sampleData = dataRows.slice(0, 10);

    sheets.push({
      name: sheetName,
      columns,
      sampleData,
      rowCount: dataRows.length,
    });
  }

  return { sheets };
}

/**
 * Convert value to appropriate type for PostgreSQL insertion
 */
export function convertValue(value: any, targetType: ColumnType): any {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  try {
    switch (targetType) {
      case 'INTEGER':
        const intValue = typeof value === 'string' ? parseInt(value.trim(), 10) : Number(value);
        return isNaN(intValue) ? null : Math.floor(intValue);

      case 'FLOAT':
        const floatValue = typeof value === 'string' ? parseFloat(value.trim()) : Number(value);
        return isNaN(floatValue) ? null : floatValue;

      case 'BOOLEAN':
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
          const lower = value.toLowerCase().trim();
          return ['true', 'yes', '1', 't', 'y'].includes(lower);
        }
        return Boolean(value);

      case 'DATE':
      case 'TIMESTAMP':
        if (value instanceof Date) return value;
        if (typeof value === 'number' && value > 25569 && value < 60000) {
          // Excel date serial number
          const date = new Date((value - 25569) * 86400 * 1000);
          return date;
        }
        const parsedDate = new Date(value);
        return isNaN(parsedDate.getTime()) ? null : parsedDate;

      case 'TEXT':
      default:
        return String(value);
    }
  } catch (error) {
    return null;
  }
}

/**
 * Read Excel file and get full data for import
 */
export function getSheetData(buffer: Buffer, sheetName: string, columnIndices?: number[], columnNames?: string[]): any[][] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    raw: false
  });

  let headers = jsonData[0];
  let dataRows = jsonData.slice(1);

  // Filter out completely empty trailing rows
  while (dataRows.length > 0 && isRowEmpty(dataRows[dataRows.length - 1])) {
    dataRows.pop();
  }

  // If columnNames provided (from config), match them by original name
  if (columnNames && columnNames.length > 0) {
    // Find the indices of columns that match the requested column names
    const allNonEmptyColumnIndices = findNonEmptyColumns([headers, ...dataRows], headers);
    const filteredHeaders = filterRowColumns(headers, allNonEmptyColumnIndices);

    // Match requested columns by name
    const matchingIndices: number[] = [];
    columnNames.forEach(colName => {
      const headerIndex = filteredHeaders.findIndex(h =>
        sanitizeColumnName(String(h || '')) === sanitizeColumnName(colName)
      );
      if (headerIndex !== -1) {
        matchingIndices.push(allNonEmptyColumnIndices[headerIndex]);
      }
    });

    if (matchingIndices.length > 0) {
      dataRows = dataRows.map(row => filterRowColumns(row, matchingIndices));
    }
  } else if (columnIndices && columnIndices.length > 0) {
    // If columnIndices provided (from preview), use those to filter
    dataRows = dataRows.map(row => filterRowColumns(row, columnIndices));
  } else {
    // Otherwise, auto-detect non-empty columns
    const nonEmptyColumnIndices = findNonEmptyColumns([headers, ...dataRows], headers);
    if (nonEmptyColumnIndices.length > 0) {
      dataRows = dataRows.map(row => filterRowColumns(row, nonEmptyColumnIndices));
    }
  }

  // Return data rows
  return dataRows;
}

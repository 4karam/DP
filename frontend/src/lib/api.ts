const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ColumnInfo {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'FLOAT' | 'BOOLEAN' | 'DATE' | 'TIMESTAMP';
  originalName: string;
  selected?: boolean;
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

export interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  totalRowsInserted: number;
}

export async function uploadFile(file: File): Promise<{ fileId: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload file');
  }

  const data = await response.json();
  return { fileId: data.fileId, filename: data.filename };
}

export async function previewFile(fileId: string): Promise<ExcelData> {
  const response = await fetch(`${API_URL}/api/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to preview file');
  }

  const data = await response.json();
  return data.data;
}

export async function importData(
  fileId: string,
  tables: TableConfig[],
  databaseUrl?: string
): Promise<{ results: ImportResult[]; summary: ImportSummary }> {
  const response = await fetch(`${API_URL}/api/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId, tables, databaseUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to import data');
  }

  const data = await response.json();
  return { results: data.results, summary: data.summary };
}

export async function testDatabaseConnection(databaseUrl: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`${API_URL}/api/testConnection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ databaseUrl }),
  });

  const data = await response.json();
  if (!response.ok) {
    return { success: false, error: data.error || 'Failed to connect' };
  }
  return { success: true, message: data.message };
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    const data = await response.json();
    return data.success;
  } catch {
    return false;
  }
}

// ========== JSON IMPORT API FUNCTIONS ==========

export interface JsonPreview {
  columns: ColumnInfo[];
  preview: any[][];
  rowCount: number;
  format: 'json' | 'jsonl';
}

export async function uploadJsonFile(file: File): Promise<{ fileId: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/json/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload JSON file');
  }

  const data = await response.json();
  return { fileId: data.fileId, filename: data.filename };
}

export async function previewJsonFile(fileId: string): Promise<JsonPreview> {
  const response = await fetch(`${API_URL}/api/json/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to preview JSON file');
  }

  const data = await response.json();
  return {
    columns: data.columns,
    preview: data.preview,
    rowCount: data.rowCount,
    format: data.format,
  };
}

export async function importJsonData(
  fileId: string,
  tableName: string,
  columns: ColumnInfo[],
  databaseUrl?: string
): Promise<ImportResult> {
  const response = await fetch(`${API_URL}/api/json/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId, tableName, columns, databaseUrl }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to import JSON data');
  }

  const data = await response.json();
  return data.result;
}

// ========== EXPORT API FUNCTIONS ==========

export interface TableName {
  name: string;
}

export interface ExportSchemaResponse {
  success: boolean;
  sessionId: string;
  tableName: string;
  columns: string[];
  firstRow: Record<string, any>;
  modifiedKeys: Record<string, string>;
}

export interface ExportSummary {
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
}

export async function getExportTables(): Promise<string[]> {
  const response = await fetch(`${API_URL}/api/export/tables`, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch tables');
  }

  const data = await response.json();
  return data.tables;
}

export async function getExportSchema(tableName: string): Promise<ExportSchemaResponse> {
  const response = await fetch(`${API_URL}/api/export/schema`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tableName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch schema');
  }

  const data = await response.json();
  return data;
}

export async function approveExportKeys(
  sessionId: string,
  modifiedKeys: Record<string, string>,
  excludedColumns: string[] = [],
  format?: 'jsonl' | 'excel'
): Promise<{ success: boolean; status: string }> {
  const response = await fetch(`${API_URL}/api/export/approve-keys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, modifiedKeys, excludedColumns, format }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to approve keys');
  }

  const data = await response.json();
  return { success: data.success, status: data.status };
}

export async function processExportBatches(sessionId: string, format?: 'jsonl' | 'excel'): Promise<{ success: boolean; summary: ExportSummary }> {
  const response = await fetch(`${API_URL}/api/export/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, format }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to process export');
  }

  const data = await response.json();
  return { success: data.success, summary: data.summary };
}

export async function downloadExportFile(sessionId: string, filename: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/export/download/${sessionId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to download file');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function getExportStatus(sessionId: string): Promise<{ progress: string; session: any }> {
  const response = await fetch(`${API_URL}/api/export/status/${sessionId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get status');
  }

  const data = await response.json();
  return { progress: data.progress, session: data.session };
}

export async function cleanupExportSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/export/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cleanup session');
  }
}

// ========== DOCUMENT PROCESSOR API FUNCTIONS ==========

export interface TextChunk {
  index: number;
  text: string;
  characterCount: number;
  wordCount: number;
  startIndex?: number;
  endIndex?: number;
  metadata: {
    fileId: string;
    fileName: string;
    fileType: string;
    uploadedAt: string;
    splittingMethod: string;
    chunkSize: number;
    chunkOverlap: number;
    pageNumber?: number;
    language?: string;
    hasArabic?: boolean;
    hasLatinScript?: boolean;
    containsNumbers?: boolean;
    containsUrls?: boolean;
    readabilityScore?: number;
    confidence?: number;
    previousChunkIndex?: number;
    nextChunkIndex?: number;
    processedAt: string;
  };
}

export interface ChunkResponse {
  success: boolean;
  data: {
    fileId: string;
    fileName: string;
    fileType: string;
    extractedText: string;
    chunks: TextChunk[];
    statistics: {
      totalChunks: number;
      totalCharacters: number;
      totalWords: number;
      avgChunkSize: number;
      avgWordCount: number;
      languages: string[];
      arabicChunks: number;
      latinChunks: number;
    };
  };
}

export interface SaveChunksRequest {
  fileId: string;
  fileName: string;
  chunks: TextChunk[];
  storageMode: 'new_table' | 'existing_table';
  customTableName?: string;
  projectId?: string;
  description?: string;
  databaseUrl?: string;
}

export interface SaveChunksResponse {
  success: boolean;
  data: {
    tableId: string;
    tableName: string;
    savedChunks: number;
    totalChunks: number;
  };
}

export interface ChunkTable {
  id: string;
  name: string;
  createdAt: string;
  chunkCount: number;
}

const BACKEND_URL = API_URL;

export async function uploadDocumentFile(file: File): Promise<{ fileId: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BACKEND_URL}/api/upload-document`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload document');
  }

  const data = await response.json();
  return { fileId: data.fileId, filename: data.filename };
}

export async function chunkDocument(
  fileId: string,
  splittingMethod: 'character' | 'recursive' | 'sentence' | 'paragraph' | 'markdown',
  chunkSize: number,
  chunkOverlap: number
): Promise<ChunkResponse> {
  const response = await fetch(`${BACKEND_URL}/api/chunk-document`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileId,
      splittingMethod,
      chunkSize,
      chunkOverlap,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to chunk document');
  }

  const data = await response.json();
  return data;
}

export async function getAvailableChunkTables(databaseUrl?: string): Promise<ChunkTable[]> {
  const url = new URL(`${BACKEND_URL}/api/chunk-tables`);
  if (databaseUrl) {
    url.searchParams.append('databaseUrl', databaseUrl);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch chunk tables');
  }

  const data = await response.json();

  // Validate response structure
  if (!data.data || !Array.isArray(data.data)) {
    console.warn('Invalid chunk tables response structure');
    return [];
  }

  return data.data;
}

export async function saveChunks(request: SaveChunksRequest): Promise<SaveChunksResponse> {
  const response = await fetch(`${BACKEND_URL}/api/save-chunks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save chunks');
  }

  const data = await response.json();
  return data;
}

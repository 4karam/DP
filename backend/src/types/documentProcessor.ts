/**
 * Document Processing Types and Interfaces
 */

export enum FileType {
  PDF = 'pdf',
  TEXT = 'text',
  IMAGE = 'image',
}

export enum SplittingMethod {
  CHARACTER = 'character',
  RECURSIVE = 'recursive',
  SENTENCE = 'sentence',
  PARAGRAPH = 'paragraph',
  MARKDOWN = 'markdown',
  CUSTOM = 'custom',
}

export interface DocumentFile {
  fileId: string;
  originalName: string;
  mimeType: string;
  fileType: FileType;
  filePath: string;
  fileSize: number;
  uploadedAt: Date;
}

export interface TextExtractionResult {
  fileId: string;
  originalName: string;
  fileType: FileType;
  rawText: string;
  characterCount: number;
  pageCount?: number;
  extractedAt: Date;
  extractionMethod: string;
}

export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
  separator?: string;
  customDelimiters?: string[];
}

export interface TextChunk {
  index: number;
  text: string;
  characterCount: number;
  wordCount: number;
  startIndex: number;
  endIndex: number;
  metadata: {
    // Document info
    fileId: string;
    fileName: string;
    fileType: FileType;
    uploadedAt: string;

    // Chunking info
    splittingMethod: SplittingMethod;
    chunkSize: number;
    chunkOverlap: number;

    // Position info
    pageNumber?: number;
    paragraphNumber?: number;
    sentenceNumber?: number;
    sectionNumber?: number;
    headerLevel?: number; // For markdown

    // Content info
    language?: string; // Detected or specified
    hasArabic?: boolean;
    hasLatinScript?: boolean;
    containsNumbers?: boolean;
    containsUrls?: boolean;

    // Quality metrics
    confidence?: number; // For OCR
    readabilityScore?: number;
    isHeader?: boolean;

    // Relationships
    previousChunkIndex?: number;
    nextChunkIndex?: number;

    // Timestamp
    processedAt: string;
  };
}

export interface ChunkingResult {
  fileId: string;
  originalName: string;
  splittingMethod: SplittingMethod;
  chunkingOptions: ChunkingOptions;
  chunks: TextChunk[];
  totalChunks: number;
  totalCharacters: number;
  processedAt: Date;
}

export interface DocumentProcessingRequest {
  fileId: string;
  splittingMethod: SplittingMethod;
  chunkingOptions: ChunkingOptions;
}

export interface ProcessingError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ProcessingError;
  timestamp: Date;
}

// Chunking strategy interface
export interface ITextSplitter {
  split(text: string, options: ChunkingOptions): Promise<TextChunk[]>;
  getMethod(): SplittingMethod;
}

// Chunk Storage Types
export interface SaveChunksRequest {
  fileId: string;
  fileName: string;
  chunks: TextChunk[];
  storageMode: 'new_table' | 'existing_table';
  tableName?: string; // For existing table
  projectId?: string; // For existing project
  customTableName?: string; // For new table
  description?: string; // Table description
}

export interface StorageResult {
  success: boolean;
  tableId: string;
  tableName: string;
  savedChunks: number;
  totalChunks: number;
  message: string;
  storageMode: 'new_table' | 'existing_table';
  createdAt: Date;
}

export interface AvailableTable {
  id: string;
  name: string;
  description?: string;
  chunkCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetadataStats {
  totalChunks: number;
  totalCharacters: number;
  totalWords: number;
  averageChunkSize: number;
  averageWordCount: number;
  filesProcessed: number;
  languagesDetected: string[];
  dateRange: { start: Date; end: Date };
}

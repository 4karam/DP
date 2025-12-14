/**
 * Document Processing Routes
 * Handles document upload, text extraction, and chunking
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { createReadStream } from 'fs';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import * as pdf from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { MetadataEnhancer } from '../utils/metadataEnhancer';
import { FileType, SplittingMethod, TextChunk } from '../types/documentProcessor';

// In-memory file storage
const uploadedFiles = new Map<string, {
  filename: string;
  mimetype: string;
  buffer: Buffer;
  uploadedAt: Date;
}>();

// Auto-cleanup after 1 hour - store interval ID for cleanup on shutdown
const cleanupIntervalId = setInterval(() => {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);

  for (const [fileId, fileData] of uploadedFiles.entries()) {
    if (fileData.uploadedAt.getTime() < oneHourAgo) {
      uploadedFiles.delete(fileId);
    }
  }
}, 10 * 60 * 1000); // Check every 10 minutes

// Export cleanup function for server shutdown
export function cleanupFileStorage() {
  clearInterval(cleanupIntervalId);
  uploadedFiles.clear();
}

/**
 * Convert mimetype string to FileType enum
 */
function getMimeTypeAsFileType(mimetype: string): FileType {
  if (mimetype === 'text/plain') {
    return FileType.TEXT;
  } else if (mimetype === 'application/pdf') {
    return FileType.PDF;
  } else if (mimetype.startsWith('image/')) {
    return FileType.IMAGE;
  }
  // Default to text if unknown
  return FileType.TEXT;
}

/**
 * Upload a document file
 */
export async function uploadDocumentHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        error: 'No file provided',
      });
    }

    const { filename, mimetype, file } = data;
    const fileId = uuidv4();

    // Read file into buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Store in memory
    uploadedFiles.set(fileId, {
      filename: filename || 'document',
      mimetype,
      buffer,
      uploadedAt: new Date(),
    });

    return reply.send({
      fileId,
      filename: filename || 'document',
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return reply.status(500).send({
      error: 'Failed to upload document',
      details: (error as Error).message,
    });
  }
}

/**
 * Extract text from PDF file
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // For Node.js environment, disable worker to avoid scheme validation issues
    // The PDF.js library will fall back to synchronous processing
    (pdf as any).disableWorker = true;

    // Convert Buffer to Uint8Array for pdfjs-dist compatibility
    const uint8Array = new Uint8Array(buffer);

    const pdfDoc = await pdf.getDocument({ data: uint8Array }).promise;
    let text = '';

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      text += pageText + '\n\n';
    }

    return text.trim() || '[PDF extraction resulted in empty text]';
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '[PDF text extraction failed: ' + (error as Error).message + ']';
  }
}

/**
 * Detect if text contains Arabic characters
 */
function hasArabicContent(buffer: Buffer): boolean {
  try {
    const sample = buffer.toString('utf-8', 0, Math.min(1000, buffer.length));
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(sample);
  } catch {
    return false;
  }
}

/**
 * Extract text from image using OCR
 */
async function extractImageText(buffer: Buffer, filename: string): Promise<string> {
  try {
    // Write buffer to temp file for tesseract.js
    const tempDir = await mkdtemp(join(tmpdir(), 'ocr-'));
    const tempPath = join(tempDir, filename);
    await writeFile(tempPath, buffer);

    // Detect if image might contain Arabic text
    const hasArabic = hasArabicContent(buffer);

    // Use appropriate language(s) for OCR
    // 'ara' for Arabic, 'ara+eng' for mixed content
    const languages = hasArabic ? 'ara+eng' : 'eng';

    const {
      data: { text },
    } = await Tesseract.recognize(tempPath, languages, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR progress (${languages}): ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    // Cleanup temp file
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Failed to cleanup temp OCR directory:', e);
    }

    return text.trim() || '[OCR resulted in empty text]';
  } catch (error) {
    console.error('OCR extraction error:', error);
    return '[Image OCR extraction failed: ' + (error as Error).message + ']';
  }
}

/**
 * Chunk a document
 */
export async function chunkDocumentHandler(
  request: FastifyRequest<{
    Body: {
      fileId: string;
      splittingMethod: 'character' | 'recursive' | 'sentence' | 'paragraph' | 'markdown';
      chunkSize: number;
      chunkOverlap: number;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { fileId, splittingMethod, chunkSize, chunkOverlap } = request.body;

    const fileData = uploadedFiles.get(fileId);
    if (!fileData) {
      return reply.status(404).send({
        error: 'File not found',
      });
    }

    // Extract text based on file type
    let extractedText = '';

    if (fileData.mimetype === 'text/plain') {
      extractedText = fileData.buffer.toString('utf-8');
    } else if (fileData.mimetype === 'application/pdf') {
      extractedText = await extractPdfText(fileData.buffer);
    } else if (fileData.mimetype.startsWith('image/')) {
      extractedText = await extractImageText(fileData.buffer, fileData.filename);
    } else {
      // Unsupported file type - return error instead of silently falling back
      return reply.status(400).send({
        error: 'Unsupported file type',
        details: `File type '${fileData.mimetype}' is not supported. Please upload PDF, text, or image files.`,
      });
    }

    // Perform chunking based on method
    const fileType = getMimeTypeAsFileType(fileData.mimetype);
    const splittingMethodEnum = splittingMethod as SplittingMethod;
    const chunks = performChunking(
      extractedText,
      splittingMethodEnum,
      chunkSize,
      chunkOverlap,
      fileData.filename,
      fileId,
      fileType
    );

    // Enrich chunks with metadata
    const enhancer = new MetadataEnhancer();
    const enrichedChunks = enhancer.enhanceChunks(
      chunks,
      fileId,
      fileData.filename,
      fileType,
      fileData.uploadedAt,
      splittingMethodEnum,
      chunkSize,
      chunkOverlap
    );

    // Calculate statistics from enriched metadata
    const stats = enhancer.extractStats(enrichedChunks);
    const statistics = {
      totalChunks: stats.totalChunks,
      totalCharacters: stats.totalCharacters,
      totalWords: stats.totalWords,
      avgChunkSize: Math.round(stats.averageChunkSize),
      avgWordCount: Math.round(stats.averageWordCount),
      languages: Array.from(stats.languagesDetected),
      arabicChunks: stats.arabicChunks,
      latinChunks: stats.latinChunks,
    };

    return reply.send({
      success: true,
      data: {
        fileId,
        fileName: fileData.filename,
        fileType: fileData.mimetype,
        extractedText: extractedText.substring(0, 500), // First 500 chars
        chunks: enrichedChunks,
        statistics,
      },
    });
  } catch (error) {
    console.error('Error chunking document:', error);
    return reply.status(500).send({
      error: 'Failed to chunk document',
      details: (error as Error).message,
    });
  }
}

/**
 * Perform chunking based on method
 */
function performChunking(
  text: string,
  method: SplittingMethod,
  chunkSize: number,
  chunkOverlap: number,
  fileName: string,
  fileId: string,
  fileType: FileType
): TextChunk[] {
  switch (method) {
    case SplittingMethod.CHARACTER:
      return characterChunking(text, chunkSize, chunkOverlap, fileName, fileId, fileType);
    case SplittingMethod.SENTENCE:
      return sentenceChunking(text, chunkSize, chunkOverlap, fileName, fileId, fileType);
    case SplittingMethod.PARAGRAPH:
      return paragraphChunking(text, chunkSize, chunkOverlap, fileName, fileId, fileType);
    case SplittingMethod.MARKDOWN:
      return markdownChunking(text, chunkSize, chunkOverlap, fileName, fileId, fileType);
    case SplittingMethod.RECURSIVE:
    default:
      return recursiveChunking(text, chunkSize, chunkOverlap, fileName, fileId, fileType);
  }
}

/**
 * Character-based chunking
 */
function characterChunking(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  fileName: string,
  fileId: string,
  fileType: FileType
): TextChunk[] {
  const chunks: TextChunk[] = [];

  for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
    const chunk = text.substring(i, i + chunkSize);
    if (chunk.trim()) {
      chunks.push({
        index: chunks.length,
        text: chunk,
        characterCount: chunk.length,
        wordCount: chunk.split(/\s+/).length,
        startIndex: i,
        endIndex: i + chunk.length,
        metadata: {
          fileId,
          fileName,
          fileType,
          uploadedAt: new Date().toISOString(),
          splittingMethod: SplittingMethod.CHARACTER,
          chunkSize,
          chunkOverlap,
          processedAt: new Date().toISOString(),
        },
      });
    }
  }

  return chunks;
}

/**
 * Sentence-based chunking
 * Note: Sentence boundaries provide natural context, so overlap is minimal
 */
function sentenceChunking(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  fileName: string,
  fileId: string,
  fileType: FileType
): TextChunk[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let charCount = 0;
  let startIndex = 0;

  for (const sentence of sentences) {
    if (charCount + sentence.length > chunkSize && currentChunk) {
      const trimmedText = currentChunk.trim();
      chunks.push({
        index: chunks.length,
        text: trimmedText,
        characterCount: trimmedText.length,
        wordCount: trimmedText.split(/\s+/).length,
        startIndex,
        endIndex: startIndex + currentChunk.length,
        metadata: {
          fileId,
          fileName,
          fileType,
          uploadedAt: new Date().toISOString(),
          splittingMethod: SplittingMethod.SENTENCE,
          chunkSize,
          chunkOverlap: 0, // Sentence boundaries are sufficient
          processedAt: new Date().toISOString(),
        },
      });
      // For sentence-based, we naturally have overlap through shared sentences
      startIndex += currentChunk.length;
      currentChunk = sentence;
      charCount = sentence.length;
    } else {
      currentChunk += sentence;
      charCount += sentence.length;
    }
  }

  if (currentChunk.trim()) {
    const trimmedText = currentChunk.trim();
    chunks.push({
      index: chunks.length,
      text: trimmedText,
      characterCount: trimmedText.length,
      wordCount: trimmedText.split(/\s+/).length,
      startIndex,
      endIndex: startIndex + currentChunk.length,
      metadata: {
        fileId,
        fileName,
        fileType,
        uploadedAt: new Date().toISOString(),
        splittingMethod: SplittingMethod.SENTENCE,
        chunkSize,
        chunkOverlap: 0, // Sentence boundaries are sufficient
        processedAt: new Date().toISOString(),
      },
    });
  }

  return chunks;
}

/**
 * Paragraph-based chunking
 * Note: Paragraph boundaries provide strong semantic divisions, overlap is minimal
 */
function paragraphChunking(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  fileName: string,
  fileId: string,
  fileType: FileType
): TextChunk[] {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let charCount = 0;
  let startIndex = 0;

  for (const paragraph of paragraphs) {
    if (charCount + paragraph.length > chunkSize && currentChunk) {
      const trimmedText = currentChunk.trim();
      chunks.push({
        index: chunks.length,
        text: trimmedText,
        characterCount: trimmedText.length,
        wordCount: trimmedText.split(/\s+/).length,
        startIndex,
        endIndex: startIndex + currentChunk.length,
        metadata: {
          fileId,
          fileName,
          fileType,
          uploadedAt: new Date().toISOString(),
          splittingMethod: SplittingMethod.PARAGRAPH,
          chunkSize,
          chunkOverlap: 0, // Paragraph boundaries are sufficient
          processedAt: new Date().toISOString(),
        },
      });
      // For paragraph-based, we naturally have context from paragraph structure
      startIndex += currentChunk.length;
      currentChunk = paragraph;
      charCount = paragraph.length;
    } else {
      if (currentChunk) currentChunk += '\n\n';
      currentChunk += paragraph;
      charCount += paragraph.length;
    }
  }

  if (currentChunk.trim()) {
    const trimmedText = currentChunk.trim();
    chunks.push({
      index: chunks.length,
      text: trimmedText,
      characterCount: trimmedText.length,
      wordCount: trimmedText.split(/\s+/).length,
      startIndex,
      endIndex: startIndex + currentChunk.length,
      metadata: {
        fileId,
        fileName,
        fileType,
        uploadedAt: new Date().toISOString(),
        splittingMethod: SplittingMethod.PARAGRAPH,
        chunkSize,
        chunkOverlap: 0, // Paragraph boundaries are sufficient
        processedAt: new Date().toISOString(),
      },
    });
  }

  return chunks;
}

/**
 * Recursive chunking with separator
 */
function recursiveChunking(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  fileName: string,
  fileId: string,
  fileType: FileType
): TextChunk[] {
  const separators = ['\n\n', '\n', '. ', ' '];
  return recursiveSplit(text, separators, chunkSize, chunkOverlap, fileName, fileId, fileType, 0);
}

interface ChunkData {
  text: string;
  startIndex: number;
  endIndex: number;
}

function recursiveSplit(
  text: string,
  separators: string[],
  chunkSize: number,
  chunkOverlap: number,
  fileName: string,
  fileId: string,
  fileType: FileType,
  depth = 0
): TextChunk[] {
  const chunks: ChunkData[] = [];
  let separator = separators[separators.length - 1];

  for (let i = 0; i < separators.length; i++) {
    if (separators[i] === '') continue;
    if (text.includes(separators[i])) {
      separator = separators[i];
      break;
    }
  }

  const splits = text.split(separator);
  const goodSplits: Array<{ text: string; startIdx: number; endIdx: number }> = [];
  let currentPos = 0;

  for (const split of splits) {
    const startIdx = text.indexOf(split, currentPos);
    const endIdx = startIdx + split.length;
    currentPos = endIdx + separator.length;

    if (split.length < chunkSize) {
      goodSplits.push({ text: split, startIdx, endIdx });
    } else {
      if (goodSplits.length) {
        const mergedText = goodSplits.map((s) => s.text).join(separator);
        const mergedStartIdx = goodSplits[0].startIdx;
        const mergedEndIdx = goodSplits[goodSplits.length - 1].endIdx;
        chunks.push(
          ...recursiveSplitWithPosition(
            mergedText,
            mergedStartIdx,
            separators,
            chunkSize,
            chunkOverlap,
            fileName,
            fileId,
            fileType,
            depth + 1
          )
        );
        goodSplits.length = 0;
      }
      chunks.push(
        ...recursiveSplitWithPosition(split, startIdx, separators, chunkSize, chunkOverlap, fileName, fileId, fileType, depth + 1)
      );
    }
  }

  if (goodSplits.length) {
    const mergedText = goodSplits.map((s) => s.text).join(separator);
    const mergedStartIdx = goodSplits[0].startIdx;
    chunks.push(
      ...recursiveSplitWithPosition(
        mergedText,
        mergedStartIdx,
        separators,
        chunkSize,
        chunkOverlap,
        fileName,
        fileId,
        fileType,
        depth + 1
      )
    );
  }

  // Format chunks only at the final level (depth === 0)
  if (depth === 0 && chunks.length > 0) {
    return chunks.map((chunk, index) => ({
      index,
      text: chunk.text.trim(),
      characterCount: chunk.text.trim().length,
      wordCount: chunk.text.trim().split(/\s+/).length,
      startIndex: chunk.startIndex,
      endIndex: chunk.endIndex,
      metadata: {
        fileId,
        fileName,
        fileType,
        uploadedAt: new Date().toISOString(),
        splittingMethod: SplittingMethod.RECURSIVE,
        chunkSize,
        chunkOverlap,
        processedAt: new Date().toISOString(),
      },
    }));
  }

  return chunks as TextChunk[];
}

function recursiveSplitWithPosition(
  text: string,
  startPos: number,
  separators: string[],
  chunkSize: number,
  chunkOverlap: number,
  fileName: string,
  fileId: string,
  fileType: FileType,
  depth: number
): ChunkData[] {
  const chunks: ChunkData[] = [];

  // Base case: if text is smaller than chunk size, return it as a single chunk
  if (text.length <= chunkSize) {
    return [{
      text,
      startIndex: startPos,
      endIndex: startPos + text.length,
    }];
  }

  // Find the best separator to use at this depth
  let separator = separators[Math.min(depth, separators.length - 1)];

  // If we've exhausted all separators, just split at chunk size
  if (depth >= separators.length) {
    // Force split at chunk size
    const chunk = text.substring(0, chunkSize);
    chunks.push({
      text: chunk,
      startIndex: startPos,
      endIndex: startPos + chunk.length,
    });

    if (text.length > chunkSize) {
      const overlap = Math.min(chunkOverlap, chunkSize);
      const remainingStart = Math.max(0, chunkSize - overlap);
      chunks.push(
        ...recursiveSplitWithPosition(
          text.substring(remainingStart),
          startPos + remainingStart,
          separators,
          chunkSize,
          chunkOverlap,
          fileName,
          fileId,
          fileType,
          depth + 1
        )
      );
    }
    return chunks;
  }

  if (!text.includes(separator)) {
    // Try next separator
    return recursiveSplitWithPosition(
      text,
      startPos,
      separators,
      chunkSize,
      chunkOverlap,
      fileName,
      fileId,
      fileType,
      depth + 1
    );
  }

  const splits = text.split(separator);
  const goodSplits: Array<{ text: string; startIdx: number }> = [];
  let currentPos = startPos;

  for (const split of splits) {
    if (split.length < chunkSize) {
      goodSplits.push({ text: split, startIdx: currentPos });
    } else {
      if (goodSplits.length) {
        const mergedText = goodSplits.map((s) => s.text).join(separator);
        const mergedStartIdx = goodSplits[0].startIdx;
        chunks.push(
          ...recursiveSplitWithPosition(
            mergedText,
            mergedStartIdx,
            separators,
            chunkSize,
            chunkOverlap,
            fileName,
            fileId,
            fileType,
            depth + 1
          )
        );
        goodSplits.length = 0;
      }
      chunks.push(
        ...recursiveSplitWithPosition(
          split,
          currentPos,
          separators,
          chunkSize,
          chunkOverlap,
          fileName,
          fileId,
          fileType,
          depth + 1
        )
      );
    }
    currentPos += split.length + separator.length;
  }

  if (goodSplits.length) {
    const mergedText = goodSplits.map((s) => s.text).join(separator);
    const mergedStartIdx = goodSplits[0].startIdx;
    chunks.push(
      ...recursiveSplitWithPosition(
        mergedText,
        mergedStartIdx,
        separators,
        chunkSize,
        chunkOverlap,
        fileName,
        fileId,
        fileType,
        depth + 1
      )
    );
  }

  return chunks;
}

/**
 * Markdown-aware chunking
 * Note: Header-based chunking creates logical sections, no overlap needed
 */
function markdownChunking(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
  fileName: string,
  fileId: string,
  fileType: FileType
): TextChunk[] {
  // Split by headers (# ## ### etc.)
  const headerPattern = /^#+\s+/gm;
  const sections: Array<{ content: string; startIdx: number; endIdx: number }> = [];
  let lastIndex = 0;
  let match;

  while ((match = headerPattern.exec(text)) !== null) {
    if (lastIndex > 0) {
      sections.push({
        content: text.substring(lastIndex, match.index),
        startIdx: lastIndex,
        endIdx: match.index,
      });
    }
    lastIndex = match.index;
  }
  if (lastIndex < text.length) {
    sections.push({
      content: text.substring(lastIndex),
      startIdx: lastIndex,
      endIdx: text.length,
    });
  }

  // If no headers found, fall back to paragraph chunking
  if (sections.length <= 1) {
    return paragraphChunking(text, chunkSize, chunkOverlap, fileName, fileId, fileType);
  }

  const chunks: TextChunk[] = [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].content.trim();
    if (!section) continue;

    chunks.push({
      index: chunks.length,
      text: section,
      characterCount: section.length,
      wordCount: section.split(/\s+/).length,
      startIndex: sections[i].startIdx,
      endIndex: sections[i].endIdx,
      metadata: {
        fileId,
        fileName,
        fileType,
        uploadedAt: new Date().toISOString(),
        splittingMethod: SplittingMethod.MARKDOWN,
        chunkSize,
        chunkOverlap: 0, // Headers define logical sections, no overlap
        processedAt: new Date().toISOString(),
      },
    });
  }

  return chunks;
}

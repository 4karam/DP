/**
 * Metadata Extraction and Enhancement Utility
 * Enriches text chunks with comprehensive metadata
 */

import { TextChunk, SplittingMethod, FileType } from '../types/documentProcessor';

export class MetadataEnhancer {
  /**
   * Calculate word count for text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Detect if text contains Arabic characters
   */
  private hasArabic(text: string): boolean {
    // Arabic Unicode range: 0x0600 to 0x06FF
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text);
  }

  /**
   * Detect if text contains Latin script
   */
  private hasLatinScript(text: string): boolean {
    const latinRegex = /[a-zA-Z]/;
    return latinRegex.test(text);
  }

  /**
   * Detect URLs in text
   */
  private containsUrls(text: string): boolean {
    const urlRegex = /https?:\/\/|www\./;
    return urlRegex.test(text);
  }

  /**
   * Detect numbers in text
   */
  private containsNumbers(text: string): boolean {
    const numberRegex = /\d/;
    return numberRegex.test(text);
  }

  /**
   * Detect language based on script proportion
   */
  private detectLanguage(text: string): string {
    // Count character types
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalLetters = arabicChars + latinChars;

    // If no letters found, default to english
    if (totalLetters === 0) {
      return 'english';
    }

    // Calculate proportions
    const arabicProportion = arabicChars / totalLetters;
    const latinProportion = latinChars / totalLetters;

    // If Arabic characters are 20% or more, consider it Arabic or mixed
    if (arabicProportion >= 0.2) {
      // If both scripts are present (>5% each), it's mixed
      if (latinProportion >= 0.05) {
        return 'mixed';
      }
      return 'arabic';
    }

    // Default to english/latin
    return 'english';
  }

  /**
   * Calculate simple readability score (0-100)
   * Based on average word length and sentence structure
   */
  private calculateReadabilityScore(text: string): number {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const avgWordLength = text.replace(/\s/g, '').length / words;

    // Simple Flesch Reading Ease approximation
    let score = 100;
    score -= words / 10;
    score -= avgWordLength / 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Enhance chunks with comprehensive metadata
   */
  enhanceChunks(
    chunks: TextChunk[],
    fileId: string,
    fileName: string,
    fileType: FileType,
    uploadedAt: Date,
    splittingMethod: SplittingMethod,
    chunkSize: number,
    chunkOverlap: number
  ): TextChunk[] {
    return chunks.map((chunk, index) => {
      const wordCount = this.countWords(chunk.text);
      const hasArabic = this.hasArabic(chunk.text);
      const hasLatinScript = this.hasLatinScript(chunk.text);
      const language = this.detectLanguage(chunk.text);
      const readabilityScore = this.calculateReadabilityScore(chunk.text);

      return {
        ...chunk,
        wordCount,
        metadata: {
          // Document info
          fileId,
          fileName,
          fileType,
          uploadedAt: uploadedAt.toISOString(),

          // Chunking info
          splittingMethod,
          chunkSize,
          chunkOverlap,

          // Position info (preserve existing)
          ...(chunk.metadata.pageNumber !== undefined && {
            pageNumber: chunk.metadata.pageNumber,
          }),
          ...(chunk.metadata.paragraphNumber !== undefined && {
            paragraphNumber: chunk.metadata.paragraphNumber,
          }),
          ...(chunk.metadata.sentenceNumber !== undefined && {
            sentenceNumber: chunk.metadata.sentenceNumber,
          }),
          sectionNumber: chunk.metadata.sectionNumber,
          headerLevel: chunk.metadata.headerLevel,

          // Content info
          language,
          hasArabic,
          hasLatinScript,
          containsNumbers: this.containsNumbers(chunk.text),
          containsUrls: this.containsUrls(chunk.text),

          // Quality metrics
          confidence: chunk.metadata.confidence,
          readabilityScore,
          isHeader: chunk.metadata.isHeader,

          // Relationships
          previousChunkIndex: index > 0 ? index - 1 : undefined,
          nextChunkIndex: index < chunks.length - 1 ? index + 1 : undefined,

          // Timestamp
          processedAt: new Date().toISOString(),
        },
      };
    });
  }

  /**
   * Extract metadata statistics from chunks
   */
  extractStats(chunks: TextChunk[]): {
    totalChunks: number;
    totalCharacters: number;
    totalWords: number;
    averageChunkSize: number;
    averageWordCount: number;
    languagesDetected: Set<string>;
    arabicChunks: number;
    latinChunks: number;
  } {
    const totalCharacters = chunks.reduce((sum, c) => sum + c.characterCount, 0);
    const totalWords = chunks.reduce((sum, c) => sum + c.wordCount, 0);
    const languagesDetected = new Set(
      chunks
        .map((c) => c.metadata.language)
        .filter((l) => l !== undefined) as string[]
    );
    const arabicChunks = chunks.filter((c) => c.metadata.hasArabic).length;
    const latinChunks = chunks.filter((c) => c.metadata.hasLatinScript).length;

    return {
      totalChunks: chunks.length,
      totalCharacters,
      totalWords,
      averageChunkSize: totalCharacters / chunks.length,
      averageWordCount: totalWords / chunks.length,
      languagesDetected,
      arabicChunks,
      latinChunks,
    };
  }
}

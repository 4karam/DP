import { FastifyRequest, FastifyReply } from 'fastify';
import { storeFile } from '../utils/fileStorage';

/**
 * Handle JSON file upload
 */
export async function jsonUploadHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Get uploaded file
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({
        success: false,
        error: 'No file uploaded',
      });
    }

    // Validate file type
    const filename = data.filename;
    const validExtensions = ['.json', '.jsonl'];
    const hasValidExtension = validExtensions.some(ext =>
      filename.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid file type. Please upload a JSON file (.json or .jsonl)',
      });
    }

    // Read file buffer
    const buffer = await data.toBuffer();

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (buffer.length > maxSize) {
      return reply.status(400).send({
        success: false,
        error: 'File size exceeds maximum allowed size of 50MB',
      });
    }

    // Validate JSON structure
    try {
      const content = buffer.toString('utf-8');

      // Try parsing as JSON
      try {
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed) && (typeof parsed !== 'object' || parsed === null)) {
          throw new Error('JSON must be an array or object');
        }
      } catch (jsonError) {
        // Try parsing as JSONL
        const lines = content.trim().split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          throw new Error('Empty JSON file');
        }
        lines.forEach((line, index) => {
          try {
            JSON.parse(line);
          } catch {
            throw new Error(`Invalid JSON at line ${index + 1}`);
          }
        });
      }
    } catch (validationError) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid JSON format',
        details: validationError instanceof Error ? validationError.message : 'Unknown error',
      });
    }

    // Store file
    const fileId = await storeFile(buffer, filename);

    return reply.send({
      success: true,
      fileId,
      filename,
      size: buffer.length,
      message: 'JSON file uploaded successfully',
    });
  } catch (error) {
    console.error('JSON upload error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to upload JSON file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

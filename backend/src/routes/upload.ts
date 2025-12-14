import { FastifyRequest, FastifyReply } from 'fastify';
import { storeFile } from '../utils/fileStorage';

export async function uploadHandler(
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
    const validExtensions = ['.xlsx', '.xls', '.xlsm'];
    const hasValidExtension = validExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid file type. Please upload an Excel file (.xlsx, .xls, or .xlsm)',
      });
    }

    // Read file buffer
    const buffer = await data.toBuffer();

    // Validate file size (max 50MB)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800', 10);
    if (buffer.length > maxSize) {
      return reply.status(400).send({
        success: false,
        error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      });
    }

    // Store file
    const fileId = await storeFile(buffer, filename);

    return reply.send({
      success: true,
      fileId,
      filename,
      size: buffer.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

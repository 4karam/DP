import { FastifyRequest, FastifyReply } from 'fastify';
import { getFile } from '../utils/fileStorage';
import { parseJsonFile } from '../utils/jsonParser';

interface JsonPreviewRequest {
  Body: {
    fileId: string;
  };
}

/**
 * Handle JSON file preview
 */
export async function jsonPreviewHandler(
  request: FastifyRequest<JsonPreviewRequest>,
  reply: FastifyReply
) {
  try {
    const { fileId } = request.body;

    if (!fileId) {
      return reply.status(400).send({
        success: false,
        error: 'fileId is required',
      });
    }

    // Get file from storage
    const buffer = getFile(fileId);

    if (!buffer) {
      return reply.status(404).send({
        success: false,
        error: 'File not found or expired',
      });
    }

    // Parse JSON file
    const jsonData = parseJsonFile(buffer);

    if (!jsonData.preview || jsonData.preview.columns.length === 0) {
      return reply.status(400).send({
        success: false,
        error: 'No valid columns found in JSON file',
      });
    }

    return reply.send({
      success: true,
      ...jsonData.preview,
      columns: jsonData.preview.columns,
      preview: jsonData.preview.sampleData,
    });
  } catch (error) {
    console.error('JSON preview error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to parse JSON file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

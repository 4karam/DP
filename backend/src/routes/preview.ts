import { FastifyRequest, FastifyReply } from 'fastify';
import { getFile } from '../utils/fileStorage';
import { parseExcelFile } from '../utils/excelParser';

interface PreviewRequest {
  Body: {
    fileId: string;
  };
}

export async function previewHandler(
  request: FastifyRequest<PreviewRequest>,
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

    // Parse Excel file
    const excelData = parseExcelFile(buffer);

    if (excelData.sheets.length === 0) {
      return reply.status(400).send({
        success: false,
        error: 'No valid sheets found in Excel file',
      });
    }

    return reply.send({
      success: true,
      data: excelData,
    });
  } catch (error) {
    console.error('Preview error:', error);
    return reply.status(500).send({
      success: false,
      error: 'Failed to parse Excel file',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

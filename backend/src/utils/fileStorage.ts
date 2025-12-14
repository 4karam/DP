import { randomUUID } from 'crypto';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

interface StoredFile {
  id: string;
  filename: string;
  buffer: Buffer;
  timestamp: number;
}

// In-memory storage for uploaded files (expires after 1 hour)
const fileStorage = new Map<string, StoredFile>();

// Cleanup old files every 10 minutes
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [id, file] of fileStorage.entries()) {
    if (now - file.timestamp > oneHour) {
      fileStorage.delete(id);
    }
  }
}, 10 * 60 * 1000);

export async function storeFile(buffer: Buffer, filename: string): Promise<string> {
  const id = randomUUID();
  
  fileStorage.set(id, {
    id,
    filename,
    buffer,
    timestamp: Date.now(),
  });

  return id;
}

export function getFile(id: string): Buffer | null {
  const file = fileStorage.get(id);
  return file ? file.buffer : null;
}

export function getFileInfo(id: string): { filename: string } | null {
  const file = fileStorage.get(id);
  return file ? { filename: file.filename } : null;
}

export function deleteFile(id: string): boolean {
  return fileStorage.delete(id);
}

export function cleanupAllFiles(): void {
  fileStorage.clear();
}

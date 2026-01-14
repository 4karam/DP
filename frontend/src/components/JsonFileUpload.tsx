'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface JsonFileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export default function JsonFileUpload({ onFileSelect, isLoading }: JsonFileUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);

      if (acceptedFiles.length === 0) {
        setError('Please select a valid JSON file');
        return;
      }

      const file = acceptedFiles[0];

      // Validate file type
      const validTypes = [
        'application/json',
        'application/x-json',
        'text/json',
      ];

      if (!validTypes.includes(file.type) && !file.name.match(/\.(json|jsonl)$/i)) {
        setError('Invalid file type. Please upload a JSON file (.json or .jsonl)');
        return;
      }

      // Validate file size (50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('File size exceeds 50MB limit');
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json', '.jsonl'],
    },
    maxFiles: 1,
    disabled: isLoading,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
          transition-all duration-300 ease-in-out transform
          ${isDragActive
            ? 'border-green-500 bg-gradient-to-br from-green-500/20 to-emerald-500/10 scale-105 shadow-lg shadow-green-500/20'
            : 'border-slate-600 hover:border-slate-500 bg-slate-900/30 hover:bg-slate-900/50'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center space-y-5">
          <div className={`transition-all duration-300 ${isDragActive ? 'scale-110' : 'scale-100'}`}>
            <svg
              className={`w-20 h-20 ${isDragActive ? 'text-green-400' : 'text-slate-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-3-3v6"
              />
            </svg>
          </div>

          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-slate-200">
              {isDragActive ? '📁 Drop your JSON file here' : 'Upload JSON File'}
            </h3>
            <p className="text-sm text-slate-400 max-w-md">
              {isDragActive
                ? 'Release to upload'
                : 'Drag and drop a JSON file here, or click to browse'}
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
              <span className="px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700">
                .json
              </span>
              <span className="px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700">
                .jsonl
              </span>
              <span className="px-2 py-1 rounded-md bg-slate-800/50 border border-slate-700">
                Max 50MB
              </span>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center space-x-2 text-blue-400">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent" />
              <span className="text-sm">Uploading...</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700">
        <h4 className="text-sm font-medium text-slate-300 mb-2">💡 Supported JSON Formats:</h4>
        <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
          <li><strong>JSON Array:</strong> {`[{"key": "value"}, {"key": "value"}]`}</li>
          <li><strong>JSONL (JSON Lines):</strong> One JSON object per line</li>
          <li>All objects must have consistent structure</li>
          <li>Automatic type detection for columns</li>
        </ul>
      </div>
    </div>
  );
}

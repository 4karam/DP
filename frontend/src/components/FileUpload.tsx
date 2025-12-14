'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
}

export default function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);
      
      if (acceptedFiles.length === 0) {
        setError('Please select a valid Excel file');
        return;
      }

      const file = acceptedFiles[0];
      
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.ms-excel.sheet.macroEnabled.12',
      ];
      
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|xlsm)$/i)) {
        setError('Invalid file type. Please upload an Excel file (.xlsx, .xls, or .xlsm)');
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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
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
            ? 'border-blue-500 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 scale-105 shadow-lg shadow-blue-500/20'
            : 'border-slate-600 hover:border-slate-500 bg-slate-900/30 hover:bg-slate-900/50'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center space-y-5">
          <div className={`transition-all duration-300 ${isDragActive ? 'scale-110' : 'scale-100'}`}>
            <svg
              className={`w-20 h-20 ${isDragActive ? 'text-blue-400' : 'text-slate-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          {isLoading ? (
            <div className="text-slate-400 space-y-3">
              <div className="flex justify-center">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-3 border-slate-700"></div>
                  <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-blue-500 border-r-cyan-500 animate-spin"></div>
                </div>
              </div>
              <p className="font-medium">Processing file...</p>
            </div>
          ) : (
            <>
              <div>
                <p className={`text-lg font-semibold transition-colors ${isDragActive ? 'text-blue-300' : 'text-slate-200'}`}>
                  {isDragActive ? '✨ Drop your Excel file here' : 'Drag & drop your Excel file'}
                </p>
                <p className="text-sm text-slate-400 mt-2">or click to browse your computer</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V2zm0 0h.5a.5.5 0 01.5.5v12a.5.5 0 01-.5.5H5a.5.5 0 01-.5-.5v-12A.5.5 0 015 2z" clipRule="evenodd" />
                </svg>
                <span>.xlsx, .xls, .xlsm • Up to 50MB</span>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-5 p-4 bg-gradient-to-r from-red-500/15 to-red-600/10 border border-red-500/40 rounded-xl shadow-lg shadow-red-500/10 animate-fade-in">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-300 font-medium text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

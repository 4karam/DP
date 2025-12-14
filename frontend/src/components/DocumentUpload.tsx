'use client';

import { useState } from 'react';

interface DocumentUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export default function DocumentUpload({ onFileSelect, isLoading }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      validateAndUpload(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      validateAndUpload(file);
    }
  };

  const validateAndUpload = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/tiff',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(`Unsupported file type: ${file.type}\n\nSupported: PDF, Text, JPEG, PNG, WebP, TIFF`);
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert(`File size exceeds 50MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    onFileSelect(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl p-8 border border-slate-700/50 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Upload Document</h2>
        <p className="text-slate-400 mb-8">Upload a PDF, text file, or image for processing</p>

        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed transition-all duration-300 p-12 text-center ${
            isDragging
              ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
              : 'border-slate-600 bg-slate-900/30 hover:border-purple-400 hover:bg-purple-500/5'
          }`}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Drop your document here</h3>
            <p className="text-slate-400 text-sm mb-4">or click to browse</p>
            <div className="flex flex-wrap gap-2 justify-center text-xs text-slate-500 mb-6">
              <span className="bg-slate-800 px-3 py-1 rounded-full">📄 PDF</span>
              <span className="bg-slate-800 px-3 py-1 rounded-full">📝 Text</span>
              <span className="bg-slate-800 px-3 py-1 rounded-full">🖼️ Images</span>
            </div>
          </div>

          <input
            type="file"
            onChange={handleFileInputChange}
            disabled={isLoading}
            accept=".pdf,.txt,.jpg,.jpeg,.png,.webp,.tiff,.tif"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* File Type Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
              </svg>
              <div>
                <h4 className="font-semibold text-slate-100 text-sm">PDF Files</h4>
                <p className="text-xs text-slate-400 mt-1">Extract text from PDF documents</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
              </svg>
              <div>
                <h4 className="font-semibold text-slate-100 text-sm">Text Files</h4>
                <p className="text-xs text-slate-400 mt-1">Read plain text documents</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold text-slate-100 text-sm">Images</h4>
                <p className="text-xs text-slate-400 mt-1">OCR from images (with Arabic)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Size Info */}
        <div className="mt-6 bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-blue-300">Maximum file size: 50 MB</p>
          </div>
        </div>
      </div>
    </div>
  );
}

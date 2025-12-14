'use client';

import { useState } from 'react';
import {
  uploadDocumentFile,
  chunkDocument,
  getAvailableChunkTables,
  saveChunks,
  TextChunk,
  ChunkResponse,
  ChunkTable,
} from '@/lib/api';
import DocumentUpload from './DocumentUpload';
import ChunkingConfig from './ChunkingConfig';
import ChunkPreview from './ChunkPreview';
import StorageSelector from './StorageSelector';
import ChunkResults from './ChunkResults';
import DatabaseConnectionModal from './DatabaseConnectionModal';

type ProcessorStep = 'upload' | 'chunking' | 'processing' | 'preview' | 'storage' | 'results';

export default function DocumentProcessor() {
  const [step, setStep] = useState<ProcessorStep>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Document upload state
  const [fileId, setFileId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);

  // Chunking configuration state
  const [splittingMethod, setSplittingMethod] = useState<'character' | 'recursive' | 'sentence' | 'paragraph' | 'markdown'>('recursive');
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);

  // Chunking results state
  const [chunkResponse, setChunkResponse] = useState<ChunkResponse | null>(null);
  const [chunks, setChunks] = useState<TextChunk[]>([]);

  // Storage state
  const [availableTables, setAvailableTables] = useState<ChunkTable[]>([]);
  const [storageMode, setStorageMode] = useState<'new_table' | 'existing_table'>('new_table');
  const [customTableName, setCustomTableName] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Database connection state
  const [customDatabaseUrl, setCustomDatabaseUrl] = useState<string | null>(null);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const { fileId: id, filename } = await uploadDocumentFile(file);
      setFileId(id);
      setFileName(filename);
      setFileType(file.type);
      setStep('chunking');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChunking = async () => {
    if (!fileId) return;

    setIsLoading(true);
    setError(null);
    setStep('processing');

    try {
      const response = await chunkDocument(fileId, splittingMethod, chunkSize, chunkOverlap);
      setChunkResponse(response);
      setChunks(response.data.chunks);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to chunk document');
      setStep('chunking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueFromPreview = async () => {
    setStep('storage');

    // Load available tables if needed
    if (storageMode === 'existing_table') {
      try {
        const tables = await getAvailableChunkTables(customDatabaseUrl || undefined);
        setAvailableTables(tables);
        if (tables.length > 0) {
          setSelectedTable(tables[0].id);
        }
      } catch (err) {
        console.error('Failed to load available tables:', err);
      }
    }
  };

  const handleStorageModeChange = async (mode: 'new_table' | 'existing_table') => {
    setStorageMode(mode);

    // Load available tables if switching to existing_table
    if (mode === 'existing_table') {
      try {
        const tables = await getAvailableChunkTables(customDatabaseUrl || undefined);
        setAvailableTables(tables);
        if (tables.length > 0) {
          setSelectedTable(tables[0].id);
        }
      } catch (err) {
        setError('Failed to load available tables');
      }
    }
  };

  const handleSaveChunks = async () => {
    if (!fileId || !chunks.length) return;

    setIsLoading(true);
    setError(null);

    try {
      const request = {
        fileId,
        fileName: fileName || 'document',
        chunks,
        storageMode,
        ...(storageMode === 'new_table' && { customTableName: customTableName || fileName || 'document_chunks' }),
        ...(storageMode === 'existing_table' && { projectId: selectedTable || '' }),
        ...(customDatabaseUrl && { databaseUrl: customDatabaseUrl }),
      };

      await saveChunks(request);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save chunks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatabaseConnect = (databaseUrl: string) => {
    setCustomDatabaseUrl(databaseUrl);
    setShowDatabaseModal(false);
  };

  const handleStartOver = () => {
    setStep('upload');
    setFileId(null);
    setFileName(null);
    setFileType(null);
    setChunkResponse(null);
    setChunks([]);
    setError(null);
    setStorageMode('new_table');
    setCustomTableName('');
    setSelectedTable(null);
    setAvailableTables([]);
    setCustomDatabaseUrl(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Database Connection Banner */}
      {step === 'upload' && (
        <div className={`rounded-xl p-6 border transition-all duration-300 ${
          customDatabaseUrl
            ? 'bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
            : 'bg-gradient-to-r from-blue-500/15 to-blue-600/10 border-blue-500/40 shadow-lg shadow-blue-500/10'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`font-bold text-lg ${customDatabaseUrl ? 'text-emerald-300' : 'text-blue-300'}`}>
                {customDatabaseUrl ? '✓ Database Connected' : '🔗 Database Connection'}
              </h3>
              <p className={`text-sm mt-2 leading-relaxed ${customDatabaseUrl ? 'text-emerald-200/80' : 'text-blue-200/80'}`}>
                {customDatabaseUrl
                  ? 'Using custom database connection. Your document chunks will be stored in this database.'
                  : 'Connect a PostgreSQL database for storing your document chunks, or use the default one from backend configuration.'}
              </p>
            </div>
            <button
              onClick={() => setShowDatabaseModal(true)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all flex-shrink-0 ml-4 hover:scale-105 ${
                customDatabaseUrl
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:shadow-lg hover:shadow-emerald-500/30 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:shadow-lg hover:shadow-blue-500/30 text-white'
              }`}
            >
              {customDatabaseUrl ? 'Change' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-2 flex-wrap lg:flex-nowrap">
          {/* Step 1: Upload */}
          <div className="flex items-center flex-shrink-0">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                step === 'upload'
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/40 scale-110'
                  : step === 'chunking' || step === 'processing' || step === 'preview' || step === 'storage' || step === 'results'
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              1
            </div>
            <span className="ml-2.5 text-sm font-medium text-slate-300 min-w-fit">Upload</span>
          </div>

          <div className="h-0.5 w-8 lg:w-12 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full flex-shrink-0"></div>

          {/* Step 2: Configure */}
          <div className="flex items-center flex-shrink-0">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                step === 'chunking'
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/40 scale-110'
                  : step === 'processing' || step === 'preview' || step === 'storage' || step === 'results'
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              2
            </div>
            <span className="ml-2.5 text-sm font-medium text-slate-300 min-w-fit">Configure</span>
          </div>

          <div className="h-0.5 w-8 lg:w-12 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full flex-shrink-0"></div>

          {/* Step 3: Preview */}
          <div className="flex items-center flex-shrink-0">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                step === 'preview'
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/40 scale-110'
                  : step === 'storage' || step === 'results'
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              3
            </div>
            <span className="ml-2.5 text-sm font-medium text-slate-300 min-w-fit">Preview</span>
          </div>

          <div className="h-0.5 w-8 lg:w-12 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full flex-shrink-0"></div>

          {/* Step 4: Storage */}
          <div className="flex items-center flex-shrink-0">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                step === 'storage'
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/40 scale-110'
                  : step === 'results'
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              4
            </div>
            <span className="ml-2.5 text-sm font-medium text-slate-300 min-w-fit">Storage</span>
          </div>

          <div className="h-0.5 w-8 lg:w-12 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full flex-shrink-0"></div>

          {/* Step 5: Complete */}
          <div className="flex items-center flex-shrink-0">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                step === 'results'
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/40 scale-110'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              5
            </div>
            <span className="ml-2.5 text-sm font-medium text-slate-300 min-w-fit">Complete</span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-gradient-to-r from-red-500/15 to-red-600/10 border border-red-500/40 rounded-xl shadow-lg shadow-red-500/10 animate-fade-in">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-300 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <DocumentUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
      )}

      {/* Step 2: Chunking Configuration */}
      {step === 'chunking' && (
        <ChunkingConfig
          splittingMethod={splittingMethod}
          chunkSize={chunkSize}
          chunkOverlap={chunkOverlap}
          onSplittingMethodChange={setSplittingMethod}
          onChunkSizeChange={setChunkSize}
          onChunkOverlapChange={setChunkOverlap}
          onStart={handleStartChunking}
          onCancel={handleStartOver}
          isLoading={isLoading}
          fileName={fileName || 'document'}
        />
      )}

      {/* Step 3: Processing */}
      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="relative w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 animate-pulse"></div>
            <div className="absolute inset-2 rounded-full border-3 border-transparent border-t-purple-500 border-r-pink-500 animate-spin"></div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent mb-3">
            Processing Document...
          </h2>
          <p className="text-slate-400 text-center max-w-md">Extracting text and creating chunks with metadata. This may take a moment depending on document size.</p>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && chunkResponse && (
        <ChunkPreview
          chunks={chunks}
          statistics={chunkResponse.data.statistics}
          onContinue={handleContinueFromPreview}
          onBack={() => setStep('chunking')}
          isLoading={isLoading}
        />
      )}

      {/* Step 4: Storage Selection */}
      {step === 'storage' && chunkResponse && (
        <StorageSelector
          storageMode={storageMode}
          customTableName={customTableName}
          selectedTable={selectedTable}
          availableTables={availableTables}
          statistics={chunkResponse.data.statistics}
          onStorageModeChange={handleStorageModeChange}
          onCustomTableNameChange={setCustomTableName}
          onSelectedTableChange={setSelectedTable}
          onSave={handleSaveChunks}
          onBack={() => setStep('preview')}
          isLoading={isLoading}
        />
      )}

      {/* Step 4: Results */}
      {step === 'results' && chunkResponse && (
        <ChunkResults
          fileId={fileId || ''}
          fileName={fileName || ''}
          chunks={chunks}
          statistics={chunkResponse.data.statistics}
          storageMode={storageMode}
          customTableName={customTableName}
          selectedTable={selectedTable}
          availableTables={availableTables}
          onStartOver={handleStartOver}
        />
      )}

      {/* Database Connection Modal */}
      <DatabaseConnectionModal
        isOpen={showDatabaseModal}
        onClose={() => setShowDatabaseModal(false)}
        onConnect={handleDatabaseConnect}
      />
    </div>
  );
}

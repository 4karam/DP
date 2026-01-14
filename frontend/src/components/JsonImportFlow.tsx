'use client';

import { useState } from 'react';
import JsonFileUpload from './JsonFileUpload';
import SheetPreview from './SheetPreview';
import ImportResults from './ImportResults';
import { uploadJsonFile, previewJsonFile, importJsonData, JsonPreview, ColumnInfo, ImportResult } from '@/lib/api';

type Step = 'upload' | 'preview' | 'importing' | 'results';

interface JsonImportFlowProps {
  customDatabaseUrl?: string | null;
}

export default function JsonImportFlow({ customDatabaseUrl }: JsonImportFlowProps) {
  const [step, setStep] = useState<Step>('upload');
  const [fileId, setFileId] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [jsonPreview, setJsonPreview] = useState<JsonPreview | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [tableName, setTableName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      // Upload file
      const { fileId, filename } = await uploadJsonFile(file);
      setFileId(fileId);
      setFilename(filename);

      // Get preview
      const preview = await previewJsonFile(fileId);
      setJsonPreview(preview);
      setColumns(preview.columns);

      // Default table name from filename
      const defaultTableName = filename.replace(/\.(json|jsonl)$/i, '').toLowerCase().replace(/[^a-z0-9_]/g, '_');
      setTableName(defaultTableName);

      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleColumnsUpdate = (updatedColumns: ColumnInfo[]) => {
    setColumns(updatedColumns);
  };

  const handleTableNameUpdate = (newTableName: string) => {
    setTableName(newTableName);
  };

  const handleImport = async () => {
    if (!fileId || !tableName) return;

    setIsLoading(true);
    setError(null);
    setStep('importing');

    try {
      const selectedColumns = columns.filter(col => col.selected !== false);

      if (selectedColumns.length === 0) {
        throw new Error('Please select at least one column to import');
      }

      const result = await importJsonData(
        fileId,
        tableName,
        selectedColumns,
        customDatabaseUrl || undefined
      );

      setImportResult(result);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during import');
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFileId(null);
    setFilename(null);
    setJsonPreview(null);
    setColumns([]);
    setTableName('');
    setError(null);
    setImportResult(null);
  };

  return (
    <div className="space-y-6">
      {step === 'upload' && (
        <JsonFileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
      )}

      {step === 'preview' && jsonPreview && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">{filename}</h2>
              <p className="text-sm text-slate-400 mt-1">
                {jsonPreview.rowCount.toLocaleString()} rows • {jsonPreview.format.toUpperCase()} format
              </p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              ← Upload Different File
            </button>
          </div>

          <SheetPreview
            sheet={{
              name: tableName,
              columns: columns,
              sampleData: jsonPreview.preview,
              rowCount: jsonPreview.rowCount
            }}
            onColumnsUpdate={handleColumnsUpdate}
            onTableNameUpdate={handleTableNameUpdate}
          />

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Importing...' : `Import to ${tableName}`}
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin animate-reverse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-slate-100">Importing JSON Data...</h3>
            <p className="text-slate-400">Processing {jsonPreview?.rowCount.toLocaleString()} rows</p>
          </div>
        </div>
      )}

      {step === 'results' && importResult && (
        <div className="space-y-6">
          <ImportResults
            results={[importResult]}
            summary={{
              total: 1,
              successful: importResult.success ? 1 : 0,
              failed: importResult.success ? 0 : 1,
              totalRowsInserted: importResult.rowsInserted,
            }}
            onStartOver={handleReset}
          />

          <div className="flex justify-center">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105"
            >
              Import Another JSON File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

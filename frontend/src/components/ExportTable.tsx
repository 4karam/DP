'use client';

import { useState, useEffect } from 'react';
import {
  getExportTables,
  getExportSchema,
  approveExportKeys,
  processExportBatches,
  downloadExportFile,
  cleanupExportSession,
  ExportSchemaResponse,
  ExportSummary,
} from '@/lib/api';
import ExportSchemaModal from './ExportSchemaModal';

type ExportStep = 'select_table' | 'schema_review' | 'exporting' | 'complete';

interface ExportState {
  tables: string[];
  selectedTable: string | null;
  schema: ExportSchemaResponse | null;
  summary: ExportSummary | null;
  step: ExportStep;
  isLoading: boolean;
  error: string | null;
  format: 'jsonl' | 'excel';
}

interface ExportTableProps {
  databaseUrl?: string;
}

export default function ExportTable({ databaseUrl }: ExportTableProps) {
  const [state, setState] = useState<ExportState>({
    tables: [],
    selectedTable: null,
    schema: null,
    summary: null,
    step: 'select_table',
    isLoading: false,
    error: null,
    format: 'jsonl',
  });

  const [showSchemaModal, setShowSchemaModal] = useState(false);

  // Load available tables on mount
  useEffect(() => {
    const loadTables = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        const tables = await getExportTables();
        setState((prev) => ({ ...prev, tables, isLoading: false }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load tables',
          isLoading: false,
        }));
      }
    };

    loadTables();
  }, []);

  const handleTableSelect = async (tableName: string) => {
    try {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        selectedTable: tableName,
      }));

      const schema = await getExportSchema(tableName);
      setState((prev) => ({
        ...prev,
        schema,
        step: 'schema_review',
        isLoading: false,
      }));
      setShowSchemaModal(true);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load schema',
        isLoading: false,
      }));
    }
  };

  const handleApproveKeys = async (modifiedKeys: Record<string, string>, excludedColumns: string[], format: 'jsonl' | 'excel') => {
    if (!state.schema) return;

    try {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        step: 'exporting',
        format,
      }));
      setShowSchemaModal(false);

      // Approve keys with excluded columns list
      await approveExportKeys(state.schema.sessionId, modifiedKeys, excludedColumns, format);

      // Process batches
      const { summary } = await processExportBatches(state.schema.sessionId, format);

      setState((prev) => ({
        ...prev,
        summary,
        step: 'complete',
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Export failed',
        isLoading: false,
        step: 'schema_review',
      }));
      setShowSchemaModal(true);
    }
  };

  const handleDownload = async () => {
    if (!state.summary) return;

    try {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      await downloadExportFile(state.summary.sessionId, state.summary.filename);

      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Download failed',
        isLoading: false,
      }));
    }
  };

  const handleStartOver = async () => {
    if (state.schema?.sessionId) {
      try {
        await cleanupExportSession(state.schema.sessionId);
      } catch {
        // Ignore cleanup errors
      }
    }

    setState({
      tables: state.tables,
      selectedTable: null,
      schema: null,
      summary: null,
      step: 'select_table',
      isLoading: false,
      error: null,
      format: 'jsonl',
    });
    setShowSchemaModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/30">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          Export Table Data
        </h2>
        <p className="text-slate-400 mt-3">Choose a table from your database and export it to Excel or JSONL format with custom column mapping</p>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="p-4 bg-gradient-to-r from-red-500/15 to-red-600/10 border border-red-500/40 rounded-xl shadow-lg shadow-red-500/10 animate-fade-in">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-300 font-medium">{state.error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Select Table */}
      {state.step === 'select_table' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.isLoading && state.tables.length === 0 ? (
              <div className="col-span-full flex justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-3 border-slate-700"></div>
                    <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-cyan-500 border-r-emerald-500 animate-spin"></div>
                  </div>
                  <p className="text-slate-400 font-medium">Loading tables...</p>
                </div>
              </div>
            ) : state.tables.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v3a2 2 0 01-2 2M5 12a2 2 0 00-2 2v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <p className="text-slate-300 font-medium text-lg">No tables found</p>
                <p className="text-slate-500 text-sm mt-2">Please import some data first or create a table in your database</p>
              </div>
            ) : (
              state.tables.map((table) => (
                <button
                  key={table}
                  onClick={() => handleTableSelect(table)}
                  disabled={state.isLoading}
                  className="group relative p-6 text-left bg-gradient-to-br from-slate-800/50 to-slate-900/50 hover:from-slate-800 hover:to-slate-800/50 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                          <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h12a1 1 0 011 1v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6z" />
                          </svg>
                        </div>
                        <p className="font-semibold text-slate-100 text-lg group-hover:text-emerald-300 transition-colors">
                          {table}
                        </p>
                      </div>
                      <p className="text-sm text-slate-400 ml-11">Click to export this table</p>
                    </div>
                    <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-400 transition-all group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Step 2: Exporting */}
      {state.step === 'exporting' && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 animate-pulse"></div>
            <div className="absolute inset-2 rounded-full border-3 border-transparent border-t-emerald-500 border-r-cyan-500 animate-spin"></div>
          </div>
          <h3 className="text-3xl font-bold bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent mb-3">Exporting Data...</h3>
          <p className="text-slate-400 text-center max-w-md leading-relaxed">
            Processing your table data in batches and preparing the export file. This may take a few moments for large tables.
          </p>
        </div>
      )}

      {/* Step 3: Export Complete */}
      {state.step === 'complete' && state.summary && (
        <div className="animate-fade-in space-y-6">
          {/* Success Message */}
          <div className="p-6 bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 border border-emerald-500/40 rounded-xl shadow-lg shadow-emerald-500/15">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <svg className="w-7 h-7 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-emerald-300 font-semibold text-lg">✨ Export completed successfully!</p>
                <p className="text-emerald-200/70 text-sm mt-1">Your data is ready to download</p>
              </div>
            </div>
          </div>

          {/* Export Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-5 border border-slate-700/50 hover:border-slate-600/80 transition-colors">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Table Name</p>
              <p className="text-slate-100 font-bold text-lg mt-2 truncate">{state.summary.tableName}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-800/30 to-emerald-900/30 rounded-xl p-5 border border-emerald-700/50 hover:border-emerald-600/80 transition-colors">
              <p className="text-xs font-medium text-emerald-300 uppercase tracking-wide">Total Rows</p>
              <p className="text-emerald-200 font-bold text-lg mt-2">{state.summary.totalRows.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-800/30 to-blue-900/30 rounded-xl p-5 border border-blue-700/50 hover:border-blue-600/80 transition-colors">
              <p className="text-xs font-medium text-blue-300 uppercase tracking-wide">Batches Processed</p>
              <p className="text-blue-200 font-bold text-lg mt-2">{state.summary.batchesProcessed}</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-800/30 to-cyan-900/30 rounded-xl p-5 border border-cyan-700/50 hover:border-cyan-600/80 transition-colors">
              <p className="text-xs font-medium text-cyan-300 uppercase tracking-wide">File Size</p>
              <p className="text-cyan-200 font-bold text-lg mt-2">
                {(state.summary.fileSize / 1024).toFixed(2)} KB
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-800/30 to-purple-900/30 rounded-xl p-5 border border-purple-700/50 hover:border-purple-600/80 transition-colors col-span-1">
              <p className="text-xs font-medium text-purple-300 uppercase tracking-wide">Format</p>
              <p className="text-purple-200 font-bold text-lg mt-2">{state.format === 'excel' ? '📊 Excel' : '📄 JSONL'}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-800/30 to-emerald-900/30 rounded-xl p-5 border border-emerald-700/50 hover:border-emerald-600/80 transition-colors">
              <p className="text-xs font-medium text-emerald-300 uppercase tracking-wide">Status</p>
              <p className="text-emerald-200 font-bold text-lg mt-2">✓ {state.summary.status}</p>
            </div>
          </div>

          {/* File Info */}
          <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700 space-y-3">
            <div>
              <p className="text-dark-400 text-sm mb-2">Filename</p>
              <p className="text-dark-200 font-mono text-sm break-all bg-dark-900/50 p-2 rounded">
                {state.summary.filename}
              </p>
            </div>
          </div>

          {/* Download Section */}
          <div className="space-y-3">
            <button
              onClick={handleDownload}
              disabled={state.isLoading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {state.isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download {state.format === 'excel' ? 'Excel' : 'JSONL'} File
                </>
              )}
            </button>
            <button
              onClick={handleStartOver}
              disabled={state.isLoading}
              className="w-full px-6 py-3 bg-dark-800 hover:bg-dark-700 text-dark-200 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export Another Table
            </button>
          </div>

          {/* Format Info */}
          {state.format === 'jsonl' ? (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">JSONL Format (JSON Lines)</p>
                  <p>Each line is a separate JSON object representing one row from the table.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-green-300">
                  <p className="font-medium mb-1">Excel Format (.xlsx)</p>
                  <p>Data formatted as a spreadsheet with customizable column headers.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Schema Modal */}
      <ExportSchemaModal
        isOpen={showSchemaModal}
        schema={state.schema}
        isLoading={state.isLoading}
        onApprove={handleApproveKeys}
        onCancel={() => {
          setShowSchemaModal(false);
          handleStartOver();
        }}
      />
    </div>
  );
}

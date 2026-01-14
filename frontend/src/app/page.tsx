'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';
import SheetPreview from '@/components/SheetPreview';
import ImportResults from '@/components/ImportResults';
import DatabaseConnectionModal from '@/components/DatabaseConnectionModal';
import ExportTable from '@/components/ExportTable';
import DocumentProcessor from '@/components/DocumentProcessor';
import JsonImportFlow from '@/components/JsonImportFlow';
import { uploadFile, previewFile, importData, ExcelData, ColumnInfo, ImportResult, ImportSummary, TableConfig } from '@/lib/api';

type Step = 'upload' | 'preview' | 'importing' | 'results';
type MainStep = 'import' | 'export' | 'documents' | 'json';

export default function Home() {
  const [mainStep, setMainStep] = useState<MainStep>('import');
  const [step, setStep] = useState<Step>('upload');
  const [fileId, setFileId] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<ExcelData | null>(null);
  const [sheetConfigs, setSheetConfigs] = useState<Map<string, ColumnInfo[]>>(new Map());
  const [tableNames, setTableNames] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [showDatabaseModal, setShowDatabaseModal] = useState(false);
  const [customDatabaseUrl, setCustomDatabaseUrl] = useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      // Upload file
      const { fileId, filename } = await uploadFile(file);
      setFileId(fileId);
      setFilename(filename);

      // Get preview
      const data = await previewFile(fileId);
      setExcelData(data);

      // Initialize sheet configs with detected columns
      const configs = new Map<string, ColumnInfo[]>();
      const names = new Map<string, string>();
      data.sheets.forEach((sheet) => {
        configs.set(sheet.name, sheet.columns);
        names.set(sheet.name, sheet.name);
      });
      setSheetConfigs(configs);
      setTableNames(names);

      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleColumnsUpdate = (sheetName: string, columns: ColumnInfo[]) => {
    setSheetConfigs((prev) => {
      const newConfigs = new Map(prev);
      newConfigs.set(sheetName, columns);
      return newConfigs;
    });
  };

  const handleTableNameUpdate = (sheetName: string, tableName: string) => {
    setTableNames((prev) => {
      const newNames = new Map(prev);
      newNames.set(sheetName, tableName);
      return newNames;
    });
  };

  const handleImport = async () => {
    if (!fileId || !excelData) return;

    // Prepare table configurations, filtering out unselected columns
    const tables: TableConfig[] = excelData.sheets.map((sheet) => ({
      tableName: tableNames.get(sheet.name) || sheet.name,
      sheetName: sheet.name,
      columns: (sheetConfigs.get(sheet.name) || sheet.columns).filter(col => col.selected !== false),
    }));

    // Check for duplicate table names
    const tableNameSet = new Set<string>();
    const duplicates: string[] = [];

    tables.forEach((table) => {
      if (tableNameSet.has(table.tableName)) {
        duplicates.push(table.tableName);
      } else {
        tableNameSet.add(table.tableName);
      }
    });

    if (duplicates.length > 0) {
      setError(`Duplicate table names found: ${duplicates.join(', ')}. Each table must have a unique name.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep('importing');

    try {
      // Import data
      const { results, summary } = await importData(fileId, tables, customDatabaseUrl || undefined);
      setImportResults(results);
      setImportSummary(summary);
      setStep('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during import');
      setStep('preview');
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
    setFilename(null);
    setExcelData(null);
    setSheetConfigs(new Map());
    setTableNames(new Map());
    setError(null);
    setImportResults(null);
    setImportSummary(null);
    setCustomDatabaseUrl(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-transparent rounded-full"></div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">
              Excel ⇄ PostgreSQL
            </h1>
            <div className="h-1 w-12 bg-gradient-to-l from-blue-500 to-transparent rounded-full"></div>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
            {mainStep === 'import'
              ? '📥 Upload Excel files, preview with automatic type detection, customize columns, and seamlessly import to PostgreSQL'
              : mainStep === 'export'
              ? '📤 Export PostgreSQL tables to Excel or JSONL format with custom column mappings'
              : mainStep === 'json'
              ? '📋 Upload JSON or JSONL files, preview with automatic type detection, and import to PostgreSQL'
              : '📚 Upload documents (PDF, Text, Images), chunk with multiple strategies, and store with rich metadata'}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-14 flex justify-center gap-3 flex-wrap">
          <button
            onClick={() => {
              setMainStep('import');
              setStep('upload');
            }}
            className={`group relative px-8 py-3 font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 ${
              mainStep === 'import'
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-xl">📥</span> Import Excel
            </span>
            {mainStep === 'import' && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg blur-xl opacity-30 -z-10 group-hover:opacity-50 transition-opacity"></div>
            )}
          </button>
          <button
            onClick={() => setMainStep('json')}
            className={`group relative px-8 py-3 font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 ${
              mainStep === 'json'
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-xl">📋</span> Import JSON
            </span>
            {mainStep === 'json' && (
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-cyan-500 rounded-lg blur-xl opacity-30 -z-10 group-hover:opacity-50 transition-opacity"></div>
            )}
          </button>
          <button
            onClick={() => setMainStep('export')}
            className={`group relative px-8 py-3 font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 ${
              mainStep === 'export'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-xl">📤</span> Export Table
            </span>
            {mainStep === 'export' && (
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg blur-xl opacity-30 -z-10 group-hover:opacity-50 transition-opacity"></div>
            )}
          </button>
          <button
            onClick={() => setMainStep('documents')}
            className={`group relative px-8 py-3 font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 ${
              mainStep === 'documents'
                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30 scale-105'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80'
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-xl">📚</span> Process Documents
            </span>
            {mainStep === 'documents' && (
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 rounded-lg blur-xl opacity-30 -z-10 group-hover:opacity-50 transition-opacity"></div>
            )}
          </button>
        </div>

        {/* Progress Indicator - Only for Import */}
        {mainStep === 'import' && (
        <div className="mb-14 animate-fade-in">
          <div className="flex items-center justify-center space-x-2 flex-wrap lg:flex-nowrap">
            {/* Step 1 */}
            <div className="flex items-center flex-shrink-0">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  step === 'upload'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110'
                    : step === 'preview' || step === 'importing' || step === 'results'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                1
              </div>
              <span className="ml-2.5 text-sm font-medium text-slate-300 min-w-fit">Upload</span>
            </div>

            <div className="h-0.5 w-8 lg:w-12 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full flex-shrink-0"></div>

            {/* Step 2 */}
            <div className="flex items-center flex-shrink-0">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  step === 'preview'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110'
                    : step === 'importing' || step === 'results'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                2
              </div>
              <span className="ml-2.5 text-sm font-medium text-slate-300 min-w-fit">Preview</span>
            </div>

            <div className="h-0.5 w-8 lg:w-12 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full flex-shrink-0"></div>

            {/* Step 3 */}
            <div className="flex items-center flex-shrink-0">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  step === 'importing'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/40 scale-110'
                    : step === 'results'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                3
              </div>
              <span className="ml-2.5 text-sm font-medium text-slate-300 min-w-fit">Processing</span>
            </div>

            <div className="h-0.5 w-8 lg:w-12 bg-gradient-to-r from-slate-700 to-slate-600 rounded-full flex-shrink-0"></div>

            {/* Step 4 */}
            <div className="flex items-center flex-shrink-0">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                  step === 'results'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/40 scale-110'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                4
              </div>
              <span className="ml-2.5 text-sm font-medium text-slate-300 min-w-fit">Complete</span>
            </div>
          </div>
        </div>
        )}

        {/* Content */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-800/50 backdrop-blur-sm animate-fade-in">
          {/* Error Message - Import Only */}
          {mainStep === 'import' && error && (
            <div className="mb-6 p-4 bg-gradient-to-r from-red-500/15 to-red-600/10 border border-red-500/40 rounded-xl shadow-lg shadow-red-500/10 animate-fade-in">
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

          {/* Import Mode */}
          {mainStep === 'import' && (
            <>
              {/* Step 1: Upload */}
              {step === 'upload' && (
                <div className="animate-fade-in space-y-6">
                  {/* Database Connection Banner */}
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
                            ? 'Using custom database connection. Your data will be imported to this database.'
                            : 'Connect a PostgreSQL database for your imports, or use the default one from backend configuration.'}
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

                  {/* File Upload Section */}
                  <div>
                    <h3 className="font-bold text-dark-100 mb-4">Upload Excel File</h3>
                    <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
                  </div>
                </div>
              )}

              {/* Step 2: Preview */}
          {step === 'preview' && excelData && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-dark-100">Preview & Configure</h2>
                  <p className="text-dark-400 mt-1">
                    File: <span className="text-dark-300 font-medium">{filename}</span>
                  </p>
                  {customDatabaseUrl && (
                    <p className="text-blue-400 mt-1 text-sm">
                      ✓ Using custom database
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowDatabaseModal(true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      customDatabaseUrl
                        ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                        : 'text-dark-400 hover:text-dark-200'
                    }`}
                  >
                    {customDatabaseUrl ? '✓ Database Connected' : 'Connect Database'}
                  </button>
                  <button
                    onClick={handleStartOver}
                    className="px-4 py-2 text-dark-400 hover:text-dark-200 transition-colors"
                  >
                    ← Change File
                  </button>
                </div>
              </div>

              {/* Info Box About Column Management */}
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-300 mb-1">Manage Your Columns</h4>
                    <p className="text-xs text-blue-300/80">
                      Use the checkboxes to select which columns you want to import. Uncheck a column to exclude it from the import. Empty columns are automatically detected and highlighted in yellow. Click the trash icon to remove individual columns, or use "Remove Empty" to bulk delete empty columns. This helps keep your database clean.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {excelData.sheets.map((sheet) => (
                  <SheetPreview
                    key={sheet.name}
                    sheet={sheet}
                    onColumnsUpdate={(columns) => handleColumnsUpdate(sheet.name, columns)}
                    onTableNameUpdate={(name) => handleTableNameUpdate(sheet.name, name)}
                    allTableNames={Array.from(tableNames.values())}
                  />
                ))}
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-dark-700">
                <button
                  onClick={handleStartOver}
                  className="px-6 py-3 bg-dark-800 hover:bg-dark-700 text-dark-200 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-dark-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-dark-950"
                >
                  Import to PostgreSQL
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="relative w-20 h-20 mb-8">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 animate-pulse"></div>
                <div className="absolute inset-2 rounded-full border-3 border-transparent border-t-blue-500 border-r-cyan-500 animate-spin"></div>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent mb-3">Importing Data...</h2>
              <p className="text-slate-400 text-center max-w-md">Processing your Excel file and transferring data to PostgreSQL. This may take a few moments for large files.</p>
            </div>
          )}

              {/* Step 4: Results */}
              {step === 'results' && importResults && importSummary && (
                <ImportResults
                  results={importResults}
                  summary={importSummary}
                  onStartOver={handleStartOver}
                />
              )}
            </>
          )}

          {/* Export Mode */}
          {mainStep === 'export' && (
            <div className="space-y-6">
              {/* Database Connection Banner */}
              <div className={`rounded-lg p-6 border ${
                customDatabaseUrl
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`font-bold ${customDatabaseUrl ? 'text-green-400' : 'text-blue-400'}`}>
                      {customDatabaseUrl ? '✓ Database Connected' : 'Database Connection'}
                    </h3>
                    <p className={`text-sm mt-1 ${customDatabaseUrl ? 'text-green-400/80' : 'text-blue-400/80'}`}>
                      {customDatabaseUrl
                        ? 'Using custom database connection. Select a table to export.'
                        : 'Configure a custom database connection, or use the default one from your backend configuration.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDatabaseModal(true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex-shrink-0 ml-4 ${
                      customDatabaseUrl
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {customDatabaseUrl ? 'Change' : 'Connect'}
                  </button>
                </div>
              </div>

              {/* Export Table Component */}
              <ExportTable databaseUrl={customDatabaseUrl || undefined} />
            </div>
          )}

          {/* Document Processing Mode */}
          {mainStep === 'documents' && (
            <DocumentProcessor />
          )}

          {/* JSON Import Mode */}
          {mainStep === 'json' && (
            <JsonImportFlow customDatabaseUrl={customDatabaseUrl} />
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-500 text-sm space-y-1">
          <p className="font-medium text-slate-400">Built with Next.js, Fastify, and PostgreSQL</p>
          <p className="text-xs text-slate-600">🚀 Fast Excel ⇄ Database imports and exports</p>
        </div>
      </div>

      {/* Database Connection Modal */}
      <DatabaseConnectionModal
        isOpen={showDatabaseModal}
        onClose={() => setShowDatabaseModal(false)}
        onConnect={handleDatabaseConnect}
      />
    </main>
  );
}

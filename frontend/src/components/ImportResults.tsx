'use client';

import { ImportResult, ImportSummary } from '@/lib/api';

interface ImportResultsProps {
  results: ImportResult[];
  summary: ImportSummary;
  onStartOver: () => void;
}

export default function ImportResults({ results, summary, onStartOver }: ImportResultsProps) {
  const allSuccess = summary.failed === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Card */}
      <div
        className={`p-8 rounded-2xl border-2 backdrop-blur-sm ${
          allSuccess
            ? 'bg-gradient-to-br from-emerald-500/15 to-emerald-600/10 border-emerald-500/40 shadow-lg shadow-emerald-500/15'
            : 'bg-gradient-to-br from-amber-500/15 to-amber-600/10 border-amber-500/40 shadow-lg shadow-amber-500/15'
        }`}
      >
        <div className="flex items-start space-x-6">
          <div className="flex-shrink-0">
            {allSuccess ? (
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-full animate-pulse"></div>
                <svg className="w-16 h-16 text-emerald-400 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            ) : (
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-full animate-pulse"></div>
                <svg className="w-16 h-16 text-amber-400 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className={`text-3xl font-bold mb-4 ${allSuccess ? 'text-emerald-300' : 'text-amber-300'}`}>
              {allSuccess ? '✨ Import Successful!' : '⚠️ Import Partially Completed'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-5 rounded-xl border border-slate-700/50 hover:border-slate-600/80 transition-colors">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Tables</p>
                <p className="text-3xl font-bold text-slate-100 mt-2">{summary.total}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-800/30 to-emerald-900/30 p-5 rounded-xl border border-emerald-700/50 hover:border-emerald-600/80 transition-colors">
                <p className="text-xs font-medium text-emerald-300 uppercase tracking-wide">Total Rows</p>
                <p className="text-3xl font-bold text-emerald-300 mt-2">{summary.totalRowsInserted.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-800/30 to-emerald-900/30 p-5 rounded-xl border border-emerald-700/50 hover:border-emerald-600/80 transition-colors">
                <p className="text-xs font-medium text-emerald-300 uppercase tracking-wide">Successful</p>
                <p className="text-3xl font-bold text-emerald-300 mt-2">{summary.successful}</p>
              </div>
              <div className={`bg-gradient-to-br ${summary.failed > 0 ? 'from-red-800/30 to-red-900/30' : 'from-slate-800/30 to-slate-900/30'} p-5 rounded-xl border ${summary.failed > 0 ? 'border-red-700/50 hover:border-red-600/80' : 'border-slate-700/50'} transition-colors`}>
                <p className={`text-xs font-medium ${summary.failed > 0 ? 'text-red-300' : 'text-slate-400'} uppercase tracking-wide`}>Failed</p>
                <p className={`text-3xl font-bold mt-2 ${summary.failed > 0 ? 'text-red-300' : 'text-slate-400'}`}>{summary.failed}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">📊 Table Import Details</h3>
        {results.map((result, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
              result.success
                ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-emerald-500/30'
                : 'bg-gradient-to-r from-red-500/10 to-red-600/5 border-red-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="flex-shrink-0">
                  {result.success ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-100 text-lg">{result.tableName}</p>
                  {result.success ? (
                    <p className="text-sm text-emerald-300">
                      ✓ {result.rowsInserted.toLocaleString()} rows imported successfully
                    </p>
                  ) : (
                    <p className="text-sm text-red-300 font-medium">✕ {result.error}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-center pt-6">
        <button
          onClick={onStartOver}
          className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:shadow-lg hover:shadow-blue-500/30 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          <span className="flex items-center gap-2">
            <span>📥 Import Another File</span>
          </span>
        </button>
      </div>
    </div>
  );
}

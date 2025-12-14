'use client';

import { useState, useEffect } from 'react';
import { ExportSchemaResponse } from '@/lib/api';

interface ExportSchemaModalProps {
  isOpen: boolean;
  schema: ExportSchemaResponse | null;
  isLoading: boolean;
  onApprove: (modifiedKeys: Record<string, string>, excludedColumns: string[], format: 'jsonl' | 'excel') => void;
  onCancel: () => void;
}

export default function ExportSchemaModal({
  isOpen,
  schema,
  isLoading,
  onApprove,
  onCancel,
}: ExportSchemaModalProps) {
  const [modifiedKeys, setModifiedKeys] = useState<Record<string, string>>({});
  const [excludedColumns, setExcludedColumns] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<'jsonl' | 'excel'>('jsonl');

  useEffect(() => {
    if (schema?.modifiedKeys) {
      setModifiedKeys({ ...schema.modifiedKeys });
    }
    setExcludedColumns(new Set());
  }, [schema?.modifiedKeys]);

  if (!isOpen || !schema) {
    return null;
  }

  const handleKeyChange = (column: string, newValue: string) => {
    setModifiedKeys((prev) => ({
      ...prev,
      [column]: newValue,
    }));
  };

  const handleToggleColumn = (column: string) => {
    const newExcluded = new Set(excludedColumns);
    if (newExcluded.has(column)) {
      newExcluded.delete(column);
    } else {
      newExcluded.add(column);
    }
    setExcludedColumns(newExcluded);
  };

  const handleApprove = () => {
    // Filter out excluded columns from modifiedKeys
    const filteredKeys = Object.fromEntries(
      Object.entries(modifiedKeys).filter(([col]) => !excludedColumns.has(col))
    );
    onApprove(filteredKeys, Array.from(excludedColumns), format);
  };

  const visibleColumns = schema.columns.filter((col) => !excludedColumns.has(col));
  const selectedCount = schema.columns.length - excludedColumns.size;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-dark-800">
        {/* Header */}
        <div className="sticky top-0 bg-dark-900 border-b border-dark-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-dark-100">Review & Customize Export</h2>
              <p className="text-dark-400 mt-1">
                Table: <span className="text-dark-300 font-medium">{schema.tableName}</span>
                {excludedColumns.size > 0 && (
                  <span className="ml-4 text-sm">
                    <span className="text-blue-400">{selectedCount}</span> of <span className="text-dark-400">{schema.columns.length}</span> columns selected
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-dark-400 hover:text-dark-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-semibold text-dark-300 mb-3">Export Format</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('jsonl')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  format === 'jsonl'
                    ? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'bg-dark-800/50 border-dark-700 hover:border-dark-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    format === 'jsonl'
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-dark-600'
                  }`}>
                    {format === 'jsonl' && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${format === 'jsonl' ? 'text-blue-300' : 'text-dark-200'}`}>JSONL Format</p>
                    <p className="text-xs text-dark-400 mt-1">One JSON object per line</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setFormat('excel')}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  format === 'excel'
                    ? 'bg-green-500/20 border-green-500 shadow-lg shadow-green-500/20'
                    : 'bg-dark-800/50 border-dark-700 hover:border-dark-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    format === 'excel'
                      ? 'bg-green-500 border-green-500'
                      : 'border-dark-600'
                  }`}>
                    {format === 'excel' && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${format === 'excel' ? 'text-green-300' : 'text-dark-200'}`}>Excel Format</p>
                    <p className="text-xs text-dark-400 mt-1">Spreadsheet (.xlsx)</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* First Row Preview */}
          <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700">
            <h3 className="text-sm font-semibold text-dark-300 mb-3">First Row (Preview Data)</h3>
            <div className="grid grid-cols-2 gap-4">
              {visibleColumns.map((col) => (
                <div key={col} className="bg-dark-900/50 rounded p-3 border border-dark-700">
                  <p className="text-xs text-dark-400 mb-1">Value:</p>
                  <p className="text-dark-100 font-medium break-words">
                    {schema.firstRow[col] === null || schema.firstRow[col] === undefined
                      ? <span className="text-dark-500 italic">null</span>
                      : String(schema.firstRow[col])}
                  </p>
                </div>
              ))}
              {excludedColumns.size > 0 && (
                <div className="col-span-full text-center py-4 bg-dark-900/30 rounded border border-dashed border-dark-600">
                  <p className="text-xs text-dark-400">
                    {excludedColumns.size} column{excludedColumns.size !== 1 ? 's' : ''} excluded from export
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Column Name Mapping */}
          <div>
            <h3 className="text-sm font-semibold text-dark-300 mb-4">Customize Export Columns</h3>
            <div className="space-y-3">
              {schema.columns.map((col) => {
                const isExcluded = excludedColumns.has(col);
                return (
                  <div
                    key={col}
                    className={`flex items-end gap-3 p-3 rounded-lg border transition-all ${
                      isExcluded
                        ? 'bg-dark-900/30 border-dark-700 opacity-60'
                        : 'bg-dark-800/30 border-dark-700 hover:border-dark-600'
                    }`}
                  >
                    <button
                      onClick={() => handleToggleColumn(col)}
                      className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        isExcluded
                          ? 'bg-red-500/20 border-red-400'
                          : 'bg-green-500/10 border-green-400 hover:bg-green-500/20'
                      }`}
                      title={isExcluded ? 'Click to include column' : 'Click to exclude column'}
                    >
                      {isExcluded ? (
                        <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                    <div className="flex-1">
                      <label className="text-xs text-dark-400 block mb-1">Database Column Name</label>
                      <input
                        type="text"
                        value={col}
                        disabled
                        className="w-full px-3 py-2 bg-dark-800/50 border border-dark-700 rounded-lg text-dark-300 cursor-not-allowed text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-center text-dark-500 pb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-dark-400 block mb-1">Export As</label>
                      <input
                        type="text"
                        value={isExcluded ? '' : (modifiedKeys[col] || col)}
                        onChange={(e) => handleKeyChange(col, e.target.value)}
                        disabled={isExcluded}
                        className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                          isExcluded
                            ? 'bg-dark-800/30 border border-dark-700 text-dark-400 cursor-not-allowed'
                            : 'bg-dark-800 border border-dark-700 text-dark-100 focus:ring-blue-500'
                        }`}
                        placeholder={col}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-blue-300 space-y-2">
                <p>
                  <span className="font-medium">Custom Keys:</span> Modified names will be used as export column names. You can leave them unchanged to use original column names.
                </p>
                <p>
                  <span className="font-medium">Remove Columns:</span> Click the checkbox icon next to each column to include or exclude it from the export.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-dark-900 border-t border-dark-800 p-6 flex items-center justify-between gap-3">
          <div className="text-sm text-dark-400">
            {selectedCount} of {schema.columns.length} columns selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-2 bg-dark-800 hover:bg-dark-700 text-dark-200 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={isLoading || selectedCount === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title={selectedCount === 0 ? 'Select at least one column' : ''}
            >
              {isLoading && (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {isLoading ? 'Processing...' : 'Approve & Export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

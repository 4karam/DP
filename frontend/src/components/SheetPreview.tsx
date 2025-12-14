'use client';

import { useState } from 'react';
import { SheetPreview as SheetPreviewType, ColumnInfo } from '@/lib/api';

interface SheetPreviewProps {
  sheet: SheetPreviewType;
  onColumnsUpdate: (columns: ColumnInfo[]) => void;
  onTableNameUpdate?: (tableName: string) => void;
  allTableNames?: string[];
}

const COLUMN_TYPES = ['TEXT', 'INTEGER', 'FLOAT', 'BOOLEAN', 'DATE', 'TIMESTAMP'] as const;

/**
 * Check if a column has mostly empty values
 */
function isColumnEmpty(columnData: any[]): boolean {
  const nonEmptyCount = columnData.filter(cell => cell !== null && cell !== undefined && cell !== '').length;
  return nonEmptyCount === 0;
}

export default function SheetPreview({ sheet, onColumnsUpdate, onTableNameUpdate, allTableNames }: SheetPreviewProps) {
  const [columns, setColumns] = useState<ColumnInfo[]>(sheet.columns);
  const [isExpanded, setIsExpanded] = useState(true);
  const [tableName, setTableName] = useState<string>(sheet.name);

  const isDuplicate = allTableNames && allTableNames.filter(name => name === tableName).length > 1;

  const handleTableNameChange = (newName: string) => {
    setTableName(newName);
    if (onTableNameUpdate) {
      onTableNameUpdate(newName);
    }
  };

  const handleColumnNameChange = (index: number, newName: string) => {
    const updatedColumns = [...columns];
    updatedColumns[index] = { ...updatedColumns[index], name: newName };
    setColumns(updatedColumns);
    onColumnsUpdate(updatedColumns);
  };

  const handleColumnTypeChange = (index: number, newType: string) => {
    const updatedColumns = [...columns];
    updatedColumns[index] = { ...updatedColumns[index], type: newType as ColumnInfo['type'] };
    setColumns(updatedColumns);
    onColumnsUpdate(updatedColumns);
  };

  const handleRemoveColumn = (index: number) => {
    const updatedColumns = columns.filter((_, i) => i !== index);
    setColumns(updatedColumns);
    onColumnsUpdate(updatedColumns);
  };

  const handleColumnSelectionChange = (index: number, selected: boolean) => {
    const updatedColumns = [...columns];
    updatedColumns[index] = { ...updatedColumns[index], selected };
    setColumns(updatedColumns);
    onColumnsUpdate(updatedColumns);
  };

  const handleSelectAllColumns = (selected: boolean) => {
    const updatedColumns = columns.map(col => ({ ...col, selected }));
    setColumns(updatedColumns);
    onColumnsUpdate(updatedColumns);
  };

  const handleRemoveEmptyColumns = () => {
    const sampleData = sheet.sampleData;
    const updatedColumns = columns.filter((_, colIndex) => {
      const columnData = sampleData.map(row => row[colIndex]);
      return !isColumnEmpty(columnData);
    });
    setColumns(updatedColumns);
    onColumnsUpdate(updatedColumns);
  };

  // Identify empty columns for visual feedback
  const emptyColumnIndices = columns
    .map((_, colIndex) => {
      const columnData = sheet.sampleData.map(row => row[colIndex]);
      return isColumnEmpty(columnData) ? colIndex : -1;
    })
    .filter(idx => idx !== -1);

  return (
    <div className="border border-dark-700 rounded-lg bg-dark-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <div className="flex items-center space-x-3 flex-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center p-1 hover:bg-dark-800/50 rounded transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-5 h-5 text-dark-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="mb-2">
              <label className={`text-xs font-medium block mb-1 ${isDuplicate ? 'text-red-400' : 'text-dark-400'}`}>
                Sheet: {sheet.name} → Table Name
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => handleTableNameChange(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Table name"
                  className={`w-40 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
                    isDuplicate
                      ? 'bg-red-900/20 border border-red-600 text-red-200 focus:ring-red-500'
                      : 'bg-dark-800 border border-dark-600 text-dark-100 focus:ring-blue-500'
                  }`}
                />
                {isDuplicate && (
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {isDuplicate && (
                <p className="text-xs text-red-400 mt-1">Duplicate table name - must be unique</p>
              )}
            </div>
          </div>
          <span className="text-sm text-dark-400">({sheet.rowCount} rows)</span>
          {emptyColumnIndices.length > 0 && (
            <span className="text-xs bg-yellow-900/30 text-yellow-300 px-2 py-1 rounded">
              {emptyColumnIndices.length} empty column{emptyColumnIndices.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-dark-700 p-4 space-y-4">
          {/* Empty Columns Notice and Action */}
          {emptyColumnIndices.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-yellow-300 font-medium">Empty Columns Detected</p>
                <p className="text-xs text-yellow-300/70 mt-1">
                  {emptyColumnIndices.length} column{emptyColumnIndices.length !== 1 ? 's' : ''} with no data detected. You can remove them to keep your database clean.
                </p>
              </div>
              <button
                onClick={handleRemoveEmptyColumns}
                className="flex-shrink-0 px-3 py-2 text-xs font-medium bg-yellow-600/30 hover:bg-yellow-600/40 text-yellow-300 rounded transition-colors whitespace-nowrap"
              >
                Remove Empty
              </button>
            </div>
          )}

          {/* Columns Configuration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-dark-300">Column Configuration</h4>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSelectAllColumns(true)}
                  className="text-xs px-2 py-1 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 rounded transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={() => handleSelectAllColumns(false)}
                  className="text-xs px-2 py-1 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 rounded transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-2 px-3 text-dark-400 font-medium w-8">
                      <input
                        type="checkbox"
                        checked={columns.length > 0 && columns.every(col => col.selected !== false)}
                        onChange={(e) => handleSelectAllColumns(e.target.checked)}
                        className="w-4 h-4 rounded bg-dark-800 border border-dark-600 cursor-pointer accent-blue-500"
                        title="Select/deselect all columns"
                      />
                    </th>
                    <th className="text-left py-2 px-3 text-dark-400 font-medium">Original Name</th>
                    <th className="text-left py-2 px-3 text-dark-400 font-medium">Column Name</th>
                    <th className="text-left py-2 px-3 text-dark-400 font-medium">Data Type</th>
                    <th className="text-left py-2 px-3 text-dark-400 font-medium w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((column, index) => {
                    const isEmpty = emptyColumnIndices.includes(index);
                    return (
                      <tr
                        key={index}
                        className={`border-b border-dark-800 transition-colors ${
                          isEmpty ? 'bg-yellow-900/10 hover:bg-yellow-900/20' : 'hover:bg-dark-800/30'
                        } ${!column.selected ? 'opacity-60' : ''}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={column.selected !== false}
                            onChange={(e) => handleColumnSelectionChange(index, e.target.checked)}
                            className="w-4 h-4 rounded bg-dark-800 border border-dark-600 cursor-pointer accent-blue-500"
                            title="Include/exclude this column from import"
                          />
                        </td>
                        <td className="py-2 px-3 text-dark-400">{column.originalName}</td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={column.name}
                            onChange={(e) => handleColumnNameChange(index, e.target.value)}
                            className="w-full px-3 py-1.5 bg-dark-800 border border-dark-600 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={column.type}
                            onChange={(e) => handleColumnTypeChange(index, e.target.value)}
                            className="w-full px-3 py-1.5 bg-dark-800 border border-dark-600 rounded text-dark-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                          >
                            {COLUMN_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleRemoveColumn(index)}
                            className="inline-flex items-center justify-center p-1.5 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded transition-colors"
                            title="Remove this column"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sample Data Preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-dark-300 mb-3">Sample Data (First 10 rows)</h4>
            {columns.length === 0 ? (
              <div className="bg-dark-800/50 border border-dark-700 rounded-lg p-4 text-center">
                <p className="text-dark-400 text-sm">No columns selected. All columns have been removed.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-700">
                      {columns
                        .filter(col => col.selected !== false)
                        .map((column, index) => (
                          <th key={index} className="text-left py-2 px-3 text-dark-400 font-medium min-w-[120px]">
                            {column.name}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheet.sampleData.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-dark-800 hover:bg-dark-800/30">
                        {columns
                          .map((_, colIndex) => colIndex)
                          .filter(colIndex => columns[colIndex].selected !== false)
                          .map((colIndex) => (
                            <td key={colIndex} className="py-2 px-3 text-dark-300">
                              {row[colIndex] !== null && row[colIndex] !== undefined ? String(row[colIndex]) : <span className="text-dark-600">null</span>}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

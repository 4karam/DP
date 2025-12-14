'use client';

import { ChunkTable } from '@/lib/api';

interface StorageSelectorProps {
  storageMode: 'new_table' | 'existing_table';
  customTableName: string;
  selectedTable: string | null;
  availableTables: ChunkTable[];
  statistics: {
    totalChunks: number;
    totalCharacters: number;
    totalWords: number;
    avgChunkSize: number;
    avgWordCount: number;
    languages: string[];
    arabicChunks: number;
    latinChunks: number;
  };
  onStorageModeChange: (mode: 'new_table' | 'existing_table') => void;
  onCustomTableNameChange: (name: string) => void;
  onSelectedTableChange: (tableId: string) => void;
  onSave: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export default function StorageSelector({
  storageMode,
  customTableName,
  selectedTable,
  availableTables,
  statistics,
  onStorageModeChange,
  onCustomTableNameChange,
  onSelectedTableChange,
  onSave,
  onBack,
  isLoading,
}: StorageSelectorProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl p-8 border border-slate-700/50 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-slate-100 mb-8">Choose Storage Option</h2>

        {/* Statistics Overview */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-2xl font-bold text-purple-400">{statistics.totalChunks}</div>
            <div className="text-xs text-slate-400 mt-1">Total Chunks</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-2xl font-bold text-blue-400">{statistics.totalWords.toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-1">Total Words</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-2xl font-bold text-pink-400">{Math.round(statistics.avgWordCount)}</div>
            <div className="text-xs text-slate-400 mt-1">Avg Words/Chunk</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-2xl font-bold text-emerald-400">{statistics.languages.join(', ')}</div>
            <div className="text-xs text-slate-400 mt-1">Languages</div>
          </div>
        </div>

        {/* Storage Mode Selection */}
        <div className="space-y-4 mb-8">
          <h3 className="text-lg font-semibold text-slate-100">Storage Option</h3>

          {/* Option 1: New Table */}
          <button
            onClick={() => onStorageModeChange('new_table')}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-300 text-left ${
              storageMode === 'new_table'
                ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                : 'border-slate-600 bg-slate-900/30 hover:border-purple-400 hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    storageMode === 'new_table'
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-slate-500 bg-transparent'
                  }`}
                >
                  {storageMode === 'new_table' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-100 mb-1">Create New Table</h4>
                <p className="text-sm text-slate-400">Start a new project for these chunks</p>
              </div>
            </div>
          </button>

          {/* Option 2: Existing Table */}
          <button
            onClick={() => onStorageModeChange('existing_table')}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-300 text-left ${
              storageMode === 'existing_table'
                ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                : 'border-slate-600 bg-slate-900/30 hover:border-emerald-400 hover:bg-slate-900/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    storageMode === 'existing_table'
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-slate-500 bg-transparent'
                  }`}
                >
                  {storageMode === 'existing_table' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-slate-100 mb-1">Add to Existing Table</h4>
                <p className="text-sm text-slate-400">Append to an existing project table</p>
              </div>
            </div>
          </button>
        </div>

        {/* Storage Configuration */}
        {storageMode === 'new_table' ? (
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <label className="block text-sm font-semibold text-slate-100 mb-3">Table Name</label>
            <div className="space-y-3">
              <input
                type="text"
                value={customTableName}
                onChange={(e) => onCustomTableNameChange(e.target.value)}
                placeholder="e.g., project_documents, research_papers"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-slate-400">
                Table name should be lowercase alphanumeric with underscores. Example: <code className="bg-slate-900/50 px-2 py-1 rounded text-slate-300">my_project_chunks</code>
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <label className="block text-sm font-semibold text-slate-100 mb-3">Select Project</label>
            {availableTables.length > 0 ? (
              <select
                value={selectedTable || ''}
                onChange={(e) => onSelectedTableChange(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value="" disabled>
                  Select a table...
                </option>
                {availableTables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name} ({table.chunkCount} chunks)
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600 text-center">
                <p className="text-slate-400 text-sm">No existing tables found. Create a new table first.</p>
              </div>
            )}
          </div>
        )}

        {/* Information Box */}
        <div className={`mt-8 rounded-lg p-4 border ${
          storageMode === 'new_table'
            ? 'bg-purple-900/20 border-purple-700/30'
            : 'bg-emerald-900/20 border-emerald-700/30'
        }`}>
          <div className="flex items-start gap-3">
            <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              storageMode === 'new_table' ? 'text-purple-400' : 'text-emerald-400'
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className={`text-sm font-medium mb-1 ${
                storageMode === 'new_table' ? 'text-purple-300' : 'text-emerald-300'
              }`}>
                {storageMode === 'new_table' ? 'New Project' : 'Add to Existing'}
              </h4>
              <p className={`text-xs ${
                storageMode === 'new_table' ? 'text-purple-300/80' : 'text-emerald-300/80'
              }`}>
                {storageMode === 'new_table'
                  ? `Creating a new table named "${customTableName || 'document_chunks'}" with ${statistics.totalChunks} chunks.`
                  : `Adding ${statistics.totalChunks} chunks to the selected project table.`}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-8 border-t border-slate-700 mt-8">
          <button
            onClick={onBack}
            disabled={isLoading}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-600"
          >
            Back
          </button>
          <button
            onClick={onSave}
            disabled={isLoading || (storageMode === 'new_table' && !customTableName) || (storageMode === 'existing_table' && !selectedTable)}
            className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-emerald-500/30 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {isLoading ? 'Saving...' : 'Save Chunks'}
          </button>
        </div>
      </div>
    </div>
  );
}

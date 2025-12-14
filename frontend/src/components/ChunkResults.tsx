'use client';

import { useState } from 'react';
import { TextChunk, ChunkTable } from '@/lib/api';

interface ChunkResultsProps {
  fileId: string;
  fileName: string;
  chunks: TextChunk[];
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
  storageMode: 'new_table' | 'existing_table';
  customTableName: string;
  selectedTable: string | null;
  availableTables: ChunkTable[];
  onStartOver: () => void;
}

export default function ChunkResults({
  fileId,
  fileName,
  chunks,
  statistics,
  storageMode,
  customTableName,
  selectedTable,
  availableTables,
  onStartOver,
}: ChunkResultsProps) {
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null);

  const getTableName = () => {
    if (storageMode === 'new_table') {
      return customTableName;
    } else {
      const table = availableTables.find((t) => t.id === selectedTable);
      return table?.name || 'Unknown Table';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Success Message */}
      <div className="bg-gradient-to-r from-emerald-500/15 to-teal-600/10 border border-emerald-500/40 rounded-xl shadow-lg shadow-emerald-500/10 p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 mt-0.5">
            <svg className="w-8 h-8 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-300 mb-1">✓ Chunks Saved Successfully!</h3>
            <p className="text-emerald-200/80 text-sm">
              {statistics.totalChunks} chunks have been saved to <span className="font-semibold">"{getTableName()}"</span>
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl p-8 border border-slate-700/50 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-slate-100 mb-6">Processing Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-1">File Processed</div>
            <div className="text-lg font-semibold text-slate-100">{fileName}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-1">Total Chunks</div>
            <div className="text-2xl font-bold text-purple-400">{statistics.totalChunks}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-1">Total Words</div>
            <div className="text-2xl font-bold text-blue-400">{statistics.totalWords.toLocaleString()}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-sm text-slate-400 mb-1">Languages</div>
            <div className="text-lg font-semibold text-emerald-400">{statistics.languages.join(', ')}</div>
          </div>
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-lg p-4 border border-slate-700/30">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Characters</div>
            <div className="text-xl font-bold text-slate-100">{statistics.totalCharacters.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-lg p-4 border border-slate-700/30">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Avg Chunk Size</div>
            <div className="text-xl font-bold text-slate-100">{Math.round(statistics.avgChunkSize)}</div>
          </div>
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-lg p-4 border border-slate-700/30">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Avg Words/Chunk</div>
            <div className="text-xl font-bold text-slate-100">{Math.round(statistics.avgWordCount)}</div>
          </div>
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-lg p-4 border border-slate-700/30">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Arabic Chunks</div>
            <div className="text-xl font-bold text-slate-100">{statistics.arabicChunks}</div>
          </div>
        </div>
      </div>

      {/* Storage Information */}
      <div className={`rounded-xl p-6 border ${
        storageMode === 'new_table'
          ? 'bg-purple-900/20 border-purple-700/30'
          : 'bg-emerald-900/20 border-emerald-700/30'
      }`}>
        <div className="flex items-start gap-4">
          <svg className={`w-6 h-6 mt-0.5 flex-shrink-0 ${
            storageMode === 'new_table' ? 'text-purple-400' : 'text-emerald-400'
          }`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 12a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" />
            <path d="M3 7a1 1 0 011-1h5V4a1 1 0 011-1h2a1 1 0 011 1v2h5a1 1 0 011 1v3H3V7z" />
          </svg>
          <div className="flex-1">
            <h3 className={`font-semibold mb-1 ${
              storageMode === 'new_table' ? 'text-purple-300' : 'text-emerald-300'
            }`}>
              {storageMode === 'new_table' ? 'New Table Created' : 'Table Updated'}
            </h3>
            <p className={`text-sm ${
              storageMode === 'new_table' ? 'text-purple-300/80' : 'text-emerald-300/80'
            }`}>
              Table: <span className="font-mono font-semibold">{getTableName()}</span>
              <br />
              Chunks Stored: <span className="font-semibold">{statistics.totalChunks}</span>
              {storageMode === 'new_table' && ' (New project created)'}
              {storageMode === 'existing_table' && ' (Added to existing project)'}
            </p>
          </div>
        </div>
      </div>

      {/* Sample Chunks */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl p-8 border border-slate-700/50 backdrop-blur-sm">
        <h3 className="text-xl font-bold text-slate-100 mb-4">Sample Chunks (First 5)</h3>
        <div className="space-y-3">
          {chunks.slice(0, 5).map((chunk, idx) => (
            <div
              key={idx}
              onClick={() => setExpandedChunk(expandedChunk === idx ? null : idx)}
              className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 cursor-pointer hover:border-purple-500/50 hover:bg-slate-800/70 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block px-2 py-1 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded">
                      Chunk {chunk.index + 1}
                    </span>
                    {chunk.metadata.language && (
                      <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                        {chunk.metadata.language}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {chunk.wordCount} words • {chunk.characterCount} chars
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm line-clamp-2">
                    {chunk.text}
                  </p>
                </div>
                <svg className={`w-5 h-5 text-slate-500 flex-shrink-0 ml-4 transition-transform ${
                  expandedChunk === idx ? 'rotate-180' : ''
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              {/* Expanded Content */}
              {expandedChunk === idx && (
                <div className="mt-4 pt-4 border-t border-slate-700 space-y-3 animate-fade-in">
                  <div>
                    <p className="text-slate-400 text-xs font-semibold mb-1">Full Text:</p>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{chunk.text}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {chunk.metadata.readabilityScore !== undefined && (
                      <div className="bg-slate-900/50 rounded p-2">
                        <div className="text-xs text-slate-500">Readability</div>
                        <div className="font-semibold text-slate-100">{chunk.metadata.readabilityScore.toFixed(1)}</div>
                      </div>
                    )}
                    {chunk.metadata.confidence !== undefined && (
                      <div className="bg-slate-900/50 rounded p-2">
                        <div className="text-xs text-slate-500">Confidence</div>
                        <div className="font-semibold text-slate-100">{(chunk.metadata.confidence * 100).toFixed(0)}%</div>
                      </div>
                    )}
                    {chunk.metadata.pageNumber && (
                      <div className="bg-slate-900/50 rounded p-2">
                        <div className="text-xs text-slate-500">Page</div>
                        <div className="font-semibold text-slate-100">{chunk.metadata.pageNumber}</div>
                      </div>
                    )}
                    <div className="bg-slate-900/50 rounded p-2">
                      <div className="text-xs text-slate-500">Method</div>
                      <div className="font-semibold text-slate-100 capitalize">{chunk.metadata.splittingMethod}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {chunk.metadata.containsUrls && (
                      <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                        Contains URLs
                      </span>
                    )}
                    {chunk.metadata.containsNumbers && (
                      <span className="inline-block px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
                        Contains Numbers
                      </span>
                    )}
                    {chunk.metadata.hasArabic && (
                      <span className="inline-block px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded">
                        Arabic Content
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-sm text-slate-400 mt-4 p-3 bg-slate-900/50 rounded border border-slate-700/30">
          Showing 5 of {chunks.length} chunks. All chunks have been saved to "{getTableName()}"
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onStartOver}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          Process Another Document
        </button>
      </div>
    </div>
  );
}

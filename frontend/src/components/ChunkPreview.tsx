'use client';

import { TextChunk } from '@/lib/api';

interface ChunkPreviewProps {
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
  onContinue: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export default function ChunkPreview({
  chunks,
  statistics,
  onContinue,
  onBack,
  isLoading,
}: ChunkPreviewProps) {
  const displayChunks = chunks.slice(0, 5); // Show first 5 chunks as preview
  const hasMore = chunks.length > 5;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl p-8 border border-slate-700/50 backdrop-blur-sm">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Preview Chunks</h2>
        <p className="text-slate-400 mb-6">Review sample chunks and statistics before saving</p>

        {/* Statistics Cards */}
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

        {/* Language Detection Details */}
        <div className="mb-8 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-sm font-semibold text-slate-300 mb-1">Avg Chunk Size</div>
            <div className="text-xl font-bold text-slate-200">{Math.round(statistics.avgChunkSize)} chars</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-sm font-semibold text-slate-300 mb-1">Arabic Chunks</div>
            <div className="text-xl font-bold text-amber-400">{statistics.arabicChunks}</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="text-sm font-semibold text-slate-300 mb-1">Latin Chunks</div>
            <div className="text-xl font-bold text-sky-400">{statistics.latinChunks}</div>
          </div>
        </div>

        {/* Sample Chunks */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Sample Chunks ({displayChunks.length} of {chunks.length})</h3>
          <div className="space-y-4">
            {displayChunks.map((chunk, index) => (
              <div key={index} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 hover:border-slate-600 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/20 text-purple-300 text-sm font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm text-slate-400">
                        {chunk.characterCount} chars • {chunk.wordCount} words
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {chunk.metadata.language === 'arabic' && (
                      <span className="inline-block px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Arabic
                      </span>
                    )}
                    {chunk.metadata.language === 'mixed' && (
                      <span className="inline-block px-2 py-1 text-xs rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        Mixed
                      </span>
                    )}
                    {chunk.metadata.language === 'english' && (
                      <span className="inline-block px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        English
                      </span>
                    )}
                    <span className="inline-block px-2 py-1 text-xs rounded bg-slate-700/50 text-slate-400 border border-slate-600">
                      Read: {Math.round(chunk.metadata.readabilityScore || 0)}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-900/30 rounded p-3 text-sm text-slate-300 leading-relaxed max-h-24 overflow-y-auto">
                  {chunk.text}
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700/30 rounded-lg text-center">
              <p className="text-sm text-purple-300">
                ... and {chunks.length - 5} more chunks
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mb-8 bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-300 mb-1">Preview Information</h4>
              <p className="text-xs text-blue-300/80">
                Above is a preview of your first {displayChunks.length} chunks. All {statistics.totalChunks} chunks will be saved with their metadata including language detection, readability scores, and content features.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-8 border-t border-slate-700">
          <button
            onClick={onBack}
            disabled={isLoading}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-600"
          >
            Back
          </button>
          <button
            onClick={onContinue}
            disabled={isLoading}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {isLoading ? 'Processing...' : 'Continue to Storage'}
          </button>
        </div>
      </div>
    </div>
  );
}

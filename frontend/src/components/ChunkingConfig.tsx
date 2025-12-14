'use client';

interface ChunkingConfigProps {
  splittingMethod: 'character' | 'recursive' | 'sentence' | 'paragraph' | 'markdown';
  chunkSize: number;
  chunkOverlap: number;
  onSplittingMethodChange: (method: 'character' | 'recursive' | 'sentence' | 'paragraph' | 'markdown') => void;
  onChunkSizeChange: (size: number) => void;
  onChunkOverlapChange: (overlap: number) => void;
  onStart: () => void;
  onCancel: () => void;
  isLoading: boolean;
  fileName: string;
}

const methodDescriptions = {
  character: {
    title: 'Character-Based',
    description: 'Split by fixed character count. Good for consistent chunk sizes.',
    icon: '📏',
  },
  recursive: {
    title: 'Recursive (Recommended)',
    description: 'Smart splitting that respects document structure (paragraphs, sentences, words).',
    icon: '🧩',
  },
  sentence: {
    title: 'Sentence-Based',
    description: 'Split at sentence boundaries. Preserves complete sentences.',
    icon: '📝',
  },
  paragraph: {
    title: 'Paragraph-Based',
    description: 'Split at paragraph breaks. Keeps related content together.',
    icon: '📄',
  },
  markdown: {
    title: 'Markdown-Aware',
    description: 'Split respecting markdown headers and structure.',
    icon: '🔗',
  },
};

export default function ChunkingConfig({
  splittingMethod,
  chunkSize,
  chunkOverlap,
  onSplittingMethodChange,
  onChunkSizeChange,
  onChunkOverlapChange,
  onStart,
  onCancel,
  isLoading,
  fileName,
}: ChunkingConfigProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl p-8 border border-slate-700/50 backdrop-blur-sm">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Configure Chunking</h2>
          <p className="text-slate-400">File: <span className="text-slate-300 font-medium">{fileName}</span></p>
        </div>

        {/* Splitting Method Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Splitting Method</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['character', 'recursive', 'sentence', 'paragraph', 'markdown'] as const).map((method) => {
              const desc = methodDescriptions[method];
              const isSelected = splittingMethod === method;

              return (
                <button
                  key={method}
                  onClick={() => onSplittingMethodChange(method)}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 text-left ${
                    isSelected
                      ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                      : 'border-slate-600 bg-slate-900/30 hover:border-purple-400 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-1">{desc.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-100">{desc.title}</h4>
                      <p className="text-sm text-slate-400 mt-1">{desc.description}</p>
                      {isSelected && method === 'recursive' && (
                        <div className="mt-2 inline-block">
                          <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded">✓ Recommended</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Parameters */}
        <div className="space-y-6">
          {/* Chunk Size */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-lg font-semibold text-slate-100">
                Chunk Size
              </label>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {chunkSize}
              </span>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Number of characters per chunk. Smaller chunks = more granular, larger chunks = better context.
            </p>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={chunkSize}
              onChange={(e) => onChunkSizeChange(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>100</span>
              <span>2500</span>
              <span>5000</span>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onChunkSizeChange(500)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  chunkSize === 500
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                Small (500)
              </button>
              <button
                onClick={() => onChunkSizeChange(1000)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  chunkSize === 1000
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                Medium (1000)
              </button>
              <button
                onClick={() => onChunkSizeChange(2000)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  chunkSize === 2000
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                Large (2000)
              </button>
            </div>
          </div>

          {/* Chunk Overlap */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-lg font-semibold text-slate-100">
                Chunk Overlap
              </label>
              <span className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                {chunkOverlap}
              </span>
            </div>

            {/* Method-specific overlap guidance */}
            {splittingMethod === 'character' || splittingMethod === 'recursive' ? (
              <p className="text-sm text-slate-400 mb-4">
                Characters overlapping between chunks. Helps maintain context between chunks (usually 10-20% of chunk size).
              </p>
            ) : (
              <div className="mb-4 p-3 bg-slate-800/50 rounded border border-slate-700">
                <p className="text-sm text-slate-300 mb-1">
                  <strong>{methodDescriptions[splittingMethod].title}</strong> uses natural boundaries for context.
                </p>
                <p className="text-xs text-slate-400">
                  {splittingMethod === 'sentence' && 'Sentence boundaries provide natural context transitions.'}
                  {splittingMethod === 'paragraph' && 'Paragraph breaks are strong semantic divisions.'}
                  {splittingMethod === 'markdown' && 'Headers define logical sections that maintain their structure.'}
                </p>
              </div>
            )}

            <input
              type="range"
              min="0"
              max={splittingMethod === 'character' || splittingMethod === 'recursive' ? Math.min(chunkSize, 1000) : 0}
              step="10"
              value={chunkOverlap}
              onChange={(e) => onChunkOverlapChange(parseInt(e.target.value))}
              disabled={splittingMethod !== 'character' && splittingMethod !== 'recursive'}
              className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500 ${
                splittingMethod !== 'character' && splittingMethod !== 'recursive' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>0</span>
              <span>{Math.floor(Math.min(chunkSize, 1000) / 2)}</span>
              <span>{Math.min(chunkSize, 1000)}</span>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onChunkOverlapChange(0)}
                disabled={splittingMethod !== 'character' && splittingMethod !== 'recursive'}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  chunkOverlap === 0
                    ? 'border-pink-500 bg-pink-500/20 text-pink-300'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                None (0)
              </button>
              <button
                onClick={() => onChunkOverlapChange(100)}
                disabled={splittingMethod !== 'character' && splittingMethod !== 'recursive'}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  chunkOverlap === 100
                    ? 'border-pink-500 bg-pink-500/20 text-pink-300'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Standard (100)
              </button>
              <button
                onClick={() => onChunkOverlapChange(200)}
                disabled={splittingMethod !== 'character' && splittingMethod !== 'recursive'}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  chunkOverlap === 200
                    ? 'border-pink-500 bg-pink-500/20 text-pink-300'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                High (200)
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-purple-300 mb-1">Chunking Strategy</h4>
              <p className="text-xs text-purple-300/80">
                <strong>{methodDescriptions[splittingMethod].title}</strong> will be used with chunk size of <strong>{chunkSize}</strong> characters and <strong>{chunkOverlap}</strong> character overlap.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-8 border-t border-slate-700 mt-8">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            disabled={isLoading}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-purple-500/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {isLoading ? 'Processing...' : 'Start Chunking'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { testDatabaseConnection } from '@/lib/api';

interface DatabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (databaseUrl: string) => void;
}

export default function DatabaseConnectionModal({
  isOpen,
  onClose,
  onConnect,
}: DatabaseConnectionModalProps) {
  const [databaseUrl, setDatabaseUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTest = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await testDatabaseConnection(databaseUrl);
      if (result.success) {
        setSuccess(true);
        setError(null);
      } else {
        setError(result.error || 'Failed to connect');
        setSuccess(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    if (databaseUrl.trim()) {
      onConnect(databaseUrl);
      setDatabaseUrl('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const handleClose = () => {
    setDatabaseUrl('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-gradient-to-br from-slate-900/90 to-slate-900 rounded-2xl shadow-2xl shadow-slate-950/50 p-8 border border-slate-800/50 max-w-md w-full mx-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-500/30">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Database Connection</h2>
        </div>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
          Enter your PostgreSQL connection string to import or export data to/from a specific database instance.
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-3">
              PostgreSQL Connection URL
            </label>
            <input
              type="password"
              value={databaseUrl}
              onChange={(e) => {
                setDatabaseUrl(e.target.value);
                setError(null);
                setSuccess(false);
              }}
              placeholder="postgresql://user:password@localhost:5432/dbname"
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <p className="text-slate-500 text-xs mt-2">
              Format: <span className="text-slate-400 font-mono">postgresql://user:password@host:port/database</span>
            </p>
          </div>

          {error && (
            <div className="p-4 bg-gradient-to-r from-red-500/15 to-red-600/10 border border-red-500/40 rounded-xl shadow-lg shadow-red-500/10 animate-fade-in">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-300 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-gradient-to-r from-emerald-500/15 to-emerald-600/10 border border-emerald-500/40 rounded-xl shadow-lg shadow-emerald-500/10 animate-fade-in">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-emerald-300 text-sm font-medium">✓ Connection successful!</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleTest}
              disabled={isLoading || !databaseUrl.trim()}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-slate-100 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-500 flex items-center justify-center gap-2"
            >
              {isLoading && (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>{isLoading ? 'Testing...' : 'Test Connection'}</span>
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-slate-600"
            >
              Cancel
            </button>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!success || !databaseUrl.trim()}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:shadow-lg hover:shadow-blue-500/30 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-950 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Connect & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

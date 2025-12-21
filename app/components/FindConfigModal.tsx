/**
 * Find Config Modal
 *
 * Search and load existing configurations
 */

'use client';

import { useState, useEffect } from 'react';

interface Configuration {
  id: string;
  model_key: string;
  reference_type: string;
  reference_number: string;
  line_key: string;
  title?: string;
  updated_at: string;
  created_at: string;
  latest_revision_number: number;
}

interface FindConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (config: Configuration) => void;
}

export default function FindConfigModal({ isOpen, onClose, onSelect }: FindConfigModalProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'QUOTE' | 'SALES_ORDER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentConfigs, setRecentConfigs] = useState<Configuration[]>([]);
  const [searchResults, setSearchResults] = useState<Configuration[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load recent configs when modal opens
  useEffect(() => {
    if (isOpen) {
      loadRecent();
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  const loadRecent = async () => {
    setIsLoadingRecent(true);
    try {
      const response = await fetch('/api/configurations/recent?limit=20');
      if (response.ok) {
        const data = await response.json();
        setRecentConfigs(data);
      }
    } catch (error) {
      console.error('Error loading recent configs:', error);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'ALL') {
        params.append('reference_type', filterType);
      }
      if (searchQuery) {
        params.append('q', searchQuery);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/configurations/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching configs:', error);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">Find Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Controls */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <label htmlFor="filterType" className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                id="filterType"
                className="input w-40"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
              >
                <option value="ALL">All</option>
                <option value="QUOTE">Quote</option>
                <option value="SALES_ORDER">Sales Order</option>
              </select>
            </div>

            <div className="flex-grow">
              <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                id="searchQuery"
                className="input w-full"
                placeholder="Reference number or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>

            <div className="flex-shrink-0 flex items-end">
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-grow overflow-y-auto px-6 py-4">
          {hasSearched ? (
            // Search Results
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Search Results ({searchResults.length})
              </h3>
              {searchResults.length === 0 ? (
                <p className="text-gray-500">No configurations found</p>
              ) : (
                <ConfigList configs={searchResults} onSelect={onSelect} />
              )}
            </div>
          ) : (
            // Recent Configs
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Recent Configurations
              </h3>
              {isLoadingRecent ? (
                <p className="text-gray-500">Loading...</p>
              ) : recentConfigs.length === 0 ? (
                <p className="text-gray-500">No recent configurations</p>
              ) : (
                <ConfigList configs={recentConfigs} onSelect={onSelect} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfigList({ configs, onSelect }: { configs: Configuration[]; onSelect: (config: Configuration) => void }) {
  return (
    <div className="space-y-2">
      {configs.map((config) => (
        <button
          key={config.id}
          onClick={() => onSelect(config)}
          className="w-full text-left p-4 border border-gray-200 rounded hover:bg-gray-50 hover:border-blue-500 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {config.reference_type}
                </span>
                <span className="font-medium text-gray-900">{config.reference_number}</span>
                {config.line_key !== '1' && (
                  <span className="text-sm text-gray-500">Line {config.line_key}</span>
                )}
              </div>
              {config.title && (
                <div className="text-sm text-gray-600 mb-1">{config.title}</div>
              )}
              <div className="text-xs text-gray-500">
                Updated: {new Date(config.updated_at).toLocaleString()}
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-sm font-medium text-gray-900">
                Rev {config.latest_revision_number}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

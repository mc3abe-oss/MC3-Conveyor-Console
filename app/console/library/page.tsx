'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useCurrentUserRole } from '../../hooks/useCurrentUserRole';

// ============================================================================
// TYPES
// ============================================================================

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface PdfDocument {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  status: string;
  version_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  tags: Tag[];
}

interface PaginatedResponse {
  data: PdfDocument[];
  total: number;
  page: number;
  pageSize: number;
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800',
};

const DEPARTMENT_OPTIONS = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'quality', label: 'Quality' },
];

// ============================================================================
// DEBOUNCE HOOK
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function LibraryPage() {
  const { canBeltAdmin } = useCurrentUserRole();

  // Data state
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const PAGE_SIZE = 50;

  // Debounce search input
  const debouncedSearch = useDebounce(search, 400);

  // Fetch tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch('/api/library/tags');
        if (res.ok) {
          const data = await res.json();
          setTags(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      }
    };
    void fetchTags();
  }, []);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      if (debouncedSearch.trim()) {
        params.set('q', debouncedSearch.trim());
      }

      if (departmentFilter) {
        params.set('department', departmentFilter);
      }

      if (statusFilter) {
        params.set('status', statusFilter);
      }

      if (selectedTags.length > 0) {
        params.set('tags', selectedTags.join(','));
      }

      const res = await fetch(`/api/library/documents?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch documents');
      }

      const result: PaginatedResponse = await res.json();
      setDocuments(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, departmentFilter, statusFilter, selectedTags, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, departmentFilter, statusFilter, selectedTags]);

  // Fetch when dependencies change
  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };


  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  // Pagination
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startRecord = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endRecord = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reference Library</h1>
          <p className="text-gray-600 mt-1">
            Browse technical documents, specifications, and reference materials.
          </p>
        </div>
        {canBeltAdmin && (
          <Link
            href="/console/library/upload"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-mc3-blue hover:bg-mc3-navy rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload PDF
          </Link>
        )}
      </div>

      {/* Filter Row */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
          >
            <option value="">All Departments</option>
            {DEPARTMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Status Filter (Admin only) */}
          {canBeltAdmin && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          )}
        </div>

        {/* Tag Pills */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  selectedTags.includes(tag.id)
                    ? 'ring-2 ring-offset-1 ring-blue-500'
                    : ''
                }`}
                style={{
                  backgroundColor: selectedTags.includes(tag.id) ? tag.color : `${tag.color}20`,
                  color: selectedTags.includes(tag.id) ? 'white' : tag.color,
                }}
              >
                {tag.name}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading documents...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Failed to load documents</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={fetchDocuments}
                className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No documents found</h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            {search || departmentFilter || selectedTags.length > 0
              ? 'Try adjusting your filters or search terms.'
              : 'No documents have been uploaded yet.'}
          </p>
          {canBeltAdmin && !search && !departmentFilter && selectedTags.length === 0 && (
            <Link
              href="/console/library/upload"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-mc3-blue hover:bg-mc3-navy rounded-md transition-colors"
            >
              Upload First Document
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Document Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                href={`/console/library/${doc.id}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all group"
              >
                {/* Document Icon + Title */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 truncate">
                      {doc.title}
                    </h3>
                    {doc.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {doc.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 py-0.5 text-xs rounded"
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                    {doc.tags.length > 3 && (
                      <span className="px-2 py-0.5 text-xs text-gray-400">
                        +{doc.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Meta Info */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>{formatDate(doc.updated_at)}</span>
                  <div className="flex items-center gap-2">
                    {doc.version_count > 0 && (
                      <span>v{doc.version_count}</span>
                    )}
                    {canBeltAdmin && (
                      <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_BADGE_COLORS[doc.status] || 'bg-gray-100 text-gray-600'}`}>
                        {doc.status}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 bg-white px-4 py-3 flex items-center justify-between border border-gray-200 rounded-lg sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startRecord}</span> to{' '}
                    <span className="font-medium">{endRecord}</span> of{' '}
                    <span className="font-medium">{total}</span> documents
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

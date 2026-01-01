'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

export type DateRangeOption = '30' | '90' | 'all';

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

export interface StatusOption {
  value: string;
  label: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RecordListPageProps<T> {
  // Page metadata
  title: string;
  description: string;
  entityName: string; // "quote" or "sales order" for empty states
  entityNamePlural: string; // "quotes" or "sales orders"

  // API endpoint
  apiEndpoint: string;

  // Table configuration
  columns: Column<T>[];
  getRowKey: (item: T) => string;
  getRowLink: (item: T) => string;

  // Optional status filter (quotes only)
  statusOptions?: StatusOption[];

  // Empty state customization
  emptyStateAction?: React.ReactNode;
}

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
// FILTER BAR COMPONENT
// ============================================================================

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  dateRange: DateRangeOption;
  onDateRangeChange: (value: DateRangeOption) => void;
  status?: string;
  onStatusChange?: (value: string) => void;
  statusOptions?: StatusOption[];
  isSearchActive: boolean;
}

function FilterBar({
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  status,
  onStatusChange,
  statusOptions,
  isSearchActive,
}: FilterBarProps) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row gap-3">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search by number or customer..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Date Range Dropdown */}
      <select
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value as DateRangeOption)}
        className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
      >
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="all">All time</option>
      </select>

      {/* Status Dropdown (optional) */}
      {statusOptions && onStatusChange && (
        <select
          value={status || ''}
          onChange={(e) => onStatusChange(e.target.value)}
          className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
        >
          <option value="">All Statuses</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      {/* Search indicator */}
      {isSearchActive && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 self-center">
          Searching all time
        </span>
      )}
    </div>
  );
}

// ============================================================================
// PAGINATION COMPONENT
// ============================================================================

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  if (totalPages <= 1) return null;

  return (
    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
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
            <span className="font-medium">{total}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Page numbers - show max 5 pages */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    pageNum === page
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => onPageChange(page + 1)}
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
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RecordListPage<T>({
  title,
  description,
  entityName: _entityName, // Reserved for future use
  entityNamePlural,
  apiEndpoint,
  columns,
  getRowKey,
  getRowLink,
  statusOptions,
  emptyStateAction,
}: RecordListPageProps<T>) {
  // State
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeOption>('30');
  const [status, setStatus] = useState('');

  const PAGE_SIZE = 100;

  // Debounce search input
  const debouncedSearch = useDebounce(search, 400);

  // Determine if search is active (non-empty)
  const isSearchActive = debouncedSearch.trim().length > 0;

  // Effective date range: if searching, use 'all' unless explicitly set
  const effectiveDateRange = useMemo(() => {
    if (isSearchActive && dateRange === '30') {
      return 'all';
    }
    return dateRange;
  }, [isSearchActive, dateRange]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      if (debouncedSearch.trim()) {
        params.set('search', debouncedSearch.trim());
      }

      if (effectiveDateRange !== 'all') {
        params.set('rangeDays', effectiveDateRange);
      }

      if (status) {
        params.set('status', status);
      }

      const res = await fetch(`${apiEndpoint}?${params.toString()}`);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to fetch ${entityNamePlural}`);
      }

      const result: PaginatedResponse<T> = await res.json();
      setData(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, debouncedSearch, effectiveDateRange, status, page, entityNamePlural]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateRange, status]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle date range change - reset search hint when user explicitly selects
  const handleDateRangeChange = (value: DateRangeOption) => {
    setDateRange(value);
  };

  // Compute empty state message
  const getEmptyMessage = () => {
    if (isSearchActive) {
      return `No ${entityNamePlural} match "${debouncedSearch}". Try a different search term.`;
    }
    if (dateRange === '30') {
      return `No ${entityNamePlural} in the last 30 days. Try changing the date range or searching.`;
    }
    if (dateRange === '90') {
      return `No ${entityNamePlural} in the last 90 days. Try changing the date range or searching.`;
    }
    return `No ${entityNamePlural} found.`;
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-1">{description}</p>
      </div>

      {/* Filter Bar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        status={status}
        onStatusChange={statusOptions ? setStatus : undefined}
        statusOptions={statusOptions}
        isSearchActive={isSearchActive && dateRange !== 'all'}
      />

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading {entityNamePlural}...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Failed to load {entityNamePlural}</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={fetchData}
                className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No {entityNamePlural} found
          </h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            {getEmptyMessage()}
          </p>
          {!isSearchActive && dateRange !== 'all' && (
            <button
              onClick={() => setDateRange('all')}
              className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View all time
            </button>
          )}
          {emptyStateAction && <div className="mt-6">{emptyStateAction}</div>}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className || ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item) => (
                  <tr key={getRowKey(item)} className="hover:bg-gray-50 transition-colors">
                    {columns.map((col, idx) => (
                      <td key={col.key} className={`px-6 py-4 whitespace-nowrap ${col.className || ''}`}>
                        {idx === 0 ? (
                          <Link
                            href={getRowLink(item) as never}
                            className="text-blue-600 hover:text-blue-800 font-semibold font-mono"
                          >
                            {col.render(item)}
                          </Link>
                        ) : (
                          col.render(item)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        </div>
      )}
    </main>
  );
}

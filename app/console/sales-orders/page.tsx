'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SalesOrder } from '../../../src/lib/database/quote-types';

// ============================================================================
// TYPES
// ============================================================================

type DateRangeOption = '30' | '90' | 'all';
type ScopeStatus = 'draft' | 'set';

const SCOPE_STATUS_BADGE_COLORS: Record<ScopeStatus, string> = {
  draft: 'bg-amber-100 text-amber-800',
  set: 'bg-green-100 text-green-800',
};

// Product type mappings
const PRODUCT_TYPE_LABELS: Record<string, string> = {
  'belt_conveyor_v1': 'Belt',
  'magnetic_conveyor_v1': 'Magnetic',
};

const PRODUCT_TYPE_PATHS: Record<string, string> = {
  'belt_conveyor_v1': '/console/belt',
  'magnetic_conveyor_v1': '/console/magnetic',
};

interface PaginatedResponse {
  data: SalesOrder[];
  total: number;
  page: number;
  pageSize: number;
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
// PAGE COMPONENT
// ============================================================================

export default function ConsoleSalesOrdersPage() {
  const router = useRouter();

  // Data state
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Product missing error state (fail-closed routing)
  const [productMissingSO, setProductMissingSO] = useState<SalesOrder | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeOption>('30');

  const PAGE_SIZE = 100;

  // Debounce search input (400ms)
  const debouncedSearch = useDebounce(search, 400);

  // Determine if search is active
  const isSearchActive = debouncedSearch.trim().length > 0;

  // Effective date range: if searching, use 'all' unless explicitly changed
  const effectiveDateRange = useMemo(() => {
    if (isSearchActive && dateRange === '30') {
      return 'all';
    }
    return dateRange;
  }, [isSearchActive, dateRange]);

  // Fetch data
  const fetchSalesOrders = useCallback(async () => {
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

      const res = await fetch(`/api/sales-orders?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch sales orders');
      }

      const result: PaginatedResponse = await res.json();
      setSalesOrders(result.data || []);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, effectiveDateRange, page]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateRange]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchSalesOrders();
  }, [fetchSalesOrders]);

  // Navigate to Application with sales order context
  // Uses product_href from the application's product_family for correct routing
  // FAIL-CLOSED: Does NOT default to /console/belt when product missing
  const handleRowClick = (so: SalesOrder) => {
    // Determine product route - NO FALLBACK
    const productHref = (so as any).product_href;
    const modelKey = (so as any).model_key as string | null;
    const targetPath = productHref || (modelKey ? PRODUCT_TYPE_PATHS[modelKey] : null);

    // Fail-closed: If no product can be resolved, show error instead of navigating
    if (!targetPath) {
      setProductMissingSO(so);
      return;
    }

    // Clear any previous error
    setProductMissingSO(null);

    const params = new URLSearchParams();
    params.set('so', String(so.base_number));
    if (so.suffix_line) {
      params.set('suffix', String(so.suffix_line));
    }
    router.push(`${targetPath}?${params.toString()}` as '/console/belt');
  };

  // Handle creating application for a sales order that's missing product
  const handleCreateApplication = (so: SalesOrder) => {
    // Navigate to new application page with SO context so user can select product
    const params = new URLSearchParams();
    params.set('linkTo', 'so');
    params.set('base', String(so.base_number));
    if (so.suffix_line) {
      params.set('suffix', String(so.suffix_line));
    }
    router.push(`/console/applications/new?${params.toString()}`);
  };

  // Pagination
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const startRecord = (page - 1) * PAGE_SIZE + 1;
  const endRecord = Math.min(page * PAGE_SIZE, total);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-gray-600 mt-1">
            View and search sales orders. Click a row to open the Application.
          </p>
        </div>
        <button
          onClick={() => router.push('/console/applications/new')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-mc3-blue hover:bg-mc3-navy rounded-md transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Application
        </button>
      </div>

      {/* Filter Row */}
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

        {/* Date Range Dropdown */}
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
          className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3"
        >
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All time</option>
        </select>

        {/* Search indicator */}
        {isSearchActive && dateRange !== 'all' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 self-center">
            Searching all time
          </span>
        )}
      </div>

      {/* Product Missing Error Banner - Fail-closed routing */}
      {productMissingSO && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-amber-800 font-medium">
                No Product Associated
              </h3>
              <p className="text-amber-700 text-sm mt-1">
                Sales Order <strong>SO{productMissingSO.base_number}</strong> does not have a product type set.
                Create an application to select a product.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={() => handleCreateApplication(productMissingSO)}
                  className="px-4 py-2 text-sm font-medium text-white bg-mc3-blue hover:bg-mc3-navy rounded-md transition-colors"
                >
                  Create Application
                </button>
                <button
                  onClick={() => setProductMissingSO(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading sales orders...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Failed to load sales orders</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={fetchSalesOrders}
                className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : salesOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {isSearchActive ? 'No matching sales orders' : 'No sales orders found'}
          </h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            {isSearchActive
              ? `No sales orders match "${debouncedSearch}". Try a different search term.`
              : dateRange === '30'
              ? 'No sales orders in the last 30 days. Try changing the date range.'
              : dateRange === '90'
              ? 'No sales orders in the last 90 days. Try changing the date range.'
              : (
                <>
                  Sales Orders are created by converting won Quotes. Go to{' '}
                  <Link href="/console/quotes" className="text-mc3-blue hover:text-mc3-navy font-medium">
                    Quotes
                  </Link>{' '}
                  to create and win a quote first.
                </>
              )}
          </p>
          {!isSearchActive && dateRange !== 'all' && (
            <button
              onClick={() => setDateRange('all')}
              className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View all time
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SO #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Line
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created by
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revisions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origin Quote
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesOrders.map((so) => (
                <tr
                  key={so.id}
                  onClick={() => handleRowClick(so)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-mc3-blue font-medium">
                      SO{so.base_number}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-900 font-medium">
                      {(so as any).job_line ?? <span className="text-gray-400">—</span>}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {(so as any).model_key ? (PRODUCT_TYPE_LABELS[(so as any).model_key] || (so as any).model_key) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${SCOPE_STATUS_BADGE_COLORS[(so as any).scope_status as ScopeStatus] || 'bg-gray-100 text-gray-800'}`}>
                      {((so as any).scope_status || 'draft').charAt(0).toUpperCase() + ((so as any).scope_status || 'draft').slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {so.customer_name || <span className="text-gray-400 italic">No customer</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {(so as any).product_family_name || 'Belt Conveyor'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(so as any).created_by_display || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(so.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(so as any).latest_updated_at
                      ? new Date((so as any).latest_updated_at).toLocaleDateString()
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(so as any).revision_count > 0
                      ? (so as any).revision_count
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {so.origin_quote_id ? (
                      <span className="text-purple-600">From Quote</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
                    <span className="font-medium">{total}</span> results
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
                          onClick={() => setPage(pageNum)}
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
        </div>
      )}
    </div>
  );
}

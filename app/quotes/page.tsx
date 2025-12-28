'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import { Quote, QuoteStatus } from '../../src/lib/database/quote-types';

const STATUS_BADGE_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  converted: 'bg-purple-100 text-purple-800',
};

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  won: 'Won',
  lost: 'Lost',
  converted: 'Converted',
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const fetchQuotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter ? `/api/quotes?status=${statusFilter}` : '/api/quotes';
      const res = await fetch(url);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch quotes');
      }

      const data = await res.json();
      setQuotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter]);

  const handleCreateQuote = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create quote');
      }

      const newQuote = await res.json();
      // Navigate to the new quote
      window.location.href = `/quotes/${newQuote.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote');
      setCreating(false);
    }
  };

  return (
    <>
      <Header loadedConfigurationId={null} />
      <div className="mb-4 p-3 bg-yellow-200 text-black font-bold text-center">DEV_MARKER_QUOTE_SO_PHASE1</div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
            <p className="text-gray-600 mt-1">
              Manage quotes and convert won quotes to sales orders
            </p>
          </div>
          <button
            onClick={handleCreateQuote}
            disabled={creating}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-md transition-colors"
          >
            {creating ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Quote
              </>
            )}
          </button>
        </div>

        {/* Status filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="converted">Converted</option>
          </select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading quotes...</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-red-800 font-medium">Failed to load quotes</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                <button
                  onClick={fetchQuotes}
                  className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {statusFilter ? `No ${statusFilter} quotes` : 'No quotes yet'}
            </h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
              {statusFilter
                ? `No quotes with status "${statusFilter}" found.`
                : 'Create your first quote to get started.'}
            </p>
            {statusFilter ? (
              <button
                onClick={() => setStatusFilter('')}
                className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear filter
              </button>
            ) : (
              <button
                onClick={handleCreateQuote}
                disabled={creating}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Quote
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quote #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Converted To
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/quotes/${quote.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {quote.quote_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${STATUS_BADGE_COLORS[quote.quote_status]}`}>
                        {STATUS_LABELS[quote.quote_status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {quote.customer_name || <span className="text-gray-400 italic">No customer</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {quote.converted_to_sales_order_id ? (
                        <Link
                          href={`/sales-orders/${quote.converted_to_sales_order_id}`}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          View Sales Order
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuoteStatus } from '../../../src/lib/database/quote-types';

interface QuoteLine {
  quote_number: string;
  base_number: number;
  suffix_line: number | null;
  job_line: number;
  customer_name: string | null;
  quote_status: string;
  revision_count: number;
  latest_updated_at: string;
  latest_application_id: string;
}

const STATUS_BADGE_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  won: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  converted: 'bg-purple-100 text-purple-800',
};

export default function ConsoleQuotesPage() {
  const router = useRouter();
  const [quoteLines, setQuoteLines] = useState<QuoteLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchQuoteLines = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/quotes/lines');

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch quote lines');
      }

      let data: QuoteLine[] = await res.json();

      // Apply status filter client-side
      if (statusFilter) {
        data = data.filter(q => q.quote_status === statusFilter);
      }

      setQuoteLines(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuoteLines();
  }, [statusFilter]);

  // Navigate to Application with full quote context - NO MODAL
  const handleRowClick = (line: QuoteLine) => {
    const params = new URLSearchParams();
    params.set('quote', String(line.base_number));
    if (line.suffix_line != null && line.suffix_line >= 1) {
      params.set('suffix', String(line.suffix_line));
    }
    // Always pass jobLine to skip the selection modal
    params.set('jobLine', String(line.job_line));
    router.push(`/console/belt?${params.toString()}`);
  };

  // Format date as relative or absolute
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
        <p className="text-gray-600 mt-1">
          View quote lines. Click a row to open the Application.
        </p>
      </div>

      {/* Status filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-mc3-blue focus:ring-mc3-blue text-sm"
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
        <div className="text-center py-12 text-gray-500">Loading quote lines...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-red-800 font-medium">Failed to load quote lines</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={fetchQuoteLines}
                className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      ) : quoteLines.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {statusFilter ? `No ${statusFilter} quotes` : 'No quote lines yet'}
          </h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            {statusFilter
              ? `No quotes with status "${statusFilter}" found.`
              : 'Quote lines are created when you save an Application. Go to Application and save your work.'}
          </p>
          {statusFilter ? (
            <button
              onClick={() => setStatusFilter('')}
              className="mt-4 text-mc3-blue hover:text-mc3-navy text-sm font-medium"
            >
              Clear filter
            </button>
          ) : (
            <button
              onClick={() => router.push('/console/belt')}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-mc3-blue hover:bg-mc3-navy rounded-md transition-colors"
            >
              Go to Application
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
                  Line
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revisions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quoteLines.map((line) => (
                <tr
                  key={`${line.base_number}-${line.suffix_line ?? 'null'}-${line.job_line}`}
                  onClick={() => handleRowClick(line)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-mc3-blue font-medium">
                      {line.quote_number}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-900 font-medium">
                      {line.job_line}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {line.customer_name || <span className="text-gray-400 italic">No customer</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${STATUS_BADGE_COLORS[line.quote_status as QuoteStatus] || 'bg-gray-100 text-gray-800'}`}>
                      {line.quote_status.charAt(0).toUpperCase() + line.quote_status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(line.latest_updated_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {line.revision_count > 1 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        {line.revision_count} revs
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">1</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

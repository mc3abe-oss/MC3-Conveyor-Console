'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SalesOrder } from '../../../src/lib/database/quote-types';
import { formatRef } from '../../../src/lib/quote-identifiers';

export default function ConsoleSalesOrdersPage() {
  const router = useRouter();
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sales-orders');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch sales orders');
      }
      const data = await res.json();
      setSalesOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesOrders();
  }, []);

  // Navigate to Application with sales order context
  const handleRowClick = (so: SalesOrder) => {
    const params = new URLSearchParams();
    params.set('so', String(so.base_number));
    if (so.suffix_line) {
      params.set('suffix', String(so.suffix_line));
    }
    // Don't set jobLine - let the Application loader resolve or prompt
    router.push(`/console/belt?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
        <p className="text-gray-600 mt-1">
          View and search sales orders. Click a row to open the Application.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading sales orders...</div>
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">No sales orders yet</h3>
          <p className="mt-2 text-gray-500 max-w-md mx-auto">
            Sales Orders are created by converting won Quotes. Go to{' '}
            <Link href="/console/quotes" className="text-mc3-blue hover:text-mc3-navy font-medium">
              Quotes
            </Link>{' '}
            to create and win a quote first.
          </p>
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
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
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
                      {formatRef('sales_order', so.base_number)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {so.customer_name || <span className="text-gray-400 italic">No customer</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(so.created_at).toLocaleDateString()}
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
        </div>
      )}
    </div>
  );
}

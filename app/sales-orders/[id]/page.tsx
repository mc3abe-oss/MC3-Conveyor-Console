'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Sales Order detail page - redirects to the Application with SO context
 *
 * This page fetches the sales order to get its base_number, then redirects to
 * /console/belt?so={base_number} to load the Application with that sales order.
 */
export default function SalesOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const salesOrderId = params.id as string;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAndRedirect() {
      try {
        const res = await fetch(`/api/sales-orders/${salesOrderId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load sales order');
        }

        const so = await res.json();

        // Build redirect URL to console/belt with SO context
        const params = new URLSearchParams();
        params.set('so', String(so.base_number));
        if (so.suffix_line) {
          params.set('suffix', String(so.suffix_line));
        }

        router.replace(`/console/belt?${params.toString()}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sales order');
      }
    }

    loadAndRedirect();
  }, [salesOrderId, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-medium">Error loading sales order</h3>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <button
            onClick={() => router.push('/sales-orders')}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md"
          >
            Back to Sales Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin h-8 w-8 mx-auto mb-4 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-gray-500">Loading sales order...</p>
      </div>
    </div>
  );
}

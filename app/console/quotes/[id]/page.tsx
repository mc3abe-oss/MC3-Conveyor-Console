'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Quote Detail Page - Redirects to Application
 *
 * Quote detail pages now redirect to the Application workspace with the quote context.
 * This ensures all work happens in a unified Application experience.
 */
export default function ConsoleQuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the quote to get its base_number and suffix
    fetch(`/api/quotes/${quoteId}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Quote not found');
        }
        return res.json();
      })
      .then((quote) => {
        // Build redirect URL to Application
        const searchParams = new URLSearchParams();
        searchParams.set('quote', String(quote.base_number));
        if (quote.suffix_line) {
          searchParams.set('suffix', String(quote.suffix_line));
        }
        router.replace(`/console/belt?${searchParams.toString()}`);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [quoteId, router]);

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <Link href="/console/quotes" className="mt-3 inline-block text-red-700 hover:text-red-800">
            Back to Quotes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Redirecting to Application...</span>
      </div>
    </div>
  );
}

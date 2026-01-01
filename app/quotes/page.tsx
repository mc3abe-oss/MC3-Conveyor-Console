'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /quotes → /console/quotes
 * All list pages now live under /console for unified layout
 */
export default function QuotesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/quotes');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}

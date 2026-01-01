'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /admin → /console/admin
 * All pages now live under /console for unified layout
 */
export default function AdminRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/admin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}

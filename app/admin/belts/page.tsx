'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /admin/belts → /console/admin/catalog/belts
 */
export default function AdminBeltsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/admin/catalog/belts');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}

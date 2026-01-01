'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /admin/belts → /console/admin/belts
 */
export default function AdminBeltsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/admin/belts');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}

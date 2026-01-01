'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /admin/process-types → /console/admin/process-types
 */
export default function AdminProcessTypesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/admin/process-types');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /admin/cleats → /console/admin/cleats
 */
export default function AdminCleatsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/admin/cleats');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}

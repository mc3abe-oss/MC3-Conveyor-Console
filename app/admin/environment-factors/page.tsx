'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /admin/environment-factors → /console/admin/environment-factors
 */
export default function AdminEnvironmentFactorsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/admin/environment-factors');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}

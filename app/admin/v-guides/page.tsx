'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect /admin/v-guides → /console/admin/v-guides
 */
export default function AdminVGuidesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/admin/v-guides');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}

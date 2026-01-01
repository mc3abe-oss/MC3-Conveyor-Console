'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Redirect /recipes/[id] → /console/recipes/[id]
 * All pages now live under /console for unified layout
 */
export default function RecipeDetailRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    if (id) {
      router.replace(`/console/recipes/${id}`);
    }
  }, [router, id]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}

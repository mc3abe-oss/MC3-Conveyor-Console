/**
 * React hooks for pulley catalog data
 *
 * Mirrors the useBeltCatalog pattern:
 * - usePulleyCatalog() - fetch all active pulleys
 * - usePulley(catalogKey) - fetch single pulley by key
 * - clearPulleyCatalogCache() - invalidate cache after admin edits
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PulleyCatalogItem,
  getCachedPulleys,
  setCachedPulleys,
  clearPulleyCatalogCache as clearCache,
} from '../../src/lib/pulley-catalog';

// Re-export for convenience
export { clearPulleyCatalogCache } from '../../src/lib/pulley-catalog';

/**
 * Hook to fetch all active pulleys from the catalog
 */
export function usePulleyCatalog(): {
  pulleys: PulleyCatalogItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [pulleys, setPulleys] = useState<PulleyCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPulleys = useCallback(async () => {
    // Check cache first
    const cached = getCachedPulleys();
    if (cached) {
      setPulleys(cached);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/pulleys');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch pulleys');
      }

      const data = await response.json();
      setPulleys(data);
      setCachedPulleys(data);
    } catch (err) {
      console.error('Failed to fetch pulley catalog:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pulleys');
      setPulleys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPulleys();
  }, [fetchPulleys]);

  const refetch = useCallback(() => {
    clearCache();
    fetchPulleys();
  }, [fetchPulleys]);

  return { pulleys, loading, error, refetch };
}

/**
 * Hook to fetch a single pulley by catalog key
 */
export function usePulley(catalogKey: string | undefined | null): {
  pulley: PulleyCatalogItem | null;
  loading: boolean;
  error: string | null;
} {
  const { pulleys, loading, error } = usePulleyCatalog();

  const pulley = catalogKey
    ? pulleys.find((p) => p.catalog_key === catalogKey) ?? null
    : null;

  return { pulley, loading, error };
}

/**
 * useBeltCatalog Hook
 *
 * Loads belt catalog items from API and caches them
 */

import { useState, useEffect } from 'react';
import { BeltCatalogItem } from '../api/belts/route';

// In-memory cache
let beltCatalogCache: BeltCatalogItem[] | null = null;

export function useBeltCatalog() {
  const [belts, setBelts] = useState<BeltCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBelts() {
      // Check cache first
      if (beltCatalogCache) {
        setBelts(beltCatalogCache);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/belts');

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to fetch belts');
        }

        const data = (await response.json()) as BeltCatalogItem[];

        if (!cancelled) {
          beltCatalogCache = data;
          setBelts(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load belt catalog');
          setIsLoading(false);
        }
      }
    }

    loadBelts();

    return () => {
      cancelled = true;
    };
  }, []);

  return { belts, isLoading, error };
}

/**
 * Get a specific belt by catalog_key
 */
export function useBelt(catalogKey: string | undefined) {
  const { belts, isLoading, error } = useBeltCatalog();

  const belt = catalogKey ? belts.find((b) => b.catalog_key === catalogKey) : undefined;

  return { belt, isLoading, error };
}

/**
 * Clear the belt catalog cache (useful after admin edits)
 */
export function clearBeltCatalogCache() {
  beltCatalogCache = null;
}

/**
 * useCatalog Hook
 *
 * Loads catalog items from API and caches them
 */

import { useState, useEffect } from 'react';
import { CatalogItem, fetchCatalogItems } from '../../src/lib/catalogs';

// In-memory cache to avoid re-fetching
const catalogCache = new Map<string, CatalogItem[]>();

export function useCatalog(catalogKey: string) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      // Check cache first
      if (catalogCache.has(catalogKey)) {
        setItems(catalogCache.get(catalogKey)!);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchCatalogItems(catalogKey);

        if (!cancelled) {
          catalogCache.set(catalogKey, data);
          setItems(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load catalog');
          setIsLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [catalogKey]);

  return { items, isLoading, error };
}

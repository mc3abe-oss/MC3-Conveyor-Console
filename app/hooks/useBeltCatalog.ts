/**
 * useBeltCatalog Hook
 *
 * Loads belt catalog items from API and caches them.
 * By default only loads active belts for selection dropdowns.
 *
 * v1.23: Added support for resolving inactive belts when loading old configs.
 */

import { useState, useEffect, useRef } from 'react';
import { BeltCatalogItem } from '../api/belts/route';

// In-memory cache for active belts
let beltCatalogCache: BeltCatalogItem[] | null = null;

// Cache for individually fetched belts (including inactive)
const individualBeltCache: Map<string, BeltCatalogItem | null> = new Map();

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
        // Only fetch active belts for dropdown selection
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
 * Get a specific belt by catalog_key.
 * If the belt is not in the active catalog, attempts to fetch it directly.
 * This ensures old configs referencing inactive belts still load correctly.
 */
export function useBelt(catalogKey: string | undefined) {
  const { belts, isLoading: catalogLoading, error: catalogError } = useBeltCatalog();
  const [fetchedBelt, setFetchedBelt] = useState<BeltCatalogItem | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const fetchedKey = useRef<string | undefined>(undefined);

  // First, try to find in active catalog
  const catalogBelt = catalogKey ? belts.find((b) => b.catalog_key === catalogKey) : undefined;

  useEffect(() => {
    // Only fetch if:
    // - We have a catalog key
    // - Catalog is loaded (not loading)
    // - Belt not found in active catalog
    // - We haven't already fetched this key
    if (
      catalogKey &&
      !catalogLoading &&
      !catalogBelt &&
      fetchedKey.current !== catalogKey
    ) {
      // Check individual cache first
      if (individualBeltCache.has(catalogKey)) {
        setFetchedBelt(individualBeltCache.get(catalogKey) || null);
        fetchedKey.current = catalogKey;
        return;
      }

      setIsFetching(true);
      fetchedKey.current = catalogKey;

      // Fetch all belts including inactive to find this one
      fetch('/api/belts?includeInactive=true')
        .then((res) => res.json())
        .then((data: BeltCatalogItem[]) => {
          const found = data.find((b) => b.catalog_key === catalogKey) || null;
          individualBeltCache.set(catalogKey, found);
          setFetchedBelt(found);
          setIsFetching(false);
        })
        .catch(() => {
          individualBeltCache.set(catalogKey, null);
          setFetchedBelt(null);
          setIsFetching(false);
        });
    } else if (!catalogKey) {
      setFetchedBelt(null);
      fetchedKey.current = undefined;
    }
  }, [catalogKey, catalogLoading, catalogBelt]);

  // Return catalog belt if found, otherwise fetched belt
  const belt = catalogBelt || fetchedBelt;
  const isLoading = catalogLoading || isFetching;

  return { belt, isLoading, error: catalogError };
}

/**
 * Clear the belt catalog cache (useful after admin edits)
 */
export function clearBeltCatalogCache() {
  beltCatalogCache = null;
  individualBeltCache.clear();
}

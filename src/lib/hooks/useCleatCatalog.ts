/**
 * useCleatCatalog - React hook for cleat catalog data
 *
 * Separated from cleat-catalog.ts to allow server-side imports of
 * cleat types/constants without React dependencies.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  CleatCatalogItem,
  CleatCenterFactor,
  getCachedCleatCatalog,
  getCachedCleatCenterFactors,
  setCachedCleatCatalog,
  setCachedCleatCenterFactors,
} from '../cleat-catalog';

interface UseCleatCatalogResult {
  cleatCatalog: CleatCatalogItem[];
  cleatCenterFactors: CleatCenterFactor[];
  isLoading: boolean;
  error: string | null;
}

/**
 * React hook to fetch and cache cleat catalog data
 *
 * @returns Cleat catalog and center factors with loading state
 */
export function useCleatCatalog(): UseCleatCatalogResult {
  const [cleatCatalog, setCleatCatalog] = useState<CleatCatalogItem[]>(
    getCachedCleatCatalog() ?? []
  );
  const [cleatCenterFactors, setCleatCenterFactors] = useState<CleatCenterFactor[]>(
    getCachedCleatCenterFactors() ?? []
  );
  const [isLoading, setIsLoading] = useState(
    getCachedCleatCatalog() === null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip fetch if already cached
    if (getCachedCleatCatalog() !== null) {
      return;
    }

    const fetchCleatCatalog = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/cleats');
        if (response.ok) {
          const data = await response.json();
          const catalog = data.catalog || [];
          const factors = data.centerFactors || [];
          setCleatCatalog(catalog);
          setCleatCenterFactors(factors);
          setCachedCleatCatalog(catalog);
          setCachedCleatCenterFactors(factors);
        } else {
          setError('Failed to fetch cleat catalog');
        }
      } catch (err) {
        console.error('Failed to fetch cleat catalog:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCleatCatalog();
  }, []);

  return { cleatCatalog, cleatCenterFactors, isLoading, error };
}

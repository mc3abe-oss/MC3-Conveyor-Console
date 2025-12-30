/**
 * React hooks for pulley families and variants
 *
 * - usePulleyFamilies() - fetch all active families
 * - usePulleyVariants() - fetch all active variants with family data
 * - usePulleyVariant(variantKey) - fetch single variant by key
 * - clearPulleyFamiliesCache() - invalidate cache after admin edits
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PulleyFamily,
  PulleyVariant,
  PulleyVariantWithFamily,
  getCachedPulleyFamilies,
  setCachedPulleyFamilies,
  setCachedPulleyVariants,
  clearPulleyFamiliesCache as clearCache,
  getFinishedOdIn,
} from '../../src/lib/pulley-families';

// Re-export for convenience
export { clearPulleyFamiliesCache } from '../../src/lib/pulley-families';

/**
 * Hook to fetch all active pulley families
 */
export function usePulleyFamilies(): {
  families: PulleyFamily[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [families, setFamilies] = useState<PulleyFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFamilies = useCallback(async () => {
    // Check cache first
    const cached = getCachedPulleyFamilies();
    if (cached) {
      setFamilies(cached);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/pulley-families');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch pulley families');
      }

      const data = await response.json();
      setFamilies(data);
      setCachedPulleyFamilies(data);
    } catch (err) {
      console.error('Failed to fetch pulley families:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch families');
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const refetch = useCallback(() => {
    clearCache();
    fetchFamilies();
  }, [fetchFamilies]);

  return { families, loading, error, refetch };
}

/**
 * Hook to fetch all active pulley variants with their family data
 */
export function usePulleyVariants(): {
  variants: PulleyVariantWithFamily[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [variants, setVariants] = useState<PulleyVariantWithFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVariants = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/pulley-variants');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch pulley variants');
      }

      const data = await response.json();
      setVariants(data);

      // Also cache the raw variants (without family join) for library use
      const rawVariants: PulleyVariant[] = data.map((v: PulleyVariantWithFamily) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { family, ...rest } = v;
        return rest;
      });
      setCachedPulleyVariants(rawVariants);
    } catch (err) {
      console.error('Failed to fetch pulley variants:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch variants');
      setVariants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const refetch = useCallback(() => {
    clearCache();
    fetchVariants();
  }, [fetchVariants]);

  return { variants, loading, error, refetch };
}

/**
 * Hook to fetch a single variant by key
 */
export function usePulleyVariant(variantKey: string | undefined | null): {
  variant: PulleyVariantWithFamily | null;
  loading: boolean;
  error: string | null;
  finishedOdIn: number | null;
  shellOdIn: number | null;
} {
  const { variants, loading, error } = usePulleyVariants();

  const variant = variantKey
    ? variants.find((v) => v.pulley_variant_key === variantKey) ?? null
    : null;

  const finishedOdIn = variant
    ? getFinishedOdIn(variant, variant.family)
    : null;

  const shellOdIn = variant
    ? variant.family.shell_od_in
    : null;

  return { variant, loading, error, finishedOdIn, shellOdIn };
}

/**
 * Get display options for variant dropdown
 */
export function getVariantDropdownOptions(variants: PulleyVariantWithFamily[]): {
  value: string;
  label: string;
  groupLabel: string;
  finishedOdIn: number;
  shellOdIn: number;
}[] {
  return variants.map((v) => {
    const finishedOd = getFinishedOdIn(v, v.family);
    const isLagged = v.lagging_type && v.lagging_type !== 'none';
    const bearingInfo = v.bearing_type ? ` (${v.bearing_type})` : '';

    return {
      value: v.pulley_variant_key,
      label: `${finishedOd}" OD${isLagged ? ` - ${v.lagging_type} lagged` : ''}${bearingInfo}`,
      groupLabel: `${v.family.manufacturer} ${v.family.shell_od_in}" ${v.family.style}`,
      finishedOdIn: finishedOd,
      shellOdIn: v.family.shell_od_in,
    };
  });
}

/**
 * useScopeStatus Hook
 *
 * Client-side hook for managing scope status (Draft/Set) for Quotes and Sales Orders.
 * Provides status state, toggle functions, and output permission checks.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export type ScopeEntityType = 'quote' | 'sales_order';
export type ScopeStatus = 'draft' | 'set';

export interface ScopeRevisionInfo {
  id: string;
  revision_number: number;
  created_at: string;
  created_by_user_id: string | null;
}

export interface ScopeStatusState {
  status: ScopeStatus;
  currentRevisionId: string | null;
  currentRevisionNumber: number | null;
  revision: ScopeRevisionInfo | null;
  isLoading: boolean;
  isTransitioning: boolean;
  error: string | null;
  outputsAllowed: boolean;
}

export interface UseScopeStatusReturn extends ScopeStatusState {
  setScope: () => Promise<boolean>;
  unsetScope: () => Promise<boolean>;
  toggleScope: () => Promise<boolean>;
  checkOutputPermission: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing scope status for a Quote or Sales Order.
 *
 * @param entityType - 'quote' or 'sales_order'
 * @param entityId - UUID of the entity (or null if not yet created)
 */
export function useScopeStatus(
  entityType: ScopeEntityType | null,
  entityId: string | null
): UseScopeStatusReturn {
  const [state, setState] = useState<ScopeStatusState>({
    status: 'draft',
    currentRevisionId: null,
    currentRevisionNumber: null,
    revision: null,
    isLoading: false,
    isTransitioning: false,
    error: null,
    outputsAllowed: false,
  });

  // Fetch current status
  const fetchStatus = useCallback(async () => {
    if (!entityType || !entityId) {
      setState((prev) => ({
        ...prev,
        status: 'draft',
        currentRevisionId: null,
        currentRevisionNumber: null,
        revision: null,
        isLoading: false,
        outputsAllowed: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const endpoint =
        entityType === 'quote'
          ? `/api/quotes/${entityId}/status`
          : `/api/sales-orders/${entityId}/status`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch scope status');
      }

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        status: data.status || 'draft',
        currentRevisionId: data.current_revision_id || null,
        currentRevisionNumber: data.current_revision_number || null,
        revision: data.revision || null,
        isLoading: false,
        outputsAllowed: data.status === 'set',
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [entityType, entityId]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Transition to Set
  const setScope = useCallback(async (): Promise<boolean> => {
    if (!entityType || !entityId) return false;

    setState((prev) => ({ ...prev, isTransitioning: true, error: null }));

    try {
      const endpoint =
        entityType === 'quote'
          ? `/api/quotes/${entityId}/status`
          : `/api/sales-orders/${entityId}/status`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'set' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set scope');
      }

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        status: 'set',
        currentRevisionId: data.revision?.id || prev.currentRevisionId,
        currentRevisionNumber: data.revision?.revision_number || prev.currentRevisionNumber,
        revision: data.revision || prev.revision,
        isTransitioning: false,
        outputsAllowed: true,
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isTransitioning: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      return false;
    }
  }, [entityType, entityId]);

  // Transition to Draft
  const unsetScope = useCallback(async (): Promise<boolean> => {
    if (!entityType || !entityId) return false;

    setState((prev) => ({ ...prev, isTransitioning: true, error: null }));

    try {
      const endpoint =
        entityType === 'quote'
          ? `/api/quotes/${entityId}/status`
          : `/api/sales-orders/${entityId}/status`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to unset scope');
      }

      setState((prev) => ({
        ...prev,
        status: 'draft',
        isTransitioning: false,
        outputsAllowed: false,
        // Keep revision info for display
      }));

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isTransitioning: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      return false;
    }
  }, [entityType, entityId]);

  // Toggle between Draft and Set
  const toggleScope = useCallback(async (): Promise<boolean> => {
    return state.status === 'draft' ? setScope() : unsetScope();
  }, [state.status, setScope, unsetScope]);

  // Check output permission (server authoritative)
  const checkOutputPermission = useCallback(async (): Promise<boolean> => {
    if (!entityType || !entityId) return false;

    try {
      const endpoint =
        entityType === 'quote'
          ? `/api/quotes/${entityId}/output-permission`
          : `/api/sales-orders/${entityId}/output-permission`;

      const response = await fetch(endpoint);
      const data = await response.json();

      return data.allowed === true;
    } catch {
      return false;
    }
  }, [entityType, entityId]);

  return {
    ...state,
    setScope,
    unsetScope,
    toggleScope,
    checkOutputPermission,
    refresh: fetchStatus,
  };
}

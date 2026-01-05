/**
 * useCurrentUserRole Hook
 *
 * Fetches the current user's role from /api/me and caches it.
 * Returns loading, role, error state and helper booleans.
 */

'use client';

import { useState, useEffect } from 'react';

export type Role = 'SUPER_ADMIN' | 'BELT_ADMIN' | 'BELT_USER';

interface UserRoleState {
  userId: string | null;
  email: string | null;
  role: Role | null;
  isLoading: boolean;
  error: string | null;
  // Helper booleans
  canBeltAdmin: boolean;
  isSuperAdmin: boolean;
}

// In-memory cache to avoid re-fetching within the same session
let cachedRole: { userId: string; email: string; role: Role } | null = null;

export function useCurrentUserRole(): UserRoleState {
  const [state, setState] = useState<UserRoleState>({
    userId: cachedRole?.userId ?? null,
    email: cachedRole?.email ?? null,
    role: cachedRole?.role ?? null,
    isLoading: !cachedRole,
    error: null,
    canBeltAdmin: cachedRole ? cachedRole.role === 'BELT_ADMIN' || cachedRole.role === 'SUPER_ADMIN' : false,
    isSuperAdmin: cachedRole ? cachedRole.role === 'SUPER_ADMIN' : false,
  });

  useEffect(() => {
    // If we have cached data, skip the fetch
    if (cachedRole) {
      return;
    }

    let cancelled = false;

    async function fetchRole() {
      try {
        const response = await fetch('/api/me');

        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated - this is expected for unauthenticated users
            if (!cancelled) {
              setState({
                userId: null,
                email: null,
                role: null,
                isLoading: false,
                error: null,
                canBeltAdmin: false,
                isSuperAdmin: false,
              });
            }
            return;
          }
          throw new Error(`Failed to fetch user role: ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled) {
          // Cache the result
          cachedRole = {
            userId: data.userId,
            email: data.email,
            role: data.role,
          };

          setState({
            userId: data.userId,
            email: data.email,
            role: data.role,
            isLoading: false,
            error: null,
            canBeltAdmin: data.role === 'BELT_ADMIN' || data.role === 'SUPER_ADMIN',
            isSuperAdmin: data.role === 'SUPER_ADMIN',
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to fetch user role',
          }));
        }
      }
    }

    fetchRole();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * Clear the cached role. Call this on logout.
 */
export function clearCachedRole() {
  cachedRole = null;
}

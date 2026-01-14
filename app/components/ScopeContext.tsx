'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useScopeStatus, ScopeEntityType, ScopeStatus } from '../../src/lib/hooks/useScopeStatus';

// ============================================================================
// Context Types
// ============================================================================

interface ScopeContextValue {
  entityType: ScopeEntityType | null;
  entityId: string | null;
  status: ScopeStatus;
  outputsAllowed: boolean;
  isLoading: boolean;
  revisionNumber: number | null;
  setScope: () => Promise<boolean>;
  unsetScope: () => Promise<boolean>;
  checkOutputPermission: () => Promise<boolean>;
}

const ScopeContext = createContext<ScopeContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface ScopeProviderProps {
  entityType: ScopeEntityType | null;
  entityId: string | null;
  children: ReactNode;
}

/**
 * ScopeProvider
 *
 * Provides scope status context to child components.
 * Wrap your page or component tree with this to enable scope-aware output gating.
 */
export function ScopeProvider({ entityType, entityId, children }: ScopeProviderProps) {
  const scopeStatus = useScopeStatus(entityType, entityId);

  const value: ScopeContextValue = {
    entityType,
    entityId,
    status: scopeStatus.status,
    outputsAllowed: scopeStatus.outputsAllowed,
    isLoading: scopeStatus.isLoading,
    revisionNumber: scopeStatus.currentRevisionNumber,
    setScope: scopeStatus.setScope,
    unsetScope: scopeStatus.unsetScope,
    checkOutputPermission: scopeStatus.checkOutputPermission,
  };

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useScope
 *
 * Access the current scope context.
 * Returns null if used outside of ScopeProvider.
 */
export function useScope(): ScopeContextValue | null {
  return useContext(ScopeContext);
}

/**
 * useScopeRequired
 *
 * Access the current scope context, throwing if not available.
 * Use this in components that require scope context.
 */
export function useScopeRequired(): ScopeContextValue {
  const context = useContext(ScopeContext);
  if (!context) {
    throw new Error('useScopeRequired must be used within a ScopeProvider');
  }
  return context;
}

// ============================================================================
// Gate Components
// ============================================================================

interface OutputGateProps {
  children: ReactNode;
  /** Fallback content when outputs are disabled */
  fallback?: ReactNode;
  /** Show tooltip explaining why disabled */
  showTooltip?: boolean;
}

/**
 * OutputGate
 *
 * Conditionally renders children only when outputs are allowed (status === 'set').
 * Shows fallback content when in Draft mode.
 */
export function OutputGate({ children, fallback, showTooltip = true }: OutputGateProps) {
  const scope = useScope();

  // If no scope context, allow outputs (backwards compatibility)
  if (!scope) {
    return <>{children}</>;
  }

  if (scope.isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-24" />
      </div>
    );
  }

  if (!scope.outputsAllowed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showTooltip) {
      return (
        <div className="relative group inline-block">
          <div className="opacity-50 cursor-not-allowed pointer-events-none">{children}</div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
            Set the scope to enable outputs.
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      );
    }

    return <div className="opacity-50 cursor-not-allowed pointer-events-none">{children}</div>;
  }

  return <>{children}</>;
}

/**
 * OutputDisabledBanner
 *
 * Shows a banner when outputs are disabled due to Draft status.
 * Use this at the top of output sections.
 */
export function OutputDisabledBanner() {
  const scope = useScope();

  if (!scope || scope.outputsAllowed || scope.isLoading) {
    return null;
  }

  return (
    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-amber-600 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <span className="font-medium text-amber-800">Outputs Disabled</span>
          <span className="text-amber-700 ml-2">
            Set the scope to enable copy, download, and export actions.
          </span>
        </div>
      </div>
    </div>
  );
}

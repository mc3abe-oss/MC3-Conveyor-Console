'use client';

import { useScopeStatus, ScopeEntityType } from '../../src/lib/hooks/useScopeStatus';

interface ScopeStatusBannerProps {
  entityType: ScopeEntityType;
  entityId: string;
  /** Optional callback when status changes */
  onStatusChange?: (status: 'draft' | 'set') => void;
  /** Compact mode for inline display */
  compact?: boolean;
}

/**
 * ScopeStatusBanner
 *
 * Displays the current scope status (Draft/Set) with toggle controls.
 * Shows a prominent banner when in Draft mode to indicate outputs are disabled.
 */
export default function ScopeStatusBanner({
  entityType,
  entityId,
  onStatusChange,
  compact = false,
}: ScopeStatusBannerProps) {
  const {
    status,
    revision,
    isLoading,
    isTransitioning,
    error,
    setScope,
    unsetScope,
  } = useScopeStatus(entityType, entityId);

  const handleSetScope = async () => {
    const success = await setScope();
    if (success && onStatusChange) {
      onStatusChange('set');
    }
  };

  const handleUnsetScope = async () => {
    const success = await unsetScope();
    if (success && onStatusChange) {
      onStatusChange('draft');
    }
  };

  if (isLoading) {
    return (
      <div className={`${compact ? 'py-2' : 'py-3'} px-4 bg-gray-50 border-b border-gray-200`}>
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-4 w-16 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  // Draft state - prominent warning banner
  if (status === 'draft') {
    return (
      <div className={`${compact ? 'py-2' : 'py-3'} px-4 bg-amber-50 border-b border-amber-200`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Draft icon */}
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-amber-600"
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
            </div>

            {/* Message */}
            <div>
              <span className="font-semibold text-amber-800">Draft</span>
              <span className="text-amber-700 ml-2">
                This scope is not locked. Outputs are disabled until you Set it.
              </span>
              {revision && (
                <span className="text-amber-600 ml-2 text-sm">
                  (Last set: Rev {revision.revision_number})
                </span>
              )}
            </div>
          </div>

          {/* Set button */}
          <button
            type="button"
            onClick={handleSetScope}
            disabled={isTransitioning}
            className="flex-shrink-0 px-4 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {isTransitioning ? 'Setting...' : 'Set Scope'}
          </button>
        </div>

        {error && (
          <div className="mt-2 text-sm text-red-600">
            Error: {error}
          </div>
        )}
      </div>
    );
  }

  // Set state - calm confirmation
  return (
    <div className={`${compact ? 'py-2' : 'py-3'} px-4 bg-green-50 border-b border-green-200`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Set icon */}
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Message */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-green-800">Set</span>
            {revision && (
              <>
                <span className="text-green-700">•</span>
                <span className="text-green-700">Revision {revision.revision_number}</span>
                <span className="text-green-600 text-sm">
                  (Set on {new Date(revision.created_at).toLocaleDateString()})
                </span>
              </>
            )}
          </div>
        </div>

        {/* Back to Draft button */}
        <button
          type="button"
          onClick={handleUnsetScope}
          disabled={isTransitioning}
          className="flex-shrink-0 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
        >
          {isTransitioning ? 'Updating...' : 'Back to Draft'}
        </button>
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          Error: {error}
        </div>
      )}
    </div>
  );
}

/**
 * Compact status pill for inline display (e.g., in headers)
 */
export function ScopeStatusPill({
  entityType,
  entityId,
}: {
  entityType: ScopeEntityType;
  entityId: string;
}) {
  const { status, revision, isLoading } = useScopeStatus(entityType, entityId);

  if (isLoading) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-500 rounded-full">
        ...
      </span>
    );
  }

  if (status === 'draft') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
        Draft
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
      Set
      {revision && <span className="text-green-600">• Rev {revision.revision_number}</span>}
    </span>
  );
}

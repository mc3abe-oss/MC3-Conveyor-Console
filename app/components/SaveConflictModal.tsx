'use client';

import { useCallback } from 'react';

/**
 * Conflict information returned from the server on 409
 */
export interface ConflictInfo {
  /** The application ID in conflict */
  applicationId: string;
  /** Local revision that was used as base */
  localRevision: string;
  /** Current revision on server */
  serverRevision: string;
  /** Who made the conflicting edit */
  conflictingUser?: string;
  /** When the conflicting edit was made */
  conflictingTimestamp?: string;
}

interface SaveConflictModalProps {
  isOpen: boolean;
  conflictInfo: ConflictInfo | null;
  /** Reload with server version (discard local changes) */
  onReload: () => void;
  /** Force overwrite server version with local changes */
  onForceOverwrite: () => void;
  /** Cancel and keep editing */
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * SaveConflictModal - Displayed when a 409 conflict is detected
 *
 * This modal is ONLY shown when the server detects that the base_revision
 * sent by the client is older than the current revision on the server.
 *
 * This is NOT shown on normal saves - only on actual conflicts.
 */
export default function SaveConflictModal({
  isOpen,
  conflictInfo,
  onReload,
  onForceOverwrite,
  onCancel,
  isLoading = false,
}: SaveConflictModalProps) {
  const handleBackdropClick = useCallback(() => {
    if (!isLoading) {
      onCancel();
    }
  }, [isLoading, onCancel]);

  if (!isOpen || !conflictInfo) {
    return null;
  }

  const conflictTime = conflictInfo.conflictingTimestamp
    ? new Date(conflictInfo.conflictingTimestamp).toLocaleString()
    : 'recently';

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 -z-10" aria-hidden="true" />

        {/* Modal */}
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="conflict-title"
        >
          {/* Warning icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-amber-100 rounded-full">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3
            id="conflict-title"
            className="text-lg font-semibold text-gray-900 text-center mb-2"
          >
            Save Conflict Detected
          </h3>

          <p className="text-gray-600 text-center mb-4">
            This application was modified by{' '}
            <span className="font-medium">{conflictInfo.conflictingUser || 'another user'}</span>{' '}
            {conflictTime}.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              Your changes cannot be saved because the application has been updated since you loaded it.
              Choose how to proceed:
            </p>
          </div>

          <div className="space-y-3">
            {/* Reload option (recommended) */}
            <button
              type="button"
              className="w-full px-4 py-3 text-left bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50"
              onClick={onReload}
              disabled={isLoading}
            >
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Reload Latest Version</div>
                  <div className="text-sm text-gray-600">
                    Discard your local changes and load the latest version
                  </div>
                </div>
              </div>
            </button>

            {/* Force overwrite option */}
            <button
              type="button"
              className="w-full px-4 py-3 text-left bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors disabled:opacity-50"
              onClick={onForceOverwrite}
              disabled={isLoading}
            >
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Overwrite with My Changes</div>
                  <div className="text-sm text-gray-600">
                    Replace the server version with your local changes
                  </div>
                </div>
              </div>
            </button>

            {/* Cancel option */}
            <button
              type="button"
              className="w-full px-4 py-2 text-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel and Keep Editing
            </button>
          </div>

          {isLoading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

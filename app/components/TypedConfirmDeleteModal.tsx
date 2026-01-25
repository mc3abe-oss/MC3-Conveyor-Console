'use client';

import { useState, useEffect } from 'react';

interface TypedConfirmDeleteModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** The application name that user must type to confirm */
  applicationName: string;
  /** Optional additional warning message */
  warning?: string;
  /** Whether the delete operation is in progress */
  isDeleting?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Whether the application is linked to a Quote or Sales Order */
  hasLinkage?: boolean;
  /** Linkage details for display */
  linkageInfo?: {
    linked_to_quote: boolean;
    linked_to_sales_order: boolean;
  };
}

/**
 * TypedConfirmDeleteModal
 *
 * A confirmation modal that requires the user to type the application name
 * to confirm deletion. This prevents accidental deletion of important data.
 */
export default function TypedConfirmDeleteModal({
  isOpen,
  onConfirm,
  onCancel,
  applicationName,
  warning,
  isDeleting = false,
  error,
  hasLinkage = false,
  linkageInfo,
}: TypedConfirmDeleteModalProps) {
  const [typedConfirmation, setTypedConfirmation] = useState('');

  // Reset typed confirmation when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTypedConfirmation('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate the confirmation code from application name
  // Use the first 8 characters, uppercase, no spaces
  const confirmationCode = applicationName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8) || 'DELETE';

  const isConfirmEnabled = typedConfirmation.toUpperCase() === confirmationCode;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmEnabled && !isDeleting) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onCancel} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          {/* Warning Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
            <svg
              className="w-6 h-6 text-red-600"
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

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Delete Application</h2>
            <p className="mt-2 text-sm text-gray-600">
              You are about to permanently delete:
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {applicationName}
            </p>
          </div>

          {/* Linkage Warning */}
          {hasLinkage && linkageInfo && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-amber-800">
                  <p className="font-medium">This application is linked to:</p>
                  <ul className="mt-1 list-disc list-inside">
                    {linkageInfo.linked_to_quote && <li>A Quote</li>}
                    {linkageInfo.linked_to_sales_order && <li>A Sales Order</li>}
                  </ul>
                  <p className="mt-1">Deleting will remove the linkage. You can recreate if needed.</p>
                </div>
              </div>
            </div>
          )}

          {/* Destruction Warning */}
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">
              This action cannot be undone. All associated data (specs, notes, attachments) will be permanently deleted.
            </p>
            {warning && (
              <p className="text-sm text-red-700 mt-1">{warning}</p>
            )}
          </div>

          {/* Typed Confirmation Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="confirmation" className="block text-sm font-medium text-gray-700 mb-2">
                To confirm, type <span className="font-mono font-bold text-red-600">{confirmationCode}</span> below:
              </label>
              <input
                id="confirmation"
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono text-center text-lg uppercase"
                placeholder={confirmationCode}
                autoFocus
                autoComplete="off"
                disabled={isDeleting}
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={!isConfirmEnabled || isDeleting}
                className={`w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isConfirmEnabled && !isDeleting
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  'Delete Permanently'
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isDeleting}
                className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

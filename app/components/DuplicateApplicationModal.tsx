'use client';

interface DuplicateApplicationModalProps {
  isOpen: boolean;
  onOpenExisting: () => void;
  onCancel: () => void;
  identity: {
    reference_type: string;
    reference_number: string;
    reference_line: number;
    slug: string;
  };
  existingDetails: {
    id: string;
    created_at: string;
    created_by: string | null;
    updated_at: string;
  } | null;
}

/**
 * DuplicateApplicationModal
 *
 * Shown when attempting to create an application that already exists.
 * User must explicitly choose to open the existing app or cancel.
 * No auto-navigation.
 */
export default function DuplicateApplicationModal({
  isOpen,
  onOpenExisting,
  onCancel,
  identity,
  existingDetails,
}: DuplicateApplicationModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const referenceLabel = identity.reference_type === 'QUOTE' ? 'Quote' : 'Sales Order';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          {/* Warning Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-amber-100 rounded-full">
            <svg
              className="w-6 h-6 text-amber-600"
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
            <h2 className="text-xl font-bold text-gray-900">
              Application Already Exists
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              An application for <strong>{referenceLabel} {identity.reference_number}</strong> Line{' '}
              <strong>{identity.reference_line}</strong> already exists.
            </p>
          </div>

          {/* Existing Details */}
          {existingDetails && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Existing Application
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">ID</dt>
                  <dd className="font-mono text-gray-900">
                    {existingDetails.id.slice(0, 8)}...
                  </dd>
                </div>
                {existingDetails.created_by && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Created by</dt>
                    <dd className="text-gray-900">{existingDetails.created_by}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Created</dt>
                  <dd className="text-gray-900">
                    {formatDate(existingDetails.created_at)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Last updated</dt>
                  <dd className="text-gray-900">
                    {formatDate(existingDetails.updated_at)}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onOpenExisting}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-mc3-blue hover:bg-mc3-navy rounded-lg transition-colors"
            >
              Open Existing Application
            </button>
            <button
              onClick={onCancel}
              className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

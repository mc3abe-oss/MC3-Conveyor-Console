'use client';

import { useEffect, useCallback } from 'react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
}

export default function UnsavedChangesModal({
  isOpen,
  onCancel,
  onDiscard,
  onSave,
  isSaving,
}: UnsavedChangesModalProps) {
  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onCancel();
      }
    },
    [onCancel, isSaving]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const handleSaveClick = async () => {
    await onSave();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={() => !isSaving && onCancel()}
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
          aria-labelledby="unsaved-changes-title"
        >
          <h3
            id="unsaved-changes-title"
            className="text-lg font-semibold text-gray-900 mb-2"
          >
            Unsaved Changes
          </h3>
          <p className="text-gray-600 mb-6">
            You have unsaved changes. What would you like to do?
          </p>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              className="btn btn-outline min-h-[44px]"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-destructive min-h-[44px]"
              onClick={onDiscard}
              disabled={isSaving}
            >
              Discard
            </button>
            <button
              type="button"
              className="btn btn-primary min-h-[44px]"
              onClick={handleSaveClick}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save & Continue'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

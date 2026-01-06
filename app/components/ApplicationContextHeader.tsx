'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SaveTarget, formatSaveTarget } from './SaveTargetModal';

interface ApplicationContextHeaderProps {
  context: SaveTarget | null;
  loadedConfigurationId?: string | null;
  onClear?: () => void;
  onDeleteLine?: () => void;  // Called after successful line delete (saved application)
  onDeleteDraft?: () => Promise<void> | void; // Called to delete an unsaved draft (clears context + deletes DB record)
  isDirty?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
  onSaveAsRecipe?: () => void; // Open save as recipe modal
  canSaveAsRecipe?: boolean; // Whether save as recipe is available (needs calculated results)
  onCalculate?: () => void;
  isCalculating?: boolean;
  canSave?: boolean;
  needsRecalc?: boolean;
  // Calculation status (v1.21)
  calculationStatus?: 'draft' | 'calculated';
  outputsStale?: boolean;
  // Auto-calc: only show calc button on error (manual retry)
  hasCalcError?: boolean;
}

export default function ApplicationContextHeader({
  context,
  loadedConfigurationId,
  onClear,
  onDeleteLine,
  onDeleteDraft,
  isDirty = false,
  isSaving = false,
  onSave,
  onSaveAsRecipe,
  canSaveAsRecipe = false,
  onCalculate,
  isCalculating = false,
  canSave = true,
  needsRecalc = false,
  calculationStatus = 'draft',
  outputsStale = false,
  hasCalcError = false,
}: ApplicationContextHeaderProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteDraftConfirm, setShowDeleteDraftConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showSaveMenu, setShowSaveMenu] = useState(false);

  // Close save menu on click outside
  useEffect(() => {
    if (!showSaveMenu) return;
    const handleClick = () => setShowSaveMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showSaveMenu]);

  // Line delete eligibility state - fetched from server
  // canHardDelete = true means application is ONLY referenced by this line type
  // canHardDelete = false means application is ALSO referenced by the other type
  const [canHardDelete, setCanHardDelete] = useState<boolean | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);

  // Determine display status: only "Calculated" if truly calculated and not stale
  const isFullyCalculated = calculationStatus === 'calculated' && !outputsStale;

  // Determine if this is a saved application (has DB record)
  const isSavedApplication = !!loadedConfigurationId;

  // Determine if this is a draft with context (linked to Quote/SO but not saved)
  const isDraftWithContext = !!context && !isSavedApplication;

  // DEV: Debug logging for delete button visibility
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEV][ApplicationContextHeader] Delete button state:', {
      contextType: context?.type || 'none',
      contextId: context?.id || null,
      isSavedApplication,
      isDraftWithContext,
      loadedConfigurationId: loadedConfigurationId || null,
      // Delete button hidden because:
      // - For saved: shown when isSavedApplication && onDeleteLine
      // - For draft: shown when isDraftWithContext && onDeleteDraft
      deleteLineVisible: isSavedApplication && !!onDeleteLine,
      deleteDraftVisible: isDraftWithContext && !!onDeleteDraft,
    });
  }

  // Fetch delete eligibility from server when application is loaded
  useEffect(() => {
    if (!loadedConfigurationId) {
      setCanHardDelete(null);
      return;
    }

    // Fetch eligibility from server
    setIsCheckingEligibility(true);
    fetch(`/api/applications/${loadedConfigurationId}/delete-eligibility`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setCanHardDelete(data.canHardDelete);
          console.log('[DeleteEligibility]', data);
        } else {
          setCanHardDelete(false);
        }
      })
      .catch((err) => {
        console.error('[DeleteEligibility] Error:', err);
        setCanHardDelete(false);
      })
      .finally(() => {
        setIsCheckingEligibility(false);
      });
  }, [loadedConfigurationId]);

  // Contextual button label based on context type
  const isQuoteContext = context?.type === 'quote';
  const deleteButtonLabel = 'Delete';

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
    setShowClearConfirm(false);
    if (onClear) {
      onClear();
    }
  };

  const handleDeleteClick = () => {
    setDeleteError(null);
    setShowDeleteConfirm(true);
  };

  const handleDeleteDraftClick = () => {
    setShowDeleteDraftConfirm(true);
  };

  const [isDeletingDraft, setIsDeletingDraft] = useState(false);

  const handleConfirmDeleteDraft = async () => {
    if (onDeleteDraft) {
      setIsDeletingDraft(true);
      try {
        await onDeleteDraft();
      } finally {
        setIsDeletingDraft(false);
        setShowDeleteDraftConfirm(false);
      }
    } else {
      setShowDeleteDraftConfirm(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!loadedConfigurationId || !context) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Call contextual delete endpoint based on context type
      const endpoint = context.type === 'quote'
        ? `/api/applications/${loadedConfigurationId}/delete-quote-line`
        : `/api/applications/${loadedConfigurationId}/delete-so-line`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete line');
      }

      // Success - close modal and notify parent
      setShowDeleteConfirm(false);
      if (onDeleteLine) {
        onDeleteLine();
      }
    } catch (error) {
      console.error('Delete error:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete line');
    } finally {
      setIsDeleting(false);
    }
  };

  // Draft state (no context - not linked to any Quote/SO)
  if (!context) {
    return (
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="flex items-center justify-between py-4">
          {/* Left: Header Content */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                New Application
              </h1>
              {/* Status Chip */}
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">
                Draft
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Not yet saved
            </p>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Recalculate - only shown on error (manual retry) */}
            {onCalculate && hasCalcError && (
              <button
                type="button"
                className="btn bg-red-600 hover:bg-red-700 text-white hidden md:inline-flex"
                onClick={onCalculate}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Retrying
                  </span>
                ) : (
                  'Recalculate now'
                )}
              </button>
            )}
            {/* Save - hidden on mobile (shown in bottom bar) */}
            {onSave && (
              <button
                type="button"
                className="btn btn-outline hidden md:inline-flex"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
            {onClear && (
              <button
                type="button"
                className="btn btn-outline text-gray-500 hover:text-gray-700"
                onClick={handleClearClick}
                title="Clear and start fresh"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Clear Confirmation Modal */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowClearConfirm(false)}>
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50 -z-10" />
              <div
                className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Clear this application?
                </h3>
                <p className="text-gray-600 mb-4">
                  This resets the form and unlinks from any Quote/Sales Order.
                  Saved records are not deleted.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmClear}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Linked state (has context - linked to a Quote or Sales Order)
  const isQuote = context.type === 'quote';
  const href = (isQuote ? `/console/quotes/${context.id}` : `/console/sales-orders/${context.id}`) as `/console/quotes/${string}`;
  const typeLabel = isQuote ? 'Quote' : 'Sales Order';
  const refDisplay = formatSaveTarget(context);

  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="flex items-start justify-between py-4">
        {/* Left: Header Content */}
        <div>
          {/* Line 1: Reference · Type · Status Chip */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              <Link
                href={href}
                className="hover:text-gray-700 hover:underline"
              >
                {refDisplay}
              </Link>
              <span className="text-gray-400 font-normal mx-2">·</span>
              <span className="text-gray-600 font-semibold">{typeLabel}</span>
              {isDirty && (
                <span className="ml-3 inline-block w-2 h-2 bg-gray-400 rounded-full" title="Unsaved changes" />
              )}
            </h1>
            {/* Status Chip - show Saved vs Draft based on loadedConfigurationId */}
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
              isSavedApplication
                ? (isFullyCalculated ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700')
                : 'bg-amber-100 text-amber-700'
            }`}>
              {isSavedApplication
                ? (isFullyCalculated ? 'Calculated' : 'Saved')
                : 'Draft'}
            </span>
          </div>

          {/* Line 2: Customer */}
          <p className="text-base text-gray-700 mt-1">
            {context.customer_name || 'No customer'}
          </p>

          {/* Line 3: Line · Qty */}
          <p className="text-sm text-gray-500 mt-0.5">
            Line {context.jobLine} · Qty {context.quantity}
          </p>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3 pt-1">
          {/* Recalculate - only shown on error (manual retry) */}
          {onCalculate && hasCalcError && (
            <button
              type="button"
              className="btn bg-red-600 hover:bg-red-700 text-white hidden md:inline-flex"
              onClick={onCalculate}
              disabled={isCalculating}
            >
              {isCalculating ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Retrying
                </span>
              ) : (
                'Recalculate now'
              )}
            </button>
          )}
          {/* Save with dropdown - hidden on mobile (shown in bottom bar) */}
          {onSave && (
            <div className="relative hidden md:inline-flex">
              <button
                type="button"
                className={`btn ${isDirty && canSave ? 'btn-primary' : 'btn-outline'} rounded-r-none border-r-0`}
                onClick={onSave}
                disabled={!canSave || isSaving}
                title={!isDirty ? 'No changes to save' : needsRecalc ? 'Will save as draft (results are stale)' : ''}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className={`btn ${isDirty && canSave ? 'btn-primary' : 'btn-outline'} rounded-l-none px-2`}
                onClick={(e) => { e.stopPropagation(); setShowSaveMenu(!showSaveMenu); }}
                disabled={isSaving}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showSaveMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                  <button
                    type="button"
                    onClick={() => { onSave(); setShowSaveMenu(false); }}
                    disabled={!canSave || isSaving}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                  >
                    Save
                  </button>
                  {onSaveAsRecipe && (
                    <button
                      type="button"
                      onClick={() => { onSaveAsRecipe(); setShowSaveMenu(false); }}
                      disabled={!canSaveAsRecipe}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                    >
                      Save as Recipe
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {onClear && (
            <button
              type="button"
              className="btn btn-outline text-gray-500 hover:text-gray-700"
              onClick={handleClearClick}
              title="Clear and start a new application"
            >
              Clear
            </button>
          )}
          {/* Delete Draft - show for unsaved drafts with context */}
          {isDraftWithContext && onDeleteDraft && (
            <button
              type="button"
              className="btn btn-outline text-red-600 hover:text-red-700 hover:border-red-300"
              onClick={handleDeleteDraftClick}
              title="Delete this draft"
            >
              Delete Draft
            </button>
          )}
          {/* Delete Line - show for saved applications */}
          {isSavedApplication && onDeleteLine && (
            <button
              type="button"
              className="btn btn-outline text-red-600 hover:text-red-700 hover:border-red-300"
              onClick={handleDeleteClick}
              disabled={isCheckingEligibility}
              title={`Delete this ${isQuoteContext ? 'Quote' : 'Sales Order'} line`}
            >
              {isCheckingEligibility ? '...' : deleteButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowClearConfirm(false)}>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 -z-10" />
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Clear this application?
              </h3>
              <p className="text-gray-600 mb-4">
                This resets the form and unlinks from any Quote/Sales Order.
                Saved records are not deleted.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmClear}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Line Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => !isDeleting && setShowDeleteConfirm(false)}>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 -z-10" />
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {deleteButtonLabel}?
              </h3>
              <p className="text-gray-600 mb-2">
                This will remove the {isQuoteContext ? 'Quote' : 'Sales Order'} line.
              </p>
              {!canHardDelete && (
                <p className="text-amber-600 text-sm mb-4">
                  This application is also linked to a {isQuoteContext ? 'Sales Order' : 'Quote'}, so it will be deactivated (not permanently deleted).
                </p>
              )}
              {canHardDelete && (
                <p className="text-gray-500 text-sm mb-4">
                  The application will be permanently deleted. This cannot be undone.
                </p>
              )}

              {deleteError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : deleteButtonLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Draft Confirmation Modal */}
      {showDeleteDraftConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => !isDeletingDraft && setShowDeleteDraftConfirm(false)}>
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 -z-10" />
            <div
              className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Draft?
              </h3>
              <p className="text-gray-600 mb-4">
                This will permanently delete the {context?.type === 'quote' ? 'Quote' : 'Sales Order'} record and return to a new application.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowDeleteDraftConfirm(false)}
                  disabled={isDeletingDraft}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleConfirmDeleteDraft}
                  disabled={isDeletingDraft}
                >
                  {isDeletingDraft ? 'Deleting...' : 'Delete Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

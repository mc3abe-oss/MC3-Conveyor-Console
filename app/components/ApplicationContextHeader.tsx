'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SaveTarget, formatSaveTarget } from './SaveTargetModal';

interface ApplicationContextHeaderProps {
  context: SaveTarget | null;
  loadedConfigurationId?: string | null;
  onClear?: () => void;
  onDeleteLine?: () => void;
  onDeleteDraft?: () => Promise<void> | void;
  isDirty?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
  onSaveAsRecipe?: () => void;
  canSaveAsRecipe?: boolean;
  onCalculate?: () => void;
  isCalculating?: boolean;
  canSave?: boolean;
  needsRecalc?: boolean;
  calculationStatus?: 'draft' | 'calculated';
  outputsStale?: boolean;
  hasCalcError?: boolean;
  /** Creator display name (e.g., "Bob M.") */
  createdByDisplay?: string | null;
  /** Application creation timestamp */
  createdAt?: string | null;
  /** Application last updated timestamp */
  lastUpdatedAt?: string | null;
  /** Number of saved revisions */
  revisionCount?: number;
}

/**
 * ApplicationContextHeader - Compact 2-Row Layout
 *
 * ROW 1 (Identity + Status): Reference # · Type · Customer · Line · Qty [Unsaved] | Status pill
 * ROW 2 (Metadata + Actions): Created by · Updated · Revisions | Save · Clear · Delete · History
 */
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
  createdByDisplay,
  createdAt,
  lastUpdatedAt,
  revisionCount,
}: ApplicationContextHeaderProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteDraftConfirm, setShowDeleteDraftConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [canHardDelete, setCanHardDelete] = useState<boolean | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);

  // Derived state
  const isFullyCalculated = calculationStatus === 'calculated' && !outputsStale;
  const isSavedApplication = !!loadedConfigurationId;
  const isDraftWithContext = !!context && !isSavedApplication;
  const isQuoteContext = context?.type === 'quote';

  // Close save menu on click outside
  useEffect(() => {
    if (!showSaveMenu) return;
    const handleClick = () => setShowSaveMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showSaveMenu]);

  // Fetch delete eligibility
  useEffect(() => {
    if (!loadedConfigurationId) {
      setCanHardDelete(null);
      return;
    }
    setIsCheckingEligibility(true);
    fetch(`/api/applications/${loadedConfigurationId}/delete-eligibility`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setCanHardDelete(data.canHardDelete);
        } else {
          setCanHardDelete(false);
        }
      })
      .catch(() => setCanHardDelete(false))
      .finally(() => setIsCheckingEligibility(false));
  }, [loadedConfigurationId]);

  // Handlers
  const handleClearClick = () => setShowClearConfirm(true);
  const handleConfirmClear = () => {
    setShowClearConfirm(false);
    if (onClear) onClear();
  };
  const handleDeleteClick = () => {
    setDeleteError(null);
    setShowDeleteConfirm(true);
  };
  const handleDeleteDraftClick = () => setShowDeleteDraftConfirm(true);

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
      const endpoint = context.type === 'quote'
        ? `/api/applications/${loadedConfigurationId}/delete-quote-line`
        : `/api/applications/${loadedConfigurationId}/delete-so-line`;
      const response = await fetch(endpoint, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete line');
      setShowDeleteConfirm(false);
      if (onDeleteLine) onDeleteLine();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete line');
    } finally {
      setIsDeleting(false);
    }
  };

  // Status chip config
  const getStatusChip = () => {
    if (isSavedApplication) {
      return isFullyCalculated
        ? { bg: 'bg-green-100 text-green-700', label: 'Calculated' }
        : { bg: 'bg-blue-100 text-blue-700', label: 'Saved' };
    }
    return { bg: 'bg-amber-100 text-amber-700', label: 'Draft' };
  };
  const statusChip = getStatusChip();

  // ============================================================
  // DRAFT STATE (No context - not linked to any Quote/SO)
  // ============================================================
  if (!context) {
    return (
      <>
        {/* ROW 1: Primary header with buttons */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">New Application</h1>
          </div>
          {/* Inline buttons */}
          <div className="flex items-center gap-2">
            {onCalculate && hasCalcError && (
              <button
                type="button"
                className="btn btn-sm bg-red-600 hover:bg-red-700 text-white hidden md:inline-flex"
                onClick={onCalculate}
                disabled={isCalculating}
              >
                {isCalculating ? 'Retrying...' : 'Recalculate'}
              </button>
            )}
            {onSave && (
              <button
                type="button"
                className="btn btn-sm btn-primary hidden md:inline-flex"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
            {onClear && (
              <button
                type="button"
                className="btn btn-sm btn-outline text-gray-600"
                onClick={handleClearClick}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: Context metadata - NO border, compressed with row 1 */}
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-1">
          <p className="text-sm text-gray-600">Not yet saved</p>
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusChip.bg}`}>
            {statusChip.label}
          </span>
        </div>

        {/* Clear Confirmation Modal */}
        {showClearConfirm && (
          <ConfirmModal
            title="Clear this application?"
            message="This resets the form and unlinks from any Quote/Sales Order. Saved records are not deleted."
            confirmLabel="Clear"
            onConfirm={handleConfirmClear}
            onCancel={() => setShowClearConfirm(false)}
          />
        )}
      </>
    );
  }

  // ============================================================
  // LINKED STATE (Has context - linked to Quote or Sales Order)
  // ============================================================
  const isQuote = context.type === 'quote';
  const href = (isQuote ? `/console/quotes/${context.id}` : `/console/sales-orders/${context.id}`) as `/console/quotes/${string}`;
  const typeLabel = isQuote ? 'Quote' : 'SO';
  const refDisplay = formatSaveTarget(context);

  // Format metadata for display
  const hasMetadata = isSavedApplication && (createdByDisplay || createdAt || lastUpdatedAt || revisionCount);

  return (
    <>
      {/* ROW 1: Identity + Status */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2">
        {/* Left: Primary identifier with context */}
        <div className="flex items-center gap-2 min-w-0">
          <Link href={href} className="text-lg font-bold text-gray-900 hover:text-blue-600 shrink-0">
            {refDisplay}
          </Link>
          <span className="text-sm text-gray-400 shrink-0">·</span>
          <span className="text-sm text-gray-500 shrink-0">{typeLabel}</span>
          <span className="text-sm text-gray-400 hidden sm:inline shrink-0">·</span>
          <span className="text-sm text-gray-600 truncate max-w-[150px] hidden sm:inline">
            {context.customer_name || 'No customer'}
          </span>
          <span className="text-sm text-gray-400 hidden md:inline shrink-0">·</span>
          <span className="text-sm text-gray-500 hidden md:inline shrink-0">Line {context.jobLine}</span>
          <span className="text-sm text-gray-400 hidden md:inline shrink-0">·</span>
          <span className="text-sm text-gray-500 hidden md:inline shrink-0">Qty {context.quantity}</span>
          {isDirty && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-orange-500 text-white rounded shadow-sm animate-pulse ml-2 shrink-0"
              title="You have unsaved changes"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Unsaved
            </span>
          )}
        </div>

        {/* Right: Status badges */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusChip.bg}`}>
            {statusChip.label}
          </span>
        </div>
      </div>

      {/* ROW 2: Metadata + Actions */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-1.5 border-t border-gray-100">
        {/* Left: Metadata (for saved apps) or context summary (for drafts) */}
        <div className="flex items-center gap-3 text-xs text-gray-500 min-w-0">
          {hasMetadata ? (
            <>
              {createdByDisplay && (
                <span className="hidden sm:inline">Created by <span className="text-gray-700">{createdByDisplay}</span></span>
              )}
              {createdAt && (
                <span className="hidden md:inline"><span className="text-gray-700">{new Date(createdAt).toLocaleDateString()}</span></span>
              )}
              {lastUpdatedAt && (
                <span>Updated <span className="text-gray-700">{new Date(lastUpdatedAt).toLocaleDateString()}</span></span>
              )}
              {typeof revisionCount === 'number' && revisionCount > 0 && (
                <span className="hidden sm:inline"><span className="text-gray-700">{revisionCount}</span> rev{revisionCount !== 1 ? 's' : ''}</span>
              )}
            </>
          ) : (
            <span className="text-gray-400">Not yet saved</span>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Recalculate - only on error */}
          {onCalculate && hasCalcError && (
            <button
              type="button"
              className="btn btn-sm bg-red-600 hover:bg-red-700 text-white hidden md:inline-flex"
              onClick={onCalculate}
              disabled={isCalculating}
            >
              {isCalculating ? 'Retrying...' : 'Recalculate'}
            </button>
          )}

          {/* Save with dropdown */}
          {onSave && (
            <div className="relative hidden md:inline-flex">
              <button
                type="button"
                className={`btn btn-sm ${isDirty && canSave ? 'btn-primary' : 'btn-outline'} rounded-r-none border-r-0`}
                onClick={onSave}
                disabled={!canSave || isSaving}
                title={!isDirty ? 'No changes to save' : needsRecalc ? 'Will save as draft' : ''}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${isDirty && canSave ? 'btn-primary' : 'btn-outline'} rounded-l-none px-1.5`}
                onClick={(e) => { e.stopPropagation(); setShowSaveMenu(!showSaveMenu); }}
                disabled={isSaving}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showSaveMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                  <button
                    type="button"
                    onClick={() => { onSave(); setShowSaveMenu(false); }}
                    disabled={!canSave || isSaving}
                    className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                  >
                    Save
                  </button>
                  {onSaveAsRecipe && (
                    <button
                      type="button"
                      onClick={() => { onSaveAsRecipe(); setShowSaveMenu(false); }}
                      disabled={!canSaveAsRecipe}
                      className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                    >
                      Save as Recipe
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Clear */}
          {onClear && (
            <button
              type="button"
              className="btn btn-sm btn-outline text-gray-600 hidden md:inline-flex"
              onClick={handleClearClick}
            >
              Clear
            </button>
          )}

          {/* Delete Draft */}
          {isDraftWithContext && onDeleteDraft && (
            <button
              type="button"
              className="btn btn-sm btn-outline text-red-600 hover:border-red-300 hidden md:inline-flex"
              onClick={handleDeleteDraftClick}
            >
              Delete
            </button>
          )}

          {/* Delete Line */}
          {isSavedApplication && onDeleteLine && (
            <button
              type="button"
              className="btn btn-sm btn-outline text-red-600 hover:border-red-300 hidden md:inline-flex"
              onClick={handleDeleteClick}
              disabled={isCheckingEligibility}
            >
              {isCheckingEligibility ? '...' : 'Delete'}
            </button>
          )}

          {/* History - contextual navigation, de-emphasized */}
          {isSavedApplication && loadedConfigurationId && (
            <Link
              href={`/history/${loadedConfigurationId}` as `/history/${string}`}
              className="text-xs text-gray-500 hover:text-gray-700 hidden md:inline-flex items-center gap-1"
              title="View revision history"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </Link>
          )}
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <ConfirmModal
          title="Clear this application?"
          message="This resets the form and unlinks from any Quote/Sales Order. Saved records are not deleted."
          confirmLabel="Clear"
          onConfirm={handleConfirmClear}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}

      {/* Delete Line Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete?"
          message={`This will remove the ${isQuoteContext ? 'Quote' : 'Sales Order'} line.`}
          subMessage={
            canHardDelete === false
              ? `This application is also linked to a ${isQuoteContext ? 'Sales Order' : 'Quote'}, so it will be deactivated (not permanently deleted).`
              : canHardDelete
                ? 'The application will be permanently deleted. This cannot be undone.'
                : undefined
          }
          error={deleteError}
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
          confirmDestructive
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          disabled={isDeleting}
        />
      )}

      {/* Delete Draft Confirmation Modal */}
      {showDeleteDraftConfirm && (
        <ConfirmModal
          title="Delete Draft?"
          message={`This will permanently delete the ${context?.type === 'quote' ? 'Quote' : 'Sales Order'} record and return to a new application.`}
          confirmLabel={isDeletingDraft ? 'Deleting...' : 'Delete Draft'}
          confirmDestructive
          onConfirm={handleConfirmDeleteDraft}
          onCancel={() => setShowDeleteDraftConfirm(false)}
          disabled={isDeletingDraft}
        />
      )}
    </>
  );
}

// ============================================================
// Reusable Confirm Modal
// ============================================================
function ConfirmModal({
  title,
  message,
  subMessage,
  error,
  confirmLabel,
  confirmDestructive = false,
  onConfirm,
  onCancel,
  disabled = false,
}: {
  title: string;
  message: string;
  subMessage?: string;
  error?: string | null;
  confirmLabel: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={disabled ? undefined : onCancel}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 -z-10" />
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-2">{message}</p>
          {subMessage && <p className="text-sm text-amber-600 mb-4">{subMessage}</p>}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onCancel}
              disabled={disabled}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`btn ${confirmDestructive ? 'bg-red-600 hover:bg-red-700 text-white' : 'btn-primary'}`}
              onClick={onConfirm}
              disabled={disabled}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

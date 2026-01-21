'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SaveTarget, formatSaveTarget } from './SaveTargetModal';
import RenameApplicationModal from './RenameApplicationModal';

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
  /** Application name */
  applicationName?: string | null;
  /** Application ID for rename API */
  applicationId?: string | null;
  /** Callback when application is renamed */
  onRename?: (newName: string) => void;
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
  applicationName,
  applicationId,
  onRename,
}: ApplicationContextHeaderProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteDraftConfirm, setShowDeleteDraftConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_canHardDelete, setCanHardDelete] = useState<boolean | null>(null);
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  // SO-specific delete eligibility (for draft SO that's linked to a Quote)
  const [soCanDelete, setSoCanDelete] = useState<boolean | null>(null);
  const [soDeleteBlockReason, setSoDeleteBlockReason] = useState<string | null>(null);

  // Rename modal state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

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

  // Fetch delete eligibility for applications
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

  // Fetch SO delete eligibility (for unsaved drafts linked to an SO)
  useEffect(() => {
    if (!context || context.type !== 'sales_order' || !context.id) {
      setSoCanDelete(null);
      setSoDeleteBlockReason(null);
      return;
    }
    fetch(`/api/sales-orders/${context.id}/delete-eligibility`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setSoCanDelete(data.canDelete);
          setSoDeleteBlockReason(data.reason || null);
        } else {
          setSoCanDelete(false);
          setSoDeleteBlockReason('Unable to check delete eligibility');
        }
      })
      .catch(() => {
        setSoCanDelete(false);
        setSoDeleteBlockReason('Unable to check delete eligibility');
      });
  }, [context]);

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

  // Handle rename API call
  const handleRename = async (newName: string) => {
    if (!applicationId) {
      throw new Error('No application to rename');
    }

    setIsRenaming(true);
    try {
      const response = await fetch(`/api/recipes/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rename application');
      }

      // Call the onRename callback to update parent state
      if (onRename) {
        onRename(newName);
      }
    } finally {
      setIsRenaming(false);
    }
  };

  // Status chip config - prominent colors for visibility
  const getStatusChip = () => {
    if (isSavedApplication) {
      return isFullyCalculated
        ? { bg: 'bg-green-600 text-white', label: 'Calculated' }
        : { bg: 'bg-blue-600 text-white', label: 'Saved' };
    }
    return { bg: 'bg-amber-500 text-white', label: 'Draft' };
  };
  const statusChip = getStatusChip();

  // ============================================================
  // DRAFT STATE (No context - not linked to any Quote/SO)
  // ============================================================
  if (!context) {
    return (
      <>
        <div className="px-5 py-5 border-b border-gray-100">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">New Application</h1>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusChip.bg}`}>
                {statusChip.label}
              </span>
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {onCalculate && hasCalcError && (
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                  onClick={onCalculate}
                  disabled={isCalculating}
                >
                  {isCalculating ? 'Retrying...' : 'Recalculate'}
                </button>
              )}
              {onSave && (
                <button
                  type="button"
                  className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  onClick={onSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              )}
              {onClear && (
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  onClick={handleClearClick}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {/* Metadata row */}
          <p className="text-sm text-gray-500 mt-1">Not yet linked to a Quote or Sales Order</p>
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
  const typeLabel = isQuote ? 'Quote' : 'Sales Order';
  const refDisplay = formatSaveTarget(context);

  // Format metadata for display
  const hasMetadata = isSavedApplication && (createdByDisplay || createdAt || lastUpdatedAt || revisionCount);

  return (
    <>
      <div className="px-5 py-5 border-b border-gray-100">
        {/* ROW 1: Primary identifier + Status + Actions */}
        <div className="flex items-center justify-between gap-4">
          {/* Left: Reference info */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href={href} className="text-2xl font-bold text-gray-900 hover:text-blue-600 shrink-0">
              {refDisplay}
            </Link>
            <span className="text-sm text-gray-400 hidden sm:inline">•</span>
            <span className="text-sm font-medium text-gray-600 hidden sm:inline shrink-0">{typeLabel}</span>
            {context.customer_name && (
              <>
                <span className="text-sm text-gray-400 hidden md:inline">•</span>
                <span className="text-sm text-gray-600 truncate max-w-[200px] hidden md:inline">
                  {context.customer_name}
                </span>
              </>
            )}
            {/* Status badges */}
            <div className="flex items-center gap-2 ml-2">
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusChip.bg}`}>
                {statusChip.label}
              </span>
              {isDirty && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-orange-500 text-white rounded-full animate-pulse"
                  title="You have unsaved changes"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                  </svg>
                  Unsaved
                </span>
              )}
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Recalculate - only on error */}
            {onCalculate && hasCalcError && (
              <button
                type="button"
                className="px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors hidden md:inline-flex"
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
                  className={`px-4 py-1.5 text-sm font-medium rounded-l-md transition-colors ${
                    isDirty && canSave
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  onClick={onSave}
                  disabled={!canSave || isSaving}
                  title={!isDirty ? 'No changes to save' : needsRecalc ? 'Will save as draft' : ''}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className={`px-2 py-1.5 text-sm font-medium rounded-r-md border-l transition-colors ${
                    isDirty && canSave
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 border-gray-200'
                  }`}
                  onClick={(e) => { e.stopPropagation(); setShowSaveMenu(!showSaveMenu); }}
                  disabled={isSaving}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showSaveMenu && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <button
                      type="button"
                      onClick={() => { onSave(); setShowSaveMenu(false); }}
                      disabled={!canSave || isSaving}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                    >
                      Save
                    </button>
                    {onSaveAsRecipe && (
                      <button
                        type="button"
                        onClick={() => { onSaveAsRecipe(); setShowSaveMenu(false); }}
                        disabled={!canSaveAsRecipe}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
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
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors hidden md:inline-flex"
                onClick={handleClearClick}
              >
                Clear
              </button>
            )}

            {/* Delete Draft - only show if SO is deletable (not linked to quote) */}
            {isDraftWithContext && onDeleteDraft && (
              context?.type === 'sales_order' && soCanDelete === false ? (
                <span
                  className="px-3 py-1.5 text-sm font-medium text-gray-400 cursor-not-allowed hidden md:inline-flex"
                  title={soDeleteBlockReason || 'Cannot delete'}
                >
                  Delete
                </span>
              ) : (
                <button
                  type="button"
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors hidden md:inline-flex"
                  onClick={handleDeleteDraftClick}
                >
                  Delete
                </button>
              )
            )}

            {/* Delete Line */}
            {isSavedApplication && onDeleteLine && (
              <button
                type="button"
                className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors hidden md:inline-flex"
                onClick={handleDeleteClick}
                disabled={isCheckingEligibility}
              >
                {isCheckingEligibility ? '...' : 'Delete'}
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: Application Name + Metadata */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {/* Application Name with Edit Button */}
            {isSavedApplication && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-700">
                  {applicationName || 'Unnamed Application'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowRenameModal(true)}
                  className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Rename application"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <span className="text-gray-300">|</span>
              </div>
            )}
            <span>Line {context.jobLine}</span>
            <span>Qty {context.quantity}</span>
            {hasMetadata && (
              <>
                {createdByDisplay && (
                  <span className="hidden sm:inline">by {createdByDisplay}</span>
                )}
                {lastUpdatedAt && (
                  <span className="hidden md:inline">Updated {new Date(lastUpdatedAt).toLocaleDateString()}</span>
                )}
                {typeof revisionCount === 'number' && revisionCount > 0 && (
                  <span className="hidden lg:inline">{revisionCount} revision{revisionCount !== 1 ? 's' : ''}</span>
                )}
              </>
            )}
            {!hasMetadata && (
              <span className="text-gray-400">Not yet saved</span>
            )}
          </div>

          {/* History link */}
          {isSavedApplication && loadedConfigurationId && (
            <Link
              href={`/history/${loadedConfigurationId}` as `/history/${string}`}
              className="text-sm text-gray-500 hover:text-blue-600 hidden md:inline-flex items-center gap-1"
              title="View revision history"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          message={`This will permanently delete the ${isQuoteContext ? 'Quote' : 'Sales Order'} line and its application data.`}
          subMessage="This cannot be undone."
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
          title="Delete?"
          message={`This will permanently delete the ${context?.type === 'quote' ? 'Quote' : 'Sales Order'} and all associated application data.`}
          subMessage="This cannot be undone."
          confirmLabel={isDeletingDraft ? 'Deleting...' : 'Delete'}
          confirmDestructive
          onConfirm={handleConfirmDeleteDraft}
          onCancel={() => setShowDeleteDraftConfirm(false)}
          disabled={isDeletingDraft}
        />
      )}

      {/* Rename Application Modal */}
      <RenameApplicationModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        onRename={handleRename}
        currentName={applicationName || ''}
        isRenaming={isRenaming}
      />
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

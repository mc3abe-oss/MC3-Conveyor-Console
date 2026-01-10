'use client';

import { useState } from 'react';

interface ReferenceHeaderProps {
  referenceType: 'QUOTE' | 'SALES_ORDER';
  referenceNumber: string;
  lineKey: string;
  conveyorQty: number;
  onReferenceTypeChange: (type: 'QUOTE' | 'SALES_ORDER') => void;
  onReferenceNumberChange: (number: string) => void;
  onLineKeyChange: (key: string) => void;
  onConveyorQtyChange: (qty: number) => void;
  onLoad: () => void;
  onSave: () => void;
  onCalculate?: () => void;
  onClear?: () => void;
  loadedState: {
    isLoaded: boolean;
    revisionNumber?: number;
    savedAt?: string;
    savedByUser?: string;
  };
  isSaving: boolean;
  isLoading: boolean;
  isCalculating?: boolean;
  canSave?: boolean;
  canCalculate?: boolean;
  isDirty?: boolean;
  needsRecalc?: boolean;
  onOpenFindModal?: () => void;
}

export default function ReferenceHeader({
  referenceType,
  referenceNumber,
  lineKey,
  conveyorQty,
  onReferenceTypeChange,
  onReferenceNumberChange,
  onLineKeyChange,
  onConveyorQtyChange,
  onLoad,
  onSave,
  onCalculate,
  onClear,
  loadedState,
  isSaving,
  isLoading,
  isCalculating = false,
  canSave = true,
  isDirty = false,
  needsRecalc = false,
  onOpenFindModal,
}: ReferenceHeaderProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Determine tooltip messages for buttons
  const getSaveTooltip = () => {
    if (!loadedState.isLoaded) return '';
    if (!isDirty) return 'No changes to save';
    if (needsRecalc) return 'Recalculate before saving';
    return '';
  };

  const saveTooltip = getSaveTooltip();

  // Save button styling: primary when dirty & can save, otherwise outline
  const saveButtonClass = isDirty && canSave && !needsRecalc
    ? 'btn btn-primary'
    : 'btn btn-outline';

  const handleClearClick = () => {
    if (isDirty) {
      setShowClearConfirm(true);
    } else {
      onClear?.();
    }
  };

  const handleConfirmClear = () => {
    setShowClearConfirm(false);
    onClear?.();
  };

  return (
    <div className="card mb-6">
      {/* Header row with title and action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Reference</h2>

        {/* Action buttons - grouped logically */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Group A: Data actions */}
          <div className="flex items-center gap-2">
            {onOpenFindModal && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={onOpenFindModal}
                title="Search for existing configurations"
              >
                Find
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline"
              onClick={onLoad}
              disabled={!referenceNumber || isLoading}
              title={!referenceNumber ? 'Enter a reference number first' : 'Load configuration'}
            >
              {isLoading ? 'Loading...' : 'Load'}
            </button>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-6 w-px bg-gray-300" />

          {/* Group B: Work actions */}
          <div className="flex items-center gap-2">
            {onCalculate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onCalculate}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Calculating
                  </span>
                ) : (
                  'Calculate'
                )}
              </button>
            )}
            <button
              type="button"
              className={saveButtonClass}
              onClick={onSave}
              disabled={!canSave || isSaving}
              title={saveTooltip}
            >
              <span className="flex items-center gap-1.5">
                {isSaving ? 'Saving...' : 'Save'}
                {isDirty && !isSaving && (
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" title="Unsaved changes" />
                )}
              </span>
            </button>
            {onClear && (
              <button
                type="button"
                className="btn btn-destructive"
                onClick={handleClearClick}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Clear confirmation dialog */}
      {showClearConfirm && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-800">
            You have unsaved changes. Clear anyway?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              onClick={() => setShowClearConfirm(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              onClick={handleConfirmClear}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Form fields */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div>
          <label htmlFor="reference_type" className="label">
            Type
          </label>
          <select
            id="reference_type"
            className="input"
            value={referenceType}
            onChange={(e) => onReferenceTypeChange(e.target.value as 'QUOTE' | 'SALES_ORDER')}
          >
            <option value="QUOTE">Quote</option>
            <option value="SALES_ORDER">Sales Order</option>
          </select>
        </div>

        <div>
          <label htmlFor="reference_number" className="label">
            Number
          </label>
          <input
            type="text"
            id="reference_number"
            className="input"
            value={referenceNumber}
            onChange={(e) => onReferenceNumberChange(e.target.value)}
            placeholder="e.g., 32853 or 32853.1"
            inputMode="decimal"
          />
        </div>

        <div>
          <label htmlFor="line_key" className="label">
            Line
          </label>
          <input
            type="text"
            id="line_key"
            className="input"
            value={lineKey}
            onChange={(e) => onLineKeyChange(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="conveyor_qty" className="label">
            Quantity
          </label>
          <input
            type="number"
            id="conveyor_qty"
            className="input"
            value={conveyorQty}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onConveyorQtyChange(isNaN(val) || val < 1 ? 1 : val);
            }}
            min="1"
            max="999"
            title="How many of this same conveyor configuration?"
          />
        </div>
      </div>

      {loadedState.isLoaded && (
        <div className="text-sm text-gray-600 bg-gray-50 rounded p-3">
          <strong>Loaded:</strong> {referenceType} {referenceNumber} (Line {lineKey})
          {loadedState.revisionNumber && <> Rev {loadedState.revisionNumber}</>}
          {loadedState.savedAt && (
            <>
              {' | '}Saved {new Date(loadedState.savedAt).toLocaleString()}
            </>
          )}
          {loadedState.savedByUser && (
            <>
              {' | '}User {loadedState.savedByUser}
            </>
          )}
        </div>
      )}
    </div>
  );
}

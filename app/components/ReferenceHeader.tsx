'use client';

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
  // Determine tooltip messages for buttons
  const getSaveTooltip = () => {
    if (!loadedState.isLoaded) return '';
    if (!isDirty) return 'No changes to save';
    if (needsRecalc) return 'Recalculate before saving';
    return '';
  };

  const getCalculateTooltip = () => {
    if (!needsRecalc) return 'Up to date';
    return '';
  };

  const saveTooltip = getSaveTooltip();
  const calculateTooltip = getCalculateTooltip();

  return (
    <div className="card mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Reference</h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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
            placeholder="e.g., Q62633"
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

        <div className="flex items-end gap-2">
          {onOpenFindModal && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onOpenFindModal}
            >
              Find
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary flex-1"
            onClick={onLoad}
            disabled={!referenceNumber || isLoading}
          >
            {isLoading ? 'Loading...' : 'Load'}
          </button>
          {onCalculate && (
            <button
              type="button"
              className="btn btn-secondary flex-1"
              onClick={onCalculate}
              disabled={isCalculating}
              title={calculateTooltip}
            >
              {isCalculating ? 'Calculating...' : 'Calculate'}
              {needsRecalc && !isCalculating && ' *'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary flex-1"
            onClick={onSave}
            disabled={!canSave || isSaving}
            title={saveTooltip}
          >
            {isSaving ? 'Saving...' : 'Save'}
            {isDirty && !isSaving && ' *'}
          </button>
          {onClear && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClear}
            >
              Clear
            </button>
          )}
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

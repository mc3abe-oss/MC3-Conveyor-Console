'use client';

/** Save state values - matches useSaveState */
export type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

interface MobileBottomActionBarProps {
  onCalculate: () => void;
  onSave: () => void;
  isCalculating: boolean;
  isSaving: boolean;
  canSave: boolean;
  isDirty: boolean;
  // Auto-calc: only show calc button on error (manual retry)
  hasCalcError?: boolean;
  /** Save state for button logic */
  saveState?: SaveState;
  /** Last save error message */
  saveError?: string | null;
}

export default function MobileBottomActionBar({
  onCalculate,
  onSave,
  isCalculating,
  isSaving,
  canSave: _canSaveFromProps, // Renamed - using saveState instead
  isDirty,
  hasCalcError = false,
  saveState,
  saveError,
}: MobileBottomActionBarProps) {
  // Derive button state from saveState if provided, otherwise use legacy props
  const effectiveSaveState: SaveState = saveState ?? (isSaving ? 'saving' : isDirty ? 'dirty' : 'saved');
  const saveButtonEnabled = effectiveSaveState === 'dirty' || effectiveSaveState === 'error';
  const showSaving = effectiveSaveState === 'saving';
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex gap-3 p-4 pb-safe max-w-7xl mx-auto">
        {/* Recalculate Button - only shown on error (manual retry) */}
        {hasCalcError && (
          <button
            type="button"
            className="btn bg-red-600 hover:bg-red-700 text-white flex-1 min-h-[48px] text-base"
            onClick={onCalculate}
            disabled={isCalculating}
          >
            {isCalculating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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

        {/* Save Button */}
        <button
          type="button"
          className={`btn flex-1 min-h-[48px] text-base ${
            effectiveSaveState === 'error' ? 'bg-red-600 hover:bg-red-700 text-white'
            : saveButtonEnabled ? 'btn-primary'
            : 'btn-outline'
          }`}
          onClick={onSave}
          disabled={!saveButtonEnabled || showSaving}
          title={effectiveSaveState === 'error' ? saveError || 'Save failed - tap to retry' : ''}
        >
          {showSaving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {effectiveSaveState === 'error' ? 'Retry Save' : 'Save'}
              {effectiveSaveState === 'dirty' && (
                <span className="inline-block w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
              )}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

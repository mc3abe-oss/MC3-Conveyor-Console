'use client';

import Link from 'next/link';
import { SaveTarget, formatSaveTarget } from './SaveTargetModal';

interface ApplicationContextHeaderProps {
  context: SaveTarget | null;
  onUnlink?: () => void;
  isDirty?: boolean;
  isSaving?: boolean;
  onSave?: () => void;
  onCalculate?: () => void;
  isCalculating?: boolean;
  canSave?: boolean;
  needsRecalc?: boolean;
}

export default function ApplicationContextHeader({
  context,
  onUnlink,
  isDirty = false,
  isSaving = false,
  onSave,
  onCalculate,
  isCalculating = false,
  canSave = true,
  needsRecalc = false,
}: ApplicationContextHeaderProps) {
  // Draft state (not yet saved)
  if (!context) {
    return (
      <div className="bg-white border-b border-gray-200 mb-6">
        <div className="flex items-center justify-between py-4">
          {/* Left: Header Content */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Draft Application
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Not yet saved
            </p>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-3">
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
            {onSave && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Linked state
  const isQuote = context.type === 'quote';
  const href = (isQuote ? `/console/quotes/${context.id}` : `/console/sales-orders/${context.id}`) as `/console/quotes/${string}`;
  const typeLabel = isQuote ? 'Quote' : 'Sales Order';
  const refDisplay = formatSaveTarget(context);

  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="flex items-start justify-between py-4">
        {/* Left: Header Content */}
        <div>
          {/* Line 1: Reference · Type */}
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
          {onSave && (
            <button
              type="button"
              className={`btn ${isDirty && canSave && !needsRecalc ? 'btn-primary' : 'btn-outline'}`}
              onClick={onSave}
              disabled={!canSave || isSaving}
              title={!isDirty ? 'No changes to save' : needsRecalc ? 'Recalculate before saving' : ''}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
          {onUnlink && (
            <button
              type="button"
              className="btn btn-outline text-gray-600 hover:text-gray-800"
              onClick={onUnlink}
              title="Start a new draft"
            >
              New
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

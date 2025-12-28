'use client';

import Link from 'next/link';
import { SaveTarget, formatSaveTarget } from './SaveTargetModal';

interface CalculatorContextBadgeProps {
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

export default function CalculatorContextBadge({
  context,
  onUnlink,
  isDirty = false,
  isSaving = false,
  onSave,
  onCalculate,
  isCalculating = false,
  canSave = true,
  needsRecalc = false,
}: CalculatorContextBadgeProps) {
  // Not linked - show "Unlinked" state with Save to link
  if (!context) {
    return (
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Unlinked Configuration</p>
              <p className="text-xs text-gray-500">Click Save to link to a Quote or Sales Order</p>
            </div>
          </div>

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

  // Linked - show context badge with link to Quote/SO
  const isQuote = context.type === 'quote';
  const href = (isQuote ? `/console/quotes/${context.id}` : `/console/sales-orders/${context.id}`) as `/console/quotes/${string}`;
  const badgeColor = isQuote ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800';
  const iconBg = isQuote ? 'bg-amber-100' : 'bg-blue-100';
  const iconColor = isQuote ? 'text-amber-600' : 'text-blue-600';

  // Determine save button styling
  const getSaveTooltip = () => {
    if (!isDirty) return 'No changes to save';
    if (needsRecalc) return 'Recalculate before saving';
    return '';
  };

  const saveTooltip = getSaveTooltip();
  const saveButtonClass = isDirty && canSave && !needsRecalc
    ? 'btn btn-primary'
    : 'btn btn-outline';

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
            {isQuote ? (
              <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : (
              <svg className={`w-5 h-5 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Link href={href} className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline">
                {formatSaveTarget(context)}
              </Link>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${badgeColor}`}>
                {isQuote ? 'Quote' : 'Sales Order'}
              </span>
              {isDirty && (
                <span className="w-2 h-2 bg-amber-500 rounded-full" title="Unsaved changes" />
              )}
            </div>
            <p className="text-xs text-gray-500">
              {context.customer_name || 'No customer'} &bull; Job Line {context.jobLine} &bull; Qty {context.quantity}
            </p>
          </div>
        </div>

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
          {onSave && (
            <button
              type="button"
              className={saveButtonClass}
              onClick={onSave}
              disabled={!canSave || isSaving}
              title={saveTooltip}
            >
              <span className="flex items-center gap-1.5">
                {isSaving ? 'Saving...' : 'Save'}
              </span>
            </button>
          )}
          {onUnlink && (
            <button
              type="button"
              className="btn btn-destructive"
              onClick={onUnlink}
              title="Unlink from this Quote/SO and start fresh"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Return Support Configuration Modal
 *
 * Configures the belt return path support system.
 *
 * v1.29: New explicit Return Support configuration
 * - Frame style: Standard / Low Profile (explicit user selection)
 * - Snub rollers: Auto / Yes / No
 * - End offset: pulley center to first return roller (user-adjustable)
 * - Gravity roller count and diameter
 * - Snub roller diameter (when enabled)
 *
 * This replaces the frame-height-derived snub roller logic.
 */

'use client';

import { useMemo } from 'react';
import {
  SliderbedInputs,
  ReturnFrameStyle,
  ReturnSnubMode,
  RETURN_SNUB_MODE_LABELS,
} from '../../src/models/sliderbed_v1/schema';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

/**
 * Default end offset per end (inches)
 */
const DEFAULT_END_OFFSET_IN = 24;

/**
 * Default gravity roller spacing for initial count calculation
 */
const DEFAULT_GRAVITY_SPACING_IN = 60;

/**
 * Compute whether snubs are enabled based on style and mode
 */
function computeSnubsEnabled(
  frameStyle: ReturnFrameStyle | string | undefined,
  snubMode: ReturnSnubMode | string | undefined
): boolean {
  const style = frameStyle ?? ReturnFrameStyle.Standard;
  const mode = snubMode ?? ReturnSnubMode.Auto;

  if (mode === ReturnSnubMode.Yes || mode === 'YES') {
    return true;
  }
  if (mode === ReturnSnubMode.No || mode === 'NO') {
    return false;
  }
  // Auto mode: Standard → No, Low Profile → Yes
  return style === ReturnFrameStyle.LowProfile || style === 'LOW_PROFILE';
}

/**
 * Compute the return span to support
 * @param conveyorLengthCcIn - Base return run length
 * @param snubsEnabled - Whether snubs are enabled
 * @param endOffsetIn - End offset per end in inches
 */
function computeReturnSpan(
  conveyorLengthCcIn: number,
  snubsEnabled: boolean,
  endOffsetIn: number
): number {
  if (snubsEnabled) {
    // With snubs, gravity rollers don't cover the ends
    // Total reduction = 2 * endOffsetIn (once per end)
    return Math.max(conveyorLengthCcIn - 2 * endOffsetIn, 0);
  }
  return conveyorLengthCcIn;
}

/**
 * Compute gravity roller centers from span and count
 */
function computeGravityRollerCenters(
  spanIn: number,
  rollerCount: number
): number | null {
  if (rollerCount < 2) return null;
  return spanIn / (rollerCount - 1);
}

/**
 * Compute default roller count from span
 */
function computeDefaultRollerCount(spanIn: number): number {
  if (spanIn <= 0) return 2;
  return Math.max(Math.floor(spanIn / DEFAULT_GRAVITY_SPACING_IN) + 1, 2);
}

export default function ReturnSupportModal({
  isOpen,
  onClose,
  inputs,
  updateInput,
}: Props) {
  // Current values
  const frameStyle = inputs.return_frame_style ?? ReturnFrameStyle.Standard;
  const snubMode = inputs.return_snub_mode ?? ReturnSnubMode.Auto;
  const endOffsetIn = inputs.return_end_offset_in ?? DEFAULT_END_OFFSET_IN;
  const gravityRollerDia = inputs.return_gravity_roller_diameter_in ?? 1.9;
  const snubRollerDia = inputs.return_snub_roller_diameter_in ?? 2.5;
  const conveyorLength = inputs.conveyor_length_cc_in ?? 120;

  // Computed values
  const snubsEnabled = useMemo(
    () => computeSnubsEnabled(frameStyle, snubMode),
    [frameStyle, snubMode]
  );

  const returnSpan = useMemo(
    () => computeReturnSpan(conveyorLength, snubsEnabled, endOffsetIn),
    [conveyorLength, snubsEnabled, endOffsetIn]
  );

  // Default roller count if not set
  const defaultCount = useMemo(
    () => computeDefaultRollerCount(returnSpan),
    [returnSpan]
  );

  const rollerCount = inputs.return_gravity_roller_count ?? defaultCount;

  const gravityCenters = useMemo(
    () => computeGravityRollerCenters(returnSpan, rollerCount),
    [returnSpan, rollerCount]
  );

  // Validation
  const isRollerCountValid = rollerCount >= 2;
  const isCentersTooLarge = gravityCenters !== null && gravityCenters > 72;
  const isCentersTooSmall = gravityCenters !== null && gravityCenters < 24;
  const isEndOffsetOutOfRange = endOffsetIn < 6 || endOffsetIn > 60;

  // Total reduction when snubs enabled
  const totalReduction = 2 * endOffsetIn;

  // v1.37: Cleats + Snubs warning (allowed but warn)
  const cleatsEnabled = inputs.cleats_enabled === true || inputs.cleats_mode === 'cleated';
  const showCleatsSnubsWarning = cleatsEnabled && snubsEnabled;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Return Support Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-5">
          {/* Snub Rollers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Snub Rollers
            </label>
            <select
              value={snubMode as string}
              onChange={(e) => updateInput('return_snub_mode', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {Object.entries(RETURN_SNUB_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className="mt-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                snubsEnabled
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {snubsEnabled ? 'Snubs Enabled' : 'No Snubs'}
              </span>
            </div>
            {/* v1.37: Cleats + Snubs warning */}
            {showCleatsSnubsWarning && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-amber-700">
                    <strong>Snub rollers with cleats:</strong> Cleats can interfere with snub wrap and may cause noise, wear, or belt damage. Verify clearance and snub diameter.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* End Offset (only when snubs enabled) */}
          {snubsEnabled && (
            <div className="bg-blue-50 rounded-md p-3">
              <label className="block text-sm font-medium text-blue-800 mb-1">
                End Offset (pulley center to first roller)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={endOffsetIn}
                  onChange={(e) => updateInput('return_end_offset_in', parseFloat(e.target.value) || DEFAULT_END_OFFSET_IN)}
                  className={`block w-24 px-3 py-1.5 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    isEndOffsetOutOfRange ? 'border-yellow-400' : 'border-gray-300'
                  }`}
                />
                <span className="text-sm text-blue-700">in per end</span>
              </div>
              {isEndOffsetOutOfRange && (
                <p className="mt-1 text-xs text-yellow-700">
                  Typical range: 6" to 60"
                </p>
              )}
            </div>
          )}

          {/* Gravity Return Rollers */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Gravity Return Rollers
            </h3>

            {/* Span display with honest text */}
            <div className="bg-gray-50 rounded-md p-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Span to support:</span>
                <span className="text-sm font-mono font-medium text-gray-900">
                  {returnSpan.toFixed(1)}"
                </span>
              </div>
              {snubsEnabled && (
                <p className="mt-1 text-xs text-gray-500">
                  Reduced by {totalReduction}" total ({endOffsetIn}" per end) for snub zones
                </p>
              )}
            </div>

            {/* Roller count and diameter in row */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roller Count
                </label>
                <input
                  type="number"
                  min={2}
                  step={1}
                  value={rollerCount}
                  onChange={(e) => updateInput('return_gravity_roller_count', parseInt(e.target.value) || 2)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm ${
                    !isRollerCountValid ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {!isRollerCountValid && (
                  <p className="mt-1 text-xs text-red-600">Min 2</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Roller Dia (in)
                </label>
                <input
                  type="number"
                  min={0.5}
                  step={0.1}
                  value={gravityRollerDia}
                  onChange={(e) => updateInput('return_gravity_roller_diameter_in', parseFloat(e.target.value) || 1.9)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Computed centers */}
            <div className="bg-blue-50 rounded-md p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-800">Computed centers:</span>
                <span className="text-sm font-mono font-semibold text-blue-900">
                  {gravityCenters !== null ? `${gravityCenters.toFixed(1)}"` : '—'}
                </span>
              </div>
              {isCentersTooLarge && (
                <p className="mt-1 text-xs text-yellow-700">
                  Large spacing ({'>'}72") may cause belt sag
                </p>
              )}
              {isCentersTooSmall && (
                <p className="mt-1 text-xs text-yellow-700">
                  Small spacing ({'<'}24") may be over-engineered
                </p>
              )}
            </div>
          </div>

          {/* Snub Roller Configuration (only if enabled) */}
          {snubsEnabled && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Snub Rollers (qty: 2)
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Snub Roller Diameter (in)
                </label>
                <input
                  type="number"
                  min={0.5}
                  step={0.1}
                  value={snubRollerDia}
                  onChange={(e) => updateInput('return_snub_roller_diameter_in', parseFloat(e.target.value) || 2.5)}
                  className="block w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Export helper functions for use elsewhere
export { computeSnubsEnabled, computeReturnSpan, computeGravityRollerCenters };

/**
 * Calculation Breakdown Component
 *
 * Shows live calculation breakdown as users configure their magnet bar.
 * Displays:
 * - Individual magnet contributions
 * - Total bar capacity
 * - Throughput calculations (when conveyor context provided)
 * - Formula references
 *
 * Usage:
 * <CalculationBreakdown
 *   ceramicCount={3}
 *   neoCount={2}
 *   barWidthIn={12}
 *   conveyorContext={{ qtyMagnets: 22, beltSpeedFpm: 30, ... }}
 * />
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  getCalculationBreakdown,
  formatNumber,
  getMarginStatusClass,
  getMarginStatusIcon,
  ConveyorContext,
} from '../../../src/models/magnetic_conveyor_v1/magnet-bar/calculation-display';
import { MagnetMaterialType } from '../../../src/models/magnetic_conveyor_v1/magnet-bar/schema';

// ============================================================================
// TYPES
// ============================================================================

export interface CalculationBreakdownProps {
  /** Number of ceramic magnets */
  ceramicCount: number;
  /** Number of neo magnets */
  neoCount: number;
  /** Bar width in inches */
  barWidthIn: number;
  /** Optional conveyor context for throughput */
  conveyorContext?: ConveyorContext;
  /** Initially expanded */
  defaultExpanded?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CalculationBreakdown({
  ceramicCount,
  neoCount,
  barWidthIn,
  conveyorContext,
  defaultExpanded = false,
}: CalculationBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showFormulas, setShowFormulas] = useState(false);

  // Calculate breakdown
  const breakdown = useMemo(
    () => getCalculationBreakdown(ceramicCount, neoCount, barWidthIn, conveyorContext),
    [ceramicCount, neoCount, barWidthIn, conveyorContext]
  );

  // Don't show if no magnets
  if (ceramicCount === 0 && neoCount === 0) {
    return null;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            Calculation Breakdown
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Bar: <span className="font-semibold text-green-600">{formatNumber(breakdown.barCapacity)} lb</span>
          </span>
          {breakdown.throughput && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getMarginStatusClass(
                breakdown.throughput.marginStatus
              )}`}
            >
              {formatNumber(breakdown.throughput.margin, 2)}× {getMarginStatusIcon(breakdown.throughput.marginStatus)}
            </span>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white">
          {/* Magnet Contributions */}
          <div className="border border-gray-100 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Magnet Contributions
              </span>
            </div>
            <div className="p-3 space-y-2">
              {breakdown.magnetContributions.map((contribution, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-sm ${
                        contribution.type === MagnetMaterialType.Ceramic
                          ? 'bg-blue-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="text-gray-600">
                      {contribution.name} × {contribution.count}
                    </span>
                  </div>
                  <span className="font-mono text-gray-800">
                    = {formatNumber(contribution.totalCapacity)} lb
                  </span>
                </div>
              ))}

              {/* Saturation factor (if applied) */}
              {breakdown.saturationFactor < 1.0 && (
                <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-100">
                  <span className="text-gray-500">
                    Saturation correction
                  </span>
                  <span className="font-mono text-orange-600">
                    × {formatNumber(breakdown.saturationFactor, 2)}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                <span className="font-medium text-gray-700">Bar Capacity</span>
                <span className="font-mono font-semibold text-green-600">
                  = {formatNumber(breakdown.barCapacity)} lb/bar
                </span>
              </div>
            </div>
          </div>

          {/* Conveyor Totals (if context provided) */}
          {conveyorContext && breakdown.totalBars > 0 && (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Conveyor Totals
                </span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Pattern</span>
                  <span className="text-gray-800">{breakdown.patternMode}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Bars</span>
                  <span className="font-mono text-gray-800">{breakdown.totalBars}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-100">
                  <span className="font-medium text-gray-700">Total Capacity</span>
                  <span className="font-mono font-semibold text-gray-800">
                    {formatNumber(breakdown.totalConveyorCapacity)} lb
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Throughput (if context provided) */}
          {breakdown.throughput && (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Throughput
                </span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Chip Load on Bed</span>
                  <span className="font-mono text-gray-800">
                    {formatNumber(breakdown.throughput.chipLoad)} lb
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Achieved</span>
                  <span className="font-mono text-gray-800">
                    {formatNumber(breakdown.throughput.achievedThroughput, 0)} lb/hr
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Required</span>
                  <span className="font-mono text-gray-800">
                    {formatNumber(breakdown.throughput.requiredThroughput, 0)} lb/hr
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="font-medium text-gray-700">Margin</span>
                  <span
                    className={`px-2 py-0.5 rounded font-mono font-semibold ${getMarginStatusClass(
                      breakdown.throughput.marginStatus
                    )}`}
                  >
                    {formatNumber(breakdown.throughput.margin, 2)}× {getMarginStatusIcon(breakdown.throughput.marginStatus)}
                  </span>
                </div>

                {/* Margin interpretation */}
                <div className="text-xs text-gray-500 pt-1">
                  {breakdown.throughput.marginStatus === 'good' && (
                    <span className="text-green-600">Healthy margin for reliable operation</span>
                  )}
                  {breakdown.throughput.marginStatus === 'warning' && (
                    <span className="text-yellow-600">Consider Neo upgrade for more headroom</span>
                  )}
                  {breakdown.throughput.marginStatus === 'insufficient' && (
                    <span className="text-red-600">Undersized - add Neo magnets or increase speed</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Formula toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowFormulas(!showFormulas)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showFormulas ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              {showFormulas ? 'Hide Formulas' : 'Show Formulas'}
            </button>

            {showFormulas && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg space-y-1.5 font-mono text-xs text-gray-600">
                <div>{breakdown.formulas.barCapacity}</div>
                <div>{breakdown.formulas.chipLoad}</div>
                <div>{breakdown.formulas.achievedThroughput}</div>
                <div>{breakdown.formulas.margin}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CalculationBreakdown;

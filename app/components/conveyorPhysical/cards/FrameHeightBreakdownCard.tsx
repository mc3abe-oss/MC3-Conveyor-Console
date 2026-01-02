/**
 * Frame Height Breakdown Card
 *
 * Read-only display of calculated frame height breakdown.
 * Shows required vs reference heights with component breakdown.
 *
 * Extracted from TabConveyorPhysical.tsx (v1.41)
 */

'use client';

import { FrameHeightMode } from '../../../../src/models/sliderbed_v1/schema';

interface FrameHeightBreakdown {
  largest_pulley_in: number;
  cleat_height_in: number;
  cleat_adder_in: number;
  return_roller_in: number;
  clearance_in: number;
  required_total_in: number;
  reference_total_in: number;
  formula: string;
}

interface FrameHeightBreakdownCardProps {
  /** Calculated frame height breakdown */
  frameHeightBreakdown: FrameHeightBreakdown;
  /** Required frame height (physical envelope) */
  requiredFrameHeight: number;
  /** Reference frame height (based on mode) */
  referenceFrameHeight: number;
  /** Current frame height mode */
  frameHeightMode: FrameHeightMode | string | undefined;
}

export default function FrameHeightBreakdownCard({
  frameHeightBreakdown,
  requiredFrameHeight,
  referenceFrameHeight,
  frameHeightMode,
}: FrameHeightBreakdownCardProps) {
  return (
    <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Frame Height Breakdown
      </h4>
      {/* Frame Height Display - v1.34: Two heights */}
      <div className="space-y-2 text-sm">
        {/* Required vs Reference Heights */}
        <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-2">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">Required</div>
            <div className="font-bold text-gray-900 text-lg">{requiredFrameHeight.toFixed(2)}"</div>
            <div className="text-xs text-gray-400">(Physical envelope)</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase">Reference</div>
            <div className="font-bold text-blue-600 text-lg">{referenceFrameHeight.toFixed(2)}"</div>
            <div className="text-xs text-gray-400">({frameHeightMode ?? 'Standard'})</div>
          </div>
        </div>

        {/* Breakdown components */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex justify-between">
            <span className="text-gray-500">Largest Pulley OD:</span>
            <span className="font-medium text-gray-700">{frameHeightBreakdown.largest_pulley_in.toFixed(2)}"</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Cleats (2×):</span>
            <span className="font-medium text-gray-700">
              {frameHeightBreakdown.cleat_adder_in > 0
                ? `${frameHeightBreakdown.cleat_adder_in.toFixed(2)}" (${frameHeightBreakdown.cleat_height_in.toFixed(2)}"×2)`
                : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Return Roller:</span>
            <span className="font-medium text-gray-700">{frameHeightBreakdown.return_roller_in.toFixed(2)}"</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Clearance:</span>
            <span className="font-medium text-gray-700">+{frameHeightBreakdown.clearance_in.toFixed(2)}"</span>
          </div>
        </div>

        {frameHeightMode === FrameHeightMode.Custom && (
          <p className="text-xs text-gray-500">Using custom frame height override.</p>
        )}

        {/* Formula display */}
        <p className="text-xs text-gray-400 font-mono pt-1 border-t border-gray-200 mt-2">
          {frameHeightBreakdown.formula}
        </p>

        {/* v1.34: Disclaimer */}
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
          <strong>Note:</strong> Frame height shown is reference only. Final design must follow MC3 Mechanical Design Standards.
        </p>
      </div>
    </div>
  );
}

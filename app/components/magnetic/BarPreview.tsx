/**
 * Bar Preview Component
 *
 * Visual representation of a magnet bar configuration.
 * Shows magnets as colored blocks with gaps between them.
 *
 * Usage:
 * <BarPreview
 *   targetOal={12}
 *   slots={[{ magnetId: 'ceramic-3.5', length: 3.5, type: 'ceramic' }, ...]}
 *   gap={0.25}
 *   capacity={0.717}
 * />
 */

'use client';

import React, { useMemo } from 'react';
import { MagnetMaterialType } from '../../../src/models/magnetic_conveyor_v1/magnet-bar/schema';

// ============================================================================
// TYPES
// ============================================================================

export interface BarSlotDisplay {
  /** Unique identifier for the slot */
  id: string;
  /** Magnet ID reference */
  magnetId: string;
  /** Magnet name for display */
  name: string;
  /** Length in inches */
  length: number;
  /** Material type */
  type: MagnetMaterialType;
  /** Capacity contribution (lbs) */
  capacity: number;
}

export interface BarPreviewProps {
  /** Target overall length in inches */
  targetOal: number;
  /** Slots to display */
  slots: BarSlotDisplay[];
  /** Gap between magnets in inches */
  gap: number;
  /** Total capacity in lbs/bar */
  capacity: number;
  /** Achieved OAL (computed from slots) */
  achievedOal?: number;
  /** Whether to show detailed labels */
  showLabels?: boolean;
  /** Click handler for individual slots */
  onSlotClick?: (slotId: string) => void;
  /** Selected slot ID for highlighting */
  selectedSlotId?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  ceramic: {
    bg: 'bg-blue-500',
    hover: 'hover:bg-blue-600',
    border: 'border-blue-600',
    text: 'text-blue-700',
    label: 'Ceramic',
  },
  neo: {
    bg: 'bg-red-500',
    hover: 'hover:bg-red-600',
    border: 'border-red-600',
    text: 'text-red-700',
    label: 'Neo',
  },
} as const;

const BAR_HEIGHT = 48; // px
const MIN_MAGNET_WIDTH_PX = 24; // Minimum width for clickable magnets

// ============================================================================
// COMPONENT
// ============================================================================

export function BarPreview({
  targetOal,
  slots,
  gap,
  capacity,
  achievedOal,
  showLabels = true,
  onSlotClick,
  selectedSlotId,
}: BarPreviewProps) {
  // Calculate achieved OAL if not provided
  const computedOal = useMemo(() => {
    if (achievedOal !== undefined) return achievedOal;
    if (slots.length === 0) return 0;

    const totalMagnetLength = slots.reduce((sum, s) => sum + s.length, 0);
    const totalGapLength = Math.max(0, slots.length - 1) * gap;
    return totalMagnetLength + totalGapLength;
  }, [slots, gap, achievedOal]);

  const remaining = targetOal - computedOal;
  const isOverfill = remaining < 0;
  const isValid = remaining >= 0 && remaining <= 0.5; // Within 0.5" tolerance

  // Calculate scale factor (pixels per inch)
  const containerWidth = 600; // Base container width in pixels
  const scale = containerWidth / targetOal;

  // Count magnets by type
  const magnetCounts = useMemo(() => {
    const counts = { ceramic: 0, neo: 0 };
    for (const slot of slots) {
      if (slot.type === MagnetMaterialType.Ceramic) {
        counts.ceramic++;
      } else if (slot.type === MagnetMaterialType.Neo) {
        counts.neo++;
      }
    }
    return counts;
  }, [slots]);

  return (
    <div className="w-full">
      {/* Bar visualization */}
      <div className="relative w-full" style={{ maxWidth: containerWidth }}>
        {/* Target OAL background */}
        <div
          className="relative bg-gray-100 border-2 border-gray-300 rounded"
          style={{ height: BAR_HEIGHT }}
        >
          {/* Magnets and gaps */}
          <div className="absolute inset-0 flex items-center px-0.5">
            {slots.map((slot, index) => {
              const magnetWidth = Math.max(slot.length * scale, MIN_MAGNET_WIDTH_PX);
              const gapWidth = index < slots.length - 1 ? gap * scale : 0;
              const colors = COLORS[slot.type];
              const isSelected = selectedSlotId === slot.id;

              return (
                <React.Fragment key={slot.id}>
                  {/* Magnet block */}
                  <button
                    type="button"
                    onClick={() => onSlotClick?.(slot.id)}
                    className={`
                      relative flex items-center justify-center
                      ${colors.bg} ${colors.hover}
                      border ${colors.border}
                      rounded-sm
                      text-white text-xs font-medium
                      transition-all duration-150
                      ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
                      ${onSlotClick ? 'cursor-pointer' : 'cursor-default'}
                    `}
                    style={{
                      width: magnetWidth,
                      height: BAR_HEIGHT - 8,
                    }}
                    title={`${slot.name} (${slot.length}" × ${slot.capacity.toFixed(3)} lb)`}
                  >
                    {magnetWidth > 40 && (
                      <span className="truncate px-1">
                        {slot.length}&quot;
                      </span>
                    )}
                  </button>

                  {/* Gap spacer */}
                  {gapWidth > 0 && (
                    <div
                      className="bg-gray-300 rounded-sm mx-0.5"
                      style={{
                        width: Math.max(gapWidth - 4, 2),
                        height: BAR_HEIGHT - 16,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {/* Remaining space indicator */}
            {remaining > 0 && (
              <div
                className={`
                  flex items-center justify-center
                  ${isValid ? 'bg-green-100 border-green-300' : 'bg-yellow-100 border-yellow-300'}
                  border border-dashed rounded-sm ml-1
                  text-xs text-gray-500
                `}
                style={{
                  width: remaining * scale,
                  height: BAR_HEIGHT - 16,
                  minWidth: 20,
                }}
              >
                {remaining >= 0.5 && `+${remaining.toFixed(2)}"`}
              </div>
            )}
          </div>

          {/* OAL dimension line */}
          <div className="absolute -bottom-6 left-0 right-0 flex items-center justify-center">
            <div className="flex items-center text-xs text-gray-500">
              <div className="w-1 h-3 border-l border-gray-400" />
              <div className="flex-1 border-t border-gray-400 mx-1" style={{ minWidth: 40 }} />
              <span className="px-1 bg-white">{targetOal}&quot; OAL</span>
              <div className="flex-1 border-t border-gray-400 mx-1" style={{ minWidth: 40 }} />
              <div className="w-1 h-3 border-r border-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {showLabels && (
        <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
          {/* Achieved OAL */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Achieved:</span>
            <span className={`font-medium ${isOverfill ? 'text-red-600' : 'text-gray-900'}`}>
              {computedOal.toFixed(2)}&quot;
            </span>
          </div>

          {/* Remaining */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Remaining:</span>
            <span
              className={`font-medium ${
                isOverfill
                  ? 'text-red-600'
                  : isValid
                  ? 'text-green-600'
                  : 'text-yellow-600'
              }`}
            >
              {remaining.toFixed(2)}&quot;
            </span>
          </div>

          {/* Capacity */}
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Capacity:</span>
            <span className="font-medium text-gray-900">
              {capacity.toFixed(3)} lb/bar
            </span>
          </div>

          {/* Magnet counts */}
          <div className="flex items-center gap-3 ml-auto">
            {magnetCounts.ceramic > 0 && (
              <span className={`flex items-center gap-1 ${COLORS.ceramic.text}`}>
                <span className={`w-3 h-3 rounded-sm ${COLORS.ceramic.bg}`} />
                {magnetCounts.ceramic} Ceramic
              </span>
            )}
            {magnetCounts.neo > 0 && (
              <span className={`flex items-center gap-1 ${COLORS.neo.text}`}>
                <span className={`w-3 h-3 rounded-sm ${COLORS.neo.bg}`} />
                {magnetCounts.neo} Neo
              </span>
            )}
          </div>
        </div>
      )}

      {/* Validation message */}
      {isOverfill && (
        <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Bar overfill: magnets exceed target OAL by {Math.abs(remaining).toFixed(2)}&quot;
        </div>
      )}
    </div>
  );
}

export default BarPreview;

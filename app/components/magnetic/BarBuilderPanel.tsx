/**
 * Bar Builder Panel Component
 *
 * Visual bar configuration interface for magnetic conveyor calculator.
 * Allows users to build bar templates by adding/removing magnets.
 *
 * Features:
 * - Visual bar representation with magnets and gaps
 * - Real-time capacity calculation
 * - Magnet selector with family filtering
 * - Remove/reorder magnets
 *
 * Usage:
 * <BarBuilderPanel
 *   targetOal={12}
 *   familyCrossSection="1.00x1.38"
 *   onCapacityChange={(capacity) => updateCalculator(capacity)}
 * />
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  MagnetMaterialType,
  MagnetCatalogItem,
  getMagnetRemovalCapacity,
  SUPPORTED_OAL_VALUES_IN,
} from '../../../src/models/magnetic_conveyor_v1/magnet-bar/schema';
import {
  calculateBarCapacityFromCounts,
  computeMagnetFit,
} from '../../../src/models/magnetic_conveyor_v1/magnet-bar/bar-builder';
import {
  CERAMIC_5_3_5,
  CERAMIC_5_2_5,
  NEO_35_2_0,
  DEFAULT_GAP_IN,
} from '../../../src/models/magnetic_conveyor_v1/magnet-bar/seed-data';
import { BarPreview, BarSlotDisplay } from './BarPreview';
import { MagnetSelector } from './MagnetSelector';
import { CalculationBreakdown } from './CalculationBreakdown';
import { ConveyorContext } from '../../../src/models/magnetic_conveyor_v1/magnet-bar/calculation-display';

// ============================================================================
// TYPES
// ============================================================================

export interface BarBuilderPanelProps {
  /** Target overall length in inches */
  targetOal: number;
  /** Family cross-section key (e.g., "1.00x1.38") */
  familyCrossSection?: string;
  /** Callback when capacity changes */
  onCapacityChange?: (capacity: number) => void;
  /** Callback when configuration changes */
  onConfigChange?: (config: BarConfiguration) => void;
  /** Initial configuration */
  initialConfig?: BarConfiguration;
  /** Whether the panel is read-only */
  readOnly?: boolean;
  /** Conveyor context for throughput calculations */
  conveyorContext?: ConveyorContext;
  /** Show calculation breakdown section */
  showCalculations?: boolean;
}

export interface BarConfiguration {
  slots: BarSlotDisplay[];
  capacity: number;
  achievedOal: number;
  ceramicCount: number;
  neoCount: number;
}

// ============================================================================
// MOCK CATALOG DATA
// Create full MagnetCatalogItem objects from seed data for local use
// ============================================================================

const createMagnetItem = (
  base: Omit<MagnetCatalogItem, 'id' | 'created_at' | 'updated_at'>,
  id: string
): MagnetCatalogItem => ({
  ...base,
  id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const DEFAULT_CATALOG: MagnetCatalogItem[] = [
  createMagnetItem(CERAMIC_5_3_5, 'ceramic-3.5'),
  createMagnetItem(CERAMIC_5_2_5, 'ceramic-2.5'),
  createMagnetItem(NEO_35_2_0, 'neo-2.0'),
];

// ============================================================================
// COMPONENT
// ============================================================================

export function BarBuilderPanel({
  targetOal,
  familyCrossSection = '1.00x1.38',
  onCapacityChange,
  onConfigChange,
  initialConfig,
  readOnly = false,
  conveyorContext,
  showCalculations = true,
}: BarBuilderPanelProps) {
  // State for bar slots
  const [slots, setSlots] = useState<BarSlotDisplay[]>(initialConfig?.slots ?? []);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [showQuickFill, setShowQuickFill] = useState(false);

  // Calculate derived values
  const computed = useMemo(() => {
    let achievedOal = 0;
    let capacity = 0;
    let ceramicCount = 0;
    let neoCount = 0;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      achievedOal += slot.length;
      if (i > 0) {
        achievedOal += DEFAULT_GAP_IN;
      }
      capacity += slot.capacity;

      if (slot.type === MagnetMaterialType.Ceramic) {
        ceramicCount++;
      } else {
        neoCount++;
      }
    }

    // Apply saturation correction for capacity
    const correctedCapacity = calculateBarCapacityFromCounts(
      ceramicCount,
      neoCount,
      targetOal
    );

    return {
      achievedOal,
      rawCapacity: capacity,
      capacity: correctedCapacity,
      ceramicCount,
      neoCount,
      remaining: targetOal - achievedOal,
    };
  }, [slots, targetOal]);

  // Notify parent of changes
  useEffect(() => {
    onCapacityChange?.(computed.capacity);
    onConfigChange?.({
      slots,
      capacity: computed.capacity,
      achievedOal: computed.achievedOal,
      ceramicCount: computed.ceramicCount,
      neoCount: computed.neoCount,
    });
  }, [computed, slots, onCapacityChange, onConfigChange]);

  // Add magnet to bar
  const addMagnet = useCallback((magnet: MagnetCatalogItem) => {
    const newSlot: BarSlotDisplay = {
      id: `slot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      magnetId: magnet.id,
      name: magnet.name,
      length: magnet.length_in,
      type: magnet.material_type,
      capacity: getMagnetRemovalCapacity(magnet),
    };

    setSlots((prev) => [...prev, newSlot]);
  }, []);

  // Remove magnet from bar
  const removeSlot = useCallback((slotId: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
    if (selectedSlotId === slotId) {
      setSelectedSlotId(null);
    }
  }, [selectedSlotId]);

  // Clear all slots
  const clearAll = useCallback(() => {
    setSlots([]);
    setSelectedSlotId(null);
  }, []);

  // Quick fill with optimal ceramic configuration
  const quickFillCeramic = useCallback(() => {
    const ceramic = DEFAULT_CATALOG.find((m) => m.id === 'ceramic-3.5');
    if (!ceramic) return;

    const fit = computeMagnetFit(targetOal, ceramic.length_in, DEFAULT_GAP_IN);
    const newSlots: BarSlotDisplay[] = [];

    for (let i = 0; i < fit.count; i++) {
      newSlots.push({
        id: `slot-${Date.now()}-${i}`,
        magnetId: ceramic.id,
        name: ceramic.name,
        length: ceramic.length_in,
        type: ceramic.material_type,
        capacity: getMagnetRemovalCapacity(ceramic),
      });
    }

    setSlots(newSlots);
  }, [targetOal]);

  // Quick fill with ceramic + 1 Neo
  const quickFillWithNeo = useCallback((neoCount: number) => {
    const ceramic = DEFAULT_CATALOG.find((m) => m.id === 'ceramic-3.5');
    const neo = DEFAULT_CATALOG.find((m) => m.id === 'neo-2.0');
    if (!ceramic || !neo) return;

    // Calculate optimal mix
    const ceramicFit = computeMagnetFit(targetOal, ceramic.length_in, DEFAULT_GAP_IN);
    const ceramicCount = Math.max(0, ceramicFit.count - neoCount);

    const newSlots: BarSlotDisplay[] = [];

    // Add ceramics first
    for (let i = 0; i < ceramicCount; i++) {
      newSlots.push({
        id: `slot-${Date.now()}-c${i}`,
        magnetId: ceramic.id,
        name: ceramic.name,
        length: ceramic.length_in,
        type: ceramic.material_type,
        capacity: getMagnetRemovalCapacity(ceramic),
      });
    }

    // Add neos
    for (let i = 0; i < neoCount; i++) {
      newSlots.push({
        id: `slot-${Date.now()}-n${i}`,
        magnetId: neo.id,
        name: neo.name,
        length: neo.length_in,
        type: neo.material_type,
        capacity: getMagnetRemovalCapacity(neo),
      });
    }

    setSlots(newSlots);
  }, [targetOal]);

  // Handle slot click (for selection/removal)
  const handleSlotClick = useCallback((slotId: string) => {
    if (readOnly) return;

    if (selectedSlotId === slotId) {
      // Double-click or re-select to remove
      removeSlot(slotId);
    } else {
      setSelectedSlotId(slotId);
    }
  }, [selectedSlotId, removeSlot, readOnly]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#2E364E]">Bar Configuration</h3>
          <p className="text-xs text-gray-500">
            Target OAL: {targetOal}" | Cross-section: {familyCrossSection}
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            {/* Quick fill dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowQuickFill(!showQuickFill)}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
              >
                Quick Fill
              </button>

              {showQuickFill && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowQuickFill(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg">
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          quickFillCeramic();
                          setShowQuickFill(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Ceramic Only
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          quickFillWithNeo(1);
                          setShowQuickFill(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Ceramic + 1 Neo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          quickFillWithNeo(2);
                          setShowQuickFill(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        Ceramic + 2 Neo
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Clear button */}
            {slots.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bar Preview */}
      <BarPreview
        targetOal={targetOal}
        slots={slots}
        gap={DEFAULT_GAP_IN}
        capacity={computed.capacity}
        achievedOal={computed.achievedOal}
        onSlotClick={readOnly ? undefined : handleSlotClick}
        selectedSlotId={selectedSlotId ?? undefined}
      />

      {/* Selection hint */}
      {selectedSlotId && !readOnly && (
        <div className="text-xs text-gray-500 bg-yellow-50 px-3 py-2 rounded-md">
          Click the selected magnet again to remove it, or click another magnet to change selection.
        </div>
      )}

      {/* Magnet Selector */}
      {!readOnly && (
        <div className="pt-2 border-t border-gray-200">
          <MagnetSelector
            magnets={DEFAULT_CATALOG}
            familyCrossSection={familyCrossSection}
            onSelect={addMagnet}
            disabled={computed.remaining < 0}
          />
        </div>
      )}

      {/* Capacity summary */}
      <div className="pt-2 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-500">Magnets</div>
            <div className="text-lg font-semibold text-[#2E364E]">
              {slots.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Ceramic</div>
            <div className="text-lg font-semibold text-blue-600">
              {computed.ceramicCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Neo</div>
            <div className="text-lg font-semibold text-red-600">
              {computed.neoCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Capacity</div>
            <div className="text-lg font-semibold text-green-600">
              {computed.capacity.toFixed(3)} lb
            </div>
          </div>
        </div>
      </div>

      {/* Calculation Breakdown */}
      {showCalculations && (computed.ceramicCount > 0 || computed.neoCount > 0) && (
        <div className="pt-2">
          <CalculationBreakdown
            ceramicCount={computed.ceramicCount}
            neoCount={computed.neoCount}
            barWidthIn={targetOal}
            conveyorContext={conveyorContext}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STANDALONE OAL SELECTOR
// ============================================================================

export interface OalSelectorProps {
  value: number;
  onChange: (oal: number) => void;
  disabled?: boolean;
}

export function OalSelector({ value, onChange, disabled }: OalSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Bar Width (OAL)
      </label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
      >
        {SUPPORTED_OAL_VALUES_IN.filter(oal => oal <= 24).map((oal) => (
          <option key={oal} value={oal}>
            {oal}"
          </option>
        ))}
      </select>
    </div>
  );
}

export default BarBuilderPanel;

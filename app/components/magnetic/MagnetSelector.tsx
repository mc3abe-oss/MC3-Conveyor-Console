/**
 * Magnet Selector Component
 *
 * Dropdown/button group to select magnets from the catalog.
 * Filters magnets by conveyor family (cross-section).
 *
 * Usage:
 * <MagnetSelector
 *   magnets={catalogItems}
 *   familyCrossSection="1.00x1.38"
 *   onSelect={(magnet) => addMagnetToBar(magnet)}
 * />
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  MagnetMaterialType,
  MagnetCatalogItem,
  MAGNET_MATERIAL_TYPE_LABELS,
} from '../../../src/models/magnetic_conveyor_v1/magnet-bar/schema';

// ============================================================================
// TYPES
// ============================================================================

export interface MagnetSelectorProps {
  /** Available magnets from catalog */
  magnets: MagnetCatalogItem[];
  /** Cross-section key to filter by (e.g., "1.00x1.38") */
  familyCrossSection?: string;
  /** Callback when magnet is selected */
  onSelect: (magnet: MagnetCatalogItem) => void;
  /** Whether selector is disabled */
  disabled?: boolean;
  /** Label text */
  label?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MATERIAL_COLORS = {
  [MagnetMaterialType.Ceramic]: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-100 hover:border-blue-300',
    badge: 'bg-blue-500',
  },
  [MagnetMaterialType.Neo]: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    hover: 'hover:bg-red-100 hover:border-red-300',
    badge: 'bg-red-500',
  },
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function MagnetSelector({
  magnets,
  familyCrossSection,
  onSelect,
  disabled = false,
  label = 'Add Magnet',
}: MagnetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [materialFilter, setMaterialFilter] = useState<MagnetMaterialType | 'all'>('all');

  // Filter magnets by family cross-section and active status
  const filteredMagnets = useMemo(() => {
    let filtered = magnets.filter((m) => m.is_active);

    // Filter by cross-section if provided
    if (familyCrossSection) {
      filtered = filtered.filter((m) => m.cross_section_key === familyCrossSection);
    }

    // Filter by material type
    if (materialFilter !== 'all') {
      filtered = filtered.filter((m) => m.material_type === materialFilter);
    }

    // Sort by material type then length
    return filtered.sort((a, b) => {
      if (a.material_type !== b.material_type) {
        return a.material_type === MagnetMaterialType.Ceramic ? -1 : 1;
      }
      return a.length_in - b.length_in;
    });
  }, [magnets, familyCrossSection, materialFilter]);

  const handleSelect = (magnet: MagnetCatalogItem) => {
    onSelect(magnet);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between
          px-3 py-2 text-sm
          bg-white border border-gray-300 rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
        `}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Magnet</span>
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute z-20 mt-1 w-full min-w-[300px] bg-white border border-gray-200 rounded-md shadow-lg">
            {/* Material filter tabs */}
            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => setMaterialFilter('all')}
                className={`
                  flex-1 px-3 py-2 text-sm font-medium
                  ${materialFilter === 'all'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setMaterialFilter(MagnetMaterialType.Ceramic)}
                className={`
                  flex-1 px-3 py-2 text-sm font-medium
                  ${materialFilter === MagnetMaterialType.Ceramic
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                Ceramic
              </button>
              <button
                type="button"
                onClick={() => setMaterialFilter(MagnetMaterialType.Neo)}
                className={`
                  flex-1 px-3 py-2 text-sm font-medium
                  ${materialFilter === MagnetMaterialType.Neo
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                Neo
              </button>
            </div>

            {/* Magnet list */}
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredMagnets.length === 0 ? (
                <div className="text-center py-4 text-sm text-gray-500">
                  No magnets available
                  {familyCrossSection && (
                    <div className="text-xs mt-1">
                      for cross-section {familyCrossSection}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredMagnets.map((magnet) => {
                    const colors = MATERIAL_COLORS[magnet.material_type];
                    return (
                      <button
                        key={magnet.id}
                        type="button"
                        onClick={() => handleSelect(magnet)}
                        className={`
                          w-full flex items-center gap-3 p-2 rounded-md
                          ${colors.bg} ${colors.border} border
                          ${colors.hover}
                          transition-colors
                        `}
                      >
                        {/* Material badge */}
                        <span
                          className={`
                            w-2 h-8 rounded-sm flex-shrink-0
                            ${colors.badge}
                          `}
                        />

                        {/* Magnet info */}
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm text-gray-900">
                            {magnet.name}
                          </div>
                          <div className="text-xs text-gray-500 flex gap-2">
                            <span>{magnet.length_in}"</span>
                            <span>|</span>
                            <span>{MAGNET_MATERIAL_TYPE_LABELS[magnet.material_type]}</span>
                            <span>|</span>
                            <span>Grade {magnet.grade}</span>
                          </div>
                        </div>

                        {/* Capacity */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-medium text-gray-900">
                            {(magnet.hold_force_proxy_lb * magnet.efficiency_factor).toFixed(3)}
                          </div>
                          <div className="text-xs text-gray-500">lb</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Help text */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
              Click a magnet to add it to the bar
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MagnetSelector;

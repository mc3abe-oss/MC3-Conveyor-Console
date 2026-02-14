/**
 * BeltSelect Component
 *
 * A select dropdown for choosing a belt from the belt catalog.
 * Displays belt name and key properties, and provides the selected belt's
 * PIW/PIL values and minimum pulley diameter constraints.
 */

'use client';

import { useBeltCatalog } from '../hooks/useBeltCatalog';
import { BeltCatalogItem } from '../api/belts/route';
import { getEffectiveMinPulleyDiameters } from '../../src/lib/belt-catalog';

interface BeltSelectProps {
  value: string | undefined;
  onChange: (catalogKey: string | undefined, belt: BeltCatalogItem | undefined) => void;
  id: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  showDetails?: boolean;
}

export default function BeltSelect({
  value,
  onChange,
  id,
  className = 'input',
  required = false,
  disabled = false,
  showDetails = true,
}: BeltSelectProps) {
  const { belts, isLoading, error } = useBeltCatalog();

  const selectedBelt = value ? belts.find((b) => b.catalog_key === value) : undefined;

  const handleChange = (catalogKey: string) => {
    if (catalogKey === '') {
      onChange(undefined, undefined);
    } else {
      const belt = belts.find((b) => b.catalog_key === catalogKey);
      onChange(catalogKey, belt);
    }
  };

  if (error) {
    return (
      <div>
        <select id={id} className={className} disabled>
          <option>Error loading belts</option>
        </select>
        <p className="text-xs text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <select id={id} className={className} disabled>
        <option>Loading belts...</option>
      </select>
    );
  }

  if (belts.length === 0) {
    return (
      <div>
        <select id={id} className={className} disabled>
          <option>No belts available</option>
        </select>
        <p className="text-xs text-yellow-600 mt-1">
          Run the belt_catalog SQL migration to seed belt options.
        </p>
      </div>
    );
  }

  return (
    <div>
      <select
        id={id}
        className={className}
        value={value || ''}
        onChange={(e) => handleChange(e.target.value)}
        required={required}
        disabled={disabled}
      >
        <option value="">Select a belt...</option>
        {belts.map((belt) => (
          <option key={belt.catalog_key} value={belt.catalog_key}>
            {belt.display_name} ({belt.material})
          </option>
        ))}
      </select>

      {/* Belt details summary */}
      {showDetails && selectedBelt && (() => {
        const effectiveMin = getEffectiveMinPulleyDiameters(selectedBelt);
        const hasProfile = effectiveMin.source === 'material_profile';

        return (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>PIW:</span>
              <span className="font-mono">{selectedBelt.piw} lb/in</span>
            </div>
            <div className="flex justify-between">
              <span>PIL:</span>
              <span className="font-mono">{selectedBelt.pil} lb/in</span>
            </div>
            <div className="flex justify-between">
              <span>Min Pulley (no V-guide):</span>
              <span className="font-mono">
                {effectiveMin.noVguide}&quot;
                {hasProfile && (
                  <span className="ml-1 text-blue-600" title="From material profile">*</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Min Pulley (V-guided):</span>
              <span className="font-mono">
                {effectiveMin.withVguide}&quot;
                {hasProfile && (
                  <span className="ml-1 text-blue-600" title="From material profile">*</span>
                )}
              </span>
            </div>
            {hasProfile && (
              <div className="text-blue-600 text-[10px] mt-1">
                * From material profile ({selectedBelt.material_profile?.material_family})
              </div>
            )}

            {/* v1.38: Temperature and oil compatibility info */}
            <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
              <div className="flex justify-between">
                <span>Temp range:</span>
                <span className="font-mono">
                  {selectedBelt.temp_min_f !== null && selectedBelt.temp_max_f !== null
                    ? `${selectedBelt.temp_min_f}°F – ${selectedBelt.temp_max_f}°F`
                    : selectedBelt.temp_min_f !== null
                      ? `Min ${selectedBelt.temp_min_f}°F`
                      : selectedBelt.temp_max_f !== null
                        ? `Max ${selectedBelt.temp_max_f}°F`
                        : <span className="text-amber-600 text-[10px]">Not set (admin)</span>}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Oil resistant:</span>
                <span className={selectedBelt.oil_resistant ? 'text-green-700' : 'text-gray-500'}>
                  {selectedBelt.oil_resistant ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            {/* Phase 3A: Banding info */}
            {effectiveMin.banding.supported && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-purple-700 font-medium">Head Tension Banding:</span>
                  <span className="text-purple-600 text-[10px] px-1.5 py-0.5 bg-purple-100 rounded">
                    Supported
                  </span>
                </div>
                {(effectiveMin.banding.minNoVguide !== undefined || effectiveMin.banding.minWithVguide !== undefined) && (
                  <div className="mt-1 text-purple-700">
                    {effectiveMin.banding.minNoVguide !== undefined && (
                      <div className="flex justify-between">
                        <span>With banding (no V-guide):</span>
                        <span className="font-mono">{effectiveMin.banding.minNoVguide}&quot;</span>
                      </div>
                    )}
                    {effectiveMin.banding.minWithVguide !== undefined && (
                      <div className="flex justify-between">
                        <span>With banding (V-guided):</span>
                        <span className="font-mono">{effectiveMin.banding.minWithVguide}&quot;</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-1 mt-1">
              {selectedBelt.food_grade && (
                <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                  Food Grade
                </span>
              )}
              {selectedBelt.cut_resistant && (
                <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                  Cut Resistant
                </span>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

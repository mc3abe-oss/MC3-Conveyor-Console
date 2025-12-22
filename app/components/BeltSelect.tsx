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
      {showDetails && selectedBelt && (
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
            <span className="font-mono">{selectedBelt.min_pulley_dia_no_vguide_in}"</span>
          </div>
          <div className="flex justify-between">
            <span>Min Pulley (V-guided):</span>
            <span className="font-mono">{selectedBelt.min_pulley_dia_with_vguide_in}"</span>
          </div>
          {selectedBelt.food_grade && (
            <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs">
              Food Grade
            </span>
          )}
          {selectedBelt.cut_resistant && (
            <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs ml-1">
              Cut Resistant
            </span>
          )}
        </div>
      )}
    </div>
  );
}

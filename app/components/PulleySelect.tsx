/**
 * PulleySelect Component (v1.15)
 *
 * A select dropdown for choosing a pulley from the pulley catalog.
 * Filters pulleys by station compatibility:
 * - head_drive: only pulleys with allow_head_drive=true
 * - tail: only pulleys with allow_tail=true
 *
 * CRITICAL: Internal bearing pulleys are TAIL ONLY.
 * When station='head_drive', internal bearing pulleys are hidden.
 */

'use client';

import { usePulleyCatalog } from '../hooks/usePulleyCatalog';
import {
  PulleyCatalogItem,
  PulleyStation,
  getEffectiveDiameter,
  isStationCompatible,
  hasInternalBearings,
  SHAFT_ARRANGEMENT_LABELS,
  PULLEY_CONSTRUCTION_LABELS,
} from '../../src/lib/pulley-catalog';

interface PulleySelectProps {
  value: string | undefined;
  onChange: (catalogKey: string | undefined, pulley: PulleyCatalogItem | undefined) => void;
  station: PulleyStation;
  id: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  showDetails?: boolean;
  /** Minimum face width required (for filtering) */
  faceWidthRequired?: number;
  /** Belt speed for B105.1 check */
  beltSpeedFpm?: number;
}

export default function PulleySelect({
  value,
  onChange,
  station,
  id,
  className = 'input',
  required = false,
  disabled = false,
  showDetails = true,
  faceWidthRequired,
  beltSpeedFpm,
}: PulleySelectProps) {
  const { pulleys, loading, error } = usePulleyCatalog();

  // Filter pulleys by station compatibility
  const compatiblePulleys = pulleys.filter((pulley) => {
    // Must be active and compatible with station
    if (!pulley.is_active) return false;
    if (!isStationCompatible(pulley, station)) return false;

    // CRITICAL: Internal bearings can ONLY be used at tail
    if (hasInternalBearings(pulley) && station !== 'tail') return false;

    // Filter by face width if specified
    if (faceWidthRequired !== undefined && pulley.face_width_max_in < faceWidthRequired) {
      return false;
    }

    return true;
  });

  const selectedPulley = value ? compatiblePulleys.find((p) => p.catalog_key === value) : undefined;

  const handleChange = (catalogKey: string) => {
    if (catalogKey === '') {
      onChange(undefined, undefined);
    } else {
      const pulley = compatiblePulleys.find((p) => p.catalog_key === catalogKey);
      onChange(catalogKey, pulley);
    }
  };

  if (error) {
    return (
      <div>
        <select id={id} className={className} disabled>
          <option>Error loading pulleys</option>
        </select>
        <p className="text-xs text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <select id={id} className={className} disabled>
        <option>Loading pulleys...</option>
      </select>
    );
  }

  if (compatiblePulleys.length === 0) {
    return (
      <div>
        <select id={id} className={className} disabled>
          <option>No compatible pulleys</option>
        </select>
        <p className="text-xs text-yellow-600 mt-1">
          No pulleys available for {station} position.
          {faceWidthRequired && ` Face width required: ${faceWidthRequired}"`}
        </p>
      </div>
    );
  }

  // Check for B105.1 speed limit warning
  const hasSpeedWarning =
    selectedPulley &&
    beltSpeedFpm !== undefined &&
    selectedPulley.max_belt_speed_fpm !== null &&
    beltSpeedFpm > selectedPulley.max_belt_speed_fpm;

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
        <option value="">Select a pulley...</option>
        {compatiblePulleys.map((pulley) => {
          const effectiveDia = getEffectiveDiameter(pulley);
          const isInternal = hasInternalBearings(pulley);
          return (
            <option key={pulley.catalog_key} value={pulley.catalog_key}>
              {pulley.display_name} ({effectiveDia}")
              {pulley.is_preferred && ' ★'}
              {isInternal && ' [Internal Bearings]'}
            </option>
          );
        })}
      </select>

      {/* Pulley details summary */}
      {showDetails && selectedPulley && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Diameter:</span>
            <span className="font-mono">{selectedPulley.diameter_in}"</span>
          </div>
          {selectedPulley.is_lagged && (
            <div className="flex justify-between">
              <span>Effective Diameter:</span>
              <span className="font-mono">{getEffectiveDiameter(selectedPulley)}"</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Face Width:</span>
            <span className="font-mono">
              {selectedPulley.face_width_min_in && `${selectedPulley.face_width_min_in}"-`}
              {selectedPulley.face_width_max_in}"
            </span>
          </div>
          <div className="flex justify-between">
            <span>Construction:</span>
            <span>{PULLEY_CONSTRUCTION_LABELS[selectedPulley.construction]}</span>
          </div>
          <div className="flex justify-between">
            <span>Shaft:</span>
            <span className="text-right">{SHAFT_ARRANGEMENT_LABELS[selectedPulley.shaft_arrangement]}</span>
          </div>
          {selectedPulley.is_lagged && (
            <div className="flex justify-between">
              <span>Lagging:</span>
              <span>
                {selectedPulley.lagging_type} ({selectedPulley.lagging_thickness_in}")
              </span>
            </div>
          )}
          {selectedPulley.max_belt_speed_fpm && (
            <div className="flex justify-between">
              <span>Max Speed (B105.1):</span>
              <span className={`font-mono ${hasSpeedWarning ? 'text-red-600 font-medium' : ''}`}>
                {selectedPulley.max_belt_speed_fpm} fpm
              </span>
            </div>
          )}

          {/* Tags & badges */}
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedPulley.is_preferred && (
              <span className="inline-block px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                Preferred
              </span>
            )}
            {hasInternalBearings(selectedPulley) && (
              <span className="inline-block px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded text-xs">
                Tail Only
              </span>
            )}
            {selectedPulley.crown_height_in > 0 && (
              <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                Crowned
              </span>
            )}
          </div>

          {/* Speed warning */}
          {hasSpeedWarning && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700 text-xs">
                <strong>Warning:</strong> Belt speed ({beltSpeedFpm} fpm) exceeds pulley limit (
                {selectedPulley.max_belt_speed_fpm} fpm per B105.1)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

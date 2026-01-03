/**
 * LegacyPulleyOverrideCard - Manual pulley diameter override controls
 * Extracted from TabConveyorPhysical.tsx (v1.41 slice 5)
 *
 * NOTE: The onDriveOverrideValueChange callback is implemented in the parent
 * because it sets TWO fields (drive_pulley_diameter_in + pulley_diameter_in).
 * This is cross-field logic that must remain in TabConveyorPhysical.
 */

'use client';

import { PULLEY_DIAMETER_PRESETS } from '../../../../src/models/sliderbed_v1/schema';

interface LegacyPulleyOverrideCardProps {
  driveOverride: boolean;
  tailOverride: boolean;
  manualDriveDia: number | undefined;
  manualTailDia: number | undefined;
  drivePulleyBelowMinimum: boolean;
  tailPulleyBelowMinimum: boolean;
  onDriveOverrideToggle: (checked: boolean) => void;
  onTailOverrideToggle: (checked: boolean) => void;
  /** Cross-field handler - sets drive_pulley_diameter_in AND pulley_diameter_in */
  onDriveOverrideValueChange: (value: number | undefined) => void;
  onTailOverrideValueChange: (value: number | undefined) => void;
}

export default function LegacyPulleyOverrideCard({
  driveOverride,
  tailOverride,
  manualDriveDia,
  manualTailDia,
  drivePulleyBelowMinimum,
  tailPulleyBelowMinimum,
  onDriveOverrideToggle,
  onTailOverrideToggle,
  onDriveOverrideValueChange,
  onTailOverrideValueChange,
}: LegacyPulleyOverrideCardProps) {
  return (
    <details className="mt-4">
      <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
        Legacy Manual Diameter Override
      </summary>
      <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-4">
        {/* Drive override */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={driveOverride}
              onChange={(e) => onDriveOverrideToggle(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Override drive pulley diameter</span>
          </label>
          {driveOverride && (
            <div className="mt-2 flex gap-2">
              <select
                className={`input flex-1 ${drivePulleyBelowMinimum ? 'border-red-500' : ''}`}
                value={manualDriveDia?.toString() || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  onDriveOverrideValueChange(value);
                }}
              >
                <option value="">Select...</option>
                {PULLEY_DIAMETER_PRESETS.map((size) => (
                  <option key={size} value={size.toString()}>{size}"</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {/* Tail override */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tailOverride}
              onChange={(e) => onTailOverrideToggle(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Override tail pulley diameter</span>
          </label>
          {tailOverride && (
            <div className="mt-2 flex gap-2">
              <select
                className={`input flex-1 ${tailPulleyBelowMinimum ? 'border-red-500' : ''}`}
                value={manualTailDia?.toString() || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseFloat(e.target.value) : undefined;
                  onTailOverrideValueChange(value);
                }}
              >
                <option value="">Select...</option>
                {PULLEY_DIAMETER_PRESETS.map((size) => (
                  <option key={size} value={size.toString()}>{size}"</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

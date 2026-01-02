/**
 * Shafts Card
 *
 * Compact card for shaft diameter display and inline editing.
 * Supports manual override mode and step-down configuration.
 *
 * Extracted from TabConveyorPhysical.tsx (v1.41)
 */

'use client';

import { useState } from 'react';
import {
  SliderbedInputs,
  SliderbedOutputs,
  ShaftDiameterMode,
} from '../../../../src/models/sliderbed_v1/schema';
import {
  CompactCard,
  CompactCardHeader,
  InlineSpecRow,
  EditButton,
} from '../../CompactCardLayouts';

interface ShaftsCardProps {
  inputs: SliderbedInputs;
  outputs?: SliderbedOutputs | null;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function ShaftsCard({
  inputs,
  outputs,
  updateInput,
}: ShaftsCardProps) {
  const [isShaftEditing, setIsShaftEditing] = useState(false);

  const isManualMode = inputs.shaft_diameter_mode === ShaftDiameterMode.Manual || inputs.shaft_diameter_mode === 'Manual';
  const hasOverrides = isManualMode && (inputs.drive_shaft_diameter_in !== undefined || inputs.tail_shaft_diameter_in !== undefined);

  // Get calculated values from outputs (if available)
  const calcDriveShaft = outputs?.drive_shaft_diameter_in;
  const calcTailShaft = outputs?.tail_shaft_diameter_in;

  // Display values: use overrides if in manual mode, otherwise calculated
  const displayDriveShaft = isManualMode && inputs.drive_shaft_diameter_in !== undefined
    ? inputs.drive_shaft_diameter_in
    : calcDriveShaft;
  const displayTailShaft = isManualMode && inputs.tail_shaft_diameter_in !== undefined
    ? inputs.tail_shaft_diameter_in
    : calcTailShaft;

  // Step-down helpers
  const driveHasStepdown = (inputs.drive_shaft_stepdown_left_len_in ?? 0) > 0 ||
    (inputs.drive_shaft_stepdown_right_len_in ?? 0) > 0;
  const tailHasStepdown = (inputs.tail_shaft_stepdown_left_len_in ?? 0) > 0 ||
    (inputs.tail_shaft_stepdown_right_len_in ?? 0) > 0;

  // Handlers
  const handleEdit = () => {
    setIsShaftEditing(true);
    if (!isManualMode) {
      updateInput('shaft_diameter_mode', ShaftDiameterMode.Manual);
    }
  };

  const handleRevert = () => {
    updateInput('shaft_diameter_mode', ShaftDiameterMode.Calculated);
    updateInput('drive_shaft_diameter_in', undefined);
    updateInput('tail_shaft_diameter_in', undefined);
    // Clear step-down values
    updateInput('drive_shaft_stepdown_to_dia_in', undefined);
    updateInput('drive_shaft_stepdown_left_len_in', undefined);
    updateInput('drive_shaft_stepdown_right_len_in', undefined);
    updateInput('tail_shaft_stepdown_to_dia_in', undefined);
    updateInput('tail_shaft_stepdown_left_len_in', undefined);
    updateInput('tail_shaft_stepdown_right_len_in', undefined);
    setIsShaftEditing(false);
  };

  const handleDone = () => {
    setIsShaftEditing(false);
  };

  // Validation warnings
  const driveStepdownWarnings: string[] = [];
  if (inputs.drive_shaft_stepdown_to_dia_in !== undefined && displayDriveShaft !== undefined &&
      inputs.drive_shaft_stepdown_to_dia_in > displayDriveShaft) {
    driveStepdownWarnings.push('Step-down diameter exceeds base diameter');
  }
  if (driveHasStepdown && inputs.drive_shaft_stepdown_to_dia_in === undefined) {
    driveStepdownWarnings.push('Step-down lengths set but diameter not specified');
  }
  if (inputs.drive_shaft_stepdown_to_dia_in !== undefined && !driveHasStepdown) {
    driveStepdownWarnings.push('Step-down diameter set but no lengths specified');
  }

  const tailStepdownWarnings: string[] = [];
  if (inputs.tail_shaft_stepdown_to_dia_in !== undefined && displayTailShaft !== undefined &&
      inputs.tail_shaft_stepdown_to_dia_in > displayTailShaft) {
    tailStepdownWarnings.push('Step-down diameter exceeds base diameter');
  }
  if (tailHasStepdown && inputs.tail_shaft_stepdown_to_dia_in === undefined) {
    tailStepdownWarnings.push('Step-down lengths set but diameter not specified');
  }
  if (inputs.tail_shaft_stepdown_to_dia_in !== undefined && !tailHasStepdown) {
    tailStepdownWarnings.push('Step-down diameter set but no lengths specified');
  }

  return (
    <CompactCard configured>
      {/* Header */}
      <CompactCardHeader
        title="Shafts"
        badges={[{ label: isManualMode ? 'Override' : 'Configured', variant: 'success' }]}
        actions={
          <div className="flex items-center gap-2">
            {hasOverrides && (
              <button
                type="button"
                onClick={handleRevert}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Revert
              </button>
            )}
            {!isShaftEditing ? (
              <EditButton onClick={handleEdit} configured label="Edit" />
            ) : (
              <button
                type="button"
                onClick={handleDone}
                className="px-2.5 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors"
              >
                Done
              </button>
            )}
          </div>
        }
      />

      {/* Read-only summary (when not editing) */}
      {!isShaftEditing && (
        <div className="space-y-1">
          <InlineSpecRow
            items={[
              {
                label: 'Drive',
                value: (
                  <>
                    {displayDriveShaft !== undefined ? `${displayDriveShaft.toFixed(3)}"` : '—'}
                    {isManualMode && inputs.drive_shaft_diameter_in !== undefined && (
                      <span className="text-xs text-amber-600 ml-1">(override)</span>
                    )}
                    {driveHasStepdown && (
                      <span className="text-xs text-blue-600 ml-1">
                        → {inputs.drive_shaft_stepdown_to_dia_in ?? '?'}"
                      </span>
                    )}
                  </>
                ),
              },
              {
                label: 'Tail',
                value: (
                  <>
                    {displayTailShaft !== undefined ? `${displayTailShaft.toFixed(3)}"` : '—'}
                    {isManualMode && inputs.tail_shaft_diameter_in !== undefined && (
                      <span className="text-xs text-amber-600 ml-1">(override)</span>
                    )}
                    {tailHasStepdown && (
                      <span className="text-xs text-blue-600 ml-1">
                        → {inputs.tail_shaft_stepdown_to_dia_in ?? '?'}"
                      </span>
                    )}
                  </>
                ),
              },
            ]}
          />
          {!outputs && (
            <p className="text-xs text-gray-500 italic">Calculate to see computed values</p>
          )}
        </div>
      )}

      {/* Edit mode (inline) */}
      {isShaftEditing && (
        <div className="space-y-4">
          {/* Drive Shaft Section */}
          <div className="border-b border-green-200 pb-4">
            <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Drive Shaft</h6>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Base Diameter (in)</label>
                <input
                  type="number"
                  className="input text-sm"
                  value={inputs.drive_shaft_diameter_in ?? ''}
                  onChange={(e) =>
                    updateInput('drive_shaft_diameter_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder={calcDriveShaft !== undefined ? `Calc: ${calcDriveShaft.toFixed(3)}` : '—'}
                  step="0.125"
                  min="0.5"
                  max="4.0"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Step-Down To Dia (in)</label>
                <input
                  type="number"
                  className="input text-sm"
                  value={inputs.drive_shaft_stepdown_to_dia_in ?? ''}
                  onChange={(e) =>
                    updateInput('drive_shaft_stepdown_to_dia_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder="Optional"
                  step="0.125"
                  min="0.25"
                  max="3.0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Left Step-Down Length (in)</label>
                <input
                  type="number"
                  className="input text-sm"
                  value={inputs.drive_shaft_stepdown_left_len_in ?? ''}
                  onChange={(e) =>
                    updateInput('drive_shaft_stepdown_left_len_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder="0"
                  step="0.25"
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Right Step-Down Length (in)</label>
                <input
                  type="number"
                  className="input text-sm"
                  value={inputs.drive_shaft_stepdown_right_len_in ?? ''}
                  onChange={(e) =>
                    updateInput('drive_shaft_stepdown_right_len_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder="0"
                  step="0.25"
                  min="0"
                />
              </div>
            </div>
            {driveStepdownWarnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {driveStepdownWarnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600">{w}</p>
                ))}
              </div>
            )}
          </div>

          {/* Tail Shaft Section */}
          <div>
            <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Tail Shaft</h6>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Base Diameter (in)</label>
                <input
                  type="number"
                  className="input text-sm"
                  value={inputs.tail_shaft_diameter_in ?? ''}
                  onChange={(e) =>
                    updateInput('tail_shaft_diameter_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder={calcTailShaft !== undefined ? `Calc: ${calcTailShaft.toFixed(3)}` : '—'}
                  step="0.125"
                  min="0.5"
                  max="4.0"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">Step-Down To Dia (in)</label>
                <input
                  type="number"
                  className="input text-sm"
                  value={inputs.tail_shaft_stepdown_to_dia_in ?? ''}
                  onChange={(e) =>
                    updateInput('tail_shaft_stepdown_to_dia_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder="Optional"
                  step="0.125"
                  min="0.25"
                  max="3.0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Left Step-Down Length (in)</label>
                <input
                  type="number"
                  className="input text-sm"
                  value={inputs.tail_shaft_stepdown_left_len_in ?? ''}
                  onChange={(e) =>
                    updateInput('tail_shaft_stepdown_left_len_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder="0"
                  step="0.25"
                  min="0"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Right Step-Down Length (in)</label>
                <input
                  type="number"
                  className="input text-sm"
                  value={inputs.tail_shaft_stepdown_right_len_in ?? ''}
                  onChange={(e) =>
                    updateInput('tail_shaft_stepdown_right_len_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder="0"
                  step="0.25"
                  min="0"
                />
              </div>
            </div>
            {tailStepdownWarnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {tailStepdownWarnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600">{w}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </CompactCard>
  );
}

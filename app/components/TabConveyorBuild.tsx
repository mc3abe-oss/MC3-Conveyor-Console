/**
 * Tab 2: Conveyor Design
 *
 * Core conveyor definition:
 * - Conveyor Geometry (length, width, pulley diameter, incline)
 * - Belt Selection (from belt catalog with PIW/PIL and min pulley constraints)
 * - Belt Tracking (V-guided vs crowned, shaft diameters)
 * - Drive & Electrical (RPM, speed, power feed, controls)
 * - Advanced Parameters (friction, safety factor, belt coefficients)
 *
 * Build options and deliverables have been moved to the Build Options tab.
 */

'use client';

import { useState } from 'react';
import {
  SliderbedInputs,
  BeltTrackingMethod,
  VGuideProfile,
  ShaftDiameterMode,
  PULLEY_DIAMETER_PRESETS,
  PulleyDiameterPreset,
  FrameHeightMode,
  EndSupportType,
  HeightInputMode,
  derivedLegsRequired,
  DriveLocation,
  GearmotorOrientation,
  GearmotorMountingStyle,
  DriveHand,
  SpeedMode,
  DirectionMode,
  PulleySurfaceType,
} from '../../src/models/sliderbed_v1/schema';
import {
  calculateEffectiveFrameHeight,
  calculateRequiresSnubRollers,
  calculateGravityRollerQuantity,
  calculateSnubRollerQuantity,
  GRAVITY_ROLLER_SPACING_IN,
  calculateDriveShaftRpm,
  calculateBeltSpeed,
} from '../../src/models/sliderbed_v1/formulas';
import { BedType } from '../../src/models/belt_conveyor_v1/schema';
import {
  calculateTrackingGuidance,
  getRiskLevelColor,
  TrackingRiskLevel,
} from '../../src/models/sliderbed_v1/tracking-guidance';
import CatalogSelect from './CatalogSelect';
import BeltSelect from './BeltSelect';
import { BeltCatalogItem } from '../api/belts/route';

interface TabConveyorBuildProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
}

export default function TabConveyorBuild({ inputs, updateInput }: TabConveyorBuildProps) {
  // State for collapsible advanced parameters section
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // Handle belt selection - updates multiple fields at once
  const handleBeltChange = (catalogKey: string | undefined, belt: BeltCatalogItem | undefined) => {
    updateInput('belt_catalog_key', catalogKey);
    if (belt) {
      updateInput('belt_piw', belt.piw);
      updateInput('belt_pil', belt.pil);
      updateInput('belt_min_pulley_dia_no_vguide_in', belt.min_pulley_dia_no_vguide_in);
      updateInput('belt_min_pulley_dia_with_vguide_in', belt.min_pulley_dia_with_vguide_in);
    } else {
      updateInput('belt_piw', undefined);
      updateInput('belt_pil', undefined);
      updateInput('belt_min_pulley_dia_no_vguide_in', undefined);
      updateInput('belt_min_pulley_dia_with_vguide_in', undefined);
    }
  };

  // v1.16: Catalog authority - when catalog selected, it's the source of truth
  const driveFromCatalog = Boolean(inputs.head_pulley_catalog_key);
  const tailFromCatalog = Boolean(inputs.tail_pulley_catalog_key);

  // v1.3: Get effective pulley diameters
  const drivePulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in ?? 4;
  const tailPulleyDia = inputs.tail_pulley_diameter_in ?? drivePulleyDia;

  // Check if pulley diameter is below belt minimum
  const isVGuided =
    inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
    inputs.belt_tracking_method === 'V-guided';
  const minPulleyDia = isVGuided
    ? inputs.belt_min_pulley_dia_with_vguide_in
    : inputs.belt_min_pulley_dia_no_vguide_in;
  const drivePulleyBelowMinimum =
    minPulleyDia !== undefined &&
    drivePulleyDia > 0 &&
    drivePulleyDia < minPulleyDia;
  const tailPulleyBelowMinimum =
    minPulleyDia !== undefined &&
    tailPulleyDia > 0 &&
    tailPulleyDia < minPulleyDia;

  // v1.5: Compute derived frame height and roller values for inline display
  const effectiveFrameHeight = calculateEffectiveFrameHeight(
    inputs.frame_height_mode ?? FrameHeightMode.Standard,
    drivePulleyDia,
    inputs.custom_frame_height_in
  );
  const requiresSnubRollers = calculateRequiresSnubRollers(
    effectiveFrameHeight,
    drivePulleyDia,
    tailPulleyDia
  );
  const snubRollerQty = calculateSnubRollerQuantity(requiresSnubRollers);
  const gravityRollerQty = calculateGravityRollerQuantity(
    inputs.conveyor_length_cc_in,
    requiresSnubRollers
  );

  // v1.3: Handle pulley preset selection
  const handleDrivePulleyPresetChange = (preset: string) => {
    if (preset === 'custom') {
      updateInput('drive_pulley_preset', 'custom');
    } else {
      const value = parseFloat(preset);
      updateInput('drive_pulley_preset', value as PulleyDiameterPreset);
      updateInput('drive_pulley_diameter_in', value);
      updateInput('pulley_diameter_in', value); // Keep legacy field in sync
    }
  };

  const handleTailPulleyPresetChange = (preset: string) => {
    if (preset === 'custom') {
      updateInput('tail_pulley_preset', 'custom');
    } else {
      const value = parseFloat(preset);
      updateInput('tail_pulley_preset', value as PulleyDiameterPreset);
      updateInput('tail_pulley_diameter_in', value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section: Bed Type */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Conveyor Type
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="bed_type" className="label">
              Bed Type
            </label>
            <select
              id="bed_type"
              className="input"
              value={(inputs as any).bed_type || BedType.SliderBed}
              onChange={(e) => updateInput('bed_type' as any, e.target.value)}
            >
              <option value={BedType.SliderBed}>Slider Bed</option>
              <option value={BedType.RollerBed}>Roller Bed</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Slider bed: Belt slides on flat plate (COF ~0.25). Roller bed: Belt rides on rollers (COF ~0.03).
            </p>
          </div>

          {/* Direction Mode */}
          <div>
            <label className="label">Direction Mode</label>
            <div className="flex gap-4">
              {Object.values(DirectionMode).map((option) => (
                <label key={option} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="direction_mode"
                    checked={inputs.direction_mode === option}
                    onChange={() => updateInput('direction_mode', option)}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Reversing affects pulleys, V-guides, and controls.
            </p>
          </div>

          {/* Start/Stop Application */}
          <div>
            <label className="label">Start/Stop Application</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="start_stop_application"
                  checked={inputs.start_stop_application === false}
                  onChange={() => updateInput('start_stop_application', false)}
                  className="mr-2"
                />
                No
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="start_stop_application"
                  checked={inputs.start_stop_application === true}
                  onChange={() => updateInput('start_stop_application', true)}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
          </div>

          {/* Cycle time - only show if start/stop = true */}
          {inputs.start_stop_application && (
            <div>
              <label htmlFor="cycle_time_seconds" className="label">
                Cycle Time (seconds)
              </label>
              <input
                type="number"
                id="cycle_time_seconds"
                className="input"
                value={inputs.cycle_time_seconds || ''}
                onChange={(e) =>
                  updateInput('cycle_time_seconds', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                step="0.1"
                min="0"
                required
              />
            </div>
          )}

          {/* Pulley Surface Type */}
          <div>
            <label htmlFor="pulley_surface_type" className="label">
              Pulley Surface Type
            </label>
            <select
              id="pulley_surface_type"
              className="input"
              value={inputs.pulley_surface_type}
              onChange={(e) => updateInput('pulley_surface_type', e.target.value)}
            >
              {Object.values(PulleySurfaceType).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section A: Conveyor geometry */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Conveyor Geometry
        </h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="conveyor_length_cc_in" className="label">
              Conveyor Length (C-C) (in)
            </label>
            <input
              type="number"
              id="conveyor_length_cc_in"
              className="input"
              value={inputs.conveyor_length_cc_in}
              onChange={(e) => updateInput('conveyor_length_cc_in', parseFloat(e.target.value) || 0)}
              step="1"
              min="0"
              required
            />
          </div>

          <div>
            <label htmlFor="belt_width_in" className="label">
              Belt Width (in)
            </label>
            <input
              type="number"
              id="belt_width_in"
              className="input"
              value={inputs.belt_width_in}
              onChange={(e) => updateInput('belt_width_in', parseFloat(e.target.value) || 0)}
              step="1"
              min="0"
              required
            />
          </div>

          {/* v1.3: Drive Pulley Diameter with presets */}
          <div>
            <label htmlFor="drive_pulley_preset" className="label">
              Drive Pulley Diameter (in)
              {driveFromCatalog && (
                <span className="ml-2 text-xs font-normal text-blue-600">
                  ({drivePulleyDia}" from catalog)
                </span>
              )}
            </label>
            {driveFromCatalog ? (
              <p className="text-xs text-gray-500 mt-1">
                Derived from selected drive pulley. Clear catalog selection to set manually.
              </p>
            ) : (
              <>
                <div className="flex gap-2">
                  <select
                    id="drive_pulley_preset"
                    className={`input flex-1 ${drivePulleyBelowMinimum ? 'border-red-500' : ''}`}
                    value={
                      inputs.drive_pulley_preset === 'custom'
                        ? 'custom'
                        : PULLEY_DIAMETER_PRESETS.includes(drivePulleyDia as any)
                        ? drivePulleyDia.toString()
                        : 'custom'
                    }
                    onChange={(e) => handleDrivePulleyPresetChange(e.target.value)}
                  >
                    {PULLEY_DIAMETER_PRESETS.map((size) => (
                      <option key={size} value={size.toString()}>
                        {size}"
                      </option>
                    ))}
                    <option value="custom">Custom...</option>
                  </select>
                  {(inputs.drive_pulley_preset === 'custom' ||
                    !PULLEY_DIAMETER_PRESETS.includes(drivePulleyDia as any)) && (
                    <input
                      type="number"
                      id="drive_pulley_diameter_in"
                      className={`input w-24 ${drivePulleyBelowMinimum ? 'border-red-500' : ''}`}
                      value={drivePulleyDia}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateInput('drive_pulley_diameter_in', value);
                        updateInput('pulley_diameter_in', value);
                      }}
                      step="0.1"
                      min="2.5"
                      max="12"
                      required
                    />
                  )}
                </div>
                {drivePulleyBelowMinimum && (
                  <p className="text-xs text-red-600 mt-1">
                    Drive pulley is below the belt minimum ({minPulleyDia}" for{' '}
                    {isVGuided ? 'V-guided' : 'crowned'} tracking).
                  </p>
                )}
              </>
            )}
          </div>

          {/* v1.16: Tail Pulley Diameter (always visible) */}
          <div>
            <label htmlFor="tail_pulley_preset" className="label">
              Tail Pulley Diameter (in)
              {tailFromCatalog && (
                <span className="ml-2 text-xs font-normal text-blue-600">
                  ({tailPulleyDia}" from catalog)
                </span>
              )}
            </label>
            {tailFromCatalog ? (
              <p className="text-xs text-gray-500 mt-1">
                Derived from selected tail pulley. Clear catalog selection to set manually.
              </p>
            ) : (
              <>
                <div className="flex gap-2">
                  <select
                    id="tail_pulley_preset"
                    className={`input flex-1 ${tailPulleyBelowMinimum ? 'border-red-500' : ''}`}
                    value={
                      inputs.tail_pulley_preset === 'custom'
                        ? 'custom'
                        : PULLEY_DIAMETER_PRESETS.includes(tailPulleyDia as any)
                        ? tailPulleyDia.toString()
                        : 'custom'
                    }
                    onChange={(e) => handleTailPulleyPresetChange(e.target.value)}
                  >
                    {PULLEY_DIAMETER_PRESETS.map((size) => (
                      <option key={size} value={size.toString()}>
                        {size}"
                      </option>
                    ))}
                    <option value="custom">Custom...</option>
                  </select>
                  {(inputs.tail_pulley_preset === 'custom' ||
                    !PULLEY_DIAMETER_PRESETS.includes(tailPulleyDia as any)) && (
                    <input
                      type="number"
                      id="tail_pulley_diameter_in"
                      className={`input w-24 ${tailPulleyBelowMinimum ? 'border-red-500' : ''}`}
                      value={tailPulleyDia}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateInput('tail_pulley_diameter_in', value);
                      }}
                      step="0.1"
                      min="2.5"
                      max="12"
                      required
                    />
                  )}
                </div>
                {tailPulleyBelowMinimum && (
                  <p className="text-xs text-red-600 mt-1">
                    Tail pulley is below the belt minimum ({minPulleyDia}" for{' '}
                    {isVGuided ? 'V-guided' : 'crowned'} tracking).
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label htmlFor="conveyor_incline_deg" className="label">
              Incline Angle (degrees) <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="number"
              id="conveyor_incline_deg"
              className="input"
              value={inputs.conveyor_incline_deg || ''}
              onChange={(e) =>
                updateInput('conveyor_incline_deg', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="0.1"
              min="0"
            />
          </div>

          {/* v1.5: Frame Height Mode - Adjacent to pulley diameter per UX analysis */}
          <div className="border-t border-gray-200 pt-4 mt-2">
            <label htmlFor="frame_height_mode" className="label">
              Frame Height Mode
            </label>
            <select
              id="frame_height_mode"
              className="input"
              value={inputs.frame_height_mode ?? FrameHeightMode.Standard}
              onChange={(e) => {
                const mode = e.target.value as FrameHeightMode;
                updateInput('frame_height_mode', mode);
                // Clear custom frame height when switching away from Custom
                if (mode !== FrameHeightMode.Custom) {
                  updateInput('custom_frame_height_in', undefined);
                }
              }}
            >
              <option value={FrameHeightMode.Standard}>Standard (Pulley + 2.5&quot;)</option>
              <option value={FrameHeightMode.LowProfile}>Low Profile (Pulley + 0.5&quot;)</option>
              <option value={FrameHeightMode.Custom}>Custom</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Standard frame clears the drive pulley with 2.5&quot; margin. Low Profile and Custom are cost options.
            </p>
          </div>

          {/* Custom Frame Height - only show when Custom is selected */}
          {inputs.frame_height_mode === FrameHeightMode.Custom && (
            <div className="ml-4 pl-4 border-l-2 border-gray-200">
              <label htmlFor="custom_frame_height_in" className="label">
                Custom Frame Height (in) <span className="text-gray-500">(required)</span>
              </label>
              <input
                type="number"
                id="custom_frame_height_in"
                className="input"
                value={inputs.custom_frame_height_in ?? ''}
                onChange={(e) =>
                  updateInput('custom_frame_height_in', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                step="0.25"
                min="3.0"
                max="24"
                required
                placeholder="e.g., 4.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum: 3.0&quot;. Heights below 4.0&quot; require design review.
              </p>
            </div>
          )}

          {/* Info messages based on frame height mode */}
          {inputs.frame_height_mode === FrameHeightMode.LowProfile && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Low Profile:</strong> Frame height will be pulley diameter + 0.5&quot;.
                This may require snub rollers for belt return path.
              </p>
            </div>
          )}

          {inputs.frame_height_mode === FrameHeightMode.Custom && inputs.custom_frame_height_in !== undefined && inputs.custom_frame_height_in < 4.0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Design Review Required:</strong> Frame height below 4.0&quot; requires engineering review.
              </p>
            </div>
          )}

          {/* v1.5: Inline Derived Display - Frame Height & Rollers */}
          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Derived Values
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Frame Height:</span>
                <span className="font-medium text-gray-900">{effectiveFrameHeight.toFixed(1)}"</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mode:</span>
                <span className="font-medium text-gray-700">
                  {inputs.frame_height_mode ?? 'Standard'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Snub Rollers:</span>
                <span className={`font-medium ${requiresSnubRollers ? 'text-amber-600' : 'text-green-600'}`}>
                  {requiresSnubRollers ? `Required (${snubRollerQty})` : 'Not required'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gravity Rollers:</span>
                <span className="font-medium text-gray-900">
                  {gravityRollerQty} <span className="text-gray-500 text-xs">@ {GRAVITY_ROLLER_SPACING_IN}"</span>
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Frame height and roller configuration based on current pulley size and frame mode.
              {requiresSnubRollers && ' Low frame height requires snub rollers at pulley ends.'}
            </p>
          </div>
        </div>
      </div>

      {/* Section: Support & Height - Adjacent to geometry per UX analysis */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Support & Height</h3>
        <div className="grid grid-cols-1 gap-4">
          {/* Tail End Support */}
          <div>
            <label className="label">Tail End Support</label>
            <select
              id="tail_support_type"
              className="input"
              value={inputs.tail_support_type ?? EndSupportType.External}
              onChange={(e) => updateInput('tail_support_type', e.target.value as EndSupportType)}
            >
              <option value={EndSupportType.External}>External (Suspended/Framework)</option>
              <option value={EndSupportType.Legs}>Legs (Floor Mounted)</option>
              <option value={EndSupportType.Casters}>Casters (Floor Rolling)</option>
            </select>
          </div>

          {/* Drive End Support */}
          <div>
            <label className="label">Drive End Support</label>
            <select
              id="drive_support_type"
              className="input"
              value={inputs.drive_support_type ?? EndSupportType.External}
              onChange={(e) => updateInput('drive_support_type', e.target.value as EndSupportType)}
            >
              <option value={EndSupportType.External}>External (Suspended/Framework)</option>
              <option value={EndSupportType.Legs}>Legs (Floor Mounted)</option>
              <option value={EndSupportType.Casters}>Casters (Floor Rolling)</option>
            </select>
          </div>

          {/* Height Configuration - Only show when legs_required=true */}
          {derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type) && (
            <div className="border-t border-gray-200 pt-4 mt-2 space-y-4">
              <h4 className="text-md font-medium text-gray-900">Height Configuration</h4>
              <p className="text-xs text-gray-500">
                Floor-standing support requires height specification (Top of Belt).
              </p>

              {/* Height Input Mode */}
              <div>
                <label className="label">Height Input Mode</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="height_input_mode"
                      checked={(inputs.height_input_mode ?? HeightInputMode.ReferenceAndAngle) === HeightInputMode.ReferenceAndAngle}
                      onChange={() => {
                        // Mode switching clears TOB values to avoid ghost ownership
                        updateInput('tail_tob_in', undefined);
                        updateInput('drive_tob_in', undefined);
                        updateInput('height_input_mode', HeightInputMode.ReferenceAndAngle);
                      }}
                      className="mr-2"
                    />
                    Reference + Angle
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="height_input_mode"
                      checked={inputs.height_input_mode === HeightInputMode.BothEnds}
                      onChange={() => {
                        // Mode switching clears TOB values to avoid ghost ownership
                        updateInput('tail_tob_in', undefined);
                        updateInput('drive_tob_in', undefined);
                        updateInput('height_input_mode', HeightInputMode.BothEnds);
                      }}
                      className="mr-2"
                    />
                    Both Ends
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(inputs.height_input_mode ?? HeightInputMode.ReferenceAndAngle) === HeightInputMode.ReferenceAndAngle
                    ? 'Specify one TOB + incline angle; system calculates the other.'
                    : 'Specify both TOBs; system calculates implied angle.'}
                </p>
              </div>

              {/* Mode A: Reference End + Reference TOB */}
              {(inputs.height_input_mode ?? HeightInputMode.ReferenceAndAngle) === HeightInputMode.ReferenceAndAngle && (
                <>
                  <div>
                    <label className="label">Reference End</label>
                    <div className="flex gap-4">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="reference_end"
                          checked={(inputs.reference_end ?? 'tail') === 'tail'}
                          onChange={() => {
                            // Switching reference end clears TOB values
                            updateInput('tail_tob_in', undefined);
                            updateInput('drive_tob_in', undefined);
                            updateInput('reference_end', 'tail');
                          }}
                          className="mr-2"
                        />
                        Tail
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="reference_end"
                          checked={inputs.reference_end === 'drive'}
                          onChange={() => {
                            // Switching reference end clears TOB values
                            updateInput('tail_tob_in', undefined);
                            updateInput('drive_tob_in', undefined);
                            updateInput('reference_end', 'drive');
                          }}
                          className="mr-2"
                        />
                        Drive
                      </label>
                    </div>
                  </div>

                  {/* Reference TOB input */}
                  <div>
                    <label htmlFor="reference_tob" className="label">
                      {(inputs.reference_end ?? 'tail') === 'tail' ? 'Tail' : 'Drive'} TOB (in)
                    </label>
                    <input
                      type="number"
                      id="reference_tob"
                      className="input"
                      value={
                        (inputs.reference_end ?? 'tail') === 'tail'
                          ? (inputs.tail_tob_in ?? '')
                          : (inputs.drive_tob_in ?? '')
                      }
                      onChange={(e) => {
                        const value = e.target.value ? parseFloat(e.target.value) : undefined;
                        if ((inputs.reference_end ?? 'tail') === 'tail') {
                          updateInput('tail_tob_in', value);
                        } else {
                          updateInput('drive_tob_in', value);
                        }
                      }}
                      step="0.25"
                      min="0"
                      placeholder="e.g., 36"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Top of Belt height at {(inputs.reference_end ?? 'tail') === 'tail' ? 'tail' : 'drive'} end.
                      Opposite end calculated from incline angle.
                    </p>
                  </div>
                </>
              )}

              {/* Mode B: Both TOBs */}
              {inputs.height_input_mode === HeightInputMode.BothEnds && (
                <>
                  <div>
                    <label htmlFor="tail_tob_in" className="label">
                      Tail TOB (in)
                    </label>
                    <input
                      type="number"
                      id="tail_tob_in"
                      className="input"
                      value={inputs.tail_tob_in ?? ''}
                      onChange={(e) =>
                        updateInput('tail_tob_in', e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      step="0.25"
                      min="0"
                      placeholder="e.g., 36"
                    />
                  </div>

                  <div>
                    <label htmlFor="drive_tob_in" className="label">
                      Drive TOB (in)
                    </label>
                    <input
                      type="number"
                      id="drive_tob_in"
                      className="input"
                      value={inputs.drive_tob_in ?? ''}
                      onChange={(e) =>
                        updateInput('drive_tob_in', e.target.value ? parseFloat(e.target.value) : undefined)
                      }
                      step="0.25"
                      min="0"
                      placeholder="e.g., 42"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      System will calculate implied angle from these heights.
                    </p>
                  </div>
                </>
              )}

              {/* Adjustment Range */}
              <div>
                <label htmlFor="adjustment_required_in" className="label">
                  Leg Adjustment Range (in)
                </label>
                <input
                  type="number"
                  id="adjustment_required_in"
                  className="input"
                  value={inputs.adjustment_required_in ?? ''}
                  onChange={(e) =>
                    updateInput('adjustment_required_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  step="0.5"
                  min="0"
                  max="24"
                  placeholder="e.g., 2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ±adjustment for floor leveling. Default: 2". Large values may require special leg design.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section: Belt Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Belt Selection</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="belt_catalog_key" className="label">
              Belt
            </label>
            <BeltSelect
              id="belt_catalog_key"
              value={inputs.belt_catalog_key}
              onChange={handleBeltChange}
              showDetails={true}
            />
            <p className="text-xs text-gray-500 mt-1">
              Select a belt to auto-populate PIW/PIL and minimum pulley diameter constraints.
            </p>
          </div>

          {/* PIW/PIL Override Fields - only show when belt is selected */}
          {inputs.belt_catalog_key && (
            <>
              <div>
                <label htmlFor="belt_piw_override" className="label">
                  PIW Override (lb/in) <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  id="belt_piw_override"
                  className="input"
                  value={inputs.belt_piw_override ?? ''}
                  onChange={(e) =>
                    updateInput('belt_piw_override', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  step="0.001"
                  min="0.05"
                  max="0.30"
                  placeholder={inputs.belt_piw?.toString() ?? ''}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to use catalog value ({inputs.belt_piw ?? 'N/A'} lb/in)
                </p>
              </div>
              <div>
                <label htmlFor="belt_pil_override" className="label">
                  PIL Override (lb/in) <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  id="belt_pil_override"
                  className="input"
                  value={inputs.belt_pil_override ?? ''}
                  onChange={(e) =>
                    updateInput('belt_pil_override', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  step="0.001"
                  min="0.05"
                  max="0.30"
                  placeholder={inputs.belt_pil?.toString() ?? ''}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to use catalog value ({inputs.belt_pil ?? 'N/A'} lb/in)
                </p>
              </div>
            </>
          )}

          {/* v1.3: Belt Cleats */}
          <div className="border-t border-gray-200 pt-4 mt-2">
            <div>
              <label className="label">Belt Cleats</label>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="cleats_enabled"
                    checked={inputs.cleats_enabled !== true}
                    onChange={() => updateInput('cleats_enabled', false)}
                    className="mr-2"
                  />
                  None
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="cleats_enabled"
                    checked={inputs.cleats_enabled === true}
                    onChange={() => updateInput('cleats_enabled', true)}
                    className="mr-2"
                  />
                  Add Cleats
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Cleats help retain product on inclines. Does not affect power/tension calculations.
              </p>
            </div>

            {/* Cleat configuration - only show if enabled */}
            {inputs.cleats_enabled && (
              <div className="ml-4 pl-4 border-l-2 border-gray-200 mt-4 space-y-4">
                <div>
                  <label htmlFor="cleat_height_in" className="label">
                    Cleat Height (in)
                  </label>
                  <input
                    type="number"
                    id="cleat_height_in"
                    className="input"
                    value={inputs.cleat_height_in ?? ''}
                    onChange={(e) =>
                      updateInput('cleat_height_in', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    step="0.25"
                    min="0.5"
                    max="6"
                    required
                    placeholder="e.g., 1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Height of cleats (0.5" - 6")
                  </p>
                </div>

                <div>
                  <label htmlFor="cleat_spacing_in" className="label">
                    Cleat Spacing (in)
                  </label>
                  <input
                    type="number"
                    id="cleat_spacing_in"
                    className="input"
                    value={inputs.cleat_spacing_in ?? ''}
                    onChange={(e) =>
                      updateInput('cleat_spacing_in', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    step="1"
                    min="2"
                    max="48"
                    required
                    placeholder="e.g., 12"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Center-to-center spacing between cleats (2" - 48")
                  </p>
                </div>

                <div>
                  <label htmlFor="cleat_edge_offset_in" className="label">
                    Cleat Edge Offset (in)
                  </label>
                  <input
                    type="number"
                    id="cleat_edge_offset_in"
                    className="input"
                    value={inputs.cleat_edge_offset_in ?? ''}
                    onChange={(e) =>
                      updateInput('cleat_edge_offset_in', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    step="0.25"
                    min="0"
                    max="12"
                    required
                    placeholder="e.g., 0.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Distance from belt edge to cleat end (0" - 12")
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section: Belt Tracking */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Belt Tracking</h3>

        {/* Tracking Guidance Banner */}
        {inputs.conveyor_length_cc_in > 0 && inputs.belt_width_in > 0 && (() => {
          const guidance = calculateTrackingGuidance(inputs);
          // showWarning used to gate warning display, but warnings now always show if present
          const _showWarning = guidance.riskLevel !== TrackingRiskLevel.Low &&
            inputs.belt_tracking_method !== guidance.recommendation;
          void _showWarning; // Suppress unused variable warning

          return (
            <div className={`mb-4 p-3 rounded-lg ${
              guidance.riskLevel === TrackingRiskLevel.High
                ? 'bg-red-50 border border-red-200'
                : guidance.riskLevel === TrackingRiskLevel.Medium
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {guidance.riskLevel === TrackingRiskLevel.High && (
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  {guidance.riskLevel === TrackingRiskLevel.Medium && (
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  )}
                  {guidance.riskLevel === TrackingRiskLevel.Low && (
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <h4 className={`text-sm font-medium ${
                    guidance.riskLevel === TrackingRiskLevel.High
                      ? 'text-red-800'
                      : guidance.riskLevel === TrackingRiskLevel.Medium
                      ? 'text-yellow-800'
                      : 'text-green-800'
                  }`}>
                    Tracking Recommendation: {guidance.recommendation}
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getRiskLevelColor(guidance.riskLevel)}`}>
                      {guidance.riskLevel} Risk
                    </span>
                  </h4>
                  <p className={`mt-1 text-sm ${
                    guidance.riskLevel === TrackingRiskLevel.High
                      ? 'text-red-700'
                      : guidance.riskLevel === TrackingRiskLevel.Medium
                      ? 'text-yellow-700'
                      : 'text-green-700'
                  }`}>
                    {guidance.summary}
                  </p>

                  {/* Show risk factors */}
                  {guidance.factors.filter(f => f.risk !== TrackingRiskLevel.Low).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 font-medium">Risk factors:</p>
                      <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                        {guidance.factors
                          .filter(f => f.risk !== TrackingRiskLevel.Low)
                          .map((f, i) => (
                            <li key={i}>
                              <span className={`font-medium ${
                                f.risk === TrackingRiskLevel.High ? 'text-red-600' : 'text-yellow-600'
                              }`}>{f.name}</span>: {f.explanation}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {/* Show warnings - always display if there are any */}
                  {guidance.warnings.length > 0 && (
                    <div className="mt-2 p-2 bg-white/50 rounded border border-red-200">
                      <p className="text-xs text-red-700 font-medium">Warnings:</p>
                      <ul className="mt-1 text-xs text-red-600 list-disc list-inside">
                        {guidance.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="belt_tracking_method" className="label">
              Belt Tracking Method
            </label>
            <select
              id="belt_tracking_method"
              className="input"
              value={inputs.belt_tracking_method}
              onChange={(e) => updateInput('belt_tracking_method', e.target.value)}
            >
              {Object.values(BeltTrackingMethod).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              V-guided uses a V-profile on the belt underside. Crowned uses crowned pulleys for tracking.
            </p>
          </div>

          {/* V-guide profile - only show if V-guided */}
          {(inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
            inputs.belt_tracking_method === 'V-guided') && (
            <div>
              <label htmlFor="v_guide_profile" className="label">
                V-Guide Profile
              </label>
              <select
                id="v_guide_profile"
                className="input"
                value={inputs.v_guide_profile || ''}
                onChange={(e) => updateInput('v_guide_profile', e.target.value || undefined)}
                required
              >
                <option value="">Select profile...</option>
                {Object.values(VGuideProfile).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="shaft_diameter_mode" className="label">
              Shaft Diameter Mode
            </label>
            <select
              id="shaft_diameter_mode"
              className="input"
              value={inputs.shaft_diameter_mode}
              onChange={(e) => updateInput('shaft_diameter_mode', e.target.value)}
            >
              {Object.values(ShaftDiameterMode).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Manual shaft diameters - only show if manual mode */}
          {(inputs.shaft_diameter_mode === ShaftDiameterMode.Manual ||
            inputs.shaft_diameter_mode === 'Manual') && (
            <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-4">
              <div>
                <label htmlFor="drive_shaft_diameter_in" className="label">
                  Drive Shaft Diameter (in)
                </label>
                <input
                  type="number"
                  id="drive_shaft_diameter_in"
                  className="input"
                  value={inputs.drive_shaft_diameter_in || ''}
                  onChange={(e) =>
                    updateInput('drive_shaft_diameter_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  step="0.125"
                  min="0.5"
                  max="4.0"
                  required
                />
              </div>
              <div>
                <label htmlFor="tail_shaft_diameter_in" className="label">
                  Tail Shaft Diameter (in)
                </label>
                <input
                  type="number"
                  id="tail_shaft_diameter_in"
                  className="input"
                  value={inputs.tail_shaft_diameter_in || ''}
                  onChange={(e) =>
                    updateInput('tail_shaft_diameter_in', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  step="0.125"
                  min="0.5"
                  max="4.0"
                  required
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section B: Drive & electrical */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Drive & Electrical
        </h3>
        <div className="grid grid-cols-1 gap-4">
          {/* Speed Mode Selector (v1.6) */}
          <div>
            <label className="label">Speed Mode</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="speed_mode"
                  checked={(inputs.speed_mode ?? SpeedMode.BeltSpeed) === SpeedMode.BeltSpeed}
                  onChange={() => updateInput('speed_mode', SpeedMode.BeltSpeed)}
                  className="mr-2"
                />
                Specify Belt Speed
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="speed_mode"
                  checked={inputs.speed_mode === SpeedMode.DriveRpm}
                  onChange={() => updateInput('speed_mode', SpeedMode.DriveRpm)}
                  className="mr-2"
                />
                Specify Drive RPM
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Primary workflow: specify Belt Speed and Motor RPM to calculate Drive RPM and Gear Ratio
            </p>
          </div>

          {/* Belt Speed Mode (default) */}
          {(inputs.speed_mode ?? SpeedMode.BeltSpeed) === SpeedMode.BeltSpeed && (
            <>
              <div>
                <label htmlFor="belt_speed_fpm" className="label">
                  Belt Speed (FPM) <span className="text-primary-600">*</span>
                </label>
                <input
                  type="number"
                  id="belt_speed_fpm"
                  className="input"
                  value={inputs.belt_speed_fpm}
                  onChange={(e) => updateInput('belt_speed_fpm', parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                  required
                />
              </div>

              {/* Calculated Drive RPM preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Calculated Drive RPM:</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {inputs.belt_speed_fpm > 0 && (inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in) > 0
                      ? calculateDriveShaftRpm(
                          inputs.belt_speed_fpm,
                          inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in
                        ).toFixed(2)
                      : '—'}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Drive RPM Mode (legacy) */}
          {inputs.speed_mode === SpeedMode.DriveRpm && (
            <>
              <div>
                <label htmlFor="drive_rpm_input" className="label">
                  Drive RPM <span className="text-primary-600">*</span>
                </label>
                <input
                  type="number"
                  id="drive_rpm_input"
                  className="input"
                  value={inputs.drive_rpm_input ?? inputs.drive_rpm}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    updateInput('drive_rpm_input', value);
                    // Also sync to legacy drive_rpm for backward compat
                    updateInput('drive_rpm', value);
                  }}
                  step="1"
                  min="0"
                  required
                />
              </div>

              {/* Calculated Belt Speed preview */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Calculated Belt Speed:</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {(inputs.drive_rpm_input ?? inputs.drive_rpm) > 0 && (inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in) > 0
                      ? calculateBeltSpeed(
                          inputs.drive_rpm_input ?? inputs.drive_rpm,
                          inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in
                        ).toFixed(2) + ' FPM'
                      : '—'}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Motor RPM - always shown */}
          <div>
            <label htmlFor="motor_rpm" className="label">
              Motor RPM
            </label>
            <input
              type="number"
              id="motor_rpm"
              className="input"
              value={inputs.motor_rpm ?? 1750}
              onChange={(e) => updateInput('motor_rpm', parseFloat(e.target.value) || 1750)}
              step="1"
              min="800"
              max="3600"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default: 1750 RPM. Range: 800–3600 RPM
            </p>
          </div>

          {/* Gear Ratio preview */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-primary-700 font-medium">Calculated Gear Ratio:</span>
              <span className="font-mono font-bold text-primary-900">
                {(() => {
                  const motorRpm = inputs.motor_rpm ?? 1750;
                  const pulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in;
                  let driveRpm: number;

                  if ((inputs.speed_mode ?? SpeedMode.BeltSpeed) === SpeedMode.BeltSpeed) {
                    driveRpm = inputs.belt_speed_fpm > 0 && pulleyDia > 0
                      ? calculateDriveShaftRpm(inputs.belt_speed_fpm, pulleyDia)
                      : 0;
                  } else {
                    driveRpm = inputs.drive_rpm_input ?? inputs.drive_rpm;
                  }

                  return driveRpm > 0 ? (motorRpm / driveRpm).toFixed(2) : '—';
                })()}
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="power_feed" className="label">
              Power Feed
            </label>
            <CatalogSelect
              catalogKey="power_feed"
              value={inputs.power_feed}
              onChange={(value) => updateInput('power_feed', value)}
              id="power_feed"
              required
            />
          </div>

          <div>
            <label htmlFor="controls_package" className="label">
              Controls Package
            </label>
            <CatalogSelect
              catalogKey="controls_package"
              value={inputs.controls_package}
              onChange={(value) => updateInput('controls_package', value)}
              id="controls_package"
              required
            />
          </div>

          {/* Drive location */}
          <div>
            <label htmlFor="drive_location" className="label">
              Drive Location
            </label>
            <select
              id="drive_location"
              className="input"
              value={inputs.drive_location}
              onChange={(e) => updateInput('drive_location', e.target.value)}
            >
              {Object.values(DriveLocation).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Brake motor */}
          <div>
            <label className="label">Brake Motor</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="brake_motor"
                  checked={inputs.brake_motor === false}
                  onChange={() => updateInput('brake_motor', false)}
                  className="mr-2"
                />
                No
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="brake_motor"
                  checked={inputs.brake_motor === true}
                  onChange={() => updateInput('brake_motor', true)}
                  className="mr-2"
                />
                Yes
              </label>
            </div>
          </div>

          {/* Gearmotor Mounting Style (v1.7) - shaft vs chain drive */}
          <div>
            <label className="label">Gearmotor Mounting Style</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="gearmotor_mounting_style"
                  checked={(inputs.gearmotor_mounting_style ?? GearmotorMountingStyle.ShaftMounted) === GearmotorMountingStyle.ShaftMounted}
                  onChange={() => updateInput('gearmotor_mounting_style', GearmotorMountingStyle.ShaftMounted)}
                  className="mr-2"
                />
                Shaft Mounted
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="gearmotor_mounting_style"
                  checked={inputs.gearmotor_mounting_style === GearmotorMountingStyle.BottomMount}
                  onChange={() => {
                    updateInput('gearmotor_mounting_style', GearmotorMountingStyle.BottomMount);
                    // Ensure sprocket defaults are set for legacy configs
                    if (inputs.gm_sprocket_teeth === undefined) {
                      updateInput('gm_sprocket_teeth', 18);
                    }
                    if (inputs.drive_shaft_sprocket_teeth === undefined) {
                      updateInput('drive_shaft_sprocket_teeth', 24);
                    }
                  }}
                  className="mr-2"
                />
                Bottom Mount (Chain Drive)
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Shaft mounted: direct coupling. Bottom mount: chain-coupled via sprockets.
            </p>
          </div>

          {/* Sprocket Configuration - only shown for bottom mount */}
          {inputs.gearmotor_mounting_style === GearmotorMountingStyle.BottomMount && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
              <h4 className="text-sm font-medium text-gray-700">Sprocket Configuration</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gm_sprocket_teeth" className="label">
                    Gearmotor Sprocket (Driver)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="gm_sprocket_teeth"
                      className="input"
                      value={inputs.gm_sprocket_teeth ?? 18}
                      onChange={(e) => updateInput('gm_sprocket_teeth', parseInt(e.target.value) || 18)}
                      step="1"
                      min="1"
                      required
                    />
                    <span className="text-sm text-gray-500">teeth</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="drive_shaft_sprocket_teeth" className="label">
                    Drive Shaft Sprocket (Driven)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="drive_shaft_sprocket_teeth"
                      className="input"
                      value={inputs.drive_shaft_sprocket_teeth ?? 24}
                      onChange={(e) => updateInput('drive_shaft_sprocket_teeth', parseInt(e.target.value) || 24)}
                      step="1"
                      min="1"
                      required
                    />
                    <span className="text-sm text-gray-500">teeth</span>
                  </div>
                </div>
              </div>

              {/* Chain ratio preview */}
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Chain Ratio:</span>
                  <span className="font-mono font-semibold text-gray-900">
                    {(() => {
                      const gmTeeth = inputs.gm_sprocket_teeth ?? 18;
                      const driveTeeth = inputs.drive_shaft_sprocket_teeth ?? 24;
                      if (gmTeeth > 0 && driveTeeth > 0) {
                        const ratio = driveTeeth / gmTeeth;
                        return `${ratio.toFixed(3)} (${driveTeeth}T / ${gmTeeth}T)`;
                      }
                      return '—';
                    })()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(() => {
                    const gmTeeth = inputs.gm_sprocket_teeth ?? 18;
                    const driveTeeth = inputs.drive_shaft_sprocket_teeth ?? 24;
                    if (gmTeeth > 0 && driveTeeth > 0) {
                      const ratio = driveTeeth / gmTeeth;
                      if (ratio > 1) {
                        return 'Speed reduction at chain stage (gearmotor output RPM > drive shaft RPM)';
                      } else if (ratio < 1) {
                        return 'Speed increase at chain stage (drive shaft spins faster)';
                      }
                      return 'No speed change at chain stage';
                    }
                    return '';
                  })()}
                </p>
              </div>
            </div>
          )}

          {/* Gearmotor orientation */}
          <div>
            <label htmlFor="gearmotor_orientation" className="label">
              Gearmotor Mounting Orientation
            </label>
            <select
              id="gearmotor_orientation"
              className="input"
              value={inputs.gearmotor_orientation}
              onChange={(e) => updateInput('gearmotor_orientation', e.target.value)}
            >
              {Object.values(GearmotorOrientation).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Drive hand */}
          <div>
            <label className="label">Drive Hand</label>
            <div className="flex gap-4">
              {Object.values(DriveHand).map((option) => (
                <label key={option} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="drive_hand"
                    checked={inputs.drive_hand === option}
                    onChange={() => updateInput('drive_hand', option)}
                    className="mr-2"
                  />
                  {option}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Reference: when facing the discharge end.</p>
          </div>

          {/* Motor Brand */}
          <div>
            <label htmlFor="motor_brand" className="label">
              Motor Brand
            </label>
            <CatalogSelect
              catalogKey="motor_brand"
              value={inputs.motor_brand}
              onChange={(value) => updateInput('motor_brand', value)}
              id="motor_brand"
              required
            />
          </div>
        </div>
      </div>

      {/* Section C: Advanced parameters (collapsible) */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setAdvancedExpanded(!advancedExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            Advanced Parameters <span className="text-sm font-normal text-gray-500">(Optional)</span>
          </h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${advancedExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {advancedExpanded && (
        <div className="p-4 grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="friction_coeff" className="label">
              Friction Coefficient <span className="text-gray-500">(0.05-0.6, default: 0.25)</span>
            </label>
            <input
              type="number"
              id="friction_coeff"
              className="input"
              value={inputs.friction_coeff || ''}
              onChange={(e) =>
                updateInput('friction_coeff', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="0.01"
              min="0.05"
              max="0.6"
            />
          </div>

          <div>
            <label htmlFor="safety_factor" className="label">
              Safety Factor <span className="text-gray-500">(1.0-5.0, default: 2.0)</span>
            </label>
            <input
              type="number"
              id="safety_factor"
              className="input"
              value={inputs.safety_factor || ''}
              onChange={(e) =>
                updateInput('safety_factor', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="0.1"
              min="1.0"
              max="5.0"
            />
          </div>

          <div>
            <label htmlFor="starting_belt_pull_lb" className="label">
              Starting Belt Pull (lb) <span className="text-gray-500">(0-2000, default: 75)</span>
            </label>
            <input
              type="number"
              id="starting_belt_pull_lb"
              className="input"
              value={inputs.starting_belt_pull_lb || ''}
              onChange={(e) =>
                updateInput('starting_belt_pull_lb', e.target.value ? parseFloat(e.target.value) : undefined)
              }
              step="1"
              min="0"
              max="2000"
            />
          </div>

        </div>
        )}
      </div>
    </div>
  );
}

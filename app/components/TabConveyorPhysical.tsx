/**
 * Lane 2: Conveyor Design – Physical Conveyor
 *
 * Physical conveyor definition:
 * - Conveyor Type & Geometry
 * - Pulleys & Belt Interface
 * - Frame, Height & Support
 * - Belt & Tracking
 */

'use client';

import {
  SliderbedInputs,
  BeltTrackingMethod,
  VGuideProfile,
  ShaftDiameterMode,
  PULLEY_DIAMETER_PRESETS,
  PulleyDiameterPreset,
  FrameHeightMode,
  EndSupportType,
  derivedLegsRequired,
  PulleySurfaceType,
  GeometryMode,
} from '../../src/models/sliderbed_v1/schema';
import {
  calculateEffectiveFrameHeight,
  calculateRequiresSnubRollers,
  calculateGravityRollerQuantity,
  calculateSnubRollerQuantity,
  GRAVITY_ROLLER_SPACING_IN,
} from '../../src/models/sliderbed_v1/formulas';
import {
  normalizeGeometry,
  centerlineToTob,
} from '../../src/models/sliderbed_v1/geometry';
import { BedType } from '../../src/models/belt_conveyor_v1/schema';
import {
  calculateTrackingGuidance,
  getRiskLevelColor,
  TrackingRiskLevel,
} from '../../src/models/sliderbed_v1/tracking-guidance';
import BeltSelect from './BeltSelect';
import { BeltCatalogItem } from '../api/belts/route';
import { getEffectiveMinPulleyDiameters } from '../../src/lib/belt-catalog';
import { runCalculation } from '../../src/lib/calculator';
import AccordionSection, { useAccordionState } from './AccordionSection';
import { SectionCounts, SectionKey } from './useConfigureIssues';

interface TabConveyorPhysicalProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
  sectionCounts: Record<SectionKey, SectionCounts>;
}

/**
 * Stat tile for derived geometry display
 */
function GeometryStat({
  label,
  value,
  subtext,
  derived,
}: {
  label: string;
  value: string;
  subtext?: string;
  derived?: boolean;
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2">
      <div className="text-[11px] font-medium text-gray-500">{label}</div>
      <div
        className={[
          'mt-1 text-lg font-semibold tabular-nums',
          derived ? 'text-blue-600' : 'text-gray-900',
        ].join(' ')}
      >
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-gray-400">{subtext}</div>
      )}
    </div>
  );
}

export default function TabConveyorPhysical({ inputs, updateInput, sectionCounts }: TabConveyorPhysicalProps) {
  // Handle belt selection - updates multiple fields at once
  // v1.11: Uses getEffectiveMinPulleyDiameters for material_profile precedence
  // v1.11 Phase 4: Also sets belt_cleat_method for cleat spacing multiplier
  const handleBeltChange = (catalogKey: string | undefined, belt: BeltCatalogItem | undefined) => {
    updateInput('belt_catalog_key', catalogKey);
    if (belt) {
      updateInput('belt_piw', belt.piw);
      updateInput('belt_pil', belt.pil);
      // Use effective min diameters (material_profile overrides legacy columns if present)
      const effectiveMin = getEffectiveMinPulleyDiameters(belt);
      updateInput('belt_min_pulley_dia_no_vguide_in', effectiveMin.noVguide);
      updateInput('belt_min_pulley_dia_with_vguide_in', effectiveMin.withVguide);
      // Set cleat method from material profile (for cleat spacing multiplier)
      updateInput('belt_cleat_method', effectiveMin.cleatMethod);
    } else {
      updateInput('belt_piw', undefined);
      updateInput('belt_pil', undefined);
      updateInput('belt_min_pulley_dia_no_vguide_in', undefined);
      updateInput('belt_min_pulley_dia_with_vguide_in', undefined);
      updateInput('belt_cleat_method', undefined);
    }
  };

  // Get effective pulley diameters
  const drivePulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in ?? 4;
  const tailPulleyDia = inputs.tail_matches_drive !== false
    ? drivePulleyDia
    : (inputs.tail_pulley_diameter_in ?? drivePulleyDia);

  // v1.11 Phase 4.1: Use outputs from runCalculation as single source of truth
  // for min pulley requirements and cleat spacing multiplier
  const calcResult = runCalculation({ inputs });
  const outputs = calcResult.success ? calcResult.outputs : undefined;

  // Get min pulley requirements from outputs (formulas.ts is source of truth)
  const minPulleyDriveRequired = outputs?.min_pulley_drive_required_in;
  const minPulleyTailRequired = outputs?.min_pulley_tail_required_in;
  const cleatSpacingMultiplier = outputs?.cleat_spacing_multiplier;
  const drivePulleyBelowMinimum = outputs?.drive_pulley_meets_minimum === false;
  const tailPulleyBelowMinimum = outputs?.tail_pulley_meets_minimum === false;

  // Tracking method for display label
  const isVGuided =
    inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
    inputs.belt_tracking_method === 'V-guided';

  // Compute derived frame height and roller values
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

  // v1.10: Compute derived geometry values
  const { derived: derivedGeometry } = normalizeGeometry(inputs);
  const geometryMode = inputs.geometry_mode ?? GeometryMode.LengthAngle;

  // Handle geometry mode changes - preserve values when switching
  const handleGeometryModeChange = (newMode: GeometryMode) => {
    // Before switching, save current derived values to preserve geometry
    const currentL_cc = derivedGeometry.L_cc_in;
    const currentH_cc = derivedGeometry.H_cc_in;
    const currentTheta = derivedGeometry.theta_deg;

    updateInput('geometry_mode', newMode);

    if (newMode === GeometryMode.LengthAngle) {
      // Switching to L_ANGLE: use current L_cc and theta
      updateInput('conveyor_length_cc_in', currentL_cc);
      updateInput('conveyor_incline_deg', currentTheta);
    } else if (newMode === GeometryMode.HorizontalAngle) {
      // Switching to H_ANGLE: use current H_cc and theta
      updateInput('horizontal_run_in', currentH_cc);
      updateInput('conveyor_incline_deg', currentTheta);
    } else if (newMode === GeometryMode.HorizontalTob) {
      // Switching to H_TOB: use current H_cc and derive TOBs if possible
      updateInput('horizontal_run_in', currentH_cc);
      // If TOBs aren't set, compute reasonable defaults from current geometry
      if (inputs.tail_tob_in === undefined) {
        // Use a default tail centerline height of 36" and add pulley radius
        const defaultTailCl = 36;
        const tailTob = centerlineToTob(defaultTailCl, tailPulleyDia);
        updateInput('tail_tob_in', tailTob);
      }
      if (inputs.drive_tob_in === undefined) {
        // Compute drive TOB from current geometry
        const rise = derivedGeometry.rise_in;
        const defaultTailCl = 36;
        const driveCl = defaultTailCl + rise;
        const driveTob = centerlineToTob(driveCl, drivePulleyDia);
        updateInput('drive_tob_in', driveTob);
      }
    }
  };

  // Handle pulley preset selection
  const handleDrivePulleyPresetChange = (preset: string) => {
    if (preset === 'custom') {
      updateInput('drive_pulley_preset', 'custom');
    } else {
      const value = parseFloat(preset);
      updateInput('drive_pulley_preset', value as PulleyDiameterPreset);
      updateInput('drive_pulley_diameter_in', value);
      updateInput('pulley_diameter_in', value);
      if (inputs.tail_matches_drive !== false) {
        updateInput('tail_pulley_diameter_in', value);
        updateInput('tail_pulley_preset', value as PulleyDiameterPreset);
      }
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

  const handleTailMatchesDriveChange = (matches: boolean) => {
    updateInput('tail_matches_drive', matches);
    if (matches) {
      updateInput('tail_pulley_diameter_in', drivePulleyDia);
      updateInput('tail_pulley_preset', inputs.drive_pulley_preset);
    }
  };

  const { handleToggle, isExpanded } = useAccordionState();

  return (
    <div className="space-y-4">
      {/* SECTION: Conveyor Type & Geometry */}
      <AccordionSection
        id="geometry"
        title="Conveyor Type & Geometry"
        isExpanded={isExpanded('geometry')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.geometry}
      >
        <div className="grid grid-cols-1 gap-4">
          {/* Bed Type */}
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

          {/* v1.10: Geometry Mode Selector */}
          <div>
            <label className="label">Geometry Input Mode</label>
            <div className="flex flex-wrap gap-2 sm:gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="geometry_mode"
                  checked={geometryMode === GeometryMode.LengthAngle}
                  onChange={() => handleGeometryModeChange(GeometryMode.LengthAngle)}
                  className="mr-2"
                />
                <span className="text-sm">Length + Angle</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="geometry_mode"
                  checked={geometryMode === GeometryMode.HorizontalAngle}
                  onChange={() => handleGeometryModeChange(GeometryMode.HorizontalAngle)}
                  className="mr-2"
                />
                <span className="text-sm">Horizontal + Angle</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="geometry_mode"
                  checked={geometryMode === GeometryMode.HorizontalTob}
                  onChange={() => handleGeometryModeChange(GeometryMode.HorizontalTob)}
                  className="mr-2"
                />
                <span className="text-sm">Horizontal + TOBs</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {geometryMode === GeometryMode.LengthAngle && 'Enter conveyor axis length (C-C) and incline angle.'}
              {geometryMode === GeometryMode.HorizontalAngle && 'Enter horizontal run and incline angle.'}
              {geometryMode === GeometryMode.HorizontalTob && 'Enter horizontal run and both Top of Belt heights.'}
            </p>
          </div>

          {/* Belt Width - always shown */}
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

          {/* L_ANGLE mode: Conveyor Length + Angle editable */}
          {geometryMode === GeometryMode.LengthAngle && (
            <>
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
                <p className="text-xs text-gray-500 mt-1">Axis length between pulley centers.</p>
              </div>

              <div>
                <label htmlFor="conveyor_incline_deg" className="label">
                  Incline Angle (degrees)
                </label>
                <input
                  type="number"
                  id="conveyor_incline_deg"
                  className="input"
                  value={inputs.conveyor_incline_deg ?? 0}
                  onChange={(e) =>
                    updateInput('conveyor_incline_deg', parseFloat(e.target.value) || 0)
                  }
                  step="0.1"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">0° = horizontal. Positive = incline toward drive.</p>
              </div>
            </>
          )}

          {/* H_ANGLE mode: Horizontal Run + Angle editable */}
          {geometryMode === GeometryMode.HorizontalAngle && (
            <>
              <div>
                <label htmlFor="horizontal_run_in" className="label">
                  Horizontal Run (in)
                </label>
                <input
                  type="number"
                  id="horizontal_run_in"
                  className="input"
                  value={inputs.horizontal_run_in ?? inputs.conveyor_length_cc_in}
                  onChange={(e) => updateInput('horizontal_run_in', parseFloat(e.target.value) || 0)}
                  step="1"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Horizontal distance between pulley centers.</p>
              </div>

              <div>
                <label htmlFor="conveyor_incline_deg" className="label">
                  Incline Angle (degrees)
                </label>
                <input
                  type="number"
                  id="conveyor_incline_deg"
                  className="input"
                  value={inputs.conveyor_incline_deg ?? 0}
                  onChange={(e) =>
                    updateInput('conveyor_incline_deg', parseFloat(e.target.value) || 0)
                  }
                  step="0.1"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">0° = horizontal. Positive = incline toward drive.</p>
              </div>
            </>
          )}

          {/* H_TOB mode: Horizontal Run + both TOBs editable */}
          {geometryMode === GeometryMode.HorizontalTob && (
            <>
              <div>
                <label htmlFor="horizontal_run_in" className="label">
                  Horizontal Run (in)
                </label>
                <input
                  type="number"
                  id="horizontal_run_in"
                  className="input"
                  value={inputs.horizontal_run_in ?? inputs.conveyor_length_cc_in}
                  onChange={(e) => updateInput('horizontal_run_in', parseFloat(e.target.value) || 0)}
                  step="1"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Horizontal distance between pulley centers.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tail_tob_in_geo" className="label">
                    Tail TOB (in)
                  </label>
                  <input
                    type="number"
                    id="tail_tob_in_geo"
                    className="input"
                    value={inputs.tail_tob_in ?? ''}
                    onChange={(e) =>
                      updateInput('tail_tob_in', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    step="0.25"
                    min="0"
                    placeholder="e.g., 36"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="drive_tob_in_geo" className="label">
                    Drive TOB (in)
                  </label>
                  <input
                    type="number"
                    id="drive_tob_in_geo"
                    className="input"
                    value={inputs.drive_tob_in ?? ''}
                    onChange={(e) =>
                      updateInput('drive_tob_in', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    step="0.25"
                    min="0"
                    placeholder="e.g., 42"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Top of Belt heights from floor. Incline angle will be calculated from these values.
              </p>
            </>
          )}

          {/* Derived Geometry Panel */}
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
                Derived Geometry
              </h4>
              <div className="text-xs text-gray-500">
                <span className="text-blue-600 font-medium">Blue</span> = derived
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <GeometryStat
                label="L (C-C)"
                value={`${derivedGeometry.L_cc_in.toFixed(1)}"`}
                derived={geometryMode !== GeometryMode.LengthAngle}
              />
              <GeometryStat
                label="H (Horizontal)"
                value={`${derivedGeometry.H_cc_in.toFixed(1)}"`}
                derived={geometryMode === GeometryMode.LengthAngle}
              />
              <GeometryStat
                label="Angle"
                value={Math.abs(derivedGeometry.theta_deg) < 0.01 ? '0.0°' : `${derivedGeometry.theta_deg.toFixed(1)}°`}
                subtext={Math.abs(derivedGeometry.theta_deg) < 0.01 ? 'Flat' : undefined}
                derived={geometryMode === GeometryMode.HorizontalTob}
              />
              <GeometryStat
                label="Rise"
                value={`${derivedGeometry.rise_in.toFixed(1)}"`}
                derived={true}
              />
            </div>
          </div>

          {/* Incline Warning Banner */}
          {(inputs.conveyor_incline_deg ?? 0) > 15 && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h4 className="text-sm font-medium text-yellow-800">
                    Steep Incline Advisory
                  </h4>
                  <p className="mt-1 text-sm text-yellow-700">
                    Incline of {inputs.conveyor_incline_deg}° exceeds typical limit for smooth belt.
                    Consider using cleats, textured belt, or sidewalls to prevent part slippage.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* SECTION: Belt & Pulleys (merged from previous "Pulleys & Belt Interface" and "Belt & Tracking") */}
      <AccordionSection
        id="beltPulleys"
        title="Belt & Pulleys"
        isExpanded={isExpanded('beltPulleys')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.beltPulleys}
      >
        <div className="grid grid-cols-1 gap-4">
          {/* ===== BELT SUBSECTION ===== */}
          <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
            Belt
          </h4>

          {/* Belt Selection */}
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

          {/* PIW/PIL Override Fields */}
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

          {/* ===== TRACKING SUBSECTION ===== */}
          <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mt-4">
            Tracking
          </h4>

          {/* Tracking Guidance Banner */}
          {inputs.conveyor_length_cc_in > 0 && inputs.belt_width_in > 0 && (() => {
            const guidance = calculateTrackingGuidance(inputs);
            const _showWarning = guidance.riskLevel !== TrackingRiskLevel.Low &&
              inputs.belt_tracking_method !== guidance.recommendation;
            void _showWarning;

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

          {/* Belt Tracking Method */}
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

          {/* V-guide profile */}
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

          {/* ===== PULLEYS SUBSECTION ===== */}
          <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mt-4">
            Pulleys
          </h4>

          {/* Drive Pulley Diameter */}
          <div>
            <label htmlFor="drive_pulley_preset" className="label">
              Drive Pulley Diameter (in)
            </label>
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
                    if (inputs.tail_matches_drive !== false) {
                      updateInput('tail_pulley_diameter_in', value);
                    }
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
                Drive pulley is below minimum required ({minPulleyDriveRequired}" for{' '}
                {isVGuided ? 'V-guided' : 'crowned'} tracking).
                {cleatSpacingMultiplier !== undefined && cleatSpacingMultiplier > 1 && (
                  <span className="block text-red-500 text-xs mt-0.5">
                    Includes {cleatSpacingMultiplier.toFixed(2)}x cleat spacing factor
                  </span>
                )}
              </p>
            )}
            {!drivePulleyBelowMinimum && minPulleyDriveRequired !== undefined && (
              <p className="text-xs text-gray-500 mt-1">
                Minimum required: {minPulleyDriveRequired}" ({isVGuided ? 'V-guided' : 'crowned'})
                {cleatSpacingMultiplier !== undefined && cleatSpacingMultiplier > 1 && (
                  <span className="block text-amber-600 text-xs mt-0.5">
                    Includes {cleatSpacingMultiplier.toFixed(2)}x cleat spacing factor
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Tail Matches Drive toggle */}
          <div>
            <label className="label flex items-center gap-2">
              <input
                type="checkbox"
                checked={inputs.tail_matches_drive !== false}
                onChange={(e) => handleTailMatchesDriveChange(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Tail pulley matches drive pulley
            </label>
          </div>

          {/* Tail Pulley Diameter - only show if different from drive */}
          {inputs.tail_matches_drive === false && (
            <div className="ml-4 pl-4 border-l-2 border-gray-200">
              <label htmlFor="tail_pulley_preset" className="label">
                Tail Pulley Diameter (in)
              </label>
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
                  Tail pulley is below minimum required ({minPulleyTailRequired}" for{' '}
                  {isVGuided ? 'V-guided' : 'crowned'} tracking).
                  {cleatSpacingMultiplier !== undefined && cleatSpacingMultiplier > 1 && (
                    <span className="block text-red-500 text-xs mt-0.5">
                      Includes {cleatSpacingMultiplier.toFixed(2)}x cleat spacing factor
                    </span>
                  )}
                </p>
              )}
              {!tailPulleyBelowMinimum && minPulleyTailRequired !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  Minimum required: {minPulleyTailRequired}" ({isVGuided ? 'V-guided' : 'crowned'})
                  {cleatSpacingMultiplier !== undefined && cleatSpacingMultiplier > 1 && (
                    <span className="block text-amber-600 text-xs mt-0.5">
                      Includes {cleatSpacingMultiplier.toFixed(2)}x cleat spacing factor
                    </span>
                  )}
                </p>
              )}
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

          {/* Shaft Diameter Mode */}
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

          {/* Manual shaft diameters */}
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

          {/* ===== CLEATS SUBSECTION ===== */}
          <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mt-4">
            Cleats
          </h4>

          {/* Belt Cleats */}
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

          {/* Cleat configuration */}
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
      </AccordionSection>

      {/* SECTION: Frame, Height & Support */}
      <AccordionSection
        id="frame"
        title="Frame, Height & Support"
        isExpanded={isExpanded('frame')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.frame}
      >
        <div className="grid grid-cols-1 gap-4">
          {/* Frame Height Mode */}
          <div>
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

          {/* Custom Frame Height */}
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

          {/* Derived Values Panel */}
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

          {/* v1.10: Height Configuration - Always available, not gated by support type */}
          {/* In H_TOB geometry mode, TOBs are entered in Geometry section */}
          {/* In other modes, show reference TOB input for leg height calculation */}
          {geometryMode !== GeometryMode.HorizontalTob && (
            <div className="border-t border-gray-200 pt-4 mt-2 space-y-4">
              <h4 className="text-md font-medium text-gray-900">Height Configuration</h4>
              <p className="text-xs text-gray-500">
                Specify Top of Belt height for floor-standing support calculation.
                {!derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type) &&
                  ' (Optional when using external/suspended support.)'}
              </p>

              {/* Reference TOB (simplified from old dual-mode system) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tail_tob_in_frame" className="label">
                    Tail TOB (in) <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="number"
                    id="tail_tob_in_frame"
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
                  <label htmlFor="drive_tob_in_frame" className="label">
                    Drive TOB (in) <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="number"
                    id="drive_tob_in_frame"
                    className="input"
                    value={inputs.drive_tob_in ?? ''}
                    onChange={(e) =>
                      updateInput('drive_tob_in', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    step="0.25"
                    min="0"
                    placeholder="e.g., 42"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Top of Belt heights from floor. If only one is entered, the other can be derived from incline angle.
              </p>

              {/* Adjustment Range - only show when legs are required */}
              {derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type) && (
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
                    ±adjustment for floor leveling. Default: 2&quot;. Large values may require special leg design.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* In H_TOB mode, just show the leg adjustment if legs are required */}
          {geometryMode === GeometryMode.HorizontalTob && derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type) && (
            <div className="border-t border-gray-200 pt-4 mt-2">
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
                  ±adjustment for floor leveling. TOB heights are set in Geometry section.
                </p>
              </div>
            </div>
          )}
        </div>
      </AccordionSection>
    </div>
  );
}

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
  ShaftDiameterMode,
  PULLEY_DIAMETER_PRESETS,
  FrameHeightMode,
  EndSupportType,
  derivedLegsRequired,
  PulleySurfaceType,
  GeometryMode,
  TRACKING_MODE_LABELS,
  TrackingMode,
  FrameConstructionType,
  SheetMetalGauge,
  StructuralChannelSeries,
  FRAME_CONSTRUCTION_TYPE_LABELS,
  SHEET_METAL_GAUGE_LABELS,
  STRUCTURAL_CHANNEL_SERIES_LABELS,
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
import BeltSelect from './BeltSelect';
import { BeltCatalogItem } from '../api/belts/route';
// PHASE 0: PulleySelect removed - pulley configuration moves to modal in Phase 2
import VGuideSelect from './VGuideSelect';
import { VGuideItem } from '../api/v-guides/route';
// PHASE 0: Legacy pulley catalog removed - stub function for compatibility
function getEffectiveDiameterByKey(_key: string | undefined): number | undefined {
  return undefined; // Legacy catalog removed - Phase 2 will use application_pulleys
}
import { getEffectiveMinPulleyDiameters, getCleatSpacingMultiplier } from '../../src/lib/belt-catalog';
import { formatGaugeWithThickness } from '../../src/lib/frame-catalog';
import AccordionSection, { useAccordionState } from './AccordionSection';
import { SectionCounts, SectionKey, Issue, IssueCode } from './useConfigureIssues';
import { useState, useEffect } from 'react';
import PulleyConfigModal from './PulleyConfigModal';
import { getBeltTrackingMode, getFaceProfileLabel } from '../../src/lib/pulley-tracking';
import { ApplicationPulley } from '../api/application-pulleys/route';
import {
  CleatCatalogItem,
  CleatCenterFactor,
  CleatPattern,
  CleatStyle,
  CleatCenters,
  CLEAT_PATTERN_LABELS,
  CLEAT_STYLES,
  CLEAT_STYLE_LABELS,
  CLEAT_CENTERS_OPTIONS,
  DEFAULT_CLEAT_MATERIAL_FAMILY,
  getUniqueCleatProfiles,
  getCleatSizesForProfile,
  getCleatPatternsForProfileSize,
  lookupCleatsMinPulleyDia,
  isDrillSipedSupported,
} from '../../src/lib/cleat-catalog';

interface TabConveyorPhysicalProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
  sectionCounts: Record<SectionKey, SectionCounts>;
  /** Get tracking recommendation issue (pre-calc) */
  getTrackingIssue: () => Issue | undefined;
  /** Get min pulley issues (pre-calc) */
  getMinPulleyIssues: () => Issue[];
  /** Application line ID for pulley configuration (calc_recipes.id) */
  applicationLineId?: string | null;
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

export default function TabConveyorPhysical({
  inputs,
  updateInput,
  sectionCounts,
  getTrackingIssue,
  getMinPulleyIssues,
  applicationLineId,
}: TabConveyorPhysicalProps) {
  // Handle belt selection - updates multiple fields at once
  // v1.11: Uses getEffectiveMinPulleyDiameters for material_profile precedence
  // v1.11 Phase 4: Also sets belt_cleat_method for cleat spacing multiplier
  // v1.26: Also sets belt_family for PU/PVC V-guide min pulley selection
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
      // v1.26: Set belt family for V-guide min pulley selection
      updateInput('belt_family', belt.belt_family);
    } else {
      updateInput('belt_piw', undefined);
      updateInput('belt_pil', undefined);
      updateInput('belt_min_pulley_dia_no_vguide_in', undefined);
      updateInput('belt_min_pulley_dia_with_vguide_in', undefined);
      updateInput('belt_cleat_method', undefined);
      updateInput('belt_family', undefined);
    }
  };

  // PHASE 0: Legacy pulley handlers removed - Phase 2 will use application_pulleys modal

  // v1.17: Override-based diameter resolution
  const driveOverride = Boolean(inputs.drive_pulley_manual_override);
  const tailOverride = Boolean(inputs.tail_pulley_manual_override);

  // Get catalog diameters using the same helper as formulas.ts
  const catalogDriveDia = getEffectiveDiameterByKey(inputs.head_pulley_catalog_key);
  const catalogTailDia = getEffectiveDiameterByKey(inputs.tail_pulley_catalog_key);

  // Manual diameters (only used when override is enabled)
  const manualDriveDia = inputs.drive_pulley_diameter_in;
  const manualTailDia = inputs.tail_pulley_diameter_in;

  // Effective diameters for display (matches formulas.ts logic)
  const drivePulleyDia = driveOverride ? manualDriveDia : catalogDriveDia;
  const tailPulleyDia = tailOverride ? manualTailDia : catalogTailDia;

  // Safe diameters for UI calculations (frame height, snub rollers display)
  // Uses 4" fallback for display only - actual calculations use strict logic in formulas.ts
  const safeDrivePulleyDia = drivePulleyDia ?? 4;
  const safeTailPulleyDia = tailPulleyDia ?? 4;

  // Get pre-calc tracking and min pulley issues from useConfigureIssues (no stealth calc needed)
  const trackingIssue = getTrackingIssue();
  const minPulleyIssues = getMinPulleyIssues();
  const drivePulleyIssue = minPulleyIssues.find(i => i.code === IssueCode.MIN_PULLEY_DRIVE_TOO_SMALL);
  const tailPulleyIssue = minPulleyIssues.find(i => i.code === IssueCode.MIN_PULLEY_TAIL_TOO_SMALL);

  // Compute min pulley and cleat multiplier locally for display (matches useConfigureIssues logic)
  const minPulleyBaseFromBelt = (inputs.belt_tracking_method === BeltTrackingMethod.VGuided || inputs.belt_tracking_method === 'V-guided')
    ? inputs.belt_min_pulley_dia_with_vguide_in
    : inputs.belt_min_pulley_dia_no_vguide_in;

  let minPulleyRequired: number | undefined;
  let cleatSpacingMultiplier: number | undefined;

  if (minPulleyBaseFromBelt !== undefined) {
    const cleatsEnabled = inputs.cleats_enabled === true;
    const isHotWeldedCleats = inputs.belt_cleat_method === 'hot_welded';

    if (cleatsEnabled && isHotWeldedCleats) {
      const cleatSpacingIn = inputs.cleat_spacing_in ?? 12;
      cleatSpacingMultiplier = getCleatSpacingMultiplier(cleatSpacingIn);
    }
    // Use issue data for min pulley required if available, otherwise compute
    minPulleyRequired = drivePulleyIssue?.minPulleyData?.requiredIn ?? tailPulleyIssue?.minPulleyData?.requiredIn ?? minPulleyBaseFromBelt;
  }

  // Derive warning states from issues (used in legacy override section)
  const drivePulleyBelowMinimum = !!drivePulleyIssue;
  const tailPulleyBelowMinimum = !!tailPulleyIssue;

  // Pulley configuration modal state
  const [isPulleyModalOpen, setIsPulleyModalOpen] = useState(false);
  const [applicationPulleys, setApplicationPulleys] = useState<ApplicationPulley[]>([]);
  const [pulleysLoading, setPulleysLoading] = useState(false);

  // Derived tracking mode for display
  const trackingMode = getBeltTrackingMode({ belt_tracking_method: inputs.belt_tracking_method });
  const trackingLabel = getFaceProfileLabel(trackingMode);

  // Load existing pulley configurations when applicationLineId changes
  useEffect(() => {
    async function loadPulleys() {
      if (!applicationLineId) {
        setApplicationPulleys([]);
        return;
      }
      setPulleysLoading(true);
      try {
        const res = await fetch(`/api/application-pulleys?line_id=${applicationLineId}`);
        if (res.ok) {
          const data = await res.json();
          setApplicationPulleys(data);
        }
      } catch (err) {
        console.error('Failed to load pulleys:', err);
      } finally {
        setPulleysLoading(false);
      }
    }
    loadPulleys();
  }, [applicationLineId]);

  // Get pulley by position
  const drivePulley = applicationPulleys.find((p) => p.position === 'DRIVE');
  const tailPulley = applicationPulleys.find((p) => p.position === 'TAIL');

  // Sync application pulley geometry to inputs for calculation engine
  // This ensures getEffectivePulleyDiameters() picks up the application_pulleys values
  useEffect(() => {
    // Drive pulley sync
    if (drivePulley?.finished_od_in) {
      // Use finished_od as the effective diameter
      if (inputs.drive_pulley_diameter_in !== drivePulley.finished_od_in) {
        updateInput('drive_pulley_diameter_in', drivePulley.finished_od_in);
        updateInput('pulley_diameter_in', drivePulley.finished_od_in);
      }
    }
    if (drivePulley?.shell_od_in) {
      if (inputs.drive_tube_od_in !== drivePulley.shell_od_in) {
        updateInput('drive_tube_od_in', drivePulley.shell_od_in);
      }
    }
    if (drivePulley?.shell_wall_in) {
      if (inputs.drive_tube_wall_in !== drivePulley.shell_wall_in) {
        updateInput('drive_tube_wall_in', drivePulley.shell_wall_in);
      }
    }

    // Tail pulley sync
    if (tailPulley?.finished_od_in) {
      if (inputs.tail_pulley_diameter_in !== tailPulley.finished_od_in) {
        updateInput('tail_pulley_diameter_in', tailPulley.finished_od_in);
      }
    }
    if (tailPulley?.shell_od_in) {
      if (inputs.tail_tube_od_in !== tailPulley.shell_od_in) {
        updateInput('tail_tube_od_in', tailPulley.shell_od_in);
      }
    }
    if (tailPulley?.shell_wall_in) {
      if (inputs.tail_tube_wall_in !== tailPulley.shell_wall_in) {
        updateInput('tail_tube_wall_in', tailPulley.shell_wall_in);
      }
    }
  }, [drivePulley, tailPulley]);

  // Refresh pulleys after modal save
  const handlePulleySave = async () => {
    if (!applicationLineId) return;
    try {
      const res = await fetch(`/api/application-pulleys?line_id=${applicationLineId}`);
      if (res.ok) {
        const data = await res.json();
        setApplicationPulleys(data);
      }
    } catch (err) {
      console.error('Failed to refresh pulleys:', err);
    }
  };

  // Compute derived frame height and roller values (using safe diameters for UI display)
  const effectiveFrameHeight = calculateEffectiveFrameHeight(
    inputs.frame_height_mode ?? FrameHeightMode.Standard,
    safeDrivePulleyDia,
    inputs.custom_frame_height_in
  );
  const requiresSnubRollers = calculateRequiresSnubRollers(
    effectiveFrameHeight,
    safeDrivePulleyDia,
    safeTailPulleyDia
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
        const tailTob = centerlineToTob(defaultTailCl, safeTailPulleyDia);
        updateInput('tail_tob_in', tailTob);
      }
      if (inputs.drive_tob_in === undefined) {
        // Compute drive TOB from current geometry
        const rise = derivedGeometry.rise_in;
        const defaultTailCl = 36;
        const driveCl = defaultTailCl + rise;
        const driveTob = centerlineToTob(driveCl, safeDrivePulleyDia);
        updateInput('drive_tob_in', driveTob);
      }
    }
  };

  const { handleToggle, isExpanded } = useAccordionState();

  // v1.23: Cleat catalog state
  const [cleatCatalog, setCleatCatalog] = useState<CleatCatalogItem[]>([]);
  const [cleatCenterFactors, setCleatCenterFactors] = useState<CleatCenterFactor[]>([]);
  const [cleatCatalogLoading, setCleatCatalogLoading] = useState(true);

  // Fetch cleat catalog data on mount
  useEffect(() => {
    const fetchCleatCatalog = async () => {
      try {
        const response = await fetch('/api/cleats');
        if (response.ok) {
          const data = await response.json();
          setCleatCatalog(data.catalog || []);
          setCleatCenterFactors(data.centerFactors || []);
        }
      } catch (error) {
        console.error('Failed to fetch cleat catalog:', error);
      } finally {
        setCleatCatalogLoading(false);
      }
    };
    fetchCleatCatalog();
  }, []);

  // v1.23: Derived cleat dropdown options
  const cleatProfiles = getUniqueCleatProfiles(cleatCatalog);
  const cleatSizes = inputs.cleat_profile
    ? getCleatSizesForProfile(cleatCatalog, inputs.cleat_profile)
    : [];
  const cleatPatterns = inputs.cleat_profile && inputs.cleat_size
    ? getCleatPatternsForProfileSize(cleatCatalog, inputs.cleat_profile, inputs.cleat_size)
    : [];

  // v1.23: Check if drill & siped is supported for current selection
  const drillSipedSupported =
    inputs.cleat_profile && inputs.cleat_size && inputs.cleat_pattern
      ? isDrillSipedSupported(
          cleatCatalog,
          DEFAULT_CLEAT_MATERIAL_FAMILY,
          inputs.cleat_profile,
          inputs.cleat_size,
          inputs.cleat_pattern as CleatPattern
        )
      : false;

  // v1.23: Compute cleats min pulley diameter for readout
  const cleatsMinPulleyResult =
    inputs.cleats_mode === 'cleated' &&
    inputs.cleat_profile &&
    inputs.cleat_size &&
    inputs.cleat_pattern &&
    inputs.cleat_style &&
    inputs.cleat_centers_in
      ? lookupCleatsMinPulleyDia(
          cleatCatalog,
          cleatCenterFactors,
          DEFAULT_CLEAT_MATERIAL_FAMILY,
          inputs.cleat_profile,
          inputs.cleat_size,
          inputs.cleat_pattern as CleatPattern,
          inputs.cleat_style as CleatStyle,
          inputs.cleat_centers_in as CleatCenters
        )
      : null;

  // v1.23: Handle cleats_mode change (syncs with cleats_enabled)
  const handleCleatsModeChange = (mode: 'none' | 'cleated') => {
    updateInput('cleats_mode', mode);
    updateInput('cleats_enabled', mode === 'cleated');

    // Set defaults when enabling cleats
    if (mode === 'cleated') {
      if (!inputs.cleat_centers_in) updateInput('cleat_centers_in', 12);
      if (!inputs.cleat_style) updateInput('cleat_style', 'SOLID');
      if (!inputs.cleat_material_family) updateInput('cleat_material_family', DEFAULT_CLEAT_MATERIAL_FAMILY);
    }
  };

  // v1.23: Handle cleat profile change (cascading dropdown reset)
  const handleCleatProfileChange = (profile: string | undefined) => {
    updateInput('cleat_profile', profile);
    // Reset dependent dropdowns
    updateInput('cleat_size', undefined);
    updateInput('cleat_pattern', undefined);
  };

  // v1.23: Handle cleat size change (cascading dropdown reset)
  const handleCleatSizeChange = (size: string | undefined) => {
    updateInput('cleat_size', size);
    // Reset dependent dropdown
    updateInput('cleat_pattern', undefined);
  };

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

          {/* Tracking Recommendation Banner (pre-calc from useConfigureIssues) */}
          {trackingIssue?.trackingData && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h4 className="text-sm font-medium text-blue-900">
                    Recommended: {TRACKING_MODE_LABELS[trackingIssue.trackingData.tracking_mode_recommended as TrackingMode] ?? trackingIssue.trackingData.tracking_mode_recommended}
                  </h4>
                  {trackingIssue.trackingData.tracking_recommendation_rationale && (
                    <p className="mt-1 text-sm text-blue-800">
                      {trackingIssue.trackingData.tracking_recommendation_rationale}
                    </p>
                  )}
                  {trackingIssue.trackingData.tracking_recommendation_note && (
                    <p className="mt-1 text-xs text-blue-700 italic">
                      {trackingIssue.trackingData.tracking_recommendation_note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

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

          {/* V-guide profile (v1.22: now using catalog-based selection) */}
          {/* v1.26: Also populates V-guide min pulley values for PU/PVC calculation */}
          {(inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
            inputs.belt_tracking_method === 'V-guided') && (
            <div>
              <label htmlFor="v_guide_key" className="label">
                V-Guide
              </label>
              <VGuideSelect
                id="v_guide_key"
                value={inputs.v_guide_key}
                onChange={(key: string | undefined, vguide: VGuideItem | undefined) => {
                  updateInput('v_guide_key', key);
                  // v1.26: Populate V-guide min pulley values for calculation
                  if (vguide) {
                    updateInput('vguide_min_pulley_dia_solid_in', vguide.min_pulley_dia_solid_in);
                    updateInput('vguide_min_pulley_dia_notched_in', vguide.min_pulley_dia_notched_in);
                    updateInput('vguide_min_pulley_dia_solid_pu_in', vguide.min_pulley_dia_solid_pu_in);
                    updateInput('vguide_min_pulley_dia_notched_pu_in', vguide.min_pulley_dia_notched_pu_in);
                  } else {
                    updateInput('vguide_min_pulley_dia_solid_in', undefined);
                    updateInput('vguide_min_pulley_dia_notched_in', undefined);
                    updateInput('vguide_min_pulley_dia_solid_pu_in', undefined);
                    updateInput('vguide_min_pulley_dia_notched_pu_in', undefined);
                  }
                }}
                required
              />
            </div>
          )}

          {/* ===== v1.23: CLEATS SUBSECTION (moved here from after Pulleys) ===== */}
          <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mt-4">
            Cleats
          </h4>

          {/* Belt Cleats Mode Selection */}
          <div>
            <label className="label">Belt Cleats</label>
            <div className="flex gap-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="cleats_mode"
                  checked={inputs.cleats_mode !== 'cleated'}
                  onChange={() => handleCleatsModeChange('none')}
                  className="mr-2"
                />
                None
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="cleats_mode"
                  checked={inputs.cleats_mode === 'cleated'}
                  onChange={() => handleCleatsModeChange('cleated')}
                  className="mr-2"
                />
                Add Cleats
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Cleats help retain product on inclines. Affects minimum pulley diameter constraints.
            </p>
          </div>

          {/* Cleat configuration (v1.23: catalog-based selection) */}
          {inputs.cleats_mode === 'cleated' && (
            <div className="ml-4 pl-4 border-l-2 border-blue-200 mt-4 space-y-4">
              {/* Cleat Profile */}
              <div>
                <label htmlFor="cleat_profile" className="label">
                  Cleat Profile
                </label>
                <select
                  id="cleat_profile"
                  className="input"
                  value={inputs.cleat_profile ?? ''}
                  onChange={(e) => handleCleatProfileChange(e.target.value || undefined)}
                  disabled={cleatCatalogLoading}
                >
                  <option value="">Select profile...</option>
                  {cleatProfiles.map((profile) => (
                    <option key={profile} value={profile}>
                      {profile}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cleat Size (cascading, filtered by profile) */}
              <div>
                <label htmlFor="cleat_size" className="label">
                  Cleat Size
                </label>
                <select
                  id="cleat_size"
                  className="input"
                  value={inputs.cleat_size ?? ''}
                  onChange={(e) => handleCleatSizeChange(e.target.value || undefined)}
                  disabled={!inputs.cleat_profile || cleatSizes.length === 0}
                >
                  <option value="">Select size...</option>
                  {cleatSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cleat Pattern (cascading, filtered by profile + size) */}
              <div>
                <label htmlFor="cleat_pattern" className="label">
                  Cleat Pattern
                </label>
                <select
                  id="cleat_pattern"
                  className="input"
                  value={inputs.cleat_pattern ?? ''}
                  onChange={(e) => updateInput('cleat_pattern', e.target.value || undefined)}
                  disabled={!inputs.cleat_size || cleatPatterns.length === 0}
                >
                  <option value="">Select pattern...</option>
                  {cleatPatterns.map((pattern) => (
                    <option key={pattern} value={pattern}>
                      {CLEAT_PATTERN_LABELS[pattern]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cleat Centers */}
              <div>
                <label htmlFor="cleat_centers_in" className="label">
                  Cleat Centers (in)
                </label>
                <select
                  id="cleat_centers_in"
                  className="input"
                  value={inputs.cleat_centers_in ?? 12}
                  onChange={(e) => updateInput('cleat_centers_in', parseInt(e.target.value))}
                >
                  {CLEAT_CENTERS_OPTIONS.map((centers) => (
                    <option key={centers} value={centers}>
                      {centers}" spacing
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Tighter spacing increases min pulley diameter constraint.
                </p>
              </div>

              {/* Cleat Style */}
              <div>
                <label htmlFor="cleat_style" className="label">
                  Cleat Style
                </label>
                <select
                  id="cleat_style"
                  className="input"
                  value={inputs.cleat_style ?? 'SOLID'}
                  onChange={(e) => updateInput('cleat_style', e.target.value)}
                >
                  {CLEAT_STYLES.map((style) => (
                    <option
                      key={style}
                      value={style}
                      disabled={style === 'DRILL_SIPED_1IN' && !drillSipedSupported}
                    >
                      {CLEAT_STYLE_LABELS[style]}
                      {style === 'DRILL_SIPED_1IN' && !drillSipedSupported && ' (not available)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drill & Siped Caution Info Box */}
              {inputs.cleat_style === 'DRILL_SIPED_1IN' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-amber-800">
                        Drill & Siped Cleats
                      </h4>
                      <p className="mt-1 text-sm text-amber-700">
                        Perforated cleats have reduced structural strength. Recommended for drainage applications only.
                        May require larger pulley diameters.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Cleats Constraint Readout Panel */}
              {cleatsMinPulleyResult && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Cleats Constraint
                  </h4>
                  {cleatsMinPulleyResult.success ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base @ 12":</span>
                        <span className="font-medium text-gray-900">
                          {cleatsMinPulleyResult.baseMinDia12In?.toFixed(1)}"
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Centers Factor:</span>
                        <span className="font-medium text-gray-900">
                          {cleatsMinPulleyResult.centersFactor.toFixed(2)}x
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-between border-t border-gray-200 pt-1 mt-1">
                        <span className="text-gray-700 font-medium">Min Pulley:</span>
                        <span className="font-bold text-blue-600">
                          {cleatsMinPulleyResult.roundedMinDia?.toFixed(1)}"
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">{cleatsMinPulleyResult.error}</p>
                  )}
                </div>
              )}

              {/* Advanced: Legacy Cleat Fields */}
              <details className="mt-4">
                <summary className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800">
                  Advanced / Legacy Fields
                </summary>
                <div className="mt-3 space-y-4 pl-2 border-l-2 border-gray-200">
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
                      placeholder="e.g., 12"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Center-to-center spacing (legacy field, use Centers dropdown above)
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
                      placeholder="e.g., 0.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Distance from belt edge to cleat end (0" - 12")
                    </p>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* ===== PULLEYS SUBSECTION ===== */}
          <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mt-4">
            Pulleys
          </h4>

          {/* Tracking Mode Display (read-only from belt) */}
          <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm">
            <span className="text-blue-700 font-medium">Tracking (from Belt): {trackingLabel}</span>
            {trackingMode === 'V_GUIDED' && inputs.v_guide_key && (
              <span className="ml-2 text-blue-600">({inputs.v_guide_key})</span>
            )}
          </div>

          {/* Pulley Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DRIVE PULLEY CARD */}
            <div className={`border rounded-lg p-4 ${drivePulley ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900">Head/Drive Pulley</h5>
                {drivePulley && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Configured</span>
                )}
              </div>

              {pulleysLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : drivePulley ? (
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-600">Style:</span> <span className="font-medium">{drivePulley.style_key}</span></div>
                  <div><span className="text-gray-600">Tracking:</span> <span className="font-medium">{trackingLabel}</span></div>
                  <div><span className="text-gray-600">Lagging:</span> <span className="font-medium">
                    {drivePulley.lagging_type === 'NONE' ? 'None' : `${drivePulley.lagging_type} (${drivePulley.lagging_thickness_in || 0}")`}
                  </span></div>
                  {drivePulley.finished_od_in && (
                    <div><span className="text-gray-600">Finished OD:</span> <span className="font-medium text-blue-600">{drivePulley.finished_od_in}"</span></div>
                  )}
                  {drivePulley.face_width_in && (
                    <div><span className="text-gray-600">Face Width:</span> <span className="font-medium">{drivePulley.face_width_in}"</span></div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-3">Not configured</p>
              )}

              {!applicationLineId ? (
                <p className="text-xs text-amber-600 mt-3">Save application to configure pulleys</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPulleyModalOpen(true)}
                  className="mt-3 w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {drivePulley ? 'Edit Pulleys' : 'Configure Pulleys'}
                </button>
              )}
            </div>

            {/* TAIL PULLEY CARD */}
            <div className={`border rounded-lg p-4 ${tailPulley ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900">Tail Pulley</h5>
                {tailPulley && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Configured</span>
                )}
              </div>

              {pulleysLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : tailPulley ? (
                <div className="space-y-1 text-sm">
                  <div><span className="text-gray-600">Style:</span> <span className="font-medium">{tailPulley.style_key}</span></div>
                  <div><span className="text-gray-600">Tracking:</span> <span className="font-medium">{trackingLabel}</span></div>
                  <div><span className="text-gray-600">Lagging:</span> <span className="font-medium">
                    {tailPulley.lagging_type === 'NONE' ? 'None' : `${tailPulley.lagging_type} (${tailPulley.lagging_thickness_in || 0}")`}
                  </span></div>
                  {tailPulley.finished_od_in && (
                    <div><span className="text-gray-600">Finished OD:</span> <span className="font-medium text-blue-600">{tailPulley.finished_od_in}"</span></div>
                  )}
                  {tailPulley.face_width_in && (
                    <div><span className="text-gray-600">Face Width:</span> <span className="font-medium">{tailPulley.face_width_in}"</span></div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-3">Not configured</p>
              )}

              {!applicationLineId ? (
                <p className="text-xs text-amber-600 mt-3">Save application to configure pulleys</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPulleyModalOpen(true)}
                  className="mt-3 w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {tailPulley ? 'Edit Pulleys' : 'Configure Pulleys'}
                </button>
              )}
            </div>
          </div>

          {/* Min Pulley Requirements */}
          {minPulleyRequired !== undefined && (
            <div className="text-xs text-gray-600 bg-gray-100 rounded px-3 py-2">
              <span className="font-medium">Min pulley diameter:</span> {minPulleyRequired}" ({trackingLabel})
              {cleatSpacingMultiplier !== undefined && cleatSpacingMultiplier > 1 && (
                <span className="ml-2 text-amber-600">
                  (includes {cleatSpacingMultiplier.toFixed(2)}x cleat factor)
                </span>
              )}
            </div>
          )}

          {/* Legacy Manual Override Section - collapsed by default */}
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
                    onChange={(e) => updateInput('drive_pulley_manual_override', e.target.checked)}
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
                        updateInput('drive_pulley_diameter_in', value);
                        updateInput('pulley_diameter_in', value);
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
                    onChange={(e) => updateInput('tail_pulley_manual_override', e.target.checked)}
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
                        updateInput('tail_pulley_diameter_in', value);
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
          {/* ===== v1.14: FRAME CONSTRUCTION SUBSECTION ===== */}
          <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2">
            Frame Construction
          </h4>

          {/* Frame Construction Type */}
          <div>
            <label htmlFor="frame_construction_type" className="label">
              Frame Construction Type
            </label>
            <select
              id="frame_construction_type"
              className="input"
              value={inputs.frame_construction_type ?? 'sheet_metal'}
              onChange={(e) => {
                const type = e.target.value as FrameConstructionType;
                updateInput('frame_construction_type', type);
                // Clear related fields when changing type
                if (type !== 'sheet_metal') {
                  updateInput('frame_sheet_metal_gauge', undefined);
                }
                if (type !== 'structural_channel') {
                  updateInput('frame_structural_channel_series', undefined);
                }
              }}
            >
              {(Object.keys(FRAME_CONSTRUCTION_TYPE_LABELS) as FrameConstructionType[]).map((type) => (
                <option key={type} value={type}>
                  {FRAME_CONSTRUCTION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Sheet metal for standard builds. Structural channel for heavy-duty applications.
            </p>
          </div>

          {/* Sheet Metal Gauge (conditional) */}
          {(inputs.frame_construction_type === 'sheet_metal' || inputs.frame_construction_type === undefined) && (
            <div className="ml-4 pl-4 border-l-2 border-gray-200">
              <label htmlFor="frame_sheet_metal_gauge" className="label">
                Sheet Metal Gauge <span className="text-gray-500">(required)</span>
              </label>
              <select
                id="frame_sheet_metal_gauge"
                className="input"
                value={inputs.frame_sheet_metal_gauge ?? '12_GA'}
                onChange={(e) => updateInput('frame_sheet_metal_gauge', e.target.value as SheetMetalGauge)}
                required
              >
                {(Object.keys(SHEET_METAL_GAUGE_LABELS) as SheetMetalGauge[]).map((gauge) => (
                  <option key={gauge} value={gauge}>
                    {formatGaugeWithThickness(gauge)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Lower gauge = thicker material. 12 ga is standard for most applications.
              </p>
            </div>
          )}

          {/* Structural Channel Series (conditional) */}
          {inputs.frame_construction_type === 'structural_channel' && (
            <div className="ml-4 pl-4 border-l-2 border-gray-200">
              <label htmlFor="frame_structural_channel_series" className="label">
                Channel Series <span className="text-gray-500">(required)</span>
              </label>
              <select
                id="frame_structural_channel_series"
                className="input"
                value={inputs.frame_structural_channel_series ?? 'C4'}
                onChange={(e) => updateInput('frame_structural_channel_series', e.target.value as StructuralChannelSeries)}
                required
              >
                {(Object.keys(STRUCTURAL_CHANNEL_SERIES_LABELS) as StructuralChannelSeries[]).map((series) => (
                  <option key={series} value={series}>
                    {STRUCTURAL_CHANNEL_SERIES_LABELS[series]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                C-channels for standard structural frames. MC-channels for heavier loads.
              </p>
            </div>
          )}

          {/* Special Construction Note */}
          {inputs.frame_construction_type === 'special' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Special Construction:</strong> Frame thickness is not auto-calculated.
                Between-frame outputs may be limited. Verify build intent with engineering.
              </p>
            </div>
          )}

          {/* Pulley End to Frame Inside */}
          <div>
            <label htmlFor="pulley_end_to_frame_inside_in" className="label">
              Pulley End to Frame Inside (in)
            </label>
            <input
              type="number"
              id="pulley_end_to_frame_inside_in"
              className="input"
              value={inputs.pulley_end_to_frame_inside_in ?? 0.5}
              onChange={(e) =>
                updateInput('pulley_end_to_frame_inside_in', parseFloat(e.target.value) || 0)
              }
              step="0.125"
              min="0"
              max="6"
            />
            <p className="text-xs text-gray-500 mt-1">
              Distance from pulley face end to inside of frame side. Used for between-frame (BF) calculations.
            </p>
          </div>

          {/* ===== FRAME HEIGHT SUBSECTION ===== */}
          <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mt-4">
            Frame Height
          </h4>

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

      {/* Pulley Configuration Modal */}
      <PulleyConfigModal
        isOpen={isPulleyModalOpen}
        onClose={() => setIsPulleyModalOpen(false)}
        applicationLineId={applicationLineId || null}
        beltTrackingMethod={inputs.belt_tracking_method}
        vGuideKey={inputs.v_guide_key}
        beltWidthIn={inputs.belt_width_in}
        onSave={handlePulleySave}
      />
    </div>
  );
}

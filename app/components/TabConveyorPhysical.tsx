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
  SliderbedOutputs,
  BeltTrackingMethod,
  ShaftDiameterMode,
  PULLEY_DIAMETER_PRESETS,
  FrameHeightMode,
  EndSupportType,
  derivedLegsRequired,
  // v1.24: PulleySurfaceType removed - now per-pulley via PulleyConfigModal
  GeometryMode,
  TRACKING_MODE_LABELS,
  TrackingMode,
  FrameConstructionType,
  SheetMetalGauge,
  StructuralChannelSeries,
  FRAME_CONSTRUCTION_TYPE_LABELS,
  SHEET_METAL_GAUGE_LABELS,
  STRUCTURAL_CHANNEL_SERIES_LABELS,
  // v1.29: Return Support
  ReturnFrameStyle,
  ReturnSnubMode,
  RETURN_FRAME_STYLE_LABELS,
  // UI Cleanup: Lacing moved from Build Options
  LacingStyle,
  LacingMaterial,
} from '../../src/models/sliderbed_v1/schema';
import {
  calculateFrameHeightWithBreakdown,
  getEffectiveCleatHeight,
  FRAME_HEIGHT_CONSTANTS,
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
import { useState, useEffect, useMemo } from 'react';
import PulleyConfigModal from './PulleyConfigModal';
import CleatsConfigModal from './CleatsConfigModal';
import ReturnSupportModal, { computeSnubsEnabled, computeReturnSpan, computeGravityRollerCenters } from './ReturnSupportModal';
import { getBeltTrackingMode, getFaceProfileLabel } from '../../src/lib/pulley-tracking';
import { ApplicationPulley } from '../api/application-pulleys/route';
import {
  CLEAT_PATTERN_LABELS,
  lookupCleatsMinPulleyDia,
  CleatPattern,
  CleatStyle,
  DEFAULT_CLEAT_MATERIAL_FAMILY,
} from '../../src/lib/cleat-catalog';
import { useCleatCatalog } from '../../src/lib/hooks/useCleatCatalog';

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
  /** Get merged issues for a section (pre-calc + post-calc, de-duped) */
  getMergedIssuesForSection?: (sectionKey: SectionKey) => Issue[];
  /** Calculation outputs for displaying calculated shaft values (v1.37) */
  outputs?: SliderbedOutputs | null;
  /** v1.35: Toast notification callback */
  showToast?: (message: string) => void;
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
  getMergedIssuesForSection,
  outputs,
  showToast,
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

  // v1.24: Compute governing min pulley diameter = max(belt, vguide, cleats)
  const isVGuided = inputs.belt_tracking_method === BeltTrackingMethod.VGuided || inputs.belt_tracking_method === 'V-guided';
  const minPulleyBaseFromBelt = isVGuided
    ? inputs.belt_min_pulley_dia_with_vguide_in
    : inputs.belt_min_pulley_dia_no_vguide_in;

  // V-guide min pulley (PU takes precedence if available for PU belts)
  const beltFamily = inputs.belt_family;
  let vguideMinPulley: number | undefined;
  if (isVGuided) {
    if (beltFamily === 'PU' && inputs.vguide_min_pulley_dia_solid_pu_in != null) {
      vguideMinPulley = inputs.vguide_min_pulley_dia_solid_pu_in;
    } else {
      vguideMinPulley = inputs.vguide_min_pulley_dia_solid_in;
    }
  }

  let minPulleyRequired: number | undefined;
  let cleatSpacingMultiplier: number | undefined;
  let governingSource: 'belt' | 'vguide' | 'cleats' | undefined;

  // Start with belt minimum
  let beltMinWithCleats = minPulleyBaseFromBelt;
  if (minPulleyBaseFromBelt !== undefined) {
    const cleatsEnabled = inputs.cleats_enabled === true;
    const isHotWeldedCleats = inputs.belt_cleat_method === 'hot_welded';

    if (cleatsEnabled && isHotWeldedCleats) {
      const cleatSpacingIn = inputs.cleat_spacing_in ?? 12;
      cleatSpacingMultiplier = getCleatSpacingMultiplier(cleatSpacingIn);
      beltMinWithCleats = minPulleyBaseFromBelt * (cleatSpacingMultiplier ?? 1);
    }
  }

  // Compute governing minimum = max(belt with cleats, vguide)
  const candidates = [
    { value: beltMinWithCleats, source: 'belt' as const },
    { value: vguideMinPulley, source: 'vguide' as const },
  ].filter(c => c.value !== undefined && c.value > 0);

  if (candidates.length > 0) {
    const governing = candidates.reduce((max, c) => (c.value! > (max.value ?? 0) ? c : max));
    minPulleyRequired = governing.value;
    governingSource = governing.source;
  }

  // Derive warning states from issues (used in legacy override section)
  const drivePulleyBelowMinimum = !!drivePulleyIssue;
  const tailPulleyBelowMinimum = !!tailPulleyIssue;

  // Pulley configuration modal state
  const [isPulleyModalOpen, setIsPulleyModalOpen] = useState(false);
  const [applicationPulleys, setApplicationPulleys] = useState<ApplicationPulley[]>([]);
  const [pulleysLoading, setPulleysLoading] = useState(false);

  // v1.24: Cleats configuration modal state
  const [isCleatsModalOpen, setIsCleatsModalOpen] = useState(false);

  // v1.29: Return Support modal state
  const [isReturnSupportModalOpen, setIsReturnSupportModalOpen] = useState(false);

  // v1.37: Shaft edit state (inline edit, not modal)
  const [isShaftEditing, setIsShaftEditing] = useState(false);

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
    // v1.28: Sync face width for results alignment
    if (drivePulley?.face_width_in) {
      if (inputs.drive_pulley_face_width_in !== drivePulley.face_width_in) {
        updateInput('drive_pulley_face_width_in', drivePulley.face_width_in);
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
    // v1.28: Sync tail face width for display
    if (tailPulley?.face_width_in) {
      if (inputs.tail_pulley_face_width_in !== tailPulley.face_width_in) {
        updateInput('tail_pulley_face_width_in', tailPulley.face_width_in);
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

  // v1.35: Auto-switch away from Low Profile when cleats become enabled
  // Low Profile requires snub rollers, and cleated belts cannot run on snubs
  useEffect(() => {
    const isLowProfile = inputs.frame_height_mode === FrameHeightMode.LowProfile ||
                         inputs.frame_height_mode === 'Low Profile';
    const hasCleats = inputs.cleats_enabled === true;

    if (isLowProfile && hasCleats) {
      // Auto-switch to Standard
      updateInput('frame_height_mode', FrameHeightMode.Standard);
      showToast?.('Switched to Standard: Low Profile not allowed with cleats.');
    }
  }, [inputs.cleats_enabled, inputs.frame_height_mode]);

  // Compute derived frame height and roller values
  // v1.34: Use actual pulley OD from applicationPulleys (same source as pulley cards)
  // Priority: applicationPulleys.finished_od_in > inputs synced values > legacy catalog > 4" fallback
  const actualDriveOd = drivePulley?.finished_od_in ?? inputs.drive_pulley_diameter_in ?? safeDrivePulleyDia;
  const actualTailOd = tailPulley?.finished_od_in ?? inputs.tail_pulley_diameter_in ?? safeTailPulleyDia;

  // v1.33: Use new breakdown calculation that includes cleats, largest pulley, and return roller
  const cleatsEnabledForFrame = inputs.cleats_enabled === true;
  const effectiveCleatHeightForFrame = getEffectiveCleatHeight(
    cleatsEnabledForFrame,
    inputs.cleat_height_in,
    inputs.cleat_size
  );
  const returnRollerDiameter = FRAME_HEIGHT_CONSTANTS.DEFAULT_RETURN_ROLLER_DIAMETER_IN;

  // v1.36: Single explicit clearance (default 0.50")
  const frameClearance = inputs.frame_clearance_in ?? 0.5;

  const frameHeightBreakdown = calculateFrameHeightWithBreakdown(
    actualDriveOd,
    actualTailOd,
    effectiveCleatHeightForFrame,
    returnRollerDiameter,
    inputs.frame_height_mode,
    inputs.custom_frame_height_in,
    frameClearance
  );

  // v1.34: Extract both required and reference heights
  const requiredFrameHeight = frameHeightBreakdown.required_total_in;
  const referenceFrameHeight = frameHeightBreakdown.reference_total_in;

  // v1.35: Removed snub/gravity roller calculations from Frame section
  // ReturnSupportModal is the single owner of return path configuration

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

  // v1.24: Cleat catalog and handlers moved to CleatsConfigModal

  // Load cleat catalog for min pulley display
  const { cleatCatalog, cleatCenterFactors } = useCleatCatalog();

  // Compute cleats min pulley diameter for display under summary card
  const cleatsMinPulleyDiaIn = useMemo(() => {
    if (
      inputs.cleats_mode !== 'cleated' ||
      !inputs.cleat_profile ||
      !inputs.cleat_size ||
      !inputs.cleat_pattern ||
      !inputs.cleat_style ||
      !inputs.cleat_centers_in
    ) {
      return null;
    }
    const result = lookupCleatsMinPulleyDia(
      cleatCatalog,
      cleatCenterFactors,
      DEFAULT_CLEAT_MATERIAL_FAMILY,
      inputs.cleat_profile,
      inputs.cleat_size,
      inputs.cleat_pattern as CleatPattern,
      inputs.cleat_style as CleatStyle,
      inputs.cleat_centers_in
    );
    return result.success ? result.roundedMinDia : null;
  }, [
    cleatCatalog,
    cleatCenterFactors,
    inputs.cleats_mode,
    inputs.cleat_profile,
    inputs.cleat_size,
    inputs.cleat_pattern,
    inputs.cleat_style,
    inputs.cleat_centers_in,
  ]);

  return (
    <div className="space-y-4">
      {/* SECTION: Conveyor Type & Geometry */}
      <AccordionSection
        id="geometry"
        title="Conveyor Type & Geometry"
        isExpanded={isExpanded('geometry')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.geometry}
        issues={getMergedIssuesForSection?.('geometry')}
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
        issues={getMergedIssuesForSection?.('beltPulleys')}
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
              showDetails={false}
            />
            <p className="text-xs text-gray-500 mt-1">
              Select a belt to auto-populate PIW/PIL and minimum pulley diameter constraints.
            </p>
          </div>

          {/* PIW/PIL Display - Single source of truth */}
          {inputs.belt_catalog_key && (
            <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 space-y-2">
              {/* PIW Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 w-8">PIW:</span>
                  {inputs.belt_piw_override !== undefined ? (
                    /* Override active */
                    <>
                      <input
                        type="number"
                        id="belt_piw_override"
                        className="w-20 px-2 py-1 text-sm border border-amber-300 bg-amber-50 rounded focus:ring-amber-500 focus:border-amber-500"
                        value={inputs.belt_piw_override}
                        onChange={(e) =>
                          updateInput('belt_piw_override', e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        step="0.001"
                        min="0.01"
                        max="0.50"
                      />
                      <span className="text-xs text-gray-500">lb/in</span>
                      <span className="text-xs text-gray-400">(belt: {inputs.belt_piw ?? '—'})</span>
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Overridden</span>
                    </>
                  ) : (
                    /* Native value */
                    <>
                      <span className="text-sm text-blue-600 font-medium">{inputs.belt_piw ?? '—'}</span>
                      <span className="text-xs text-gray-500">lb/in</span>
                    </>
                  )}
                </div>
                {inputs.belt_piw_override !== undefined ? (
                  <button
                    type="button"
                    onClick={() => updateInput('belt_piw_override', undefined)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Reset
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateInput('belt_piw_override', inputs.belt_piw ?? 0.109)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Override
                  </button>
                )}
              </div>

              {/* PIL Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 w-8">PIL:</span>
                  {inputs.belt_pil_override !== undefined ? (
                    /* Override active */
                    <>
                      <input
                        type="number"
                        id="belt_pil_override"
                        className="w-20 px-2 py-1 text-sm border border-amber-300 bg-amber-50 rounded focus:ring-amber-500 focus:border-amber-500"
                        value={inputs.belt_pil_override}
                        onChange={(e) =>
                          updateInput('belt_pil_override', e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                        step="0.001"
                        min="0.01"
                        max="0.50"
                      />
                      <span className="text-xs text-gray-500">lb/in</span>
                      <span className="text-xs text-gray-400">(belt: {inputs.belt_pil ?? '—'})</span>
                      <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">Overridden</span>
                    </>
                  ) : (
                    /* Native value */
                    <>
                      <span className="text-sm text-blue-600 font-medium">{inputs.belt_pil ?? '—'}</span>
                      <span className="text-xs text-gray-500">lb/in</span>
                    </>
                  )}
                </div>
                {inputs.belt_pil_override !== undefined ? (
                  <button
                    type="button"
                    onClick={() => updateInput('belt_pil_override', undefined)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Reset
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateInput('belt_pil_override', inputs.belt_pil ?? 0.109)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Override
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ===== BELT LACING SUBSECTION (moved from Build Options) ===== */}
          <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <label htmlFor="lacing_style" className="label">
                Lacing Style
              </label>
              <select
                id="lacing_style"
                className="input"
                value={inputs.lacing_style}
                onChange={(e) => updateInput('lacing_style', e.target.value)}
              >
                {Object.values(LacingStyle).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Lacing material - only show if not Endless */}
            {inputs.lacing_style !== LacingStyle.Endless && (
              <div>
                <label htmlFor="lacing_material" className="label">
                  Lacing Material
                </label>
                <select
                  id="lacing_material"
                  className="input"
                  value={inputs.lacing_material || ''}
                  onChange={(e) => updateInput('lacing_material', e.target.value)}
                  required
                >
                  <option value="">Select material...</option>
                  {Object.values(LacingMaterial).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

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

          {/* ===== v1.24: CLEATS SUBSECTION - Summary Card + Modal ===== */}
          <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mt-4">
            Cleats
          </h4>

          {/* Cleats Summary Card - Compact Horizontal Layout */}
          <div className={`border rounded-lg p-4 ${inputs.cleats_mode === 'cleated' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            {/* Header row with title, badges, and edit button */}
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-medium text-gray-900">Belt Cleats</h5>
              <div className="flex items-center gap-2">
                {inputs.cleats_mode === 'cleated' && inputs.cleats_notched && (
                  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded">Notched</span>
                )}
                {inputs.cleats_mode === 'cleated' && (
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Configured</span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (inputs.cleats_mode !== 'cleated') {
                      updateInput('cleats_mode', 'cleated');
                      updateInput('cleats_enabled', true);
                      if (!inputs.cleat_centers_in) updateInput('cleat_centers_in', 12);
                      if (!inputs.cleat_style) updateInput('cleat_style', 'SOLID');
                      if (!inputs.cleat_pattern) updateInput('cleat_pattern', 'STRAIGHT_CROSS');
                      if (!inputs.cleat_material_family) updateInput('cleat_material_family', 'PVC_HOT_WELDED');
                    }
                    setIsCleatsModalOpen(true);
                  }}
                  className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                >
                  {inputs.cleats_mode === 'cleated' ? 'Edit' : 'Configure'}
                </button>
              </div>
            </div>

            {inputs.cleats_mode === 'cleated' ? (
              <div className="text-sm space-y-1.5">
                {/* Row 1: Profile, Size, Centers */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {inputs.cleat_profile && (
                    <span>
                      <span className="text-gray-500">Profile:</span>{' '}
                      <span className="font-medium">{inputs.cleat_profile}</span>
                    </span>
                  )}
                  {inputs.cleat_size && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>
                        <span className="text-gray-500">Size:</span>{' '}
                        <span className="font-medium">{inputs.cleat_size}</span>
                      </span>
                    </>
                  )}
                  {inputs.cleat_spacing_in && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span>
                        <span className="text-gray-500">Centers:</span>{' '}
                        <span className="font-medium text-blue-600">{inputs.cleat_spacing_in}"</span>
                      </span>
                    </>
                  )}
                </div>
                {/* Row 2: Pattern, Min Pulley */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-600">
                  {inputs.cleat_pattern && (
                    <span>
                      <span className="text-gray-500">Pattern:</span>{' '}
                      <span className="font-medium text-gray-900">{CLEAT_PATTERN_LABELS[inputs.cleat_pattern as keyof typeof CLEAT_PATTERN_LABELS] ?? inputs.cleat_pattern}</span>
                    </span>
                  )}
                  {cleatsMinPulleyDiaIn !== null && (
                    <>
                      {inputs.cleat_pattern && <span className="text-gray-300">|</span>}
                      <span>
                        <span className="text-gray-500">Min Pulley:</span>{' '}
                        <span className="font-medium text-amber-600">{cleatsMinPulleyDiaIn}"</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not configured. Cleats help retain product on inclines.</p>
            )}
          </div>

          {/* Cleats Config Modal */}
          <CleatsConfigModal
            isOpen={isCleatsModalOpen}
            onClose={() => setIsCleatsModalOpen(false)}
            inputs={inputs}
            updateInput={updateInput}
          />

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

          {/* Pulley Cards - Compact Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* DRIVE PULLEY CARD */}
            <div className={`border rounded-lg p-4 ${drivePulley ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">Head/Drive Pulley</h5>
                <div className="flex items-center gap-2">
                  {drivePulley && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Configured</span>
                  )}
                  {applicationLineId && (
                    <button
                      type="button"
                      onClick={() => setIsPulleyModalOpen(true)}
                      className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      {drivePulley ? 'Edit' : 'Configure'}
                    </button>
                  )}
                </div>
              </div>

              {pulleysLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : drivePulley ? (
                <div className="text-sm space-y-0.5">
                  <div><span className="text-gray-500">Style:</span> <span className="font-medium">{drivePulley.style_key}</span></div>
                  <div><span className="text-gray-500">Tracking:</span> <span className="font-medium">{trackingLabel}</span></div>
                  <div><span className="text-gray-500">Lagging:</span> <span className="font-medium">
                    {drivePulley.lagging_type === 'NONE' ? 'None' : `${drivePulley.lagging_type} (${drivePulley.lagging_thickness_in || 0}")`}
                  </span></div>
                  {drivePulley.finished_od_in && (
                    <div><span className="text-gray-500">OD:</span> <span className="font-medium text-blue-600">{drivePulley.finished_od_in}"</span></div>
                  )}
                </div>
              ) : !applicationLineId ? (
                <p className="text-xs text-amber-600">Save application to configure pulleys</p>
              ) : (
                <p className="text-sm text-gray-500">Not configured</p>
              )}
            </div>

            {/* TAIL PULLEY CARD */}
            <div className={`border rounded-lg p-4 ${tailPulley ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900">Tail Pulley</h5>
                <div className="flex items-center gap-2">
                  {tailPulley && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Configured</span>
                  )}
                  {applicationLineId && (
                    <button
                      type="button"
                      onClick={() => setIsPulleyModalOpen(true)}
                      className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      {tailPulley ? 'Edit' : 'Configure'}
                    </button>
                  )}
                </div>
              </div>

              {pulleysLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : tailPulley ? (
                <div className="text-sm space-y-0.5">
                  <div><span className="text-gray-500">Style:</span> <span className="font-medium">{tailPulley.style_key}</span></div>
                  <div><span className="text-gray-500">Tracking:</span> <span className="font-medium">{trackingLabel}</span></div>
                  <div><span className="text-gray-500">Lagging:</span> <span className="font-medium">
                    {tailPulley.lagging_type === 'NONE' ? 'None' : `${tailPulley.lagging_type} (${tailPulley.lagging_thickness_in || 0}")`}
                  </span></div>
                  {tailPulley.finished_od_in && (
                    <div><span className="text-gray-500">OD:</span> <span className="font-medium text-blue-600">{tailPulley.finished_od_in}"</span></div>
                  )}
                </div>
              ) : !applicationLineId ? (
                <p className="text-xs text-amber-600">Save application to configure pulleys</p>
              ) : (
                <p className="text-sm text-gray-500">Not configured</p>
              )}
            </div>
          </div>

          {/* Min Pulley Requirements - Governing */}
          {minPulleyRequired !== undefined && (
            <div className="text-xs text-gray-600 bg-gray-100 rounded px-3 py-2">
              <span className="font-medium">Min pulley diameter (Governing):</span>{' '}
              <span className="text-blue-700 font-semibold">{minPulleyRequired.toFixed(1)}"</span>
              <span className="ml-1 text-gray-500">
                ({governingSource === 'vguide' ? 'V-guide' : governingSource === 'cleats' ? 'Cleats' : 'Belt'})
              </span>
              {cleatSpacingMultiplier !== undefined && cleatSpacingMultiplier > 1 && governingSource === 'belt' && (
                <span className="ml-2 text-amber-600">
                  (includes {cleatSpacingMultiplier.toFixed(2)}x cleat factor)
                </span>
              )}
            </div>
          )}

          {/* v1.24: Warnings when configured pulley OD is below governing minimum */}
          {minPulleyRequired !== undefined && drivePulley?.finished_od_in && drivePulley.finished_od_in < minPulleyRequired && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <span className="font-medium">Warning:</span> Drive pulley diameter ({drivePulley.finished_od_in}") is below recommended minimum ({minPulleyRequired.toFixed(1)}"). This may cause belt damage or tracking issues.
            </div>
          )}
          {minPulleyRequired !== undefined && tailPulley?.finished_od_in && tailPulley.finished_od_in < minPulleyRequired && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              <span className="font-medium">Warning:</span> Tail pulley diameter ({tailPulley.finished_od_in}") is below recommended minimum ({minPulleyRequired.toFixed(1)}"). This may cause belt damage or tracking issues.
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

          {/* v1.24: Removed Pulley Surface Type dropdown - now controlled per-pulley via PulleyConfigModal */}

          {/* v1.37: Shafts Card UI with Step-Down Support */}
          {(() => {
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
              <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-gray-900">Shafts</h5>
                  <div className="flex items-center gap-2">
                    {hasOverrides && (
                      <button
                        type="button"
                        onClick={handleRevert}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Revert to Calculated
                      </button>
                    )}
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                      {isManualMode ? 'Override' : 'Configured'}
                    </span>
                    {!isShaftEditing ? (
                      <button
                        type="button"
                        onClick={handleEdit}
                        className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      >
                        Edit
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDone}
                        className="px-3 py-1 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors"
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>

                {/* Read-only summary (when not editing) */}
                {!isShaftEditing && (
                  <div className="text-sm space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        <span className="text-gray-500">Drive:</span>{' '}
                        <span className="font-medium">
                          {displayDriveShaft !== undefined ? `${displayDriveShaft.toFixed(3)}"` : '—'}
                        </span>
                        {isManualMode && inputs.drive_shaft_diameter_in !== undefined && (
                          <span className="text-xs text-amber-600 ml-1">(override)</span>
                        )}
                        {driveHasStepdown && (
                          <span className="text-xs text-blue-600 ml-1">
                            (step-down to {inputs.drive_shaft_stepdown_to_dia_in ?? '?'}")
                          </span>
                        )}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span>
                        <span className="text-gray-500">Tail:</span>{' '}
                        <span className="font-medium">
                          {displayTailShaft !== undefined ? `${displayTailShaft.toFixed(3)}"` : '—'}
                        </span>
                        {isManualMode && inputs.tail_shaft_diameter_in !== undefined && (
                          <span className="text-xs text-amber-600 ml-1">(override)</span>
                        )}
                        {tailHasStepdown && (
                          <span className="text-xs text-blue-600 ml-1">
                            (step-down to {inputs.tail_shaft_stepdown_to_dia_in ?? '?'}")
                          </span>
                        )}
                      </span>
                    </div>
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
              </div>
            );
          })()}

          {/* ===== v1.29: RETURN SUPPORT SUBSECTION ===== */}
          <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-2 mt-6">
            Return Support
          </h4>

          {/* Return Support Summary Card - Compact Horizontal Layout */}
          {(() => {
            const frameStyle = inputs.return_frame_style ?? ReturnFrameStyle.Standard;
            const snubMode = inputs.return_snub_mode ?? ReturnSnubMode.Auto;
            const endOffsetIn = inputs.return_end_offset_in ?? 24;
            const snubsEnabled = computeSnubsEnabled(frameStyle, snubMode);
            const conveyorLength = inputs.conveyor_length_cc_in ?? 120;
            const returnSpan = computeReturnSpan(conveyorLength, snubsEnabled, endOffsetIn);
            const rollerCount = inputs.return_gravity_roller_count ?? Math.max(Math.floor(returnSpan / 60) + 1, 2);
            const gravityCenters = computeGravityRollerCenters(returnSpan, rollerCount);
            const gravityDia = inputs.return_gravity_roller_diameter_in ?? 1.9;
            const snubDia = inputs.return_snub_roller_diameter_in ?? 2.5;
            const frameStyleLabel = RETURN_FRAME_STYLE_LABELS[frameStyle as ReturnFrameStyle] ?? frameStyle;
            // v1.37: Cleats + snubs warning indicator
            const cleatsEnabledForReturn = inputs.cleats_enabled === true || inputs.cleats_mode === 'cleated';
            const showCleatsSnubsWarning = cleatsEnabledForReturn && snubsEnabled;

            return (
              <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                {/* Header row with title, badge, and edit button */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h5 className="font-medium text-gray-900">Return Rollers</h5>
                    {showCleatsSnubsWarning && (
                      <span title="Snub rollers with cleats - verify clearance">
                        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Configured</span>
                    <button
                      type="button"
                      onClick={() => setIsReturnSupportModalOpen(true)}
                      className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Compact horizontal info rows */}
                <div className="text-sm space-y-1.5">
                  {/* Row 1: Frame, Snubs, Gravity count */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>
                      <span className="text-gray-500">Frame:</span>{' '}
                      <span className="font-medium">{frameStyleLabel}</span>
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>
                      <span className="text-gray-500">Snubs:</span>{' '}
                      <span className={`font-medium ${snubsEnabled ? 'text-blue-600' : ''}`}>
                        {snubsEnabled ? 'Yes' : 'No'}
                      </span>
                    </span>
                    <span className="text-gray-300">|</span>
                    <span>
                      <span className="text-gray-500">Gravity:</span>{' '}
                      <span className="font-medium">{rollerCount} @ {gravityCenters?.toFixed(1) ?? '—'}"</span>
                    </span>
                  </div>
                  {/* Row 2: Diameters */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-600">
                    <span>
                      <span className="text-gray-500">Gravity Dia:</span>{' '}
                      <span className="font-medium text-gray-900">{gravityDia}"</span>
                    </span>
                    {snubsEnabled && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span>
                          <span className="text-gray-500">Snub Dia:</span>{' '}
                          <span className="font-medium text-gray-900">{snubDia}"</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </AccordionSection>

      {/* SECTION: Frame, Height & Support */}
      <AccordionSection
        id="frame"
        title="Frame, Height & Support"
        isExpanded={isExpanded('frame')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.frame}
        issues={getMergedIssuesForSection?.('frame')}
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

          {/* Frame Standard (v1.34, v1.36: simplified labels, explicit clearance input) */}
          <div>
            <label htmlFor="frame_height_mode" className="label">
              Frame Standard
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
                // Note: Do NOT reset frame_clearance_in when switching modes (preserve user value)
              }}
            >
              <option value={FrameHeightMode.Standard}>Standard</option>
              <option
                value={FrameHeightMode.LowProfile}
                disabled={cleatsEnabledForFrame}
                title={cleatsEnabledForFrame ? 'Unavailable with cleats (snubs required)' : undefined}
              >
                Low Profile{cleatsEnabledForFrame ? ' — unavailable with cleats' : ''}
              </option>
              <option value={FrameHeightMode.Custom}>Custom</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Standard uses gravity return rollers. Low Profile uses snub rollers (cost option).
            </p>
            {cleatsEnabledForFrame && (
              <p className="text-xs text-amber-600 mt-1">
                Low Profile unavailable: requires snub rollers, which are incompatible with cleated belts.
              </p>
            )}
          </div>

          {/* Frame Clearance (v1.36: explicit input, same for Standard and Low Profile) */}
          {inputs.frame_height_mode !== FrameHeightMode.Custom && (
            <div>
              <label htmlFor="frame_clearance_in" className="label">
                Frame Clearance (in)
              </label>
              <input
                type="number"
                id="frame_clearance_in"
                className="input"
                value={inputs.frame_clearance_in ?? 0.5}
                onChange={(e) =>
                  updateInput('frame_clearance_in', e.target.value ? parseFloat(e.target.value) : 0.5)
                }
                step="0.125"
                min="0"
                max="3.0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Clearance added to required height. Default: 0.50&quot;. Range: 0.00&quot; – 3.00&quot;
              </p>
            </div>
          )}

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

          {/* Info messages based on frame standard */}
          {inputs.frame_height_mode === FrameHeightMode.LowProfile && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Low Profile:</strong> Snub rollers are required for belt return path.
                Not compatible with cleated belts.
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

          {/* Derived Values Panel - v1.34: Show Required + Reference heights */}
          <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Frame Height Breakdown
            </h4>
            {/* Frame Height Display - v1.34: Two heights */}
            <div className="space-y-2 text-sm">
              {/* Required vs Reference Heights */}
              <div className="grid grid-cols-2 gap-4 border-b border-gray-200 pb-2">
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase">Required</div>
                  <div className="font-bold text-gray-900 text-lg">{requiredFrameHeight.toFixed(2)}"</div>
                  <div className="text-xs text-gray-400">(Physical envelope)</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 uppercase">Reference</div>
                  <div className="font-bold text-blue-600 text-lg">{referenceFrameHeight.toFixed(2)}"</div>
                  <div className="text-xs text-gray-400">({inputs.frame_height_mode ?? 'Standard'})</div>
                </div>
              </div>

              {/* Breakdown components */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Largest Pulley OD:</span>
                  <span className="font-medium text-gray-700">{frameHeightBreakdown.largest_pulley_in.toFixed(2)}"</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cleats (2×):</span>
                  <span className="font-medium text-gray-700">
                    {frameHeightBreakdown.cleat_adder_in > 0
                      ? `${frameHeightBreakdown.cleat_adder_in.toFixed(2)}" (${frameHeightBreakdown.cleat_height_in.toFixed(2)}"×2)`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Return Roller:</span>
                  <span className="font-medium text-gray-700">{frameHeightBreakdown.return_roller_in.toFixed(2)}"</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Clearance:</span>
                  <span className="font-medium text-gray-700">+{frameHeightBreakdown.clearance_in.toFixed(2)}"</span>
                </div>
              </div>

              {inputs.frame_height_mode === FrameHeightMode.Custom && (
                <p className="text-xs text-gray-500">Using custom frame height override.</p>
              )}

              {/* Formula display */}
              <p className="text-xs text-gray-400 font-mono pt-1 border-t border-gray-200 mt-2">
                {frameHeightBreakdown.formula}
              </p>

              {/* v1.34: Disclaimer */}
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                <strong>Note:</strong> Frame height shown is reference only. Final design must follow MC3 Mechanical Design Standards.
              </p>
            </div>

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

      {/* Return Support Modal */}
      <ReturnSupportModal
        isOpen={isReturnSupportModalOpen}
        onClose={() => setIsReturnSupportModalOpen(false)}
        inputs={inputs}
        updateInput={updateInput}
      />
    </div>
  );
}

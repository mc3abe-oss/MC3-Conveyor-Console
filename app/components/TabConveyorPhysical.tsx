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
  FrameHeightMode,
  // v1.24: PulleySurfaceType removed - now per-pulley via PulleyConfigModal
  GeometryMode,
  TRACKING_MODE_LABELS,
  TrackingMode,
  FrameConstructionType,
  SheetMetalGauge,
  StructuralChannelSeries,
  FRAME_CONSTRUCTION_TYPE_LABELS,
  STRUCTURAL_CHANNEL_SERIES_LABELS,
  // v1.29: Return Support types moved to ReturnSupportCard
  // UI Cleanup: Lacing moved from Build Options
  LacingStyle,
  LacingMaterial,
} from '../../src/models/sliderbed_v1/schema';
import {
  calculateFrameHeightWithBreakdown,
  getEffectiveCleatHeight,
  FRAME_HEIGHT_CONSTANTS,
} from '../../src/models/sliderbed_v1/formulas';
import { normalizeGeometry } from '../../src/models/sliderbed_v1/geometry';
import { BedType } from '../../src/models/belt_conveyor_v1/schema';
import BeltSelect from './BeltSelect';
import { BeltCatalogItem } from '../api/belts/route';
// PHASE 0: PulleySelect removed - pulley configuration moves to modal in Phase 2
import { VGuideItem } from '../api/v-guides/route';
// PHASE 0: Legacy pulley catalog removed - stub function for compatibility
function getEffectiveDiameterByKey(_key: string | undefined): number | undefined {
  return undefined; // Legacy catalog removed - Phase 2 will use application_pulleys
}
import { getEffectiveMinPulleyDiameters, getCleatSpacingMultiplier } from '../../src/lib/belt-catalog';
import { getSheetMetalThicknessOptions } from '../../src/lib/frame-catalog';
import AccordionSection, { useAccordionState } from './AccordionSection';
import { SectionCounts, SectionKey, Issue, IssueCode } from './useConfigureIssues';
import { useState, useEffect, useMemo } from 'react';
import PulleyConfigModal from './PulleyConfigModal';
import CleatsConfigModal from './CleatsConfigModal';
import ReturnSupportModal from './ReturnSupportModal';
import ReturnSupportCard from './conveyorPhysical/cards/ReturnSupportCard';
import ShaftsCard from './conveyorPhysical/cards/ShaftsCard';
import FrameHeightBreakdownCard from './conveyorPhysical/cards/FrameHeightBreakdownCard';
import CleatsPreviewCard from './conveyorPhysical/cards/CleatsPreviewCard';
import ConveyorGeometryVisualization from './conveyorPhysical/cards/ConveyorGeometryVisualization';
import PulleyPreviewCards from './conveyorPhysical/cards/PulleyPreviewCards';
import BeltPiwPilCard from './conveyorPhysical/cards/BeltPiwPilCard';
import VGuideSelectCard from './conveyorPhysical/cards/VGuideSelectCard';
import LegacyPulleyOverrideCard from './conveyorPhysical/cards/LegacyPulleyOverrideCard';
import { getBeltTrackingMode, getFaceProfileLabel } from '../../src/lib/pulley-tracking';
import { ApplicationPulley } from '../api/application-pulleys/route';
import {
  lookupCleatsMinPulleyDia,
  CleatPattern,
  CleatStyle,
  DEFAULT_CLEAT_MATERIAL_FAMILY,
} from '../../src/lib/cleat-catalog';
import { useCleatCatalog } from '../../src/lib/hooks/useCleatCatalog';
import {
  FootnoteRow,
  CompactInfoBanner,
  SectionDivider,
} from './CompactCardLayouts';
import SegmentedControl from './SegmentedControl';

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

  // Handle V-Guide selection - updates v_guide_key + 4 min pulley diameter fields
  // NOTE: This handler stays in TabConveyorPhysical per refactor constraints (cross-field logic)
  const handleVGuideChange = (key: string | undefined, vguide: VGuideItem | undefined) => {
    updateInput('v_guide_key', key);
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
  };

  // Handle legacy drive pulley override value change - sets TWO fields
  // NOTE: This handler stays in TabConveyorPhysical per refactor constraints (cross-field logic)
  const handleDriveOverrideValueChange = (value: number | undefined) => {
    updateInput('drive_pulley_diameter_in', value);
    updateInput('pulley_diameter_in', value);
  };

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
  // null = closed, 'drive' | 'tail' = which end is being edited
  const [pulleyModalEnd, setPulleyModalEnd] = useState<'drive' | 'tail' | null>(null);
  const [applicationPulleys, setApplicationPulleys] = useState<ApplicationPulley[]>([]);
  const [pulleysLoading, setPulleysLoading] = useState(false);

  // v1.24: Cleats configuration modal state
  const [isCleatsModalOpen, setIsCleatsModalOpen] = useState(false);

  // v1.29: Return Support modal state
  const [isReturnSupportModalOpen, setIsReturnSupportModalOpen] = useState(false);

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
    void loadPulleys();
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
    const currentRise = derivedGeometry.rise_in;

    updateInput('geometry_mode', newMode);

    if (newMode === GeometryMode.LengthAngle) {
      // Switching to L_ANGLE: use current L_cc and theta
      updateInput('conveyor_length_cc_in', currentL_cc);
      updateInput('conveyor_incline_deg', currentTheta);
    } else if (newMode === GeometryMode.HorizontalAngle) {
      // Switching to H_ANGLE: use current H_cc and theta
      updateInput('horizontal_run_in', currentH_cc);
      updateInput('conveyor_incline_deg', currentTheta);
    } else if (newMode === GeometryMode.HorizontalRise) {
      // Switching to H_RISE: use current H_cc and rise
      updateInput('horizontal_run_in', currentH_cc);
      updateInput('input_rise_in', currentRise);
    }
    // Note: H_TOB mode removed in User Feedback 2 - legacy apps migrated to H_ANGLE on load
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
    <div className="space-y-3">
      {/* SECTION: Conveyor Type & Geometry */}
      <AccordionSection
        id="geometry"
        title="Conveyor Type & Geometry"
        isExpanded={isExpanded('geometry')}
        onToggle={handleToggle}
        issueCounts={sectionCounts.geometry}
        issues={getMergedIssuesForSection?.('geometry')}
      >
        {/* Two-column layout: inputs left, diagram right */}
        <div className="flex flex-col lg:flex-row lg:gap-6">
          {/* Left column: Inputs (25-30% width on desktop) */}
          <div className="lg:w-[280px] lg:min-w-[260px] lg:max-w-[320px] flex-shrink-0 space-y-2.5">
            {/* Bed Type */}
            <div>
              <label htmlFor="bed_type" className="label-compact">
                Bed Type
              </label>
              <select
                id="bed_type"
                className="input-compact w-full"
                value={(inputs as any).bed_type || BedType.SliderBed}
                onChange={(e) => updateInput('bed_type' as any, e.target.value)}
              >
                <option value={BedType.SliderBed}>Slider Bed</option>
                <option value={BedType.RollerBed}>Roller Bed</option>
              </select>
            </div>

            {/* Input Mode */}
            <div>
              <label className="label-compact">Input Mode</label>
              <SegmentedControl
                name="geometry_mode"
                value={geometryMode}
                options={[
                  { value: GeometryMode.LengthAngle, label: 'L + Angle' },
                  { value: GeometryMode.HorizontalAngle, label: 'H + Angle' },
                  { value: GeometryMode.HorizontalRise, label: 'H + Rise' },
                ]}
                onChange={handleGeometryModeChange}
              />
            </div>

            {/* Belt Width */}
            <div>
              <label htmlFor="belt_width_in" className="label-compact">
                Belt Width (in)
              </label>
              <input
                type="number"
                id="belt_width_in"
                className="input-compact w-28"
                value={inputs.belt_width_in}
                onChange={(e) => updateInput('belt_width_in', parseFloat(e.target.value) || 0)}
                step="1"
                min="0"
                required
              />
            </div>

            {/* Length C-C OR Horizontal Run */}
            {geometryMode === GeometryMode.LengthAngle ? (
              <div>
                <label htmlFor="conveyor_length_cc_in" className="label-compact">
                  Length C-C (in)
                </label>
                <input
                  type="number"
                  id="conveyor_length_cc_in"
                  className="input-compact w-28"
                  value={inputs.conveyor_length_cc_in}
                  onChange={(e) => updateInput('conveyor_length_cc_in', parseFloat(e.target.value) || 0)}
                  step="1"
                  min="0"
                  required
                />
              </div>
            ) : (
              <div>
                <label htmlFor="horizontal_run_in" className="label-compact">
                  Horizontal Run (in)
                </label>
                <input
                  type="number"
                  id="horizontal_run_in"
                  className="input-compact w-28"
                  value={inputs.horizontal_run_in ?? inputs.conveyor_length_cc_in}
                  onChange={(e) => updateInput('horizontal_run_in', parseFloat(e.target.value) || 0)}
                  step="1"
                  min="0"
                  required
                />
              </div>
            )}

            {/* Incline Angle (for L_ANGLE and H_ANGLE modes) */}
            {geometryMode !== GeometryMode.HorizontalRise && (
              <div>
                <label htmlFor="conveyor_incline_deg" className="label-compact">
                  Incline Angle (deg)
                </label>
                <input
                  type="number"
                  id="conveyor_incline_deg"
                  className="input-compact w-28"
                  value={inputs.conveyor_incline_deg ?? 0}
                  onChange={(e) =>
                    updateInput('conveyor_incline_deg', parseFloat(e.target.value) || 0)
                  }
                  step="0.1"
                  min="0"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">0° = horizontal. Positive = incline.</p>
              </div>
            )}

            {/* Rise (for H_RISE mode) */}
            {geometryMode === GeometryMode.HorizontalRise && (
              <div>
                <label htmlFor="input_rise_in" className="label-compact">
                  Rise (in)
                </label>
                <input
                  type="number"
                  id="input_rise_in"
                  className="input-compact w-28"
                  value={inputs.input_rise_in ?? 0}
                  onChange={(e) => updateInput('input_rise_in', parseFloat(e.target.value) || 0)}
                  step="1"
                  min="0"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">Vertical rise from tail to drive.</p>
              </div>
            )}
          </div>

          {/* Right column: Diagram (fills remaining width) */}
          <div className="flex-1 flex items-start mt-4 lg:mt-0">
            <ConveyorGeometryVisualization
              derivedGeometry={derivedGeometry}
              geometryMode={geometryMode}
            />
          </div>
        </div>

        {/* Incline Warning removed - now rendered via useConfigureIssues system */}
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
        <div className="space-y-3">
          {/* ===== BELT SUBSECTION ===== */}
          <SectionDivider title="Belt" className="mt-0" />

          {/* Belt Selection + PIW/PIL - Compact Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="belt_catalog_key" className="label text-xs">Belt</label>
              <BeltSelect
                id="belt_catalog_key"
                value={inputs.belt_catalog_key}
                onChange={handleBeltChange}
                showDetails={false}
              />
            </div>

            {/* Lacing - Same Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="lacing_style" className="label text-xs">Lacing</label>
                <select
                  id="lacing_style"
                  className="input text-sm py-1.5"
                  value={inputs.lacing_style}
                  onChange={(e) => updateInput('lacing_style', e.target.value)}
                >
                  {Object.values(LacingStyle).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              {inputs.lacing_style !== LacingStyle.Endless && (
                <div>
                  <label htmlFor="lacing_material" className="label text-xs">Material</label>
                  <select
                    id="lacing_material"
                    className="input text-sm py-1.5"
                    value={inputs.lacing_material || ''}
                    onChange={(e) => updateInput('lacing_material', e.target.value)}
                  >
                    <option value="">Select...</option>
                    {Object.values(LacingMaterial).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* PIW/PIL Display - Extracted to separate component (v1.41 slice 4) */}
          <BeltPiwPilCard
            beltCatalogKey={inputs.belt_catalog_key}
            beltPiw={inputs.belt_piw}
            beltPil={inputs.belt_pil}
            beltPiwOverride={inputs.belt_piw_override}
            beltPilOverride={inputs.belt_pil_override}
            onPiwOverrideChange={(value) => updateInput('belt_piw_override', value)}
            onPilOverrideChange={(value) => updateInput('belt_pil_override', value)}
          />

          {/* ===== TRACKING SUBSECTION ===== */}
          <SectionDivider title="Tracking" />

          {/* Tracking Recommendation Banner - Compact */}
          {trackingIssue?.trackingData && (
            <CompactInfoBanner
              title={`Recommended: ${TRACKING_MODE_LABELS[trackingIssue.trackingData.tracking_mode_recommended as TrackingMode] ?? trackingIssue.trackingData.tracking_mode_recommended}`}
              subtitle={trackingIssue.trackingData.tracking_recommendation_rationale}
              detail={trackingIssue.trackingData.tracking_recommendation_note}
              variant="info"
              collapsible
              defaultExpanded={false}
            />
          )}

          {/* Belt Tracking + V-Guide - Compact Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="belt_tracking_method" className="label text-xs">Tracking Method</label>
              <select
                id="belt_tracking_method"
                className="input text-sm py-1.5"
                value={inputs.belt_tracking_method}
                onChange={(e) => updateInput('belt_tracking_method', e.target.value)}
              >
                {Object.values(BeltTrackingMethod).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* V-guide profile - Extracted to separate component (v1.41 slice 4b) */}
            {/* NOTE: handleVGuideChange contains the 4-field update logic and remains in this file */}
            <VGuideSelectCard
              isVGuided={isVGuided}
              vGuideKey={inputs.v_guide_key}
              onVGuideChange={handleVGuideChange}
            />
          </div>

          {/* ===== v1.24: CLEATS SUBSECTION - Summary Card + Modal ===== */}
          <SectionDivider title="Cleats" />

          {/* Cleats Summary Card - Extracted to separate component (v1.41) */}
          <CleatsPreviewCard
            inputs={inputs}
            cleatsMinPulleyDiaIn={cleatsMinPulleyDiaIn}
            onEditClick={() => {
              // Set defaults when enabling cleats for the first time
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
          />

          {/* Cleats Config Modal */}
          <CleatsConfigModal
            isOpen={isCleatsModalOpen}
            onClose={() => setIsCleatsModalOpen(false)}
            inputs={inputs}
            updateInput={updateInput}
          />

          {/* ===== PULLEYS SUBSECTION ===== */}
          <SectionDivider title="Pulleys" />

          {/* Pulley Cards - Extracted to separate component (v1.41 slice 3) */}
          <PulleyPreviewCards
            drivePulley={drivePulley}
            tailPulley={tailPulley}
            trackingLabel={trackingLabel}
            applicationLineId={applicationLineId}
            pulleysLoading={pulleysLoading}
            onEditDrive={() => setPulleyModalEnd('drive')}
            onEditTail={() => setPulleyModalEnd('tail')}
          />

          {/* Min Pulley Requirements - Governing (Footnote style) */}
          {minPulleyRequired !== undefined && (
            <FootnoteRow>
              <span className="font-medium">Min pulley (Governing):</span>{' '}
              <span className="text-blue-700 font-semibold">{minPulleyRequired.toFixed(1)}&quot;</span>
              <span className="ml-1 text-gray-500">
                ({governingSource === 'vguide' ? 'V-guide' : governingSource === 'cleats' ? 'Cleats' : 'Belt'})
              </span>
              {cleatSpacingMultiplier !== undefined && cleatSpacingMultiplier > 1 && governingSource === 'belt' && (
                <span className="ml-1 text-amber-600">({cleatSpacingMultiplier.toFixed(2)}x cleat)</span>
              )}
            </FootnoteRow>
          )}

          {/* Pulley warnings - compact */}
          {minPulleyRequired !== undefined && drivePulley?.finished_od_in && drivePulley.finished_od_in < minPulleyRequired && (
            <FootnoteRow variant="warning">
              Drive pulley ({drivePulley.finished_od_in}&quot;) below min ({minPulleyRequired.toFixed(1)}&quot;)
            </FootnoteRow>
          )}
          {minPulleyRequired !== undefined && tailPulley?.finished_od_in && tailPulley.finished_od_in < minPulleyRequired && (
            <FootnoteRow variant="warning">
              Tail pulley ({tailPulley.finished_od_in}&quot;) below min ({minPulleyRequired.toFixed(1)}&quot;)
            </FootnoteRow>
          )}

          {/* Legacy Manual Override Section - Extracted to separate component (v1.41 slice 5) */}
          {/* NOTE: handleDriveOverrideValueChange contains cross-field logic and remains in this file */}
          <LegacyPulleyOverrideCard
            driveOverride={driveOverride}
            tailOverride={tailOverride}
            manualDriveDia={manualDriveDia}
            manualTailDia={manualTailDia}
            drivePulleyBelowMinimum={drivePulleyBelowMinimum}
            tailPulleyBelowMinimum={tailPulleyBelowMinimum}
            onDriveOverrideToggle={(checked) => updateInput('drive_pulley_manual_override', checked)}
            onTailOverrideToggle={(checked) => updateInput('tail_pulley_manual_override', checked)}
            onDriveOverrideValueChange={handleDriveOverrideValueChange}
            onTailOverrideValueChange={(value) => updateInput('tail_pulley_diameter_in', value)}
          />

          {/* ===== SHAFTS SUBSECTION ===== */}
          <SectionDivider title="Shafts" />

          {/* v1.37: Shafts Card - Extracted to separate component (v1.41) */}
          <ShaftsCard
            inputs={inputs}
            outputs={outputs}
            updateInput={updateInput}
          />

          {/* ===== v1.29: RETURN SUPPORT SUBSECTION ===== */}
          <SectionDivider title="Return Support" />

          {/* Return Support Summary Card - Extracted to separate component (v1.41) */}
          <ReturnSupportCard
            inputs={inputs}
            onEditClick={() => setIsReturnSupportModalOpen(true)}
          />

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
                value={inputs.frame_sheet_metal_gauge ?? 'ga_12'}
                onChange={(e) => updateInput('frame_sheet_metal_gauge', e.target.value as SheetMetalGauge)}
                required
              >
                {getSheetMetalThicknessOptions().map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Thicker material provides more rigidity. 12 ga is standard for most applications.
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

          {/* Derived Values Panel - Extracted to separate component (v1.41) */}
          <FrameHeightBreakdownCard
            frameHeightBreakdown={frameHeightBreakdown}
            requiredFrameHeight={requiredFrameHeight}
            referenceFrameHeight={referenceFrameHeight}
            frameHeightMode={inputs.frame_height_mode}
          />
        </div>
      </AccordionSection>

      {/* Pulley Configuration Modal */}
      <PulleyConfigModal
        isOpen={pulleyModalEnd !== null}
        pulleyEnd={pulleyModalEnd || 'drive'}
        onClose={() => setPulleyModalEnd(null)}
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

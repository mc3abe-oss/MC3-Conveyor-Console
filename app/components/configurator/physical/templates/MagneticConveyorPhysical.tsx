/**
 * Magnetic Conveyor Physical Tab Template
 *
 * Wires magnetic-specific geometry inputs into the parent calculator state.
 * Maps between UI schema (MagneticConveyorInputs) and calculator schema (MagneticInputs).
 */

'use client';

import { useMemo } from 'react';
import MagneticGeometrySection from '../../magnetic/MagneticGeometrySection';
import {
  MagneticConveyorInputs,
  MagneticConveyorStyle,
  MagneticBodyHeight,
  ConveyorStyle,
} from '../../../../../src/models/magnetic_conveyor_v1/schema';
import { SliderbedInputs, SliderbedOutputs } from '../../../../../src/models/sliderbed_v1/schema';
import { SectionCounts, SectionKey, Issue } from '../../../useConfigureIssues';

export interface MagneticConveyorPhysicalProps {
  inputs: SliderbedInputs;
  updateInput: (field: keyof SliderbedInputs, value: any) => void;
  sectionCounts: Record<SectionKey, SectionCounts>;
  getTrackingIssue: () => Issue | undefined;
  getMinPulleyIssues: () => Issue[];
  applicationLineId?: string | null;
  getMergedIssuesForSection?: (sectionKey: SectionKey) => Issue[];
  outputs?: SliderbedOutputs | null;
  showToast?: (message: string) => void;
}

// =============================================================================
// KEY MAPPING: UI Schema (camelCase) <-> Calculator Schema (snake_case)
// =============================================================================

/**
 * Maps UI schema keys to calculator schema keys.
 */
const UI_TO_CALC_KEY_MAP: Record<keyof MagneticConveyorInputs, string> = {
  style: 'style',
  infeedLength: 'infeed_length_in',
  inclineAngle: 'incline_angle_deg',
  dischargeLength: 'discharge_length_in',
  dischargeHeight: 'discharge_height_in',
  effectiveWidth: 'magnet_width_in',
  // UI-only fields (not in calculator schema)
  inclineLength: '_ui_incline_length',
  overallLength: '_ui_overall_length',
  bodyHeight: '_ui_body_height',
  beltWidth: '_ui_belt_width',
  infeedGuideHeight: '_ui_guide_height',
  infeedGuideAngle: '_ui_guide_angle',
};

/**
 * Convert ConveyorStyle enum to MagneticConveyorStyle literal.
 */
function toUIStyle(style: unknown): MagneticConveyorStyle {
  if (style === ConveyorStyle.A || style === 'A') return 'A';
  if (style === ConveyorStyle.B || style === 'B') return 'B';
  if (style === ConveyorStyle.C || style === 'C') return 'C';
  if (style === ConveyorStyle.D || style === 'D') return 'D';
  return 'B'; // default
}

/**
 * Calculate incline length from discharge height and angle.
 * inclineLength = dischargeHeight / sin(angle)
 */
function calculateInclineLength(dischargeHeight: number | undefined, angleDeg: number | undefined): number | undefined {
  if (!dischargeHeight || !angleDeg || angleDeg === 0) return undefined;
  const angleRad = (angleDeg * Math.PI) / 180;
  const sinAngle = Math.sin(angleRad);
  if (sinAngle === 0) return undefined;
  return dischargeHeight / sinAngle;
}

/**
 * Calculate discharge height from incline length and angle.
 * dischargeHeight = inclineLength * sin(angle)
 */
function calculateDischargeHeight(inclineLength: number | undefined, angleDeg: number | undefined): number {
  if (!inclineLength || !angleDeg) return 0;
  const angleRad = (angleDeg * Math.PI) / 180;
  return inclineLength * Math.sin(angleRad);
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function MagneticConveyorPhysical({
  inputs,
  updateInput,
}: MagneticConveyorPhysicalProps) {
  // Build UI-compatible inputs from calculator-compatible inputs prop
  // The inputs prop contains snake_case keys from the calculator schema
  const magneticUIInputs: MagneticConveyorInputs = useMemo(() => {
    const anyInputs = inputs as unknown as Record<string, unknown>;

    // Read calculator schema values
    const style = toUIStyle(anyInputs.style);
    const infeedLength = anyInputs.infeed_length_in as number | undefined;
    const inclineAngle = anyInputs.incline_angle_deg as number | undefined;
    const dischargeLength = anyInputs.discharge_length_in as number | undefined;
    const dischargeHeight = anyInputs.discharge_height_in as number | undefined;
    const effectiveWidth = anyInputs.magnet_width_in as number | undefined;

    // Read UI-only fields (stored with _ui_ prefix)
    const inclineLength = anyInputs._ui_incline_length as number | undefined;
    const overallLength = anyInputs._ui_overall_length as number | undefined;
    const bodyHeight = anyInputs._ui_body_height as MagneticBodyHeight | undefined;
    const infeedGuideHeight = anyInputs._ui_guide_height as number | undefined;
    const infeedGuideAngle = anyInputs._ui_guide_angle as number | undefined;

    // Calculate inclineLength from discharge height if not stored
    const calculatedInclineLength = inclineLength ?? calculateInclineLength(dischargeHeight, inclineAngle);

    return {
      style,
      infeedLength: infeedLength ?? 52,
      inclineLength: calculatedInclineLength ?? 50,
      dischargeLength: dischargeLength ?? 22,
      overallLength: overallLength ?? 100,
      inclineAngle: inclineAngle ?? 60,
      dischargeHeight: dischargeHeight ?? 60,
      bodyHeight: bodyHeight ?? MagneticBodyHeight.Standard,
      effectiveWidth: effectiveWidth ?? 10,
      infeedGuideHeight: infeedGuideHeight ?? 4,
      infeedGuideAngle: infeedGuideAngle ?? 0,
    };
  }, [inputs]);

  // Handler that maps UI keys to calculator keys and updates parent state
  const updateMagneticInput = <K extends keyof MagneticConveyorInputs>(
    field: K,
    value: MagneticConveyorInputs[K]
  ) => {
    const calcKey = UI_TO_CALC_KEY_MAP[field];

    // Handle special case: when inclineLength changes, update discharge_height_in
    if (field === 'inclineLength') {
      const newInclineLength = value as number | undefined;
      const newDischargeHeight = calculateDischargeHeight(newInclineLength, magneticUIInputs.inclineAngle);
      // Update both the UI field and the calculated discharge height
      updateInput('_ui_incline_length' as keyof SliderbedInputs, newInclineLength);
      updateInput('discharge_height_in' as keyof SliderbedInputs, newDischargeHeight);
      return;
    }

    // Handle special case: when inclineAngle changes, recalculate discharge_height_in
    if (field === 'inclineAngle') {
      const newAngle = value as number | undefined;
      const newDischargeHeight = calculateDischargeHeight(magneticUIInputs.inclineLength, newAngle);
      updateInput('incline_angle_deg' as keyof SliderbedInputs, newAngle);
      updateInput('discharge_height_in' as keyof SliderbedInputs, newDischargeHeight);
      return;
    }

    // Standard mapping
    updateInput(calcKey as keyof SliderbedInputs, value);
  };

  return (
    <div className="h-full">
      <MagneticGeometrySection
        inputs={magneticUIInputs}
        updateInput={updateMagneticInput}
      />
    </div>
  );
}

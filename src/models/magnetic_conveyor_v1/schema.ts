/**
 * Magnetic Conveyor Schema
 *
 * Type definitions for magnetic conveyor configuration inputs.
 */

/** Magnetic conveyor style variants */
export type MagneticConveyorStyle = 'A' | 'B' | 'C' | 'D';

/** Body height options (inches) */
export type MagneticBodyHeight = 5 | 7.5;

/** Style metadata for UI display */
export interface MagneticStyleConfig {
  name: string;
  code: string;
  description: string;
  dimensions: (keyof MagneticConveyorGeometry)[];
}

/** Style definitions */
export const MAGNETIC_STYLES: Record<MagneticConveyorStyle, MagneticStyleConfig> = {
  A: {
    name: 'Style A',
    code: 'AMAG',
    description: 'Horizontal → Incline up',
    dimensions: ['infeedLength', 'inclineLength', 'inclineAngle'],
  },
  B: {
    name: 'Style B',
    code: 'BMAG',
    description: 'Horizontal → Incline → Horizontal',
    dimensions: ['infeedLength', 'inclineLength', 'dischargeLength', 'inclineAngle'],
  },
  C: {
    name: 'Style C',
    code: 'CMAG',
    description: 'Horizontal only',
    dimensions: ['overallLength'],
  },
  D: {
    name: 'Style D',
    code: 'DMAG',
    description: 'Incline only',
    dimensions: ['inclineLength', 'inclineAngle'],
  },
};

/** Profile geometry dimensions */
export interface MagneticConveyorGeometry {
  infeedLength: number | null;
  inclineLength: number | null;
  dischargeLength: number | null;
  inclineAngle: number | null;
  overallLength: number | null;
}

/** Cross-section dimensions */
export interface MagneticConveyorCrossSection {
  effectiveWidth: number | null;
  bodyHeight: MagneticBodyHeight;
  infeedGuideHeight: number | null;
  infeedGuideAngle: number | null;
}

/** Complete magnetic conveyor input state */
export interface MagneticConveyorInputs extends MagneticConveyorGeometry, MagneticConveyorCrossSection {
  style: MagneticConveyorStyle;
}

/** Default values for magnetic conveyor inputs */
export const DEFAULT_MAGNETIC_INPUTS: MagneticConveyorInputs = {
  style: 'A',
  infeedLength: 52,
  inclineLength: 50,
  dischargeLength: 24,
  inclineAngle: 60,
  overallLength: 65,
  effectiveWidth: 10,
  bodyHeight: 5,
  infeedGuideHeight: 4,
  infeedGuideAngle: 0,
};

/** Derived/calculated values from inputs */
export interface MagneticConveyorDerived {
  calculatedRise: number | null;
  calculatedOverallLength: number | null;
  bodyWidth: number;
  coverWidth: number;
}

/** Calculate derived values from inputs */
export function calculateMagneticDerived(inputs: MagneticConveyorInputs): MagneticConveyorDerived {
  const { style, infeedLength, inclineLength, dischargeLength, inclineAngle, overallLength, effectiveWidth } = inputs;

  const angleRad = ((inclineAngle ?? 60) * Math.PI) / 180;
  const incline = inclineLength ?? 50;
  const horizontalRun = incline * Math.cos(angleRad);

  let calculatedRise: number | null = null;
  let calculatedOverallLength: number | null = null;

  if (style === 'A' || style === 'B' || style === 'D') {
    calculatedRise = Math.round(incline * Math.sin(angleRad));
  }

  switch (style) {
    case 'A':
      calculatedOverallLength = (infeedLength ?? 52) + horizontalRun;
      break;
    case 'B':
      calculatedOverallLength = (infeedLength ?? 52) + horizontalRun + (dischargeLength ?? 24);
      break;
    case 'C':
      calculatedOverallLength = overallLength ?? 65;
      break;
    case 'D':
      calculatedOverallLength = horizontalRun;
      break;
  }

  const bodyWidth = (effectiveWidth ?? 10) + 1.5;
  const coverWidth = bodyWidth + 1.5;

  return {
    calculatedRise,
    calculatedOverallLength,
    bodyWidth,
    coverWidth,
  };
}

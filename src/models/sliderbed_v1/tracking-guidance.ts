/**
 * BELT TRACKING GUIDANCE MODULE
 *
 * Provides plain-English guidance for belt tracking method selection (Crowned vs V-Guided).
 * This module does NOT calculate crown geometry or use CEMA formulas.
 * It produces human-readable recommendations based on conveyor characteristics.
 *
 * Decision Factors:
 * - Length-to-width ratio (L:W)
 * - Reversing operation
 * - Side loading conditions
 * - Accumulation mode
 * - Environment (washdown, dusty)
 * - Belt speed
 *
 * Crowned = default for simple, short, one-direction conveyors
 * V-guided = for demanding applications (reversing, high L:W, side loading, etc.)
 */

import {
  SliderbedInputs,
  DirectionMode,
  SideLoadingDirection,
  SideLoadingSeverity,
  EnvironmentFactors,
  BeltTrackingMethod,
} from './schema';

// ============================================================================
// TYPES
// ============================================================================

export enum TrackingRiskLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export interface TrackingRiskFactor {
  /** Factor name for display */
  name: string;
  /** Risk contribution: Low, Medium, or High */
  risk: TrackingRiskLevel;
  /** Plain-English explanation */
  explanation: string;
}

export interface TrackingGuidance {
  /** Recommended tracking method */
  recommendation: BeltTrackingMethod;
  /** Overall risk level if crowned is used */
  riskLevel: TrackingRiskLevel;
  /** Short summary statement */
  summary: string;
  /** Individual risk factors assessed */
  factors: TrackingRiskFactor[];
  /** Warning messages (for high-risk scenarios) */
  warnings: string[];
  /** Informational notes */
  notes: string[];
}

// ============================================================================
// THRESHOLDS
// ============================================================================

/** L:W ratio thresholds for tracking risk */
const LW_RATIO_TOO_LOW_THRESHOLD = 2.0; // Below this = too short/wide for crowned
const LW_RATIO_LOW_THRESHOLD = 3.0; // Below this = Low risk
const LW_RATIO_HIGH_THRESHOLD = 6.0; // Above this = High risk

/** Belt speed thresholds (FPM) */
const SPEED_MEDIUM_THRESHOLD = 100; // Above this = Medium risk
const SPEED_HIGH_THRESHOLD = 200; // Above this = High risk

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Compute length-to-width ratio safely (avoids divide-by-zero)
 */
function computeLengthWidthRatio(lengthIn: number, widthIn: number): number {
  if (!widthIn || widthIn <= 0) return Infinity;
  return lengthIn / widthIn;
}

// ============================================================================
// RISK ASSESSMENT FUNCTIONS
// ============================================================================

/**
 * Assess tracking risk from length-to-width ratio
 */
function assessLengthWidthRatio(
  lengthIn: number,
  widthIn: number
): TrackingRiskFactor {
  const ratio = computeLengthWidthRatio(lengthIn, widthIn);

  if (ratio <= LW_RATIO_LOW_THRESHOLD) {
    return {
      name: 'Length-to-Width Ratio',
      risk: TrackingRiskLevel.Low,
      explanation: `L:W ratio of ${ratio.toFixed(1)}:1 is favorable for crowned tracking.`,
    };
  } else if (ratio <= LW_RATIO_HIGH_THRESHOLD) {
    return {
      name: 'Length-to-Width Ratio',
      risk: TrackingRiskLevel.Medium,
      explanation: `L:W ratio of ${ratio.toFixed(1)}:1 is moderate. Consider V-guided for better tracking stability.`,
    };
  } else {
    return {
      name: 'Length-to-Width Ratio',
      risk: TrackingRiskLevel.High,
      explanation: `L:W ratio of ${ratio.toFixed(1)}:1 is high. V-guided tracking is strongly recommended.`,
    };
  }
}

/**
 * Assess tracking risk from direction mode (reversing)
 */
function assessDirectionMode(directionMode: DirectionMode | string): TrackingRiskFactor {
  const isReversing = directionMode === DirectionMode.Reversing;

  if (isReversing) {
    return {
      name: 'Reversing Operation',
      risk: TrackingRiskLevel.High,
      explanation: 'Reversing operation makes crowned tracking unreliable. V-guided is strongly recommended.',
    };
  } else {
    return {
      name: 'Reversing Operation',
      risk: TrackingRiskLevel.Low,
      explanation: 'One-direction operation is compatible with crowned tracking.',
    };
  }
}

/**
 * Assess tracking risk from side loading conditions
 */
function assessSideLoading(
  direction: SideLoadingDirection | string,
  severity?: SideLoadingSeverity | string
): TrackingRiskFactor {
  if (direction === SideLoadingDirection.None) {
    return {
      name: 'Side Loading',
      risk: TrackingRiskLevel.Low,
      explanation: 'No side loading allows crowned tracking to work effectively.',
    };
  }

  // Has side loading - assess severity
  if (severity === SideLoadingSeverity.Light) {
    return {
      name: 'Side Loading',
      risk: TrackingRiskLevel.Medium,
      explanation: `Light side loading from ${direction.toLowerCase()} may cause occasional mis-tracking with crowned pulleys.`,
    };
  } else if (severity === SideLoadingSeverity.Moderate) {
    return {
      name: 'Side Loading',
      risk: TrackingRiskLevel.Medium,
      explanation: `Moderate side loading from ${direction.toLowerCase()} increases tracking difficulty. V-guided is recommended.`,
    };
  } else {
    // Heavy
    return {
      name: 'Side Loading',
      risk: TrackingRiskLevel.High,
      explanation: `Heavy side loading from ${direction.toLowerCase()} will likely cause belt mis-tracking. V-guided is strongly recommended.`,
    };
  }
}

/**
 * Assess tracking risk from accumulation mode
 * (When start_stop_application is true with short cycle times, parts accumulate)
 */
function assessAccumulation(
  startStopApplication: boolean,
  cycleTimeSeconds?: number
): TrackingRiskFactor {
  if (!startStopApplication) {
    return {
      name: 'Accumulation',
      risk: TrackingRiskLevel.Low,
      explanation: 'Continuous operation without accumulation is ideal for crowned tracking.',
    };
  }

  // Has start/stop - check cycle time
  if (cycleTimeSeconds !== undefined && cycleTimeSeconds < 10) {
    return {
      name: 'Accumulation',
      risk: TrackingRiskLevel.Medium,
      explanation: `Frequent start/stop (${cycleTimeSeconds}s cycle) with accumulation may stress belt tracking.`,
    };
  } else {
    return {
      name: 'Accumulation',
      risk: TrackingRiskLevel.Low,
      explanation: 'Start/stop operation with adequate cycle time is compatible with crowned tracking.',
    };
  }
}

/**
 * Assess tracking risk from environment
 */
function assessEnvironment(environment: EnvironmentFactors | string): TrackingRiskFactor {
  if (environment === EnvironmentFactors.Washdown) {
    return {
      name: 'Environment',
      risk: TrackingRiskLevel.Medium,
      explanation: 'Washdown environments may cause belt slip on crowned pulleys. Consider V-guided or lagged pulleys.',
    };
  } else if (environment === EnvironmentFactors.Dusty) {
    return {
      name: 'Environment',
      risk: TrackingRiskLevel.Medium,
      explanation: 'Dusty environments can affect belt grip on crowned pulleys. Regular maintenance is important.',
    };
  } else if (environment === EnvironmentFactors.Outdoor) {
    return {
      name: 'Environment',
      risk: TrackingRiskLevel.Low,
      explanation: 'Outdoor installation is compatible with crowned tracking with proper belt selection.',
    };
  } else {
    return {
      name: 'Environment',
      risk: TrackingRiskLevel.Low,
      explanation: 'Indoor environment is ideal for crowned tracking.',
    };
  }
}

/**
 * Assess tracking risk from belt speed
 */
function assessBeltSpeed(speedFpm: number): TrackingRiskFactor {
  if (speedFpm <= SPEED_MEDIUM_THRESHOLD) {
    return {
      name: 'Belt Speed',
      risk: TrackingRiskLevel.Low,
      explanation: `Belt speed of ${speedFpm} FPM is low. Crowned tracking is suitable.`,
    };
  } else if (speedFpm <= SPEED_HIGH_THRESHOLD) {
    return {
      name: 'Belt Speed',
      risk: TrackingRiskLevel.Medium,
      explanation: `Belt speed of ${speedFpm} FPM is moderate. Tracking adjustment may be needed.`,
    };
  } else {
    return {
      name: 'Belt Speed',
      risk: TrackingRiskLevel.High,
      explanation: `Belt speed of ${speedFpm} FPM is high. V-guided tracking provides better stability.`,
    };
  }
}

// ============================================================================
// MAIN GUIDANCE FUNCTION
// ============================================================================

/**
 * Calculate belt tracking guidance based on conveyor inputs
 *
 * @param inputs - Sliderbed conveyor inputs
 * @returns TrackingGuidance with recommendation, risk level, and explanations
 */
export function calculateTrackingGuidance(inputs: SliderbedInputs): TrackingGuidance {
  // Assess all risk factors
  const factors: TrackingRiskFactor[] = [
    assessLengthWidthRatio(inputs.conveyor_length_cc_in, inputs.conveyor_width_in),
    assessDirectionMode(inputs.direction_mode),
    assessSideLoading(inputs.side_loading_direction, inputs.side_loading_severity),
    assessAccumulation(inputs.start_stop_application, inputs.cycle_time_seconds),
    assessEnvironment(inputs.environment_factors),
    assessBeltSpeed(inputs.belt_speed_fpm),
  ];

  // Count risk levels
  const highRiskCount = factors.filter(f => f.risk === TrackingRiskLevel.High).length;
  const mediumRiskCount = factors.filter(f => f.risk === TrackingRiskLevel.Medium).length;

  // Determine overall risk level
  let riskLevel: TrackingRiskLevel;
  if (highRiskCount >= 1) {
    riskLevel = TrackingRiskLevel.High;
  } else if (mediumRiskCount >= 2) {
    riskLevel = TrackingRiskLevel.High;
  } else if (mediumRiskCount >= 1) {
    riskLevel = TrackingRiskLevel.Medium;
  } else {
    riskLevel = TrackingRiskLevel.Low;
  }

  // Determine recommendation
  let recommendation: BeltTrackingMethod;
  if (riskLevel === TrackingRiskLevel.High) {
    recommendation = BeltTrackingMethod.VGuided;
  } else if (riskLevel === TrackingRiskLevel.Medium) {
    // Medium risk: suggest V-guided but crowned is acceptable
    recommendation = BeltTrackingMethod.VGuided;
  } else {
    recommendation = BeltTrackingMethod.Crowned;
  }

  // Generate warnings
  const warnings: string[] = [];

  // Check for reversing with crowned selection
  if (
    inputs.direction_mode === DirectionMode.Reversing &&
    inputs.belt_tracking_method === BeltTrackingMethod.Crowned
  ) {
    warnings.push(
      'Reversing operation with crowned tracking may cause belt mis-tracking. V-guided is strongly recommended.'
    );
  }

  // Check for L:W ratio issues with crowned
  const lwRatio = computeLengthWidthRatio(inputs.conveyor_length_cc_in, inputs.conveyor_width_in);
  if (lwRatio > LW_RATIO_HIGH_THRESHOLD && inputs.belt_tracking_method === BeltTrackingMethod.Crowned) {
    warnings.push(
      `High length-to-width ratio (${lwRatio.toFixed(1)}:1) with crowned tracking increases mis-tracking risk.`
    );
  }
  if (lwRatio < LW_RATIO_TOO_LOW_THRESHOLD && inputs.belt_tracking_method === BeltTrackingMethod.Crowned) {
    warnings.push(
      `Low length-to-width ratio (${lwRatio.toFixed(1)}:1) with crowned tracking increases mis-tracking risk. Consider V-guided tracking.`
    );
  }

  // Check for heavy side loading with crowned
  if (
    inputs.side_loading_direction !== SideLoadingDirection.None &&
    inputs.side_loading_severity === SideLoadingSeverity.Heavy &&
    inputs.belt_tracking_method === BeltTrackingMethod.Crowned
  ) {
    warnings.push('Heavy side loading with crowned tracking will likely cause belt wander.');
  }

  // Generate notes
  const notes: string[] = [];

  if (recommendation === BeltTrackingMethod.Crowned) {
    notes.push('Crowned pulleys are cost-effective and suitable for this application.');
    if (inputs.conveyor_width_in < 12) {
      notes.push('Narrow belts may require more frequent tracking adjustment.');
    }
  } else {
    notes.push('V-guided tracking provides positive belt control for demanding applications.');
    notes.push('V-guide adds belt cost but reduces maintenance and downtime.');
  }

  // If user selected crowned but we recommend V-guided
  if (
    recommendation === BeltTrackingMethod.VGuided &&
    inputs.belt_tracking_method === BeltTrackingMethod.Crowned
  ) {
    notes.push(
      'Current selection: Crowned. Consider switching to V-guided for better reliability.'
    );
  }

  // Generate summary
  let summary: string;
  if (riskLevel === TrackingRiskLevel.Low) {
    summary = 'Crowned tracking is suitable for this application.';
  } else if (riskLevel === TrackingRiskLevel.Medium) {
    summary = 'V-guided tracking is recommended for improved reliability.';
  } else {
    summary = 'V-guided tracking is strongly recommended due to demanding conditions.';
  }

  return {
    recommendation,
    riskLevel,
    summary,
    factors,
    warnings,
    notes,
  };
}

/**
 * Get a short tooltip text for tracking method selection
 */
export function getTrackingTooltip(inputs: SliderbedInputs): string {
  const guidance = calculateTrackingGuidance(inputs);

  const highRiskFactors = guidance.factors
    .filter(f => f.risk === TrackingRiskLevel.High)
    .map(f => f.name.toLowerCase());

  if (highRiskFactors.length > 0) {
    return `V-guided recommended due to: ${highRiskFactors.join(', ')}`;
  }

  const mediumRiskFactors = guidance.factors
    .filter(f => f.risk === TrackingRiskLevel.Medium)
    .map(f => f.name.toLowerCase());

  if (mediumRiskFactors.length > 0) {
    return `Consider V-guided due to: ${mediumRiskFactors.join(', ')}`;
  }

  return 'Crowned tracking is suitable for this application.';
}

/**
 * Check if current tracking selection matches recommendation
 */
export function isTrackingSelectionOptimal(inputs: SliderbedInputs): boolean {
  const guidance = calculateTrackingGuidance(inputs);
  return inputs.belt_tracking_method === guidance.recommendation;
}

/**
 * Get risk level badge color class
 */
export function getRiskLevelColor(riskLevel: TrackingRiskLevel): string {
  switch (riskLevel) {
    case TrackingRiskLevel.Low:
      return 'bg-green-100 text-green-800';
    case TrackingRiskLevel.Medium:
      return 'bg-yellow-100 text-yellow-800';
    case TrackingRiskLevel.High:
      return 'bg-red-100 text-red-800';
  }
}

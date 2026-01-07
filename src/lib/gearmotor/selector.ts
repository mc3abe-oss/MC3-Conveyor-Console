/**
 * Gearmotor Selector
 *
 * Selects the best gearmotor from vendor performance data based on:
 * - Required output RPM
 * - Required output torque (lb-in)
 * - Chosen service factor
 * - Speed tolerance percentage
 *
 * Series policy: FLEXBLOC FIRST, MINICASE as fallback.
 *
 * Ranking:
 * 1. Smallest oversize ratio (adjusted_capacity / required_torque)
 * 2. Closest speed match
 * 3. Smallest motor HP
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type GearmotorSeries = 'FLEXBLOC' | 'MINICASE';

export interface GearmotorSelectionInputs {
  required_output_rpm: number;
  required_output_torque_lb_in: number;
  chosen_service_factor: number;
  speed_tolerance_pct?: number; // Default 15
}

export interface GearmotorCandidate {
  performance_point_id: string;
  gear_unit_component_id: string;
  vendor: string;
  series: GearmotorSeries;
  size_code: string;
  gear_unit_part_number: string;
  gear_unit_description: string;
  motor_hp: number;
  output_rpm: number;
  output_torque_lb_in: number;
  service_factor_catalog: number;
  source_ref: string | null;
  // Computed fields
  adjusted_capacity: number;
  oversize_ratio: number;
  speed_delta: number;
  speed_delta_pct: number;
}

export interface GearmotorSelectionResult {
  candidates: GearmotorCandidate[];
  selected_series: GearmotorSeries | null;
  message: string | null;
  inputs: GearmotorSelectionInputs;
}

// ============================================================================
// SELECTOR FUNCTION
// ============================================================================

/**
 * Select gearmotor candidates based on requirements.
 *
 * @param inputs Selection requirements
 * @returns Ranked list of candidates (best first)
 */
export async function selectGearmotor(
  inputs: GearmotorSelectionInputs
): Promise<GearmotorSelectionResult> {
  const {
    required_output_rpm,
    required_output_torque_lb_in,
    chosen_service_factor,
    speed_tolerance_pct = 15,
  } = inputs;

  // Validate inputs
  if (required_output_rpm <= 0) {
    return {
      candidates: [],
      selected_series: null,
      message: 'Required output RPM must be greater than 0',
      inputs,
    };
  }

  if (required_output_torque_lb_in <= 0) {
    return {
      candidates: [],
      selected_series: null,
      message: 'Required output torque must be greater than 0',
      inputs,
    };
  }

  if (chosen_service_factor <= 0) {
    return {
      candidates: [],
      selected_series: null,
      message: 'Service factor must be greater than 0',
      inputs,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      candidates: [],
      selected_series: null,
      message: 'Database not configured',
      inputs,
    };
  }

  // Calculate speed bounds
  const speedTolerance = required_output_rpm * (speed_tolerance_pct / 100);
  const minRpm = required_output_rpm - speedTolerance;
  const maxRpm = required_output_rpm + speedTolerance;

  // Series policy: FLEXBLOC first
  const seriesOrder: GearmotorSeries[] = ['FLEXBLOC', 'MINICASE'];

  for (const series of seriesOrder) {
    const candidates = await queryCandidates(
      series,
      minRpm,
      maxRpm,
      required_output_torque_lb_in,
      chosen_service_factor
    );

    if (candidates.length > 0) {
      // Rank and return
      const ranked = rankCandidates(
        candidates,
        required_output_rpm,
        required_output_torque_lb_in
      );

      return {
        candidates: ranked,
        selected_series: series,
        message: null,
        inputs,
      };
    }
  }

  // No candidates found in any series
  return {
    candidates: [],
    selected_series: null,
    message: `No gearmotor found matching requirements: ${required_output_rpm} RPM, ${required_output_torque_lb_in} lb-in @ SF ${chosen_service_factor}. Try adjusting the service factor or speed tolerance.`,
    inputs,
  };
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

async function queryCandidates(
  series: GearmotorSeries,
  minRpm: number,
  maxRpm: number,
  requiredTorque: number,
  chosenSF: number
): Promise<GearmotorCandidate[]> {
  // Query performance points with gear unit info
  // Speed filter: output_rpm BETWEEN minRpm AND maxRpm
  // Torque filter: adjusted_capacity >= requiredTorque
  //   where adjusted_capacity = output_torque_lb_in * (chosenSF / service_factor_catalog)

  const { data, error } = await supabase
    .from('vendor_performance_points')
    .select(`
      id,
      vendor,
      series,
      size_code,
      gear_unit_component_id,
      motor_hp,
      output_rpm,
      output_torque_lb_in,
      service_factor_catalog,
      source_ref,
      vendor_components!inner (
        id,
        vendor_part_number,
        description
      )
    `)
    .eq('series', series)
    .gte('output_rpm', minRpm)
    .lte('output_rpm', maxRpm);

  if (error) {
    console.error('Gearmotor query error:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Filter by torque capacity (with SF normalization)
  const candidates: GearmotorCandidate[] = [];

  for (const row of data) {
    const catalogSF = row.service_factor_catalog || 1.0;
    const adjustedCapacity = row.output_torque_lb_in * (chosenSF / catalogSF);

    // Torque must meet requirement
    if (adjustedCapacity < requiredTorque) {
      continue;
    }

    const speedDelta = Math.abs(row.output_rpm - (minRpm + maxRpm) / 2);
    const requiredRpm = (minRpm + maxRpm) / 2;
    const speedDeltaPct = (speedDelta / requiredRpm) * 100;

    // Access joined component data
    const component = row.vendor_components as unknown as {
      id: string;
      vendor_part_number: string;
      description: string;
    };

    candidates.push({
      performance_point_id: row.id,
      gear_unit_component_id: row.gear_unit_component_id,
      vendor: row.vendor,
      series: row.series as GearmotorSeries,
      size_code: row.size_code,
      gear_unit_part_number: component.vendor_part_number,
      gear_unit_description: component.description || '',
      motor_hp: row.motor_hp,
      output_rpm: row.output_rpm,
      output_torque_lb_in: row.output_torque_lb_in,
      service_factor_catalog: row.service_factor_catalog,
      source_ref: row.source_ref,
      adjusted_capacity: adjustedCapacity,
      oversize_ratio: adjustedCapacity / requiredTorque,
      speed_delta: speedDelta,
      speed_delta_pct: speedDeltaPct,
    });
  }

  return candidates;
}

// ============================================================================
// RANKING
// ============================================================================

function rankCandidates(
  candidates: GearmotorCandidate[],
  requiredRpm: number,
  _requiredTorque: number
): GearmotorCandidate[] {
  // Recompute speed_delta using actual required RPM (not bounds midpoint)
  for (const c of candidates) {
    c.speed_delta = Math.abs(c.output_rpm - requiredRpm);
    c.speed_delta_pct = (c.speed_delta / requiredRpm) * 100;
  }

  // Sort by:
  // 1. Smallest oversize_ratio (closest to 1.0 without going under)
  // 2. Smallest speed_delta (closest to required RPM)
  // 3. Smallest motor_hp

  return candidates.sort((a, b) => {
    // Primary: oversize ratio
    const oversizeDiff = a.oversize_ratio - b.oversize_ratio;
    if (Math.abs(oversizeDiff) > 0.001) {
      return oversizeDiff;
    }

    // Secondary: speed delta
    const speedDiff = a.speed_delta - b.speed_delta;
    if (Math.abs(speedDiff) > 0.01) {
      return speedDiff;
    }

    // Tertiary: motor HP
    return a.motor_hp - b.motor_hp;
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default selectGearmotor;

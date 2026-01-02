/**
 * JSON Export for Outputs V2
 *
 * Exports the full outputs_v2 object as stable JSON.
 */

import { OutputsV2 } from './schema';

/**
 * Export outputs_v2 to JSON string
 * Keys are ordered consistently for stability
 */
export function exportOutputsV2ToJSON(outputs: OutputsV2, pretty = true): string {
  // Use replacer to order keys consistently
  const keyOrder = [
    // Top level
    'meta',
    'summary',
    'support_system',
    'calc_results',
    'components',
    'design_geometry',
    'warnings_and_notes',
    'exports',
    // Meta
    'schema_version',
    'min_compatible_version',
    'generated_at_iso',
    'source_model_version',
    'output_contracts_generated',
    // Summary
    'conveyor_id',
    'conveyor_type',
    'duty',
    'environment_tags',
    'belt_speed_fpm',
    'center_distance_in',
    'overall_length_in',
    'incline_deg',
    // Support system
    'support_type',
    'is_floor_supported',
    'tob_relevance',
    'has_legs',
    'has_casters',
    'notes',
    // Calc results
    'effective_tension_lbf',
    'tight_side_tension_lbf',
    'slack_side_tension_lbf',
    'required_torque_inlb',
    'required_power_hp',
    'service_factor',
    'drive_rpm',
    'wrap_angle_deg',
    // Component
    'component_id',
    'component_type',
    'role',
    'spec',
    'selection',
    'validation',
    'vendor_packet',
    'overrides',
    'status',
    'messages',
    'assumptions',
    // Design geometry
    'top_of_belt_in',
    'frame_height_in',
    'pulley_locations',
    'roller_spacing_in',
    'value',
    'applicable',
    'reference_only',
    'note',
    'station_in',
    'carry',
    'return',
    // Warning
    'severity',
    'code',
    'message',
    'recommendation',
    'impacts',
    'related_component_ids',
    // Exports
    'json_ready',
    'csv_rows',
    'vendor_packets',
    'columns',
    'rows',
    // Vendor packet common
    'qty',
    // Belt
    'belt_style',
    'belt_width_in',
    'endless',
    'splice_type',
    'material',
    'series',
    'plies',
    'total_thickness_in',
    'tracking',
    'v_guide',
    'cleats',
    'minimum_pulley_diameter_in',
    'operating_conditions',
    'type',
    'included',
    'profile',
    'location',
    'bond_type',
    'height_in',
    'spacing_in',
    'orientation',
    'speed_fpm',
    'load_type',
    // Pulley
    'pulley_role',
    'face_length_in',
    'diameter_in',
    'surface_finish',
    'balance',
    'lagging',
    'crown',
    'hub',
    'shaft',
    'bearing_centers_in',
    'loads',
    'weight_lbs',
    'thickness_in',
    'coverage',
    'value_in',
    'bore_in',
    'key',
    'required_diameter_in',
    'extension_left_in',
    'extension_right_in',
    'belt_tension_lbf',
    'torque_inlb',
    // Roller
    'roller_role',
    'roller_diameter_in',
    'roller_face_in',
    'tube',
    'axle',
    'bearing',
    'required_load_lbf',
    'load_rating_lbf',
    'gauge',
    'diameter_in',
    'seal',
    // Drive
    'required_output_rpm',
    'required_output_torque_inlb',
    'service_factor_target',
    'electrical',
    'enclosure',
    'thermal_protection',
    'brake',
    'mounting',
    'frame_size',
    'output_shaft',
    'volts',
    'phase',
    'hz',
    'required',
    // Supports
    'legs',
    'casters',
    'height_adjustment_range_in',
    'foot_type',
    'load_rating_lbf_each',
    'min',
    'max',
    'wheel_diameter_in',
    'locking',
  ];

  const keyPriority = new Map(keyOrder.map((k, i) => [k, i]));

  function sortKeys(a: string, b: string): number {
    const priorityA = keyPriority.get(a) ?? 999;
    const priorityB = keyPriority.get(b) ?? 999;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return a.localeCompare(b);
  }

  function replacer(this: unknown, _key: string, value: unknown): unknown {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(value).sort(sortKeys);
      for (const k of keys) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  }

  return JSON.stringify(outputs, replacer, pretty ? 2 : 0);
}

/**
 * Parse JSON string back to OutputsV2
 */
export function parseOutputsV2FromJSON(json: string): OutputsV2 {
  return JSON.parse(json) as OutputsV2;
}

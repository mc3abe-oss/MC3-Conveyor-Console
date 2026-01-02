/**
 * Vendor Packet Builders
 *
 * Builds vendor-ready specification packets for each component type.
 * Each builder returns both the vendor_packet and a ComponentV2 entry.
 */

import { SliderbedInputs, SliderbedOutputs, ReturnSnubMode, ReturnFrameStyle } from '../schema';
import {
  ComponentV2,
  VendorPacketBeltV2,
  VendorPacketPulleyV2,
  VendorPacketRollerV2,
  VendorPacketDriveV2,
  VendorPacketLegsV2,
  VendorPacketCastersV2,
  VendorPacketBundleV2,
  CanonicalComponentId,
  OutputMessageV2,
} from './schema';
import { getWarningsForComponent, getWorstStatus } from './warnings';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getEnvironmentTags(inputs: SliderbedInputs): string[] {
  const tags: string[] = [];
  const envFactors = inputs.environment_factors;
  if (Array.isArray(envFactors)) {
    envFactors.forEach((f) => {
      if (typeof f === 'string') {
        tags.push(f.toLowerCase());
      }
    });
  }
  return tags;
}

function parseCleatHeight(cleatSize: string | undefined): number | null {
  if (!cleatSize) return null;
  // Parse sizes like "1"", "1.5"", "2""
  const match = cleatSize.match(/^([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

// =============================================================================
// BELT PACKET BUILDER
// =============================================================================

export interface BeltPacketResult {
  component: ComponentV2;
  vendor_packet: VendorPacketBeltV2;
}

export function buildBeltPacket(
  inputs: SliderbedInputs,
  outputs: SliderbedOutputs,
  warnings: OutputMessageV2[]
): BeltPacketResult {
  const componentId: CanonicalComponentId = 'belt_primary';
  const componentWarnings = getWarningsForComponent(warnings, componentId);

  // Determine tracking type
  const isVGuided = outputs.is_v_guided ?? false;
  const trackingType = isVGuided ? 'v_guide' : 'crowned_pulley';

  // Cleats info
  const cleatsEnabled = outputs.cleats_enabled ?? inputs.cleats_enabled ?? false;
  const cleatHeight = parseCleatHeight(inputs.cleat_size);

  // Governing minimum pulley diameter
  const governingMin = outputs.required_min_pulley_diameter_in ?? null;

  // Belt dimensions
  const beltWidth = inputs.belt_width_in ?? null;
  const beltLength = outputs.total_belt_length_in ?? null;

  const vendor_packet: VendorPacketBeltV2 = {
    qty: 1,
    belt_style: 'Sliderbed conveyor belt',
    belt_width_in: beltWidth,
    overall_length_in: beltLength,
    endless: true, // Default assumption for sliderbed
    splice_type: inputs.lacing_style ?? 'finger',
    material: (inputs as unknown as Record<string, unknown>).selected_belt_series
      ? String((inputs as unknown as Record<string, unknown>).selected_belt_series).split(' ')[0]
      : null,
    series: ((inputs as unknown as Record<string, unknown>).selected_belt_series as string) ?? null,
    plies: null, // Not in current schema
    total_thickness_in: null, // Would come from belt catalog

    tracking: {
      type: trackingType,
      note: isVGuided ? 'V-guide for positive tracking' : 'Crowned pulleys for tracking',
    },

    v_guide: {
      included: isVGuided,
      profile: isVGuided ? ((inputs as unknown as Record<string, unknown>).selected_v_guide as string) ?? null : null,
      location: isVGuided ? 'centered' : null,
      bond_type: isVGuided ? 'hot-weld' : null,
    },

    cleats: {
      included: cleatsEnabled,
      profile: cleatsEnabled ? (inputs.cleat_profile ?? null) : null,
      height_in: cleatsEnabled ? cleatHeight : null,
      spacing_in: cleatsEnabled ? (inputs.cleat_spacing_in ?? null) : null,
      orientation: cleatsEnabled ? (inputs.cleat_pattern ?? null) : null,
    },

    minimum_pulley_diameter_in: governingMin,

    operating_conditions: {
      speed_fpm: outputs.belt_speed_fpm ?? null,
      load_type: inputs.material_form === 'BULK' ? 'bulk' : 'parts',
      environment_tags: getEnvironmentTags(inputs),
    },

    notes: null,
  };

  // Build spec with min pulley breakdown
  const spec: Record<string, unknown> = {
    belt_width_in: beltWidth,
    overall_length_in: beltLength,
    is_v_guided: isVGuided,
    cleats_enabled: cleatsEnabled,
    min_recommended_pulley_diameter_in: {
      belt_only: outputs.min_pulley_base_in ?? null,
      v_guide: isVGuided ? (outputs.vguide_min_pulley_dia_in ?? null) : null,
      cleats: cleatsEnabled ? (outputs.cleats_min_pulley_diameter_in ?? null) : null,
      governing: governingMin,
    },
  };

  const component: ComponentV2 = {
    component_id: componentId,
    component_type: 'belt',
    role: 'primary',
    spec,
    selection: { overrides: {} },
    validation: {
      status: getWorstStatus(componentWarnings),
      messages: componentWarnings,
      assumptions: [],
    },
    vendor_packet,
  };

  return { component, vendor_packet };
}

// =============================================================================
// PULLEY PACKET BUILDER
// =============================================================================

export interface PulleyPacketResult {
  component: ComponentV2;
  vendor_packet: VendorPacketPulleyV2;
}

function buildSinglePulleyPacket(
  componentId: CanonicalComponentId,
  role: string,
  pulleyRole: string,
  inputs: SliderbedInputs,
  outputs: SliderbedOutputs,
  warnings: OutputMessageV2[],
  options: {
    diameter_in: number | null;
    tension_lbf?: number | null;
    torque_inlb?: number | null;
    shaft_diameter_in?: number | null;
    isLagged?: boolean;
  }
): PulleyPacketResult {
  const componentWarnings = getWarningsForComponent(warnings, componentId);
  const beltWidth = inputs.belt_width_in ?? null;
  const faceLength = outputs.pulley_face_length_in ?? null;

  const vendor_packet: VendorPacketPulleyV2 = {
    qty: 1,
    pulley_role: pulleyRole,
    belt_width_in: beltWidth,
    face_length_in: faceLength,
    diameter_in: options.diameter_in,
    surface_finish: options.isLagged ? 'lagged' : 'bare',
    balance: 'not_required', // Default for conveyor pulleys

    lagging: {
      included: options.isLagged ?? false,
      type: options.isLagged ? 'rubber' : null,
      thickness_in: options.isLagged ? 0.25 : null,
      coverage: options.isLagged ? 'full' : null,
    },

    crown: {
      type: outputs.pulley_requires_crown ? 'crowned' : 'flat',
      value_in: outputs.pulley_requires_crown ? 0.0625 : null, // 1/16" typical crown
    },

    hub: {
      type: 'QD bushing',
      bore_in: options.shaft_diameter_in ?? null,
      key: options.shaft_diameter_in ? 'standard' : null,
    },

    shaft: {
      required_diameter_in: options.shaft_diameter_in ?? null,
      extension_left_in: null, // Would need input
      extension_right_in: null,
    },

    bearing_centers_in: faceLength ? faceLength + 2 : null, // Rough estimate

    loads: {
      belt_tension_lbf: options.tension_lbf ?? null,
      torque_inlb: options.torque_inlb ?? null,
    },

    weight_lbs: null, // Would come from catalog

    notes: null,
  };

  const spec: Record<string, unknown> = {
    diameter_in: options.diameter_in,
    face_length_in: faceLength,
    shaft_diameter_in: options.shaft_diameter_in,
    is_lagged: options.isLagged,
  };

  const component: ComponentV2 = {
    component_id: componentId,
    component_type: 'pulley',
    role,
    spec,
    selection: { overrides: {} },
    validation: {
      status: getWorstStatus(componentWarnings),
      messages: componentWarnings,
      assumptions: [],
    },
    vendor_packet,
  };

  return { component, vendor_packet };
}

export function buildPulleyPackets(
  inputs: SliderbedInputs,
  outputs: SliderbedOutputs,
  warnings: OutputMessageV2[]
): PulleyPacketResult[] {
  const results: PulleyPacketResult[] = [];

  // Drive pulley
  const driveOd = outputs.drive_pulley_finished_od_in ?? outputs.drive_pulley_diameter_in ?? null;
  results.push(
    buildSinglePulleyPacket('pulley_drive', 'drive', 'drive', inputs, outputs, warnings, {
      diameter_in: driveOd,
      tension_lbf: outputs.total_belt_pull_lb ?? null,
      torque_inlb: outputs.torque_drive_shaft_inlbf ?? null,
      shaft_diameter_in: outputs.drive_shaft_diameter_in ?? null,
      isLagged: true, // Drive pulleys typically lagged
    })
  );

  // Tail pulley
  const tailOd = outputs.tail_pulley_finished_od_in ?? outputs.tail_pulley_diameter_in ?? null;
  results.push(
    buildSinglePulleyPacket('pulley_tail', 'tail', 'tail', inputs, outputs, warnings, {
      diameter_in: tailOd,
      shaft_diameter_in: outputs.tail_shaft_diameter_in ?? null,
      isLagged: false, // Tail pulleys typically bare
    })
  );

  // Snub rollers (if enabled via return support config)
  const returnSnubMode = inputs.return_snub_mode ?? ReturnSnubMode.Auto;
  const returnFrameStyle = inputs.return_frame_style ?? ReturnFrameStyle.Standard;

  // Determine if snubs are enabled
  let snubsEnabled = false;
  if (returnSnubMode === ReturnSnubMode.Yes || returnSnubMode === 'YES') {
    snubsEnabled = true;
  } else if (returnSnubMode === ReturnSnubMode.No || returnSnubMode === 'NO') {
    snubsEnabled = false;
  } else {
    // Auto mode: Low Profile enables snubs
    snubsEnabled = returnFrameStyle === ReturnFrameStyle.LowProfile || returnFrameStyle === 'LOW_PROFILE';
  }

  if (snubsEnabled) {
    const snubDia = inputs.return_snub_roller_diameter_in ?? 2.5;

    // Drive end snub
    results.push(
      buildSinglePulleyPacket('pulley_snub_drive', 'snub_drive', 'snub', inputs, outputs, warnings, {
        diameter_in: snubDia,
        isLagged: false,
      })
    );

    // Tail end snub
    results.push(
      buildSinglePulleyPacket('pulley_snub_tail', 'snub_tail', 'snub', inputs, outputs, warnings, {
        diameter_in: snubDia,
        isLagged: false,
      })
    );
  }

  // Takeup pulley - not typically used in standard sliderbed, skip for now

  return results;
}

// =============================================================================
// ROLLER PACKET BUILDER
// =============================================================================

export interface RollerPacketResult {
  component: ComponentV2;
  vendor_packet: VendorPacketRollerV2;
}

export function buildRollerPackets(
  inputs: SliderbedInputs,
  _outputs: SliderbedOutputs,
  warnings: OutputMessageV2[]
): RollerPacketResult[] {
  const results: RollerPacketResult[] = [];
  const beltWidth = inputs.belt_width_in ?? 18;

  // Gravity return rollers
  const gravityCount = inputs.return_gravity_roller_count ?? 2;
  const gravityDia = inputs.return_gravity_roller_diameter_in ?? 1.9;

  // Calculate spacing if we have conveyor length
  let gravitySpacing: number | null = null;
  const conveyorLength = inputs.conveyor_length_cc_in ?? 0;
  if (conveyorLength > 0 && gravityCount >= 2) {
    gravitySpacing = conveyorLength / (gravityCount - 1);
  }

  const gravityWarnings = getWarningsForComponent(warnings, 'roller_gravity');

  const gravityPacket: VendorPacketRollerV2 = {
    qty: gravityCount,
    roller_role: 'gravity',
    roller_diameter_in: gravityDia,
    roller_face_in: beltWidth + 1, // Typical: belt width + 1"

    tube: {
      material: 'steel',
      gauge: 16, // Typical for gravity rollers
    },

    axle: {
      type: 'hex',
      diameter_in: 0.4375, // 7/16" typical
    },

    bearing: {
      type: 'precision',
      seal: 'shielded',
    },

    required_load_lbf: null, // Would need to calculate
    load_rating_lbf: null, // Would come from roller catalog
    spacing_in: gravitySpacing,
    notes: null,
  };

  const gravityComponent: ComponentV2 = {
    component_id: 'roller_gravity',
    component_type: 'roller',
    role: 'gravity',
    spec: {
      qty: gravityCount,
      diameter_in: gravityDia,
      spacing_in: gravitySpacing,
    },
    selection: { overrides: {} },
    validation: {
      status: getWorstStatus(gravityWarnings),
      messages: gravityWarnings,
      assumptions: [],
    },
    vendor_packet: gravityPacket,
  };

  results.push({ component: gravityComponent, vendor_packet: gravityPacket });

  return results;
}

// =============================================================================
// DRIVE PACKET BUILDER
// =============================================================================

export interface DrivePacketResult {
  component: ComponentV2;
  vendor_packet: VendorPacketDriveV2;
}

export function buildDrivePacket(
  inputs: SliderbedInputs,
  outputs: SliderbedOutputs,
  warnings: OutputMessageV2[]
): DrivePacketResult {
  const componentId: CanonicalComponentId = 'drive_primary';
  const componentWarnings = getWarningsForComponent(warnings, componentId);

  // Electrical from inputs
  const powerFeed = inputs.power_feed ?? '480V/3ph/60Hz';
  let volts: number | null = 480;
  let phase: number | null = 3;
  let hz: number | null = 60;

  // Parse power feed string
  const voltMatch = powerFeed.match(/(\d+)V/i);
  if (voltMatch) volts = parseInt(voltMatch[1]);
  const phaseMatch = powerFeed.match(/(\d+)ph/i);
  if (phaseMatch) phase = parseInt(phaseMatch[1]);
  const hzMatch = powerFeed.match(/(\d+)Hz/i);
  if (hzMatch) hz = parseInt(hzMatch[1]);

  // Calculate required HP
  const torque = outputs.torque_drive_shaft_inlbf ?? 0;
  const rpm = outputs.gearmotor_output_rpm ?? outputs.drive_shaft_rpm ?? 0;
  const requiredHp = rpm > 0 ? (torque * rpm) / 63025 : null;

  const vendor_packet: VendorPacketDriveV2 = {
    required_output_rpm: outputs.gearmotor_output_rpm ?? outputs.drive_shaft_rpm ?? null,
    required_output_torque_inlb: outputs.torque_drive_shaft_inlbf ?? null,
    required_power_hp: requiredHp,
    service_factor_target: outputs.safety_factor_used ?? 1.5,

    electrical: { volts, phase, hz },
    enclosure: 'TEFC', // Default assumption
    thermal_protection: 'Class F',

    brake: {
      required: false, // Would need input
      type: 'none',
    },

    duty: 'continuous',
    environment_tags: getEnvironmentTags(inputs),
    mounting: inputs.gearmotor_mounting_style ?? 'shaft_mounted',
    frame_size: null, // Would come from motor selection
    output_shaft: {
      diameter_in: outputs.drive_shaft_diameter_in ?? null,
      key: outputs.drive_shaft_diameter_in ? 'standard' : null,
    },
    notes: null,
  };

  const spec: Record<string, unknown> = {
    required_rpm: vendor_packet.required_output_rpm,
    required_torque_inlb: vendor_packet.required_output_torque_inlb,
    required_hp: requiredHp,
    gear_ratio: outputs.gear_ratio ?? null,
    chain_ratio: outputs.chain_ratio ?? null,
  };

  const component: ComponentV2 = {
    component_id: componentId,
    component_type: 'drive',
    role: 'primary',
    spec,
    selection: { overrides: {} },
    validation: {
      status: getWorstStatus(componentWarnings),
      messages: componentWarnings,
      assumptions: [],
    },
    vendor_packet,
  };

  return { component, vendor_packet };
}

// =============================================================================
// SUPPORT PACKETS BUILDER
// =============================================================================

export interface SupportPacketsResult {
  legs_component: ComponentV2 | null;
  casters_component: ComponentV2 | null;
  legs_packet: VendorPacketLegsV2 | null;
  casters_packet: VendorPacketCastersV2 | null;
}

export function buildSupportPackets(
  inputs: SliderbedInputs,
  _outputs: SliderbedOutputs,
  warnings: OutputMessageV2[],
  hasLegs: boolean,
  hasCasters: boolean
): SupportPacketsResult {
  const result: SupportPacketsResult = {
    legs_component: null,
    casters_component: null,
    legs_packet: null,
    casters_packet: null,
  };

  if (hasLegs) {
    const legsWarnings = getWarningsForComponent(warnings, 'support_legs');

    // Get leg configuration from inputs if available
    const legQty = (inputs as any).leg_qty ?? 4; // Default 4 legs
    const legModel = (inputs as any).leg_model ?? null;

    const legsPacket: VendorPacketLegsV2 = {
      qty: legQty,
      height_adjustment_range_in: {
        min: (inputs as any).leg_height_min_in ?? null,
        max: (inputs as any).leg_height_max_in ?? null,
      },
      foot_type: hasCasters ? 'caster_mount' : 'leveling_pad',
      material: 'steel',
      load_rating_lbf_each: null, // Would come from leg catalog
      notes: legModel ? `Model: ${legModel}` : null,
    };

    const legsComponent: ComponentV2 = {
      component_id: 'support_legs',
      component_type: 'support',
      role: 'legs',
      spec: {
        qty: legQty,
        model: legModel,
      },
      selection: { overrides: {} },
      validation: {
        status: getWorstStatus(legsWarnings),
        messages: legsWarnings,
        assumptions: [],
      },
      vendor_packet: legsPacket,
    };

    result.legs_component = legsComponent;
    result.legs_packet = legsPacket;
  }

  if (hasCasters) {
    const castersWarnings = getWarningsForComponent(warnings, 'support_casters');

    // Get caster configuration from inputs if available
    const casterQty = (inputs as any).caster_qty ?? 4;
    const casterModel = (inputs as any).caster_model ?? null;

    const castersPacket: VendorPacketCastersV2 = {
      qty: casterQty,
      wheel_diameter_in: (inputs as any).caster_wheel_dia_in ?? 4,
      load_rating_lbf_each: (inputs as any).caster_rating_lbf ?? null,
      locking: (inputs as any).caster_locking ?? true,
      notes: casterModel ? `Model: ${casterModel}` : null,
    };

    const castersComponent: ComponentV2 = {
      component_id: 'support_casters',
      component_type: 'support',
      role: 'casters',
      spec: {
        qty: casterQty,
        model: casterModel,
      },
      selection: { overrides: {} },
      validation: {
        status: getWorstStatus(castersWarnings),
        messages: castersWarnings,
        assumptions: [],
      },
      vendor_packet: castersPacket,
    };

    result.casters_component = castersComponent;
    result.casters_packet = castersPacket;
  }

  return result;
}

// =============================================================================
// BUNDLE BUILDER
// =============================================================================

export function buildVendorPacketBundle(
  beltPacket: VendorPacketBeltV2 | null,
  pulleyPackets: VendorPacketPulleyV2[],
  rollerPackets: VendorPacketRollerV2[],
  drivePacket: VendorPacketDriveV2 | null,
  legsPacket: VendorPacketLegsV2 | null,
  castersPacket: VendorPacketCastersV2 | null
): VendorPacketBundleV2 {
  return {
    belt: beltPacket,
    pulleys: pulleyPackets,
    rollers: rollerPackets,
    drive: drivePacket,
    supports: {
      legs: legsPacket,
      casters: castersPacket,
    },
  };
}

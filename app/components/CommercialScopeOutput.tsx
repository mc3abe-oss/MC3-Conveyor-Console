/**
 * CommercialScopeOutput - Plain text commercial scope (v2.0)
 *
 * Generates plain text output suitable for:
 * - Direct paste into Epicor ERP description fields
 * - Customer documentation
 * - Sales quotes
 *
 * Format: Line breaks and hyphen-led lists only. No tables, no markdown.
 *
 * Content Structure:
 * 1. Header Block (conveyor name, part number, customer ref)
 * 2. Intro Paragraph (conveyor type, application, purpose)
 * 3. Dimensional Summary
 * 4. Belt and Speed
 * 5. Mechanical Details
 * 6. Included Equipment
 * 7. Not Included
 * 8. Finish
 * 9. Commercial Notes
 *
 * Access: Superuser only
 */

'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  SliderbedInputs,
  SliderbedOutputs,
  BeltTrackingMethod,
  GearmotorMountingStyle,
  ControlsPackage,
  SideRails,
  EndGuards,
} from '../../src/models/sliderbed_v1/schema';
import { OutputsV2 } from '../../src/models/sliderbed_v1/outputs_v2';

interface CommercialScopeOutputProps {
  inputs: SliderbedInputs;
  outputs?: SliderbedOutputs | null;
  outputsV2?: OutputsV2 | null;
  conveyorName?: string;
  partNumber?: string;
  customerReference?: string;
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format inches as feet-inches (e.g., 120 -> "10'-0"")
 */
function formatFeetInches(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainingInches = Math.round(inches % 12);
  return `${feet}'-${remainingInches}"`;
}

/**
 * Format inches with inch symbol (e.g., 24 -> "24"")
 */
function formatInches(inches: number): string {
  return `${inches}"`;
}

/**
 * Determine if belt is guided based on tracking method
 */
function isGuidedBelt(trackingMethod?: string): boolean {
  return trackingMethod === BeltTrackingMethod.VGuided || trackingMethod === 'V-guided';
}

/**
 * Get belt material description from catalog key
 */
function getBeltMaterialDescription(beltCatalogKey?: string): string {
  if (!beltCatalogKey) return 'fabric';

  const key = beltCatalogKey.toUpperCase();
  if (key.includes('PVC')) return 'PVC';
  if (key.includes('PU') || key.includes('POLYURETHANE')) return 'polyurethane';
  if (key.includes('RUBBER')) return 'rubber';
  if (key.includes('SILICONE')) return 'silicone';
  if (key.includes('MODULAR')) return 'modular plastic';
  if (key.includes('FLEECE')) return 'fleece';

  return 'fabric';
}

/**
 * Get commercial belt specification string
 */
function getBeltSpecification(beltCatalogKey?: string, trackingMethod?: string): string {
  if (!beltCatalogKey) return 'Per application requirements';

  const key = beltCatalogKey.toUpperCase();
  const parts: string[] = [];

  // Extract belt type/grade
  const pvcMatch = key.match(/PVC(\d+)/);
  if (pvcMatch) {
    parts.push(`PVC${pvcMatch[1]}`);
  } else if (key.includes('PVC')) {
    parts.push('PVC');
  }

  const puMatch = key.match(/PU(\d+)/);
  if (puMatch) {
    parts.push(`PU${puMatch[1]}`);
  } else if (key.includes('PU')) {
    parts.push('PU');
  }

  // Check for fleece
  if (key.includes('FLEECE')) {
    parts.push('fleece backing');
  }

  // Add guidance
  const guided = isGuidedBelt(trackingMethod);
  parts.push(guided ? 'guided' : 'non-guided');

  return parts.length > 0 ? parts.join(', ') : 'Per application requirements';
}

/**
 * Get application type from incline
 */
function getApplicationType(inclineDeg?: number): string {
  const incline = inclineDeg ?? 0;
  if (incline > 5) return 'inclined unit handling';
  if (incline < -5) return 'declined unit handling';
  return 'horizontal unit handling';
}

/**
 * Get drive description
 */
function getDriveDescription(inputs: SliderbedInputs): string {
  const mounting = inputs.gearmotor_mounting_style === GearmotorMountingStyle.ShaftMounted
    ? 'shaft-mounted'
    : 'base-mounted';
  return `${mounting} gearmotor`;
}

/**
 * Get voltage description
 */
function getVoltageDescription(powerFeed?: string): string {
  if (!powerFeed) return '480V 3-Phase';

  const feed = String(powerFeed);
  if (feed.includes('480') || feed === 'V480_3Ph') return '480V 3-Phase';
  if (feed.includes('230') && feed.includes('3')) return '230V 3-Phase';
  if (feed.includes('230') && feed.includes('1')) return '230V 1-Phase';
  if (feed.includes('115') || feed.includes('120')) return '115V 1-Phase';
  if (feed.includes('240')) return '240V 1-Phase';
  if (feed.includes('600')) return '600V 3-Phase';

  return feed;
}

/**
 * Get finish description
 */
function getFinishDescription(inputs: SliderbedInputs): { paint: string; note: string | null } {
  const coatingMethod = inputs.finish_coating_method;
  const colorCode = inputs.finish_powder_color_code;
  const customNote = inputs.finish_custom_note;

  if (coatingMethod === 'wet_paint') {
    return {
      paint: 'Wet paint per customer specification',
      note: customNote || null,
    };
  }

  if (colorCode) {
    const stockCodes = ['RAL5015', 'RAL1023', 'RAL7035', 'RAL9005'];
    if (stockCodes.includes(colorCode)) {
      return {
        paint: `Powder coat, ${colorCode} (stock color)`,
        note: null,
      };
    }
    if (colorCode === 'CUSTOM') {
      return {
        paint: 'Powder coat, custom color per specification',
        note: customNote || 'Color TBD',
      };
    }
    return {
      paint: `Powder coat, ${colorCode}`,
      note: stockCodes.includes(colorCode) ? null : 'Non-stock color - pricing may vary',
    };
  }

  return {
    paint: 'Powder coat, color TBD',
    note: null,
  };
}

// ============================================================================
// INCLUSION/EXCLUSION HELPERS
// ============================================================================

function hasLegs(inputs: SliderbedInputs, outputsV2?: OutputsV2 | null): boolean {
  if (outputsV2?.support_system?.has_legs !== undefined) {
    return outputsV2.support_system.has_legs;
  }
  return inputs.include_legs === true ||
    inputs.support_method === 'floor_supported' ||
    inputs.support_method === 'legs';
}

function hasCasters(inputs: SliderbedInputs, outputsV2?: OutputsV2 | null): boolean {
  if (outputsV2?.support_system?.has_casters !== undefined) {
    return outputsV2.support_system.has_casters;
  }
  return inputs.include_casters === true || inputs.support_method === 'casters';
}

function hasSideRails(inputs: SliderbedInputs): { included: boolean; description: string } {
  const rails = inputs.side_rails;
  if (!rails || rails === SideRails.None || rails === 'None') {
    return { included: false, description: '' };
  }
  if (rails === SideRails.Both || rails === 'Both') {
    return { included: true, description: 'both sides' };
  }
  if (rails === SideRails.Left || rails === 'Left') {
    return { included: true, description: 'left side' };
  }
  if (rails === SideRails.Right || rails === 'Right') {
    return { included: true, description: 'right side' };
  }
  return { included: true, description: '' };
}

function hasEndGuards(inputs: SliderbedInputs): { included: boolean; description: string } {
  const guards = inputs.end_guards;
  if (!guards || guards === EndGuards.None || guards === 'None') {
    return { included: false, description: '' };
  }
  if (guards === EndGuards.BothEnds || guards === 'Both ends') {
    return { included: true, description: 'both ends' };
  }
  if (guards === EndGuards.HeadEnd || guards === 'Head end') {
    return { included: true, description: 'head end' };
  }
  if (guards === EndGuards.TailEnd || guards === 'Tail end') {
    return { included: true, description: 'tail end' };
  }
  return { included: true, description: '' };
}

function hasControlsPackage(inputs: SliderbedInputs): { included: boolean; description: string } {
  const pkg = inputs.controls_package;
  if (!pkg || pkg === ControlsPackage.None || pkg === 'None' || pkg === 'NOT_SUPPLIED') {
    return { included: false, description: '' };
  }
  if (pkg === ControlsPackage.StartStop || pkg === 'Start/Stop') {
    return { included: true, description: 'Start/Stop' };
  }
  if (pkg === ControlsPackage.VFD || pkg === 'VFD') {
    return { included: true, description: 'VFD' };
  }
  if (pkg === ControlsPackage.FullAutomation || pkg === 'Full Automation') {
    return { included: true, description: 'Full Automation' };
  }
  return { included: true, description: '' };
}

// ============================================================================
// PLAIN TEXT GENERATOR
// ============================================================================

function generateCommercialScopeText(
  inputs: SliderbedInputs,
  outputs: SliderbedOutputs | null | undefined,
  outputsV2: OutputsV2 | null | undefined,
  conveyorName?: string,
  partNumber?: string,
  customerReference?: string
): string {
  const lines: string[] = [];

  // Computed values
  const beltWidth = inputs.belt_width_in;
  const centerDistance = inputs.conveyor_length_cc_in;
  const drivePulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in ?? 4;
  const tailPulleyDia = inputs.tail_pulley_diameter_in ?? inputs.pulley_diameter_in ?? 4;
  const overallLength = centerDistance + (drivePulleyDia / 2) + (tailPulleyDia / 2);
  const applicationType = getApplicationType(inputs.conveyor_incline_deg);
  const beltMaterial = getBeltMaterialDescription(inputs.belt_catalog_key);
  const beltSpec = getBeltSpecification(inputs.belt_catalog_key, inputs.belt_tracking_method);
  const isGuided = isGuidedBelt(inputs.belt_tracking_method);
  const driveDesc = getDriveDescription(inputs);
  const voltageDesc = getVoltageDescription(inputs.power_feed);
  const finishInfo = getFinishDescription(inputs);
  const targetBeltSpeed = outputs?.belt_speed_fpm ?? inputs.belt_speed_fpm ?? null;
  const tobValue = outputsV2?.design_geometry?.top_of_belt_in?.value;

  // Support/equipment flags
  const legsIncluded = hasLegs(inputs, outputsV2);
  const castersIncluded = hasCasters(inputs, outputsV2);
  const sideRailsInfo = hasSideRails(inputs);
  const endGuardsInfo = hasEndGuards(inputs);
  const controlsInfo = hasControlsPackage(inputs);
  const bottomCoversIncluded = inputs.bottom_covers === true;
  const fingerSafeIncluded = inputs.finger_safe === true;

  // =========================================================================
  // 1) HEADER BLOCK
  // =========================================================================
  if (conveyorName) {
    lines.push(conveyorName.toUpperCase());
  } else {
    lines.push('SLIDER BED BELT CONVEYOR');
  }
  if (partNumber) {
    lines.push(`Part Number: ${partNumber}`);
  }
  if (customerReference) {
    lines.push(`Reference: ${customerReference}`);
  }
  lines.push('');

  // =========================================================================
  // 2) INTRO PARAGRAPH
  // =========================================================================
  const introLines: string[] = [];
  introLines.push(
    `MC3 to supply one (1) slider bed belt conveyor designed for ${applicationType}.`
  );
  introLines.push(
    `The conveyor features a steel slider bed with formed steel frame construction, ` +
    `utilizing a ${beltMaterial} belt${isGuided ? ' with V-guide tracking' : ''}.`
  );
  introLines.push(
    `Drive is provided by a ${driveDesc}, with pulleys sized appropriately for the application.`
  );
  lines.push(introLines.join(' '));
  lines.push('');

  // =========================================================================
  // 3) DIMENSIONAL SUMMARY
  // =========================================================================
  lines.push('DIMENSIONAL SUMMARY');
  lines.push(`- Overall Length: ~${formatFeetInches(overallLength)}`);
  lines.push(`- Pulley Center-to-Center: ${formatFeetInches(centerDistance)}`);
  lines.push(`- Belt Width: ${formatInches(beltWidth)}`);

  // Between-frame width (belt width + typical frame offset)
  const betweenFrameWidth = beltWidth + 1; // Approximation
  lines.push(`- Between-Frame Width: ~${formatInches(betweenFrameWidth)}`);

  // Frame/body height (use frame height if available)
  if (inputs.custom_frame_height_in) {
    lines.push(`- Body Height: ${formatInches(inputs.custom_frame_height_in)}`);
  }

  // Conveyor elevation (TOB)
  if (tobValue) {
    lines.push(`- Conveyor Elevation (TOB): ${formatInches(tobValue)}`);
  } else if (inputs.tail_tob_in || inputs.drive_tob_in) {
    const tob = inputs.tail_tob_in ?? inputs.drive_tob_in;
    if (tob) {
      lines.push(`- Conveyor Elevation (TOB): ${formatInches(tob)}`);
    }
  }

  // Incline if applicable
  if (inputs.conveyor_incline_deg && Math.abs(inputs.conveyor_incline_deg) > 0) {
    lines.push(`- Incline Angle: ${inputs.conveyor_incline_deg}°`);
  }
  lines.push('');

  // =========================================================================
  // 4) BELT AND SPEED
  // =========================================================================
  lines.push('BELT AND SPEED');
  lines.push(`- Belt: ${beltSpec}`);
  if (targetBeltSpeed) {
    lines.push(`- Target Belt Speed: ${targetBeltSpeed} FPM (actual speed subject to final drive selection)`);
  }
  lines.push('');

  // =========================================================================
  // 5) MECHANICAL DETAILS
  // =========================================================================
  lines.push('MECHANICAL DETAILS');
  lines.push(`- Drive Pulley: ${formatInches(drivePulleyDia)} diameter (nominal)`);
  lines.push(`- Tail Pulley: ${formatInches(tailPulleyDia)} diameter (nominal)`);
  lines.push('- Bearings: Industrial grade, sealed');
  lines.push('- Frame: Formed steel slider bed construction');
  lines.push(`- Drive: ${driveDesc.charAt(0).toUpperCase() + driveDesc.slice(1)}, ${voltageDesc}`);
  lines.push('');

  // =========================================================================
  // 6) INCLUDED EQUIPMENT
  // =========================================================================
  lines.push('INCLUDED EQUIPMENT');

  const includedItems: string[] = [];

  if (legsIncluded) {
    includedItems.push('- Floor support legs with leveling adjustment');
  }
  if (castersIncluded) {
    includedItems.push('- Casters');
  }
  if (sideRailsInfo.included) {
    const desc = sideRailsInfo.description ? ` (${sideRailsInfo.description})` : '';
    includedItems.push(`- Side rails${desc}`);
  }
  if (endGuardsInfo.included) {
    const desc = endGuardsInfo.description ? ` (${endGuardsInfo.description})` : '';
    includedItems.push(`- End guards${desc}`);
  }
  if (bottomCoversIncluded) {
    includedItems.push('- Bottom covers');
  }
  if (fingerSafeIncluded) {
    includedItems.push('- Finger-safe guarding at drive and tail');
  }
  if (controlsInfo.included) {
    includedItems.push(`- Controls package (${controlsInfo.description})`);
  }

  // Standard inclusions always present
  includedItems.push('- Belt (endless splice or mechanical lacing per application)');
  includedItems.push('- Gearmotor');
  includedItems.push('- Hardware for assembly');

  if (includedItems.length > 0) {
    lines.push(...includedItems);
  }
  lines.push('');

  // =========================================================================
  // 7) NOT INCLUDED
  // =========================================================================
  lines.push('NOT INCLUDED');

  const excludedItems: string[] = [];

  if (!controlsInfo.included) {
    excludedItems.push('- Controls / control panel');
  }
  excludedItems.push('- Sensors / instrumentation / photoeyes');
  if (!legsIncluded && !castersIncluded) {
    excludedItems.push('- Floor support (legs, casters, or stands)');
  }
  if (!sideRailsInfo.included) {
    excludedItems.push('- Side rails / product guides');
  }
  if (!endGuardsInfo.included) {
    excludedItems.push('- End guards');
  }
  if (!bottomCoversIncluded) {
    excludedItems.push('- Bottom covers');
  }
  if (!fingerSafeIncluded) {
    excludedItems.push('- Finger-safe guarding');
  }
  excludedItems.push('- Electrical inspection / certification (UL, CE, etc.)');
  excludedItems.push('- Field wiring');
  excludedItems.push('- Installation / field services');
  excludedItems.push('- Spare parts');
  excludedItems.push('- Freight / shipping');

  lines.push(...excludedItems);
  lines.push('');

  // =========================================================================
  // 8) FINISH
  // =========================================================================
  lines.push('FINISH');
  lines.push(`- ${finishInfo.paint}`);
  if (finishInfo.note) {
    lines.push(`- Note: ${finishInfo.note}`);
  }

  // Guarding finish if different
  if (inputs.guarding_coating_method && inputs.guarding_powder_color_code) {
    if (inputs.guarding_powder_color_code !== inputs.finish_powder_color_code) {
      lines.push(`- Guarding: Powder coat, ${inputs.guarding_powder_color_code}`);
    }
  }
  lines.push('');

  // =========================================================================
  // 9) COMMERCIAL NOTES
  // =========================================================================
  lines.push('COMMERCIAL NOTES');
  lines.push('- Approval drawing provided; one (1) revision cycle included');
  lines.push('- Drawing turnaround: Up to four (4) working days from order');
  lines.push('- Lead time: Subject to shop capacity at time of order');
  lines.push('- Pricing valid for 30 days');

  return lines.join('\n');
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CommercialScopeOutput({
  inputs,
  outputs,
  outputsV2,
  conveyorName,
  partNumber,
  customerReference,
}: CommercialScopeOutputProps) {
  const [copied, setCopied] = useState(false);

  // Generate the plain text scope
  const scopeText = useMemo(() => {
    return generateCommercialScopeText(
      inputs,
      outputs,
      outputsV2,
      conveyorName,
      partNumber,
      customerReference
    );
  }, [inputs, outputs, outputsV2, conveyorName, partNumber, customerReference]);

  // Copy handler
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(scopeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [scopeText]);

  return (
    <div className="space-y-4">
      {/* Header with copy button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Commercial Scope</h2>
          <p className="text-sm text-gray-500">
            Plain text commercial scope suitable for ERP and customer documentation.
          </p>
        </div>
        <button
          onClick={handleCopy}
          className={`
            px-4 py-2 rounded-md text-sm font-medium transition-colors
            ${copied
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </button>
      </div>

      {/* Plain text output */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
          {scopeText}
        </pre>
      </div>

      {/* Version footer */}
      <div className="text-xs text-gray-400 text-right">
        Commercial Scope v2.0
      </div>
    </div>
  );
}

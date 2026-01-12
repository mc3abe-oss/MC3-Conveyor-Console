/**
 * CommercialScopeOutput - Customer-facing output mode (v1.3)
 *
 * Provides clear commercial understanding of what is being sold:
 * - Scope of Supply (high-level narrative)
 * - Key Conveyor Details (physical specifications)
 * - Included Equipment & Options (explicit inclusions/exclusions)
 * - Application Summary (selling content)
 * - Commercial Notes (terms)
 *
 * Access: Superuser only
 */

'use client';

import { useMemo } from 'react';
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
}

/**
 * Format a number as feet and inches (e.g., "10'-0"")
 */
function formatFeetInches(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remainingInches = Math.round(inches % 12);
  return `${feet}'-${remainingInches}"`;
}

/**
 * Format inches with inch symbol
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

  // Extract belt type from catalog key (e.g., "PVC120_24_WHITE" -> "PVC")
  const key = beltCatalogKey.toUpperCase();
  if (key.includes('PVC')) return 'PVC';
  if (key.includes('PU') || key.includes('POLYURETHANE')) return 'polyurethane';
  if (key.includes('RUBBER')) return 'rubber';
  if (key.includes('SILICONE')) return 'silicone';
  if (key.includes('MODULAR')) return 'modular plastic';

  return 'fabric';
}

/**
 * Get belt specification from catalog key (for display)
 */
function getBeltSpecification(beltCatalogKey?: string): string {
  if (!beltCatalogKey) return 'Per application requirements';

  // Extract meaningful spec from catalog key
  const key = beltCatalogKey.toUpperCase();

  // Common patterns: PVC120, PVC150, PU80, etc.
  const pvcMatch = key.match(/PVC(\d+)/);
  if (pvcMatch) return `PVC ${pvcMatch[1]}`;

  const puMatch = key.match(/PU(\d+)/);
  if (puMatch) return `PU ${puMatch[1]}`;

  // If no specific pattern, return generic
  if (key.includes('PVC')) return 'PVC series';
  if (key.includes('PU')) return 'PU series';

  return 'Per application requirements';
}

/**
 * Get drive description (manufacturer + mounting only)
 */
function getDriveDescription(inputs: SliderbedInputs): string {
  const mounting = inputs.gearmotor_mounting_style === GearmotorMountingStyle.ShaftMounted
    ? 'shaft-mounted'
    : 'bottom-mounted';

  return `${mounting} gearmotor`;
}

/**
 * Get paint/finish description
 */
function getFinishDescription(inputs: SliderbedInputs): string {
  const coatingMethod = inputs.finish_coating_method;
  const colorCode = inputs.finish_powder_color_code;

  if (coatingMethod === 'wet_paint') {
    return 'Wet paint per specification';
  }

  if (colorCode) {
    const stockCodes = ['RAL5015', 'RAL1023', 'RAL7035', 'RAL9005'];
    if (stockCodes.includes(colorCode)) {
      return `Powder coat, stock color (${colorCode})`;
    }
    if (colorCode === 'CUSTOM') {
      return 'Powder coat, custom color per specification';
    }
    return `Powder coat (${colorCode})`;
  }

  return 'Powder coat, color TBD';
}

/**
 * Get application type description
 */
function getApplicationTypeDescription(inputs: SliderbedInputs): string {
  const incline = inputs.conveyor_incline_deg ?? 0;

  if (incline > 5) {
    return 'inclined unit handling';
  }
  if (incline < -5) {
    return 'declined unit handling';
  }
  return 'horizontal unit handling';
}

/**
 * Get environment description
 */
function getEnvironmentDescription(inputs: SliderbedInputs): string {
  const factors = inputs.environment_factors ?? [];

  if (factors.length === 0) {
    return 'Standard indoor';
  }

  const descriptions: string[] = [];
  if (factors.includes('washdown') || factors.includes('wet')) {
    descriptions.push('Washdown');
  }
  if (factors.includes('outdoor') || factors.includes('weather')) {
    descriptions.push('Outdoor');
  }
  if (factors.includes('food_grade') || factors.includes('food')) {
    descriptions.push('Food-grade');
  }
  if (factors.includes('high_temp') || factors.includes('heat')) {
    descriptions.push('Elevated temperature');
  }

  return descriptions.length > 0 ? descriptions.join(', ') : 'Standard indoor';
}

/**
 * Check if controls package is included
 */
function hasControlsPackage(inputs: SliderbedInputs): boolean {
  const pkg = inputs.controls_package;
  return !!(pkg && pkg !== ControlsPackage.None && pkg !== 'None' && pkg !== 'NOT_SUPPLIED');
}

/**
 * Get controls package description
 */
function getControlsDescription(inputs: SliderbedInputs): string {
  const pkg = inputs.controls_package;
  if (!pkg || pkg === ControlsPackage.None || pkg === 'None' || pkg === 'NOT_SUPPLIED') {
    return 'Not Included';
  }
  if (pkg === ControlsPackage.StartStop || pkg === 'Start/Stop') {
    return 'Included (Start/Stop)';
  }
  if (pkg === ControlsPackage.VFD || pkg === 'VFD') {
    return 'Included (VFD)';
  }
  if (pkg === ControlsPackage.FullAutomation || pkg === 'Full Automation') {
    return 'Included (Full Automation)';
  }
  return 'Included';
}

/**
 * Check if side rails are included
 */
function hasSideRails(inputs: SliderbedInputs): boolean {
  const rails = inputs.side_rails;
  return !!(rails && rails !== SideRails.None && rails !== 'None');
}

/**
 * Get side rails description
 */
function getSideRailsDescription(inputs: SliderbedInputs): string {
  const rails = inputs.side_rails;
  if (!rails || rails === SideRails.None || rails === 'None') {
    return 'Not Included';
  }
  if (rails === SideRails.Both || rails === 'Both') {
    return 'Included (Both sides)';
  }
  if (rails === SideRails.Left || rails === 'Left') {
    return 'Included (Left side)';
  }
  if (rails === SideRails.Right || rails === 'Right') {
    return 'Included (Right side)';
  }
  return 'Included';
}

/**
 * Check if end guards are included
 */
function hasEndGuards(inputs: SliderbedInputs): boolean {
  const guards = inputs.end_guards;
  return !!(guards && guards !== EndGuards.None && guards !== 'None');
}

/**
 * Get end guards description
 */
function getEndGuardsDescription(inputs: SliderbedInputs): string {
  const guards = inputs.end_guards;
  if (!guards || guards === EndGuards.None || guards === 'None') {
    return 'Not Included';
  }
  if (guards === EndGuards.BothEnds || guards === 'Both ends') {
    return 'Included (Both ends)';
  }
  if (guards === EndGuards.HeadEnd || guards === 'Head end') {
    return 'Included (Head end)';
  }
  if (guards === EndGuards.TailEnd || guards === 'Tail end') {
    return 'Included (Tail end)';
  }
  return 'Included';
}

/**
 * Inclusion status component
 */
function InclusionItem({ label, status, isIncluded }: { label: string; status: string; isIncluded: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`text-sm font-medium ${isIncluded ? 'text-green-700' : 'text-gray-500'}`}>
        {status}
      </span>
    </div>
  );
}

export default function CommercialScopeOutput({ inputs, outputs, outputsV2 }: CommercialScopeOutputProps) {
  // Compute derived values
  const commercialData = useMemo(() => {
    const beltWidth = inputs.belt_width_in;
    const centerDistance = inputs.conveyor_length_cc_in;
    const drivePulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in ?? 4;
    const tailPulleyDia = inputs.tail_pulley_diameter_in ?? inputs.pulley_diameter_in ?? 4;

    // Overall length approximation (C-C + pulley radii)
    const overallLength = centerDistance + (drivePulleyDia / 2) + (tailPulleyDia / 2);

    const isGuided = isGuidedBelt(inputs.belt_tracking_method);
    const beltMaterial = getBeltMaterialDescription(inputs.belt_catalog_key);
    const beltSpec = getBeltSpecification(inputs.belt_catalog_key);
    const applicationType = getApplicationTypeDescription(inputs);
    const driveDesc = getDriveDescription(inputs);
    const finishDesc = getFinishDescription(inputs);
    const envDesc = getEnvironmentDescription(inputs);

    // Belt speed
    const targetBeltSpeed = outputs?.belt_speed_fpm ?? inputs.belt_speed_fpm ?? null;

    // Part info (if available)
    const partWeight = inputs.part_weight_lbs;
    const partLength = inputs.part_length_in;
    const partWidth = inputs.part_width_in;

    // Power feed
    const powerFeed = inputs.power_feed ?? 'V480_3Ph';
    const powerFeedDisplay = powerFeed === 'V480_3Ph' ? '480V 3-Phase'
      : powerFeed === 'V230_3Ph' ? '230V 3-Phase'
      : powerFeed === 'V230_1Ph' ? '230V 1-Phase'
      : powerFeed === 'V115_1Ph' ? '115V 1-Phase'
      : String(powerFeed);

    // Support / Legs / Casters
    const hasLegs = inputs.include_legs === true ||
      inputs.support_method === 'floor_supported' ||
      inputs.support_method === 'legs';
    const hasCasters = inputs.include_casters === true ||
      inputs.support_method === 'casters';

    // From outputsV2 if available
    const legsIncluded = outputsV2?.support_system?.has_legs ?? hasLegs;
    const castersIncluded = outputsV2?.support_system?.has_casters ?? hasCasters;

    // Controls
    const controlsIncluded = hasControlsPackage(inputs);
    const controlsDesc = getControlsDescription(inputs);

    // Side rails
    const sideRailsIncluded = hasSideRails(inputs);
    const sideRailsDesc = getSideRailsDescription(inputs);

    // End guards
    const endGuardsIncluded = hasEndGuards(inputs);
    const endGuardsDesc = getEndGuardsDescription(inputs);

    // Bottom covers
    const bottomCoversIncluded = inputs.bottom_covers === true;

    // Finger safe guards
    const fingerSafeIncluded = inputs.finger_safe === true;

    return {
      beltWidth,
      overallLength,
      drivePulleyDia,
      tailPulleyDia,
      isGuided,
      beltMaterial,
      beltSpec,
      applicationType,
      driveDesc,
      finishDesc,
      envDesc,
      targetBeltSpeed,
      partWeight,
      partLength,
      partWidth,
      powerFeedDisplay,
      // Inclusions
      legsIncluded,
      castersIncluded,
      controlsIncluded,
      controlsDesc,
      sideRailsIncluded,
      sideRailsDesc,
      endGuardsIncluded,
      endGuardsDesc,
      bottomCoversIncluded,
      fingerSafeIncluded,
    };
  }, [inputs, outputs, outputsV2]);

  return (
    <div className="space-y-8">
      {/* ================================================================== */}
      {/* SECTION 1 - Scope of Supply */}
      {/* ================================================================== */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Scope of Supply
        </h2>
        <div className="prose prose-sm max-w-none text-gray-700">
          <p>
            MC3 to supply one (1) slider bed conveyor designed for {commercialData.applicationType}.
            The conveyor will have an overall length of approximately {formatFeetInches(commercialData.overallLength)} and
            a conveying width of {formatInches(commercialData.beltWidth)}, utilizing a steel slider bed and
            formed steel frame construction. The conveyor will be equipped with
            a {commercialData.beltMaterial}{commercialData.isGuided ? ', guided' : ', non-guided'} belt
            selected for the specified application and driven by a {commercialData.driveDesc}.
            Drive and tail pulleys are sized appropriately for the application.
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 - Key Conveyor Details */}
      {/* ================================================================== */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Key Conveyor Details
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Overall Length</dt>
            <dd className="text-sm text-gray-900">~{formatFeetInches(commercialData.overallLength)}</dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Belt Width</dt>
            <dd className="text-sm text-gray-900">{formatInches(commercialData.beltWidth)}</dd>
          </div>
          {outputsV2?.design_geometry?.top_of_belt_in?.value && (
            <div className="flex justify-between sm:block">
              <dt className="text-sm font-medium text-gray-500">Conveyor Elevation (TOB)</dt>
              <dd className="text-sm text-gray-900">{formatInches(outputsV2.design_geometry.top_of_belt_in.value)}</dd>
            </div>
          )}
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Belt Specification</dt>
            <dd className="text-sm text-gray-900">{commercialData.beltSpec}</dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Belt Guidance</dt>
            <dd className="text-sm text-gray-900">{commercialData.isGuided ? 'Guided' : 'Non-Guided'}</dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Pulley Diameters</dt>
            <dd className="text-sm text-gray-900">
              Drive: {formatInches(commercialData.drivePulleyDia)} / Tail: {formatInches(commercialData.tailPulleyDia)}
            </dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Frame / Bed Type</dt>
            <dd className="text-sm text-gray-900">Steel slider bed, formed steel frame</dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Drive</dt>
            <dd className="text-sm text-gray-900 capitalize">{commercialData.driveDesc}</dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Paint / Finish</dt>
            <dd className="text-sm text-gray-900">{commercialData.finishDesc}</dd>
          </div>
        </dl>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 - Included Equipment & Options */}
      {/* ================================================================== */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Included Equipment &amp; Options
        </h2>
        <div className="bg-gray-50 rounded-lg p-4">
          <InclusionItem
            label="Support Legs"
            status={commercialData.legsIncluded ? 'Included' : 'Not Included'}
            isIncluded={commercialData.legsIncluded}
          />
          <InclusionItem
            label="Casters"
            status={commercialData.castersIncluded ? 'Included' : 'Not Included'}
            isIncluded={commercialData.castersIncluded}
          />
          <InclusionItem
            label="Side Rails / Guides"
            status={commercialData.sideRailsDesc}
            isIncluded={commercialData.sideRailsIncluded}
          />
          <InclusionItem
            label="Controls Package"
            status={commercialData.controlsDesc}
            isIncluded={commercialData.controlsIncluded}
          />
          <InclusionItem
            label="End Guards"
            status={commercialData.endGuardsDesc}
            isIncluded={commercialData.endGuardsIncluded}
          />
          <InclusionItem
            label="Bottom Covers"
            status={commercialData.bottomCoversIncluded ? 'Included' : 'Not Included'}
            isIncluded={commercialData.bottomCoversIncluded}
          />
          <InclusionItem
            label="Finger-Safe Guarding"
            status={commercialData.fingerSafeIncluded ? 'Included' : 'Not Included'}
            isIncluded={commercialData.fingerSafeIncluded}
          />
          <InclusionItem
            label="Sensors / Instrumentation"
            status="Not Included"
            isIncluded={false}
          />
          <InclusionItem
            label="Electrical Inspection / Certification"
            status="Not Included"
            isIncluded={false}
          />
          <InclusionItem
            label="Installation / Field Services"
            status="Not Included"
            isIncluded={false}
          />
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 - Application Summary */}
      {/* ================================================================== */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Application Summary
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Material Handling Type</dt>
            <dd className="text-sm text-gray-900 capitalize">{commercialData.applicationType}</dd>
          </div>
          {(commercialData.partWeight || commercialData.partLength) && (
            <div className="flex justify-between sm:block">
              <dt className="text-sm font-medium text-gray-500">Part Size / Weight Range</dt>
              <dd className="text-sm text-gray-900">
                {commercialData.partLength && commercialData.partWidth && (
                  <span>{commercialData.partLength}" x {commercialData.partWidth}"</span>
                )}
                {commercialData.partWeight && (
                  <span>{commercialData.partLength ? ', ' : ''}{commercialData.partWeight} lbs</span>
                )}
              </dd>
            </div>
          )}
          {commercialData.targetBeltSpeed && (
            <div className="flex justify-between sm:block">
              <dt className="text-sm font-medium text-gray-500">Target Belt Speed</dt>
              <dd className="text-sm text-gray-900">{commercialData.targetBeltSpeed} FPM</dd>
            </div>
          )}
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Operating Voltage</dt>
            <dd className="text-sm text-gray-900">{commercialData.powerFeedDisplay}</dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Environment</dt>
            <dd className="text-sm text-gray-900">{commercialData.envDesc}</dd>
          </div>
        </dl>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 - Commercial Notes */}
      {/* ================================================================== */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
          Commercial Notes
        </h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>
            <span className="font-medium">Approval drawings:</span> One (1) review cycle included, up to four (4) working days
          </li>
          <li>
            <span className="font-medium">Lead time:</span> Subject to change based on workload at time of order
          </li>
        </ul>
      </section>
    </div>
  );
}

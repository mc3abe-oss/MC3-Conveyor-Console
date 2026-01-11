/**
 * CommercialScopeOutput - Customer-facing output mode
 *
 * Provides clear commercial understanding of what is being sold:
 * - Basic physical dimensions and belt intent
 * - No detailed engineering, calculations, or proprietary design disclosure
 *
 * Access: Superuser only
 */

'use client';

import { useMemo } from 'react';
import { SliderbedInputs, SliderbedOutputs, BeltTrackingMethod, GearmotorMountingStyle } from '../../src/models/sliderbed_v1/schema';
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
 * Get generic belt type description
 */
function getBeltTypeDescription(inputs: SliderbedInputs): string {
  const guided = isGuidedBelt(inputs.belt_tracking_method);
  const hasCleats = inputs.cleats_enabled || inputs.cleats_mode === 'cleated';

  let desc = 'fabric belt';
  if (guided) {
    desc += ', guided';
  }
  if (hasCleats) {
    desc += ', cleated';
  }
  return desc;
}

/**
 * Get support method description
 */
function getSupportMethodDescription(inputs: SliderbedInputs, outputsV2?: OutputsV2 | null): string {
  if (outputsV2?.support_system) {
    const sys = outputsV2.support_system;
    if (sys.has_legs && sys.has_casters) {
      return 'Floor-supported with legs and casters';
    }
    if (sys.has_legs) {
      return 'Floor-supported with legs';
    }
    if (sys.has_casters) {
      return 'Caster-mounted';
    }
    if (sys.support_type === 'external') {
      return 'Customer-supplied support';
    }
    if (sys.support_type === 'suspended') {
      return 'Suspended';
    }
  }

  // Fallback based on inputs
  if (inputs.support_method === 'floor_supported' || inputs.support_method === 'FloorSupported') {
    return 'Floor-supported with legs';
  }
  if (inputs.support_method === 'casters' || inputs.support_method === 'Casters') {
    return 'Caster-mounted';
  }
  if (inputs.support_method === 'external' || inputs.support_method === 'External') {
    return 'Customer-supplied support';
  }
  return 'Support method per approval drawing';
}

/**
 * Get drive description (manufacturer + mounting only)
 */
function getDriveDescription(inputs: SliderbedInputs): string {
  const mounting = inputs.gearmotor_mounting_style === GearmotorMountingStyle.ShaftMounted
    ? 'shaft-mounted'
    : 'bottom-mounted';

  // Generic description - no specific manufacturer unless explicitly set
  return `Gearmotor, ${mounting}`;
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
    // Check if it's a stock color (starts with RAL and common stock codes)
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

  // Map common factors to customer-friendly descriptions
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
    const applicationType = getApplicationTypeDescription(inputs);
    const beltType = getBeltTypeDescription(inputs);
    const supportMethod = getSupportMethodDescription(inputs, outputsV2);
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
      : powerFeed;

    return {
      beltWidth,
      overallLength,
      drivePulleyDia,
      tailPulleyDia,
      isGuided,
      applicationType,
      beltType,
      supportMethod,
      driveDesc,
      finishDesc,
      envDesc,
      targetBeltSpeed,
      partWeight,
      partLength,
      partWidth,
      powerFeedDisplay,
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
            a {commercialData.isGuided ? 'guided' : 'non-guided'} {commercialData.beltType} and
            driven by a {commercialData.driveDesc.toLowerCase()}. Drive and tail pulleys are sized
            appropriately for the application.
          </p>
          <p className="mt-4">
            The conveyor is supplied as a mechanical assembly only. Controls, electrical inspection,
            guarding, and installation are not included unless specifically stated otherwise.
          </p>
          <p className="mt-4 font-medium text-gray-900">
            Approval drawings are required prior to fabrication.
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
            <dt className="text-sm font-medium text-gray-500">Belt Type</dt>
            <dd className="text-sm text-gray-900 capitalize">{commercialData.beltType}</dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Pulley Diameters</dt>
            <dd className="text-sm text-gray-900">
              Drive: {formatInches(commercialData.drivePulleyDia)} / Tail: {formatInches(commercialData.tailPulleyDia)}
            </dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Support Method</dt>
            <dd className="text-sm text-gray-900">{commercialData.supportMethod}</dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Drive</dt>
            <dd className="text-sm text-gray-900">{commercialData.driveDesc}</dd>
          </div>
          <div className="flex justify-between sm:block">
            <dt className="text-sm font-medium text-gray-500">Paint / Finish</dt>
            <dd className="text-sm text-gray-900">{commercialData.finishDesc}</dd>
          </div>
        </dl>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 - Application Summary */}
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
      {/* SECTION 4 - Commercial Notes */}
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

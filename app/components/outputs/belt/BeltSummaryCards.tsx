'use client';

import { OutputCard, ResultGrid } from '../shared';
import type { ResultItem } from '../shared';

interface BeltOutputs {
  [key: string]: unknown;
}

interface BeltInputs {
  bed_type?: string;
  belt_width_in?: number;
  conveyor_length_cc_in?: number;
  conveyor_incline_deg?: number;
  belt_speed_fpm?: number;
  [key: string]: unknown;
}

interface SummaryCardsProps {
  inputs: BeltInputs;
  outputs: BeltOutputs;
}

// Configuration Summary Card
export function ConfigSummaryCard({ inputs }: { inputs: BeltInputs }) {
  const bedType = typeof inputs.bed_type === 'string'
    ? inputs.bed_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
    : inputs.bed_type || 'Slider Bed';

  const results: ResultItem[] = [
    { label: 'Bed Type', value: bedType },
    { label: 'Belt Width', value: inputs.belt_width_in, unit: 'in', precision: 1 },
    { label: 'Length (C-C)', value: inputs.conveyor_length_cc_in, unit: 'in', precision: 1 },
    { label: 'Incline', value: inputs.conveyor_incline_deg, unit: '°', precision: 1 },
  ];

  return (
    <OutputCard title="Configuration">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Drive Summary Card
export function DriveSummaryCard({ outputs }: { outputs: BeltOutputs }) {
  const results: ResultItem[] = [
    { label: 'Drive Torque', value: outputs.torque_drive_shaft_inlbf, unit: 'in-lbf', precision: 1, highlight: true },
    { label: 'Drive Shaft RPM', value: outputs.drive_shaft_rpm, precision: 1 },
    { label: 'Gear Ratio', value: outputs.gear_ratio, precision: 2 },
    { label: 'Motor RPM', value: outputs.motor_rpm_used, precision: 0 },
  ];

  return (
    <OutputCard title="Drive Requirements">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Tensions Summary Card
export function TensionsSummaryCard({ outputs }: { outputs: BeltOutputs }) {
  const results: ResultItem[] = [
    { label: 'Total Belt Pull', value: outputs.total_belt_pull_lb, unit: 'lb', precision: 1, highlight: true },
    { label: 'Tight Side (T1)', value: outputs.drive_T1_lbf, unit: 'lbf', precision: 1 },
    { label: 'Slack Side (T2)', value: outputs.drive_T2_lbf, unit: 'lbf', precision: 1 },
    { label: 'Friction Pull', value: outputs.friction_pull_lb, unit: 'lb', precision: 1 },
  ];

  return (
    <OutputCard title="Belt Tensions">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Pulley Summary Card
export function PulleySummaryCard({ outputs }: { outputs: BeltOutputs }) {
  const results: ResultItem[] = [
    { label: 'Drive Pulley', value: outputs.drive_pulley_diameter_in, unit: 'in', precision: 2 },
    { label: 'Tail Pulley', value: outputs.tail_pulley_diameter_in, unit: 'in', precision: 2 },
    { label: 'Face Length', value: outputs.pulley_face_length_in, unit: 'in', precision: 2 },
    { label: 'Crown Required', value: outputs.pulley_requires_crown },
  ];

  return (
    <OutputCard title="Pulleys">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Throughput Summary Card
export function ThroughputSummaryCard({ outputs }: { outputs: BeltOutputs }) {
  const margin = outputs.throughput_margin_achieved_pct as number | null | undefined;
  let status: 'normal' | 'warning' | 'error' | 'success' = 'normal';

  if (margin !== null && margin !== undefined) {
    if (margin >= 10) status = 'success';
    else if (margin >= 0) status = 'warning';
    else status = 'error';
  }

  const results: ResultItem[] = [
    { label: 'Capacity', value: outputs.capacity_pph, unit: 'pph', precision: 0 },
    { label: 'Target', value: outputs.target_pph, unit: 'pph', precision: 0 },
    { label: 'Margin', value: margin, unit: '%', precision: 1, status, highlight: true },
    { label: 'Meets Target', value: outputs.meets_throughput },
  ];

  return (
    <OutputCard title="Throughput" status={status}>
      <ResultGrid results={results} columns={2} />
      {status === 'error' && (
        <p className="text-red-600 text-sm mt-2">Warning: Capacity below target throughput</p>
      )}
    </OutputCard>
  );
}

// Speed Summary Card
export function SpeedSummaryCard({ inputs, outputs }: SummaryCardsProps) {
  const actualSpeed = outputs.actual_belt_speed_fpm as number | null | undefined;
  const desiredSpeed = inputs.belt_speed_fpm;
  const deltaFpm = outputs.speed_difference_fpm as number | null | undefined;
  const deltaPct = outputs.actual_belt_speed_delta_pct as number | null | undefined;

  let status: 'normal' | 'warning' | 'error' | 'success' = 'normal';
  if (deltaPct !== null && deltaPct !== undefined) {
    const absDelta = Math.abs(deltaPct);
    if (absDelta <= 2) status = 'success';
    else if (absDelta <= 5) status = 'warning';
    else status = 'error';
  }

  const results: ResultItem[] = [
    { label: 'Desired Speed', value: desiredSpeed, unit: 'FPM', precision: 1 },
    { label: 'Actual Speed', value: actualSpeed, unit: 'FPM', precision: 1, status },
    { label: 'Difference', value: deltaFpm, unit: 'FPM', precision: 1, status },
    { label: 'Delta %', value: deltaPct, unit: '%', precision: 1, status },
  ];

  return (
    <OutputCard title="Belt Speed" status={actualSpeed !== null ? status : 'normal'}>
      <ResultGrid results={results} columns={2} />
      {actualSpeed === null && (
        <p className="text-gray-500 text-sm mt-2">Select a gearmotor to see actual speed</p>
      )}
    </OutputCard>
  );
}

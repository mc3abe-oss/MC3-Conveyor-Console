'use client';

import { OutputCard, ResultGrid } from '../shared';
import type { ResultItem } from '../shared';

interface MagneticOutputs {
  [key: string]: unknown;
}

interface MagneticInputs {
  style?: string;
  conveyor_class?: string;
  material_type?: string;
  chip_type?: string;
  belt_speed_fpm?: number;
  incline_angle_deg?: number;
  discharge_height_in?: number;
  magnet_width_in?: number;
  magnet_centers_in?: number;
  load_lbs_per_hr?: number;
  [key: string]: unknown;
}

interface SummaryCardsProps {
  inputs: MagneticInputs;
  outputs: MagneticOutputs;
}

// Configuration Summary Card
export function ConfigSummaryCard({ inputs }: { inputs: MagneticInputs }) {
  const results: ResultItem[] = [
    { label: 'Style', value: inputs.style },
    { label: 'Class', value: typeof inputs.conveyor_class === 'string' ? inputs.conveyor_class.replace('_', ' ') : inputs.conveyor_class },
    { label: 'Material', value: typeof inputs.material_type === 'string' ? inputs.material_type.replace('_', ' ') : inputs.material_type },
    { label: 'Chip Type', value: typeof inputs.chip_type === 'string' ? inputs.chip_type.replace('_', ' ') : inputs.chip_type },
  ];

  return (
    <OutputCard title="Configuration">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Geometry Summary Card
export function GeometrySummaryCard({ inputs, outputs }: SummaryCardsProps) {
  const results: ResultItem[] = [
    { label: 'Belt Speed', value: inputs.belt_speed_fpm, unit: 'FPM', precision: 0 },
    { label: 'Incline Angle', value: inputs.incline_angle_deg, unit: '°', precision: 0 },
    { label: 'Discharge Height', value: inputs.discharge_height_in, unit: 'in', precision: 0 },
    { label: 'Path Length', value: outputs.path_length_ft, unit: 'ft', precision: 1 },
    { label: 'Belt Length', value: outputs.belt_length_ft, unit: 'ft', precision: 1 },
    { label: 'Chain Length', value: outputs.chain_length_in, unit: 'in', precision: 0 },
  ];

  return (
    <OutputCard title="Geometry">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Magnets Summary Card
export function MagnetsSummaryCard({ inputs, outputs }: SummaryCardsProps) {
  const results: ResultItem[] = [
    { label: 'Magnet Width', value: inputs.magnet_width_in, unit: 'in', precision: 0 },
    { label: 'Magnet Centers', value: inputs.magnet_centers_in, unit: 'in', precision: 0 },
    { label: 'Quantity', value: outputs.qty_magnets, precision: 0, highlight: true },
    { label: 'Weight Each', value: outputs.magnet_weight_each_lb, unit: 'lb', precision: 2 },
    { label: 'Total Weight', value: outputs.total_magnet_weight_lb, unit: 'lb', precision: 1 },
  ];

  return (
    <OutputCard title="Magnets">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Drive Summary Card
export function DriveSummaryCard({ outputs }: { outputs: MagneticOutputs }) {
  const results: ResultItem[] = [
    { label: 'Total Belt Pull', value: outputs.total_belt_pull_lb, unit: 'lb', precision: 1 },
    { label: 'Total Torque', value: outputs.total_torque_in_lb, unit: 'in-lb', precision: 1, highlight: true },
    { label: 'Required RPM', value: outputs.required_rpm, precision: 1 },
    { label: 'Gear Ratio', value: outputs.suggested_gear_ratio, precision: 1 },
  ];

  return (
    <OutputCard title="Drive Requirements">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Throughput Summary Card
export function ThroughputSummaryCard({ inputs, outputs }: SummaryCardsProps) {
  const margin = outputs.throughput_margin as number | null | undefined;
  let status: 'normal' | 'warning' | 'error' | 'success' = 'normal';
  if (margin !== null && margin !== undefined) {
    if (margin >= 1.5) status = 'success';
    else if (margin >= 1.25) status = 'warning';
    else status = 'error';
  }

  const results: ResultItem[] = [
    { label: 'Required', value: inputs.load_lbs_per_hr, unit: 'lb/hr', precision: 0 },
    { label: 'Achieved', value: outputs.achieved_throughput_lbs_hr, unit: 'lb/hr', precision: 0 },
    { label: 'Margin', value: margin, precision: 2, status, highlight: true },
  ];

  return (
    <OutputCard title="Throughput" status={status}>
      <ResultGrid results={results} columns={1} />
      {status === 'error' && (
        <p className="text-red-600 text-sm mt-2">Warning: Margin below 1.25 - may be undersized</p>
      )}
      {status === 'warning' && (
        <p className="text-amber-600 text-sm mt-2">Margin below 1.5 - adequate but limited headroom</p>
      )}
    </OutputCard>
  );
}

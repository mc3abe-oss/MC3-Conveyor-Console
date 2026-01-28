'use client';

import { OutputCard, ResultGrid } from '../shared';
import type { ResultItem } from '../shared';

interface MagneticOutputs {
  [key: string]: unknown;
}

// Geometry Detail Card
export function GeometryDetailCard({ outputs }: { outputs: MagneticOutputs }) {
  const results: ResultItem[] = [
    { label: 'Incline Length', value: outputs.incline_length_in, unit: 'in', precision: 1 },
    { label: 'Incline Run', value: outputs.incline_run_in, unit: 'in', precision: 1 },
    { label: 'Horizontal Length', value: outputs.horizontal_length_in, unit: 'in', precision: 1 },
    { label: 'Path Length', value: outputs.path_length_ft, unit: 'ft', precision: 2 },
    { label: 'Belt Length', value: outputs.belt_length_ft, unit: 'ft', precision: 2 },
    { label: 'Chain Length', value: outputs.chain_length_in, unit: 'in', precision: 0 },
  ];

  return (
    <OutputCard title="Geometry Details">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Loads Detail Card
export function LoadsDetailCard({ outputs }: { outputs: MagneticOutputs }) {
  const results: ResultItem[] = [
    { label: 'Chain Weight', value: outputs.chain_weight_lb_per_ft_used, unit: 'lb/ft', precision: 1 },
    { label: 'Weight per Foot', value: outputs.weight_per_foot_lb, unit: 'lb/ft', precision: 2 },
    { label: 'Belt Pull (Friction)', value: outputs.belt_pull_friction_lb, unit: 'lb', precision: 1 },
    { label: 'Belt Pull (Gravity)', value: outputs.belt_pull_gravity_lb, unit: 'lb', precision: 1 },
    { label: 'Chip Load', value: outputs.chip_load_lb, unit: 'lb', precision: 1 },
    { label: 'Total Load', value: outputs.total_load_lb, unit: 'lb', precision: 1, highlight: true },
  ];

  return (
    <OutputCard title="Load Breakdown">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Drive Detail Card
export function DriveDetailCard({ outputs }: { outputs: MagneticOutputs }) {
  const results: ResultItem[] = [
    { label: 'Starting Belt Pull', value: outputs.starting_belt_pull_lb_used, unit: 'lb', precision: 0 },
    { label: 'Total Belt Pull', value: outputs.total_belt_pull_lb, unit: 'lb', precision: 1 },
    { label: 'Running Torque', value: outputs.running_torque_in_lb, unit: 'in-lb', precision: 1 },
    { label: 'Total Torque', value: outputs.total_torque_in_lb, unit: 'in-lb', precision: 1, highlight: true },
    { label: 'Required RPM', value: outputs.required_rpm, precision: 1 },
    { label: 'Suggested Gear Ratio', value: outputs.suggested_gear_ratio, precision: 2 },
  ];

  return (
    <OutputCard title="Drive Requirements">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Parameters Card
export function ParametersCard({ outputs }: { outputs: MagneticOutputs }) {
  const results: ResultItem[] = [
    { label: 'Coefficient of Friction', value: outputs.coefficient_of_friction_used, precision: 3 },
    { label: 'Safety Factor', value: outputs.safety_factor_used, precision: 2 },
    { label: 'Starting Belt Pull', value: outputs.starting_belt_pull_lb_used, unit: 'lb', precision: 0 },
    { label: 'Chain Weight', value: outputs.chain_weight_lb_per_ft_used, unit: 'lb/ft', precision: 1 },
  ];

  return (
    <OutputCard title="Parameters Used">
      <ResultGrid results={results} columns={2} />
      <p className="text-xs text-gray-500 mt-3">These values are derived from conveyor class or user overrides.</p>
    </OutputCard>
  );
}

// Magnets Detail Card
export function MagnetsDetailCard({ outputs }: { outputs: MagneticOutputs }) {
  const results: ResultItem[] = [
    { label: 'Magnet Weight (each)', value: outputs.magnet_weight_each_lb, unit: 'lb', precision: 3 },
    { label: 'Quantity of Magnets', value: outputs.qty_magnets, precision: 0, highlight: true },
    { label: 'Total Magnet Weight', value: outputs.total_magnet_weight_lb, unit: 'lb', precision: 1 },
  ];

  return (
    <OutputCard title="Magnet Details">
      <ResultGrid results={results} columns={1} />
    </OutputCard>
  );
}

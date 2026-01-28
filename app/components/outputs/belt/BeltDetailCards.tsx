'use client';

import { OutputCard, ResultGrid } from '../shared';
import type { ResultItem } from '../shared';

interface BeltOutputs {
  [key: string]: unknown;
}

// Tensions Detail Card
export function TensionsDetailCard({ outputs }: { outputs: BeltOutputs }) {
  const results: ResultItem[] = [
    { label: 'Total Belt Pull', value: outputs.total_belt_pull_lb, unit: 'lb', precision: 1, highlight: true },
    { label: 'Tight Side (T1)', value: outputs.drive_T1_lbf, unit: 'lbf', precision: 1 },
    { label: 'Slack Side (T2)', value: outputs.drive_T2_lbf, unit: 'lbf', precision: 1 },
    { label: 'Friction Pull', value: outputs.friction_pull_lb, unit: 'lb', precision: 1 },
    { label: 'Incline Pull', value: outputs.incline_pull_lb, unit: 'lb', precision: 1 },
    { label: 'Starting Pull', value: outputs.starting_belt_pull_lb, unit: 'lb', precision: 1 },
  ];

  return (
    <OutputCard title="Belt Tensions">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Belt Detail Card
export function BeltDetailCard({ outputs }: { outputs: BeltOutputs }) {
  const results: ResultItem[] = [
    { label: 'Belt Width', value: outputs.belt_width_in, unit: 'in', precision: 1 },
    { label: 'Belt Length', value: outputs.total_belt_length_in, unit: 'in', precision: 1 },
    { label: 'Belt Speed', value: outputs.belt_speed_fpm, unit: 'FPM', precision: 1 },
    { label: 'Belt Weight', value: outputs.belt_weight_lbf, unit: 'lbf', precision: 1 },
    { label: 'V-Guided', value: outputs.is_v_guided },
    { label: 'PIW', value: outputs.piw_used, precision: 3 },
  ];

  return (
    <OutputCard title="Belt Details">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Pulleys Detail Card
export function PulleysDetailCard({ outputs }: { outputs: BeltOutputs }) {
  const driveMeetsMin = outputs.drive_pulley_meets_minimum;
  const tailMeetsMin = outputs.tail_pulley_meets_minimum;

  const results: ResultItem[] = [
    { label: 'Drive Pulley Dia', value: outputs.drive_pulley_diameter_in, unit: 'in', precision: 2 },
    { label: 'Tail Pulley Dia', value: outputs.tail_pulley_diameter_in, unit: 'in', precision: 2 },
    { label: 'Face Length', value: outputs.pulley_face_length_in, unit: 'in', precision: 2 },
    { label: 'Face Extra', value: outputs.pulley_face_extra_in, unit: 'in', precision: 2 },
    { label: 'Min Required', value: outputs.required_min_pulley_diameter_in, unit: 'in', precision: 2, highlight: true },
    { label: 'Crown Required', value: outputs.pulley_requires_crown },
  ];

  return (
    <OutputCard title="Pulley Details">
      <ResultGrid results={results} columns={2} />
      {driveMeetsMin === false && (
        <p className="text-red-600 text-sm mt-2">Drive pulley diameter below minimum required</p>
      )}
      {tailMeetsMin === false && (
        <p className="text-red-600 text-sm mt-2">Tail pulley diameter below minimum required</p>
      )}
    </OutputCard>
  );
}

// Pulley Loads Detail Card
export function PulleyLoadsDetailCard({ outputs }: { outputs: BeltOutputs }) {
  const results: ResultItem[] = [
    { label: 'Drive Pulley Load', value: outputs.drive_pulley_resultant_load_lbf, unit: 'lbf', precision: 1 },
    { label: 'Tail Pulley Load', value: outputs.tail_pulley_resultant_load_lbf, unit: 'lbf', precision: 1 },
    { label: 'Drive T1', value: outputs.drive_T1_lbf, unit: 'lbf', precision: 1 },
    { label: 'Drive T2', value: outputs.drive_T2_lbf, unit: 'lbf', precision: 1 },
  ];

  return (
    <OutputCard title="Pulley Loads">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Drive Detail Card
export function DriveDetailCard({ outputs }: { outputs: BeltOutputs }) {
  const results: ResultItem[] = [
    { label: 'Drive Torque', value: outputs.torque_drive_shaft_inlbf, unit: 'in-lbf', precision: 1, highlight: true },
    { label: 'Drive Shaft RPM', value: outputs.drive_shaft_rpm, precision: 1 },
    { label: 'Gear Ratio', value: outputs.gear_ratio, precision: 2 },
    { label: 'Chain Ratio', value: outputs.chain_ratio, precision: 2 },
    { label: 'Total Ratio', value: outputs.total_drive_ratio, precision: 2 },
    { label: 'GM Output RPM', value: outputs.gearmotor_output_rpm, precision: 1 },
  ];

  return (
    <OutputCard title="Drive Requirements">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Shaft Detail Card
export function ShaftDetailCard({ outputs }: { outputs: BeltOutputs }) {
  const results: ResultItem[] = [
    { label: 'Drive Shaft Dia', value: outputs.drive_shaft_diameter_in, unit: 'in', precision: 3 },
    { label: 'Tail Shaft Dia', value: outputs.tail_shaft_diameter_in, unit: 'in', precision: 3 },
  ];

  return (
    <OutputCard title="Shaft Sizing">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Load Detail Card
export function LoadDetailCard({ outputs }: { outputs: BeltOutputs }) {
  const results: ResultItem[] = [
    { label: 'Total Load', value: outputs.total_load_lbf, unit: 'lbf', precision: 1, highlight: true },
    { label: 'Load on Belt', value: outputs.load_on_belt_lbf, unit: 'lbf', precision: 1 },
    { label: 'Parts on Belt', value: outputs.parts_on_belt, precision: 1 },
    { label: 'Belt Weight', value: outputs.belt_weight_lbf, unit: 'lbf', precision: 1 },
  ];

  return (
    <OutputCard title="Load Analysis">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

// Parameters Card
export function ParametersCard({ outputs }: { outputs: BeltOutputs }) {
  const results: ResultItem[] = [
    { label: 'Friction Coefficient', value: outputs.friction_coeff_used, precision: 3 },
    { label: 'Safety Factor', value: outputs.safety_factor_used, precision: 2 },
    { label: 'Starting Pull', value: outputs.starting_belt_pull_lb_used, unit: 'lb', precision: 0 },
    { label: 'Motor RPM', value: outputs.motor_rpm_used, precision: 0 },
    { label: 'PIW', value: outputs.piw_used, precision: 3 },
    { label: 'PIL', value: outputs.pil_used, precision: 3 },
  ];

  return (
    <OutputCard title="Parameters Used">
      <ResultGrid results={results} columns={2} />
      <p className="text-xs text-gray-500 mt-3">These values are from defaults or user overrides.</p>
    </OutputCard>
  );
}

// PCI Tube Stress Card
export function PciStressCard({ outputs }: { outputs: BeltOutputs }) {
  const status = outputs.pci_tube_stress_status as string | undefined;
  let cardStatus: 'normal' | 'warning' | 'error' | 'success' = 'normal';

  if (status === 'pass' || status === 'estimated') cardStatus = 'success';
  else if (status === 'warn') cardStatus = 'warning';
  else if (status === 'fail' || status === 'error') cardStatus = 'error';

  const results: ResultItem[] = [
    { label: 'Drive Tube Stress', value: outputs.pci_drive_tube_stress_psi, unit: 'psi', precision: 0 },
    { label: 'Tail Tube Stress', value: outputs.pci_tail_tube_stress_psi, unit: 'psi', precision: 0 },
    { label: 'Stress Limit', value: outputs.pci_tube_stress_limit_psi, unit: 'psi', precision: 0 },
    { label: 'Status', value: status },
  ];

  return (
    <OutputCard title="PCI Tube Stress" status={cardStatus}>
      <ResultGrid results={results} columns={2} />
      {status === 'estimated' && (
        <p className="text-amber-600 text-sm mt-2">Hub centers estimated - verify for accuracy</p>
      )}
      {(status === 'warn' || status === 'fail') && (
        <p className="text-red-600 text-sm mt-2">Tube stress exceeds limit - review pulley design</p>
      )}
    </OutputCard>
  );
}

// Geometry Detail Card
export function GeometryDetailCard({ outputs }: { outputs: BeltOutputs }) {
  const results: ResultItem[] = [
    { label: 'Length (C-C)', value: outputs.conveyor_length_cc_in, unit: 'in', precision: 1 },
    { label: 'Horizontal Run', value: outputs.horizontal_run_in, unit: 'in', precision: 1 },
    { label: 'Rise', value: outputs.rise_in, unit: 'in', precision: 1 },
    { label: 'Incline Angle', value: outputs.conveyor_incline_deg, unit: '°', precision: 1 },
  ];

  return (
    <OutputCard title="Geometry">
      <ResultGrid results={results} columns={2} />
    </OutputCard>
  );
}

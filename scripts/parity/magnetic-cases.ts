/**
 * Magnetic parity corpus — case definitions (reviewable, deterministic).
 * Each case runs through the real magnetic model (formulas.calculate — see
 * magnetic-core.ts for the Gate 1 capture-entry-point ruling).
 * Categories: fixture (real jobs + named anchors), grid (systematic sweeps +
 * combos), edge (boundaries, D1 pairs), failure (expected errors).
 *
 * Bar configurations only ever come from BAR_LITERALS (Abe-blessed frozen
 * set) or are absent — never a catalog read (headless rule).
 */
import {
  MagneticInputs,
  ConveyorStyle,
  MagnetType,
  ChipType,
  MaterialType,
  TemperatureClass,
  FluidType,
  ChipDelivery,
  SupportType,
} from '../../src/models/magnetic_conveyor_v1/schema';
import { standardBaseline, heavyDutyBaseline, cleanBaseline, BAR_LITERALS } from './magnetic-core';

export type Category = 'fixture' | 'grid' | 'edge' | 'failure';
export interface CaseDef {
  id: string;
  category: Category;
  description: string;
  inputs: MagneticInputs;
}

type Ov = Partial<MagneticInputs>;
const std = (o: Ov): MagneticInputs => ({ ...standardBaseline(), ...o });
const hd = (o: Ov): MagneticInputs => ({ ...heavyDutyBaseline(), ...o });
const pad = (n: number) => String(n).padStart(4, '0');

// ------------------------------------------------------------------
// FIXTURE — real jobs (e2e-anchored) + named known-value anchors
// ------------------------------------------------------------------
function fixtureCases(): CaseDef[] {
  const c: Array<[string, MagneticInputs]> = [
    // The four real jobs from the master reference / e2e suite
    ['job-32791', std({ infeed_length_in: 36, discharge_height_in: 48, belt_speed_fpm: 30, load_lbs_per_hr: 500, magnet_type: MagnetType.Ceramic5, bar_configuration: BAR_LITERALS.C12 })],
    ['job-32425-hd', hd({ infeed_length_in: 120, discharge_height_in: 200, incline_angle_deg: 70, load_lbs_per_hr: 8000, magnet_type: MagnetType.Ceramic5, bar_configuration: BAR_LITERALS.N30x8 })],
    ['job-32285-styleA', std({ style: ConveyorStyle.A, infeed_length_in: 48, discharge_height_in: 36, load_lbs_per_hr: 300, magnet_type: MagnetType.Ceramic5, bar_configuration: BAR_LITERALS.C12 })],
    ['job-33017', std({ infeed_length_in: 42, discharge_height_in: 60, magnet_width_in: 15, load_lbs_per_hr: 600, magnet_type: MagnetType.Ceramic5, bar_configuration: BAR_LITERALS.C15_N1 })],
    // Test-fixture anchors (hand-arithmetic cases in the completion report)
    ['std-nobar', standardBaseline()],
    ['hd-nobar', heavyDutyBaseline()],
    ['style-c', std({ style: ConveyorStyle.C, infeed_length_in: 100, discharge_height_in: 0, incline_angle_deg: 0, discharge_length_in: undefined, magnet_width_in: 9.5, magnet_type: MagnetType.Ceramic5, belt_speed_fpm: 45, load_lbs_per_hr: 500 })],
    ['clean-validation', { ...cleanBaseline(), bar_configuration: BAR_LITERALS.C12_N2 }],
    ['full-overrides', std({ coefficient_of_friction: 0.25, safety_factor: 2.5, starting_belt_pull_lb: 150, chain_weight_lb_per_ft: 2.5, bar_configuration: BAR_LITERALS.C12 })],
    ['pattern-alternating', std({ bar_configuration: { ...BAR_LITERALS.C12, pattern_mode: 'alternating', secondary_bar_capacity_lb: BAR_LITERALS.SWEEP.bar_capacity_lb } })],
    ['pattern-interval-4', std({ bar_configuration: { ...BAR_LITERALS.C12, pattern_mode: 'interval', secondary_bar_capacity_lb: BAR_LITERALS.SWEEP.bar_capacity_lb, interval_count: 4 } })],
  ];
  return c.map(([name, inputs], i) => ({ id: `mag-fixture-${pad(i)}-${name}`, category: 'fixture', description: `Fixture scenario: ${name}`, inputs }));
}

// ------------------------------------------------------------------
// GRID — one-factor sweeps off both class baselines + targeted combos
// ------------------------------------------------------------------
function standardGrid(): CaseDef[] {
  const out: CaseDef[] = [];
  let i = 0;
  const add = (desc: string, o: Ov) => out.push({ id: `mag-grid-std-${pad(i++)}`, category: 'grid', description: `STD grid: ${desc}`, inputs: std(o) });

  const sweeps: Array<[string, Ov[]]> = [
    ['style', [ConveyorStyle.A, ConveyorStyle.C, ConveyorStyle.D].map((v) => ({ style: v }))],
    ['magnet_width_in', [5, 6, 7.5, 8.5, 9.5, 10, 12.5, 14, 15, 18, 24, 30].map((v) => ({ magnet_width_in: v }))],
    ['magnet_centers_in', [18, 24, 36].map((v) => ({ magnet_centers_in: v }))],
    ['belt_speed_fpm', [6, 15, 60, 90, 120].map((v) => ({ belt_speed_fpm: v }))],
    ['load_lbs_per_hr', [300, 2500, 8000].map((v) => ({ load_lbs_per_hr: v }))],
    ['incline_angle_deg', [30, 45, 75, 90].map((v) => ({ incline_angle_deg: v }))],
    ['discharge_height_in', [24, 50, 150, 250].map((v) => ({ discharge_height_in: v }))],
    ['infeed_length_in', [30, 39, 60, 100].map((v) => ({ infeed_length_in: v }))],
    ['discharge_length_in', [12, 24, 36].map((v) => ({ discharge_length_in: v }))],
    ['magnet_type', [MagnetType.Ceramic5, MagnetType.Neo35, MagnetType.Neo50].map((v) => ({ magnet_type: v }))],
    ['material_type', [{ material_type: MaterialType.CastIron }]],
    ['chip_type', [ChipType.Stringers, ChipType.BirdNests, ChipType.SawFines, ChipType.Parts, ChipType.SteelFiber].map((v) => ({ chip_type: v }))],
    ['temperature_class', [TemperatureClass.Warm, TemperatureClass.RedHot].map((v) => ({ temperature_class: v }))],
    ['fluid_type', [FluidType.None, FluidType.OilBased, FluidType.MinimalResidualOil].map((v) => ({ fluid_type: v }))],
    ['chip_delivery', [ChipDelivery.ChipChute, ChipDelivery.VibratingFeeder, ChipDelivery.AlongInfeed].map((v) => ({ chip_delivery: v }))],
    ['support_type', [SupportType.FixedLegs, SupportType.Casters].map((v) => ({ support_type: v }))],
    ['coefficient_of_friction', [0.15, 0.25, 0.3].map((v) => ({ coefficient_of_friction: v }))],
    ['safety_factor', [1.5, 2.5, 3.0].map((v) => ({ safety_factor: v }))],
    ['starting_belt_pull_lb', [50, 150, 200].map((v) => ({ starting_belt_pull_lb: v }))],
    ['chain_weight_lb_per_ft', [1.5, 2.5, 3.0].map((v) => ({ chain_weight_lb_per_ft: v }))],
    ['bar_literal', ['C12', 'C12_N1', 'C12_N2', 'C24', 'ZERO'].map((k) => ({ bar_configuration: BAR_LITERALS[k] }))],
  ];
  for (const [name, vals] of sweeps) vals.forEach((o, k) => add(`${name}[${k}]`, o));

  // Pattern modes over the blessed C12 + SWEEP pair
  add('pattern all_same explicit', { bar_configuration: { ...BAR_LITERALS.C12, pattern_mode: 'all_same' } });
  for (const ic of [2, 3, 6]) {
    add(`pattern interval ic=${ic}`, { bar_configuration: { ...BAR_LITERALS.C12, pattern_mode: 'interval', secondary_bar_capacity_lb: BAR_LITERALS.SWEEP.bar_capacity_lb, interval_count: ic } });
  }
  add('pattern alternating N2/SWEEP', { bar_configuration: { ...BAR_LITERALS.C12_N2, pattern_mode: 'alternating', secondary_bar_capacity_lb: BAR_LITERALS.SWEEP.bar_capacity_lb } });

  // Targeted interactions
  for (const style of [ConveyorStyle.A, ConveyorStyle.B, ConveyorStyle.C, ConveyorStyle.D]) {
    add(`style=${style}×C12`, { style, bar_configuration: BAR_LITERALS.C12 });
  }
  for (const [w, c] of [[5, 36], [30, 12], [12, 36], [24, 18]] as Array<[number, number]>) {
    add(`width=${w}×centers=${c}`, { magnet_width_in: w, magnet_centers_in: c });
  }
  for (const [s, l] of [[6, 8000], [120, 300], [6, 300], [120, 8000]] as Array<[number, number]>) {
    add(`speed=${s}×load=${l}×C12`, { belt_speed_fpm: s, load_lbs_per_hr: l, bar_configuration: BAR_LITERALS.C12 });
  }
  add('angle=90×height=250', { incline_angle_deg: 90, discharge_height_in: 250 });
  add('undersized-chips C12 slow', { belt_speed_fpm: 10, load_lbs_per_hr: 5000, bar_configuration: BAR_LITERALS.C12 });
  add('healthy-margin C12_N2', { belt_speed_fpm: 60, load_lbs_per_hr: 500, bar_configuration: BAR_LITERALS.C12_N2 });
  add('undersized-parts C12 slow', { chip_type: ChipType.Parts, belt_speed_fpm: 10, load_lbs_per_hr: 5000, bar_configuration: BAR_LITERALS.C12 });
  for (const inf of [60, 100, 200, 300]) {
    add(`styleC infeed=${inf}×C12`, { style: ConveyorStyle.C, infeed_length_in: inf, discharge_height_in: 0, incline_angle_deg: 0, bar_configuration: BAR_LITERALS.C12 });
  }
  // geometry ladder: tall/steep vs long/shallow at both extremes
  for (const [h, a, inf] of [[300, 80, 48], [40, 30, 240], [120, 60, 120]] as Array<[number, number, number]>) {
    add(`geom h=${h} a=${a} inf=${inf}`, { discharge_height_in: h, incline_angle_deg: a, infeed_length_in: inf });
  }
  // override interactions (power-user combos)
  add('CoF+SF override×C12', { coefficient_of_friction: 0.25, safety_factor: 1.8, bar_configuration: BAR_LITERALS.C12 });
  add('pull+chain override', { starting_belt_pull_lb: 120, chain_weight_lb_per_ft: 2.2 });

  // Bar-literal interactions (capacity literal is independent of width input)
  for (const bar of ['C12', 'C24'] as const) {
    for (const s of [15, 90]) add(`bar=${bar}×speed=${s}`, { belt_speed_fpm: s, bar_configuration: BAR_LITERALS[bar] });
  }
  for (const c of [18, 36]) add(`bar=C12_N1×centers=${c}`, { magnet_centers_in: c, bar_configuration: BAR_LITERALS.C12_N1 });
  for (const w of [5, 18]) add(`bar=C12×width=${w}`, { magnet_width_in: w, bar_configuration: BAR_LITERALS.C12 });
  for (const a of [30, 75]) add(`bar=C12×angle=${a}`, { incline_angle_deg: a, bar_configuration: BAR_LITERALS.C12 });
  for (const style of [ConveyorStyle.A, ConveyorStyle.D]) {
    add(`style=${style}×C12_N2`, { style, bar_configuration: BAR_LITERALS.C12_N2 });
  }
  add('cast_iron×C12', { material_type: MaterialType.CastIron, bar_configuration: BAR_LITERALS.C12 });
  add('saw_fines×C12', { chip_type: ChipType.SawFines, bar_configuration: BAR_LITERALS.C12 });
  add('steel_fiber×C12', { chip_type: ChipType.SteelFiber, bar_configuration: BAR_LITERALS.C12 });
  add('discharge=36×C12', { discharge_length_in: 36, bar_configuration: BAR_LITERALS.C12 });
  for (const t of [TemperatureClass.Warm, TemperatureClass.RedHot]) add(`temp=${t}×C12`, { temperature_class: t, bar_configuration: BAR_LITERALS.C12 });
  for (const f of [FluidType.None, FluidType.MinimalResidualOil]) add(`fluid=${f}×C12`, { fluid_type: f, bar_configuration: BAR_LITERALS.C12 });
  add('infeed=30×C12', { infeed_length_in: 30, bar_configuration: BAR_LITERALS.C12 });
  // Margin ladder around 1.0 with C12 (achieved 1575.135 at baseline geometry)
  for (const l of [500, 1575.135, 3000]) add(`margin-ladder load=${l}×C12`, { load_lbs_per_hr: l, bar_configuration: BAR_LITERALS.C12 });
  // Denser single-dim ladders (no-bar)
  for (const s of [45, 75, 105]) add(`speed-ladder ${s}`, { belt_speed_fpm: s });
  for (const h of [75, 125, 175]) add(`height-ladder ${h}`, { discharge_height_in: h });
  for (const a of [50, 55, 65, 85]) add(`angle-ladder ${a}`, { incline_angle_deg: a });
  for (const w of [11, 13, 16, 20, 22, 26, 28]) add(`width-ladder ${w}`, { magnet_width_in: w });
  for (const [c, w] of [[18, 15], [24, 24], [36, 30]] as Array<[number, number]>) {
    add(`centers=${c}×width=${w}`, { magnet_centers_in: c, magnet_width_in: w });
  }

  return out;
}

function heavyDutyGrid(): CaseDef[] {
  const out: CaseDef[] = [];
  let i = 0;
  const add = (desc: string, o: Ov) => out.push({ id: `mag-grid-hd-${pad(i++)}`, category: 'grid', description: `HD grid: ${desc}`, inputs: hd(o) });

  const sweeps: Array<[string, Ov[]]> = [
    ['style', [ConveyorStyle.A, ConveyorStyle.C, ConveyorStyle.D].map((v) => ({ style: v }))],
    ['magnet_width_in', [12, 15, 18, 24].map((v) => ({ magnet_width_in: v }))],
    ['magnet_centers_in', [18, 24, 36].map((v) => ({ magnet_centers_in: v }))],
    ['belt_speed_fpm', [6, 60, 120].map((v) => ({ belt_speed_fpm: v }))],
    ['load_lbs_per_hr', [1000, 5000, 10000].map((v) => ({ load_lbs_per_hr: v }))],
    ['incline_angle_deg', [30, 45, 60, 90].map((v) => ({ incline_angle_deg: v }))],
    ['discharge_height_in', [50, 150, 300].map((v) => ({ discharge_height_in: v }))],
    ['infeed_length_in', [30, 48, 120].map((v) => ({ infeed_length_in: v }))],
    ['material_type', [{ material_type: MaterialType.Steel }]],
    ['chip_type', [ChipType.Parts, ChipType.SawFines].map((v) => ({ chip_type: v }))],
    ['coefficient_of_friction', [0.2, 0.1].map((v) => ({ coefficient_of_friction: v }))],
    ['safety_factor', [2.0, 1.2].map((v) => ({ safety_factor: v }))],
    ['bar_literal', ['N30x8', 'C24', 'ZERO'].map((k) => ({ bar_configuration: BAR_LITERALS[k] }))],
  ];
  for (const [name, vals] of sweeps) vals.forEach((o, k) => add(`${name}[${k}]`, o));

  // HD interactions
  add('small-hd (no HD warnings)', { magnet_width_in: 12, discharge_height_in: 50, load_lbs_per_hr: 1000, infeed_length_in: 48 });
  add('N30x8×slow×heavy', { belt_speed_fpm: 10, load_lbs_per_hr: 12000, bar_configuration: BAR_LITERALS.N30x8 });
  add('N30x8×fast×light', { belt_speed_fpm: 100, load_lbs_per_hr: 1000, bar_configuration: BAR_LITERALS.N30x8 });
  add('styleC×C24', { style: ConveyorStyle.C, infeed_length_in: 150, discharge_height_in: 0, incline_angle_deg: 0, bar_configuration: BAR_LITERALS.C24 });
  add('pattern alternating N30x8/SWEEP', { bar_configuration: { ...BAR_LITERALS.N30x8, pattern_mode: 'alternating', secondary_bar_capacity_lb: BAR_LITERALS.SWEEP.bar_capacity_lb } });

  // HD secondary dims
  for (const t of [TemperatureClass.Warm, TemperatureClass.RedHot]) add(`temp=${t}`, { temperature_class: t });
  for (const f of [FluidType.OilBased, FluidType.None]) add(`fluid=${f}`, { fluid_type: f });
  for (const s of [SupportType.AdjustableLegs, SupportType.LevelingFeet]) add(`support=${s}`, { support_type: s });
  for (const ct of [ChipType.Stringers, ChipType.BirdNests]) add(`chip=${ct}`, { chip_type: ct });
  for (const mt of [MagnetType.Neo50, MagnetType.Ceramic5]) add(`magnet_type=${mt}`, { magnet_type: mt });
  for (const d of [12, 36]) add(`discharge=${d}`, { discharge_length_in: d });
  for (const cw of [2.5, 3.5]) add(`chain_weight=${cw}`, { chain_weight_lb_per_ft: cw });
  add('starting_pull=150', { starting_belt_pull_lb: 150 });
  add('N30x8×angle=45', { incline_angle_deg: 45, bar_configuration: BAR_LITERALS.N30x8 });
  add('C24×centers=24', { magnet_centers_in: 24, bar_configuration: BAR_LITERALS.C24 });

  return out;
}

// ------------------------------------------------------------------
// EDGE — exact thresholds, D1 pairs, degenerate geometry
// ------------------------------------------------------------------
function edgeCases(): CaseDef[] {
  const c: Array<[string, MagneticInputs]> = [
    // Warning thresholds: exact boundary vs just-over
    ['speed-120-exact', std({ belt_speed_fpm: 120 })],
    ['speed-121-warn', std({ belt_speed_fpm: 121 })],
    ['speed-min-6', std({ belt_speed_fpm: 6 })],
    ['width-24-exact', std({ magnet_width_in: 24 })],
    ['width-24.01-warn', std({ magnet_width_in: 24.01 })],
    ['load-5000-exact', std({ load_lbs_per_hr: 5000 })],
    ['load-5001-warn', std({ load_lbs_per_hr: 5001 })],
    ['height-200-exact', std({ discharge_height_in: 200 })],
    ['height-201-warn', std({ discharge_height_in: 201 })],
    ['infeed-39-exact', std({ infeed_length_in: 39 })],
    ['infeed-38.99-warn', std({ infeed_length_in: 38.99 })],
    // Chain-length threshold neighborhood (chain > 500" fires CONSIDER_HD_CHAIN_LENGTH)
    ['chain-under-500', std({ discharge_height_in: 150, infeed_length_in: 48 })],
    ['chain-over-500', std({ discharge_height_in: 165, infeed_length_in: 48 })],
    // Throughput-margin threshold neighborhood with a real bar (C12, achieved 1575.135)
    ['margin-at-1.5', std({ load_lbs_per_hr: 1050.09, bar_configuration: BAR_LITERALS.C12 })],
    ['margin-below-1.5', std({ load_lbs_per_hr: 1200, bar_configuration: BAR_LITERALS.C12 })],
    ['margin-parts-at-1.25', std({ chip_type: ChipType.Parts, load_lbs_per_hr: 1260.108, bar_configuration: BAR_LITERALS.C12 })],
    ['margin-parts-below-1.25', std({ chip_type: ChipType.Parts, load_lbs_per_hr: 1400, bar_configuration: BAR_LITERALS.C12 })],
    // D1 equivalence pair: absent bar vs zero-capacity bar (must produce identical physics)
    ['d1-no-bar', std({})],
    ['d1-zero-bar', std({ bar_configuration: BAR_LITERALS.ZERO })],
    // Default-equivalence pair: discharge_length omitted vs explicit 22
    ['discharge-default', std({ discharge_length_in: undefined })],
    ['discharge-explicit-22', std({ discharge_length_in: 22 })],
    // Style C coercion: nonzero height/angle inputs are geometry-coerced to 0 (no error)
    ['style-c-coerce', std({ style: ConveyorStyle.C, discharge_height_in: 100, incline_angle_deg: 60 })],
    // Vertical
    ['angle-90-vertical', std({ incline_angle_deg: 90 })],
    // Degenerate small: Style C short belt → qty_magnets 0, chip 0 even with a bar
    ['tiny-qty-zero', std({ style: ConveyorStyle.C, infeed_length_in: 24, discharge_height_in: 0, incline_angle_deg: 0, magnet_centers_in: 36, bar_configuration: BAR_LITERALS.C12 })],
    // Interval pattern edge: interval_count 1 (every bar secondary)
    ['interval-count-1', std({ bar_configuration: { ...BAR_LITERALS.C12, pattern_mode: 'interval', secondary_bar_capacity_lb: BAR_LITERALS.SWEEP.bar_capacity_lb, interval_count: 1 } })],
  ];
  return c.map(([name, inputs], i) => ({ id: `mag-edge-${pad(i)}-${name}`, category: 'edge', description: `Edge: ${name}`, inputs }));
}

// ------------------------------------------------------------------
// FAILURE — expected errors (success:false), rules are the contract
// ------------------------------------------------------------------
function failureCases(): CaseDef[] {
  const c: Array<[string, MagneticInputs]> = [
    ['aluminum-std', std({ material_type: MaterialType.Aluminum })],
    ['stainless-std', std({ material_type: MaterialType.StainlessSteel })],
    ['aluminum-hd', hd({ material_type: MaterialType.Aluminum })],
    ['styleA-zero-height', std({ style: ConveyorStyle.A, discharge_height_in: 0 })],
    ['styleB-zero-angle', std({ incline_angle_deg: 0 })],
    ['styleA-zero-both', std({ style: ConveyorStyle.A, discharge_height_in: 0, incline_angle_deg: 0 })],
    ['styleD-zero-both', std({ style: ConveyorStyle.D, discharge_height_in: 0, incline_angle_deg: 0 })],
    ['aluminum-plus-zero-both', std({ material_type: MaterialType.Aluminum, style: ConveyorStyle.A, discharge_height_in: 0, incline_angle_deg: 0 })],
    ['stainless-plus-speed', std({ material_type: MaterialType.StainlessSteel, belt_speed_fpm: 150 })],
    ['aluminum-with-bar', std({ material_type: MaterialType.Aluminum, bar_configuration: BAR_LITERALS.C12 })],
    ['stainless-hd-hot-oil', hd({ material_type: MaterialType.StainlessSteel, temperature_class: TemperatureClass.RedHot, fluid_type: FluidType.OilBased })],
    ['aluminum-stringers-short-infeed', std({ material_type: MaterialType.Aluminum, chip_type: ChipType.Stringers, infeed_length_in: 30 })],
  ];
  return c.map(([name, inputs], i) => ({ id: `mag-failure-${pad(i)}-${name}`, category: 'failure', description: `Failure: ${name}`, inputs }));
}

export function buildCases(): CaseDef[] {
  return [...fixtureCases(), ...standardGrid(), ...heavyDutyGrid(), ...edgeCases(), ...failureCases()];
}

/**
 * Parity corpus — belt case definitions (reviewable, deterministic).
 * Each case runs through the real engine (runCalculation, productKey belt_conveyor_v1).
 * Categories: fixture (named known scenarios), grid (systematic sweeps + combos),
 * edge (boundary/nullable), failure (expected errors, success:false).
 */
import { SliderbedInputs } from '../../src/models/sliderbed_v1/schema';
import { partsBaseline, bulkBaseline } from './core';

export type Category = 'fixture' | 'grid' | 'edge' | 'failure';
export interface CaseDef {
  id: string;
  category: Category;
  description: string;
  inputs: SliderbedInputs;
}

type Ov = Partial<SliderbedInputs>;
const parts = (o: Ov): SliderbedInputs => ({ ...partsBaseline(), ...o });
const bulk = (o: Ov): SliderbedInputs => ({ ...bulkBaseline(), ...o });
const pad = (n: number) => String(n).padStart(4, '0');

// ------------------------------------------------------------------
// FIXTURE — named scenarios mirroring existing fixtures (known-value anchors)
// ------------------------------------------------------------------
function fixtureCases(): CaseDef[] {
  const c: Array<[string, Ov]> = [
    ['typical-flat', { belt_width_in: 24, conveyor_length_cc_in: 120, conveyor_incline_deg: 0, belt_speed_fpm: 50, part_weight_lbs: 5, part_length_in: 6, part_width_in: 6, part_spacing_in: 6, drive_pulley_diameter_in: 4, tail_pulley_diameter_in: 4 }],
    ['incline-15', { belt_width_in: 18, conveyor_length_cc_in: 180, conveyor_incline_deg: 15, belt_speed_fpm: 40, part_weight_lbs: 10, part_length_in: 8, part_width_in: 8, part_spacing_in: 4, drive_pulley_diameter_in: 6, tail_pulley_diameter_in: 4 }],
    ['vguided-min-pulley', { belt_width_in: 12, conveyor_length_cc_in: 96, belt_speed_fpm: 60, part_weight_lbs: 2, part_length_in: 4, part_width_in: 4, belt_tracking_method: 'V-guided', v_guide_profile: 'K10', drive_pulley_diameter_in: 4, tail_pulley_diameter_in: 4 }],
    ['shaft-regression', { belt_width_in: 18, conveyor_length_cc_in: 144, belt_speed_fpm: 75, part_weight_lbs: 10, part_length_in: 8, part_width_in: 6, part_spacing_in: 8, drive_pulley_diameter_in: 4.5, tail_pulley_diameter_in: 4.5 }],
    ['high-speed', { belt_width_in: 18, conveyor_length_cc_in: 180, belt_speed_fpm: 350, part_weight_lbs: 2, part_length_in: 6, part_width_in: 4, drive_pulley_diameter_in: 8, tail_pulley_diameter_in: 6 }],
    ['heavy-load', { belt_width_in: 36, conveyor_length_cc_in: 240, belt_speed_fpm: 60, part_weight_lbs: 75, part_length_in: 24, part_width_in: 18, drive_pulley_diameter_in: 10, tail_pulley_diameter_in: 8, frame_construction_type: 'structural_channel', frame_structural_channel_series: 'C6' }],
    ['long-conveyor', { belt_width_in: 24, conveyor_length_cc_in: 600, belt_speed_fpm: 100, part_weight_lbs: 10, part_length_in: 12, part_width_in: 8, drive_pulley_diameter_in: 8, tail_pulley_diameter_in: 6 }],
    ['hot-parts', { belt_width_in: 18, conveyor_length_cc_in: 120, belt_speed_fpm: 80, part_weight_lbs: 5, part_length_in: 8, part_width_in: 6, drive_pulley_diameter_in: 6, tail_pulley_diameter_in: 4, part_temperature_class: 'Hot' as unknown as SliderbedInputs['part_temperature_class'] }],
    ['finger-safe', { finger_safe: true, end_guards: 'None' as unknown as SliderbedInputs['end_guards'] }],
    ['cleated-parts', { belt_width_in: 18, conveyor_length_cc_in: 180, conveyor_incline_deg: 20, belt_speed_fpm: 80, part_weight_lbs: 5, part_length_in: 6, part_width_in: 4, cleats_enabled: true, cleat_height_in: 2, cleat_spacing_in: 12, cleat_edge_offset_in: 1, drive_pulley_diameter_in: 8, tail_pulley_diameter_in: 8 }],
    ['sideload-vguided', { side_loading_direction: 'Left' as unknown as SliderbedInputs['side_loading_direction'], side_loading_severity: 'Heavy' as unknown as SliderbedInputs['side_loading_severity'], belt_tracking_method: 'V-guided', v_guide_profile: 'K13' }],
    ['bulk-so33806', bulk({ bulk_input_method: 'WEIGHT_FLOW', mass_flow_lbs_per_hr: 7000, density_lbs_per_ft3: 10, belt_width_in: 32, belt_speed_fpm: 100, conveyor_length_cc_in: 312, cleats_enabled: true, cleat_height_in: 3, cleat_spacing_in: 24, cleat_edge_offset_in: 1, pile_shape: 'FLAT' })],
  ];
  return c.map(([name, o], i) => ({ id: `belt-fixture-${pad(i)}-${name}`, category: 'fixture', description: `Fixture scenario: ${name}`, inputs: name === 'bulk-so33806' ? (o as SliderbedInputs) : parts(o) }));
}

// ------------------------------------------------------------------
// GRID (PARTS) — one-factor sweeps from baseline + targeted interaction combos
// ------------------------------------------------------------------
function partsGrid(): CaseDef[] {
  const out: CaseDef[] = [];
  let i = 0;
  const add = (desc: string, o: Ov) => out.push({ id: `belt-grid-parts-${pad(i++)}`, category: 'grid', description: `PARTS grid: ${desc}`, inputs: parts(o) });

  // One-factor-at-a-time sweeps
  const sweeps: Array<[string, Ov[]]> = [
    ['bed_type', [{ bed_type: 'slider_bed' }, { bed_type: 'roller_bed' }, { bed_type: 'other' }]],
    ['belt_width_in', [4, 12, 24, 36, 48].map((v) => ({ belt_width_in: v }))],
    ['conveyor_length_cc_in', [24, 60, 120, 240, 360, 600].map((v) => ({ conveyor_length_cc_in: v }))],
    ['conveyor_incline_deg', [0, 5, 10, 15].map((v) => ({ conveyor_incline_deg: v }))],
    ['belt_speed_fpm', [10, 20, 60, 104.72, 150, 200].map((v) => ({ belt_speed_fpm: v }))],
    ['part_weight_lbs', [0.5, 5, 25, 100].map((v) => ({ part_weight_lbs: v }))],
    ['part_length_in', [2, 6, 12, 24].map((v) => ({ part_length_in: v }))],
    ['part_width_in', [2, 6, 12, 24].map((v) => ({ part_width_in: v }))],
    ['part_spacing_in', [0, 6, 12].map((v) => ({ part_spacing_in: v }))],
    ['drop_height_in', [0, 6, 12].map((v) => ({ drop_height_in: v }))],
    ['drive_pulley_diameter_in', [3, 4, 6, 8, 10].map((v) => ({ drive_pulley_diameter_in: v }))],
    ['tail_pulley_diameter_in', [3, 4, 6, 8].map((v) => ({ tail_pulley_diameter_in: v }))],
    ['friction_coeff', [0.05, 0.25, 0.5, 0.6].map((v) => ({ friction_coeff: v }))],
    ['safety_factor', [1.0, 2.0, 3.5, 5.0].map((v) => ({ safety_factor: v }))],
    ['motor_rpm', [800, 1750, 3600].map((v) => ({ motor_rpm: v }))],
    ['belt_coeff_piw', [0.05, 0.109, 0.2, 0.3].map((v) => ({ belt_coeff_piw: v }))],
    ['belt_coeff_pil', [0.05, 0.109, 0.2, 0.3].map((v) => ({ belt_coeff_pil: v }))],
    ['pulley_surface_type', [{ pulley_surface_type: 'Plain' as unknown as SliderbedInputs['pulley_surface_type'] }, { pulley_surface_type: 'Lagged' as unknown as SliderbedInputs['pulley_surface_type'] }]],
    ['starting_belt_pull_lb', [0, 75, 500, 2000].map((v) => ({ starting_belt_pull_lb: v }))],
  ];
  for (const [name, vals] of sweeps) vals.forEach((o, k) => add(`${name}[${k}]`, o));

  // Targeted interaction combos
  for (const bt of ['slider_bed', 'roller_bed']) {
    for (const spd of [30, 100, 200]) {
      for (const w of [12, 36]) add(`bed=${bt}×spd=${spd}×w=${w}`, { bed_type: bt, belt_speed_fpm: spd, belt_width_in: w });
    }
  }
  for (const inc of [0, 12]) {
    for (const pw of [5, 50]) {
      for (const len of [120, 360]) add(`inc=${inc}×wt=${pw}×len=${len}`, { conveyor_incline_deg: inc, part_weight_lbs: pw, conveyor_length_cc_in: len });
    }
  }
  // V-guided tracking with a range of profiles
  for (const prof of ['K6', 'K8', 'K10', 'K13', 'K15', 'K17', 'K30']) {
    add(`vguide=${prof}`, { belt_tracking_method: 'V-guided', v_guide_profile: prof as unknown as SliderbedInputs['v_guide_profile'], drive_pulley_diameter_in: 6, tail_pulley_diameter_in: 6 });
  }
  // Gearmotor mounting (bottom mount adds sprocket chain stage)
  for (const gm of [18, 24]) {
    for (const ds of [18, 30]) add(`bottommount gm=${gm} ds=${ds}`, { gearmotor_mounting_style: 'bottom_mount' as unknown as SliderbedInputs['gearmotor_mounting_style'], gm_sprocket_teeth: gm, drive_shaft_sprocket_teeth: ds });
  }
  // speed_mode = drive_rpm path
  for (const rpm of [50, 100, 200]) add(`drive_rpm mode ${rpm}`, { speed_mode: 'drive_rpm' as unknown as SliderbedInputs['speed_mode'], drive_rpm_input: rpm });
  // frame height modes
  for (const fm of ['Standard', 'Low Profile']) add(`frame=${fm}`, { frame_height_mode: fm as unknown as SliderbedInputs['frame_height_mode'] });
  // throughput target present
  for (const tp of [500, 5000, 50000]) add(`throughput target ${tp}`, { required_throughput_pph: tp, throughput_margin_pct: 10 });

  // geometry modes beyond L_ANGLE (H_ANGLE run+incline, H_TOB tobs, H_RISE rise)
  for (const run of [100, 200, 300]) {
    for (const inc of [0, 10]) add(`H_ANGLE run=${run} inc=${inc}`, { geometry_mode: 'H_ANGLE' as unknown as SliderbedInputs['geometry_mode'], horizontal_run_in: run, conveyor_incline_deg: inc });
  }
  for (const tob of [[24, 24], [24, 36], [32, 48]] as Array<[number, number]>) {
    add(`H_TOB tail=${tob[0]} drive=${tob[1]}`, { geometry_mode: 'H_TOB' as unknown as SliderbedInputs['geometry_mode'], reference_end: 'tail' as unknown as SliderbedInputs['reference_end'], tail_tob_in: tob[0], drive_tob_in: tob[1], horizontal_run_in: 120 });
  }
  for (const rise of [0, 12, 24, 36]) add(`H_RISE rise=${rise}`, { geometry_mode: 'H_RISE' as unknown as SliderbedInputs['geometry_mode'], input_rise_in: rise, horizontal_run_in: 180 });

  // tracking × pulley diameter
  for (const trk of ['Crowned', 'V-guided']) {
    for (const pd of [4, 6, 8]) add(`trk=${trk}×pd=${pd}`, { belt_tracking_method: trk, ...(trk === 'V-guided' ? { v_guide_profile: 'K13' as unknown as SliderbedInputs['v_guide_profile'] } : {}), drive_pulley_diameter_in: pd, tail_pulley_diameter_in: pd });
  }

  // cleated PARTS variations (height × spacing × centers)
  for (const ch of [1, 2]) {
    for (const cs of [6, 12]) {
      for (const cc of [12, 6] as Array<12 | 6>) add(`cleated h=${ch} sp=${cs} cc=${cc}`, { cleats_enabled: true, cleat_height_in: ch, cleat_spacing_in: cs, cleat_edge_offset_in: 1, cleat_centers_in: cc, drive_pulley_diameter_in: 8, tail_pulley_diameter_in: 8 });
    }
  }

  // feature sweeps (guarding / rails / lacing / direction)
  for (const sr of ['None', 'Left', 'Right', 'Both']) add(`side_rails=${sr}`, { side_rails: sr as unknown as SliderbedInputs['side_rails'] });
  for (const eg of ['None', 'Head end', 'Tail end', 'Both ends']) add(`end_guards=${eg}`, { end_guards: eg as unknown as SliderbedInputs['end_guards'] });
  for (const ls of ['Endless (no lacing)', 'Hidden lacing', 'Clipper lacing']) add(`lacing=${ls}`, { lacing_style: ls as unknown as SliderbedInputs['lacing_style'], ...(ls !== 'Endless (no lacing)' ? { lacing_material: 'Carbon steel' as unknown as SliderbedInputs['lacing_material'] } : {}) });
  for (const dm of ['One direction', 'Reversing']) add(`direction=${dm}`, { direction_mode: dm as unknown as SliderbedInputs['direction_mode'] });
  for (const dl of ['Head', 'Tail', 'Center']) add(`drive_location=${dl}`, { drive_location: dl as unknown as SliderbedInputs['drive_location'] });
  add('finger safe + bottom covers', { finger_safe: true, bottom_covers: false, end_guards: 'None' as unknown as SliderbedInputs['end_guards'] });

  // orientation × part dims
  for (const or of ['Lengthwise', 'Crosswise']) {
    for (const pl of [6, 18]) add(`orient=${or} len=${pl}`, { orientation: or as unknown as SliderbedInputs['orientation'], part_length_in: pl, part_width_in: 6 });
  }

  // bed_type × incline (retention interactions)
  for (const bt of ['slider_bed', 'roller_bed']) {
    for (const inc of [0, 10, 15]) add(`bed=${bt}×inc=${inc}`, { bed_type: bt, conveyor_incline_deg: inc });
  }

  // pulley diameter pairs (drive != tail)
  for (const [d, t] of [[6, 4], [8, 4], [10, 6], [4, 6]] as Array<[number, number]>) {
    add(`pulley drive=${d} tail=${t}`, { drive_pulley_diameter_in: d, tail_pulley_diameter_in: t });
  }

  return out;
}

// ------------------------------------------------------------------
// GRID (BULK) — the just-harvested v1.49 feature; systematic
// ------------------------------------------------------------------
function bulkGrid(): CaseDef[] {
  const out: CaseDef[] = [];
  let i = 0;
  const add = (desc: string, o: Ov) => out.push({ id: `belt-grid-bulk-${pad(i++)}`, category: 'grid', description: `BULK grid: ${desc}`, inputs: bulk(o) });

  // Non-cleated cross-section: shape × width × fill × flow
  for (const shape of ['FLAT', 'DOMED']) {
    for (const w of [12, 24, 36]) {
      for (const fh of [1, 3, 6]) {
        for (const mf of [500, 5000, 20000]) {
          add(`noncleat shape=${shape} w=${w} fill=${fh} mass=${mf}`, { pile_shape: shape as unknown as SliderbedInputs['pile_shape'], belt_width_in: w, max_fill_height_in: fh, bulk_input_method: 'WEIGHT_FLOW', mass_flow_lbs_per_hr: mf, cleats_enabled: false });
        }
      }
    }
  }
  // Volume-flow input path × density
  for (const vf of [50, 200]) {
    for (const dens of [30, 75, 120]) {
      for (const src of ['KNOWN', 'ASSUMED_CLASS']) {
        add(`volflow vf=${vf} dens=${dens} src=${src}`, { bulk_input_method: 'VOLUME_FLOW', volume_flow_ft3_per_hr: vf, density_lbs_per_ft3: dens, density_source: src as unknown as SliderbedInputs['density_source'] });
      }
    }
  }
  // Cleated pocket: shape × cleat height × spacing × mass
  for (const shape of ['FLAT', 'DOMED']) {
    for (const ch of [1, 2, 3]) {
      for (const cs of [6, 12, 24]) {
        add(`cleated shape=${shape} h=${ch} sp=${cs}`, { pile_shape: shape as unknown as SliderbedInputs['pile_shape'], cleats_enabled: true, cleat_height_in: ch, cleat_spacing_in: cs, cleat_edge_offset_in: 1, belt_width_in: 32, mass_flow_lbs_per_hr: 7000, density_lbs_per_ft3: 10, bulk_input_method: 'WEIGHT_FLOW' });
      }
    }
  }
  // Feed behavior / surge
  for (const fb of ['CONTINUOUS', 'INTERMITTENT', 'SURGE']) {
    for (const sm of [1.5, 2.0, 3.0]) add(`feed=${fb} surge=${sm}`, { feed_behavior: fb as unknown as SliderbedInputs['feed_behavior'], surge_multiplier: sm });
  }
  // Non-cleated density sweep (density drives lb/ft capacity)
  for (const dens of [20, 50, 90, 150]) {
    for (const w of [18, 48]) add(`noncleat dens=${dens} w=${w}`, { density_lbs_per_ft3: dens, belt_width_in: w, max_fill_height_in: 4, mass_flow_lbs_per_hr: 8000 });
  }
  // Speed sweep in bulk (belt speed drives per-ft loading)
  for (const spd of [20, 60, 150, 250]) add(`bulk speed=${spd}`, { belt_speed_fpm: spd, mass_flow_lbs_per_hr: 6000, max_fill_height_in: 3 });
  // Cleated edge-offset variations
  for (const off of [0, 1, 3]) add(`cleated offset=${off}`, { cleats_enabled: true, cleat_height_in: 2, cleat_spacing_in: 12, cleat_edge_offset_in: off, belt_width_in: 24, mass_flow_lbs_per_hr: 4000, density_lbs_per_ft3: 30 });
  // Volume-flow width sweep
  for (const w of [12, 24, 36]) add(`volflow w=${w}`, { bulk_input_method: 'VOLUME_FLOW', volume_flow_ft3_per_hr: 120, density_lbs_per_ft3: 60, density_source: 'KNOWN', belt_width_in: w, max_fill_height_in: 4 });
  return out;
}

// ------------------------------------------------------------------
// EDGE — boundaries and nullable-output triggers (still success or benign)
// ------------------------------------------------------------------
function edgeCases(): CaseDef[] {
  const out: CaseDef[] = [];
  let i = 0;
  const addP = (desc: string, o: Ov) => out.push({ id: `belt-edge-${pad(i++)}`, category: 'edge', description: `Edge: ${desc}`, inputs: parts(o) });
  const addB = (desc: string, o: Ov) => out.push({ id: `belt-edge-${pad(i++)}`, category: 'edge', description: `Edge: ${desc}`, inputs: bulk(o) });

  addP('min friction 0.05', { friction_coeff: 0.05 });
  addP('max friction 0.6', { friction_coeff: 0.6 });
  addP('min safety 1.0', { safety_factor: 1.0 });
  addP('max safety 5.0', { safety_factor: 5.0 });
  addP('min piw/pil 0.05', { belt_coeff_piw: 0.05, belt_coeff_pil: 0.05 });
  addP('max piw/pil 0.30', { belt_coeff_piw: 0.3, belt_coeff_pil: 0.3 });
  addP('min motor rpm 800', { motor_rpm: 800 });
  addP('max motor rpm 3600', { motor_rpm: 3600 });
  addP('tiny belt width 4', { belt_width_in: 4 });
  addP('incline exactly 20', { conveyor_incline_deg: 20 });
  addP('incline exactly 35', { conveyor_incline_deg: 35 });
  addP('incline exactly 45', { conveyor_incline_deg: 45 });
  addP('belt speed exactly 300', { belt_speed_fpm: 300 });
  addP('belt speed exactly 301', { belt_speed_fpm: 301 });
  addP('drop height exactly 24', { drop_height_in: 24 });
  addP('length exactly 120', { conveyor_length_cc_in: 120 });
  addP('length 121 (multisection)', { conveyor_length_cc_in: 121 });
  addP('drive pulley exactly 2.5', { drive_pulley_diameter_in: 2.5, tail_pulley_diameter_in: 2.5 });
  addB('bulk near-capacity (~95% fill)', { belt_width_in: 12, max_fill_height_in: 1, mass_flow_lbs_per_hr: 5000, density_lbs_per_ft3: 60, belt_speed_fpm: 100 });
  addB('bulk assumed-class density', { bulk_input_method: 'VOLUME_FLOW', volume_flow_ft3_per_hr: 100, density_lbs_per_ft3: 50, density_source: 'ASSUMED_CLASS' });
  addB('bulk weight-flow no density', { bulk_input_method: 'WEIGHT_FLOW', mass_flow_lbs_per_hr: 5000, density_lbs_per_ft3: undefined as unknown as number });
  addB('bulk DOMED shape', { pile_shape: 'DOMED' });
  return out;
}

// ------------------------------------------------------------------
// FAILURE — expected errors (success:false). Numerics non-authoritative.
// ------------------------------------------------------------------
function failureCases(): CaseDef[] {
  const out: CaseDef[] = [];
  let i = 0;
  const add = (desc: string, inputs: SliderbedInputs) => out.push({ id: `belt-failure-${pad(i++)}`, category: 'failure', description: `Failure: ${desc}`, inputs });

  add('no material_form', { ...partsBaseline(), material_form: undefined as unknown as SliderbedInputs['material_form'] });
  add('parts weight zero', parts({ part_weight_lbs: 0 }));
  add('parts length zero', parts({ part_length_in: 0 }));
  add('parts width zero', parts({ part_width_in: 0 }));
  add('drop height negative', parts({ drop_height_in: -1 }));
  add('belt width zero', parts({ belt_width_in: 0 }));
  add('length zero', parts({ conveyor_length_cc_in: 0 }));
  add('drive pulley below 2.5', parts({ drive_pulley_diameter_in: 2, tail_pulley_diameter_in: 2 }));
  add('belt speed zero', parts({ belt_speed_fpm: 0 }));
  add('safety factor over 5', parts({ safety_factor: 6 }));
  add('friction over 0.6', parts({ friction_coeff: 0.9 }));
  add('piw out of range', parts({ belt_coeff_piw: 0.5 }));
  add('motor rpm too low', parts({ motor_rpm: 500 }));
  add('incline over 45 (block)', parts({ conveyor_incline_deg: 50 }));
  add('red hot parts', parts({ part_temperature_class: 'Red Hot' as unknown as SliderbedInputs['part_temperature_class'] }));
  add('heavy sideload crowned', parts({ side_loading_direction: 'Left' as unknown as SliderbedInputs['side_loading_direction'], side_loading_severity: 'Heavy' as unknown as SliderbedInputs['side_loading_severity'], belt_tracking_method: 'Crowned' }));
  add('lowprofile with cleats', parts({ frame_height_mode: 'Low Profile' as unknown as SliderbedInputs['frame_height_mode'], cleats_enabled: true, cleat_height_in: 2, cleat_spacing_in: 12, cleat_edge_offset_in: 1 }));
  add('bulk no input method', bulk({ bulk_input_method: undefined as unknown as SliderbedInputs['bulk_input_method'] }));
  add('bulk weight-flow zero mass', bulk({ bulk_input_method: 'WEIGHT_FLOW', mass_flow_lbs_per_hr: 0 }));
  add('bulk volume-flow zero volume', bulk({ bulk_input_method: 'VOLUME_FLOW', volume_flow_ft3_per_hr: 0, density_lbs_per_ft3: 50, density_source: 'KNOWN' }));
  add('bulk volume-flow zero density', bulk({ bulk_input_method: 'VOLUME_FLOW', volume_flow_ft3_per_hr: 100, density_lbs_per_ft3: 0 }));
  add('bulk cleated missing geometry', bulk({ cleats_enabled: true, cleat_height_in: undefined as unknown as number, cleat_spacing_in: undefined as unknown as number }));
  add('bulk overfill (>100%)', bulk({ belt_width_in: 6, max_fill_height_in: 0.5, mass_flow_lbs_per_hr: 40000, density_lbs_per_ft3: 80, belt_speed_fpm: 40 }));
  add('bulk belt too narrow', bulk({ belt_width_in: 2 }));
  add('required throughput negative', parts({ required_throughput_pph: -5 }));
  return out;
}

export function buildCases(): CaseDef[] {
  const all = [...fixtureCases(), ...partsGrid(), ...bulkGrid(), ...edgeCases(), ...failureCases()];
  // Determinism: stable order = category rank, then id.
  const rank: Record<Category, number> = { fixture: 0, grid: 1, edge: 2, failure: 3 };
  return all.sort((a, b) => rank[a.category] - rank[b.category] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

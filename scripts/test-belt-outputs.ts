/**
 * Test script to verify belt output components alignment with product registry
 * Run with: npx tsx scripts/test-belt-outputs.ts
 */

import { getProduct, canRenderCard, hasOutputKey } from '../src/products';

console.log('=== Belt Output Components Test ===\n');

const belt = getProduct('belt_conveyor_v1');
const magnetic = getProduct('magnetic_conveyor_v1');

if (!belt || !magnetic) {
  console.error('Products not registered');
  process.exit(1);
}

console.log(`Belt outputs: ${belt.outputsSchema.length} fields`);
console.log(`Magnetic outputs: ${magnetic.outputsSchema.length} fields\n`);

// Belt-specific keys used by BeltOutputsTabs components
const beltDisplayKeys = [
  // Tensions
  'drive_T1_lbf',
  'drive_T2_lbf',
  'total_belt_pull_lb',
  'friction_pull_lb',
  'incline_pull_lb',
  'starting_belt_pull_lb',
  // Drive
  'torque_drive_shaft_inlbf',
  'drive_shaft_rpm',
  'gear_ratio',
  'chain_ratio',
  'gearmotor_output_rpm',
  'motor_rpm_used',
  // Pulleys
  'drive_pulley_diameter_in',
  'tail_pulley_diameter_in',
  'pulley_face_length_in',
  'pulley_requires_crown',
  'drive_pulley_resultant_load_lbf',
  'tail_pulley_resultant_load_lbf',
  // Shafts
  'drive_shaft_diameter_in',
  'tail_shaft_diameter_in',
  // Belt
  'total_belt_length_in',
  'belt_weight_lbf',
  'belt_speed_fpm',
  'is_v_guided',
  // Loads
  'total_load_lbf',
  'load_on_belt_lbf',
  'parts_on_belt',
  // Throughput
  'capacity_pph',
  'target_pph',
  'meets_throughput',
  'throughput_margin_achieved_pct',
  // Parameters
  'safety_factor_used',
  'friction_coeff_used',
  'piw_used',
  'pil_used',
  // PCI Stress
  'pci_drive_tube_stress_psi',
  'pci_tail_tube_stress_psi',
  'pci_tube_stress_status',
];

// Magnetic-specific keys that belt outputs should NOT use
const magneticOnlyKeys = [
  'qty_magnets',
  'magnet_weight_each_lb',
  'total_magnet_weight_lb',
  'chain_length_in',
  'total_torque_in_lb',
  'running_torque_in_lb',
  'throughput_margin',
  'achieved_throughput_lbs_hr',
];

console.log('--- Belt Output Keys Used by Components (should exist in schema) ---');
let beltPass = true;
beltDisplayKeys.forEach(key => {
  const exists = hasOutputKey('belt_conveyor_v1', key);
  const icon = exists ? '✓' : '✗';
  console.log(`  ${icon} ${key}: ${exists ? 'present' : 'MISSING'}`);
  if (!exists) beltPass = false;
});

console.log('\n--- Magnetic Keys (should NOT be in belt schema) ---');
let isolationPass = true;
magneticOnlyKeys.forEach(key => {
  const exists = hasOutputKey('belt_conveyor_v1', key);
  const icon = exists ? '✗' : '✓';
  console.log(`  ${icon} ${key}: ${exists ? 'PRESENT (BAD!)' : 'absent (good)'}`);
  if (exists) isolationPass = false;
});

console.log('\n--- Cross-Product Card Rendering ---');
const cardTests = [
  { product: 'belt_conveyor_v1', keys: ['drive_T1_lbf', 'drive_T2_lbf'], expect: true, desc: 'tensions on belt' },
  { product: 'belt_conveyor_v1', keys: ['drive_pulley_diameter_in'], expect: true, desc: 'pulleys on belt' },
  { product: 'belt_conveyor_v1', keys: ['torque_drive_shaft_inlbf'], expect: true, desc: 'drive torque on belt' },
  { product: 'belt_conveyor_v1', keys: ['qty_magnets'], expect: false, desc: 'magnets on belt' },
  { product: 'belt_conveyor_v1', keys: ['chain_length_in'], expect: false, desc: 'chain on belt' },
  { product: 'magnetic_conveyor_v1', keys: ['total_torque_in_lb'], expect: true, desc: 'torque on magnetic' },
  { product: 'magnetic_conveyor_v1', keys: ['qty_magnets'], expect: true, desc: 'magnets on magnetic' },
  { product: 'magnetic_conveyor_v1', keys: ['drive_T1_lbf'], expect: false, desc: 'T1 on magnetic' },
  { product: 'magnetic_conveyor_v1', keys: ['drive_pulley_diameter_in'], expect: false, desc: 'pulleys on magnetic' },
];

let cardPass = true;
cardTests.forEach(({ product, keys, expect, desc }) => {
  const result = canRenderCard(product, keys);
  const ok = result === expect;
  const icon = ok ? '✓' : '✗';
  console.log(`  ${icon} ${desc}: canRenderCard('${product}', [${keys.join(', ')}]) = ${result} (expected ${expect})`);
  if (!ok) cardPass = false;
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('RESULTS');
console.log('='.repeat(60));

const results = [
  { name: 'Belt display keys exist', pass: beltPass },
  { name: 'Product isolation', pass: isolationPass },
  { name: 'Card rendering', pass: cardPass },
];

results.forEach(({ name, pass }) => {
  console.log(`${pass ? '✅' : '❌'} ${name}: ${pass ? 'PASS' : 'FAIL'}`);
});

const allPass = results.every(r => r.pass);
const passCount = results.filter(r => r.pass).length;

console.log('\n' + '='.repeat(60));
console.log(`Total: ${passCount}/${results.length} tests passed`);
console.log(allPass ? '✅ ALL TESTS PASS' : '❌ SOME TESTS FAILED');
console.log('='.repeat(60));

process.exit(allPass ? 0 : 1);

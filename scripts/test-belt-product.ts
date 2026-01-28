/**
 * Test script to verify belt conveyor product registration
 * Run with: npx tsx scripts/test-belt-product.ts
 */

import { getProduct, canRenderCard, getProductKeys, hasOutputKey } from '../src/products';

console.log('=== Belt Conveyor Product Tests ===\n');

// Test 1: Both products registered
const keys = getProductKeys();
console.log('Registered products:', keys.join(', '));

if (!keys.includes('belt_conveyor_v1')) {
  console.error('✗ FAIL: belt_conveyor_v1 not registered');
  process.exit(1);
}
if (!keys.includes('magnetic_conveyor_v1')) {
  console.error('✗ FAIL: magnetic_conveyor_v1 not registered');
  process.exit(1);
}
console.log('✓ Both products registered\n');

// Get output keys from schemas
const belt = getProduct('belt_conveyor_v1')!;
const magnetic = getProduct('magnetic_conveyor_v1')!;

const beltOutputKeys = new Set(belt.outputsSchema.map(f => f.key));
const magneticOutputKeys = new Set(magnetic.outputsSchema.map(f => f.key));

console.log(`Belt outputs: ${beltOutputKeys.size} fields`);
console.log(`Magnetic outputs: ${magneticOutputKeys.size} fields\n`);

// Test 2: Belt has belt-specific keys
const beltSpecificKeys = [
  'drive_T1_lbf',
  'drive_T2_lbf',
  'drive_pulley_diameter_in',
  'tail_pulley_diameter_in',
  'pulley_face_length_in',
  'torque_drive_shaft_inlbf',
  'total_belt_length_in',
  'total_belt_pull_lb',
  'friction_pull_lb',
  'incline_pull_lb',
  'parts_on_belt',
  'capacity_pph',
  'belt_weight_lbf',
];

console.log('--- Belt Output Keys (should be PRESENT) ---');
let beltPass = true;
beltSpecificKeys.forEach(key => {
  const exists = beltOutputKeys.has(key);
  console.log(`  ${exists ? '✓' : '✗'} ${key}: ${exists ? 'present' : 'MISSING'}`);
  if (!exists) beltPass = false;
});

// Test 3: Belt does NOT have magnetic keys
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

console.log('\n--- Magnetic Keys on Belt (should be ABSENT) ---');
let magneticAbsentFromBelt = true;
magneticOnlyKeys.forEach(key => {
  const exists = beltOutputKeys.has(key);
  console.log(`  ${exists ? '✗' : '✓'} ${key}: ${exists ? 'PRESENT (BAD!)' : 'absent (good)'}`);
  if (exists) magneticAbsentFromBelt = false;
});

// Test 4: Magnetic does NOT have belt keys (reverse check)
const beltOnlyKeys = [
  'drive_T1_lbf',
  'drive_T2_lbf',
  'drive_pulley_diameter_in',
  'pulley_face_length_in',
  'pulley_requires_crown',
  'pci_drive_tube_stress_psi',
];

console.log('\n--- Belt Keys on Magnetic (should be ABSENT) ---');
let beltAbsentFromMagnetic = true;
beltOnlyKeys.forEach(key => {
  const exists = magneticOutputKeys.has(key);
  console.log(`  ${exists ? '✗' : '✓'} ${key}: ${exists ? 'PRESENT (BAD!)' : 'absent (good)'}`);
  if (exists) beltAbsentFromMagnetic = false;
});

// Test 5: hasOutputKey function
console.log('\n--- hasOutputKey Function ---');
const hasKeyTests = [
  { product: 'belt_conveyor_v1', key: 'drive_T1_lbf', expect: true },
  { product: 'belt_conveyor_v1', key: 'qty_magnets', expect: false },
  { product: 'magnetic_conveyor_v1', key: 'qty_magnets', expect: true },
  { product: 'magnetic_conveyor_v1', key: 'drive_T1_lbf', expect: false },
];

let hasKeyPass = true;
hasKeyTests.forEach(({ product, key, expect }) => {
  const result = hasOutputKey(product, key);
  const ok = result === expect;
  console.log(`  ${ok ? '✓' : '✗'} hasOutputKey('${product}', '${key}') = ${result} (expected ${expect})`);
  if (!ok) hasKeyPass = false;
});

// Test 6: Cross-product isolation via canRenderCard
console.log('\n--- canRenderCard (Cross-Product Isolation) ---');
const isolationTests = [
  { product: 'belt_conveyor_v1', keys: ['drive_T1_lbf'], expect: true, desc: 'belt key on belt' },
  { product: 'belt_conveyor_v1', keys: ['drive_pulley_diameter_in', 'tail_pulley_diameter_in'], expect: true, desc: 'pulley keys on belt' },
  { product: 'belt_conveyor_v1', keys: ['qty_magnets'], expect: false, desc: 'magnetic key on belt' },
  { product: 'belt_conveyor_v1', keys: ['drive_T1_lbf', 'qty_magnets'], expect: false, desc: 'mixed keys on belt' },
  { product: 'magnetic_conveyor_v1', keys: ['qty_magnets'], expect: true, desc: 'magnetic key on magnetic' },
  { product: 'magnetic_conveyor_v1', keys: ['total_torque_in_lb', 'chain_length_in'], expect: true, desc: 'magnetic keys on magnetic' },
  { product: 'magnetic_conveyor_v1', keys: ['drive_T1_lbf'], expect: false, desc: 'belt key on magnetic' },
  { product: 'magnetic_conveyor_v1', keys: ['qty_magnets', 'drive_T1_lbf'], expect: false, desc: 'mixed keys on magnetic' },
];

let isolationPass = true;
isolationTests.forEach(({ product, keys, expect, desc }) => {
  const result = canRenderCard(product, keys);
  const ok = result === expect;
  console.log(`  ${ok ? '✓' : '✗'} ${desc}: canRenderCard(..., [${keys.join(', ')}]) = ${result} (expected ${expect})`);
  if (!ok) isolationPass = false;
});

// Test 7: Calculate function works
console.log('\n--- Calculate Function ---');
const testInputs = belt.getDefaultInputs();
const outputs = belt.calculate(testInputs);
let calcPass = true;

// Check outputs that should always be present (non-nullable)
const alwaysPresentOutputs = ['drive_shaft_rpm', 'total_belt_length_in', 'belt_speed_fpm', 'parts_on_belt'];
alwaysPresentOutputs.forEach(key => {
  const value = (outputs as Record<string, unknown>)[key];
  const hasValue = value !== undefined && value !== null;
  console.log(`  ${hasValue ? '✓' : '✗'} ${key} = ${hasValue ? value : 'MISSING'}`);
  if (!hasValue) calcPass = false;
});

// Some outputs may be null when no belt is selected - that's OK
const nullableOutputs = ['torque_drive_shaft_inlbf', 'belt_weight_lbf', 'total_load_lbf'];
console.log('  (Nullable outputs - may be null when no belt selected:)');
nullableOutputs.forEach(key => {
  const value = (outputs as Record<string, unknown>)[key];
  const status = value !== undefined ? (value !== null ? `${value}` : 'null (no belt)') : 'undefined';
  console.log(`    ${key} = ${status}`);
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('RESULTS');
console.log('='.repeat(60));

const results = [
  { name: 'Belt-specific keys present', pass: beltPass },
  { name: 'Magnetic keys absent from belt', pass: magneticAbsentFromBelt },
  { name: 'Belt keys absent from magnetic', pass: beltAbsentFromMagnetic },
  { name: 'hasOutputKey function', pass: hasKeyPass },
  { name: 'Cross-product isolation', pass: isolationPass },
  { name: 'Calculate function', pass: calcPass },
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

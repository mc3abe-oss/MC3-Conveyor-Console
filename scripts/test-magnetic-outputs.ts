/**
 * Test script to verify magnetic conveyor outputs
 * Run with: npx tsx scripts/test-magnetic-outputs.ts
 */

import { getProduct, canRenderCard, hasOutputKey } from '../src/products';

console.log('=== Magnetic Conveyor Output Tests ===\n');

// Test 1: Product is registered
const product = getProduct('magnetic_conveyor_v1');
if (!product) {
  console.error('✗ FAIL: magnetic_conveyor_v1 not registered');
  process.exit(1);
}
console.log('✓ Product registered:', product.name);

// Get output keys from the schema
const outputKeys = new Set(product.outputsSchema.map(f => f.key));

// Test 2: Output schema has magnetic keys
const magneticKeys = [
  'total_torque_in_lb',
  'running_torque_in_lb',
  'qty_magnets',
  'magnet_weight_each_lb',
  'total_magnet_weight_lb',
  'chain_length_in',
  'throughput_margin',
  'achieved_throughput_lbs_hr',
  'belt_pull_friction_lb',
  'belt_pull_gravity_lb',
  'total_belt_pull_lb',
  'required_rpm',
  'suggested_gear_ratio',
  'path_length_ft',
  'belt_length_ft',
  'incline_length_in',
  'incline_run_in',
  'horizontal_length_in',
  'weight_per_foot_lb',
  'chip_load_lb',
  'total_load_lb',
  'coefficient_of_friction_used',
  'safety_factor_used',
  'starting_belt_pull_lb_used',
  'chain_weight_lb_per_ft_used',
];

console.log('\n--- Magnetic Output Keys (should be PRESENT) ---');
let magneticPass = true;
magneticKeys.forEach(key => {
  const exists = outputKeys.has(key);
  const icon = exists ? '✓' : '✗';
  console.log(`  ${icon} ${key}: ${exists ? 'present' : 'MISSING'}`);
  if (!exists) magneticPass = false;
});

// Test 3: Output schema does NOT have belt keys
const beltKeys = [
  'effective_tension_lbf',
  'wrap_angle_deg',
  'required_power_hp',
  'tight_side_tension_lbf',
  'slack_side_tension_lbf',
  'pulley_diameter_in',
  'belt_width_in',
  'motor_hp',
  'gearbox_ratio',
  'drive_efficiency',
];

console.log('\n--- Belt Keys (should be ABSENT) ---');
let beltPass = true;
beltKeys.forEach(key => {
  const exists = outputKeys.has(key);
  const icon = exists ? '✗' : '✓';
  console.log(`  ${icon} ${key}: ${exists ? 'PRESENT (BAD!)' : 'absent (good)'}`);
  if (exists) beltPass = false;
});

// Test 4: hasOutputKey works correctly
console.log('\n--- hasOutputKey Function ---');
const hasKeyTests = [
  { key: 'total_torque_in_lb', expect: true },
  { key: 'qty_magnets', expect: true },
  { key: 'chain_length_in', expect: true },
  { key: 'effective_tension_lbf', expect: false },
  { key: 'wrap_angle_deg', expect: false },
  { key: 'required_power_hp', expect: false },
];

let hasKeyPass = true;
hasKeyTests.forEach(({ key, expect }) => {
  const result = hasOutputKey('magnetic_conveyor_v1', key);
  const ok = result === expect;
  const icon = ok ? '✓' : '✗';
  console.log(`  ${icon} hasOutputKey('${key}') = ${result} (expected ${expect})`);
  if (!ok) hasKeyPass = false;
});

// Test 5: canRenderCard works correctly (fail-closed gate)
console.log('\n--- canRenderCard (Fail-Closed Gate) ---');
const gateTests = [
  { keys: ['total_torque_in_lb'], expect: true, desc: 'single magnetic key' },
  { keys: ['qty_magnets', 'chain_length_in'], expect: true, desc: 'multiple magnetic keys' },
  { keys: ['total_torque_in_lb', 'qty_magnets', 'belt_length_ft'], expect: true, desc: 'all magnetic keys' },
  { keys: ['effective_tension_lbf'], expect: false, desc: 'single belt key' },
  { keys: ['wrap_angle_deg', 'pulley_diameter_in'], expect: false, desc: 'multiple belt keys' },
  { keys: ['total_torque_in_lb', 'effective_tension_lbf'], expect: false, desc: 'mixed keys (should fail)' },
  { keys: [], expect: true, desc: 'empty keys (edge case)' },
];

let gatePass = true;
gateTests.forEach(({ keys, expect, desc }) => {
  const result = canRenderCard('magnetic_conveyor_v1', keys);
  const ok = result === expect;
  const icon = ok ? '✓' : '✗';
  console.log(`  ${icon} ${desc}: canRenderCard([${keys.join(', ')}]) = ${result} (expected ${expect})`);
  if (!ok) gatePass = false;
});

// Test 6: UI config has correct tabs
console.log('\n--- UI Tabs ---');
const expectedTabs = ['summary', 'geometry', 'magnets', 'loads', 'drive', 'issues'];
const actualTabs = product.ui.tabs.map(t => t.id);
let tabsPass = true;
expectedTabs.forEach(tab => {
  const exists = actualTabs.includes(tab);
  const icon = exists ? '✓' : '✗';
  console.log(`  ${icon} ${tab}: ${exists ? 'present' : 'MISSING'}`);
  if (!exists) tabsPass = false;
});

// Test 7: UI cards have correct required keys
console.log('\n--- UI Cards Required Keys ---');
const cardsWithBeltKeys = product.ui.cards.filter(card => {
  return card.requiresOutputKeys.some(key => beltKeys.includes(key));
});
let cardsPass = cardsWithBeltKeys.length === 0;
if (cardsPass) {
  console.log('  ✓ No cards require belt-specific keys');
} else {
  console.log('  ✗ Cards with belt keys found:');
  cardsWithBeltKeys.forEach(card => {
    console.log(`    - ${card.id}: requires [${card.requiresOutputKeys.join(', ')}]`);
  });
}

// Test 8: Calculate function works
console.log('\n--- Calculate Function ---');
const testInputs = product.getDefaultInputs();
const outputs = product.calculate(testInputs);
let calcPass = true;

// Check that outputs have expected magnetic fields
const outputsObj = outputs as Record<string, unknown>;
const criticalOutputs = ['total_torque_in_lb', 'qty_magnets', 'belt_length_ft', 'throughput_margin'];
criticalOutputs.forEach(key => {
  const value = outputsObj[key];
  const hasValue = value !== undefined && value !== null;
  const icon = hasValue ? '✓' : '✗';
  console.log(`  ${icon} ${key} = ${hasValue ? value : 'MISSING'}`);
  if (!hasValue) calcPass = false;
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('RESULTS');
console.log('='.repeat(50));

const results = [
  { name: 'Magnetic keys present', pass: magneticPass },
  { name: 'Belt keys absent', pass: beltPass },
  { name: 'hasOutputKey function', pass: hasKeyPass },
  { name: 'Fail-closed gate', pass: gatePass },
  { name: 'UI tabs correct', pass: tabsPass },
  { name: 'UI cards clean', pass: cardsPass },
  { name: 'Calculate function', pass: calcPass },
];

results.forEach(({ name, pass }) => {
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${name}: ${pass ? 'PASS' : 'FAIL'}`);
});

const allPass = results.every(r => r.pass);
const passCount = results.filter(r => r.pass).length;

console.log('\n' + '='.repeat(50));
console.log(`Total: ${passCount}/${results.length} tests passed`);
console.log(allPass ? '✅ ALL TESTS PASS' : '❌ SOME TESTS FAILED');
console.log('='.repeat(50));

process.exit(allPass ? 0 : 1);

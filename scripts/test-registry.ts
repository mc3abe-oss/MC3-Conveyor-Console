import { getProduct, canRenderCard, getProductKeys } from '../src/products';

console.log('=== Product Registry Test ===\n');

// What's registered
console.log('Registered products:', getProductKeys());

// Magnetic product details
const magnetic = getProduct('magnetic_conveyor_v1');
if (magnetic) {
  console.log('\nMagnetic Conveyor:');
  console.log('  Name:', magnetic.name);
  console.log('  Version:', magnetic.version);
  console.log('  Output keys:', magnetic.outputsSchema.length);
  console.log('  Tabs:', magnetic.ui.tabs.map(t => t.id).join(', '));
}

// Fail-closed tests
console.log('\n=== Fail-Closed Gate Tests ===');
const tests = [
  // Magnetic keys - should PASS (return true)
  { product: 'magnetic_conveyor_v1', keys: ['total_torque_in_lb'], expect: true, desc: 'magnetic drive key' },
  { product: 'magnetic_conveyor_v1', keys: ['qty_magnets'], expect: true, desc: 'magnetic magnet key' },
  { product: 'magnetic_conveyor_v1', keys: ['chain_length_in'], expect: true, desc: 'magnetic geometry key' },
  { product: 'magnetic_conveyor_v1', keys: ['throughput_margin'], expect: true, desc: 'magnetic throughput key' },
  { product: 'magnetic_conveyor_v1', keys: ['total_torque_in_lb', 'required_rpm'], expect: true, desc: 'multiple magnetic keys' },

  // Belt-only keys - should FAIL (return false) - THIS IS THE CRITICAL TEST
  { product: 'magnetic_conveyor_v1', keys: ['effective_tension_lbf'], expect: false, desc: 'belt tension - MUST BLOCK' },
  { product: 'magnetic_conveyor_v1', keys: ['wrap_angle_deg'], expect: false, desc: 'belt wrap angle - MUST BLOCK' },
  { product: 'magnetic_conveyor_v1', keys: ['tight_side_tension_lbf'], expect: false, desc: 'belt T1 - MUST BLOCK' },
  { product: 'magnetic_conveyor_v1', keys: ['slack_side_tension_lbf'], expect: false, desc: 'belt T2 - MUST BLOCK' },
  { product: 'magnetic_conveyor_v1', keys: ['required_power_hp'], expect: false, desc: 'HP (magnetic uses torque) - MUST BLOCK' },
  { product: 'magnetic_conveyor_v1', keys: ['pulley_diameter_in'], expect: false, desc: 'pulley (magnetic uses sprocket) - MUST BLOCK' },

  // Mixed keys - should FAIL if ANY key is missing
  { product: 'magnetic_conveyor_v1', keys: ['total_torque_in_lb', 'effective_tension_lbf'], expect: false, desc: 'mixed keys - MUST BLOCK' },

  // Unknown product - should FAIL
  { product: 'unknown_product', keys: ['anything'], expect: false, desc: 'unknown product - MUST BLOCK' },
  { product: 'belt_conveyor_v1', keys: ['effective_tension_lbf'], expect: false, desc: 'belt not registered yet - MUST BLOCK' },

  // Empty keys - should PASS (config cards with no data requirements)
  { product: 'magnetic_conveyor_v1', keys: [], expect: true, desc: 'empty keys (config cards)' },
];

let passed = 0;
let failed = 0;

tests.forEach(({ product, keys, expect, desc }) => {
  const result = canRenderCard(product, keys);
  const ok = result === expect;
  if (ok) passed++; else failed++;
  const icon = ok ? '✓' : '✗';
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`  ${icon} ${status}: ${desc}`);
  if (!ok) {
    console.log(`         canRenderCard('${product}', [${keys.join(', ')}]) returned ${result}, expected ${expect}`);
  }
});

console.log(`\n=== Results: ${passed}/${tests.length} passed, ${failed} failed ===`);

if (failed > 0) {
  console.log('\n❌ FAIL-CLOSED GATE IS NOT WORKING CORRECTLY');
  process.exit(1);
} else {
  console.log('\n✅ FAIL-CLOSED GATE IS WORKING - Belt keys blocked on magnetic');
  process.exit(0);
}

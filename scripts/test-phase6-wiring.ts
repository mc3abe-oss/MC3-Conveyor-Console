/**
 * Phase 6 Wiring Verification
 * Run with: npx tsx scripts/test-phase6-wiring.ts
 */

console.log('='.repeat(70));
console.log('PHASE 6 WIRING VERIFICATION');
console.log('='.repeat(70));
console.log('');
console.log('Both belt and magnetic conveyors now use dedicated tabbed output UIs.');
console.log('');
console.log('VERIFICATION STEPS:');
console.log('');
console.log('1. Run the dev server:');
console.log('   npm run dev');
console.log('');
console.log('2. Test BELT CONVEYOR:');
console.log('   - Navigate to: http://localhost:3000/console');
console.log('   - Create or open a belt conveyor application');
console.log('   - Go to Results tab');
console.log('   - Verify NEW tabbed UI appears with tabs:');
console.log('     [Summary] [Tensions] [Belt] [Pulleys] [Drive] [Issues]');
console.log('');
console.log('   Expected in Summary tab:');
console.log('     - Configuration card (bed type, width, length, incline)');
console.log('     - Drive Requirements card (torque, RPM, gear ratio)');
console.log('     - Belt Tensions card (T1, T2, total belt pull)');
console.log('     - Pulleys card (drive/tail diameter, face length)');
console.log('     - Throughput card (capacity, target, margin)');
console.log('');
console.log('   Belt-specific values should appear:');
console.log('     ✓ drive_T1_lbf (Tight Side Tension)');
console.log('     ✓ drive_T2_lbf (Slack Side Tension)');
console.log('     ✓ torque_drive_shaft_inlbf (Drive Torque)');
console.log('     ✓ drive_pulley_diameter_in');
console.log('     ✓ gear_ratio');
console.log('');
console.log('   NO magnetic values should appear:');
console.log('     ✗ qty_magnets');
console.log('     ✗ chain_length_in');
console.log('     ✗ total_torque_in_lb (magnetic style)');
console.log('');
console.log('3. Test MAGNETIC CONVEYOR:');
console.log('   - Navigate to: http://localhost:3000/console/magnetic');
console.log('   - Create or open a magnetic conveyor application');
console.log('   - Go to Results tab');
console.log('   - Verify MAGNETIC tabbed UI appears with tabs:');
console.log('     [Summary] [Geometry] [Magnets] [Loads] [Drive] [Issues]');
console.log('');
console.log('   Magnetic-specific values should appear:');
console.log('     ✓ qty_magnets');
console.log('     ✓ total_torque_in_lb');
console.log('     ✓ chain_length_in');
console.log('     ✓ throughput_margin');
console.log('');
console.log('   NO belt values should appear:');
console.log('     ✗ drive_T1_lbf');
console.log('     ✗ drive_pulley_diameter_in');
console.log('     ✗ PCI tube stress');
console.log('');
console.log('4. Verify PRODUCT ISOLATION:');
console.log('   - Belt calculator shows ONLY belt-specific outputs');
console.log('   - Magnetic calculator shows ONLY magnetic-specific outputs');
console.log('   - Each has its own dedicated tabbed UI');
console.log('');
console.log('='.repeat(70));
console.log('If all checks pass, Phase 6 is complete!');
console.log('='.repeat(70));

// Programmatic verification
import { getProduct, canRenderCard } from '../src/products';

console.log('');
console.log('PROGRAMMATIC VERIFICATION:');
console.log('');

const belt = getProduct('belt_conveyor_v1');
const magnetic = getProduct('magnetic_conveyor_v1');

if (!belt || !magnetic) {
  console.error('ERROR: Products not registered');
  process.exit(1);
}

console.log(`✓ Belt product registered: ${belt.name} (${belt.outputsSchema.length} outputs)`);
console.log(`✓ Magnetic product registered: ${magnetic.name} (${magnetic.outputsSchema.length} outputs)`);

// Check cross-product isolation
const beltOnBelt = canRenderCard('belt_conveyor_v1', ['drive_T1_lbf', 'drive_T2_lbf']);
const magnetOnMagnetic = canRenderCard('magnetic_conveyor_v1', ['qty_magnets', 'total_torque_in_lb']);
const magnetOnBelt = canRenderCard('belt_conveyor_v1', ['qty_magnets']);
const beltOnMagnetic = canRenderCard('magnetic_conveyor_v1', ['drive_T1_lbf']);

console.log('');
console.log('Cross-product isolation:');
console.log(`  ${beltOnBelt ? '✓' : '✗'} Belt keys on belt: ${beltOnBelt}`);
console.log(`  ${magnetOnMagnetic ? '✓' : '✗'} Magnetic keys on magnetic: ${magnetOnMagnetic}`);
console.log(`  ${!magnetOnBelt ? '✓' : '✗'} Magnetic keys BLOCKED on belt: ${!magnetOnBelt}`);
console.log(`  ${!beltOnMagnetic ? '✓' : '✗'} Belt keys BLOCKED on magnetic: ${!beltOnMagnetic}`);

const allPass = beltOnBelt && magnetOnMagnetic && !magnetOnBelt && !beltOnMagnetic;
console.log('');
console.log(allPass ? '✅ ALL PROGRAMMATIC CHECKS PASS' : '❌ SOME CHECKS FAILED');

process.exit(allPass ? 0 : 1);

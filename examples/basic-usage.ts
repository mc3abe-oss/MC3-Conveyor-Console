/**
 * EXAMPLE: Basic Usage of Sliderbed Conveyor Calculator
 *
 * This example demonstrates how to use the calculation engine
 * for a standard sliderbed conveyor application.
 */

import {
  calculateSliderbed,
  PartTemperature,
  OilCondition,
  Orientation,
} from '../src';

// Example 1: Basic calculation with all required inputs
console.log('=== Example 1: Basic Calculation ===\n');

const result1 = calculateSliderbed({
  // Geometry
  conveyor_length_cc_in: 120,
  belt_width_in: 24,
  pulley_diameter_in: 2.5,

  // Speed
  belt_speed_fpm: 100,

  // Product
  part_weight_lbs: 5,
  part_length_in: 12,
  part_width_in: 6,
  part_temperature: PartTemperature.Ambient,
  oil_condition: OilCondition.None,
  orientation: Orientation.Lengthwise,
  spacing_ft: 0.5,
});

if (result1.success && result1.outputs) {
  console.log('Calculation successful!\n');
  console.log('Key Results:');
  console.log(`  Parts on Belt: ${result1.outputs.parts_on_belt.toFixed(2)}`);
  console.log(`  Total Load: ${result1.outputs.total_load_lbf.toFixed(2)} lbf`);
  console.log(`  Drive Shaft RPM: ${result1.outputs.drive_shaft_rpm.toFixed(2)}`);
  console.log(
    `  Torque: ${result1.outputs.torque_drive_shaft_inlbf.toFixed(2)} in-lbf`
  );
  console.log(`  Gear Ratio: ${result1.outputs.gear_ratio.toFixed(2)}`);
  console.log();
}

// Example 2: Calculation with warnings
console.log('=== Example 2: Calculation with Warnings ===\n');

const result2 = calculateSliderbed({
  conveyor_length_cc_in: 150, // Long conveyor - will trigger warning
  belt_width_in: 24,
  pulley_diameter_in: 2.5,
  belt_speed_fpm: 100,
  part_weight_lbs: 5,
  part_length_in: 12,
  part_width_in: 6,
  part_temperature: PartTemperature.Hot, // Hot parts - will trigger warning
  oil_condition: OilCondition.Light, // Light oil - will trigger info
  orientation: Orientation.Lengthwise,
  spacing_ft: 0.5,
});

if (result2.success) {
  console.log('Calculation successful with warnings:\n');

  if (result2.warnings) {
    console.log('Warnings/Info:');
    result2.warnings.forEach((warning) => {
      console.log(`  [${warning.severity.toUpperCase()}] ${warning.message}`);
    });
    console.log();
  }
}

// Example 3: Error handling (red hot parts)
console.log('=== Example 3: Error Handling ===\n');

const result3 = calculateSliderbed({
  conveyor_length_cc_in: 120,
  belt_width_in: 24,
  pulley_diameter_in: 2.5,
  belt_speed_fpm: 100,
  part_weight_lbs: 5,
  part_length_in: 12,
  part_width_in: 6,
  part_temperature: PartTemperature.RedHot, // Red hot - will trigger hard error
  oil_condition: OilCondition.None,
  orientation: Orientation.Lengthwise,
  spacing_ft: 0.5,
});

if (!result3.success) {
  console.log('Calculation failed due to errors:\n');

  if (result3.errors) {
    result3.errors.forEach((error) => {
      console.log(`  ERROR: ${error.message}`);
    });
    console.log();
  }
}

// Example 4: Crosswise orientation
console.log('=== Example 4: Crosswise Orientation ===\n');

const result4 = calculateSliderbed({
  conveyor_length_cc_in: 120,
  belt_width_in: 24,
  pulley_diameter_in: 2.5,
  belt_speed_fpm: 100,
  part_weight_lbs: 5,
  part_length_in: 12,
  part_width_in: 6,
  part_temperature: PartTemperature.Ambient,
  oil_condition: OilCondition.None,
  orientation: Orientation.Crosswise, // Parts travel perpendicular to length
  spacing_ft: 1.0,
});

if (result4.success && result4.outputs) {
  console.log('Crosswise orientation calculation:\n');
  console.log(
    `  Parts on Belt (crosswise): ${result4.outputs.parts_on_belt.toFixed(2)}`
  );
  console.log();
}

// Example 5: Comparison of pulley sizes
console.log('=== Example 5: Pulley Size Comparison ===\n');

const pulley2_5 = calculateSliderbed({
  conveyor_length_cc_in: 100,
  belt_width_in: 20,
  pulley_diameter_in: 2.5,
  belt_speed_fpm: 80,
  part_weight_lbs: 3,
  part_length_in: 10,
  part_width_in: 5,
  part_temperature: PartTemperature.Ambient,
  oil_condition: OilCondition.None,
  orientation: Orientation.Lengthwise,
  spacing_ft: 0,
});

const pulley3_0 = calculateSliderbed({
  conveyor_length_cc_in: 100,
  belt_width_in: 20,
  pulley_diameter_in: 3.0,
  belt_speed_fpm: 80,
  part_weight_lbs: 3,
  part_length_in: 10,
  part_width_in: 5,
  part_temperature: PartTemperature.Ambient,
  oil_condition: OilCondition.None,
  orientation: Orientation.Lengthwise,
  spacing_ft: 0,
});

if (pulley2_5.success && pulley3_0.success) {
  console.log('Comparing 2.5" vs 3.0" pulley:');
  console.log(
    `  2.5" pulley - Belt Weight: ${pulley2_5.outputs?.belt_weight_lbf.toFixed(3)} lbf`
  );
  console.log(
    `  3.0" pulley - Belt Weight: ${pulley3_0.outputs?.belt_weight_lbf.toFixed(3)} lbf`
  );
  console.log(
    `  2.5" pulley - Drive RPM: ${pulley2_5.outputs?.drive_shaft_rpm.toFixed(2)}`
  );
  console.log(
    `  3.0" pulley - Drive RPM: ${pulley3_0.outputs?.drive_shaft_rpm.toFixed(2)}`
  );
  console.log();
}

console.log('=== All examples completed ===');

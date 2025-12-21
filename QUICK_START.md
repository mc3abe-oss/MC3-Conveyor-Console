# Quick Start Guide

## Installation

```bash
npm install
```

## Running Tests

```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

## Running Examples

```bash
npm run example          # Build and run example scenarios
```

## Development

```bash
npm run build           # Compile TypeScript to JavaScript
npm run type-check      # Verify type safety without building
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
```

## Basic Usage

```typescript
import {
  calculateSliderbed,
  PartTemperature,
  OilCondition,
  Orientation,
} from './src';

const result = calculateSliderbed({
  // Geometry
  conveyor_length_cc_in: 120,
  conveyor_width_in: 24,
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

if (result.success) {
  console.log('Drive Shaft RPM:', result.outputs.drive_shaft_rpm);
  console.log('Torque:', result.outputs.torque_drive_shaft_inlbf, 'in-lbf');
  console.log('Gear Ratio:', result.outputs.gear_ratio);

  // Check for warnings
  if (result.warnings) {
    result.warnings.forEach(w => console.log(`[${w.severity}] ${w.message}`));
  }
} else {
  // Handle errors
  result.errors?.forEach(e => console.error('ERROR:', e.message));
}
```

## Key Files

| File | Purpose |
|------|---------|
| `src/models/sliderbed_v1/schema.ts` | Type definitions for inputs, parameters, outputs |
| `src/models/sliderbed_v1/formulas.ts` | Pure calculation functions |
| `src/models/sliderbed_v1/rules.ts` | Validation rules and warnings |
| `src/lib/calculator/engine.ts` | Calculation orchestrator |
| `examples/basic-usage.ts` | Usage examples |

## Inputs Reference

### Required Inputs

```typescript
{
  conveyor_length_cc_in: number,    // inches
  conveyor_width_in: number,        // inches
  pulley_diameter_in: number,       // inches
  belt_speed_fpm: number,           // feet per minute
  part_weight_lbs: number,          // pounds
  part_length_in: number,           // inches
  part_width_in: number,            // inches
  part_temperature: PartTemperature,
  oil_condition: OilCondition,
  orientation: Orientation,
  spacing_ft: number,               // feet
}
```

### Optional Inputs

```typescript
{
  conveyor_incline_deg?: number,    // degrees (default: 0)
  throughput_units_per_hr?: number, // units per hour
}
```

## Outputs Reference

### Key Outputs

```typescript
{
  drive_shaft_rpm: number,           // Required drive shaft RPM
  torque_drive_shaft_inlbf: number,  // Torque in inch-pounds-force
  gear_ratio: number,                // Motor RPM / drive shaft RPM
  parts_on_belt: number,             // Number of parts on belt
  total_load_lbf: number,            // Total load in pounds-force
  total_belt_pull_lbf: number,       // Total belt pull in pounds-force
  // ... (8 more intermediate outputs)
}
```

## Parameter Overrides (Power Users)

```typescript
import { runCalculation } from './src';

const result = runCalculation({
  inputs: { /* ... */ },
  parameters: {
    safety_factor: 3.0,              // Default: 2.0
    friction_coeff: 0.3,             // Default: 0.25
    base_belt_pull_lbf_per_ft: 100,  // Default: 75
    motor_rpm: 1750,                 // Default: 1750
    // ... (5 more parameters)
  },
});
```

## Validation Rules

### Hard Errors (Block Calculation)
- `part_temperature == "Red Hot"` → "Do not use sliderbed conveyor for red hot parts"
- Invalid numeric ranges (negative, zero where not allowed)

### Warnings
- `oil_condition == "Considerable"` → "Consider ribbed or specialty belt"
- `conveyor_length_cc_in > 120` → "Consider multi-section body"
- `part_temperature == "Hot"` → "Consider high-temperature belt"

### Info
- `oil_condition == "Light"` → "Light oil present"

## Project Structure

```
.
├── src/
│   ├── models/sliderbed_v1/      # Model v1 implementation
│   │   ├── schema.ts             # Types
│   │   ├── formulas.ts           # Calculations
│   │   ├── rules.ts              # Validation
│   │   ├── fixtures.ts           # Test fixtures
│   │   ├── model.test.ts         # Tests
│   │   └── index.ts              # Public API
│   ├── lib/calculator/           # Calculation engine
│   │   ├── engine.ts             # Orchestrator
│   │   └── index.ts              # Public API
│   └── index.ts                  # Main entry point
├── examples/                     # Usage examples
├── dist/                         # Compiled output (git-ignored)
├── README.md                     # Full documentation
├── IMPLEMENTATION_SUMMARY.md     # Implementation details
└── QUICK_START.md               # This file
```

## Adding Excel Test Fixtures

1. Open `src/models/sliderbed_v1/fixtures.ts`
2. Add a new fixture:

```typescript
export const EXCEL_CASE_1: TestFixture = {
  name: 'Excel Case 1 - Description',
  inputs: {
    // Exact values from Excel
  },
  expected_outputs: {
    drive_shaft_rpm: 152.789,
    torque_drive_shaft_inlbf: 1234.56,
    gear_ratio: 11.46,
    // ... other outputs from Excel
  },
  tolerance: 0.005, // ±0.5%
};
```

3. Add to registry:
```typescript
export const ALL_FIXTURES: TestFixture[] = [
  EXCEL_CASE_1,
  // ... more fixtures
];
```

4. Run tests to validate:
```bash
npm test
```

## Need Help?

- Full documentation: See `README.md`
- Implementation details: See `IMPLEMENTATION_SUMMARY.md`
- Examples: See `examples/basic-usage.ts`
- Type definitions: See `src/models/sliderbed_v1/schema.ts`

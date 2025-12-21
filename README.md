# Sliderbed Conveyor Calculation Engine v1

**Factory Default Model Implementation**

This repository contains the complete calculation engine for sliderbed conveyor application design, implementing Model v1 specification with **mandatory Excel parity**.

---

## Architecture Overview

### Core Principles

1. **Separation of Concerns**: Inputs, parameters, formulas, rules, and outputs are separate artifacts
2. **Excel Parity**: All calculations match Excel behavior exactly (units, formulas, rounding)
3. **Versioning**: All editable math is versioned, testable, and reversible
4. **Type Safety**: Full TypeScript types with explicit units in variable names
5. **Pure Functions**: No side effects, no hidden state, testable in isolation

### Directory Structure

```
src/
├── models/
│   └── sliderbed_v1/
│       ├── schema.ts       # Type definitions (inputs, parameters, outputs)
│       ├── formulas.ts     # Pure calculation functions
│       ├── rules.ts        # Validation rules and application logic
│       ├── fixtures.ts     # Excel test fixtures
│       ├── model.test.ts   # Test suite
│       └── index.ts        # Public API
└── lib/
    └── calculator/
        ├── engine.ts       # Calculation orchestrator
        └── index.ts        # Public API
```

---

## Model Specification Summary

**Model Key**: `sliderbed_conveyor_v1`
**Status**: Factory Default
**Source of Truth**: Model v1 Specification (Authoritative)

### Inputs (User-Editable)

**Geometry & Layout:**
- `conveyor_length_cc_in`: Conveyor length center-to-center (inches)
- `conveyor_width_in`: Conveyor width (inches)
- `conveyor_incline_deg`: Incline angle (degrees, optional, default: 0)
- `pulley_diameter_in`: Pulley diameter (inches)

**Speed & Throughput:**
- `belt_speed_fpm`: Belt speed (feet per minute)
- `throughput_units_per_hr`: Throughput (units per hour, optional)

**Product / Part:**
- `part_weight_lbs`: Part weight (pounds)
- `part_length_in`: Part length (inches)
- `part_width_in`: Part width (inches)
- `part_temperature`: Part temperature (enum: Ambient, Warm, Hot, Red Hot)
- `oil_condition`: Oil condition (enum: None, Light, Considerable)
- `orientation`: Part orientation (enum: Lengthwise, Crosswise)
- `spacing_ft`: Part spacing (feet, default: 0)

### Parameters (Power User-Editable)

- `friction_coeff`: Sliderbed friction coefficient (default: 0.25)
- `safety_factor`: Safety factor for torque (default: 2.0)
- `base_belt_pull_lbf_per_ft`: Base belt pull (default: 75 lbf/ft)
- `motor_rpm`: Nominal motor RPM (default: 1750)
- `gravity_in_per_s2`: Gravity constant (default: 386.1 in/s²)
- `piw_2p5`, `piw_other`, `pil_2p5`, `pil_other`: Belt weight coefficients

### Outputs

**Key Calculations:**
- `parts_on_belt`: Number of parts on belt
- `total_load_lbf`: Total load (belt + parts) in pounds-force
- `drive_shaft_rpm`: Required drive shaft RPM
- `torque_drive_shaft_inlbf`: Torque on drive shaft (inch-pounds-force)
- `gear_ratio`: Motor RPM to drive shaft RPM ratio

See `schema.ts` for complete output list.

### Validation Rules

**Hard Errors** (block calculation):
- Part temperature = "Red Hot" → "Do not use sliderbed conveyor for red hot parts"
- Invalid numeric ranges (negative values, zero where not allowed)

**Warnings**:
- Oil condition = "Considerable" → "Consider ribbed or specialty belt"
- Conveyor length > 120" → "Consider multi-section body"
- Part temperature = "Hot" → "Consider high-temperature belt"

**Info**:
- Oil condition = "Light" → "Light oil present"

---

## Usage

### Basic Calculation

```typescript
import { calculateSliderbed } from './lib/calculator';
import { PartTemperature, OilCondition, Orientation } from './models/sliderbed_v1';

const result = calculateSliderbed({
  conveyor_length_cc_in: 120,
  conveyor_width_in: 24,
  pulley_diameter_in: 2.5,
  belt_speed_fpm: 100,
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
} else {
  console.error('Errors:', result.errors);
}
```

### With Parameter Overrides

```typescript
import { runCalculation } from './lib/calculator';

const result = runCalculation({
  inputs: {
    // ... input values
  },
  parameters: {
    safety_factor: 3.0, // Override default (2.0)
    friction_coeff: 0.3, // Override default (0.25)
  },
});
```

### Accessing Warnings

```typescript
const result = calculateSliderbed({
  // ... inputs with long conveyor
  conveyor_length_cc_in: 150,
});

if (result.warnings) {
  result.warnings.forEach(w => {
    console.log(`[${w.severity}] ${w.message}`);
  });
}
```

---

## Testing

### Running Tests

```bash
npm test
```

### Test Coverage

The test suite covers:
- ✅ Basic calculation execution
- ✅ Input validation (range checks, required fields)
- ✅ Parameter validation
- ✅ Application rules (errors, warnings, info)
- ✅ Formula correctness (unit tests for individual formulas)
- ✅ Default value application
- ✅ Parameter overrides
- ✅ Metadata generation

### Excel Parity Tests

Excel test fixtures should be added to `fixtures.ts`:

```typescript
export const EXCEL_CASE_1: TestFixture = {
  name: 'Excel Case 1 - Standard Configuration',
  inputs: {
    // ... exact values from Excel
  },
  expected_outputs: {
    drive_shaft_rpm: 152.789,
    torque_drive_shaft_inlbf: 1234.56,
    gear_ratio: 11.46,
    // ... all outputs from Excel
  },
  tolerance: 0.005, // ±0.5%
};
```

**Publishing Rule**: A model version cannot be published unless all fixtures pass.

---

## Formula Documentation

All formulas are implemented in `formulas.ts` with:
- Explicit unit conversions
- Dependency order documented
- Comments explaining Excel behavior

### Example: Parts on Belt

```typescript
/**
 * Calculate number of parts on belt
 *
 * Formula:
 *   parts_on_belt = IF(orientation == "Lengthwise",
 *                      cc_length_in / (part_length_in + spacing_ft * 12),
 *                      cc_length_in / (part_width_in + spacing_ft * 12))
 */
export function calculatePartsOnBelt(
  conveyorLengthCcIn: number,
  partLengthIn: number,
  partWidthIn: number,
  spacingFt: number,
  orientation: Orientation
): number {
  const spacingIn = spacingFt * 12; // Convert feet to inches

  if (orientation === Orientation.Lengthwise) {
    return conveyorLengthCcIn / (partLengthIn + spacingIn);
  } else {
    return conveyorLengthCcIn / (partWidthIn + spacingIn);
  }
}
```

---

## Versioning Strategy

### Model Versions

Each model version is:
- **Immutable** after publishing
- **Tracked** with version ID
- **Testable** against fixtures
- **Reversible** (can rollback to previous version)

### Creating New Versions

1. Parameter edits → Create draft version
2. Formula edits → Require fixture validation
3. All tests must pass before publishing
4. One-click rollback to any published version

### Calculation Audit Trail

Every calculation records:
- `model_version_id`: Which version was used
- `calculated_at`: Timestamp (ISO 8601)
- `inputs`: All input values
- `outputs`: All calculated values
- `warnings` and `errors`: Any validation messages

---

## Next Steps

### Phase 2: Database Integration (Supabase)

**Tables to create:**

```sql
-- Model versions
CREATE TABLE model_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_key TEXT NOT NULL,
  version_number INTEGER,
  status TEXT CHECK (status IN ('draft', 'published', 'archived')),
  formulas_hash TEXT,
  parameters JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Calculation runs (audit trail)
CREATE TABLE calculation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_version_id UUID REFERENCES model_versions(id),
  inputs JSONB NOT NULL,
  outputs JSONB NOT NULL,
  warnings JSONB,
  errors JSONB,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID
);

-- Test fixtures
CREATE TABLE test_fixtures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_key TEXT NOT NULL,
  name TEXT,
  inputs JSONB,
  expected_outputs JSONB,
  tolerances JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Phase 3: UI Implementation (Next.js)

**After** calculation engine is approved and tested:

1. Input form with validation
2. Real-time calculation
3. Warning/error display
4. Results visualization
5. Parameter override interface (power users)
6. Version history and rollback

---

## Development Guidelines

### Adding New Formulas

1. Add formula function to `formulas.ts`
2. Update output type in `schema.ts`
3. Add formula to master `calculate()` function in dependency order
4. Write unit tests in `model.test.ts`
5. Add Excel fixture validation

### Modifying Existing Formulas

1. Create new model version
2. Update formula in `formulas.ts`
3. Update or add tests
4. Validate against Excel fixtures
5. Publish only after all tests pass

### No Assumptions

If anything is unclear or ambiguous:
- **STOP** and ask for clarification
- Do not guess or extrapolate
- Do not add features not in the spec

---

## License

Proprietary - MC3 Manufacturing Inc.

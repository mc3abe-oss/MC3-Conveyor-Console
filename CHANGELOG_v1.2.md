# SLIDERBED CONVEYOR CALCULATOR - VERSION 1.2

**Release Date:** 2025-12-19
**Type:** Feature Enhancement - Power-User Parameters
**Status:** ✅ Complete

---

## Summary

Made four critical calculation parameters editable by power users directly from inputs, allowing per-calculation customization without modifying global parameters. Users can now override safety factors, belt coefficients, and base belt pull on a case-by-case basis.

---

## New Power-User Parameters

### 1. safety_factor
- **Type:** Optional number in inputs
- **Default:** 2.0 (from parameters)
- **Range:** 1.0 – 5.0
- **Affects:** Torque calculation
- **Formula:** `torque_drive_shaft_inlb = total_belt_pull_lb * (pulley_diameter_in/2) * safety_factor`

### 2. belt_coeff_piw
- **Type:** Optional number in inputs
- **Default:** 0.109 (or 0.138 for 2.5" pulley, from parameters)
- **Range:** 0.05 – 0.30
- **Affects:** Belt weight calculation
- **Formula:** `belt_weight_lb = belt_coeff_piw * belt_coeff_pil * conveyor_width_in * total_belt_length_in`

### 3. belt_coeff_pil
- **Type:** Optional number in inputs
- **Default:** 0.109 (or 0.138 for 2.5" pulley, from parameters)
- **Range:** 0.05 – 0.30
- **Affects:** Belt weight calculation
- **Formula:** `belt_weight_lb = belt_coeff_piw * belt_coeff_pil * conveyor_width_in * total_belt_length_in`

### 4. base_belt_pull_lb_per_ft
- **Type:** Optional number in inputs
- **Default:** 75 (from parameters)
- **Range:** 0 – 200
- **Affects:** Base belt pull total
- **Formula:** `base_belt_pull_total_lb = base_belt_pull_lb_per_ft * (conveyor_length_cc_in / 12)`

---

## Updated Formulas

### Formula Name Changes (Cosmetic)
Updated formula comments for clarity (no calculation changes):

**Belt Weight:**
```typescript
// Old comment: belt_weight_lbs = piw * pil * belt_width_in * total_belt_length_in
// New comment: belt_weight_lb = belt_coeff_piw * belt_coeff_pil * conveyor_width_in * total_belt_length_in
```

**Base Belt Pull:**
```typescript
// Old comment: base_belt_pull_total_lbf = base_belt_pull_lbf_per_ft * (cc_length_in / 12)
// New comment: base_belt_pull_total_lb = base_belt_pull_lb_per_ft * (conveyor_length_cc_in / 12)
```

**Torque:**
```typescript
// Old comment: torque_drive_shaft_inlb = total_belt_pull_lbft * (pulley_diameter_in / 2)
// New comment: torque_drive_shaft_inlb = total_belt_pull_lb * (pulley_diameter_in/2) * safety_factor
```

---

## New Validation Rules

### Input Validation (Power-User Parameters)

1. **safety_factor**
   - Must be >= 1.0
   - Must be <= 5.0

2. **belt_coeff_piw**
   - Must be > 0
   - Must be between 0.05 and 0.30

3. **belt_coeff_pil**
   - Must be > 0
   - Must be between 0.05 and 0.30

4. **base_belt_pull_lb_per_ft**
   - Must be >= 0
   - Must be <= 200

---

## New Outputs

### Added to SliderbedOutputs

**base_belt_pull_lb_per_ft_used**
- **Type:** number
- **Description:** The actual base belt pull per foot value used (user override or parameter default)
- **Purpose:** Audit trail - shows which value was used in calculation

---

## Files Modified

### Core Calculation Engine (4 files)

1. **src/models/sliderbed_v1/schema.ts**
   - Added 4 optional fields to `SliderbedInputs`: `safety_factor`, `belt_coeff_piw`, `belt_coeff_pil`, `base_belt_pull_lb_per_ft`
   - Added `base_belt_pull_lb_per_ft_used` to `SliderbedOutputs`
   - Updated version to v1.2 in header
   - Added changelog entry

2. **src/models/sliderbed_v1/formulas.ts**
   - Updated `calculateBeltWeightCoefficients()` to accept optional `userPiw` and `userPil` parameters
   - Modified `calculate()` to extract power-user parameters from inputs with fallbacks
   - Updated formula comments for clarity
   - Added `base_belt_pull_lb_per_ft_used` to return object
   - Updated version to v1.2 in header

3. **src/models/sliderbed_v1/rules.ts**
   - Added validation rules for all 4 power-user parameters
   - Validates ranges: safety_factor (1.0-5.0), belt coeffs (0.05-0.30), base pull (0-200)
   - Updated version to v1.2 in header

4. **src/models/sliderbed_v1/model.test.ts**
   - Added 10 new tests in "Power-User Parameters" test suite
   - Tests validation rules for all 4 parameters
   - Tests successful override behavior
   - Tests output audit trail (`safety_factor_used`, `base_belt_pull_lb_per_ft_used`)

### Documentation (1 file)

5. **CHANGELOG_v1.2.md** (this file)

**Total:** 5 files modified

---

## Testing

### Test Results
✅ All 31 tests pass (10 new tests added):
```bash
npm test
```

**Results:**
```
Test Suites: 1 passed, 1 total
Tests:       31 passed, 31 total
Snapshots:   0 total
Time:        0.338 s
```

### New Tests Added (10 total)

**Power-User Parameters:**
1. ✅ should use custom safety_factor when provided
2. ✅ should reject safety_factor < 1.0 in inputs
3. ✅ should reject safety_factor > 5.0 in inputs
4. ✅ should use custom belt_coeff_piw and belt_coeff_pil
5. ✅ should reject belt_coeff_piw <= 0
6. ✅ should reject belt_coeff_piw out of range
7. ✅ should reject belt_coeff_pil <= 0
8. ✅ should use custom base_belt_pull_lb_per_ft
9. ✅ should reject base_belt_pull_lb_per_ft < 0
10. ✅ should reject base_belt_pull_lb_per_ft > 200

---

## Usage Examples

### Example 1: Custom Safety Factor

```typescript
import { runCalculation } from './src/lib/calculator';

const result = runCalculation({
  inputs: {
    conveyor_length_cc_in: 120,
    conveyor_width_in: 24,
    pulley_diameter_in: 2.5,
    belt_speed_fpm: 100,
    part_weight_lbs: 5,
    part_length_in: 12,
    part_width_in: 6,
    part_temperature: 'Ambient',
    oil_condition: 'None',
    orientation: 'Lengthwise',
    spacing_ft: 0.5,

    // Power-user override: increase safety factor for critical application
    safety_factor: 3.0,
  }
});

console.log('Torque:', result.outputs.torque_drive_shaft_inlbf);
console.log('Safety factor used:', result.outputs.safety_factor_used); // 3.0
```

### Example 2: Custom Belt Coefficients

```typescript
// Different belt material with known coefficients
const result = runCalculation({
  inputs: {
    // ... standard inputs ...

    // Power-user override: specialty belt material
    belt_coeff_piw: 0.15,
    belt_coeff_pil: 0.12,
  }
});

console.log('Belt weight:', result.outputs.belt_weight_lbf);
console.log('piw used:', result.outputs.piw_used); // 0.15
console.log('pil used:', result.outputs.pil_used); // 0.12
```

### Example 3: Custom Base Belt Pull

```typescript
// Higher base pull for abrasive environment
const result = runCalculation({
  inputs: {
    // ... standard inputs ...

    // Power-user override: higher friction surface
    base_belt_pull_lb_per_ft: 100,
  }
});

console.log('Base pull used:', result.outputs.base_belt_pull_lb_per_ft_used); // 100
console.log('Total belt pull:', result.outputs.total_belt_pull_lbf);
```

### Example 4: Using Defaults (No Override)

```typescript
// No power-user parameters specified - uses parameter defaults
const result = runCalculation({
  inputs: {
    conveyor_length_cc_in: 120,
    conveyor_width_in: 24,
    // ... other required inputs ...
  }
});

// Uses parameter defaults:
// safety_factor_used: 2.0
// piw_used: 0.138 (for 2.5" pulley) or 0.109 (other)
// pil_used: 0.138 (for 2.5" pulley) or 0.109 (other)
// base_belt_pull_lb_per_ft_used: 75
```

---

## Backwards Compatibility

### ✅ Fully Backwards Compatible

**Breaking Changes:** None

**Reason:** All new fields are **optional** in inputs. Existing code continues to work without modification.

**Migration Required:** No

**Existing Calculations:** Unaffected - all new parameters have defaults from the `SliderbedParameters` object.

---

## Impact on Outputs

### When Using Defaults
**Zero impact** - calculations identical to v1.1

### When Using Custom Values
Impact depends on user-provided values:

**Example:** `safety_factor: 3.0` (vs default 2.0)
- Torque increases by 50%

**Example:** `belt_coeff_piw: 0.15, belt_coeff_pil: 0.15` (vs default 0.109 each)
- Belt weight increases by ~90%
- Total load increases proportionally
- Belt pull increases proportionally
- Torque increases proportionally

**Example:** `base_belt_pull_lb_per_ft: 100` (vs default 75)
- Base belt pull total increases by 33%
- Total belt pull increases (but less, since it includes calculated component)

---

## Database Impact

### Model Versions Table
When creating v1.2 in database:

```typescript
import { createDraftVersion, publishVersion } from './src/lib/database';
import { DEFAULT_PARAMETERS } from './src/models/sliderbed_v1/schema';

// Parameters remain unchanged from v1.0/v1.1
const v12 = await createDraftVersion(
  'sliderbed_conveyor_v1',
  'v1.2_power_user_params',
  DEFAULT_PARAMETERS,  // Same defaults as before
  userId
);

// Publish when ready
await publishVersion(v12.id, userId);
```

### Calculation Runs Table
New calculations will include power-user overrides in the `inputs` JSONB field:

```json
{
  "inputs": {
    "conveyor_length_cc_in": 120,
    "safety_factor": 3.0,
    "belt_coeff_piw": 0.15,
    ...
  }
}
```

### Audit Trail
The `outputs` object now includes `base_belt_pull_lb_per_ft_used` showing which value was actually used.

---

## UI Impact (Phase 3)

### Recommended UI Changes

**Option A: Advanced Section (Recommended)**
```tsx
<form>
  {/* Standard inputs */}

  <details>
    <summary>Advanced Parameters (Power Users)</summary>
    <input name="safety_factor" placeholder="Default: 2.0" />
    <input name="belt_coeff_piw" placeholder="Default: Auto" />
    <input name="belt_coeff_pil" placeholder="Default: Auto" />
    <input name="base_belt_pull_lb_per_ft" placeholder="Default: 75" />
  </details>
</form>
```

**Option B: Separate "Expert Mode" Toggle**
```tsx
const [expertMode, setExpertMode] = useState(false);

{expertMode && (
  <div className="expert-params">
    {/* Power-user parameter inputs */}
  </div>
)}
```

**Option C: Tooltip/Help Icons**
Show default values and ranges in tooltips next to each field.

---

## Validation in UI

### Client-Side Validation
```typescript
// Validate before submission
if (inputs.safety_factor !== undefined) {
  if (inputs.safety_factor < 1.0 || inputs.safety_factor > 5.0) {
    setError('safety_factor', 'Must be between 1.0 and 5.0');
  }
}

if (inputs.belt_coeff_piw !== undefined) {
  if (inputs.belt_coeff_piw < 0.05 || inputs.belt_coeff_piw > 0.30) {
    setError('belt_coeff_piw', 'Must be between 0.05 and 0.30');
  }
}

// ... etc
```

### Server-Side Validation
Already handled by `validateInputs()` in `rules.ts` - no additional work needed.

---

## Use Cases

### When to Use Power-User Parameters

1. **High Safety Factor (3.0-5.0)**
   - Critical/hazardous applications
   - Regulatory requirements
   - Unstable load conditions

2. **Custom Belt Coefficients**
   - Specialty belt materials
   - Known manufacturer specs
   - Non-standard belt construction

3. **Custom Base Belt Pull**
   - Abrasive environments
   - High-friction surfaces
   - Extreme temperatures
   - Dirty/contaminated conditions

### When to Use Defaults

- Standard applications
- Generic belt materials
- Normal operating conditions
- Quick estimates/proposals

---

## Migration Guide

### For Developers

**No changes required** - v1.2 is fully backwards compatible.

**To use new features:**
```typescript
// Just add optional fields to inputs
const inputs = {
  // ... existing inputs ...
  safety_factor: 2.5,  // NEW
};
```

### For UI Developers

1. Add optional input fields for power-user parameters
2. Display defaults/ranges in help text
3. Show used values in results (e.g., "Safety Factor: 2.0 (default)" or "Safety Factor: 3.0 (custom)")

### For Database Users

No migration needed - v1.2 uses same parameter schema as v1.0/v1.1.

---

## Next Steps

### Immediate
1. ✅ Update calculation engine (complete)
2. ✅ Add validation rules (complete)
3. ✅ Add tests (complete)
4. ✅ Document changes (complete)

### Short Term
5. 📝 TODO: Add power-user parameter inputs to UI
6. 📝 TODO: Update UI to display used values in results
7. 📝 TODO: Add tooltips/help text for parameter ranges

### Long Term
8. 📝 TODO: Create preset library (e.g., "High Safety", "Abrasive Environment")
9. 📝 TODO: Add parameter validation warnings (e.g., "Unusual safety factor - are you sure?")
10. 📝 TODO: Export power-user values in calculation reports

---

## Version Comparison

| Feature | v1.0 | v1.1 | v1.2 |
|---------|------|------|------|
| Belt length formula | 2πD (wrong) | πD (correct) | πD (correct) |
| Power-user params | No | No | **Yes** |
| Safety factor editable | No | No | **Yes (1.0-5.0)** |
| Belt coeffs editable | No | No | **Yes (0.05-0.30)** |
| Base pull editable | No | No | **Yes (0-200)** |
| Audit trail outputs | Partial | Partial | **Complete** |
| Test coverage | 21 tests | 21 tests | **31 tests** |

---

## Technical Details

### Type Changes

**SliderbedInputs (schema.ts):**
```typescript
export interface SliderbedInputs {
  // ... existing fields ...

  // NEW in v1.2
  safety_factor?: number;
  belt_coeff_piw?: number;
  belt_coeff_pil?: number;
  base_belt_pull_lb_per_ft?: number;
}
```

**SliderbedOutputs (schema.ts):**
```typescript
export interface SliderbedOutputs {
  // ... existing fields ...

  // NEW in v1.2
  base_belt_pull_lb_per_ft_used: number;
}
```

### Function Signature Changes

**calculateBeltWeightCoefficients (formulas.ts):**
```typescript
// v1.1
export function calculateBeltWeightCoefficients(
  pulleyDiameterIn: number,
  params: SliderbedParameters
): { piw: number; pil: number }

// v1.2
export function calculateBeltWeightCoefficients(
  pulleyDiameterIn: number,
  params: SliderbedParameters,
  userPiw?: number,      // NEW
  userPil?: number       // NEW
): { piw: number; pil: number }
```

---

**STATUS: ✅ READY FOR DEPLOYMENT**

All tests passing. Full backwards compatibility. Documentation complete. Ready for UI integration and production deployment.

**END OF CHANGELOG v1.2**

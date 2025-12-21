# SLIDERBED CONVEYOR CALCULATOR - VERSION 1.1

**Release Date:** 2025-12-19
**Type:** Formula Correction
**Status:** ✅ Complete

---

## Summary

Fixed the belt length calculation to correctly model open-belt wrap configuration using πD instead of 2πD for the pulley circumference component.

---

## Changes

### Formula Updates

**File:** `src/models/sliderbed_v1/formulas.ts`

**Function:** `calculateTotalBeltLength()`

**Previous Formula (v1.0):**
```typescript
total_belt_length_in = (2 * cc_length_in) + (2 * PI * pulley_diameter_in)
```

**New Formula (v1.1):**
```typescript
total_belt_length_in = (2 * cc_length_in) + (PI * pulley_diameter_in)
```

**Reason:**
The belt wraps around the pulley in an open configuration (half wrap), not a closed loop (full wrap). The correct circumference contribution is πD (half of full circumference 2πD).

**Impact:**
This change reduces the calculated belt length, which affects downstream calculations:
- **belt_weight_lbf** - Decreases (proportional to belt length)
- **total_load_lbf** - Decreases (includes belt weight)
- **avg_load_per_ft** - Decreases
- **belt_pull_calc_lbf** - Decreases
- **total_belt_pull_lbf** - Decreases
- **torque_drive_shaft_inlbf** - Decreases

**Example:**
- Inputs: conveyor_length_cc_in = 100", pulley_diameter_in = 2.5"
- v1.0 result: 215.708"
- v1.1 result: 207.854"
- Difference: -7.854" (-3.6%)

---

## Files Modified

### Core Calculation Files
1. **src/models/sliderbed_v1/schema.ts**
   - Updated header to v1.1
   - Added changelog comment

2. **src/models/sliderbed_v1/formulas.ts**
   - Updated header to v1.1
   - Fixed `calculateTotalBeltLength()` formula
   - Added changelog comment

3. **src/models/sliderbed_v1/rules.ts**
   - Updated header to v1.1
   - Added changelog comment

### Test Files
4. **src/models/sliderbed_v1/model.test.ts**
   - Updated belt length test expectation (215.708 → 207.854)
   - Added comment explaining v1.1 change

### Documentation
5. **CHANGELOG_v1.1.md** (this file)

---

## Testing

### Unit Tests
All 21 tests pass:
```bash
npm test
```

**Results:**
```
Test Suites: 1 passed, 1 total
Tests:       21 passed, 21 total
```

**Specific test updated:**
- "should calculate total belt length correctly" - Updated expected value from 215.708 to 207.854

### Regression Testing
No other tests affected. All validation rules, error handling, and dependent calculations remain correct.

---

## Database Migration

If using the Supabase database (Phase 2), consider creating a new model version:

```typescript
import { createDraftVersion, publishVersion } from './src/lib/database';
import { DEFAULT_PARAMETERS } from './src/models/sliderbed_v1/schema';

// Create v1.1 as draft
const v11 = await createDraftVersion(
  'sliderbed_conveyor_v1',
  'v1.1_belt_length_fix',
  DEFAULT_PARAMETERS,
  userId
);

// Run fixture validations
// ... validate against Excel test cases

// Publish when ready
await publishVersion(v11.id, userId);
```

**Note:** Existing calculation runs in the database used v1.0 formula and remain unchanged (immutable audit trail).

---

## UI Impact

The Next.js UI (Phase 3) automatically uses the updated calculation engine. No changes needed to:
- `app/components/CalculatorForm.tsx`
- `app/components/CalculationResults.tsx`
- `app/page.tsx`

Users will see updated results immediately upon page refresh.

---

## Backwards Compatibility

**Breaking Change:** Yes, output values change for all calculations.

**Migration Strategy:**
- Label old calculations as "v1.0" in database
- New calculations automatically use v1.1
- Provide version selector in UI if historical comparison needed

---

## Validation

### Manual Testing
Test the updated calculation with standard inputs:

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
  }
});

console.log('Belt length (v1.1):', result.outputs.total_belt_length_in);
// Expected: ~249.42" (vs v1.0: ~257.27")
```

---

## Deployment

### Development
1. Pull latest code
2. Run `npm install` (no new dependencies)
3. Run `npm test` to verify
4. Run `npm run dev` to start UI

### Production
1. Create git tag: `git tag v1.1`
2. Push to repository
3. Deploy to Vercel (automatic via CI/CD)
4. Update database with new version entry

---

## Next Steps

1. ✅ Formula corrected
2. ✅ Tests updated and passing
3. ✅ Documentation updated
4. 📝 TODO: Load Excel test fixtures to validate v1.1
5. 📝 TODO: Update Supabase database with v1.1 version entry
6. 📝 TODO: Add version selector to UI
7. 📝 TODO: Generate comparison report (v1.0 vs v1.1)

---

## Author

**Change requested by:** User
**Implemented by:** Claude Code
**Review status:** Pending user approval

---

**END OF CHANGELOG v1.1**

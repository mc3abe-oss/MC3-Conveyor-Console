# POWER-USER PARAMETERS - UI TEST GUIDE

**Date:** 2025-12-19
**Version:** v1.2
**Status:** Ready for Testing

---

## Test Objectives

Verify that power-user parameters are:
1. Visible in the UI form
2. Included in calculation payload
3. Correctly processed by calculation engine
4. Displayed in results with "used" values

---

## UI Changes Made

### CalculatorForm.tsx
**Added 4 new input fields:**
- Safety Factor (1.0-5.0, default: 2.0)
- Belt Coefficient PIW (0.05-0.30, default: auto)
- Belt Coefficient PIL (0.05-0.30, default: auto)
- Base Belt Pull (0-200 lb/ft, default: 75)

**Location:** New section "Power-User Parameters" after "Product / Part" section

**Features:**
- Optional fields (can be left empty for defaults)
- Placeholder text showing defaults
- Min/max/step validation
- Clear labels with ranges

### CalculationResults.tsx
**Added new results section:**
- "Parameters Used" box (gray background)
- Shows all 4 power-user parameter used values
- Clear display of what was actually used in calculation

---

## Test Scenarios

### Test 1: Default Behavior (No Overrides)

**Steps:**
1. Navigate to http://localhost:3000
2. Fill in standard inputs only (leave power-user fields empty)
3. Click "Calculate"

**Expected Results:**
- Calculation succeeds
- Parameters Used shows:
  - Safety Factor: 2.00
  - Belt Coeff (piw): 0.138 (for 2.5" pulley) or 0.109 (other)
  - Belt Coeff (pil): 0.138 (for 2.5" pulley) or 0.109 (other)
  - Base Belt Pull: 75.0 lb/ft

**Verification:** All defaults match parameters from schema.ts

---

### Test 2: Custom Safety Factor

**Steps:**
1. Fill in standard inputs
2. Set Safety Factor = 3.0
3. Leave other power-user fields empty
4. Click "Calculate"

**Expected Results:**
- Calculation succeeds
- Parameters Used shows:
  - Safety Factor: **3.00** (custom)
  - Belt Coeff (piw): 0.138 or 0.109 (default)
  - Belt Coeff (pil): 0.138 or 0.109 (default)
  - Base Belt Pull: 75.0 lb/ft (default)
- Torque value should be **1.5x higher** than Test 1 (3.0/2.0 = 1.5)

**Verification:** Compare torque_drive_shaft_inlbf between Test 1 and Test 2

---

### Test 3: Custom Belt Coefficients

**Steps:**
1. Fill in standard inputs
2. Set Belt Coefficient PIW = 0.15
3. Set Belt Coefficient PIL = 0.12
4. Leave safety_factor and base_belt_pull_lb_per_ft empty
5. Click "Calculate"

**Expected Results:**
- Calculation succeeds
- Parameters Used shows:
  - Safety Factor: 2.00 (default)
  - Belt Coeff (piw): **0.150** (custom)
  - Belt Coeff (pil): **0.120** (custom)
  - Base Belt Pull: 75.0 lb/ft (default)
- Belt Weight should be **different** from Test 1

**Verification:**
- piw_used = 0.150
- pil_used = 0.120
- Belt weight changes proportionally

---

### Test 4: Custom Base Belt Pull

**Steps:**
1. Fill in standard inputs
2. Set Base Belt Pull = 100
3. Leave other power-user fields empty
4. Click "Calculate"

**Expected Results:**
- Calculation succeeds
- Parameters Used shows:
  - Safety Factor: 2.00 (default)
  - Belt Coeff (piw): 0.138 or 0.109 (default)
  - Belt Coeff (pil): 0.138 or 0.109 (default)
  - Base Belt Pull: **100.0 lb/ft** (custom)
- Base Belt Pull Total should be **133% of Test 1** (100/75 = 1.33)

**Verification:** Compare base_belt_pull_total_lbf between tests

---

### Test 5: All Custom Parameters

**Steps:**
1. Fill in standard inputs:
   - Conveyor Length: 120"
   - Conveyor Width: 24"
   - Pulley Diameter: 2.5"
   - Belt Speed: 100 FPM
   - Part Weight: 5 lbs
   - Part Length: 12"
   - Part Width: 6"
   - Spacing: 0.5 ft
   - Orientation: Lengthwise
   - Temperature: Ambient
   - Oil: None

2. Set ALL power-user parameters:
   - Safety Factor: 2.5
   - Belt Coefficient PIW: 0.15
   - Belt Coefficient PIL: 0.15
   - Base Belt Pull: 90

3. Click "Calculate"

**Expected Results:**
- Calculation succeeds
- Parameters Used shows:
  - Safety Factor: **2.50**
  - Belt Coeff (piw): **0.150**
  - Belt Coeff (pil): **0.150**
  - Base Belt Pull: **90.0 lb/ft**

**Expected Outputs (approximate):**
- Drive Shaft RPM: ~152.79 (unchanged from defaults)
- Belt Weight: Higher than default (0.15² vs 0.138²)
- Torque: Higher than default (2.5 vs 2.0 safety factor)
- Base Belt Pull Total: Higher (90 vs 75)

---

### Test 6: Validation - Out of Range Safety Factor

**Steps:**
1. Fill in standard inputs
2. Set Safety Factor = 6.0 (exceeds max of 5.0)
3. Click "Calculate"

**Expected Results:**
- Calculation **FAILS**
- Error message: "Safety factor must be <= 5.0"
- Red error box displayed

---

### Test 7: Validation - Out of Range Belt Coefficient

**Steps:**
1. Fill in standard inputs
2. Set Belt Coefficient PIW = 0.35 (exceeds max of 0.30)
3. Click "Calculate"

**Expected Results:**
- Calculation **FAILS**
- Error message: "Belt coefficient piw should be between 0.05 and 0.30"
- Red error box displayed

---

### Test 8: Validation - Negative Base Belt Pull

**Steps:**
1. Fill in standard inputs
2. Set Base Belt Pull = -10
3. Click "Calculate"

**Expected Results:**
- Calculation **FAILS**
- Error message: "Base belt pull must be >= 0"
- Red error box displayed

---

### Test 9: Validation - Zero Belt Coefficient

**Steps:**
1. Fill in standard inputs
2. Set Belt Coefficient PIW = 0
3. Click "Calculate"

**Expected Results:**
- Calculation **FAILS**
- Error message: "Belt coefficient piw must be > 0"
- Red error box displayed

---

### Test 10: Partial Overrides

**Steps:**
1. Fill in standard inputs
2. Set Safety Factor = 1.5
3. Set Base Belt Pull = 50
4. Leave belt coefficients empty
5. Click "Calculate"

**Expected Results:**
- Calculation succeeds
- Parameters Used shows:
  - Safety Factor: **1.50** (custom)
  - Belt Coeff (piw): 0.138 or 0.109 (default)
  - Belt Coeff (pil): 0.138 or 0.109 (default)
  - Base Belt Pull: **50.0 lb/ft** (custom)

---

## Visual Verification Checklist

### Form Section
- [ ] Power-User Parameters section visible
- [ ] Section labeled "(Optional)"
- [ ] 4 input fields present
- [ ] Placeholder text shows defaults
- [ ] Labels show ranges
- [ ] Inputs accept decimal values
- [ ] Empty inputs allowed (don't show errors)

### Results Section
- [ ] "Parameters Used" box visible (gray background)
- [ ] Shows 4 rows
- [ ] Safety Factor displayed to 2 decimals
- [ ] Belt coeffs displayed to 3 decimals
- [ ] Base Belt Pull shows "lb/ft" unit
- [ ] Values match what was entered (or defaults if empty)

---

## Data Persistence Test

### Test 11: Verify Payload Structure

**Steps:**
1. Open browser DevTools → Network tab
2. Fill in all inputs including power-user params
3. Click "Calculate"
4. Inspect calculation request payload

**Expected Payload Structure:**
```json
{
  "inputs": {
    "conveyor_length_cc_in": 120,
    "conveyor_width_in": 24,
    // ... other required inputs ...
    "safety_factor": 3.0,
    "belt_coeff_piw": 0.15,
    "belt_coeff_pil": 0.12,
    "base_belt_pull_lb_per_ft": 100
  }
}
```

**Note:** Since calculations run client-side, check the inputs state in React DevTools or add console.log to CalculatorForm.tsx

---

## Regression Tests

### Test 12: Existing Functionality Unaffected

**Steps:**
1. Use calculator without touching power-user parameters
2. Run several calculations with different standard inputs
3. Verify results match expected values

**Expected:**
- No errors
- Results consistent with v1.1
- All existing tests still pass: `npm test`

---

## Browser Testing

Test in:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari

**Check:**
- Input validation works
- Number inputs accept decimals
- Placeholders display correctly
- Results render properly

---

## Performance Test

**Steps:**
1. Fill in all inputs
2. Click "Calculate" multiple times rapidly
3. Observe responsiveness

**Expected:**
- Calculations complete in < 10ms
- UI remains responsive
- No lag or freezing

---

## Next Steps After Testing

If all tests pass:
1. ✅ Mark v1.2 UI integration complete
2. 📝 Document any issues found
3. 🎨 Plan UI/layout refactor (collapsible sections, better organization)
4. 💾 Implement database persistence for calculation runs
5. 📊 Add calculation history viewer

---

## Known Limitations

- No "Reset to Defaults" button (can refresh page)
- No visual indicator of which params are custom vs default (besides comparing to displayed "used" values)
- No preset library (e.g., "High Safety", "Abrasive Environment")
- Parameters are client-side only (not saved to database yet)

---

## Success Criteria

✅ **PASS if:**
- All 12 tests pass
- Custom values correctly override defaults
- Used values display accurately
- Validation errors show properly
- No console errors
- Existing functionality unaffected

❌ **FAIL if:**
- Custom parameters ignored
- Defaults not applied correctly
- Validation doesn't work
- UI crashes or errors
- Results incorrect

---

**READY FOR USER TESTING**

Navigate to: **http://localhost:3000**

Power-User Parameters section should be visible at the bottom of the form, above the Calculate button.

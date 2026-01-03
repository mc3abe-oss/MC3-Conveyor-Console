# Golden Contract Output Fixtures

This folder contains golden fixtures for validating sliderbed_v1 contract outputs.

## Purpose

Golden fixtures serve as regression baselines for the 19 contract outputs defined in
`docs/review/contract-outputs-sliderbed-v1.md`. They ensure that refactoring or UI
changes don't accidentally alter critical sizing, safety, and selection calculations.

## Fixture Status

| Status | Meaning | Test Behavior |
|--------|---------|---------------|
| `pending` | Awaiting Excel baseline | Prints baseline report, does not fail |
| `golden` | Validated against Excel | Asserts within tolerance, fails on mismatch |

## How to Promote pending → golden

1. **Run tests to get baseline report:**
   ```bash
   npm test -- src/tests/fixtures/golden/sliderbed_v1/golden-contract-outputs.test.ts
   ```

2. **Copy the baseline table** from the console output.

3. **Validate in Excel:**
   - Use the documented formulas to calculate expected values
   - Compare against the actual values from the baseline report

4. **Update the fixture file:**
   - Change `"status": "pending"` to `"status": "golden"`
   - Fill in `"value"` fields with the Excel-validated expected values

   Example:
   ```json
   "torque_drive_shaft_inlbf": { "value": 42.35, "tol_abs": 0.1 }
   ```

5. **Re-run tests** to verify the fixture passes.

## Tolerance Specification

Each expected value can have tolerance specified:

| Field | Type | Description |
|-------|------|-------------|
| `value` | number/boolean/string/null | Expected value. null = pending |
| `tol_abs` | number | Absolute tolerance (±). E.g., 0.1 means ±0.1 |
| `tol_rel` | number | Relative tolerance (fraction). E.g., 0.01 = ±1% |

**Priority:** `tol_abs` takes precedence over `tol_rel`.

**Default tolerances by output type:**
- Force/pull (lbf): ±0.1 or ±1 depending on magnitude
- Torque (in-lbf): ±0.1
- RPM: ±1 (integer)
- Ratios: ±0.01
- Shaft diameters: ±0.0625" (1/16")
- Belt length: ±1"
- Booleans/enums: exact match

## Fixture File Format

```json
{
  "id": "unique-fixture-id",
  "status": "pending|golden",
  "intent": "regression|edge|safety|ux",
  "description": "Human-readable description of the scenario",
  "inputs": {
    // Partial SliderbedInputs - model fills defaults
    "conveyor_length_cc_in": 120,
    "belt_width_in": 24,
    // ...
  },
  "expected": {
    "torque_drive_shaft_inlbf": { "value": 42.35, "tol_abs": 0.1 },
    "drive_shaft_rpm": { "value": 47, "tol_abs": 1 },
    // ... other contract outputs
  }
}
```

## Intent Categories

| Intent | Purpose |
|--------|---------|
| `regression` | Typical use case - catches unintended changes |
| `edge` | Edge case or boundary condition |
| `safety` | Safety-critical scenario (min pulley, tube stress) |
| `ux` | User experience scenario (common configuration) |

## Adding New Fixtures

1. Create a new file: `NN-description.fixture.json`
2. Set `status: "pending"` initially
3. Define realistic inputs for the scenario
4. Set all expected values to `null` with appropriate tolerances
5. Run tests to generate baseline
6. Validate in Excel and promote to golden

## Contract Output Keys

See `docs/review/contract-outputs-sliderbed-v1.md` for the full list of 19 contract outputs.

Quick reference:
- **Motor/Drive:** torque_drive_shaft_inlbf, drive_shaft_rpm, gearmotor_output_rpm, gear_ratio, chain_ratio
- **Belt Pull:** total_belt_pull_lb, friction_pull_lb, incline_pull_lb, drive_T1_lbf, drive_T2_lbf
- **Shaft:** drive_shaft_diameter_in, tail_shaft_diameter_in, drive_pulley_resultant_load_lbf
- **Min Pulley:** required_min_pulley_diameter_in, drive_pulley_meets_minimum, tail_pulley_meets_minimum
- **Safety/Core:** pci_tube_stress_status, belt_speed_fpm, total_belt_length_in

# Golden Fixtures Review

> Opus Greenfield Review - January 2026

## Current Fixture Status

### fixtures.ts Analysis

**Location:** `src/models/sliderbed_v1/fixtures.ts`
**Size:** 227 lines

**Current State:**
```typescript
// Line 177-180
export const ALL_FIXTURES: TestFixture[] = [
  // EXAMPLE_FIXTURE,
  // Add more fixtures here as they are extracted from Excel
];
```

**Finding:** The fixture registry is **EMPTY**. The only fixture is an example/placeholder.

---

## What Exists

### Test Coverage (model.test.ts)

**Test Count:** 349 individual test cases
**Coverage Type:** Unit tests, not integration fixtures

**Test Categories:**
| Category | Count | Type |
|----------|-------|------|
| Basic Calculations | ~10 | Unit |
| Input Validation | ~20 | Unit |
| Application Rules | ~15 | Unit |
| Formula Correctness | ~20 | Unit |
| Parameter Overrides | ~10 | Unit |
| Belt Tracking | ~30 | Unit |
| Incline Calculations | ~15 | Unit |
| Floor Support | ~18 | Unit |
| ... | ~211 | Various |

**Gap:** Tests verify individual behaviors, not end-to-end Excel parity.

---

### Tolerance Definition

**Default Tolerance:** 0.5% (`DEFAULT_TOLERANCE = 0.005`)

**Tolerance Helper:**
```typescript
export function isWithinTolerance(
  actual: number,
  expected: number,
  tolerance: number = DEFAULT_TOLERANCE
): boolean {
  const absoluteTolerance = Math.abs(expected * tolerance);
  return Math.abs(actual - expected) <= absoluteTolerance;
}
```

**Gap:** No per-field tolerance overrides are in use.

---

## Fixture Gaps

### Critical Gaps

1. **No Excel-derived fixtures**
   - No actual Excel calculation outputs captured
   - Cannot verify Excel parity claim

2. **No edge case fixtures**
   - Maximum incline (45°)
   - Maximum length
   - Minimum belt width
   - High speed scenarios

3. **No failure case fixtures**
   - Expected validation errors
   - Expected warnings

4. **No regression fixtures**
   - No captured "known good" outputs from previous versions

---

## Proposed Minimal Golden Set

### Category 1: Typical Cases (5 fixtures)

| ID | Description | Key Parameters |
|----|-------------|----------------|
| TYPICAL-01 | Basic flat conveyor | 120" length, 24" belt, 0° incline |
| TYPICAL-02 | Moderate incline | 240" length, 18" belt, 15° incline |
| TYPICAL-03 | V-guided tracking | V-guide, crowned pulleys |
| TYPICAL-04 | Cleated belt | Cleats enabled, 4" cleats |
| TYPICAL-05 | High capacity | Heavy parts, wide belt |

### Category 2: Edge Cases (5 fixtures)

| ID | Description | Key Parameters |
|----|-------------|----------------|
| EDGE-01 | Maximum incline | 45° incline |
| EDGE-02 | Very long conveyor | 600" length |
| EDGE-03 | Narrow belt | 6" belt width |
| EDGE-04 | High speed | 300+ FPM |
| EDGE-05 | Minimum pulley | Smallest allowed pulley |

### Category 3: Failure Cases (5 fixtures)

| ID | Description | Expected Result |
|----|-------------|-----------------|
| FAIL-01 | Red hot parts | ERROR: Temperature |
| FAIL-02 | Excessive incline | ERROR: >45° |
| FAIL-03 | Negative length | ERROR: Validation |
| FAIL-04 | Zero RPM | ERROR: Validation |
| FAIL-05 | Missing required field | ERROR: Validation |

### Category 4: Regression Cases (5 fixtures)

| ID | Description | Captures |
|----|-------------|----------|
| REG-01 | Floor support v1.40 | TOB decoupled from legs |
| REG-02 | Shaft sizing v1.12 | Von Mises calculation |
| REG-03 | Geometry modes v1.10 | L_ANGLE, H_TOB modes |
| REG-04 | Cleats v1.23 | Min pulley from cleats |
| REG-05 | PCI checks v1.27 | Tube stress validation |

---

## Tolerance Recommendations

### Output-Specific Tolerances

| Output Type | Tolerance | Rationale |
|-------------|-----------|-----------|
| Shaft diameters | ±0.001" | High precision for machining |
| Belt length | ±0.1" | Low precision OK |
| Pulley face | ±0.0625" | 1/16" increments |
| Forces (lbf) | ±0.5% | Relative tolerance |
| RPM | ±0.1 | Low precision OK |
| Angles | ±0.01° | High precision for incline |
| Torque | ±0.5% | Relative tolerance |

### Rounding Expectations

| Output | Rounding | Example |
|--------|----------|---------|
| Shaft diameter | 3 decimal places | 1.375" |
| Belt length | 1 decimal place | 120.5" |
| Pulley face | 0.25" increments | 26.25" |
| Frame height | 0.125" increments | 36.125" |
| Cleat min pulley | 0.25" rounded up | 8.25" |

---

## Implementation Plan

### Step 1: Create Fixture Template

```typescript
export interface GoldenFixture extends TestFixture {
  /** Source of expected values */
  source: 'excel' | 'regression' | 'manual';

  /** Excel file/tab reference if applicable */
  excel_reference?: string;

  /** Date fixture was created */
  created_at: string;

  /** Model version fixture was created against */
  model_version: string;

  /** Per-field tolerance overrides */
  field_tolerances?: Partial<Record<keyof SliderbedOutputs, number>>;
}
```

### Step 2: Capture Excel Cases

1. Open Excel calculator
2. Enter each TYPICAL/EDGE case inputs
3. Record all outputs
4. Create fixture entry with `source: 'excel'`

### Step 3: Capture Regression Cases

1. Run current model with REG-* inputs
2. Record outputs as "known good"
3. Create fixture entry with `source: 'regression'`

### Step 4: Add Fixture Test

```typescript
describe('Golden Fixtures', () => {
  GOLDEN_FIXTURES.forEach(fixture => {
    it(`should match golden: ${fixture.name}`, () => {
      const result = runCalculation({ inputs: fixture.inputs });
      expect(result.success).toBe(true);

      const comparison = compareOutputs(
        result.outputs!,
        fixture.expected_outputs,
        fixture.field_tolerances ?? fixture.tolerance
      );

      expect(comparison.passed).toBe(true);
      if (!comparison.passed) {
        console.log('Failures:', comparison.failures);
      }
    });
  });
});
```

---

## Immediate Action Items

1. **CRITICAL:** Obtain Excel calculator file
2. **CRITICAL:** Create 5 TYPICAL fixtures
3. **HIGH:** Create 5 EDGE fixtures
4. **MEDIUM:** Create 5 FAIL fixtures
5. **LOW:** Create 5 REGRESSION fixtures

---

## Maintenance Policy

1. **Before any refactor:** Verify all golden fixtures pass
2. **After any change:** Verify all golden fixtures pass
3. **On model version bump:** Add regression fixture
4. **On Excel update:** Update TYPICAL fixtures

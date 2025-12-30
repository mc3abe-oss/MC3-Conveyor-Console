# PCI Pulley Guide Integration - Modification Plan (v2.1)

**Version:** v1.27
**Date:** 2025-12-30
**Status:** APPROVED with 5 edits applied
**Source:** PCI Conveyor Pulley Selection Guide Rev 2.1 (05/21/2025), Appendix A

---

## Approval Edits Applied

1. **Auto-populate tube geometry** from pulley family/variant; optional override inputs only if data missing
2. **Estimated hub_centers flagged** - status is "estimated" not "pass" when defaulting
3. **Geometry guardrails** - OD≤0/wall≤0 → incomplete; ID≤0/(OD⁴-ID⁴)≤0 → error
4. **V-groove detection documented as limitation** - use pulley catalog face profile if available
5. **Regression tests use mustNotChange only** - no hardcoded shaft diameter expectations

---

## 0. Key Mapping (from Load Mapping Report)

| PCI Concept | PCI Symbol | Our System Variable | Location | Status |
|-------------|------------|---------------------|----------|--------|
| Resultant pulley load | **F** | `radial_load_lbf` | shaftCalc.ts:172-174 | Computed, not exposed |
| Effective tension | Te | `total_belt_pull_lb` | formulas.ts:954 | In schema |
| Tight side tension | T1 | `T1_lbf` | shaftCalc.ts:168 | Computed, not exposed |
| Slack side tension | T2 | `T2_lbf` | shaftCalc.ts:167 | Computed, not exposed |

**Action:** Wire `radial_load_lbf` to schema outputs. No formula changes.

---

## 1. New Output Schema Keys

**File:** `src/models/sliderbed_v1/schema.ts`

### 1.1 Resultant Load Outputs (wire-only)

```typescript
// =========================================================================
// v1.27: PCI PULLEY LOAD OUTPUTS (wired from shaftCalc, no new math)
// =========================================================================

/**
 * Resultant load on drive pulley (lbf)
 * Vector sum of T1 + T2 belt tensions.
 * Source: shaftCalc.radial_load_lbf
 * Equivalent to PCI "F" for tube stress calculations.
 */
drive_pulley_resultant_load_lbf?: number;

/**
 * Resultant load on tail pulley (lbf)
 * Source: shaftCalc.radial_load_lbf (tail calculation)
 */
tail_pulley_resultant_load_lbf?: number;

/**
 * Tight side belt tension at drive pulley (lbf)
 * Source: shaftCalc.T1_lbf
 */
drive_T1_lbf?: number;

/**
 * Slack side belt tension at drive pulley (lbf)
 * Source: shaftCalc.T2_lbf
 */
drive_T2_lbf?: number;
```

### 1.2 Tube Stress Outputs (new calculation)

```typescript
// =========================================================================
// v1.27: PCI TUBE STRESS OUTPUTS (new calculation)
// =========================================================================

/**
 * Drive pulley tube stress (psi)
 * PCI Formula: σ = 8(OD)(F)(H) / (π(OD⁴ - ID⁴))
 * Undefined if tube geometry not provided.
 */
pci_drive_tube_stress_psi?: number;

/**
 * Tail pulley tube stress (psi)
 */
pci_tail_tube_stress_psi?: number;

/**
 * Tube stress limit applied (psi)
 * 10,000 for drum pulleys, 3,400 for V-groove pulleys
 */
pci_tube_stress_limit_psi?: number;

/**
 * PCI tube stress check status
 * - "pass": stress ≤ limit (all geometry provided)
 * - "estimated": stress ≤ limit but hub_centers was defaulted
 * - "warn": stress > limit (default mode)
 * - "fail": stress > limit (enforce mode)
 * - "incomplete": missing tube geometry inputs
 * - "error": invalid geometry (ID≤0 or OD⁴-ID⁴≤0)
 */
pci_tube_stress_status?: 'pass' | 'estimated' | 'warn' | 'fail' | 'incomplete' | 'error';
```

---

## 2. New Input Schema Keys

**File:** `src/models/sliderbed_v1/schema.ts`

### 2.1 Tube Geometry Inputs (Auto-Populated with Optional Override)

```typescript
// =========================================================================
// v1.27: PCI TUBE GEOMETRY INPUTS (auto-populated, with override)
// =========================================================================

/**
 * Hub center-to-center distance (inches)
 * Distance between hub contact points on the pulley.
 * DEFAULT: belt_width_in (flagged as "estimated")
 * Override: User can provide actual value for accurate check.
 */
hub_centers_in?: number;

/**
 * Drive pulley tube OD (inches) - OVERRIDE ONLY
 * AUTO-POPULATED from pulley family/variant shell_od_in if available.
 * Only use this input when variant lacks shell data.
 */
drive_tube_od_in?: number;

/**
 * Drive pulley tube wall thickness (inches) - OVERRIDE ONLY
 * AUTO-POPULATED from pulley family/variant shell_wall_in if available.
 */
drive_tube_wall_in?: number;

/**
 * Tail pulley tube OD (inches) - OVERRIDE ONLY
 */
tail_tube_od_in?: number;

/**
 * Tail pulley tube wall thickness (inches) - OVERRIDE ONLY
 */
tail_tube_wall_in?: number;

/**
 * Enforce PCI checks as hard errors (default: false)
 * When false: violations are warnings
 * When true: violations are errors that block calculation
 */
enforce_pci_checks?: boolean;
```

### 2.2 Auto-Population Logic

```typescript
// Priority: User override > Pulley variant > Pulley family > undefined
const driveOD = inputs.drive_tube_od_in
  ?? pulleyVariant?.shell_od_in
  ?? pulleyFamily?.shell_od_in;

const driveWall = inputs.drive_tube_wall_in
  ?? pulleyVariant?.shell_wall_in
  ?? pulleyFamily?.shell_wall_in;

// Hub centers: user override > default to belt width (flagged)
const hubCentersProvided = inputs.hub_centers_in !== undefined;
const hubCentersIn = inputs.hub_centers_in ?? inputs.belt_width_in;
```

---

## 3. Tube Stress Calculation Design

### 3.1 PCI Formula (from Appendix A, p.34)

```
σ_tube = 8(OD)(F)(H) / (π(OD⁴ - ID⁴))
```

**Where:**
- OD = tube outer diameter (inches)
- ID = OD - 2×wall (tube inner diameter)
- F = `radial_load_lbf` from shaftCalc (PCI "F")
- H = hub_centers_in

### 3.2 Implementation Location

**File:** `src/models/sliderbed_v1/pciChecks.ts` (NEW)

```typescript
export interface PciTubeStressInputs {
  tube_od_in: number;
  tube_wall_in: number;
  hub_centers_in: number;
  radial_load_lbf: number;
}

export interface PciTubeStressResult {
  stress_psi: number | undefined;
  status: 'pass' | 'estimated' | 'warn' | 'fail' | 'incomplete' | 'error';
  error_message?: string;
}

export function calculatePciTubeStress(
  inputs: PciTubeStressInputs,
  stressLimitPsi: number,
  hubCentersEstimated: boolean,
  enforceChecks: boolean
): PciTubeStressResult {
  const { tube_od_in: OD, tube_wall_in: wall, hub_centers_in: H, radial_load_lbf: F } = inputs;

  // Geometry guardrails (Edit #3)
  if (OD <= 0 || wall <= 0) {
    return { stress_psi: undefined, status: 'incomplete' };
  }

  const ID = OD - 2 * wall;
  if (ID <= 0) {
    return {
      stress_psi: undefined,
      status: 'error',
      error_message: `Invalid tube geometry: wall thickness (${wall}") exceeds radius (${OD / 2}")`,
    };
  }

  const od4 = Math.pow(OD, 4);
  const id4 = Math.pow(ID, 4);
  if (od4 - id4 <= 0) {
    return {
      stress_psi: undefined,
      status: 'error',
      error_message: `Invalid tube geometry: OD⁴ - ID⁴ ≤ 0`,
    };
  }

  // σ = 8(OD)(F)(H) / (π(OD⁴ - ID⁴))
  const numerator = 8 * OD * F * H;
  const denominator = Math.PI * (od4 - id4);
  const stressPsi = numerator / denominator;

  // Determine status
  const exceeds = stressPsi > stressLimitPsi;
  let status: PciTubeStressResult['status'];

  if (exceeds) {
    status = enforceChecks ? 'fail' : 'warn';
  } else if (hubCentersEstimated) {
    status = 'estimated'; // Edit #2: flag as estimated, not authoritative pass
  } else {
    status = 'pass';
  }

  return { stress_psi: stressPsi, status };
}
```

### 3.3 Integration in formulas.ts

```typescript
// After shaft sizing calculation, extract radial loads
const driveRadialLoadLbf = driveShaftSizing.radial_load_lbf;
const tailRadialLoadLbf = tailShaftSizing.radial_load_lbf;

// PCI tube stress (only if geometry provided)
let pciDriveTubeStressPsi: number | undefined;
let pciTailTubeStressPsi: number | undefined;

const hubCentersIn = inputs.hub_centers_in ?? inputs.belt_width_in; // default

if (inputs.drive_tube_od_in && inputs.drive_tube_wall_in) {
  pciDriveTubeStressPsi = calculatePciTubeStress({
    tube_od_in: inputs.drive_tube_od_in,
    tube_wall_in: inputs.drive_tube_wall_in,
    hub_centers_in: hubCentersIn,
    radial_load_lbf: driveRadialLoadLbf,
  });
}

// Similar for tail...
```

---

## 4. Defaults and Warnings Strategy

### 4.1 hub_centers_in Default

| Scenario | Default Value | Rationale |
|----------|---------------|-----------|
| Not provided | `belt_width_in` | Hub centers typically ≈ face width |
| Provided | Use as-is | User knows their geometry |

**Note:** PCI uses "Face Width + 4D - Hub Centers" as bearing span estimate (p.32). We already have bearing_span hardcoded as `belt_width + 5"` in shaftCalc. This is close to PCI's "Face Width + 4D" for typical shaft sizes.

### 4.2 Tube Geometry Auto-Population

When pulley variant is selected:
- `drive_tube_od_in` defaults from `family.shell_od_in`
- `drive_tube_wall_in` defaults from `family.shell_wall_in`

If variant not selected or family lacks shell data: undefined (no PCI check).

### 4.3 Warning Messages

| Condition | Code | Severity | Message |
|-----------|------|----------|---------|
| Tube geometry missing | `PCI_GEOMETRY_INCOMPLETE` | info | "PCI tube stress check requires tube OD and wall thickness." |
| hub_centers_in defaulted | `PCI_HUB_CENTERS_ESTIMATED` | info | "Hub centers defaulted to belt width ({value}"). For accurate PCI check, provide actual hub centers." |
| Tube stress > limit | `PCI_TUBE_STRESS_EXCEEDED` | warning/error | "Drive pulley tube stress ({value} psi) exceeds PCI limit ({limit} psi)." |

---

## 5. Stress Limit Rules

### 5.1 Drum vs V-Groove Detection

**LIMITATION (Edit #4):** Current detection uses belt tracking method as proxy. If pulley catalog has `face_profile` or `pulley_type` field indicating V-groove, prefer that over tracking method inference.

```typescript
// v1.27: V-groove detection via tracking method proxy
// TODO: Use pulley catalog face_profile if available in future version
const isVGroovePulley =
  inputs.belt_tracking_method === 'V-guided' &&
  inputs.v_guide_key !== undefined;

// Select limit per PCI p.34
const tubeStressLimitPsi = isVGroovePulley ? 3400 : 10000;
```

### 5.2 Validation Rule

**File:** `src/models/sliderbed_v1/rules.ts`

```typescript
// v1.27: PCI tube stress check
if (outputs.pci_drive_tube_stress_psi !== undefined) {
  const limit = outputs.pci_tube_stress_limit_psi ?? 10000;

  if (outputs.pci_drive_tube_stress_psi > limit) {
    const severity = inputs.enforce_pci_checks ? 'error' : 'warning';
    issues.push({
      code: 'PCI_DRIVE_TUBE_STRESS_EXCEEDED',
      field: 'drive_tube_od_in',
      message: `Drive pulley tube stress (${Math.round(outputs.pci_drive_tube_stress_psi).toLocaleString()} psi) exceeds PCI limit (${limit.toLocaleString()} psi). Consider larger shell diameter or thicker wall.`,
      severity,
    });
  }
}

// Similar for tail pulley...
```

---

## 6. Test Fixtures

### 6.1 Regression: Existing Outputs Unchanged

**Edit #5:** No hardcoded expectations. Test asserts outputs don't change vs baseline.

```json
{
  "name": "Regression: Existing outputs unchanged by PCI addition",
  "inputs": {
    "conveyor_length_cc_in": 120,
    "belt_width_in": 24,
    "belt_speed_fpm": 100,
    "drive_pulley_diameter_in": 6,
    "tail_pulley_diameter_in": 6,
    "unit_weight_lb": 50,
    "load_density_lb_per_ft": 10
  },
  "mustNotChange": [
    "drive_shaft_diameter_in",
    "tail_shaft_diameter_in",
    "total_belt_pull_lb",
    "friction_pull_lb",
    "incline_pull_lb",
    "starting_belt_pull_lb",
    "von_mises_stress_psi"
  ],
  "note": "Run baseline before PCI changes, then verify these keys produce identical values after"
}
```

### 6.2 New Output: Resultant Load Equals shaftCalc Value

```json
{
  "name": "New output: drive_pulley_resultant_load_lbf matches shaftCalc",
  "inputs": {
    "conveyor_length_cc_in": 120,
    "belt_width_in": 24,
    "belt_speed_fpm": 100,
    "drive_pulley_diameter_in": 6,
    "tail_pulley_diameter_in": 6,
    "unit_weight_lb": 50,
    "load_density_lb_per_ft": 10
  },
  "expectedOutputs": {
    "drive_pulley_resultant_load_lbf": { "greaterThan": 0 },
    "tail_pulley_resultant_load_lbf": { "greaterThan": 0 }
  },
  "validation": "drive_pulley_resultant_load_lbf equals T1 + T2 for 180° wrap"
}
```

### 6.3 Tube Stress: Geometry Incomplete

```json
{
  "name": "PCI: Tube stress incomplete when geometry missing",
  "inputs": {
    "conveyor_length_cc_in": 120,
    "belt_width_in": 24,
    "drive_pulley_diameter_in": 6
  },
  "expectedOutputs": {
    "pci_drive_tube_stress_psi": "undefined",
    "pci_tube_stress_status": "incomplete"
  }
}
```

### 6.4 Tube Stress: Pass (Drum Pulley)

```json
{
  "name": "PCI: Tube stress PASS for adequately sized drum pulley",
  "inputs": {
    "conveyor_length_cc_in": 120,
    "belt_width_in": 24,
    "drive_pulley_diameter_in": 8,
    "unit_weight_lb": 50,
    "load_density_lb_per_ft": 10,
    "drive_tube_od_in": 8.0,
    "drive_tube_wall_in": 0.188,
    "hub_centers_in": 24
  },
  "expectedOutputs": {
    "pci_drive_tube_stress_psi": { "lessThan": 10000 },
    "pci_tube_stress_limit_psi": 10000,
    "pci_tube_stress_status": "pass"
  }
}
```

### 6.5 Tube Stress: Warning (Drum Pulley Exceeded)

```json
{
  "name": "PCI: Tube stress WARNING when drum exceeds 10,000 psi",
  "inputs": {
    "conveyor_length_cc_in": 120,
    "belt_width_in": 48,
    "belt_speed_fpm": 200,
    "drive_pulley_diameter_in": 4,
    "unit_weight_lb": 150,
    "load_density_lb_per_ft": 40,
    "drive_tube_od_in": 4.0,
    "drive_tube_wall_in": 0.083,
    "hub_centers_in": 48,
    "enforce_pci_checks": false
  },
  "expectedOutputs": {
    "pci_drive_tube_stress_psi": { "greaterThan": 10000 },
    "pci_tube_stress_status": "warn"
  },
  "expectedWarnings": [
    { "code": "PCI_DRIVE_TUBE_STRESS_EXCEEDED", "severity": "warning" }
  ]
}
```

### 6.6 Tube Stress: V-Groove Lower Limit

```json
{
  "name": "PCI: V-groove pulley uses 3,400 psi limit",
  "inputs": {
    "conveyor_length_cc_in": 120,
    "belt_width_in": 24,
    "drive_pulley_diameter_in": 6,
    "belt_tracking_method": "V-guided",
    "v_guide_key": "K10_SOLID",
    "drive_tube_od_in": 6.0,
    "drive_tube_wall_in": 0.134,
    "hub_centers_in": 24
  },
  "expectedOutputs": {
    "pci_tube_stress_limit_psi": 3400
  }
}
```

### 6.7 Tube Stress: Error (Enforce Mode)

```json
{
  "name": "PCI: Tube stress ERROR when enforce=true and exceeded",
  "inputs": {
    "conveyor_length_cc_in": 120,
    "belt_width_in": 48,
    "drive_pulley_diameter_in": 4,
    "drive_tube_od_in": 4.0,
    "drive_tube_wall_in": 0.083,
    "hub_centers_in": 48,
    "enforce_pci_checks": true
  },
  "expectedOutputs": {
    "pci_tube_stress_status": "fail"
  },
  "expectedErrors": [
    { "code": "PCI_DRIVE_TUBE_STRESS_EXCEEDED", "severity": "error" }
  ]
}
```

### 6.8 Tube Stress: Estimated (Hub Centers Defaulted)

```json
{
  "name": "PCI: Status 'estimated' when hub_centers defaulted",
  "inputs": {
    "conveyor_length_cc_in": 120,
    "belt_width_in": 24,
    "drive_pulley_diameter_in": 8,
    "drive_tube_od_in": 8.0,
    "drive_tube_wall_in": 0.188
  },
  "expectedOutputs": {
    "pci_tube_stress_status": "estimated",
    "pci_drive_tube_stress_psi": { "greaterThan": 0 }
  },
  "note": "hub_centers_in not provided, defaults to belt_width_in=24, status is 'estimated' not 'pass'"
}
```

### 6.9 Tube Stress: Invalid Geometry Error

```json
{
  "name": "PCI: Status 'error' when wall exceeds radius",
  "inputs": {
    "conveyor_length_cc_in": 120,
    "belt_width_in": 24,
    "drive_pulley_diameter_in": 6,
    "drive_tube_od_in": 4.0,
    "drive_tube_wall_in": 2.5,
    "hub_centers_in": 24
  },
  "expectedOutputs": {
    "pci_tube_stress_status": "error",
    "pci_drive_tube_stress_psi": "undefined"
  },
  "note": "Wall (2.5) exceeds radius (2.0), ID would be negative"
}
```

---

## 7. Implementation Files

| File | Action | Description |
|------|--------|-------------|
| `src/models/sliderbed_v1/schema.ts` | MODIFY | Add new inputs and outputs |
| `src/models/sliderbed_v1/pciChecks.ts` | CREATE | PCI tube stress calculation |
| `src/models/sliderbed_v1/formulas.ts` | MODIFY | Wire shaftCalc outputs, call pciChecks |
| `src/models/sliderbed_v1/rules.ts` | MODIFY | Add tube stress validation rules |
| `src/models/sliderbed_v1/model.test.ts` | MODIFY | Add test fixtures |

---

## 8. Acceptance Criteria

### 8.1 No Math Drift
- [ ] All existing outputs unchanged when PCI inputs not provided
- [ ] Regression fixture passes with exact values
- [ ] TypeScript compiles without errors

### 8.2 Resultant Load Wiring
- [ ] `drive_pulley_resultant_load_lbf` populated from shaftCalc.radial_load_lbf
- [ ] `tail_pulley_resultant_load_lbf` populated from shaftCalc.radial_load_lbf
- [ ] Values match internal shaftCalc computation exactly

### 8.3 Tube Stress Calculation
- [ ] PCI formula implemented correctly: σ = 8(OD)(F)(H) / (π(OD⁴-ID⁴))
- [ ] Returns undefined when geometry incomplete
- [ ] Uses hub_centers_in default of belt_width_in when not provided

### 8.4 Stress Limits
- [ ] Drum pulleys use 10,000 psi limit
- [ ] V-groove pulleys use 3,400 psi limit
- [ ] Limit correctly detected from belt_tracking_method + v_guide_key

### 8.5 Validation Rules
- [ ] Warning emitted when stress exceeds limit (default mode)
- [ ] Error emitted when stress exceeds limit (enforce mode)
- [ ] Info message when geometry incomplete

### 8.6 Test Coverage
- [ ] Regression fixture: existing outputs unchanged
- [ ] Resultant load fixture: new output equals shaftCalc value
- [ ] Incomplete geometry fixture: status = "incomplete"
- [ ] Pass fixture: drum below 10,000 psi
- [ ] Warning fixture: drum above 10,000 psi
- [ ] V-groove fixture: limit = 3,400 psi
- [ ] Error fixture: enforce_pci_checks = true

---

## 9. Out of Scope (Future)

- Bearing centers as configurable input (keep hardcoded for now)
- PCI shaft stress formula (our Von Mises is more conservative)
- PCI deflection allowable load calculation
- UI for Advanced Pulley Geometry section
- Auto-population of tube dimensions from pulley variant

---

*End of Modification Plan v2*

# Opus Analysis: PCI Pulley Guide Integration

**Date:** 2025-12-30
**Analyst:** Claude Opus 4.5
**Purpose:** Risk analysis and integration strategy for PCI Pulley Selection Guide

---

## 1. Overview

The PCI Pulley Selection Guide introduces engineering checks not currently present in the calculator:
- Tube stress calculations
- Deflection allowable load
- Stress allowable load
- Governing allowable load (limiting factor)
- Crown verification per CEMA B105.1
- Wrap angle guidance and effects

This analysis evaluates how to integrate these without breaking existing behavior.

---

## 2. Risks Identified

### 2.1 HIGH RISK: Math Drift
**Description:** Changing any existing formula could silently alter outputs for saved configurations.

**Mitigation:**
- All new calculations must be ADDITIVE outputs, not modifications to existing formulas
- Existing shaft sizing logic in `shaftCalc.ts` must not be touched
- New outputs like `tube_stress_psi` are separate from `von_mises_stress_psi`

### 2.2 MEDIUM RISK: Missing Geometry Inputs
**Description:** PCI calculations require bearing_centers_in, hub_centers_in, and tube dimensions that we don't currently collect.

**Mitigation:**
- Add as OPTIONAL Advanced inputs
- Provide sensible defaults/estimates when not specified
- New outputs are `undefined` when geometry is incomplete
- No errors on legacy configs - they simply don't get PCI outputs

### 2.3 MEDIUM RISK: Validation Strictness
**Description:** Adding hard errors for PCI violations could break valid legacy configurations.

**Mitigation:**
- All PCI checks are WARNINGS only by default
- Add `enforce_pci_checks` input flag (default: false)
- When flag is true, warnings become errors
- Legacy configs without the flag continue working unchanged

### 2.4 LOW RISK: UI Complexity
**Description:** Adding many new inputs/outputs could overwhelm users.

**Mitigation:**
- New inputs go in "Advanced Pulley Geometry" collapsible section
- New outputs go in "PCI Engineering Checks" collapsible results section
- Both default to collapsed/hidden
- Only show when user expands or when warnings exist

---

## 3. PCI Item Classification

### 3.1 Pure UI/Explanatory (SAFE)
| Item | Description | Risk |
|------|-------------|------|
| Wrap angle explanation | Why 180° is typical | None |
| Crown guidance text | When crown is needed | None |
| Deflection limit explanation | What 0.001×span means | None |
| Tube stress diagram | Visual aid | None |

**Action:** Add as help text/tooltips. No calculation changes.

### 3.2 New Validations - Warnings Only (SAFE)
| Validation | Trigger | Risk |
|------------|---------|------|
| Tube stress > allowable | When geometry provided | Low - warning only |
| Governing load < belt tension | When geometry provided | Low - warning only |
| Deflection > limit | Already exists in shaftCalc | None - already implemented |
| V-groove vs plain crown | Crown type mismatch | Low - warning only |

**Action:** Add as warning outputs. Never fail calculation.

### 3.3 New Governing Calculations (RISKY)
| Calculation | Description | Risk |
|-------------|-------------|------|
| Tube stress σ = Mc/I | New formula, new inputs required | Medium |
| Stress allowable load | Derived from tube stress | Medium |
| Deflection allowable load | New formula | Medium |
| Governing allowable | min() of above | Low - just aggregation |

**Action:**
- Implement as new outputs only
- Do NOT change any existing outputs
- Return `undefined` when inputs incomplete
- Version as v1.27 or higher

---

## 4. Recommended Approach

### 4.1 Strategy: "PCI Checks as Optional Advanced Validation Outputs"

```
┌─────────────────────────────────────────────────────────────┐
│                    EXISTING BEHAVIOR                         │
│  (shaft sizing, belt length, torque, etc.)                  │
│  ════════════════════════════════════════                   │
│           UNCHANGED - No modifications                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (parallel, not serial)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEW PCI LAYER                             │
│  ════════════════════════════════════                       │
│  Inputs (optional):                                          │
│    - bearing_centers_in                                      │
│    - hub_centers_in                                          │
│    - tube_od_in, tube_wall_in                                │
│    - enforce_pci_checks (boolean)                            │
│                                                              │
│  Outputs (new, additive):                                    │
│    - pci_tube_stress_psi                                     │
│    - pci_stress_allowable_load_lbf                           │
│    - pci_deflection_allowable_load_lbf                       │
│    - pci_governing_allowable_load_lbf                        │
│    - pci_governing_factor ("stress" | "deflection")          │
│    - pci_check_status ("pass" | "warn" | "fail" | "incomplete")│
│                                                              │
│  Warnings (validation rules):                                │
│    - "Tube stress exceeds allowable for plain tube"          │
│    - "Belt tension exceeds governing allowable load"         │
│    - "Crown verification: CEMA B105.1 recommends..."         │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Non-Breaking Guarantees

1. **Legacy configs load unchanged** - missing PCI inputs default to undefined
2. **Existing outputs unchanged** - `drive_shaft_diameter_in`, `von_mises_stress_psi`, etc. same formulas
3. **No new required fields** - all PCI inputs are optional
4. **Warnings not errors** - unless `enforce_pci_checks = true`

### 4.3 Version Scope

- **v1.27**: Add PCI geometry inputs and outputs (schema only)
- **v1.28**: Add PCI validation rules (warnings)
- **v1.29**: Add UI for Advanced Pulley Geometry section
- Future: Consider making PCI checks default-on for new configs

---

## 5. Edge Cases

### 5.1 Short Pulleys (face_width < 12")
- Bearing/hub centers may overlap
- Solution: Validate `bearing_centers > hub_centers` or emit warning

### 5.2 Extreme Face Widths (> 48")
- Deflection becomes dominant over stress
- Solution: This is handled correctly by min(stress, deflection) logic

### 5.3 Missing Geometry (Most Legacy Configs)
- No bearing_centers, hub_centers, tube dimensions
- Solution: PCI outputs are `undefined`, PCI warnings not emitted
- Display: "PCI checks unavailable - provide Advanced Pulley Geometry"

### 5.4 V-Groove Pulleys
- Different stress concentration at groove
- PCI typically uses different allowable for V-groove vs plain
- Solution: Check `v_groove_section` from family, adjust allowable accordingly

### 5.5 Lagged vs Bare Pulleys
- Lagging affects friction coefficient (already parameterized in shaftCalc)
- Lagging does NOT affect tube stress (shell diameter, not finished OD)
- Solution: PCI tube stress uses `shell_od_in`, not `finished_od_in`

---

## 6. Data Model Impact

### 6.1 New Schema Fields (Inputs)

```typescript
// v1.27: PCI PULLEY GEOMETRY INPUTS (Advanced, Optional)
// =====================================================

/** Bearing center-to-center distance (inches) - for PCI stress/deflection */
bearing_centers_in?: number;

/** Hub center-to-center distance (inches) - for PCI tube stress */
hub_centers_in?: number;

/** Drive pulley tube OD (inches) - defaults to shell_od_in from variant */
drive_tube_od_in?: number;

/** Drive pulley tube wall thickness (inches) - from variant/family */
drive_tube_wall_in?: number;

/** Tail pulley tube OD (inches) */
tail_tube_od_in?: number;

/** Tail pulley tube wall thickness (inches) */
tail_tube_wall_in?: number;

/** Enable strict PCI check enforcement (default: false = warnings only) */
enforce_pci_checks?: boolean;
```

### 6.2 New Schema Fields (Outputs)

```typescript
// v1.27: PCI ENGINEERING CHECK OUTPUTS
// ====================================

/** Tube stress at hub for drive pulley (psi) */
pci_drive_tube_stress_psi?: number;

/** Tube stress at hub for tail pulley (psi) */
pci_tail_tube_stress_psi?: number;

/** Stress-based allowable load for drive (lbf) */
pci_drive_stress_allowable_lbf?: number;

/** Deflection-based allowable load for drive (lbf) */
pci_drive_deflection_allowable_lbf?: number;

/** Governing (minimum) allowable load for drive (lbf) */
pci_drive_governing_allowable_lbf?: number;

/** What governs drive: "stress" or "deflection" */
pci_drive_governing_factor?: 'stress' | 'deflection';

/** Overall PCI check status */
pci_check_status?: 'pass' | 'warn' | 'fail' | 'incomplete';

/** PCI check message for display */
pci_check_message?: string;
```

### 6.3 Migration Strategy

**None required.** All new fields are optional with no defaults that affect calculation. Legacy configs simply won't have PCI outputs until geometry is provided.

---

## 7. Recommendations

### 7.1 Immediate (v1.27)
1. Add schema fields for PCI inputs/outputs
2. Add `pciChecks.ts` module with pure calculation functions
3. Wire into `formulas.ts` as parallel output path
4. Add test fixtures proving existing outputs unchanged

### 7.2 Short-term (v1.28-v1.29)
1. Add validation rules with warning severity
2. Add UI section for Advanced Pulley Geometry
3. Add results section for PCI Engineering Checks

### 7.3 Future Consideration
1. Pre-populate tube dimensions from pulley variant if `shell_wall_in` is set
2. Estimate bearing_centers from `face_width_in + offset` when not specified
3. Consider making PCI checks default-on for conveyor_incline_deg > 10°

---

## 8. Test Strategy

### 8.1 Regression Tests (CRITICAL)
```typescript
// Fixture: Legacy config with no PCI inputs
{
  name: "Legacy config - PCI outputs undefined but existing unchanged",
  inputs: { /* existing valid config, no bearing_centers etc */ },
  expectedOutputs: {
    drive_shaft_diameter_in: 1.25, // unchanged
    von_mises_stress_psi: 12500,   // unchanged
    pci_drive_tube_stress_psi: undefined, // new field, undefined
    pci_check_status: 'incomplete',
  }
}
```

### 8.2 PCI Calculation Tests
```typescript
// Fixture: Full PCI geometry provided
{
  name: "PCI checks - stress governs",
  inputs: {
    bearing_centers_in: 52,
    hub_centers_in: 48,
    drive_tube_od_in: 8,
    drive_tube_wall_in: 0.134,
    // ... standard inputs
  },
  expectedOutputs: {
    pci_drive_tube_stress_psi: { approx: 8500, tolerance: 100 },
    pci_drive_governing_factor: 'stress',
    pci_check_status: 'pass',
  }
}
```

### 8.3 Warning Tests
```typescript
// Fixture: Tube stress exceeds allowable
{
  name: "PCI warning - tube stress too high",
  inputs: { /* config that exceeds stress limit */ },
  expectedWarnings: [
    { code: 'PCI_TUBE_STRESS_EXCEEDED', severity: 'warning' }
  ]
}
```

---

## 9. Conclusion

**Recommended Path:** Implement PCI checks as optional advanced validation outputs with warnings-only severity. This provides engineering value without risking math drift or breaking legacy configurations.

**Key Principles:**
- Additive outputs only, no formula modifications
- All new inputs optional
- Warnings by default, errors only with explicit flag
- UI hidden by default, expanded when relevant

**Risk Assessment:** LOW - with proposed mitigations in place.

---

*End of Opus Analysis*

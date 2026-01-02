# Risk Register - Belt Conveyor Calculator

> Opus Greenfield Review - January 2026

## Critical Risks

### RISK-001: Math Drift During Refactoring

| Attribute | Value |
|-----------|-------|
| **Category** | Calculation Integrity |
| **Likelihood** | HIGH if refactoring formulas |
| **Impact** | CRITICAL - incorrect engineering output |
| **Status** | MITIGATED by test coverage |

**Description:**
Refactoring formula code could introduce subtle calculation differences that accumulate.

**Current Mitigations:**
- 349 test cases in `model.test.ts`
- Excel parity requirement documented
- Default tolerance of 0.5% defined

**Gaps:**
- `ALL_FIXTURES` array is **empty** - no golden fixtures from Excel
- Tests are unit tests, not integration fixtures
- No automated Excel comparison pipeline

**Recommended Actions:**
1. Create 10-20 golden fixtures from real Excel calculations
2. Add snapshot tests for critical calculation chains
3. Document explicit tolerances per output field

---

### RISK-002: Unit Drift

| Attribute | Value |
|-----------|-------|
| **Category** | Data Integrity |
| **Likelihood** | MEDIUM |
| **Impact** | HIGH - incorrect specifications |
| **Status** | PARTIALLY MITIGATED |

**Description:**
Inconsistent unit handling (inches vs feet, pounds vs kg) could cause off-by-factor errors.

**Current Mitigations:**
- Units explicitly in field names (`_in`, `_lbs`, `_fpm`)
- Comments document units in schema.ts
- No hidden conversions policy

**Gaps:**
- No runtime unit validation
- User input could be in wrong units without detection
- Display formatting spread across UI components

**Recommended Actions:**
1. Consider branded types for units (e.g., `type Inches = number & { __brand: 'inches' }`)
2. Centralize unit formatting
3. Add sanity checks for out-of-range values

---

### RISK-003: Rounding Drift

| Attribute | Value |
|-----------|-------|
| **Category** | Calculation Integrity |
| **Likelihood** | MEDIUM |
| **Impact** | MEDIUM - cumulative errors |
| **Status** | NOT MITIGATED |

**Description:**
Inconsistent rounding at intermediate steps can cause divergence from Excel.

**Evidence in Codebase:**
```typescript
// formulas.ts uses:
roundUpToIncrement(value, 0.25)  // For cleats
toFixed(2)                       // For display
toFixed(3)                       // For shaft diameters
```

**Gaps:**
- No documented rounding policy
- Excel may round differently at intermediate steps
- toFixed() used inconsistently (2 vs 3 decimal places)

**Recommended Actions:**
1. Document rounding policy in schema.ts
2. Use consistent decimal places per output type
3. Add rounding tests comparing to Excel

---

### RISK-004: Silent Validation Failure

| Attribute | Value |
|-----------|-------|
| **Category** | User Experience |
| **Likelihood** | MEDIUM |
| **Impact** | HIGH - user proceeds with invalid config |
| **Status** | PARTIALLY MITIGATED |

**Description:**
Validation rules spread across multiple locations may fail to catch invalid combinations.

**Evidence:**
- Validation in `rules.ts`, `useConfigureIssues.ts`, and UI components
- Some checks are warnings, some are errors
- Post-calc validation can succeed but produce nonsense outputs

**Gaps:**
- No single validation registry
- Error severity not consistent (warning vs error)
- Some UI conditionals bypass full validation

**Recommended Actions:**
1. Centralize all validation in rules.ts
2. Add validation severity enum (ERROR, WARNING, INFO)
3. Create validation coverage matrix

---

### RISK-005: Enum Serialization Inconsistency

| Attribute | Value |
|-----------|-------|
| **Category** | Data Integrity |
| **Likelihood** | HIGH |
| **Impact** | MEDIUM - defensive code handles it |
| **Status** | MITIGATED but messy |

**Description:**
Enums are sometimes serialized as enum values, sometimes as string literals, requiring double comparisons.

**Evidence:**
```typescript
// Pattern appears throughout codebase
inputs.shaft_diameter_mode === ShaftDiameterMode.Manual ||
inputs.shaft_diameter_mode === 'Manual'
```

**Current Mitigation:**
- All comparisons use OR pattern

**Gaps:**
- Technical debt accumulation
- Easy to forget one case
- Makes code harder to read

**Recommended Actions:**
1. Normalize inputs on load (convert strings to enum values)
2. Use type guards for enum validation
3. Consider string enums consistently

---

### RISK-006: Migration Incompatibility

| Attribute | Value |
|-----------|-------|
| **Category** | Data Integrity |
| **Likelihood** | LOW (greenfield) |
| **Impact** | HIGH if data existed |
| **Status** | N/A - no user data |

**Description:**
Schema changes could break saved configurations.

**Current State:**
- `migrate.ts` exists with version handlers
- `normalizeInputs()` handles field renames
- No user data to preserve currently

**Gaps:**
- Migration tests are minimal
- No forward/backward compatibility testing

**Recommended Actions:**
1. Add migration tests before user data exists
2. Document migration policy
3. Consider schema versioning in saved configs

---

## Risk Matrix

| ID | Risk | Likelihood | Impact | Priority |
|----|------|------------|--------|----------|
| 001 | Math Drift | HIGH | CRITICAL | **P0** |
| 002 | Unit Drift | MEDIUM | HIGH | P1 |
| 003 | Rounding Drift | MEDIUM | MEDIUM | P2 |
| 004 | Silent Validation | MEDIUM | HIGH | P1 |
| 005 | Enum Serialization | HIGH | MEDIUM | P2 |
| 006 | Migration | LOW | HIGH | P3 |

---

## Immediate Actions for Safe Refactoring

1. **Before any refactor:**
   - Run full test suite
   - Create snapshot of key calculation outputs
   - Document expected tolerances

2. **During refactor:**
   - Make atomic commits
   - Run tests after each change
   - No formula changes in same PR as structural changes

3. **After refactor:**
   - Compare calculation outputs to snapshots
   - Restart dev server (don't trust hot reload)
   - Manual verification of critical paths

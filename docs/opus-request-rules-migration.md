# Opus Analysis Request: Rules Migration Strategy

**Project:** Conveyor Console (MC3 Manufacturing)
**Date:** 2026-01-25
**Context:** Pre-analysis gate before implementing rule gating/separation

---

## Project Context

The Conveyor Console is a Next.js 15 application (React 19, TypeScript) for designing industrial conveyor systems. It supports two product types:

1. **Belt Conveyor** (`belt_conveyor_v1`) - Primary product, full feature set
2. **Magnetic Conveyor** (`magnetic_conveyor_v1`) - Beta product, subset of features

The application includes a calculation engine that validates user inputs, performs physics calculations, and generates warnings/errors based on engineering rules.

---

## Current Validation Architecture

### Rule Distribution (Lines of Code)

| Module | LOC | Responsibility |
|--------|-----|----------------|
| `src/models/sliderbed_v1/rules.ts` | 2,100+ | Primary input validation, application rules |
| `src/models/belt_conveyor_v1/rules.ts` | 611 | Belt-specific validation (extends sliderbed) |
| `src/models/magnetic_conveyor_v1/validation.ts` | 409 | Magnetic conveyor validation |
| `src/lib/validation/beltCompatibility.ts` | 249 | Belt temperature/oil checks |
| `src/models/sliderbed_v1/outputs_v2/warnings.ts` | 467 | Post-calculation warnings |
| `app/components/useConfigureIssues.ts` | 831 | UI validation aggregation |

**Total:** ~4,700 lines of validation logic

### Validation Types

```typescript
// Errors (blocking)
interface ValidationError {
  field?: string;
  message: string;
  severity: 'error';
}

// Warnings (non-blocking)
interface ValidationWarning {
  field?: string;
  message: string;
  severity: 'warning' | 'info';
}

// Output warnings (post-calc)
interface OutputMessageV2 {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  recommendation?: string;
  impacts: ('design' | 'quote' | 'vendor')[];
  related_component_ids: CanonicalComponentId[];
}
```

### Validation Flow

```
User Input
    ↓
validateInputs() → Blocking errors (prevent calculation)
    ↓
applyApplicationRules() → Warnings + additional errors
    ↓
[Calculation Engine]
    ↓
runAllWarningRules() → Post-calc warnings
    ↓
UI Display (banners, tabs, indicators)
```

---

## What We Observed

### 1. Telemetry Infrastructure Implemented

We added an observability layer (`src/lib/rules-telemetry/`) that captures:
- `rule_id`: Stable identifier derived from source location + message
- `severity`: error | warning | info
- `message`: User-facing text
- `product_key`: Current product context
- `timestamp`: When the rule fired
- `inputs_present`: Available input keys
- `source_ref`: File:function reference

**Feature flag:** `NEXT_PUBLIC_RULES_DEBUG=true`

### 2. Product-Scoping Is Partial

One function exists for product-aware validation:

```typescript
// src/models/sliderbed_v1/rules.ts:123
function requiresBeltValidation(productKey?: string): boolean {
  if (!productKey) return true; // Default to belt validation
  return BELT_PRODUCT_KEYS.includes(productKey);
}
```

This is used to skip belt selection validation for magnetic conveyors, but:
- Most other rules don't check product context
- UI validation (`useConfigureIssues.ts`) doesn't consistently filter
- Output warnings apply to all products

### 3. Rule Categories Identified

| Category | Count (est.) | Description |
|----------|--------------|-------------|
| Geometry | ~20 | Length, width, angle, horizontal run |
| Material | ~15 | Form, temperature, fluid, weight |
| Belt | ~10 | Selection, min pulley, compatibility |
| Support | ~12 | Floor, legs, casters, TOB |
| Frame | ~8 | Construction, gauge, channel, cleats |
| Speed/Drive | ~15 | Belt speed, RPM, sprocket, chain |
| PCI | ~8 | Tube stress, hub connection |
| Output | ~11 | Post-calc warnings |

---

## Risks Identified

### R1: Cross-Product Bleed (High)
Rules designed for belt conveyors may fire inappropriately for magnetic conveyors, confusing users or blocking valid configurations.

### R2: Monolithic Rule File (Medium)
`rules.ts` at 2,100+ lines is difficult to maintain. Changes risk unintended side effects across rule categories.

### R3: Draft vs Commit Mode Inconsistency (Medium)
Some rules only apply in commit mode, but the distinction isn't always clear. Users may be confused by different validation behavior.

### R4: UI vs Model Validation Divergence (Medium)
`useConfigureIssues.ts` duplicates some validation logic. Changes to model validation may not propagate to UI, causing inconsistency.

### R5: No Rule Audit Trail (Low)
No record of which rules fired for a saved configuration. Difficult to debug customer issues or understand historical behavior.

---

## Edge Cases to Consider

### E1: Product Switching
If a user starts with belt conveyor and switches to magnetic, cached validation results may persist incorrectly.

### E2: Partial Input States
Rules fire on incomplete inputs during draft editing. Some rules assume fields exist and may error on undefined.

### E3: Calculation Retry
After a validation error, if the user fixes inputs and recalculates, stale warnings may persist in UI state.

### E4: Feature Flag Combinations
Multiple features (cleats, snubs, V-guides) have interaction rules. Disabling one may affect validation of another.

### E5: Admin Override
Some rules should be suppressible by admin users (e.g., override PCI stress limits for custom engineering).

---

## Proposed Phased Plan

### Phase 1: Rule Gating (Observability → Control)

**Goal:** Add product-scope filtering without changing rule logic.

1. Extend telemetry registry with `product_scope` for each rule
2. Implement `shouldRuleApply(rule, productKey)` filter
3. Wrap validation functions with scope filter
4. Add admin UI to view rule assignments

**Risk:** Low - Filter layer, original rules unchanged

### Phase 2: Rule Pack Separation

**Goal:** Split monolithic files into domain modules.

1. Create `src/lib/rules/` directory structure:
   ```
   rules/
     geometry.ts
     material.ts
     belt.ts
     support.ts
     drive.ts
     pci.ts
     index.ts
   ```
2. Move rules from `rules.ts` maintaining exact behavior
3. Create product-specific aggregators:
   ```typescript
   // rules/products/belt.ts
   export const beltRulePack = [geometryRules, materialRules, beltRules, ...];

   // rules/products/magnetic.ts
   export const magneticRulePack = [geometryRules, materialRules, ...]; // no beltRules
   ```

**Risk:** Medium - Refactoring requires careful testing

### Phase 3: Calc vs Advisory Separation

**Goal:** Distinguish blocking errors from advisory warnings.

1. Define two validation phases:
   - **Calc-gate:** Errors that prevent physics calculation
   - **Advisory:** Warnings shown but don't block
2. Allow calculation to proceed with warnings
3. Implement "Calculate Anyway" flow for soft errors

**Risk:** Medium - Changes user flow, needs UX review

### Phase 4: Database-Driven Rules (Future)

**Goal:** Move rule configuration to database for per-tenant customization.

1. Design `rules` table schema
2. Implement rule loader from DB
3. Add admin UI for rule management
4. Implement rule versioning

**Risk:** High - Major architecture change

---

## Questions for Opus Analysis

1. **Architecture:** Is the proposed 4-phase plan appropriate, or should phases be reordered?

2. **Rule Registry Schema:** What additional fields should the rule registry include for future flexibility?

3. **Testing Strategy:** How should we test rule separation to ensure no regression?

4. **UI Consistency:** Should `useConfigureIssues.ts` be refactored to use the same rule system, or kept as a separate UI concern?

5. **Performance:** With 100+ rules and complex inputs, should we consider rule caching or lazy evaluation?

6. **Migration Path:** How should we handle existing saved configurations if rule behavior changes?

---

## Attachments

- `docs/rules-migration-observability.md` - Implementation details of telemetry layer
- `src/lib/rules-telemetry/` - Telemetry infrastructure code
- `app/components/RulesDebugPanel.tsx` - Debug UI component

---

## Next Steps (Pending Opus Review)

1. Run smoke test to confirm telemetry capture
2. Document actual rule firing patterns from real usage
3. Identify specific cross-product bleed instances
4. Propose Phase 1 implementation spec based on findings

---

*This prompt is designed for Opus pre-analysis. Paste this document into Opus to get a comprehensive review before proceeding with Phase 1 implementation.*

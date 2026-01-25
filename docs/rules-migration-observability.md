# Rules Migration Observability

**Branch:** `feat/rules-visibility-registry`
**Date:** 2026-01-25
**Status:** Observability layer implemented. **No behavior changes.**

---

## What Was Implemented

### 1. Telemetry Infrastructure (`src/lib/rules-telemetry/`)

A lightweight instrumentation layer that captures validation/warning/error events:

| File | Purpose |
|------|---------|
| `types.ts` | Type definitions for `RuleEvent`, `RuleRegistryEntry`, etc. |
| `store.ts` | Session-scoped event store (max 200 entries, Clear functionality) |
| `registry.ts` | Read-only registry of observed rules with pre-populated known rules |
| `emit.ts` | Functions to emit events without changing control flow |
| `useRuleTelemetry.ts` | React hook for UI binding |
| `index.ts` | Public API exports |

### 2. Debug UI Panel (`app/components/RulesDebugPanel.tsx`)

A floating panel showing rules fired during the current session:

- **Feature flag:** `NEXT_PUBLIC_RULES_DEBUG=true` (env var) or `localStorage.setItem('RULES_DEBUG', 'true')`
- **Columns:** severity, rule_id, message, product_key, source_ref, timestamp
- **Expandable rows:** Show `inputs_present` array
- **Filters:** All / Errors / Warnings / Info
- **Session controls:** Clear button, event count display (max 200)
- **Explicit label:** "Observability only. Does not change behavior."

### 3. Instrumented Validation Files

| File | Functions Instrumented |
|------|----------------------|
| `src/models/sliderbed_v1/rules.ts` | `validate()`, `validateForCommit()`, `applyPciOutputRules()`, `applyHubConnectionRules()` |
| `src/models/magnetic_conveyor_v1/validation.ts` | `validate()` |
| `src/lib/validation/beltCompatibility.ts` | `checkBeltCompatibility()` |
| `src/models/sliderbed_v1/outputs_v2/warnings.ts` | `runAllWarningRules()` |

---

## Where Current Rules Appear Today

### Primary Validation Modules

1. **`src/models/sliderbed_v1/rules.ts`** (2,100+ lines)
   - Input validation: geometry, material, belt, support system, frame, cleats
   - Application rules: incline warnings, speed warnings, material compatibility
   - PCI tube stress validation
   - Hub connection warnings

2. **`src/models/belt_conveyor_v1/rules.ts`** (611 lines)
   - Extends sliderbed with belt-conveyor-specific terminology

3. **`src/models/magnetic_conveyor_v1/validation.ts`** (409 lines)
   - Material compatibility (non-magnetic materials)
   - Style C requirements
   - Heavy Duty suggestions

4. **`src/lib/validation/beltCompatibility.ts`** (249 lines)
   - Temperature checks (min/max rating vs part temp)
   - Oil/fluid resistance checks

5. **`src/models/sliderbed_v1/outputs_v2/warnings.ts`** (467 lines)
   - Post-calculation warnings: min pulley, belt tension, shaft deflection
   - Drive sizing, caster overload, manual drive torque

6. **`app/components/useConfigureIssues.ts`** (831 lines)
   - UI-layer validation aggregation
   - Pre-calculation issue detection

---

## Top Recurring Rules (From Code Analysis)

Based on code structure (will be confirmed via smoke test):

1. **Material form not selected** - Blocking error
2. **Conveyor length/width <= 0** - Blocking error
3. **Belt selection required** - Blocking error (belt products only)
4. **Incline angle warnings** - >20°, >35°, >45° thresholds
5. **Belt speed > 300 FPM** - Warning
6. **TOB required for floor-supported** - Error in commit mode
7. **Min pulley diameter violation** - Warning
8. **Belt temperature exceeded** - Error
9. **PCI tube stress exceeded** - Warning/Error based on enforce flag
10. **Drive undersized** - Warning when HP margin < 5%

---

## Cross-Product Bleed Observed

### Current State
- **Product-scoped validation exists:** `requiresBeltValidation(productKey)` function in `rules.ts:123`
- **Belt validation skipped for magnetic:** Checks product key before belt selection validation

### Potential Bleed Points
1. **`useConfigureIssues.ts`** - UI validation doesn't consistently check product context
2. **Temperature/oil checks** - Applied regardless of product type
3. **Output warnings** - `runAllWarningRules()` doesn't filter by product

### Evidence Needed
- Enable telemetry and load magnetic conveyor configuration
- Check if belt-specific rules fire inappropriately
- Document specific rule_ids that fire with wrong product_key

---

## Recommended Next Phases

### Phase 1: Gating Infrastructure (Next)
- Add `product_scope` field to all registry entries
- Implement rule filtering: `shouldRuleApply(rule, productKey)`
- Add admin UI to toggle rule scope

### Phase 2: Rule Pack Separation
- Split `rules.ts` into domain-specific modules:
  - `rules/geometry.ts`
  - `rules/material.ts`
  - `rules/belt.ts`
  - `rules/support.ts`
- Create product-specific rule packs

### Phase 3: Calc vs Advisory Separation
- Distinguish blocking (calc-preventing) vs advisory (warning-only) rules
- Implement two-phase validation: calc-gate then advisory
- Allow calculation with warnings, block only on errors

### Phase 4: Database-Driven Rules
- Move rule definitions to database
- Per-tenant/per-product rule configuration
- Rule versioning and audit trail

---

## Files Changed/Added

### Added
- `src/lib/rules-telemetry/types.ts`
- `src/lib/rules-telemetry/store.ts`
- `src/lib/rules-telemetry/registry.ts`
- `src/lib/rules-telemetry/emit.ts`
- `src/lib/rules-telemetry/useRuleTelemetry.ts`
- `src/lib/rules-telemetry/index.ts`
- `app/components/RulesDebugPanel.tsx`
- `docs/rules-migration-observability.md` (this file)
- `docs/opus-request-rules-migration.md`

### Modified (Telemetry Instrumentation Only)
- `src/models/sliderbed_v1/rules.ts` - Added telemetry imports and wrapping
- `src/models/magnetic_conveyor_v1/validation.ts` - Added telemetry imports and wrapping
- `src/lib/validation/beltCompatibility.ts` - Added telemetry imports and wrapping
- `src/models/sliderbed_v1/outputs_v2/warnings.ts` - Added telemetry imports and wrapping
- `app/layout.tsx` - Added RulesDebugPanel component

---

## How to Enable the Debug Panel

### Option 1: Environment Variable
```bash
NEXT_PUBLIC_RULES_DEBUG=true npm run dev
```

### Option 2: Browser Console (Runtime)
```javascript
localStorage.setItem('RULES_DEBUG', 'true');
location.reload();
```

### Option 3: .env.local File
```
NEXT_PUBLIC_RULES_DEBUG=true
```

---

## Verification Checklist

- [ ] App starts without errors
- [ ] Debug panel appears when flag is set
- [ ] Debug panel hidden when flag is not set
- [ ] Triggering validations populates the panel
- [ ] Clear button works
- [ ] Event count respects 200 limit
- [ ] Expand/collapse rows works
- [ ] Filter tabs work
- [ ] Same UI warnings appear as before (no behavior change)

---

**No behavior changes in this PR/branch.**

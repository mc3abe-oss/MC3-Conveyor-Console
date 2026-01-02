# Hotspot Report - Belt Conveyor Calculator

> Opus Greenfield Review - January 2026

## Top 10 Files by Complexity / Churn Risk

| Rank | File | LOC | Risk Level | Primary Concern |
|------|------|-----|------------|-----------------|
| 1 | `model.test.ts` | 6869 | LOW | Test file - expected size |
| 2 | `schema.ts` | 2891 | **HIGH** | Monolithic type definitions |
| 3 | `formulas.ts` | 2064 | MEDIUM | Core calculations - well-structured |
| 4 | `rules.ts` | 2040 | MEDIUM | Validation spread |
| 5 | `TabConveyorPhysical.tsx` | 2004 | **CRITICAL** | UI with embedded logic |
| 6 | `TabConveyorBuild.tsx` | 1598 | HIGH | Large UI component |
| 7 | `BeltConveyorCalculatorApp.tsx` | 1369 | MEDIUM | Main app orchestration |
| 8 | `PulleyConfigModal.tsx` | 1111 | MEDIUM | Complex modal |
| 9 | `pulley-library/page.tsx` | 1000 | LOW | Admin page |
| 10 | `SaveTargetModal.tsx` | 810 | LOW | Save workflow |

---

## Detailed Hotspot Analysis

### 1. TabConveyorPhysical.tsx (CRITICAL)

**Size:** 2004 lines
**Risk:** Critical

**Issues:**
- **UI doing non-UI work**: Contains validation logic, derived state computation, geometry normalization
- **Multiple responsibilities**: Belt config, tracking, pulleys, shafts, return support all in one file
- **Defensive enum checks**: Comparing both enum value AND string literal throughout
- **Inline IIFE patterns**: Uses `{(() => { ... })()}` for complex rendering - reduces readability
- **State synchronization**: Manages pulley catalog sync with manual overrides

**Evidence:**
```typescript
// Line 206: Validation-like logic in UI
const isVGuided = inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
                  inputs.belt_tracking_method === 'V-guided';

// Line 416: Derived geometry in UI (should be in model)
const { derived: derivedGeometry } = normalizeGeometry(inputs);
```

**Recommendation:** Extract into `conveyorPhysical/` folder with discrete card components.

---

### 2. schema.ts (HIGH)

**Size:** 2891 lines
**Risk:** High

**Issues:**
- **Monolithic**: All types, enums, labels, defaults in one file
- **~200 input fields**: SliderbedInputs interface is enormous
- **~80 output fields**: SliderbedOutputs similarly large
- **Mixed concerns**: Types, labels, defaults, helpers all together
- **Changelog bloat**: 100+ lines of changelog comments

**Positives:**
- Well-documented with explicit units
- Single source of truth for types
- Enum labels co-located with enums

**Recommendation:** Consider splitting into:
- `types/inputs.ts` - Input interface
- `types/outputs.ts` - Output interface
- `types/enums.ts` - All enums with labels
- `defaults.ts` - buildDefaultInputs()

---

### 3. rules.ts (MEDIUM)

**Size:** 2040 lines
**Risk:** Medium

**Issues:**
- **Validation spread**: Multiple validate* functions with overlapping concerns
- **Application rules mixed with input validation**: `applyApplicationRules` does post-calc checks
- **String-based error codes**: Errors are string messages, not typed codes
- **Complex conditionals**: Many nested if/else chains

**Positives:**
- Clear function boundaries
- Good separation of input vs parameter validation
- Post-calc rules separated

**Recommendation:** Extract rule categories into separate modules.

---

### 4. formulas.ts (MEDIUM)

**Size:** 2064 lines
**Risk:** Medium

**Issues:**
- **Single large calculate() function**: All formulas in one orchestrator
- **Implicit dependencies**: Formula order matters but not documented
- **Mixed precision**: Some values toFixed(), others raw

**Positives:**
- Pure functions
- No side effects
- Well-commented formulas

**Recommendation:** Extract formula groups (geometry, power, pulleys) into modules.

---

### 5. TabConveyorBuild.tsx (HIGH)

**Size:** 1598 lines
**Risk:** High

**Issues:**
- Similar to TabConveyorPhysical - UI with embedded logic
- Frame construction logic in UI
- Material handling config

---

## Duplicated State Patterns

### Enum Value + String Comparison
Found across multiple files:
```typescript
// Pattern appears 20+ times
inputs.something === SomeEnum.Value || inputs.something === 'Value'
```

This suggests serialization/deserialization inconsistency.

---

## Mismatched Keys Risk

### Legacy Field Names
- `conveyor_width_in` → `belt_width_in` (v1.12 rename)
- Migration handled in `engine.ts:normalizeInputs()`
- Risk: Old saved configs may have legacy keys

### Enum String vs Value
- Inputs may contain string versions of enum values
- Comparison must handle both (current pattern)
- Risk: Inconsistent behavior if comparison misses a case

---

## Validation Spread Analysis

Validation occurs in multiple locations:

| Location | Type | When |
|----------|------|------|
| `rules.ts:validateInputs()` | Pre-calc | Before calculation |
| `rules.ts:validateParameters()` | Pre-calc | Before calculation |
| `rules.ts:applyApplicationRules()` | Pre-calc | Domain rules |
| `rules.ts:applyPciOutputRules()` | Post-calc | After calculation |
| `useConfigureIssues.ts` | UI | Real-time in form |
| `TabConveyorPhysical.tsx` | UI | Inline conditionals |

**Risk:** A rule change may need updates in 3+ locations.

---

## UI Files Doing Non-UI Work

### TabConveyorPhysical.tsx
- `normalizeGeometry()` calls
- Derived frame height computation
- Belt tracking validation
- Cleat compatibility checks
- Pulley catalog sync logic

### TabBuildOptions.tsx
- Support method derivation
- TOB requirements
- Legs/casters logic

### useConfigureIssues.ts
- Tracking issue computation
- Min pulley validation
- Section counts aggregation

**Recommendation:** Create a `viewModel` layer or move all derivation to the model.

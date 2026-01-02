# Streamline Plan - Belt Conveyor Calculator

> Opus Greenfield Review - January 2026

## Guiding Principles

1. **NO MATH DRIFT** - All calculations must match current outputs
2. **SMALL, REVERSIBLE STEPS** - Each commit can be rolled back
3. **TESTS FIRST** - Verify baseline before and after each change
4. **RESTART DEV SERVER** - Don't trust hot reload after file moves

---

## Phase 0: Foundation (Pre-Refactor)

### Slice 0.1: Create Golden Fixtures

**What Changes:**
- Add 10-20 test fixtures from actual Excel calculations
- Store expected outputs with explicit tolerances

**Proves Equivalence:**
- Fixtures pass before any refactoring
- Creates baseline for regression detection

**Rollback Plan:**
- Delete fixture file (no existing code changed)

**Priority:** P0 - Must complete before any other work

---

### Slice 0.2: Snapshot Critical Outputs

**What Changes:**
- Add snapshot tests for 5 critical calculation chains
- Document baseline values

**Proves Equivalence:**
- Snapshots match current behavior

**Rollback Plan:**
- Delete snapshot files

---

## Phase 1: Dead Code & Naming (Safe)

### Slice 1.1: Remove Unused Imports

**What Changes:**
- Remove unused imports across all files
- No logic changes

**Proves Equivalence:**
- TypeScript compiles
- All tests pass
- No behavior change possible

**Rollback Plan:**
- `git revert` single commit

**Estimated Scope:** ~20 files, 5 minutes

---

### Slice 1.2: Remove Legacy Stub Functions

**What Changes:**
- Remove `getEffectiveDiameterByKey()` stub in TabConveyorPhysical.tsx (Line 56-58)
- It returns `undefined` unconditionally

**Proves Equivalence:**
- Function is unused (returns undefined)
- Grep shows no meaningful callers

**Rollback Plan:**
- `git revert` single commit

---

### Slice 1.3: Consolidate Enum Comparisons

**What Changes:**
- Create helper function for enum-or-string comparison:
  ```typescript
  function isEnumValue<T>(input: T | string, enumValue: T, stringValue: string): boolean {
    return input === enumValue || input === stringValue;
  }
  ```
- Replace all double-comparison patterns

**Proves Equivalence:**
- Logic is identical, just extracted
- All tests pass

**Rollback Plan:**
- `git revert` single commit

**Note:** This is OPTIONAL - defer if any doubt

---

## Phase 2: Single-Source-of-Truth Cleanup

### Slice 2.1: Identify Duplicate Control

**Current State Analysis:**

| Setting | Edited In | Display In |
|---------|-----------|------------|
| Belt tracking method | TabConveyorPhysical | Multiple |
| Pulley diameter | TabConveyorPhysical + Modal | Multiple |
| Cleat config | TabConveyorPhysical + Modal | Multiple |

**Selected Case:** Pulley catalog sync

**What Changes:**
- PulleyConfigModal becomes authoritative for pulley settings
- TabConveyorPhysical displays values but doesn't edit directly
- Remove inline override inputs from TabConveyorPhysical

**Proves Equivalence:**
- Same final input values
- All tests pass

**Rollback Plan:**
- Restore inline inputs

**Risk:** MEDIUM - Requires careful state management

---

## Phase 3: Component Extraction (Optional)

### Slice 3.1: Extract ShaftsCard

**What Changes:**
- Create `app/components/conveyorPhysical/cards/ShaftsCard.tsx`
- Move Lines 1173-1481 from TabConveyorPhysical.tsx
- Pass required props (inputs, updateInput, outputs)

**Proves Equivalence:**
- Identical render output
- All tests pass
- Manual visual verification

**Rollback Plan:**
- Delete new file, restore inline code

---

### Slice 3.2: Extract ReturnSupportCard

**What Changes:**
- Create `app/components/conveyorPhysical/cards/ReturnSupportCard.tsx`
- Move Lines 1483-1540 from TabConveyorPhysical.tsx

**Proves Equivalence:**
- Same as Slice 3.1

**Rollback Plan:**
- Same as Slice 3.1

---

## Phase 4: Logic Extraction (Deferred)

### Slice 4.1: Extract useGeometryMode Hook

**What Changes:**
- Create `app/components/conveyorPhysical/hooks/useGeometryMode.ts`
- Move geometry mode switching logic
- Move normalizeGeometry calls

**Proves Equivalence:**
- Identical geometry behavior
- Mode switching preserves values

**Risk:** HIGH - Complex state interactions

**Recommendation:** DEFER until Phase 0-3 complete

---

### Slice 4.2: Extract useCatalogSync Hook

**What Changes:**
- Create `app/components/conveyorPhysical/hooks/useCatalogSync.ts`
- Move pulley catalog sync useEffect

**Risk:** HIGH - Side effect management

**Recommendation:** DEFER

---

## Phase 5: Model Restructuring (Future)

### Slice 5.1: Split model.test.ts

**What Changes:**
- Split 6869-line test file into ~10 focused files
- Group by describe block categories

**Proves Equivalence:**
- All 349 tests still pass
- Same coverage

**Risk:** LOW - Tests are independent

---

### Slice 5.2: Split rules.ts

**What Changes:**
- Create `src/models/sliderbed_v1/validation/` folder
- Split into inputs.ts, parameters.ts, application.ts, pci.ts

**Proves Equivalence:**
- All tests pass
- Validation behavior unchanged

**Risk:** LOW - Functions are already well-separated

---

## Execution Checklist

For each slice:

- [ ] Read relevant code sections (grep-first for large files)
- [ ] Create branch from main
- [ ] Make atomic change
- [ ] Run `npx tsc --noEmit` - must pass
- [ ] Run `npm test` - all tests must pass
- [ ] Restart dev server
- [ ] Verify app loads cleanly
- [ ] Manual smoke test affected area
- [ ] Commit with clear message
- [ ] PR for review if significant

---

## Do NOT Do

1. **NO formula changes** - Calculations are frozen
2. **NO key renames** without migration
3. **NO default value changes** without explicit approval
4. **NO large refactors** - Only approved slices
5. **NO "improvements"** beyond the slice scope

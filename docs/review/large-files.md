# Large File Audit

> Opus Greenfield Review - January 2026

## Files Exceeding Read Limits or 1000+ LOC

| File | LOC | Bytes | Can Read Fully? | Category |
|------|-----|-------|-----------------|----------|
| `model.test.ts` | 6869 | 249KB | NO | Test |
| `schema.ts` | 2891 | 93KB | NO | Types |
| `formulas.ts` | 2064 | 77KB | NO | Calculation |
| `rules.ts` | 2040 | 73KB | NO | Validation |
| `TabConveyorPhysical.tsx` | 2004 | ~80KB | NO | UI |
| `TabConveyorBuild.tsx` | 1598 | ~65KB | NO | UI |
| `BeltConveyorCalculatorApp.tsx` | 1369 | ~55KB | MARGINAL | UI |
| `PulleyConfigModal.tsx` | 1111 | ~45KB | MARGINAL | UI |
| `pulley-library/page.tsx` | 1000 | ~40KB | MARGINAL | Admin |

---

## Detailed Analysis

### 1. model.test.ts (6869 LOC)

**Why Large:**
- 349 individual test cases
- Each test includes setup, execution, assertions
- Tests are comprehensive

**Split Strategy:**
```
src/models/sliderbed_v1/
├── __tests__/
│   ├── basic-calculations.test.ts
│   ├── input-validation.test.ts
│   ├── application-rules.test.ts
│   ├── formula-correctness.test.ts
│   ├── parameter-overrides.test.ts
│   ├── belt-tracking.test.ts
│   ├── geometry.test.ts (already exists)
│   ├── incline.test.ts
│   ├── floor-support.test.ts
│   └── fixtures.test.ts
```

**Effort:** MEDIUM - Tests are already organized by describe blocks

---

### 2. schema.ts (2891 LOC)

**Why Large:**
- ~100 lines of changelog comments
- ~200 input fields in SliderbedInputs
- ~80 output fields in SliderbedOutputs
- ~50 enums with associated LABELS objects
- Helper functions (buildDefaultInputs, etc.)
- Re-exports from tracking module

**Split Strategy:**
```
src/models/sliderbed_v1/
├── types/
│   ├── index.ts          (re-exports)
│   ├── inputs.ts         (SliderbedInputs)
│   ├── outputs.ts        (SliderbedOutputs)
│   ├── parameters.ts     (SliderbedParameters)
│   ├── enums/
│   │   ├── geometry.ts   (GeometryMode, Orientation, etc.)
│   │   ├── belt.ts       (BeltTrackingMethod, LacingStyle, etc.)
│   │   ├── drive.ts      (DriveLocation, DriveHand, etc.)
│   │   ├── support.ts    (SupportMethod, FrameHeightMode, etc.)
│   │   └── application.ts (ProcessType, MaterialType, etc.)
│   └── helpers.ts        (buildDefaultInputs, isFloorSupported, etc.)
```

**Effort:** HIGH - Many imports to update, careful re-export needed

**Risk:** LOW if done as pure file moves with no logic changes

---

### 3. formulas.ts (2064 LOC)

**Why Large:**
- Single large `calculate()` function
- All formula groups in one file
- Extensive comments and derivations

**Split Strategy:**
```
src/models/sliderbed_v1/
├── formulas/
│   ├── index.ts          (calculate() orchestrator)
│   ├── geometry.ts       (already exists as separate file)
│   ├── power.ts          (belt pull, motor sizing)
│   ├── pulleys.ts        (pulley face, shaft sizing)
│   ├── frame.ts          (frame height, clearance)
│   ├── belt.ts           (belt length, weight)
│   └── pci.ts            (PCI tube stress checks)
```

**Effort:** MEDIUM - Natural groupings exist

**Risk:** MEDIUM - Must preserve calculation order

---

### 4. rules.ts (2040 LOC)

**Why Large:**
- Multiple validation function groups
- Application rules
- Post-calc rules
- Helper functions

**Split Strategy:**
```
src/models/sliderbed_v1/
├── validation/
│   ├── index.ts          (validate() orchestrator)
│   ├── inputs.ts         (validateInputs)
│   ├── parameters.ts     (validateParameters)
│   ├── application.ts    (applyApplicationRules)
│   ├── pci.ts            (applyPciOutputRules)
│   └── helpers.ts        (parseCleatHeightFromSize, etc.)
```

**Effort:** MEDIUM - Clear function boundaries

**Risk:** LOW - Validation is mostly independent

---

### 5. TabConveyorPhysical.tsx (2004 LOC)

**Why Large:**
- 6 major sections (Geometry, Belt, Tracking, Pulleys, Shafts, Return)
- Inline IIFE patterns for complex rendering
- Derived state computation
- Modal triggers and state
- Accordion management

**Split Strategy:**
```
app/components/conveyorPhysical/
├── index.tsx                    (TabConveyorPhysical - orchestrator)
├── GeometrySection.tsx          (Lines 500-790)
├── BeltSection.tsx              (Lines 802-906)
├── TrackingSection.tsx          (Lines 907-1016)
├── cards/
│   ├── PulleyCard.tsx           (Head/Tail pulley cards)
│   ├── ShaftsCard.tsx           (Lines 1173-1481)
│   ├── ReturnSupportCard.tsx    (Lines 1483-1540)
│   └── CleatsCard.tsx           (already uses CompactCard)
├── hooks/
│   ├── useGeometryMode.ts       (geometry mode switching logic)
│   └── usePulleySync.ts         (catalog sync logic)
└── utils/
    └── derivedValues.ts         (frame height, etc.)
```

**Effort:** HIGH - Complex state threading

**Risk:** MEDIUM - Must preserve exact behavior

---

### 6. TabConveyorBuild.tsx (1598 LOC)

**Why Large:**
- Frame construction section
- Material handling
- Multiple accordions

**Split Strategy:** Similar to TabConveyorPhysical

---

## Priority Order for Splitting

1. **LOW RISK, HIGH VALUE:**
   - model.test.ts → Multiple test files (no behavior change)
   - rules.ts → validation/ folder (clear boundaries)

2. **MEDIUM RISK, HIGH VALUE:**
   - TabConveyorPhysical.tsx → conveyorPhysical/ folder
   - formulas.ts → formulas/ folder

3. **HIGH RISK, DEFER:**
   - schema.ts → types/ folder (many import updates)

---

## Reading Strategy for Large Files

For files that exceed tool read limits:

1. **Use Grep first** to find relevant sections
2. **Read with offset/limit** around matches
3. **Never attempt full read** - it will fail or truncate
4. **Document section indices** for future reference

Example workflow:
```bash
# Find section boundaries
grep -n "===== .* SECTION" TabConveyorPhysical.tsx

# Read specific section
Read file_path offset=500 limit=100
```

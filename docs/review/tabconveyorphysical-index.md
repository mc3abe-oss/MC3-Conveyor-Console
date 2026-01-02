# TabConveyorPhysical.tsx Index Map

> Opus Greenfield Review - January 2026
> Created using grep-first workflow (file too large for full read)

## File Overview

- **Path:** `app/components/TabConveyorPhysical.tsx`
- **Size:** 2004 lines, ~80KB
- **Role:** Physical conveyor configuration UI tab
- **Sections:** 6 major accordion sections

---

## Section Index

| Section | Line Range | Purpose | Concern Level |
|---------|------------|---------|---------------|
| Imports & Setup | 1-140 | Imports, types, helper functions | CLEAN |
| Component Props & State | 138-270 | Props interface, useState hooks | MODERATE |
| Effects & Handlers | 270-460 | useEffect, event handlers | **HOTSPOT** |
| Geometry Section | 500-790 | Conveyor geometry UI | MODERATE |
| Belt & Pulleys Section | 792-1540 | Belt, tracking, pulleys, shafts, return | **CRITICAL** |
| Frame Section | 1543-1982 | Frame construction, height, support | MODERATE |
| Modals | 1984-2004 | Modal renders | CLEAN |

---

## Detailed Section Analysis

### Lines 1-60: Imports

```
Lines 13-39:  Schema imports (SliderbedInputs, enums, labels)
Lines 41-48:  Formula imports (calculateFrameHeightWithBreakdown, normalizeGeometry)
Lines 50-87:  Component and utility imports
```

**Logic that should NOT be in UI:**
- Line 56-58: Stub function `getEffectiveDiameterByKey()` - legacy compatibility

---

### Lines 109-137: GeometryStat Component

```typescript
function GeometryStat({ ... }) { ... }
```

**Purpose:** Display tile for derived geometry values (length, height, angle)

**Status:** CLEAN - pure presentation

---

### Lines 138-155: Component Definition & Props

```typescript
export default function TabConveyorPhysical({
  inputs,
  updateInput,
  sectionCounts,
  outputs,
  ...
})
```

**Props interface includes:**
- inputs, updateInput (form state)
- sectionCounts, getTrackingIssue, getMinPulleyIssues (validation state)
- outputs (calculated values for display)
- applicationLineId (pulley context)

---

### Lines 153-250: Belt & Pulley Sync Logic

**HOTSPOT - Logic that should NOT be in UI:**

```
Line 153-177:  handleBeltChange() - Updates min pulley diameter based on belt
Line 183-184:  Catalog diameter lookups
Line 200-203:  Tracking/pulley issue extraction
Line 206-250:  Governing min pulley diameter computation
```

**Evidence:**
```typescript
// Line 206: Validation-like logic in UI
const isVGuided = inputs.belt_tracking_method === BeltTrackingMethod.VGuided ||
                  inputs.belt_tracking_method === 'V-guided';

// Line 246: Business rule in UI
const governing = candidates.reduce((max, c) => (c.value! > (max.value ?? 0) ? c : max));
```

**Recommendation:** Extract to `usePulleyValidation()` hook or move to model.

---

### Lines 256-268: Modal State

```
useState: isPulleyModalOpen, applicationPulleys, pulleysLoading
useState: isCleatsModalOpen
useState: isReturnSupportModalOpen
useState: isShaftEditing
```

**Status:** MODERATE - Standard modal state management

---

### Lines 274-365: Effects & Catalog Sync

**HOTSPOT - Side effects and data fetching:**

```
Lines 274-296:  useEffect - Load application pulleys from API
Lines 302-351:  useEffect - Sync catalog pulley values to inputs
Lines 353-366:  handlePulleySave() - POST pulley changes
Lines 368-410:  useEffect - Compute derived frame height
```

**Evidence of logic leak:**
```typescript
// Line 302-351: Complex sync logic in UI
useEffect(() => {
  if (drivePulley && !driveOverride) {
    if (inputs.drive_pulley_diameter_in !== drivePulley.finished_od_in) {
      updateInput('drive_pulley_diameter_in', drivePulley.finished_od_in);
    }
    // ... more sync logic
  }
}, [drivePulley, tailPulley, ...]);
```

**Recommendation:** Extract to `useCatalogSync()` hook.

---

### Lines 416-456: Geometry Mode Handling

**HOTSPOT - Derived state computation:**

```typescript
// Line 416: Geometry normalization
const { derived: derivedGeometry } = normalizeGeometry(inputs);

// Line 420-456: Mode switching with value preservation
const handleGeometryModeChange = (newMode: GeometryMode) => {
  // Complex logic to preserve geometry when switching modes
};
```

**Recommendation:** Move to `useGeometryMode()` hook.

---

### Lines 500-790: Geometry Section (AccordionSection)

```
Lines 500-509:  AccordionSection wrapper
Lines 510-560:  Conveyor Type (SliderBed selection)
Lines 560-680:  Geometry Mode (L_ANGLE / H_TOB selector)
Lines 680-790:  Geometry Stat tiles display
```

**Status:** MODERATE - Mostly presentation, some derived display

---

### Lines 792-1540: Belt & Pulleys Section

**CRITICAL HOTSPOT - Largest section**

```
Lines 802-906:   BELT SUBSECTION
  - Belt select
  - Lacing style
  - PIW/PIL display with overrides

Lines 907-1016:  TRACKING SUBSECTION
  - Tracking method display
  - V-Guide selection (conditional)
  - CompactInfoBanner for recommendations

Lines 1017-1172: PULLEYS SUBSECTION
  - Head/Tail pulley cards (CompactCard)
  - Catalog sync indicators
  - Inline override inputs
  - Min pulley warnings (FootnoteRow)

Lines 1173-1481: SHAFTS SUBSECTION
  - Shaft diameter mode (Calculated/Manual)
  - Drive/tail shaft inputs
  - Step-down configuration
  - Complex inline editing (IIFE pattern)

Lines 1483-1540: RETURN SUPPORT SUBSECTION
  - Return rollers summary
  - Modal trigger for full config
```

**Logic in UI (should be extracted):**
```typescript
// Lines 1178-1248: Shaft validation in UI
const isManualMode = inputs.shaft_diameter_mode === ShaftDiameterMode.Manual ||
                     inputs.shaft_diameter_mode === 'Manual';

// Complex step-down validation
const driveStepdownWarnings: string[] = [];
if (inputs.drive_shaft_stepdown_to_dia_in !== undefined && ...) {
  driveStepdownWarnings.push('Step-down diameter exceeds base diameter');
}
```

---

### Lines 1543-1982: Frame Section

```
Lines 1553-1670:  FRAME CONSTRUCTION SUBSECTION
  - Frame type (sheet metal / structural channel)
  - Gauge / channel series selection

Lines 1672-1982:  FRAME HEIGHT SUBSECTION
  - Height mode (External / TOB-based)
  - TOB inputs
  - Height breakdown display
  - Legs required derivation
```

**Status:** MODERATE - Some derived state computation

---

### Lines 1984-2004: Modal Renders

```
Lines 1984-1990:  PulleyConfigModal
Lines 1990-2000:  CleatsConfigModal
Lines 2000-2004:  ReturnSupportModal
```

**Status:** CLEAN - Modal component instantiation

---

## Logic That Should NOT Live in UI

| Line(s) | Logic | Recommendation |
|---------|-------|----------------|
| 153-177 | Belt min pulley sync | Move to model or hook |
| 206-250 | Governing min pulley calc | Move to rules.ts |
| 302-351 | Catalog sync effect | Extract to hook |
| 416 | normalizeGeometry() call | Call in model, pass result |
| 420-456 | Geometry mode switching | Extract to hook |
| 1178-1248 | Shaft validation | Move to rules.ts |

---

## Recommended Extraction Order

1. **Phase 1 (Safe):** Extract ShaftsCard, ReturnSupportCard to separate files
2. **Phase 2 (Moderate):** Create `useGeometryMode()`, `useCatalogSync()` hooks
3. **Phase 3 (Complex):** Move governing min pulley logic to rules.ts
4. **Phase 4 (Structural):** Split into conveyorPhysical/ folder structure

---

## Reading Strategy

To work with this file:

```bash
# Find section
grep -n "===== .* SUBSECTION" TabConveyorPhysical.tsx

# Read specific section (e.g., Shafts at line 1173)
Read file_path offset=1170 limit=100

# Find specific logic
grep -n "derivedGeometry\|normalizeGeometry" TabConveyorPhysical.tsx
```

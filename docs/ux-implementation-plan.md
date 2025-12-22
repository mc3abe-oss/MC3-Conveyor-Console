# UX Lane-Based Configurator: Implementation Plan

## 1. Proposed Component Structure

### Current Structure
```
app/
├── page.tsx                      # Main page, state management
└── components/
    ├── CalculatorForm.tsx        # Tab navigation, form wrapper, default inputs
    ├── TabApplicationDemand.tsx  # Tab 1: Load/Product inputs
    ├── TabConveyorBuild.tsx      # Tab 2: Geometry, Belt, Drive
    ├── TabBuildOptions.tsx       # Tab 3: Options, Support, Docs
    ├── CalculationResults.tsx    # Results display
    ├── ReferenceHeader.tsx       # Quote/SO header with actions
    ├── Header.tsx                # Top navigation
    ├── BeltSelect.tsx            # Belt catalog selector
    ├── CatalogSelect.tsx         # Generic catalog selector
    ├── FindConfigModal.tsx       # Search configurations modal
    └── RevisionsPanel.tsx        # Revision history panel
```

### Target Structure (Lane Model)
```
app/
├── page.tsx                      # Main page, state management (minimal changes)
└── components/
    ├── ConfiguratorForm.tsx      # NEW: Single-page form container (replaces CalculatorForm)
    │
    ├── lanes/                    # NEW: Lane-based input groupings
    │   ├── LaneLoad.tsx          # Lane 1: What we're moving
    │   ├── LaneConveyor.tsx      # Lane 2: Physical structure (geometry + support + height)
    │   ├── LaneBelt.tsx          # Lane 3: Belt system
    │   ├── LaneDrive.tsx         # Lane 4: Power & motion
    │   └── LaneBuildOptions.tsx  # Lane 5: Accessories & docs
    │
    ├── sections/                 # NEW: Reusable input sections
    │   ├── SectionGeometry.tsx           # Conveyor dimensions, pulleys
    │   ├── SectionFrameHeight.tsx        # Frame height + derived displays
    │   ├── SectionSupport.tsx            # Support types + TOB config
    │   ├── SectionBeltSelection.tsx      # Belt catalog + PIW/PIL
    │   ├── SectionBeltTracking.tsx       # Tracking method + guidance
    │   ├── SectionBeltModifications.tsx  # Cleats, lacing
    │   ├── SectionDriveConfig.tsx        # Drive location, motor, brake
    │   ├── SectionPowerControls.tsx      # Power feed, controls package
    │   ├── SectionMotionMode.tsx         # Direction, start/stop
    │   └── SectionTechnicalParams.tsx    # Collapsed advanced params
    │
    ├── derived/                  # NEW: Inline derived value displays
    │   ├── DerivedFrameHeight.tsx        # Shows effective height + snub status
    │   ├── DerivedRollerQuantity.tsx     # Shows gravity + snub roller counts
    │   └── DerivedTrackingStatus.tsx     # Compact tracking summary
    │
    ├── CalculationResults.tsx    # Results display (enhanced)
    ├── ReferenceHeader.tsx       # Quote/SO header (unchanged)
    ├── Header.tsx                # Top navigation (unchanged)
    ├── BeltSelect.tsx            # Belt catalog selector (unchanged)
    ├── CatalogSelect.tsx         # Generic catalog selector (unchanged)
    ├── FindConfigModal.tsx       # Search modal (unchanged)
    ├── RevisionsPanel.tsx        # Revision history (unchanged)
    │
    └── legacy/                   # Deprecated (kept for rollback)
        ├── CalculatorForm.tsx
        ├── TabApplicationDemand.tsx
        ├── TabConveyorBuild.tsx
        └── TabBuildOptions.tsx
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `ConfiguratorForm.tsx` | Manages lane layout, passes `inputs` and `updateInput` to lanes, handles keyboard shortcuts |
| `LaneXxx.tsx` | Renders a vertical lane of related sections, handles lane-level state (expanded/collapsed) |
| `SectionXxx.tsx` | Renders a group of inputs with header, manages conditional visibility within section |
| `DerivedXxx.tsx` | Pure display component showing calculated values inline, no input handling |

---

## 2. Step-by-Step Implementation Plan

### Phase 1: Add Inline Derived Displays (LOW RISK)
**Goal:** Show derived values (effective frame height, roller counts) inline without restructuring.

**Files Modified:**
- `TabConveyorBuild.tsx` - Add frame height derived display
- `TabBuildOptions.tsx` - Enhance frame height section with inline calculations

**Changes:**
1. Import calculation functions from `formulas.ts`
2. Compute derived values from current inputs
3. Display inline below relevant inputs

**No state changes. No input movement.**

---

### Phase 2: Move Frame Height to Conveyor Section (MEDIUM RISK)
**Goal:** Relocate `frame_height_mode` and `custom_frame_height_in` to TabConveyorBuild, adjacent to pulley diameter.

**Files Modified:**
- `TabConveyorBuild.tsx` - Add Frame Height section after Conveyor Geometry
- `TabBuildOptions.tsx` - Remove Frame Height section

**Changes:**
1. Cut Frame Height JSX block from TabBuildOptions
2. Paste into TabConveyorBuild after pulley diameter inputs
3. Import `FrameHeightMode` enum into TabConveyorBuild
4. Add derived display for effective height and snub status

**State handling:** None required - same `inputs` object passed to both tabs.

---

### Phase 3: Create Section Components (LOW RISK)
**Goal:** Extract reusable section components to prepare for lane layout.

**Files Created:**
- `sections/SectionGeometry.tsx`
- `sections/SectionFrameHeight.tsx`
- `sections/SectionBeltSelection.tsx`
- `sections/SectionBeltTracking.tsx`
- `sections/SectionDriveElectrical.tsx`

**Changes:**
1. Extract JSX blocks from Tab components into Section components
2. Define consistent props interface: `{ inputs, updateInput }`
3. Replace inline JSX in Tabs with Section component calls
4. Verify no logic changes

**State handling:** Props drilling only - no new state management.

---

### Phase 4: Consolidate Support + Height into Conveyor (MEDIUM RISK)
**Goal:** Move `tail_support_type`, `drive_support_type`, and all TOB fields to TabConveyorBuild.

**Files Modified:**
- `TabConveyorBuild.tsx` - Add Support & Height section
- `TabBuildOptions.tsx` - Remove Support & Height section

**Critical State Handling:**
```typescript
// The conditional logic MUST be preserved exactly:
const legsRequired = derivedLegsRequired(
  inputs.tail_support_type,
  inputs.drive_support_type
);

// TOB fields appear/disappear based on legsRequired
// Mode switching clears TOB values (already implemented)
```

**Changes:**
1. Move support type dropdowns from TabBuildOptions to TabConveyorBuild
2. Move entire Height Configuration block with all conditional logic
3. Preserve `derivedLegsRequired` import and usage
4. Preserve TOB field clearing on mode switch

**Testing:** Verify TOB fields appear/disappear correctly, values clear on mode switch.

---

### Phase 5: Move Cleats to Belt Section (LOW RISK)
**Goal:** Relocate cleat configuration from TabBuildOptions to TabConveyorBuild Belt Selection.

**Files Modified:**
- `TabConveyorBuild.tsx` - Add Cleats subsection in Belt Selection
- `TabBuildOptions.tsx` - Remove Belt & Pulley section

**Changes:**
1. Move `cleats_enabled` toggle and conditional cleat fields
2. Place after belt selection, before belt tracking
3. Add cross-reference note about part dimensions

**State handling:** None - simple field relocation.

---

### Phase 6: Relocate Drive Configuration (LOW RISK)
**Goal:** Move `drive_location`, `brake_motor`, `gearmotor_orientation`, `drive_hand` to TabConveyorBuild.

**Files Modified:**
- `TabConveyorBuild.tsx` - Add to Drive & Electrical section
- `TabBuildOptions.tsx` - Remove Drive & Gearmotor section

**Changes:**
1. Move drive configuration fields
2. Move motor brand to same section
3. Consider adding brake motor reminder when start/stop is enabled

**State handling:** None required.

---

### Phase 7: Single-Page Lane Layout (HIGH RISK)
**Goal:** Replace tab navigation with single-page lane-based layout.

**Files Created:**
- `ConfiguratorForm.tsx` - New main form container
- `lanes/LaneLoad.tsx`
- `lanes/LaneConveyor.tsx`
- `lanes/LaneBelt.tsx`
- `lanes/LaneDrive.tsx`
- `lanes/LaneBuildOptions.tsx`

**Files Modified:**
- `page.tsx` - Replace CalculatorForm with ConfiguratorForm

**Layout Structure:**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Row 1: Load, Conveyor, Belt */}
  <LaneLoad inputs={inputs} updateInput={updateInput} />
  <LaneConveyor inputs={inputs} updateInput={updateInput} />
  <LaneBelt inputs={inputs} updateInput={updateInput} />

  {/* Row 2: Drive, Build Options */}
  <LaneDrive inputs={inputs} updateInput={updateInput} />
  <div className="lg:col-span-2">
    <LaneBuildOptions inputs={inputs} updateInput={updateInput} />
  </div>
</div>

{/* Technical Parameters - Collapsed */}
<CollapsibleSection title="Technical Parameters" defaultOpen={false}>
  <SectionTechnicalParams inputs={inputs} updateInput={updateInput} />
</CollapsibleSection>
```

**Critical State Handling:**
1. All state remains in `page.tsx` - no change
2. `inputs` and `updateInput` passed down through lanes to sections
3. Keyboard handling (Enter to calculate) preserved
4. Conditional field visibility logic unchanged

**Mobile Responsiveness:**
```tsx
// Lanes stack vertically on mobile
className="grid grid-cols-1 lg:grid-cols-3 gap-6"
```

---

### Phase 8: Collapse Technical Parameters (LOW RISK)
**Goal:** Move advanced parameters to collapsible section at bottom.

**Files Created:**
- `sections/SectionTechnicalParams.tsx`

**Inputs Moved:**
- `friction_coeff`
- `safety_factor`
- `starting_belt_pull_lb`
- `motor_rpm` (when overriding)
- `belt_coeff_piw` / `belt_coeff_pil` (when no belt selected)
- `shaft_diameter_mode` and manual shaft inputs

**Changes:**
1. Create collapsible wrapper component
2. Extract advanced params from current location
3. Default to collapsed state
4. Persist expansion state in session storage (optional)

---

## 3. Specific Code Changes Per Phase

### Phase 1: Derived Displays

**Add to `TabConveyorBuild.tsx` after pulley inputs:**
```tsx
import {
  calculateEffectiveFrameHeight,
  calculateRequiresSnubRollers,
  calculateGravityRollerQuantity,
  calculateSnubRollerQuantity,
  FRAME_HEIGHT_CONSTANTS,
  SNUB_ROLLER_CLEARANCE_THRESHOLD_IN,
} from '../../src/models/sliderbed_v1/formulas';
import { FrameHeightMode } from '../../src/models/sliderbed_v1/schema';

// Inside component, after pulley diameter state:
const effectiveFrameHeight = calculateEffectiveFrameHeight(
  inputs.frame_height_mode ?? FrameHeightMode.Standard,
  drivePulleyDia,
  inputs.custom_frame_height_in
);

const requiresSnubs = calculateRequiresSnubRollers(
  effectiveFrameHeight,
  drivePulleyDia,
  tailPulleyDia
);

const gravityRollerQty = calculateGravityRollerQuantity(
  inputs.conveyor_length_cc_in,
  requiresSnubs
);

const snubRollerQty = calculateSnubRollerQuantity(requiresSnubs);

// Render inline after pulley inputs:
<div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
  <div className="flex justify-between">
    <span className="text-gray-600">Effective Frame Height:</span>
    <span className="font-medium">{effectiveFrameHeight.toFixed(1)}"</span>
  </div>
  <div className="flex justify-between mt-1">
    <span className="text-gray-600">Snub Rollers:</span>
    <span className={requiresSnubs ? 'text-yellow-600' : 'text-green-600'}>
      {requiresSnubs ? `Required (${snubRollerQty})` : 'Not required'}
    </span>
  </div>
  <div className="flex justify-between mt-1">
    <span className="text-gray-600">Gravity Rollers:</span>
    <span className="font-medium">{gravityRollerQty}</span>
  </div>
</div>
```

### Phase 2: Move Frame Height

**Remove from `TabBuildOptions.tsx`:**
```tsx
// Delete entire section:
{/* v1.5: Frame Height */}
<div>
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Frame Height</h3>
  ...
</div>
```

**Add to `TabConveyorBuild.tsx` after Conveyor Geometry section:**
```tsx
{/* v1.5: Frame Height - Adjacent to pulley diameter */}
<div>
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Frame Height</h3>
  {/* Frame Height Mode dropdown */}
  {/* Custom Frame Height conditional input */}
  {/* Inline derived display */}
  {/* Info messages */}
</div>
```

### Phase 4: Support + Height Consolidation

**New structure in `TabConveyorBuild.tsx`:**
```tsx
{/* Section: Support & Height */}
<div>
  <h3 className="text-lg font-semibold text-gray-900 mb-4">Support & Height</h3>

  {/* Tail End Support */}
  <div>...</div>

  {/* Drive End Support */}
  <div>...</div>

  {/* Height Configuration - CONDITIONAL */}
  {derivedLegsRequired(inputs.tail_support_type, inputs.drive_support_type) && (
    <div className="border-t border-gray-200 pt-4 mt-2 space-y-4">
      <h4>Height Configuration</h4>
      {/* Height Input Mode */}
      {/* Reference End (Mode A) */}
      {/* TOB inputs */}
      {/* Leg Adjustment Range */}
    </div>
  )}
</div>
```

**Critical: Preserve clearing logic on mode switch:**
```tsx
onChange={() => {
  // Mode switching clears TOB values to avoid ghost ownership
  updateInput('tail_tob_in', undefined);
  updateInput('drive_tob_in', undefined);
  updateInput('height_input_mode', HeightInputMode.ReferenceAndAngle);
}}
```

---

## 4. State Handling Callouts

### Critical State Patterns to Preserve

#### 1. TOB Field Clearing on Support Type Change
When switching from legs to external, TOB values must NOT persist:
```tsx
// Current behavior in TabBuildOptions.tsx must be preserved
// derivedLegsRequired gates visibility - values should be undefined when hidden
```

**Risk:** If TOB fields exist in state but are hidden, saving would include stale data.
**Mitigation:** Validation rules already handle this (see `rules.ts` TOB validation).

#### 2. Pulley Diameter Sync
Legacy `pulley_diameter_in` must stay in sync with `drive_pulley_diameter_in`:
```tsx
updateInput('drive_pulley_diameter_in', value);
updateInput('pulley_diameter_in', value); // Keep legacy field in sync
```

#### 3. Conditional Input Registration
Some inputs only exist conditionally. Form must not include them when hidden:
```tsx
// Example: v_guide_profile only relevant when belt_tracking_method = V-guided
// Value is already preserved in inputs, just not shown
```

#### 4. Keyboard Calculate Trigger
Enter key triggers calculation - must work with new layout:
```tsx
const handleKeyPress = (e: React.KeyboardEvent) => {
  const target = e.target as HTMLElement;
  if (e.key === 'Enter' && target.tagName !== 'TEXTAREA') {
    e.preventDefault();
    // Trigger calculation
  }
};
```

### State Flow Diagram
```
page.tsx
├── inputs: SliderbedInputs (source of truth)
├── updateInput: (field, value) => setInputs(...)
└── result: CalculationResult | null

    └── ConfiguratorForm
        ├── Receives: inputs, updateInput, onCalculate
        └── Passes to Lanes

            └── LaneConveyor
                ├── Receives: inputs, updateInput
                ├── Computes: derived values (effectiveFrameHeight, etc.)
                └── Renders: inputs + derived displays
```

---

## 5. Input Adjacency Requirements (from Analysis)

These inputs MUST be visually adjacent in the final layout:

| Group | Inputs | Reason |
|-------|--------|--------|
| **A** | `drive_pulley_diameter_in`, `frame_height_mode`, `custom_frame_height_in` | Frame height = f(pulley) |
| **B** | `conveyor_incline_deg`, TOB inputs | Geometric coupling |
| **C** | `tail_support_type`, `drive_support_type`, TOB config | Support gates height |
| **D** | `belt_catalog_key`, `belt_tracking_method`, `v_guide_profile` | Belt selection cascade |
| **E** | `start_stop_application`, `brake_motor` | Often implies each other |
| **F** | `drive_rpm`, `belt_speed_fpm`, `drive_location` | All drive-related |

---

## 6. Validation Behavior Preservation

All existing validation must continue to work:

| Validation | Location | Must Preserve |
|------------|----------|---------------|
| TOB required when legs | `rules.ts:validateInputs` | Error if legs required but TOB missing |
| Frame height minimum | `rules.ts:validateInputs` | Error if < 3.0" |
| Belt minimum pulley | `TabConveyorBuild.tsx` | Inline warning display |
| Cleat spacing vs part | `rules.ts:checkWarnings` | Warning if spacing < part dim |
| V-guide recommendation | `tracking-guidance.ts` | Banner display |

**No validation logic changes permitted.**

---

## 7. Rollback Strategy

Keep legacy components in `legacy/` folder during transition:
1. `CalculatorForm.tsx` → `legacy/CalculatorForm.tsx`
2. Tab components → `legacy/`

If issues arise:
```tsx
// In page.tsx, swap back:
import CalculatorForm from './components/legacy/CalculatorForm';
```

---

## 8. Testing Checklist Per Phase

### Phase 1-2: Derived Displays + Frame Height Move
- [ ] Effective frame height updates when pulley changes
- [ ] Snub roller status reflects frame height mode
- [ ] Custom frame height input appears/disappears correctly
- [ ] Low profile and design review info messages show
- [ ] No console errors

### Phase 4: Support + Height Consolidation
- [ ] TOB fields appear when legs selected at either end
- [ ] TOB fields disappear when both ends external
- [ ] TOB values clear on mode switch
- [ ] Reference end selection works in Mode A
- [ ] Both TOB inputs work in Mode B
- [ ] Validation errors show for missing TOB
- [ ] Angle mismatch warning shows when applicable

### Phase 7: Lane Layout
- [ ] All inputs accessible
- [ ] All conditional visibility preserved
- [ ] Enter key calculates
- [ ] Mobile layout stacks properly
- [ ] Calculate button works
- [ ] Load/Save continues to work
- [ ] Results display correctly

---

## 9. Migration Risk Assessment

| Phase | Risk Level | Reason |
|-------|------------|--------|
| 1 | Low | Additive - no input movement |
| 2 | Medium | Simple move, but affects pulley adjacency |
| 3 | Low | Refactor only - no logic changes |
| 4 | Medium | Complex conditional logic for TOB |
| 5 | Low | Simple move, self-contained |
| 6 | Low | Simple move, self-contained |
| 7 | High | Complete layout restructure |
| 8 | Low | Collapse wrapper only |

**Recommended Approach:** Complete phases 1-6 first, validate thoroughly, then proceed to phase 7.

---

## 10. Summary: What Changes vs What Stays

### DOES NOT CHANGE
- Calculation logic (`formulas.ts`)
- Validation rules (`rules.ts`)
- Input/output field names (schema)
- Default parameter values
- API endpoints
- State management in `page.tsx`

### CHANGES
- Visual layout (tabs → lanes)
- Input physical location (grouping)
- Inline derived displays (new)
- Component file structure
- CSS/layout classes

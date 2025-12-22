# UX & Input Logic Analysis: Lane-Based Configurator Model

## Executive Summary

This document evaluates the current conveyor configurator UX and proposes a restructured single-page, lane-based input model. The focus is on **input logic and ordering** rather than visual design—ensuring related inputs are physically adjacent, dependencies are clear, and users can change direction without losing context.

---

## 1. UX & Input Logic Evaluation

### 1.1 Where the Current UI Breaks Logical Flow

#### **Problem: Support Type & Height Separated from Geometry**

**Current State:**
- Conveyor geometry (length, width, incline) is in **Tab 2: Conveyor Build**
- Support types (Legs/Casters/External) are in **Tab 3: Build Options → Documentation & Finish**
- Height configuration (TOB) appears conditionally below support types

**Why This Breaks:**
- Support type directly constrains what heights are possible
- Incline angle and height are geometrically coupled
- User decides "I need a 36" high inclined conveyor" but must configure this across 2 tabs
- Changing support type in Tab 3 may invalidate geometry assumptions made in Tab 2

**Example Scenario:**
1. User sets 10° incline in Tab 2
2. User moves to Tab 3, selects "Legs" at both ends
3. User enters TOB values that create a different implied angle
4. System shows warning, but user has to mentally reconcile across tabs

#### **Problem: Frame Height Divorced from Pulley Diameter**

**Current State:**
- Drive pulley diameter is in **Tab 2: Conveyor Geometry**
- Frame height mode is in **Tab 3: Build Options → Frame Height section**

**Why This Breaks:**
- Frame height is literally calculated as `pulley_diameter + offset`
- Snub roller requirement depends on both values simultaneously
- User adjusts pulley size → must navigate to different tab to see frame height impact

**Coupling Evidence (from formulas.ts):**
```typescript
// Frame height directly depends on pulley diameter
return drivePulleyDiameterIn + FRAME_HEIGHT_CONSTANTS.STANDARD_OFFSET_IN;

// Snub rollers depend on BOTH
return effectiveFrameHeightIn < (largestPulleyDiameter + SNUB_ROLLER_CLEARANCE_THRESHOLD_IN);
```

#### **Problem: Belt Selection Separated from Belt-Dependent Outputs**

**Current State:**
- Belt selection is in Tab 2
- Belt tracking method is in Tab 2 (good)
- Cleats configuration is in **Tab 3: Belt & Pulley section**

**Why This Partially Breaks:**
- Cleats are a belt modification that affects part handling (Tab 1 territory)
- Cleat spacing must consider part dimensions (defined in Tab 1)
- Cleat validation warns if `spacing < part_travel_dimension`, but these inputs are tabs apart

#### **Problem: Drive Configuration Fragmented**

**Current State:**
- Drive RPM, belt speed: Tab 2
- Power feed, controls package: Tab 2
- Drive location, brake motor, gearmotor orientation, drive hand: **Tab 3**

**Why This Breaks:**
- Drive location affects physical geometry (motor sticks out one end)
- Brake motor choice relates to direction mode and start/stop (Tab 1)
- Motor brand is in Tab 3, but motor RPM is in Tab 2 advanced params

### 1.2 Where Related Inputs Are Too Far Apart

| Input A | Input B | Problem |
|---------|---------|---------|
| `conveyor_incline_deg` (Tab 2) | `tail_tob_in` / `drive_tob_in` (Tab 3) | Incline and heights are geometrically the same constraint |
| `drive_pulley_diameter_in` (Tab 2) | `frame_height_mode` (Tab 3) | Frame height = f(pulley diameter) |
| `belt_catalog_key` (Tab 2) | `cleats_enabled` (Tab 3) | Cleats are belt modifications |
| `part_length_in` / `part_width_in` (Tab 1) | `cleat_spacing_in` (Tab 3) | Cleat spacing validation needs part dimensions |
| `start_stop_application` (Tab 1) | `brake_motor` (Tab 3) | Start/stop often implies brake motor need |
| `side_loading_direction` (Tab 1) | `belt_tracking_method` (Tab 2) | Side loading drives V-guide recommendation |
| `conveyor_length_cc_in` (Tab 2) | `gravity_roller_quantity` (output) | Length determines roller count, but no input proximity to explain |

### 1.3 Where Users Likely Change Direction

**Scenario 1: "I need a different pulley size"**
- User is in Tab 3 configuring frame height
- Realizes snub rollers are required
- Wants to try larger pulley to avoid snubs
- Must go back to Tab 2, change pulley, return to Tab 3

**Scenario 2: "Let me switch from legs to external support"**
- User has spent time configuring TOB heights
- Decides external mounting is better
- Changes support type → TOB fields disappear
- If they switch back, values are gone (by design, to prevent ghost data)

**Scenario 3: "I need to reconsider belt tracking"**
- User sees V-guide recommendation warning in Tab 2
- Realizes side loading info in Tab 1 might be wrong
- Goes back to Tab 1, updates side loading
- Must return to Tab 2 to see updated recommendation

**Scenario 4: "This conveyor needs cleats"**
- User reviewing part handling in Tab 1
- Incline is steep, parts might slide
- Must go to Tab 3 to enable cleats
- Cleat spacing must account for part size (back to Tab 1 to check)

---

## 2. Lane-Based Input Model Proposal

### 2.1 Recommended Lanes

I propose **5 primary lanes** organized by engineering domain, with a **Technical Parameters** collapse section:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SINGLE PAGE CONFIGURATOR                         │
├─────────────────────────────────────────────────────────────────────────┤
│ LANE 1: LOAD           │ LANE 2: CONVEYOR        │ LANE 3: BELT         │
│ (What we're moving)    │ (Physical structure)    │ (Belt system)        │
│                        │                         │                      │
│ • Part dimensions      │ • Length, Width         │ • Belt selection     │
│ • Part weight          │ • Pulley diameters      │ • Tracking method    │
│ • Orientation          │ • Frame height          │ • V-guide profile    │
│ • Spacing              │ • Incline angle         │ • Lacing style       │
│ • Material type        │ • Support types         │ • Cleats             │
│ • Process type         │ • Height (TOB)          │                      │
│ • Temperature          │ • Bed type              │                      │
│ • Fluids               │                         │                      │
├─────────────────────────────────────────────────────────────────────────┤
│ LANE 4: DRIVE          │ LANE 5: BUILD OPTIONS                          │
│ (Power & motion)       │ (Accessories & documentation)                  │
│                        │                                                │
│ • Drive location       │ • Guards & Safety (bottom covers, end guards)  │
│ • Drive RPM            │ • Guides (side rails, skirts)                  │
│ • Belt speed           │ • Sensors                                      │
│ • Motor brand          │ • Bearing grade                                │
│ • Motor mounting       │ • Finish & paint                               │
│ • Brake motor          │ • Documentation package                        │
│ • Direction mode       │ • Labels, spec source                          │
│ • Power feed           │                                                │
│ • Controls package     │                                                │
├─────────────────────────────────────────────────────────────────────────┤
│ [▼ Technical Parameters] (collapsed by default)                         │
│   • Friction coefficient  • Safety factor  • Belt coefficients          │
│   • Starting belt pull    • Motor RPM      • Shaft diameters            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Rationale for Lane Assignments

#### **LANE 1: LOAD** — "What are we moving?"
Groups all inputs that describe the product being conveyed:
- Part physical properties (weight, dimensions, temperature, sharpness)
- Part behavior (orientation, spacing, fluids)
- Application context (material type, process type)
- Drop height (part behavior on entry)

**Why together:** These all affect belt selection, load calculations, and cleat requirements. A user thinking about "the thing I'm moving" can configure all related inputs in one place.

#### **LANE 2: CONVEYOR** — "The physical structure"
Groups all inputs that define the physical conveyor frame:
- Envelope dimensions (length, width)
- Pulley sizing (drive, tail)
- Frame configuration (height mode, custom height)
- Incline geometry
- Support structure (legs/casters/external at each end)
- Height specification (TOB values)
- Bed type (slider vs roller)

**Why together:** These are all **geometrically coupled**. Changing length affects roller count. Changing pulley diameter affects frame height. Changing incline affects TOB. Changing support type determines whether heights are needed. Users making structural decisions can see all implications.

**Critical adjacencies:**
- Pulley diameter ↔ Frame height (formula dependency)
- Incline angle ↔ TOB heights (geometric coupling)
- Support types ↔ Height configuration (conditional reveal)

#### **LANE 3: BELT** — "The belt system"
Groups all belt-related decisions:
- Belt selection from catalog
- Belt tracking method (V-guide vs crowned)
- V-guide profile selection
- Lacing style and material
- Cleats configuration

**Why together:** These all modify or constrain the belt. Belt selection affects minimum pulley diameter. Tracking method affects pulley face width. Cleats affect part handling. Users thinking about "belt choices" can make all decisions here.

**Why cleats moved here:** Cleats are physically part of the belt, even though they relate to part handling. The validation relationship with part dimensions is handled through messaging.

#### **LANE 4: DRIVE** — "Power and motion"
Groups all inputs related to making the conveyor move:
- Drive location (head/tail/center)
- Drive RPM and belt speed
- Direction mode (one-way/reversing)
- Brake motor requirement
- Motor brand and mounting orientation
- Drive hand (left/right)
- Power feed (voltage, phase)
- Controls package

**Why together:** These are all about "how we power and control this thing." Start/stop application moves here because it's fundamentally about motion control, not load handling.

**Critical adjacency:**
- Start/stop application ↔ Brake motor (often implies)
- Direction mode ↔ Brake motor (reversing may need braking)
- Drive RPM ↔ Belt speed (derived relationship)

#### **LANE 5: BUILD OPTIONS** — "Accessories and documentation"
Groups all non-structural options:
- Safety features (covers, guards, finger-safe intent)
- Guide rails and skirts
- Sensor options
- Field wiring
- Bearing grade
- Finish and paint
- Documentation package
- Labels and spec source

**Why together:** These are "additions" to the base conveyor that don't fundamentally change the engineering calculations. They matter for quoting and manufacturing but are less interdependent.

### 2.3 "Core" vs "Technical/Advanced" Identification

**Core Inputs** (always visible):
- All of Lane 1 (Load)
- All of Lane 2 (Conveyor) except shaft diameter mode
- All of Lane 3 (Belt) except PIW/PIL overrides
- All of Lane 4 (Drive) except Motor RPM (the input, not the selection)
- All of Lane 5 (Build Options)

**Technical/Advanced** (collapsed section):
- Friction coefficient
- Safety factor
- Starting belt pull
- Belt coefficients (PIW/PIL when no belt selected)
- Motor RPM input (when overriding from motor selection)
- Shaft diameter manual mode and inputs

**Rationale:** Technical parameters have sensible defaults and are rarely changed by most users. But they impact formulas, so they must be accessible—not hidden, just collapsed.

---

## 3. Input Ordering & Adjacency Rules

### 3.1 Ordering Principles

1. **Dependency Order**: Inputs that constrain other inputs come first
   - Support type before height configuration
   - Belt selection before tracking method
   - Frame height mode before custom height value

2. **Conceptual Flow**: Within a domain, follow natural engineering thinking
   - Dimensions before constraints
   - "What" before "how much"
   - Required before optional

3. **Coupling Proximity**: Inputs that share formulas are adjacent
   - Pulley diameter immediately followed by frame height
   - Incline angle near height specification

4. **Conditional Nesting**: Dependent inputs appear indented/nested below trigger
   - Custom frame height indented under frame height mode
   - TOB inputs indented under support type when legs required
   - V-guide profile indented under tracking method when V-guided

### 3.2 Recommended Input Sequence by Lane

#### LANE 2: CONVEYOR (example of proper ordering)

```
1. Bed Type                    [Top-level type decision]
2. Conveyor Length (C-C)       [Primary dimension]
3. Conveyor Width              [Primary dimension]
4. Drive Pulley Diameter       [Affects frame height, tracking]
   └─ Tail Pulley Matches?     [Conditional]
      └─ Tail Pulley Diameter  [Conditional]
5. Frame Height Mode           [Immediately after pulley - coupled]
   └─ Custom Frame Height      [Conditional]
   └─ Snub roller info         [Derived display]
6. Incline Angle               [Affects height geometry]
7. Support Type - Tail End     [Determines height requirement]
8. Support Type - Drive End    [Determines height requirement]
   └─ Height Input Mode        [Conditional: when legs required]
      └─ Reference End         [Conditional: Mode A]
      └─ Reference TOB         [Conditional: Mode A]
      └─ Tail TOB / Drive TOB  [Conditional: Mode B]
   └─ Leg Adjustment Range     [Conditional: when legs required]
```

**Why This Order:**
- Pulley diameter → Frame height: Direct formula dependency
- Frame height → Incline: Both affect vertical geometry
- Incline → Heights: User should know incline before specifying TOB
- Support type → Height config: Gates conditional appearance

### 3.3 When to Split vs Combine Sections

**Combine when:**
- Inputs share a formula (pulley + frame height)
- One input validates against another (cleat spacing vs part size)
- Changing one typically requires reconsidering the other (incline + TOB)

**Split when:**
- Inputs serve different engineering purposes
- One is "what" and one is "how much" (belt selection vs belt properties)
- Progressive disclosure improves clarity (belt → tracking → V-guide profile)

---

## 4. Dependency Communication Strategy

### 4.1 Dependency Surfacing Methods

#### **Method 1: Placement (Primary)**
Related inputs are physically adjacent. This is the strongest form of communication.

Example: Frame height mode appears immediately after pulley diameter, not in a different tab.

#### **Method 2: Inline Explanation**
Brief text explaining the relationship for non-obvious couplings.

Example under Frame Height Mode:
> "Standard frame clears the drive pulley with 2.5" margin. Low Profile and Custom are cost options."

#### **Method 3: Derived Value Display**
Show calculated values inline, not just in results.

Example: After selecting pulley diameter and frame height mode:
> "Effective frame height: 6.5" | Snub rollers: Not required"

#### **Method 4: Warning Banners**
For constraint violations or recommended changes.

Example: Tracking guidance banner that shows when geometry suggests V-guide but user selected crowned.

#### **Method 5: Validation Messages**
Red/yellow/info messages for errors, warnings, and notes.

### 4.2 When to Explain vs Enforce

| Situation | Approach |
|-----------|----------|
| Physical impossibility | **Enforce** (error) — e.g., frame height < 3" |
| Strong engineering recommendation | **Explain** (warning) — e.g., "V-guide recommended for this L/W ratio" |
| Cost implications | **Explain** (info) — e.g., "Low profile frame is a cost option" |
| Constraint from other input | **Explain + Show** — e.g., "Drive pulley below belt minimum (4" required)" |
| Calculated value | **Display** — e.g., show effective frame height, don't just say "depends on pulley" |

### 4.3 Dependency Communication Examples

**Example: Pulley ↔ Frame Height**
```
Drive Pulley Diameter: [4" ▼]
Frame Height Mode:     [Standard (Pulley + 2.5") ▼]
                       ───────────────────────────────
                       Effective Height: 6.5"
                       Snub Rollers: Not required ✓
```

**Example: Support Type ↔ Height Configuration**
```
Tail End Support: [Legs (Floor Mounted) ▼]
Drive End Support: [External (Suspended) ▼]

┌─ Height Configuration ────────────────────────────┐
│ Floor-standing support requires height (TOB).     │
│                                                   │
│ Height Input Mode: ○ Reference + Angle ● Both     │
│ Tail TOB (in): [36____]                          │
│ Note: Drive end is external; no drive TOB needed  │
└───────────────────────────────────────────────────┘
```

---

## 5. Results Mode Recommendation

### 5.1 Toggle vs Full-Page Tab

**Recommendation: Full-Page Tab** (not toggle)

**Rationale:**
1. Results section is substantial (8+ grouped sections, 30+ values)
2. Users often want to print/export results
3. Toggle would require split-screen or overlay, cluttering input space
4. Tab allows dedicated layout optimized for results review

**Implementation:**
- Add "Results" as the 4th (or final) tab/lane
- Results tab is always accessible, shows last calculation
- Stale indicator if inputs changed since last calc
- "Calculate" button prominent in both input area and results tab

### 5.2 What Belongs in Results vs Inputs

**Inputs Only:**
- All user-configurable values
- Mode selections (frame height mode, tracking method, etc.)

**Results Only:**
- Calculated values (torque, belt pull, gear ratio)
- Derived quantities (gravity roller count, snub roller count)
- Validation summaries
- Parameters used (showing what defaults were applied)

**Hybrid (show in BOTH):**
- Effective frame height (input area: inline display; results: detailed)
- Tracking recommendation (input area: banner; results: summary)
- Minimum pulley diameter (input area: error if violated; results: reference)

### 5.3 Results Organization

Keep current groupings but add:
1. **Validation Summary** at top — errors/warnings count with jump-to-source
2. **Assumptions Applied** — which defaults were used, which inputs had fallbacks
3. **Input Echo** — key inputs repeated for context when viewing printed results

---

## 6. Migration Strategy

### 6.1 Incremental Changes (Low Risk)

**Phase 1: Relocate Frame Height to Conveyor Section**
- Move `frame_height_mode` and `custom_frame_height_in` from TabBuildOptions to TabConveyorBuild
- Place immediately after pulley diameter inputs
- Add inline effective height display

**Phase 2: Add Derived Displays**
- Show effective frame height after mode selection
- Show snub roller status inline
- Show gravity roller estimate inline

**Phase 3: Relocate Drive Configuration**
- Move `drive_location`, `brake_motor`, `gearmotor_orientation`, `drive_hand` to TabConveyorBuild Drive & Electrical section
- Keep motor brand with drive config

### 6.2 Refactors Required (Medium Risk)

**Phase 4: Consolidate Support + Height**
- Move support type inputs from TabBuildOptions to TabConveyorBuild
- Move all height configuration (TOB fields) with them
- Requires careful state management to preserve conditional logic

**Phase 5: Move Cleats to Belt Section**
- Move `cleats_enabled` and cleat config from TabBuildOptions to TabConveyorBuild Belt Selection section
- Adds cross-validation concern with part dimensions in Tab 1

**Phase 6: Relocate Start/Stop to Drive**
- Move `start_stop_application` and `cycle_time_seconds` from TabApplicationDemand to Drive section
- Consider showing brake motor reminder when start/stop enabled

### 6.3 Major Restructure (Higher Risk)

**Phase 7: Single Page Lane Model**
- Replace 3 tabs with single scrollable page
- Create lane column layout (responsive: columns on desktop, stacked on mobile)
- Implement sticky headers for lane identification
- Add Results toggle or tab

**Phase 8: Collapse Technical Parameters**
- Move advanced params from TabConveyorBuild to collapsible section
- Ensure expand/collapse doesn't lose state
- Consider "Show advanced" toggle that persists per session

### 6.4 Risks and Edge Cases

| Risk | Mitigation |
|------|------------|
| Lost scroll position when changing tabs | Lane model eliminates tabs |
| Mobile usability with lanes | Stack lanes vertically on mobile |
| Very long single page | Lane headers stick on scroll; quick-nav menu |
| Conditional field persistence | Same state management as current; just different layout |
| Print layout | Dedicated print stylesheet for single page |
| User confusion during transition | Announce changes; provide "classic view" fallback initially |

### 6.5 Recommended Sequence

1. **Immediate** (no restructure): Add derived displays (effective frame height, roller counts) inline
2. **Short-term**: Move frame height to Conveyor section
3. **Medium-term**: Consolidate support + height + drive into Conveyor section
4. **Long-term**: Full lane model with single-page layout

---

## 7. Appendix: Input Dependency Map

### Formula Dependencies (must be adjacent)

```
drive_pulley_diameter_in ──────┬──→ effective_frame_height_in
tail_pulley_diameter_in ───────┤
frame_height_mode ─────────────┤
custom_frame_height_in ────────┘

effective_frame_height_in ─────┬──→ requires_snub_rollers
largest_pulley_diameter ───────┘

conveyor_length_cc_in ─────────┬──→ gravity_roller_quantity
requires_snub_rollers ─────────┘

conveyor_length_cc_in ─────────┬──→ tracking_recommendation
conveyor_width_in ─────────────┤
conveyor_incline_deg ──────────┤
side_loading_severity ─────────┘

belt_catalog_key ──────────────┬──→ min_pulley_diameter
belt_tracking_method ──────────┘

cleat_spacing_in ──────────────┬──→ cleat_spacing_validation
part_length_in ────────────────┤
part_width_in ─────────────────┤
orientation ───────────────────┘
```

### Conditional Visibility Dependencies

```
tail_matches_drive = false ──→ show tail_pulley_diameter_in
frame_height_mode = Custom ──→ show custom_frame_height_in
belt_tracking_method = V-guided ──→ show v_guide_profile
shaft_diameter_mode = Manual ──→ show shaft diameter inputs
lacing_style != Endless ──→ show lacing_material
cleats_enabled = true ──→ show cleat config fields
start_stop_application = true ──→ show cycle_time_seconds
side_loading_direction != None ──→ show side_loading_severity
spec_source = Customer ──→ show customer_spec_reference
legs_required = true ──→ show height_input_mode + TOB fields
height_input_mode = BothEnds ──→ show both TOB inputs
height_input_mode = ReferenceAndAngle ──→ show reference_end + single TOB
```

---

## 8. Summary of Key Recommendations

1. **Frame height must be adjacent to pulley diameter** — They share a formula. Current separation across tabs is the most critical fix.

2. **Support types and height configuration belong with geometry** — These are structural decisions, not "build options."

3. **Drive configuration should be consolidated** — Split across tabs makes no sense.

4. **Use a lane model, not tabs** — Reduces navigation friction, improves visibility of dependencies.

5. **Show derived values inline** — Don't make users switch to results to see effect of their input.

6. **Keep technical parameters accessible but collapsed** — They affect calculations, so hiding them would be wrong. Collapsing is appropriate.

7. **Results as full-page view, not toggle** — Content is too substantial for overlay.

8. **Migrate incrementally** — Start with relocating frame height, end with full lane restructure.

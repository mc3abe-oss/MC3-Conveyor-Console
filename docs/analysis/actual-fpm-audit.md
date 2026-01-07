# Actual FPM Implementation Audit

**Date:** 2026-01-06
**Branch:** `feat/actual-fpm-from-selected-gearmotor`
**Purpose:** Analysis before implementing "Actual Belt Speed (FPM)" based on selected gearmotor

---

## 1. Current-State Meaning Map

### 1.1 FPM/Belt Speed Locations in Codebase

| File | Symbol/Field | Type | Meaning |
|------|--------------|------|---------|
| `src/models/sliderbed_v1/schema.ts:938` | `belt_speed_fpm` (input) | User Input | **Desired** belt speed entered by user |
| `src/models/sliderbed_v1/schema.ts:1964` | `belt_speed_fpm` (output) | Computed/Echo | Same as input when speed_mode='belt_speed', computed when 'drive_rpm' |
| `src/models/sliderbed_v1/outputs_v2/schema.ts:67` | `SummaryV2.belt_speed_fpm` | Display | Echo of outputs.belt_speed_fpm for display |
| `src/models/sliderbed_v1/outputs_v2/schema.ts:198` | `BeltOperatingConditionsV2.speed_fpm` | Display | Alias for belt_speed_fpm in vendor packets |
| `src/models/sliderbed_v1/formulas.ts:706-712` | `calculateDriveShaftRpm()` | Derived | Converts belt_speed → drive_shaft_rpm |
| `src/models/sliderbed_v1/formulas.ts:769-775` | `calculateBeltSpeed()` | Derived | Converts drive_rpm → belt_speed (legacy mode) |

### 1.2 Detailed Location Analysis

#### Input Fields
- **`inputs.belt_speed_fpm`** (`schema.ts:938-939`)
  - Represents: **Desired/Target** belt speed
  - Unit: feet per minute (FPM)
  - Used when: `speed_mode === 'belt_speed'` (default since v1.6)

#### Output Fields
- **`outputs.belt_speed_fpm`** (`schema.ts:1964-1965`)
  - Represents: **Effective belt speed used in calculations**
  - In belt_speed mode: equals input value (echo)
  - In drive_rpm mode: calculated from user's drive RPM input

#### Formula Functions
- **`calculateDriveShaftRpm(beltSpeedFpm, pulleyDiameterIn)`** (`formulas.ts:706-712`)
  ```ts
  return beltSpeedFpm / ((pulleyDiameterIn / 12) * Math.PI);
  ```
  - Direction: belt_speed → drive_shaft_rpm
  - Used: When user inputs desired FPM to find required RPM

- **`calculateBeltSpeed(driveRpm, pulleyDiameterIn)`** (`formulas.ts:769-775`)
  ```ts
  return driveRpm * (Math.PI * (pulleyDiameterIn / 12));
  ```
  - Direction: drive_rpm → belt_speed
  - Used: Legacy mode, or for back-calculating from selected gearmotor

---

## 2. Speed-Chain Dependency Graph

### 2.1 Current Flow (Desired FPM Mode)

```
USER INPUTS:
├── desired_belt_speed_fpm (inputs.belt_speed_fpm)
├── drive_pulley_diameter_in (inputs.drive_pulley_diameter_in OR inputs.pulley_diameter_in)
├── gearmotor_mounting_style ('shaft_mounted' | 'bottom_mount')
├── gm_sprocket_teeth (if bottom_mount)
└── drive_shaft_sprocket_teeth (if bottom_mount)

CURRENT COMPUTED VALUES:
├── drive_shaft_rpm = belt_speed_fpm / ((pulley_dia / 12) * π)
├── chain_ratio = drive_shaft_sprocket_teeth / gm_sprocket_teeth  (or 1.0 if shaft_mounted)
├── gearmotor_output_rpm = drive_shaft_rpm * chain_ratio
├── gear_ratio = motor_rpm / drive_shaft_rpm
└── total_drive_ratio = gear_ratio * chain_ratio
```

### 2.2 Proposed Flow (Adding Actual FPM)

```
FROM SELECTED GEARMOTOR:
├── gearmotor_output_rpm_actual (from GearmotorCandidate.output_rpm)

COMPUTED:
├── drive_ratio = (direct: 1.0) | (chain: gm_sprocket_teeth / drive_shaft_sprocket_teeth)
│   NOTE: This is INVERSE of chain_ratio!
│   chain_ratio = driven/driver (speed reduction factor for REQUIRED calculation)
│   drive_ratio = driver/driven (speed multiplication factor from gearmotor to pulley)
├── drive_pulley_rpm_actual = gearmotor_output_rpm_actual * drive_ratio
└── actual_belt_speed_fpm = (drive_pulley_rpm_actual * π * drive_pulley_diameter_in) / 12
```

### 2.3 Single Pulley Diameter Source

The **effective drive pulley diameter** is sourced from:
- **Primary:** `inputs.drive_pulley_diameter_in`
- **Fallback:** `inputs.pulley_diameter_in` (when drive pulley not explicitly set)

This is used consistently in:
- `formulas.ts:1895-1896` (main calculation)
- `TabDriveControls.tsx:73` (UI display)
- `TabConveyorBuild.tsx:925` (UI display)

**DO NOT create a second diameter source.** Use the existing pattern:
```ts
const drivePulleyDia = inputs.drive_pulley_diameter_in ?? inputs.pulley_diameter_in;
```

---

## 3. UI Placement Inventory

### 3.1 Input Surfaces (Desired FPM Entered)

| Location | File | Current State | Recommendation |
|----------|------|---------------|----------------|
| Drive Controls tab, Speed Definition section | `TabDriveControls.tsx:189-202` | Input field for belt_speed_fpm | Keep as "Desired Belt Speed (FPM)", add Actual FPM read-only line below |
| Conveyor Build tab | `TabConveyorBuild.tsx:923-952` | Input field for belt_speed_fpm | Same treatment: add Actual FPM read-only line |

### 3.2 Display Surfaces (FPM Shown)

| Location | File | Current Display | Recommendation |
|----------|------|-----------------|----------------|
| Overview Tab (summary card) | `OverviewTab.tsx:31` | `summary.belt_speed_fpm` as "FPM" | Show **Desired + Actual + Delta** if gearmotor selected |
| Summary Tab | `SummaryTab.tsx:98` | "Belt Speed" row | Add row for "Actual Belt Speed" when available |
| Calculation Results (highlighted) | `CalculationResults.tsx:158-162` | "Belt Speed" | Add "Actual Belt Speed" row with delta |
| Calculation Results (derived, RPM mode) | `CalculationResults.tsx:405-408` | "Belt Speed (derived)" | Keep for legacy RPM mode |
| Input Echo | `InputEcho.tsx:89` | Shows input belt_speed_fpm | Keep as input echo only |
| Belt Tab (Vendor Specs) | `BeltTab.tsx:95` | "Speed" in operating conditions | Keep as designed speed for vendor packet |
| Vendor Specs Tab | `VendorSpecsTab.tsx:324` | "Speed" | Keep as designed speed |
| Revision Detail Drawer | `RevisionDetailDrawer.tsx:242-247` | Shows outputs.belt_speed_fpm | Show both Desired and Actual if Actual exists |

### 3.3 Drive Selector Area

| Location | File | Current State | Recommendation |
|----------|------|---------------|----------------|
| DriveSelectorCard | `DriveSelectorCard.tsx:127-145` | Shows selected gearmotor RPM/torque | Add "Actual Belt Speed" computed from selected gearmotor |
| DriveSelectorModal | `DriveSelectorModal.tsx:355-381` | Requirements summary | Add preview of Actual FPM per candidate in table |

### 3.4 Export Payloads

| Format | File | Current Fields | Recommendation |
|--------|------|----------------|----------------|
| JSON | `export_json.ts:36` | `belt_speed_fpm` | Add `actual_belt_speed_fpm` as NEW field |
| CSV | `export_csv.ts:71` | `speed_fpm` in operating conditions | Keep as designed; add `actual_speed_fpm` column |
| Vendor Packets | `vendor_packets.ts:116` | `speed_fpm` | Keep as designed speed for manufacturing |

---

## 4. Risk Call: Key Compatibility Approach

### 4.1 Current State Analysis

The existing key `belt_speed_fpm` appears in:
- **Inputs schema** (user-entered desired value)
- **Outputs schema** (echoed/calculated effective value)
- **Summary V2** (display)
- **Export payloads** (JSON/CSV)
- **Database columns** (application_snapshots, etc.)

**Current meaning:** The belt speed used for calculations, which is:
- User's desired value (in belt_speed mode) OR
- Calculated from drive RPM (in legacy drive_rpm mode)

### 4.2 Recommended Approach: **Option A - Add New Key**

**Add `actual_belt_speed_fpm` as a NEW output key, keep existing key stable.**

#### Justification:

1. **No breaking change** - Existing consumers (exports, reports, database) continue to work unchanged.

2. **Clear semantics** - `belt_speed_fpm` remains "designed/target speed used in calculations", `actual_belt_speed_fpm` is "what the selected gearmotor actually delivers".

3. **Null-safe** - When no gearmotor is selected, `actual_belt_speed_fpm = null` is clear and expected.

4. **Matches domain** - Engineers understand "designed" vs "actual" terminology.

5. **Incremental rollout** - UI can show both, and we can add actual_belt_speed_fpm to exports in a subsequent release if needed.

### 4.3 Implementation Strategy

```ts
// In outputs schema (schema.ts)
actual_belt_speed_fpm?: number | null;  // NEW - from selected gearmotor

// In formulas.ts
function calculateActualBeltSpeed(
  gearmotorOutputRpm: number,
  drivePulleyDiameterIn: number,
  gmSprocketTeeth?: number,
  driveShaftSprocketTeeth?: number,
  mountingStyle: GearmotorMountingStyle = 'shaft_mounted'
): number {
  // drive_ratio: how gearmotor RPM translates to pulley RPM
  const driveRatio = mountingStyle === 'bottom_mount'
    ? (gmSprocketTeeth ?? 1) / (driveShaftSprocketTeeth ?? 1)
    : 1.0;

  const drivePulleyRpm = gearmotorOutputRpm * driveRatio;
  return (drivePulleyRpm * Math.PI * drivePulleyDiameterIn) / 12;
}
```

### 4.4 Delta Calculation

```ts
function calculateSpeedDelta(desired: number, actual: number): {
  deltaPct: number;
  warning: boolean;
} {
  if (desired <= 0 || actual <= 0) return { deltaPct: 0, warning: false };
  const deltaPct = ((actual - desired) / desired) * 100;
  return {
    deltaPct,
    warning: Math.abs(deltaPct) > 5.0,  // 5% threshold
  };
}
```

---

## 5. Summary of Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Existing key stability | Keep `belt_speed_fpm` unchanged | No breaking changes |
| New field name | `actual_belt_speed_fpm` | Clear, domain-appropriate |
| Pulley diameter source | Use existing `drive_pulley_diameter_in ?? pulley_diameter_in` | No new diameter field |
| Drive ratio for actual | `gm_sprocket_teeth / drive_shaft_sprocket_teeth` | Inverse of chain_ratio (speed multiplication) |
| Default when no gearmotor | `actual_belt_speed_fpm = null`, UI shows "—" | Clear indication of missing data |
| Warning threshold | 5% deviation | Industry standard for belt speed tolerance |

---

## 6. Files to Modify (Phase 2)

### Core Logic
- `src/models/sliderbed_v1/schema.ts` - Add output field
- `src/models/sliderbed_v1/formulas.ts` - Add calculation function
- `src/lib/gearmotor/evaluate.ts` - Could add actual FPM preview

### UI Components
- `app/components/TabDriveControls.tsx` - Show Actual FPM
- `app/components/TabConveyorBuild.tsx` - Show Actual FPM
- `app/components/DriveSelectorCard.tsx` - Show computed Actual FPM
- `app/components/outputs_v2/OverviewTab.tsx` - Add Actual FPM
- `app/components/outputs_v2/SummaryTab.tsx` - Add Actual FPM row

### Tests
- `src/models/sliderbed_v1/__tests__/actual-fpm.test.ts` - New test file

---

*End of Phase 1 Audit*

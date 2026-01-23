# MC3 Magnetic Conveyor - Master Reference Document

> **Purpose:** Comprehensive reference for building the magnetic conveyor module in the MC3 Conveyor Console platform.
> **Version:** 1.1 (merged with v0 harvest compilation)
> **Last Updated:** January 2026
> **Sources:** 8 spreadsheets, 12+ drawings, 38-page drawing package, 3 operation manuals, NORD documentation, MC3_Magnetic_Harvest_Compiled_v0.docx

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Conveyor Styles](#conveyor-styles)
3. [Conveyor Classes](#conveyor-classes)
4. [Calculation Formulas](#calculation-formulas)
5. [Configuration Options](#configuration-options)
6. [Component Specifications](#component-specifications)
7. [BOM Structure](#bom-structure)
8. [Validation Rules](#validation-rules)
9. [Maintenance Data](#maintenance-data)
10. [Manual Generation](#manual-generation)
11. [Known Issues & Fixes](#known-issues--fixes)
12. [Implementation Notes](#implementation-notes)

---

## Executive Summary

### What We Analyzed
- **8 spreadsheets** across 4 versions (Rev10, Rev15, REV-1 Calculator, Heavy Duty REV-1)
- **12+ drawings** including complete 38-page drawing package (Job 32425)
- **11 jobs** with full specs and motor/calculation comparisons
- **3 operation manuals** (generic + job-specific)
- **NORD gearmotor documentation** (BIM 1004, BIM 1033)

### Key Findings
1. **4 spreadsheet versions** with significant formula differences
2. **REV-1 Calculator** formulas are most accurate (use these)
3. **Heavy Duty class** is now standard alongside Standard class
4. **Motor sizing** consistently 1.5-4× over calculated HP (minimum sizing rules apply)
5. **Complete BOM structure** extracted from drawing packages

### Spreadsheet Version Summary

| Version | Jobs | Date | Magnet Weight Formula | CoF | SF | Torque Method |
|---------|------|------|----------------------|-----|-----|---------------|
| **Rev10** | 29108 | 2023 | `0.1063 + W×0.3636` | 0.05 | 1.5 | Efficiency |
| **Rev15** | 30843, 30629 | 2024 | `0.1063 + W×0.3636` | 0.05 | 1.5 | Efficiency |
| **REV-1 Calculator** | 32285, 33017, 32259 | 2025 | `0.22 + W×0.5312` | 0.2 | 2.0 | Sprocket |
| **Heavy Duty REV-1** | 32425 | 2025 | `0.22 + W×0.5312` | 0.15 | 1.5 | Sprocket |

---

## Conveyor Styles

### Style Definitions

| Style | Code | Description | Infeed | Incline | Discharge | Typical Angle |
|-------|------|-------------|--------|---------|-----------|---------------|
| **A** | AMAG | Horiz → Incline → Horiz | Standard | Yes | 22" standard | 45°-75° |
| **B** | BMAG | Horiz → Incline → Horiz (alt body) | Standard | Yes | 22" standard | 60°-90° |
| **C** | CMAG | Horizontal only | Full length | No | N/A | 0° |
| **D** | DMAG | Incline primary | Minimal (~3") | Yes | Short | 60°+ dual angle |

### Style-Specific Characteristics

#### Style A
- Standard body construction
- Body Width = Magnet Width + 3"
- Overall Width = Body Width + 1.5"
- Support: Legs, Casters, Leveling Feet

#### Style B
- Alternate body construction (compact at 90°)
- At 90°: Body = Magnet + 1.5", Overall = Body + 3"
- At non-90°: Body = Magnet + 3", Overall = Body + 1.5"
- Support: Legs, Casters, Leveling Feet

#### Style C
- Horizontal only (0° angle, 0" discharge height)
- No gravity component in calculations
- Support: Foot Pads (floor mounted)
- Includes drain plug for fluid drainage

#### Style D
- Incline-primary with minimal infeed (~3")
- Can have dual angles (primary + secondary discharge)
- Example: 60° incline + 39° discharge transition
- Support: Locking Swivel Casters

### Model Number Convention

```
MAG[Style][Width][Centers][Options]-[Version]

Examples:
- MAGD1412MANG-6.16 = Style D, 14" width, 12" centers, Manganese top
- MAGC09.512-7.42 = Style C, 9.5" width, 12" centers
- MAGA12.518 = Style A, 12.5" width, 18" centers
- MAGB1212 = Style B, 12" width, 12" centers
- 32425-BMAG6060 = Job 32425, Style B, Heavy Duty

Option Codes:
- MANG = Manganese top plate
```

---

## Conveyor Classes

### Standard vs Heavy Duty

| Parameter | Standard | Heavy Duty |
|-----------|----------|------------|
| **Chain Type** | C2040 | C2060H |
| **Chain Pitch** | 1.0" | 1.5" |
| **Chain Weight** | 2 lb/ft | ~3 lb/ft |
| **Drive Shaft Diameter** | 1.00" | 1.50" |
| **Keyway** | 1/4" | 3/8" |
| **Head Sprocket** | MC2040-SPR-28TX100 (28T, 1.00" bore) | MC2060-SPR-28TX125 (28T, 1.25" bore) |
| **Tail Sprocket** | MC2040-SPR-16TX075-B (16T) | MC2060-SPR-14TX075-B (14T) |
| **Sprocket Pitch Diameter** | 4.5" | 6.74" |
| **Bearings** | Dodge 205 Series, 1" | Dodge 124268, 1.5" |
| **Shaft Seal** | 1" ID × 1.499" OD | 1.5" ID × 1.983" OD |
| **Track Series** | MAG-xxx-2040 | MAG-xxx-2060 |
| **Lead (in/rev)** | 14 | 21 |
| **Die Springs** | 2 | 4 |
| **CoF** | 0.2 | 0.15 |
| **Safety Factor** | 2.0 | 1.5 |
| **Typical HP Range** | 0.25-1 HP | 2+ HP |
| **Max Load** | ~500 lb/hr | 12,000+ lb/hr |

### Heavy Duty Trigger Criteria

Auto-suggest Heavy Duty when:
- Magnet width > 24"
- Load > 5,000 lbs/hr
- Discharge height > 200"
- Chain length > 500"

---

## Calculation Formulas

### Use REV-1 Calculator Formulas (Most Accurate)

#### Geometry Calculations

```typescript
// Incline Length (with zero-check for Style C)
inclineLength = dischargeHeight === 0 ? 0 : dischargeHeight / Math.sin(angleRadians);

// Incline Run (horizontal projection)
inclineRun = dischargeHeight === 0 ? 0 : dischargeHeight / Math.tan(angleRadians);

// Horizontal Length
horizontalLength = infeedLength + inclineRun + dischargeLength;

// Path Length (ft)
pathLength = (infeedLength + inclineLength + dischargeLength) / 12;

// Belt Length (ft) - both sides of chain
beltLength = pathLength * 2;

// Chain Length Calculation (round up to nearest pitch)
// From drawing notes: "round chain up to nearest pitch"
chainLengthRaw = beltLength * 12;  // convert to inches
chainPitchCount = Math.ceil(chainLengthRaw / chainPitch);
chainLengthFinal = chainPitchCount * chainPitch;
// Example: 622" raw → ceil(622/24) = 26 pitches → 26 × 24 = 624" (or 970" for HD with different calc)
```

#### Magnet Calculations

```typescript
// Magnet Weight (REV-1 formula) - lb per magnet
magnetWeight = 0.22 + (magnetWidth * 0.5312);

// Quantity of Magnets
qtyMagnets = Math.floor((beltLength * 12 / magnetCenters)) - 1;

// Total Magnet Weight
totalMagnetWeight = magnetWeight * qtyMagnets;
```

#### Weight & Load Calculations

```typescript
// Chain Weight
const CHAIN_WEIGHT_STD = 2.0;  // lb/ft for C2040
const CHAIN_WEIGHT_HD = 3.0;   // lb/ft for C2060H (estimate)

// Weight per Foot
weightPerFoot = chainWeight + (magnetWeight * qtyMagnets / beltLength);

// Belt Pull - Friction
beltPullFriction = weightPerFoot * beltLength * coefficientOfFriction;

// Belt Pull - Gravity (0 for Style C)
beltPullGravity = (inclineLength / 12 * weightPerFoot) * Math.sin(angleRadians);

// Total Load
totalLoad = beltPullFriction + beltPullGravity + chipLoad;
```

#### Torque & Speed Calculations (REV-1 Sprocket Method)

```typescript
// Constants
const STARTING_BELT_PULL_BASE = 100; // lbs (fixed)

// Standard
const SPROCKET_PD_STD = 4.5;   // inches
const LEAD_STD = 14;           // in/rev
const COF_STD = 0.2;
const SAFETY_FACTOR_STD = 2.0;

// Heavy Duty
const SPROCKET_PD_HD = 6.74;   // inches
const LEAD_HD = 21;            // in/rev
const COF_HD = 0.15;
const SAFETY_FACTOR_HD = 1.5;

// Belt Pull
totalBeltPull = STARTING_BELT_PULL_BASE + totalLoad;

// Torque Calculations
runningTorque = totalBeltPull * (sprocketPitchDiameter / 2);  // in-lb
totalTorque = runningTorque * safetyFactor;                   // in-lb (with SF)

// Speed Calculation
requiredRPM = (beltSpeed * 12) / lead;  // output shaft RPM
```

**Output for Motor/Gearbox Selection:**
- `totalTorque` (in-lb) → Use for gearbox torque rating lookup
- `requiredRPM` → Use for gearbox ratio selection (1750 base / requiredRPM = ratio)

**Note:** HP calculation removed - motor selection done via NORD catalog based on torque and speed requirements.

#### Throughput Calculations

```typescript
// Removal per Bar (from reference tables by magnet width and Neo count)
// Chip Load on Bed
chipLoad = removalPerBar * qtyMagnets / 2;

// Achieved Throughput
achievedThroughput = removalPerBar * qtyMagnets * beltSpeed * 60 / magnetCenters;

// Throughput Margin
throughputMargin = achievedThroughput / requiredThroughput;
// Warning if < 1.5 for chips, < 1.25 for parts
```

### Formula Constants Reference

| Constant | Standard | Heavy Duty | Notes |
|----------|----------|------------|-------|
| Chain Pitch | 1.0" | 1.5" | |
| Sprocket Teeth (Head) | 28 | 28 | |
| Sprocket Teeth (Tail) | 16 | 14 | |
| Sprocket Pitch Diameter | 4.5" | 6.74" | `Teeth × Pitch / π` |
| Lead (in/rev) | 14 | 21 | `Teeth × Pitch` |
| Chain Weight | 2 lb/ft | ~3 lb/ft | |
| Coefficient of Friction | 0.2 | 0.15 | Steel on UHMW |
| Safety Factor | 2.0 | 1.5 | Applied to torque |
| Starting Belt Pull Base | 100 lb | 100 lb | Fixed constant |
| Motor Base Speed | 1750 RPM | 1750 RPM | For ratio calculation |
| Discharge Length (std) | 22" | 22" | Style A, B, D |

---

## Configuration Options

### Application Data

| Category | Options |
|----------|---------|
| **Material Type** | Steel, Cast Iron, Aluminum*, Stainless Steel* |
| **Chip Type** | Small, Stringers**, Bird Nests**, Saw Fines, Parts, Steel Fiber |
| **Temperature** | Ambient, Warm, Red Hot** |
| **Fluid Type** | None, Water Soluble, Oil Based, Minimal Residual Oil |
| **Chip Delivery** | Chip Chute, Vibrating Feeder/Chute, Along Infeed |
| **Part Drop** | Minimum, Standard, Custom |

*Warning: Aluminum/SS cannot be magnetized
**Warning: Poor choice for magnetic conveyor

### Conveyor Specifications

| Category | Options |
|----------|---------|
| **Magnet Width** | 5", 6", 7.5", 8.5", 9.5", 10", 12", 12.5", 14", 15", 18", 24", 30" |
| **Magnet Type** | Ceramic 5, Ceramic 8, Neo 35, Neo 50 |
| **Magnet Config** | Ceramic only, 1-5 Neo, Ceramic + Neo sweeper |
| **Magnet Centers** | 12", 18", 24", 36" |
| **Belt Speed** | 6-120 FPM (warning >120 FPM) |
| **Conveyor Class** | Standard, Heavy Duty |

### Body & Materials

| Category | Options |
|----------|---------|
| **Body Material** | Standard (Mild Steel), Full Stainless Steel |
| **Sliderbed Material** | 304SS 11 GA (0.12"), 304SS 14 GA (0.105"), 304SS 16 GA (0.06"), Nitronic 30 10 GA |
| **Sealed Construction** | Slider bed sealed, Infeed guides sealed |

### Drive & Controls

| Category | Options |
|----------|---------|
| **Power Feed** | 110/1/60*, 230/3/60, 460/3/60, 480/3/60, 575/3/60 |
| **Gearmotor Brand** | NORD (standard) |
| **Controls** | None, Not Supplied, Custom (START/STOP/VFD/E-STOP w/ Interlock) |
| **Electrical Inspection** | Included, Not Included |

*Note: 110/1/60 requires 1.5× HP oversize

### Support & Options

| Category | Options |
|----------|---------|
| **Support Type** | Fixed Legs, Adjustable Legs, Casters, Foot Pads, Leveling Feet |
| **Paint/Finish** | RAL 5015 (Blue), RAL 1018 (Yellow), RAL 7040 (Grey), RAL 7012, Custom |
| **Hopper** | None, Infeed Hopper |
| **Covers** | Standard, Rigidized SS (for oil-based fluids) |
| **Oil Level Check** | Sight Glass (standard), Dipstick (option) |

### Environmental Options

| Category | Options |
|----------|---------|
| **Environment** | No Concern, High Temperature, Outdoors, Hazardous |
| **Outdoors Requirements** | Washdown motor, SS fasteners, SS body |
| **High Temp Requirements** | Venting, max 150°C |

---

## Component Specifications

### Chain Assemblies

#### Standard (C2040)
| Parameter | Value |
|-----------|-------|
| Chain Type | C2040 with D3 Attachment |
| Pitch | 1.00" (25.4mm) |
| Attachment Spacing | 1.25" (31.7mm) |
| Weight | 2 lb/ft |

#### Heavy Duty (C2060H)
| Parameter | Value |
|-----------|-------|
| Chain Type | C2060H with D3 Attachment |
| Pitch | 1.50" (38.1mm) |
| Weight | ~3 lb/ft |
| Material | Stainless Steel |

#### Chain Assembly Notes
- Use masterlinks with cotter pins (avoid clip style)
- Cotter pins must face INSIDE of conveyor (not in UHMW track)
- Masterlinks should NOT be used as attachment links
- Only use chain with factory-installed, riveted attachments
- Use LOCTITE 242 on all magnet bar fasteners

### Sprockets

| Type | Standard | Heavy Duty |
|------|----------|------------|
| **Head (Drive)** | MC2040-SPR-28TX100 | MC2060-SPR-28TX125 |
| Head Teeth | 28 | 28 |
| Head Bore | 1.00" | 1.25" |
| Head PD | 4.5" | 6.74" |
| **Tail (Take-up)** | MC2040-SPR-16TX075-B | MC2060-SPR-14TX075-B |
| Tail Teeth | 16 | 14 |
| Tail Bore | 0.75" w/ bearing | 0.75" w/ bearing |
| Tail Bearing | BRG-75122RS | BRG-75122RS |

**Alternate Part Number Formats:**
- SPR2060A28 = Double-pitch sprocket for 2060 chain, 28-tooth, plain bore
- MC20xx-SPR-[Teeth]TX[Bore]-B = Standard format with bearing

### Magnet Bar Assembly

#### Standard Configuration
| Component | Part Number Pattern | Material |
|-----------|---------------------|----------|
| Magnet Bar | [JOB]-BMAG-020_001 | Mild Steel |
| Magnet Cover | [JOB]-BMAG-020_003 | Stainless Steel |
| Magnet Bar Bracket | [JOB]-BMAG-020_004 | Mild Steel |
| Ceramic Magnets (3.5"L) | MAG050100013753500 | Ductile Iron |
| Ceramic Magnets (2.5"L) | MAG050100013752500 | Ductile Iron (sweeper) |
| Neo Magnets | MAGRARE0100200138 | Ductile Iron |
| Magnet Spacers | [JOB]-BMAG-A01_003 | Delrin |

#### Ceramic Magnet Dimensions
| Type | Dimensions (W×H×L) | Part Number | Typical Use |
|------|-------------------|-------------|-------------|
| Standard | 1" × 1.38" × 3.5" | MAG050100013753500 | Primary magnet (qty 2/bar) |
| Sweeper | 1" × 1.38" × 2.5" | MAG050100013752500 | Sweeper magnet (qty 1/bar) |
| Neo 35/50 | 1" × 2" × 1.375" | MAGRARE0100200138 | Heavy duty (qty 8/bar) |

#### Magnet Installation Note
> "WHEN ATTACHING MAGNETS TO THE BAR, PLEASE MAKE SURE MAGNETS FIGHT AGAINST EACH OTHER. DO NOT STAGGER MAGNET POLARITY. MAKE SURE ALL MAGNETS HAVE POLARITY IN THE SAME DIRECTION. IF UNSURE, USE MAGNET POLARITY TESTER."

#### Example Magnet Counts (from drawings)
| Job | Style | Chain Length | Magnet Pitch | Magnets/Unit |
|-----|-------|--------------|--------------|--------------|
| 32791 | B (Standard) | 271" | 12" | 22 |
| 32425 | B (Heavy Duty) | 970" | 12" | 80 |

*Note: Magnet count varies significantly with conveyor length. Use formula: `qtyMagnets = floor(beltLength × 12 / magnetCenters) - 1`*

### UHMW Track Specifications

#### Standard Track Profile (2040 Series)
| Dimension | Value |
|-----------|-------|
| Width | 88.9mm (3.50") |
| Height | 19.1mm (0.75") |
| Slot Width | 13.5mm (0.53") centered |
| Slot Depth | 16.3mm (0.64") |

#### Heavy Duty Track Profile (2060 Series)
| Dimension | Value |
|-----------|-------|
| Width | 117.5mm (4.63") |
| Height | 31.8mm (1.25") |
| Slot Width | 19.6mm centered |
| Slot Depth | 14.3mm |

#### Track Types by Style/Angle
| Track | Description | Chain Size |
|-------|-------------|------------|
| MAG-TT-LH/RH | Tail Track | 2040/2060 |
| MAG-LC60 | Lower Corner 60° | 2040/2060 |
| MAG-LC70 | Lower Corner 70° | 2060 |
| MAG-HD60-LH/RH | Head Track B-Style 60° | 2040/2060 |
| MAG-HD70-LH/RH | Head Track B-Style 70° | 2060 |
| MAG-STR | Straight Section (36") | 2040/2060 |

**Note:** Cut standard tracks to fill unique rail lengths. Drill additional holes into UHMW as needed.

### Bearings & Seals

| Component | Standard | Heavy Duty | Source |
|-----------|----------|------------|--------|
| Drive Shaft Bearing | Dodge 205 Series, 1" | Dodge 124268, 1.5" | BDI Canada |
| Shaft Seal | SHAFTSEAL01000 (1" ID × 1.499" OD) | 5154T842 (1.5" ID × 1.983" OD) | McMaster-Carr |
| Take-up Bearing | Included in sprocket assembly | Included in sprocket assembly | - |

### Drive Shaft

| Parameter | Standard | Heavy Duty |
|-----------|----------|------------|
| Material | 1045 Steel, Cold Drawn (TGP) | 1045 Steel, Cold Drawn (TGP) |
| Diameter | 1.00" (25.4mm) | 1.50" (38.1mm) |
| Keyway | 1/4" standard | 3/8" standard |

### Take-Up Assembly

| Component | Standard | Heavy Duty |
|-----------|----------|------------|
| Die Springs | 2 × DIE010005000 (1" × 5", red chrome-silicon) | 4 × DIE010005000 (1" × 5", red chrome-silicon) |
| Spring Compression | ½" to ¾" | ½" to ¾" |
| T-Rod | 12mm threaded | 12mm threaded |
| Tail Sprocket Bearing | BRG-75122RS | BRG-75122RS |

#### Take-Up Assembly Components (Standard 32791 Example)
| Part Number | Description |
|-------------|-------------|
| 32791-BMAG-011 | Take-up spring bar |
| 32791-BMAG-012 | Take-up mount bracket |
| 32791-BMAG-A03_001 | Take-up shaft |
| 32791-BMAG-A03_002 | Tapped capture bar |
| 32791-BMAG-A03_003 | Clearance capture bar |
| 32791-BMAG-A03_004 | Retainer |

### NORD Gearmotor Components

| Component | Part Number Pattern | Notes |
|-----------|---------------------|-------|
| Bushing Kit | GMBU60593400 | SK 1 SI 50, 1.00" Shaft |
| Torque Arm | GMTA60593900 | |
| NEMA C Face Adapter | GMNA60495500 | 1SI63-56C |
| Motor | GMMO3xxxxxxx | Voltage/HP specific |
| Gear Box | GMWG605xxxxx | Ratio specific |
| Helical Input Stage | GMHI60494000 | H10 for SK 1SI 50 & 63 |

#### Torque Arm Assembly (Heavy Duty Example - 32425)
| Part Number | Description |
|-------------|-------------|
| 32425-BMAG60-015 | Torque arm holder |
| 32425-BMAG60-015-1 | Tie-down plate |
| 32425-BMAG60-015-2 | Spacer |

#### Common Gearbox Configurations
| Size | Model | Typical Ratio | Hollow Shaft |
|------|-------|---------------|--------------|
| Small | SK 1SI50 | 30:1, 50:1 | 1.125" |
| Medium | SK 1SI63 | 40:1, 50:1 | 1.4375" |
| Large | SK93772 | Custom | 1.5"+ |

---

## BOM Structure

### Complete Spare Parts List Template

| Item | Part Number | Description | Qty | Source |
|------|-------------|-------------|-----|--------|
| 1 | [JOB]-BMAG-A01 | Chain Assembly | 1 | MC3 |
| 2 | [JOB]-BMAG-A03 | Take-Up Assembly | 1 | MC3 |
| 3 | [JOB]-BMAG-000_015 | Drive Shaft | 1 | MC3 |
| 4 | [JOB]-BMAG-000_017 | Short Key | 2 | MC3 |
| 5 | [JOB]-BMAG-000_018 | Long Key | 1 | MC3 |
| 6-7 | MAG-TT-LH-20xx | Tail Track + Mirror | 2 | MC3 |
| 8-9 | MAG-LCxx-20xx | Lower Corner + Mirror | 2 | MC3 |
| 10-11 | MAG-HDxx-LH-20xx | Head Track + Mirror | 2 | MC3 |
| 12-14 | MAG-STR-20xx | Straight Track Sections | varies | MC3 |
| 15 | MC20xx-SPR-28TXxxx | Head Sprocket | 2 | MC3 |
| 16 | SKxxxxxxx | NORD Gearmotor | 1 | NORD |
| 17 | xxxxxxxxx | Shaft Seal | 2 | McMaster-Carr |
| 18 | xxxV-VARIABLE CONTROLS | Control Package | 1 | Southpoint |
| 19 | xxxxxx | Dodge Bearing | 2 | BDI Canada |
| 20 | NPTSIGHT01000 | Sight Glass 1" NPT | 1-2 | McMaster-Carr |
| 21 | NPTPLUGxxxxx | Pipe Plug | 1-2 | McMaster-Carr |

### Conveyor Assembly BOM Structure

| Assembly | Sub-Components |
|----------|----------------|
| **Main Body** | Body sections, Corners, Side guides, Cross braces, Track backing plates, Lift lugs, Tap pads, Serial tag |
| **Chain Assembly** | Magnet bars, Chain with attachments |
| **Take-Up Assembly** | Mount bracket, Take-up shaft, Capture bars, Retainers, Standoffs, Sprockets w/ bearings, Die springs, Hardware |
| **Drive Assembly** | Drive shaft, Keys, Head sprockets, Bearings, Shaft seals, Gearmotor |
| **Track System** | Tail tracks, Corner tracks, Head tracks, Straight sections, Backing plates |
| **Supports** | Leg weldments, Feet/Casters, Braces |
| **Covers** | Slider bed cover, Head stock cover, Side guides |
| **Controls** | Control panel, Wiring |
| **Accessories** | Sight glass, Drain plug, Fill coupling |

---

## Validation Rules

### Warnings

| Condition | Warning Message |
|-----------|-----------------|
| `Infeed < 39"` | Custom tail tracks and tail end required |
| `Speed > 120 FPM` | Material could be flung off |
| `Power = 110/1/60` | Oversize motor HP by 1.5× |
| `Material = Aluminum/SS` | Cannot magnetize - should not be magnetic conveyor |
| `Chip Type = Stringers` | Poor option due to magnet bridging |
| `Chip Type = Bird Nests` | Poor option due to magnet bridging |
| `Temp = Red Hot` | Poor choice for magnetic conveyor |
| `Controls = Custom` | Set meeting with MC3, customer, supplier |
| `Flow Rate > 50 GPM` | Use hopper, weirs, strong magnets |
| `Fluid = Oil Based` | Require SS rigidized cover |
| `Throughput Margin < 1.5` | Undersized for chips |
| `Throughput Margin < 1.25` | Undersized for parts |

### Errors (Block Configuration)

| Condition | Error Message |
|-----------|---------------|
| `Material = Aluminum` | Invalid - Aluminum cannot be magnetized |
| `Material = Stainless Steel` | Invalid - Stainless steel cannot be magnetized |
| `Discharge Height = 0 AND Style != C` | Style C required for horizontal-only configuration |
| `Angle = 0 AND Style != C` | Style C required for 0° angle |

### Geometry Validation

| Parameter | Min | Max | Notes |
|-----------|-----|-----|-------|
| Incline Angle | 0° | 90° | 0° only for Style C |
| Belt Speed | 6 FPM | 120 FPM | Warning above 120 |
| Magnet Width | 5" | 30" | Heavy Duty for >24" |
| Magnet Centers | 12" | 36" | |
| Discharge Length | 0" | 24" | 22" standard |

---

## Maintenance Data

### Lubrication System

| Parameter | Value |
|-----------|-------|
| **Oil Type** | Kleen-flo ISO 32 (or equivalent hydraulic oil) |
| **Oil Level** | 1"-2" in bottom of conveyor |
| **Check Method** | Sight Glass (standard) or Dipstick (option) |
| **Change Interval** | Annually, or when servicing internally |

### Chain Tension

| Parameter | Value |
|-----------|-------|
| **System** | Internal spring-loaded tensioner |
| **Proper Spring Compression** | ½" to ¾" |
| **Access** | Remove top cover (slider bed) |

### UHMW Track Wear

| Parameter | Value |
|-----------|-------|
| **Wear Limit** | < 1/16" clearance to magnet |
| **Check Method** | Straight edge across conveyor above magnet |
| **Parts** | Custom made per serial number |

### Gear Reducer Maintenance

| Interval | Action |
|----------|--------|
| 2-3 weeks (new) | Drain, flush, refill (removes brass wear-in particles) |
| Every 2500 hours OR 6 months | Oil change |
| Weekly | Check reducer is securely bolted |
| Periodic | Check oil level |

**Gear Oil by Temperature:**
| Ambient Temp | AGMA Grade | Examples |
|--------------|------------|----------|
| 15°F to 60°F | #7 Compound | Mobil Compound #DD, Shell Macoma Oil #69 |
| 50°F to 125°F | #8 Compound | Mobil #600W Super Cyl. Oil, Shell Valvata J81 & J82 |

### Bearing Grease

| Duty | Products |
|------|----------|
| **Normal** | Texaco Multifak #2, Mobil Mobilux #2, Amoco Lithium MP, Shell Alvania #2 |
| **Heavy** | Sun Prestige 742 EP, Exxon Lidok #2 EP, Arco Litholene HEP2, Shell Alvania #2 EP |

**Warning:** Do not over-grease - causes blown seals or overheating

### Inspection Schedule

| Frequency | Tasks |
|-----------|-------|
| **Daily** | Abnormal sounds, cleanliness, clear before starting, oil level |
| **Monthly** | Lubricate all bearings + daily checks |
| **Annually** | Remove covers, clean inside, drain/replace oil, inspect/replace UHMW tracks, check fastener tightness + monthly + daily |

### Troubleshooting

#### Parts Stop Moving
| Symptom | Cause | Action |
|---------|-------|--------|
| Blockage in infeed | Material jam | Turn off, clear blockage |
| Overload protection tripped | Overload | Turn off, open control panel, reset trip |
| Low supply voltage | Power issue | Turn off, have electrician check voltage |

#### Abnormal Noises
| Noise | Cause | Action |
|-------|-------|--------|
| Squealing | Dry drive shaft bearings | Lubricate bearings |
| Clicking | Foreign body in motor fan | Turn off, remove foreign body |
| Scratching | UHMW track worn | Replace UHMW track |
| Grinding | Gear motor issue | Replace gear motor if faulty |

---

## Manual Generation

### Job-Specific Data Fields

```typescript
interface ManualData {
  customer: string;
  poNumber: string;
  conveyorSerialNumber: string;
  motorDetail: string;           // "80 LP/4-56C TW, 1.00 HP, 230/460/3/60 Motor"
  motorPartNumber: string;       // "GMMO33610294"
  gearReducerDetail: string;     // "SK 1SI63, 40:1, Hollow Shaft 1.4375\""
  gearReducerPartNumber: string; // "GMWG60692400"
  secondStageDetail?: string;    // Optional helical input stage
  secondStagePartNumber?: string;
  oilCapacity: string;           // "15 Liters (4 gal.)"
  oilCheckOption: 'sight-glass' | 'dipstick';
}
```

### NORD Motor Nomenclature

```
Frame Size / Poles - Face Options

Examples:
- 63L/4-56C = 63 frame, 4 pole, 56C NEMA face
- 80 LP/4-56C TW = 80 frame, Low Profile, 4 pole, 56C face, Thermostat

Option Codes:
- BRE = Brake
- HL = Manual Hand Release
- TF = Thermistor (PTC sensors)
- TW = Thermostat
- SH = Space Heater
- IG = Incremental Encoder
- OL = TENV Motor (no fan)
- F = Blower Cooling Fan
- WE = 2nd Shaft End
```

---

## Known Issues & Fixes

### Spreadsheet Calculation Issues

1. **Magnet weight formula changed** between versions
   - **Fix:** Use REV-1 formula: `0.22 + (Width × 0.5312)`

2. **Friction coefficient inconsistent** (0.05 vs 0.2)
   - **Fix:** Use 0.2 for Standard, 0.15 for Heavy Duty

3. **Safety factor inconsistent** (1.5 vs 2.0)
   - **Fix:** Use 2.0 for Standard, 1.5 for Heavy Duty

4. **Old torque method oversizes motors 5-11×**
   - **Fix:** Use sprocket-based method from REV-1

5. **#DIV/0! errors when Load Per Hr = 0**
   - **Fix:** Add zero-checks in formulas

6. **No reference tables for 30" magnet width**
   - **Fix:** Extend lookup tables

### Drawing vs Spreadsheet Discrepancies Found

| Job | Parameter | Drawing | Spreadsheet | Resolution |
|-----|-----------|---------|-------------|------------|
| 32425 | Angle | 70° | 75° | Use drawing value |
| 30629 | Magnet Centers | 18" | 24" | Verify with engineering |

### Drive Selection Outputs

The calculation engine outputs **torque** and **speed** - motor/gearbox selection is done separately via NORD catalog lookup.

**Calculation Outputs:**
| Output | Unit | Use |
|--------|------|-----|
| `totalTorque` | in-lb | Gearbox torque rating requirement |
| `requiredRPM` | RPM | Output shaft speed → determines gear ratio |

**Gear Ratio Calculation:**
```
Gear Ratio = Motor Base Speed / Required RPM
           = 1750 / requiredRPM
```

**Example:**
- Belt Speed: 30 FPM, Lead: 14 in/rev
- Required RPM = (30 × 12) / 14 = 25.7 RPM
- Gear Ratio = 1750 / 25.7 = 68:1 (select nearest standard ratio)

**Standard NORD Gear Ratios:** 30:1, 40:1, 50:1, 60:1, 80:1, 100:1 (varies by gearbox model)

---

## Implementation Notes

### Calculation Architecture (Matches Belt Conveyor Pattern)

The magnetic conveyor calculation module follows the same architecture as `src/models/sliderbed_v1/`:

```
/lib/calculations/magnetic-conveyor/
├── schema.ts           # MagneticInputs, MagneticOutputs, enums
├── formulas.ts         # Pure calculation functions + master calculate()
├── fixtures.ts         # Test cases for validation
├── rules.ts            # Validation rules (warnings/errors)
└── index.ts            # Public exports
```

### Schema Types

```typescript
// schema.ts

// ============================================================================
// ENUMS
// ============================================================================

export enum ConveyorStyle {
  A = 'A',  // Horiz → Incline → Horiz
  B = 'B',  // Horiz → Incline → Horiz (alt body)
  C = 'C',  // Horizontal only
  D = 'D',  // Incline primary
}

export enum ConveyorClass {
  Standard = 'standard',
  HeavyDuty = 'heavy_duty',
}

export enum MagnetType {
  Ceramic5 = 'ceramic_5',
  Ceramic8 = 'ceramic_8',
  Neo35 = 'neo_35',
  Neo50 = 'neo_50',
}

export enum ChipType {
  Small = 'small',
  Stringers = 'stringers',
  BirdNests = 'bird_nests',
  SawFines = 'saw_fines',
  Parts = 'parts',
  SteelFiber = 'steel_fiber',
}

export enum MaterialType {
  Steel = 'steel',
  CastIron = 'cast_iron',
  Aluminum = 'aluminum',      // Warning: cannot magnetize
  StainlessSteel = 'stainless_steel',  // Warning: cannot magnetize
}

// ============================================================================
// INPUTS
// ============================================================================

export interface MagneticInputs {
  // Style & Class
  style: ConveyorStyle;
  conveyor_class: ConveyorClass;
  
  // Geometry
  infeed_length_in: number;
  discharge_height_in: number;
  incline_angle_deg: number;
  discharge_length_in: number;  // default 22"
  
  // Magnets
  magnet_width_in: number;
  magnet_type: MagnetType;
  magnet_centers_in: number;  // 12, 18, 24, 36
  
  // Operation
  belt_speed_fpm: number;
  load_per_hour_lbs: number;
  material_type: MaterialType;
  chip_type: ChipType;
  
  // Optional overrides (power user)
  coefficient_of_friction?: number;
  safety_factor?: number;
  starting_belt_pull_lb?: number;
  chain_weight_lb_per_ft?: number;
}

// ============================================================================
// PARAMETERS (defaults from conveyor class)
// ============================================================================

export interface MagneticParameters {
  // Standard class defaults
  chain_pitch_in: number;           // 1.0 (std) or 1.5 (HD)
  chain_weight_lb_per_ft: number;   // 2.0 (std) or 3.0 (HD)
  sprocket_pitch_diameter_in: number; // 4.5 (std) or 6.74 (HD)
  lead_in_per_rev: number;          // 14 (std) or 21 (HD)
  coefficient_of_friction: number;  // 0.2 (std) or 0.15 (HD)
  safety_factor: number;            // 2.0 (std) or 1.5 (HD)
  starting_belt_pull_lb: number;    // 100 (fixed)
  motor_base_rpm: number;           // 1750
}

// ============================================================================
// OUTPUTS
// ============================================================================

export interface MagneticOutputs {
  // Geometry
  incline_length_in: number;
  incline_run_in: number;
  horizontal_length_in: number;
  path_length_ft: number;
  belt_length_ft: number;
  chain_length_in: number;
  
  // Magnets
  magnet_weight_each_lb: number;
  qty_magnets: number;
  total_magnet_weight_lb: number;
  
  // Loads
  weight_per_foot_lb: number;
  belt_pull_friction_lb: number;
  belt_pull_gravity_lb: number;
  total_load_lb: number;
  
  // Drive - Torque & Speed
  total_belt_pull_lb: number;
  running_torque_in_lb: number;
  total_torque_in_lb: number;      // with safety factor
  required_rpm: number;            // output shaft RPM
  suggested_gear_ratio: number;    // 1750 / required_rpm
  
  // Throughput
  achieved_throughput_lbs_hr: number;
  throughput_margin: number;
  
  // Parameters used (echo back for transparency)
  coefficient_of_friction_used: number;
  safety_factor_used: number;
  starting_belt_pull_lb_used: number;
  
  // Warnings & Errors
  warnings: string[];
  errors: string[];
}
```

### Formula Functions

```typescript
// formulas.ts

import {
  MagneticInputs,
  MagneticParameters,
  MagneticOutputs,
  ConveyorStyle,
  ConveyorClass,
} from './schema';

// ============================================================================
// CONSTANTS
// ============================================================================

const PI = Math.PI;

export const STANDARD_PARAMS: MagneticParameters = {
  chain_pitch_in: 1.0,
  chain_weight_lb_per_ft: 2.0,
  sprocket_pitch_diameter_in: 4.5,
  lead_in_per_rev: 14,
  coefficient_of_friction: 0.2,
  safety_factor: 2.0,
  starting_belt_pull_lb: 100,
  motor_base_rpm: 1750,
};

export const HEAVY_DUTY_PARAMS: MagneticParameters = {
  chain_pitch_in: 1.5,
  chain_weight_lb_per_ft: 3.0,
  sprocket_pitch_diameter_in: 6.74,
  lead_in_per_rev: 21,
  coefficient_of_friction: 0.15,
  safety_factor: 1.5,
  starting_belt_pull_lb: 100,
  motor_base_rpm: 1750,
};

// ============================================================================
// GEOMETRY CALCULATIONS
// ============================================================================

export function calculateInclineLength(
  dischargeHeightIn: number,
  angleDeg: number
): number {
  if (dischargeHeightIn === 0 || angleDeg === 0) return 0;
  const angleRad = (angleDeg * PI) / 180;
  return dischargeHeightIn / Math.sin(angleRad);
}

export function calculateInclineRun(
  dischargeHeightIn: number,
  angleDeg: number
): number {
  if (dischargeHeightIn === 0 || angleDeg === 0) return 0;
  const angleRad = (angleDeg * PI) / 180;
  return dischargeHeightIn / Math.tan(angleRad);
}

export function calculatePathLength(
  infeedLengthIn: number,
  inclineLengthIn: number,
  dischargeLengthIn: number
): number {
  return (infeedLengthIn + inclineLengthIn + dischargeLengthIn) / 12;
}

export function calculateBeltLength(pathLengthFt: number): number {
  return pathLengthFt * 2;  // both sides of chain
}

export function calculateChainLength(
  beltLengthFt: number,
  chainPitchIn: number
): number {
  const rawLengthIn = beltLengthFt * 12;
  const pitchCount = Math.ceil(rawLengthIn / chainPitchIn);
  return pitchCount * chainPitchIn;
}

// ============================================================================
// MAGNET CALCULATIONS
// ============================================================================

export function calculateMagnetWeight(magnetWidthIn: number): number {
  // REV-1 formula
  return 0.22 + (magnetWidthIn * 0.5312);
}

export function calculateMagnetQuantity(
  beltLengthFt: number,
  magnetCentersIn: number
): number {
  return Math.floor((beltLengthFt * 12) / magnetCentersIn) - 1;
}

// ============================================================================
// LOAD CALCULATIONS
// ============================================================================

export function calculateWeightPerFoot(
  chainWeightLbPerFt: number,
  totalMagnetWeightLb: number,
  beltLengthFt: number
): number {
  return chainWeightLbPerFt + (totalMagnetWeightLb / beltLengthFt);
}

export function calculateBeltPullFriction(
  weightPerFootLb: number,
  beltLengthFt: number,
  cof: number
): number {
  return weightPerFootLb * beltLengthFt * cof;
}

export function calculateBeltPullGravity(
  inclineLengthIn: number,
  weightPerFootLb: number,
  angleDeg: number
): number {
  if (angleDeg === 0) return 0;
  const angleRad = (angleDeg * PI) / 180;
  return (inclineLengthIn / 12) * weightPerFootLb * Math.sin(angleRad);
}

export function calculateTotalLoad(
  beltPullFrictionLb: number,
  beltPullGravityLb: number,
  chipLoadLb: number
): number {
  return beltPullFrictionLb + beltPullGravityLb + chipLoadLb;
}

// ============================================================================
// DRIVE CALCULATIONS (Torque & Speed only - no HP)
// ============================================================================

export function calculateTotalBeltPull(
  startingBeltPullLb: number,
  totalLoadLb: number
): number {
  return startingBeltPullLb + totalLoadLb;
}

export function calculateRunningTorque(
  totalBeltPullLb: number,
  sprocketPitchDiameterIn: number
): number {
  return totalBeltPullLb * (sprocketPitchDiameterIn / 2);
}

export function calculateTotalTorque(
  runningTorqueInLb: number,
  safetyFactor: number
): number {
  return runningTorqueInLb * safetyFactor;
}

export function calculateRequiredRpm(
  beltSpeedFpm: number,
  leadInPerRev: number
): number {
  return (beltSpeedFpm * 12) / leadInPerRev;
}

export function calculateSuggestedGearRatio(
  motorBaseRpm: number,
  requiredRpm: number
): number {
  return motorBaseRpm / requiredRpm;
}

// ============================================================================
// MASTER CALCULATION FUNCTION
// ============================================================================

export function calculate(
  inputs: MagneticInputs,
  parameters: MagneticParameters
): MagneticOutputs {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Resolve parameters with user overrides
  const cof = inputs.coefficient_of_friction ?? parameters.coefficient_of_friction;
  const sf = inputs.safety_factor ?? parameters.safety_factor;
  const startingPull = inputs.starting_belt_pull_lb ?? parameters.starting_belt_pull_lb;
  const chainWeight = inputs.chain_weight_lb_per_ft ?? parameters.chain_weight_lb_per_ft;
  
  // Discharge length default
  const dischargeLengthIn = inputs.discharge_length_in ?? 22;
  
  // Step 1: Geometry
  const inclineLengthIn = calculateInclineLength(
    inputs.discharge_height_in,
    inputs.incline_angle_deg
  );
  const inclineRunIn = calculateInclineRun(
    inputs.discharge_height_in,
    inputs.incline_angle_deg
  );
  const horizontalLengthIn = inputs.infeed_length_in + inclineRunIn + dischargeLengthIn;
  const pathLengthFt = calculatePathLength(
    inputs.infeed_length_in,
    inclineLengthIn,
    dischargeLengthIn
  );
  const beltLengthFt = calculateBeltLength(pathLengthFt);
  const chainLengthIn = calculateChainLength(beltLengthFt, parameters.chain_pitch_in);
  
  // Step 2: Magnets
  const magnetWeightEachLb = calculateMagnetWeight(inputs.magnet_width_in);
  const qtyMagnets = calculateMagnetQuantity(beltLengthFt, inputs.magnet_centers_in);
  const totalMagnetWeightLb = magnetWeightEachLb * qtyMagnets;
  
  // Step 3: Loads
  const weightPerFootLb = calculateWeightPerFoot(
    chainWeight,
    totalMagnetWeightLb,
    beltLengthFt
  );
  const beltPullFrictionLb = calculateBeltPullFriction(
    weightPerFootLb,
    beltLengthFt,
    cof
  );
  const beltPullGravityLb = calculateBeltPullGravity(
    inclineLengthIn,
    weightPerFootLb,
    inputs.incline_angle_deg
  );
  
  // Chip load (simplified - would come from lookup table)
  const chipLoadLb = 0;  // TODO: Calculate from removal_per_bar × qty_magnets / 2
  
  const totalLoadLb = calculateTotalLoad(
    beltPullFrictionLb,
    beltPullGravityLb,
    chipLoadLb
  );
  
  // Step 4: Drive (Torque & Speed)
  const totalBeltPullLb = calculateTotalBeltPull(startingPull, totalLoadLb);
  const runningTorqueInLb = calculateRunningTorque(
    totalBeltPullLb,
    parameters.sprocket_pitch_diameter_in
  );
  const totalTorqueInLb = calculateTotalTorque(runningTorqueInLb, sf);
  const requiredRpm = calculateRequiredRpm(
    inputs.belt_speed_fpm,
    parameters.lead_in_per_rev
  );
  const suggestedGearRatio = calculateSuggestedGearRatio(
    parameters.motor_base_rpm,
    requiredRpm
  );
  
  // Step 5: Throughput (placeholder)
  const achievedThroughputLbsHr = 0;  // TODO: From lookup tables
  const throughputMargin = 0;
  
  // Step 6: Validation warnings
  if (inputs.belt_speed_fpm > 120) {
    warnings.push('Belt speed exceeds 120 FPM - material could be flung off');
  }
  if (inputs.chip_type === 'stringers' || inputs.chip_type === 'bird_nests') {
    warnings.push('Poor chip type for magnetic conveyor due to magnet bridging');
  }
  if (inputs.material_type === 'aluminum' || inputs.material_type === 'stainless_steel') {
    errors.push('Material cannot be magnetized - not suitable for magnetic conveyor');
  }
  
  return {
    // Geometry
    incline_length_in: inclineLengthIn,
    incline_run_in: inclineRunIn,
    horizontal_length_in: horizontalLengthIn,
    path_length_ft: pathLengthFt,
    belt_length_ft: beltLengthFt,
    chain_length_in: chainLengthIn,
    
    // Magnets
    magnet_weight_each_lb: magnetWeightEachLb,
    qty_magnets: qtyMagnets,
    total_magnet_weight_lb: totalMagnetWeightLb,
    
    // Loads
    weight_per_foot_lb: weightPerFootLb,
    belt_pull_friction_lb: beltPullFrictionLb,
    belt_pull_gravity_lb: beltPullGravityLb,
    total_load_lb: totalLoadLb,
    
    // Drive
    total_belt_pull_lb: totalBeltPullLb,
    running_torque_in_lb: runningTorqueInLb,
    total_torque_in_lb: totalTorqueInLb,
    required_rpm: requiredRpm,
    suggested_gear_ratio: suggestedGearRatio,
    
    // Throughput
    achieved_throughput_lbs_hr: achievedThroughputLbsHr,
    throughput_margin: throughputMargin,
    
    // Parameters used
    coefficient_of_friction_used: cof,
    safety_factor_used: sf,
    starting_belt_pull_lb_used: startingPull,
    
    // Warnings & Errors
    warnings,
    errors,
  };
}
```

### Test Fixtures

```typescript
// fixtures.ts

import { MagneticInputs, MagneticOutputs, ConveyorStyle, ConveyorClass } from './schema';

export interface TestFixture {
  name: string;
  inputs: MagneticInputs;
  expected_outputs: Partial<MagneticOutputs>;
  tolerance?: number;
}

export const DEFAULT_TOLERANCE = 0.005;  // 0.5%

// Add fixtures from real job data (32285, 32259, 32425, etc.)
export const ALL_FIXTURES: TestFixture[] = [
  // TODO: Extract from validated spreadsheets
];
```

---

## Files Analyzed

### Spreadsheets
1. `30843_Magnetic_Conveyor_-_Application_Design_-_Rev15.xlsx`
2. `32285_Magnetic_Conveyor_-_Application_Design_Calculator.xlsx`
3. `30629_Magnetic_Conveyor_-_Application_Design_-_Rev15.xlsx`
4. `29108-Magnetic_Conveyor_-_Application_Design_-_Rev10_BN.xlsx`
5. `33017_-_Magnetic_Conveyor_-_Application_Design_Calculator_REV-1.xlsx`
6. `32259_Magnetic_Conveyor_-_Application_Design_Calculator_REV-1.xlsx`
7. `32425-Magnetic_Conveyor_-_Application_Design_Calculator_REV-1.xlsx` (Heavy Duty)
8. `32079-CMAG` (Style C)

### Drawings
1. Job 30843 - Style B, 90°
2. Job 32285 - Style A, 60°
3. Job 30629 - Style A, 60°
4. Job 29108 - Style A, 60°
5. Job 33017 - Style B, 60°
6. Job 32259 - Style B, 60°
7. Job 32425 - Style B, 70° Heavy Duty (38-page package)
8. Job 32079 - Style C, 0°
9. Job 30422 - Style D, 60°
10. Job 28569 - Style D, 60°
11. Job 32791 - Style B, 60° (complete drawing package)

### Manuals
1. `Mag_Owners_Manual_w_Nord-Oil.pdf` - Generic owner's manual
2. `Mag_Operation_and_Maintenance_Manual_-_32285.docx` - Job-specific
3. `Mag_Operation_and_Maintenance_Manual_-_32259.docx` - Job-specific
4. NORD BIM 1004 - Motor Installation & Maintenance
5. NORD BIM 1033 - Worm Gearbox Instructions

### Prior Compilations
1. `MC3_Magnetic_Harvest_Compiled_v0.docx` - Initial harvest from 32791 and 32425 drawing packages

---

*Document generated from reverse engineering analysis - January 2026*

# Pulley Current State Report (vCurrent)

**Date:** 2025-12-30
**Branch:** `feature/pulley-rethink`
**Purpose:** Audit of pulley subsystem before PCI Pulley Selection Guide integration

---

## A) UI Inventory

### A.1 User Configurator - Pulley Selection

**File:** `app/components/TabConveyorPhysical.tsx`
**Lines:** ~1140-1400

#### Drive/Head Pulley Section
| Input Key | UI Label | Type | Default | Notes |
|-----------|----------|------|---------|-------|
| `head_pulley_catalog_key` | Head/Drive Pulley | dropdown | none | Legacy pulley catalog selection |
| `drive_pulley_variant_key` | (not in UI yet) | - | - | v1.24 schema field, not yet wired |
| `drive_pulley_manual_override` | (checkbox) | boolean | false | When true, uses manual diameter |
| `drive_pulley_diameter_in` | Manual Drive Diameter | number | - | Only shown when override=true |
| `drive_pulley_preset` | Preset | dropdown | - | Quick-select: 3,4,5,6,8,10" or custom |

#### Tail Pulley Section
| Input Key | UI Label | Type | Default | Notes |
|-----------|----------|------|---------|-------|
| `tail_pulley_catalog_key` | Tail Pulley | dropdown | none | Legacy pulley catalog selection |
| `tail_pulley_variant_key` | (not in UI yet) | - | - | v1.24 schema field, not yet wired |
| `tail_pulley_manual_override` | Override Diameter | checkbox | false | |
| `tail_pulley_diameter_in` | Manual Tail Diameter | number | - | Only shown when override=true |
| `tail_pulley_preset` | Preset | dropdown | - | Quick-select options |

#### Pulley Surface & Shaft
| Input Key | UI Label | Type | Default | Notes |
|-----------|----------|------|---------|-------|
| `pulley_surface_type` | Pulley Surface | dropdown | Plain | Plain/Lagged enum |
| `shaft_diameter_mode` | Shaft Diameter Mode | dropdown | Calculated | Calculated/Manual |
| `drive_shaft_diameter_in` | Drive Shaft Diameter | number | - | Only if mode=Manual |
| `tail_shaft_diameter_in` | Tail Shaft Diameter | number | - | Only if mode=Manual |

#### What User Sees (Outputs Displayed)
- Effective drive pulley diameter (from catalog or override)
- Effective tail pulley diameter
- Minimum pulley diameter required (from belt spec)
- Drive/tail pulley meets minimum (warning if not)
- Shaft diameters (calculated or manual)

#### Hidden/Default Assumptions
- **Wrap angle:** Hardcoded to 180° in `shaftCalc.ts`
- **Bearing span:** Defaults to `belt_width + 5"` (not user-configurable)
- **Friction coefficient:** Defaults to 0.3 (lagged pulley assumption)
- **No bearing centers / hub centers inputs** - assumed from belt width
- **No tube stress calculations** - only shaft stress

---

### A.2 PulleySelect Component

**File:** `app/components/PulleySelect.tsx`
**Purpose:** Dropdown for selecting from legacy `pulley_catalog` table

**Behavior:**
- Filters by station (`head_drive` or `tail`)
- Enforces INTERNAL_BEARINGS = tail only constraint
- Shows effective diameter including lagging
- Displays construction type, lagging info
- No filtering by face width in current implementation (param exists but not used)

---

### A.3 Admin Pages

| Page | File | Purpose |
|------|------|---------|
| Pulley Catalog (Legacy) | `app/admin/pulleys/page.tsx` | CRUD for `pulley_catalog` table |
| Pulley Families (v1.24) | `app/admin/pulley-families/page.tsx` | CRUD for `pulley_families` table |
| Pulley Variants (v1.24) | `app/admin/pulley-variants/page.tsx` | CRUD for `pulley_variants` table |

---

## B) Data Inventory

### B.1 Database Tables

#### Legacy: `pulley_catalog` (v1.15)
**Migration:** `supabase/migrations/20251226_pulley_catalog.sql`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK |
| `catalog_key` | TEXT | NO | Unique identifier (e.g., `STD_DRUM_4_STEEL`) |
| `display_name` | TEXT | NO | Human-readable name |
| `manufacturer` | TEXT | YES | |
| `part_number` | TEXT | YES | |
| `diameter_in` | NUMERIC | NO | Shell diameter before lagging |
| `face_width_max_in` | NUMERIC | NO | Maximum face width supported |
| `face_width_min_in` | NUMERIC | YES | Minimum face width |
| `crown_height_in` | NUMERIC | NO | Default 0 |
| `construction` | ENUM | NO | DRUM, WING, SPIRAL, MAGNETIC |
| `shell_material` | TEXT | NO | Default 'steel' |
| `is_lagged` | BOOLEAN | NO | Default FALSE |
| `lagging_type` | TEXT | YES | rubber, ceramic, diamond, urethane |
| `lagging_thickness_in` | NUMERIC | YES | Required if is_lagged |
| `shaft_arrangement` | ENUM | NO | THROUGH_SHAFT_EXTERNAL_BEARINGS, STUB_SHAFT_EXTERNAL_BEARINGS, INTERNAL_BEARINGS |
| `hub_connection` | ENUM | NO | KEYED, KEYLESS_LOCKING_ASSEMBLY, etc. |
| `allow_head_drive` | BOOLEAN | NO | Station compatibility |
| `allow_tail` | BOOLEAN | NO | |
| `allow_snub` | BOOLEAN | NO | |
| `allow_bend` | BOOLEAN | NO | |
| `allow_takeup` | BOOLEAN | NO | |
| `dirty_side_ok` | BOOLEAN | NO | |
| `max_shaft_rpm` | NUMERIC | YES | |
| `max_belt_speed_fpm` | NUMERIC | YES | B105.1 limit |
| `max_tension_pli` | NUMERIC | YES | |
| `is_preferred` | BOOLEAN | NO | Show prominently |
| `is_active` | BOOLEAN | NO | Soft delete |

**Seed Data:** 5 generic pulleys (4" and 6" standard, lagged, wing, internal bearing)

---

#### New: `pulley_families` (v1.24)
**Migration:** `supabase/migrations/20251230200000_pulley_families_variants.sql`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `pulley_family_key` | TEXT | NO | PK (e.g., `PCI_FC_8IN_48_5_K17`) |
| `manufacturer` | TEXT | NO | |
| `style` | TEXT | NO | Flat Face, Crowned, etc. |
| `material` | TEXT | NO | Default 'Mild steel' |
| `shell_od_in` | NUMERIC | NO | Shell outer diameter |
| `face_width_in` | NUMERIC | NO | |
| `shell_wall_in` | NUMERIC | YES | Shell wall thickness |
| `is_crowned` | BOOLEAN | NO | Default FALSE |
| `crown_type` | TEXT | YES | Standard, Trapezoidal |
| `v_groove_section` | TEXT | YES | K10, K17, etc. |
| `v_groove_top_width_in` | NUMERIC | YES | |
| `v_groove_bottom_width_in` | NUMERIC | YES | |
| `v_groove_depth_in` | NUMERIC | YES | |
| `version` | INT | NO | Default 1 |
| `source` | TEXT | YES | Data source reference |
| `notes` | TEXT | YES | |
| `is_active` | BOOLEAN | NO | |

---

#### New: `pulley_variants` (v1.24)
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `pulley_variant_key` | TEXT | NO | PK |
| `pulley_family_key` | TEXT | NO | FK to families |
| `bore_in` | NUMERIC | YES | |
| `hub_style` | TEXT | YES | |
| `bearing_type` | TEXT | YES | bushing, Timken, ER style |
| `lagging_type` | TEXT | YES | none, SBR, Urethane |
| `lagging_thickness_in` | NUMERIC | YES | |
| `lagging_durometer_shore_a` | NUMERIC | YES | |
| `finished_od_in` | NUMERIC | YES | If null, use family shell_od_in |
| `runout_max_in` | NUMERIC | YES | |
| `paint_spec` | TEXT | YES | |
| `version` | INT | NO | |
| `source` | TEXT | YES | |
| `notes` | TEXT | YES | |
| `is_active` | BOOLEAN | NO | |

---

### B.2 Seed Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `scripts/seed-pulley-families.ts` | Seeds PCI family/variant data | Created, 2 families + 4 variants |
| `scripts/delete-old-pulley-catalog.ts` | Removes legacy catalog entries | Created |

**Seeded Families:**
1. `PCI_FC_8IN_48_5_K17` - 8" Flat Face with K17 groove
2. `PCI_FC_4IN_42_5_K10` - 4" Flat Face with K10 groove

**Seeded Variants:**
- `PCI_FC_8IN_48_5_K17_LAGGED_BUSHED` - 8.5" finished OD
- `PCI_FC_8IN_48_5_K17_BEARING` - 8" (uses shell_od)
- `PCI_FC_4IN_42_5_K10_LAGGED_BUSHED` - 4.5" finished OD
- `PCI_FC_4IN_42_5_K10_BEARING` - 4" (uses shell_od)

---

### B.3 API Endpoints

| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/pulleys` | `app/api/pulleys/route.ts` | Legacy catalog (active only) |
| `GET /api/pulley-families` | `app/api/pulley-families/route.ts` | Families (active only) |
| `GET /api/pulley-variants` | `app/api/pulley-variants/route.ts` | Variants (active only) |

---

## C) Calculation Inventory

### C.1 Pulley Diameter Resolution

**File:** `src/models/sliderbed_v1/formulas.ts`
**Function:** `getEffectivePulleyDiameters()`
**Lines:** 89-135

**Priority Order (v1.24):**
1. Manual override → `drive_pulley_diameter_in` / `tail_pulley_diameter_in`
2. Variant key → `finished_od_in` from variant (or `shell_od_in` fallback)
3. Legacy catalog key → diameter from `pulley_catalog`
4. undefined if nothing selected

**Returns:**
- `effectiveDrivePulleyDiameterIn`
- `effectiveTailPulleyDiameterIn`
- `driveShellOdIn`, `driveFinishedOdIn` (from variant)
- `tailShellOdIn`, `tailFinishedOdIn` (from variant)

---

### C.2 Belt Length Calculation

**Function:** `calculateTotalBeltLengthSplit()`
**Expression:**
```
total_belt_length_in = (2 * cc_length_in) + PI * (drive_pulley_diameter_in + tail_pulley_diameter_in) / 2
```
**Units:** inches
**Notes:** Uses half-wrap (πD/2) for each pulley in open-belt configuration

---

### C.3 Drive Shaft RPM

**Function:** `calculateDriveShaftRpm()`
**Expression:**
```
drive_shaft_rpm = belt_speed_fpm / ((pulley_diameter_in / 12) * PI)
```
**Units:** RPM
**Dependencies:** `belt_speed_fpm`, `drive_pulley_diameter_in`

---

### C.4 Torque on Drive Shaft

**Function:** `calculateTorqueDriveShaft()`
**Expression:**
```
torque_drive_shaft_inlbf = total_belt_pull_lb * (pulley_diameter_in / 2) * safety_factor
```
**Units:** in-lbf
**Dependencies:** `total_belt_pull_lb`, `drive_pulley_diameter_in`, `safety_factor`

---

### C.5 Shaft Diameter Calculation (von Mises)

**File:** `src/models/sliderbed_v1/shaftCalc.ts`
**Function:** `calculateShaftDiameter()`

**Key Expressions:**
```
T1/T2 = e^(μθ)                    // Euler-Eytelwein tension ratio
T2 = Te / (tensionRatio - 1)
T1 = T2 * tensionRatio
radialLoad = √(T1² + T2² - 2×T1×T2×cos(θ))
M = (radialLoad * bearingSpan) / 4     // Bending moment
torque = Te * pulleyRadius             // Drive only
d = ∛((32 × SF × Kt / (π × Sy)) × √(M² + 0.75×T²))
```

**Inputs:**
| Parameter | Default | Notes |
|-----------|---------|-------|
| `wrap_angle_deg` | 180° | Hardcoded |
| `friction_coefficient` | 0.3 | Lagged pulley assumption |
| `bearing_span_in` | `belt_width + 5"` | Not user-configurable |
| `yield_strength_psi` | 45,000 | 1045 steel |
| `safety_factor` | 3.0 | |
| `service_factor` | 1.2 | |

**Outputs:**
- `required_diameter_in` (rounded to standard size)
- `T1_lbf`, `T2_lbf` (tight/slack side tensions)
- `radial_load_lbf`
- `bending_moment_inlbf`
- `torque_inlbf` (0 for tail)
- `von_mises_stress_psi`
- `deflection_in`, `deflection_ok`

**Standard Shaft Sizes:** 0.5, 0.625, 0.75, 0.875, 1.0, 1.125, 1.25, 1.375, 1.5, 1.625, 1.75, 1.875, 2.0, 2.25, 2.5, 2.75, 3.0"

**Deflection Limit:** 0.001 × bearing span

---

### C.6 Pulley Face Length

**Function:** `calculatePulleyFaceLength()`
**Expression:**
```
pulley_face_length_in = belt_width_in + pulley_face_extra_in
```
Where:
- V-guided: `pulley_face_extra_in = 0.5"`
- Crowned: `pulley_face_extra_in = 2.0"`

---

### C.7 Minimum Pulley Diameter Aggregate

**Output:** `required_min_pulley_diameter_in`
**Expression:**
```
required_min_pulley_diameter_in = max(belt_min, vguide_min, cleats_min)
```
**Sources:**
- `belt_min`: From belt catalog (`belt_min_pulley_dia_with_vguide_in` or `_no_vguide_in`)
- `vguide_min`: From V-guide catalog (PVC or PU values)
- `cleats_min`: From cleats catalog (with centers factor)

---

## D) Gaps Already Visible

### D.1 Missing Geometry Inputs (PCI Guide requires these)
| Field | Description | Current State |
|-------|-------------|---------------|
| `bearing_centers_in` | Distance between bearing centerlines | Assumed as `belt_width + 5"` |
| `hub_centers_in` | Distance between hub centerlines | Not stored |
| `hub_length_in` | Hub length | Not stored |
| `tube_id_in` | Inner diameter of shell tube | Not stored |
| `tube_wall_in` | Tube wall thickness | Stored in families as `shell_wall_in` |

### D.2 Missing PCI Calculations
| Calculation | Description | Current State |
|-------------|-------------|---------------|
| Stress Allowable Load | Based on tube stress at hub | Not implemented |
| Deflection Allowable Load | Based on deflection limit | Shaft deflection exists, pulley tube deflection not |
| Tube Stress | σ = M×c/I for tube section | Not implemented |
| Governing Allowable Load | min(stress_allowable, deflection_allowable) | Not implemented |
| Crown Verification | Per CEMA B105.1 Table 4 | Not implemented |

### D.3 Hardcoded Assumptions
| Item | Value | Should Be |
|------|-------|-----------|
| Wrap angle | 180° | Configurable or derived from geometry |
| Bearing span | belt_width + 5" | User input or derived from hub geometry |
| Friction coefficient | 0.3 | Catalog-driven (bare steel vs lagged) |
| Yield strength | 45,000 psi | Material-dependent |

### D.4 Schema Fields Added But Not Wired to UI
- `drive_pulley_variant_key` - in schema, not in UI
- `tail_pulley_variant_key` - in schema, not in UI
- `drive_pulley_shell_od_in` - output exists, not displayed
- `drive_pulley_finished_od_in` - output exists, not displayed

### D.5 Legacy vs New System Coexistence
- Legacy `pulley_catalog` table still in use
- New `pulley_families` + `pulley_variants` tables created
- UI still uses legacy `PulleySelect` component
- No UI for variant selection yet

---

## E) File Reference Index

| Category | File | Description |
|----------|------|-------------|
| **Schema** | `src/models/sliderbed_v1/schema.ts` | All input/output definitions |
| **Formulas** | `src/models/sliderbed_v1/formulas.ts` | Main calculation engine |
| **Shaft Calc** | `src/models/sliderbed_v1/shaftCalc.ts` | Von Mises shaft sizing |
| **Rules** | `src/models/sliderbed_v1/rules.ts` | Validation rules |
| **Legacy Catalog Lib** | `src/lib/pulley-catalog.ts` | Legacy pulley types/utilities |
| **Family Lib** | `src/lib/pulley-families.ts` | New family/variant types/utilities |
| **UI Component** | `app/components/TabConveyorPhysical.tsx` | Main pulley UI |
| **Legacy Select** | `app/components/PulleySelect.tsx` | Legacy dropdown |
| **Admin Families** | `app/admin/pulley-families/page.tsx` | Family CRUD |
| **Admin Variants** | `app/admin/pulley-variants/page.tsx` | Variant CRUD |
| **Migration Legacy** | `supabase/migrations/20251226_pulley_catalog.sql` | Legacy schema |
| **Migration New** | `supabase/migrations/20251230200000_pulley_families_variants.sql` | New schema |
| **Seed Script** | `scripts/seed-pulley-families.ts` | PCI data seeding |

---

*End of Current State Report*

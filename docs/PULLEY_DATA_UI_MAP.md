# Pulley Data + UI Map

**Updated:** 2025-12-31
**Version:** vNext (Pulley Library + Per-Application Pulleys)
**Status:** Current

---

## 1) Purpose

This document maps the database schema, UI components, API routes, and calculation engine integration for the pulley system. It serves as the single source of truth for how pulleys work in the application.

---

## 2) The New Data Model

### A) pulley_library_styles (Admin Truth)

**Purpose:** Engineering truth for pulley styles. Defines what styles exist, their eligibility constraints, and PCI stress limits. Managed by admins only.

**Location:** `supabase/migrations/20251231300000_pulley_reset.sql`

| Column | Type | Description |
|--------|------|-------------|
| `key` | TEXT PK | Immutable identifier (e.g., `DRUM_STEEL_STANDARD`) |
| `name` | TEXT | Display name |
| `description` | TEXT | Description shown in UI |
| `style_type` | ENUM | `DRUM`, `WING`, `SPIRAL_WING` |
| `material_class` | TEXT | Default: `STEEL` |
| `eligible_drive` | BOOLEAN | Can be used at drive position |
| `eligible_tail` | BOOLEAN | Can be used at tail position |
| `eligible_dirty_side` | BOOLEAN | Can be used on dirty/return side |
| `eligible_crown` | BOOLEAN | Supports crowned face profile |
| `eligible_v_guided` | BOOLEAN | Supports V-guided face profile |
| `eligible_lagging` | BOOLEAN | Can have lagging applied |
| `face_width_rule` | TEXT | `BELT_PLUS_ALLOWANCE` or `MANUAL_RANGE` |
| `face_width_allowance_in` | NUMERIC | Default allowance (2.0") |
| `tube_stress_limit_flat_psi` | NUMERIC | PCI limit for flat/crowned (10000) |
| `tube_stress_limit_vgroove_psi` | NUMERIC | PCI limit for V-groove (3400) |
| `is_active` | BOOLEAN | Soft delete flag |
| `sort_order` | INTEGER | Display ordering |

**Admin edits:** All fields except `key` (immutable after creation)
**Users never edit:** This table directly; users select styles via application_pulleys

---

### B) application_pulleys (Per-Application Instance)

**Purpose:** Stores the actual pulley configuration for each application line (calc_recipes row). Each application can have one drive pulley and one tail pulley.

**Location:** `supabase/migrations/20251231300000_pulley_reset.sql`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Auto-generated |
| `application_line_id` | UUID | FK to `calc_recipes.id` |
| `position` | ENUM | `DRIVE` or `TAIL` |
| `style_key` | TEXT FK | References `pulley_library_styles.key` |
| `face_profile` | ENUM | `FLAT`, `CROWNED`, `V_GUIDED` (derived from belt tracking) |
| `v_guide_key` | TEXT | V-guide profile key (only if face_profile = V_GUIDED) |
| `lagging_type` | ENUM | `NONE`, `RUBBER`, `URETHANE` |
| `lagging_thickness_in` | NUMERIC | Required if lagging_type != NONE |
| `face_width_in` | NUMERIC | Face width |
| `shell_od_in` | NUMERIC | Shell outer diameter (for PCI) |
| `shell_wall_in` | NUMERIC | Shell wall thickness (for PCI) |
| `hub_centers_in` | NUMERIC | Hub center distance (for PCI) |
| `finished_od_in` | NUMERIC | Auto-computed: shell_od + 2×lagging |
| `enforce_pci_checks` | BOOLEAN | Enable PCI tube stress validation |
| `notes` | TEXT | User notes |

**Constraints:**
- `UNIQUE(application_line_id, position)` — one drive, one tail per app
- `v_guide_key` required when `face_profile = V_GUIDED`
- `lagging_thickness_in` required when `lagging_type != NONE`

---

## 3) User Workflow (Application UI)

### Location
`/console/belt` → Tab: Conveyor Physical → Accordion: Pulleys & Belt Interface

### UI Structure

Two side-by-side cards:

| Card | Position | Shows |
|------|----------|-------|
| Head/Drive Pulley | DRIVE | Style name, face profile badge, finished OD |
| Tail Pulley | TAIL | Style name, face profile badge, finished OD |

### Configure Button
Each card has a **"Configure Pulleys" / "Edit Pulleys"** button that opens `PulleyConfigModal`.

### Modal Workflow
1. User opens modal
2. Tabs: Drive | Tail
3. Select style from filtered dropdown (filtered by position + tracking)
4. Set lagging type/thickness
5. Set face width (defaults to belt width + allowance)
6. (Advanced) Set shell OD/wall/hub centers for PCI
7. Save → creates/updates `application_pulleys` rows
8. Modal closes, cards show summary

### Draft App Constraint
**CURRENT LIMITATION:** The Configure button requires `applicationLineId` (calc_recipes.id). Draft applications have no ID until first save, so users cannot configure pulleys until after saving at least once.

**File:** `app/components/TabConveyorPhysical.tsx:1239-1244`

---

## 4) Tracking Drives Face Profile

### Core Principle
Belt tracking selection determines pulley face profile. Users do NOT directly select face profile in the pulley modal — it's derived and shown read-only.

### Derivation Logic

**File:** `src/lib/pulley-tracking.ts:37-52`

```
inputs.belt_tracking_method = 'V-guided'  → V_GUIDED
inputs.belt_tracking_method = 'Crowned'   → CROWNED
else                                      → FLAT
```

### Eligibility Filtering

**File:** `src/lib/pulley-tracking.ts:97-117`

Function `getEligiblePulleyStyles(styles, position, trackingMode)` filters styles:

1. Must be `is_active = true`
2. Position check:
   - DRIVE → `eligible_drive = true`
   - TAIL → `eligible_tail = true`
3. Tracking check:
   - V_GUIDED → `eligible_v_guided = true`
   - CROWNED → `eligible_crown = true`
   - FLAT → no additional filter

### Not Yet Implemented
- `eligible_dirty_side` is stored but NOT used in filtering logic
- No automatic detection of "dirty side" position

---

## 5) Geometry Defaults + Computations

### Face Width Default
```
default_face_width = belt_width_in + style.face_width_allowance_in
```
Where `face_width_allowance_in` defaults to 2.0" in seed data.

**File:** `app/components/PulleyConfigModal.tsx:49-50, 101-102`

### Finished OD Computation
```
finished_od_in = shell_od_in + (2 × lagging_thickness_in)
```
If `lagging_type = NONE`, then `finished_od_in = shell_od_in`.

**Computed by:** Database trigger `compute_finished_od()` on INSERT/UPDATE.

**File:** `supabase/migrations/20251231300000_pulley_reset.sql:204-216`

---

## 6) API Contract

### /api/admin/pulley-library

**File:** `app/api/admin/pulley-library/route.ts`

| Method | Purpose | Auth |
|--------|---------|------|
| GET | List styles | — |
| POST | Create style | Admin |
| PUT | Update style | Admin |
| DELETE | Soft delete (set is_active=false) | Admin |

**GET Query Params:**
- `active_only=false` to include inactive styles (default: true)

**POST/PUT Payload:**
```typescript
{
  key: string,           // Required, uppercase, immutable after create
  name: string,          // Required
  style_type: 'DRUM' | 'WING' | 'SPIRAL_WING',
  eligible_drive: boolean,
  eligible_tail: boolean,
  eligible_crown: boolean,
  eligible_v_guided: boolean,
  eligible_lagging: boolean,
  // ... other fields
}
```

**Validation:**
- Key must be unique
- Key normalized to uppercase with underscores
- Style type must be valid enum value

---

### /api/application-pulleys

**File:** `app/api/application-pulleys/route.ts`

| Method | Purpose |
|--------|---------|
| GET | Fetch pulleys for an application line |
| POST | Create/upsert pulley config |
| DELETE | Remove pulley config |

**GET Query Params:**
- `line_id` (required) — The application line UUID
- `position` (optional) — Filter by DRIVE or TAIL

**POST Payload:**
```typescript
{
  application_line_id: string,  // Required
  position: 'DRIVE' | 'TAIL',   // Required
  style_key: string,            // Required, must exist
  face_profile: 'FLAT' | 'CROWNED' | 'V_GUIDED',
  v_guide_key?: string,         // Required if V_GUIDED
  lagging_type: 'NONE' | 'RUBBER' | 'URETHANE',
  lagging_thickness_in?: number, // Required if lagging != NONE
  face_width_in?: number,
  shell_od_in?: number,
  shell_wall_in?: number,
  hub_centers_in?: number,
  enforce_pci_checks?: boolean,
  notes?: string
}
```

**Validation (API enforces):**
- Style must exist and be active
- Style must be eligible for position (drive/tail)
- Style must be eligible for face_profile (crown/v_guided)
- V-guide key required for V_GUIDED profile
- Lagging thickness required for non-NONE lagging

**Upsert:** Uses `ON CONFLICT (application_line_id, position)` to update existing.

**DELETE Query Params:**
- `id` (required) — The application_pulleys UUID

---

## 7) Calculation Engine Integration

### Current Architecture
The calculation engine (`src/models/sliderbed_v1/formulas.ts`) reads from `inputs.*` fields, not directly from `application_pulleys`. A sync layer bridges the gap.

### getEffectivePulleyDiameters()

**File:** `src/models/sliderbed_v1/formulas.ts:104-168`

**Priority for drive pulley:**
1. `drive_pulley_manual_override = true` → use `inputs.drive_pulley_diameter_in`
2. `drive_pulley_variant_key` → legacy lookup (now returns undefined)
3. `head_pulley_catalog_key` → legacy lookup (now returns undefined)
4. `drive_pulley_diameter_in > 0` → use directly
5. `pulley_diameter_in > 0` → legacy fallback

### Sync from application_pulleys → inputs

**File:** `app/components/TabConveyorPhysical.tsx:249-271`

When application_pulleys are loaded, the UI syncs to inputs:

```typescript
// Drive pulley
inputs.drive_pulley_diameter_in = drivePulley.finished_od_in
inputs.drive_pulley_manual_override = true

// Tail pulley
inputs.tail_pulley_diameter_in = tailPulley.finished_od_in
inputs.tail_pulley_manual_override = true
```

This ensures `getEffectivePulleyDiameters()` uses priority #1 (manual override).

### NOT Currently Wired
The following `application_pulleys` fields are **NOT synced** to inputs for PCI calculations:

| application_pulleys | Missing inputs.* field |
|---------------------|------------------------|
| `shell_od_in` | `drive_tube_od_in` |
| `shell_wall_in` | `drive_tube_wall_in` |
| `hub_centers_in` | (no equivalent) |

**Impact:** PCI tube stress checks cannot use per-application pulley geometry yet.

---

## 8) Seed Data

### Current Seed Styles (2)

| Key | Name | Type | Eligible |
|-----|------|------|----------|
| `DRUM_STEEL_STANDARD` | Standard Drum | DRUM | drive, tail, crown, v_guided, lagging |
| `WING_STEEL_STANDARD` | Wing Pulley | WING | tail, dirty_side |

**File:** `supabase/migrations/20251231300000_pulley_reset.sql:222-248`

### Minimum Required Seed Set (Future)
- [ ] DRUM sizes: 3", 4", 5", 6", 8" with default shell_od/wall
- [ ] Crowned drum variants
- [ ] Wing pulley sizes
- [ ] Spiral wing (when supported)
- [ ] V-groove drum variants

---

## 9) Deprecations

### Removed Tables
- `pulley_catalog`, `pulley_catalog_versions`
- `pulley_families`, `pulley_variants`
- `pulley_definitions`, `pulley_configurations`, `pulley_aliases`, `pulley_overrides`

### Removed Routes
- `/api/pulleys`
- `/api/pulley-families`
- `/api/pulley-variants`

### Removed Admin Pages
- `/admin/pulleys`
- `/admin/pulley-families`
- `/admin/pulley-variants`

### Removed Components/Libraries
- `app/components/PulleySelect.tsx`
- `app/hooks/usePulleyCatalog.ts`
- `app/hooks/usePulleyFamilies.ts`
- `src/lib/pulley-catalog.ts`
- `src/lib/pulley-families.ts`

**No more pulley families/variants/catalog.** The new model is:
- `pulley_library_styles` (admin truth)
- `application_pulleys` (per-app instances)

---

## 10) Known Gaps / Next Improvements

1. **PCI Geometry Sync**
   - Wire `shell_od_in`, `shell_wall_in`, `hub_centers_in` from application_pulleys to inputs for PCI tube stress calculations.

2. **Draft Configuration Before Save**
   - Allow pulley configuration on draft applications (before first save creates calc_recipes row).

3. **Dirty-Side Eligibility**
   - Implement filtering logic using `eligible_dirty_side` when tail is on return/dirty side.

4. **More Seeded Styles**
   - Add common drum sizes with pre-populated shell geometry for quick selection.

5. **Style Variants/Sizes**
   - Consider adding a "pulley sizes" concept under each style if per-size geometry is needed.

---

## File Reference

| Purpose | Path |
|---------|------|
| Migration | `supabase/migrations/20251231300000_pulley_reset.sql` |
| Tracking logic | `src/lib/pulley-tracking.ts` |
| Config modal | `app/components/PulleyConfigModal.tsx` |
| Physical tab | `app/components/TabConveyorPhysical.tsx` |
| Admin page | `app/admin/pulley-library/page.tsx` |
| Admin API | `app/api/admin/pulley-library/route.ts` |
| App pulleys API | `app/api/application-pulleys/route.ts` |
| Calc formulas | `src/models/sliderbed_v1/formulas.ts` |

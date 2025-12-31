# Pulley Data + UI Map Report

**Generated:** 2024-12-31
**Updated:** 2024-12-31
**Version:** v1.28
**Purpose:** Phase 0 inventory for Pulley Model Simplification (PCI-Aligned)
**Branch:** fix/pulley-admin
**Status:** All 8 phases complete

---

## Executive Summary

Today's pulley selection uses a **dual model**:
1. **Legacy**: `pulley_catalog` table with `head_pulley_catalog_key` / `tail_pulley_catalog_key`
2. **Current (v1.24+)**: `pulley_families` + `pulley_variants` tables with `drive_pulley_variant_key` / `tail_pulley_variant_key`

Calculations consume: `diameter_in`, `shell_od_in`, `finished_od_in`, `shell_wall_in` (for PCI checks)

Admin pages active: `/admin/pulleys`, `/admin/pulley-families`, `/admin/pulley-variants`

Migration strategy: **dual-read + alias map**

---

## 1. Database Tables

### 1.1 pulley_catalog (v1.15 - Legacy)
**Migration:** `supabase/migrations/20251226_pulley_catalog.sql`

| Column | Type | Description |
|--------|------|-------------|
| `catalog_key` | text PK | Stable identifier (e.g., STD_DRUM_4_STEEL) |
| `display_name` | text | Human-readable name |
| `manufacturer` | text | PCI, etc. |
| `part_number` | text | Mfg part number |
| `diameter_in` | numeric | Nominal diameter |
| `face_width_min_in` | numeric | Min face width |
| `face_width_max_in` | numeric | Max face width |
| `crown_height_in` | numeric | Crown height (0 = flat) |
| `type` | enum | DRUM, WING, SPIRAL, MAGNETIC |
| `shell_material` | text | Steel, Stainless, etc. |
| `is_lagged` | boolean | Has lagging? |
| `lagging_type` | text | Rubber, Urethane, etc. |
| `lagging_thickness_in` | numeric | Lagging thickness |
| `shaft_arrangement` | enum | THROUGH_SHAFT_EXTERNAL_BEARINGS, STUB_SHAFT_EXTERNAL_BEARINGS, INTERNAL_BEARINGS |
| `hub_connection` | enum | KEYED, TAPER_LOCK, QD_BUSHING, etc. |
| `allow_head_drive` | boolean | Can be used at head/drive? |
| `allow_tail` | boolean | Can be used at tail? |
| `allow_snub` | boolean | Can be used as snub? |
| `allow_bend` | boolean | Can be used as bend? |
| `allow_takeup` | boolean | Can be used at take-up? |
| `max_shaft_rpm` | numeric | Max RPM |
| `max_belt_speed_fpm` | numeric | Max belt speed |
| `max_tension_pli` | numeric | Max tension per linear inch |
| `is_preferred` | boolean | Preferred selection |
| `is_active` | boolean | Soft delete flag |

**Constraint:** INTERNAL_BEARINGS → allow_tail=true, all others=false

**Audit Table:** `pulley_catalog_versions` (change tracking)

---

### 1.2 pulley_families (v1.30 - Current)
**Migration:** `supabase/migrations/20251230200000_pulley_families_variants.sql`

| Column | Type | Description |
|--------|------|-------------|
| `pulley_family_key` | text PK | Stable identifier (e.g., PCI_FC_4IN_42_5_K10) |
| `manufacturer` | text | PCI, etc. |
| `style` | text | FLAT_FACE, CROWNED, WING, SPIRAL |
| `material` | text | Steel, Stainless, etc. |
| `shell_od_in` | numeric | Shell outer diameter |
| `face_width_in` | numeric | Face width |
| `shell_wall_in` | numeric | Shell wall thickness |
| `is_crowned` | boolean | Has crown? |
| `crown_type` | text | Crown type description |
| `v_groove_section` | text | V-groove profile (K10, K13, K17, etc.) |
| `v_groove_top_width_in` | numeric | V-groove top width |
| `v_groove_bottom_width_in` | numeric | V-groove bottom width |
| `v_groove_depth_in` | numeric | V-groove depth |
| `version` | text | Data version |
| `source` | text | Source document reference |
| `notes` | text | Notes |
| `is_active` | boolean | Soft delete flag |

---

### 1.3 pulley_variants (v1.30 - Current)
**Migration:** `supabase/migrations/20251230200000_pulley_families_variants.sql`

| Column | Type | Description |
|--------|------|-------------|
| `pulley_variant_key` | text PK | Stable identifier |
| `pulley_family_key` | text FK | References pulley_families |
| `bore_in` | numeric | Bore diameter |
| `hub_style` | text | XT, QD, TAPER_LOCK, etc. |
| `bearing_type` | text | Bearing type |
| `lagging_type` | text | SBR, URETHANE, CERAMIC, etc. |
| `lagging_thickness_in` | numeric | Lagging thickness |
| `lagging_durometer_shore_a` | numeric | Lagging durometer |
| `finished_od_in` | numeric | Finished OD (incl. lagging) - overrides family shell_od_in |
| `runout_max_in` | numeric | Max runout tolerance |
| `paint_spec` | text | Paint specification |
| `version` | text | Data version |
| `source` | text | Source document reference |
| `notes` | text | Notes |
| `is_active` | boolean | Soft delete flag |

---

## 2. TypeScript Libraries

### 2.1 src/lib/pulley-catalog.ts
**Types:**
- `PulleyCatalogItem` - Interface matching pulley_catalog table
- `PulleyStation` - 'head_drive' | 'tail' | 'snub' | 'bend' | 'takeup'
- `ShaftArrangement` - Enum with 3 values
- `HubConnection` - Enum with 6 values
- `PulleyConstruction` - 'DRUM' | 'WING' | 'SPIRAL' | 'MAGNETIC'

**Functions:**
- `getEffectiveDiameter(item)` - Returns diameter + 2×lagging_thickness
- `isStationCompatible(item, station)` - Checks allow_* flags
- `hasInternalBearings(item)` - Checks shaft_arrangement
- `filterPulleys(items, criteria)` - Filters with validation
- `getEffectiveDiameterByKey(key)` - Lookup by catalog_key
- `isPulleyKeyValid(key)` - Validates catalog key exists

**Cache:** `setCachedPulleys()`, `getCachedPulleys()`, `clearPulleyCatalogCache()`

---

### 2.2 src/lib/pulley-families.ts
**Types:**
- `PulleyFamily` - Interface matching pulley_families table
- `PulleyVariant` - Interface matching pulley_variants table
- `PulleyVariantWithFamily` - Variant with embedded family

**Functions:**
- `getShellOdIn(family)` - Returns family.shell_od_in
- `getFinishedOdIn(variant, family)` - Returns variant.finished_od_in or fallback
- `getVariantFinishedOdIn(variantWithFamily)` - Same for joined object
- `getVariantDisplayLabel(variant, family)` - Generate display label
- `validatePulleyFamily(family)` - Validates family data
- `validatePulleyVariant(variant)` - Validates variant data
- `getFamilyByKey(key)` - Lookup family
- `getVariantByKey(key)` - Lookup variant
- `getFinishedOdByVariantKey(key)` - **Main lookup for calculator**
- `getShellOdByVariantKey(key)` - Get shell OD
- `isVariantKeyValid(key)` - Validates variant key exists

**Cache:** `setCachedPulleyFamilies()`, `setCachedPulleyVariants()`, etc.

---

## 3. API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/pulleys` | GET | Fetch active pulley_catalog items |
| `/api/pulleys` | POST | Create/update catalog item (admin) |
| `/api/pulley-families` | GET | Fetch active families (supports `includeInactive`) |
| `/api/pulley-families` | POST | Create/update family (admin) |
| `/api/pulley-variants` | GET | Fetch active variants with family join (supports `familyKey` filter) |
| `/api/pulley-variants` | POST | Create/update variant (admin) |

---

## 4. Admin Pages

| Route | Purpose | Status |
|-------|---------|--------|
| `/admin/pulleys` | Pulley Catalog Editor | Legacy (v1.15) |
| `/admin/pulley-families` | Pulley Families Editor | Current (v1.30) |
| `/admin/pulley-variants` | Pulley Variants Editor | Current (v1.30) |

---

## 5. User-Facing UI

### 5.1 Component: PulleySelect.tsx
**Location:** `app/components/PulleySelect.tsx`

**Usage:** Used in `TabConveyorPhysical.tsx` for pulley selection

**Data Source:** Currently fetches from `/api/pulley-variants` (v1.24+)

### 5.2 Hooks
| Hook | Source |
|------|--------|
| `usePulleyCatalog` | `/api/pulleys` (legacy) |
| `usePulleyFamilies` | `/api/pulley-families` + `/api/pulley-variants` |

---

## 6. Calculator Integration

### 6.1 Input Fields (schema.ts)
```typescript
// Current (v1.24+)
drive_pulley_variant_key?: string;
tail_pulley_variant_key?: string;
drive_pulley_manual_override?: boolean;
tail_pulley_manual_override?: boolean;
drive_pulley_diameter_in?: number;
tail_pulley_diameter_in?: number;

// Legacy (v1.15)
head_pulley_catalog_key?: string;
tail_pulley_catalog_key?: string;
pulley_diameter_in?: number;  // Legacy fallback
```

### 6.2 Resolution Priority (formulas.ts:98-162)
```
1. Manual override flag + direct diameter → use drive_pulley_diameter_in
2. Variant key → getFinishedOdByVariantKey() → finished_od_in or shell_od_in
3. Legacy catalog key → getEffectiveDiameterByKey()
4. Direct diameter fields (backward compat)
5. Legacy pulley_diameter_in fallback
```

### 6.3 Fields Consumed by Calculations
| Field | Used In |
|-------|---------|
| `drivePulleyDiameterIn` | Belt length, RPM, torque, frame height, shaft sizing, PIW/PIL lookup |
| `tailPulleyDiameterIn` | Belt length, snub rollers, min pulley check |
| `drive_tube_od_in` | PCI tube stress (from shell_od_in or override) |
| `drive_tube_wall_in` | PCI tube stress (from shell_wall_in or override) |

### 6.4 Output Fields Generated
| Field | Source |
|-------|--------|
| `drive_pulley_shell_od_in` | From variant's family |
| `drive_pulley_finished_od_in` | From variant or fallback |
| `tail_pulley_shell_od_in` | From variant's family |
| `tail_pulley_finished_od_in` | From variant or fallback |
| `pci_drive_tube_stress_psi` | PCI formula result |
| `pci_tail_tube_stress_psi` | PCI formula result |

---

## 7. Existing Constraints & Rules

### 7.1 Database Constraints
- `INTERNAL_BEARINGS` → tail-only (enforced at DB, TS, and UI levels)
- Face width must be within min/max bounds
- Positive dimensions required

### 7.2 TypeScript Validation
- `validatePulleyFamily()` - Validates shell_od_in > 0, face_width_in > 0, etc.
- `validatePulleyVariant()` - Validates finished_od_in > 0 or null, etc.
- `isStationCompatible()` - Checks allow_* flags

### 7.3 Missing (needs implementation)
- Dirty-side eligibility inference
- V-groove → dirty-side incompatibility
- Drive-capable enforcement
- Crown eligibility enforcement

---

## 8. Migration Strategy

### 8.1 Dual-Read Approach
1. New `pulley_definitions` and `pulley_configurations` tables created alongside existing
2. `pulley_aliases` table maps legacy keys to new keys
3. Calculator adapter tries new model first, falls back to legacy
4. All saved configurations continue to work via alias resolution

### 8.2 ID Continuity
- Legacy `catalog_key`, `pulley_family_key`, `pulley_variant_key` remain valid
- Aliases table ensures old keys resolve to new definitions/configurations
- No breaking changes to saved applications

### 8.3 Admin Consolidation
- New `/admin/pulleys` with tabs replaces 3 separate pages
- Old pages deprecated with banner, not deleted
- Alias tab shows unmapped legacy entries

---

## 9. New PCI-Aligned Model (v1.28)

### 9.1 New Tables (side-by-side)

| Table | Purpose |
|-------|---------|
| `pulley_definitions` | Engineering truth - identity + constraints |
| `pulley_configurations` | Bounded user choices within constraints |
| `pulley_aliases` | Legacy key mapping for ID continuity |
| `pulley_overrides` | Tiered escape hatch with audit trail |

### 9.2 New Libraries

| File | Purpose |
|------|---------|
| `src/lib/pulley-definitions.ts` | TypeScript types and utilities |
| `src/models/sliderbed_v1/pulleyRules.ts` | Explicit rule functions |
| `src/models/sliderbed_v1/pulleySelectionAdapter.ts` | Calculation adapter (dual-read) |

### 9.3 New API Routes

| Route | Purpose |
|-------|---------|
| `/api/pulley-definitions` | CRUD for definitions |
| `/api/pulley-configurations` | CRUD for configurations |
| `/api/pulley-aliases` | CRUD for aliases |
| `/api/pulley-aliases/resolve` | Resolve legacy key to new model |
| `/api/pulley-overrides` | CRUD for overrides |

### 9.4 New Admin Page

| Route | Purpose |
|-------|---------|
| `/admin/pulley-management` | Unified admin with 4 tabs (Definitions, Configurations, Aliases, Overrides) |

### 9.5 Migration Scripts

| File | Purpose |
|------|---------|
| `20251231220000_pulley_definitions_model.sql` | Create new tables + enums |
| `20251231230000_migrate_legacy_pulleys.sql` | Transfer data from legacy tables |

---

## Appendix: File Locations

| Type | Path |
|------|------|
| Migration (catalog) | `supabase/migrations/20251226_pulley_catalog.sql` |
| Migration (families) | `supabase/migrations/20251230200000_pulley_families_variants.sql` |
| Migration (new model) | `supabase/migrations/20251231220000_pulley_definitions_model.sql` |
| Migration (data) | `supabase/migrations/20251231230000_migrate_legacy_pulleys.sql` |
| Library (catalog) | `src/lib/pulley-catalog.ts` |
| Library (families) | `src/lib/pulley-families.ts` |
| Test (catalog) | `src/lib/pulley-catalog.test.ts` |
| Test (families) | `src/lib/pulley-families.test.ts` |
| API (catalog) | `app/api/pulleys/route.ts` |
| API (families) | `app/api/pulley-families/route.ts` |
| API (variants) | `app/api/pulley-variants/route.ts` |
| Admin (catalog) | `app/admin/pulleys/page.tsx` |
| Admin (families) | `app/admin/pulley-families/page.tsx` |
| Admin (variants) | `app/admin/pulley-variants/page.tsx` |
| Hook (catalog) | `app/hooks/usePulleyCatalog.ts` |
| Hook (families) | `app/hooks/usePulleyFamilies.ts` |
| Component | `app/components/PulleySelect.tsx` |
| Formulas | `src/models/sliderbed_v1/formulas.ts` |
| Schema | `src/models/sliderbed_v1/schema.ts` |

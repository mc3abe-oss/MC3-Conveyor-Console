# Phase 2.0: Belt Conveyor Rules Deduplication Analysis

## Executive Summary

**Recommendation: Option B (single file with product context)**

The belt_conveyor_v1/rules.ts is effectively dead code in production. The engine always calls sliderbed_v1/rules.ts for ALL products. Only 4 of 58 belt rules have meaningful differences (3 LOGIC_DIFF + 1 SEVERITY_DIFF). The simplest fix is to delete belt_conveyor_v1/rules.ts and consolidate into sliderbed_v1/rules.ts with product name templating for the 3 wording differences.

---

## Call Graph

```
BeltConveyorCalculatorApp.tsx
  └── triggerCalculate → engine.runCalculation({ inputs, productKey })

engine.ts:runCalculation()
  ├── validate(inputs, parameters, productKey)          ← ALWAYS sliderbed_v1/rules.ts
  │     ├── validateInputs(inputs, productKey)          ← sliderbed_v1/rules.ts
  │     ├── validateParameters(parameters)              ← sliderbed_v1/rules.ts
  │     ├── applyApplicationRules(inputs)               ← sliderbed_v1/rules.ts
  │     └── applyHeightWarnings(inputs)                 ← sliderbed_v1/rules.ts
  │
  └── product.calculate(inputs, parameters)             ← dispatched by productKey
        ├── beltConveyorV1.calculate()                  ← belt_conveyor_v1
        └── magneticConveyorV1.calculate()              ← magnetic_conveyor_v1

ProductModule.validate() (belt_conveyor_v1/index.ts:validateWrapper)
  └── belt_conveyor_v1/rules.ts:validate()              ← NEVER CALLED by engine
        ├── belt_conveyor_v1/rules.ts:validateInputs()  ← dead in production
        ├── belt_conveyor_v1/rules.ts:validateParameters()
        └── belt_conveyor_v1/rules.ts:applyApplicationRules()
```

### Imports from rules files

| Consumer | Imports from | Used in production? |
|----------|-------------|-------------------|
| `src/lib/calculator/engine.ts` | `sliderbed_v1/rules.ts:validate` | **YES** — all products |
| `src/products/belt_conveyor_v1/index.ts` | `belt_conveyor_v1/rules.ts:validate` | **NO** — on product module but engine doesn't call it |
| Product registry tests | `product.validate()` | Test only |
| `generate-golden-fixtures.ts` | Both | Analysis tool only |

### Critical Finding

**belt_conveyor_v1/rules.ts is dead code in production.** The engine hardcodes `sliderbed_v1/rules.ts:validate()` at line 159, passing `productKey` for product-scoped gating. The belt product module exposes a `validate()` wrapper, but nothing in the production code path calls it.

This means:
- Users with belt conveyors actually get sliderbed validation (with productKey='belt_conveyor_v1' for gating)
- The "severity difference" (pulley min as error vs warning) only exists in the dead belt rules — users never see the error version
- The "wording differences" (belt conveyor vs sliderbed conveyor) — users see sliderbed wording for belt products too

---

## Rule Classification Table

### belt_conveyor_v1/rules.ts → sliderbed_v1/rules.ts Comparison

#### validateInputs (42 pushes in belt)

| # | Belt Line | Field | Classification | Notes |
|---|-----------|-------|----------------|-------|
| 1 | 47 | conveyor_length_cc_in | IDENTICAL | |
| 2 | 55 | belt_width_in | IDENTICAL | |
| 3 | 63 | conveyor_incline_deg | IDENTICAL | |
| 4 | 71 | pulley_diameter_in | IDENTICAL | |
| 5 | 80 | drive_rpm | **LOGIC_DIFF** | Belt: simple `drive_rpm <= 0`. Sliderbed: speed_mode branching (belt_speed_fpm vs drive_rpm_input). Belt version is legacy. |
| 6 | 88 | required_throughput_pph | IDENTICAL | |
| 7 | 96 | throughput_margin_pct | IDENTICAL | |
| 8 | 105 | part_weight_lbs | **LOGIC_DIFF** | Belt: optional (`!== undefined && <= 0`). Sliderbed: required in PARTS mode with material_form gating. |
| 9 | 113 | part_length_in | **LOGIC_DIFF** | Same as #8 |
| 10 | 121 | part_width_in | **LOGIC_DIFF** | Same as #8 |
| 11 | 129 | part_spacing_in | IDENTICAL | |
| 12 | 138 | drop_height_in | IDENTICAL | |
| 13–24 | 147–239 | safety_factor, belt_coeff_piw/pil, starting_belt_pull_lb, friction_coeff, motor_rpm | IDENTICAL | 12 parameter range checks |
| 25 | 248 | v_guide_key | IDENTICAL | |
| 26–27 | 260, 267 | drive/tail_shaft_diameter_in (manual) | IDENTICAL | |
| 28–31 | 277–305 | belt_piw/pil_override | IDENTICAL | |
| 32–35 | 311–338 | drive/tail_shaft_diameter_in (range) | IDENTICAL | |

#### validateParameters (5 pushes in belt)

| # | Belt Line | Field | Classification | Notes |
|---|-----------|-------|----------------|-------|
| 36–40 | 354–390 | friction_coeff, safety_factor, starting_belt_pull_lb, motor_rpm, gravity_in_per_s2 | IDENTICAL | All 5 identical |

#### applyApplicationRules (16 pushes in belt)

| # | Belt Line | Field | Classification | Notes |
|---|-----------|-------|----------------|-------|
| 41 | 408 | part_temperature_class (RED_HOT) | **WORDING_ONLY** | "belt conveyor" vs "sliderbed conveyor" |
| 42 | 417 | fluid_type (CONSIDERABLE) | IDENTICAL | |
| 43 | 426 | conveyor_length_cc_in (>120) | IDENTICAL | |
| 44 | 435 | part_temperature_class (HOT) | IDENTICAL | |
| 45 | 444 | fluid_type (MINIMAL) | IDENTICAL | |
| 46 | 453 | drop_height_in (>=24) | IDENTICAL | |
| 47 | 465 | conveyor_incline_deg (>45) | **WORDING_ONLY** | "Belt conveyor" vs "Sliderbed conveyor" |
| 48 | 475 | conveyor_incline_deg (>35) | IDENTICAL | |
| 49 | 485 | conveyor_incline_deg (>20) | IDENTICAL | |
| 50 | 499 | end_guards (finger_safe) | IDENTICAL | |
| 51 | 508 | bottom_covers (finger_safe) | IDENTICAL | |
| 52 | 517 | lacing_style (ClipperLacing) | IDENTICAL | |
| 53 | 538 | pulley_diameter_in (belt min) | **SEVERITY_DIFF** | Belt: ERROR on `pulley_diameter_in`. Sliderbed: WARNING on `drive_pulley_diameter_in` + `tail_pulley_diameter_in` (split). Also checks are in `applyApplicationRules` in sliderbed, same location in belt. |
| 54 | 552 | cycle_time_seconds | IDENTICAL | |
| 55 | 568 | belt_tracking_method (heavy side load) | IDENTICAL | |
| 56 | 574 | side_loading_severity (heavy) | IDENTICAL | |
| 57 | 580 | side_loading_severity (moderate) | IDENTICAL | |
| 58 | 595 | premium (info loop) | **BELT_ONLY** | calculatePremiumFlags — no counterpart in sliderbed |

---

## Classification Counts

| Classification | Count | % of 58 belt rules |
|----------------|-------|---------------------|
| IDENTICAL | 48 | 83% |
| WORDING_ONLY | 3 | 5% |
| LOGIC_DIFF | 4 | 7% |
| SEVERITY_DIFF | 1 | 2% |
| BELT_ONLY | 1 | 2% |
| SLIDERBED_ONLY | ~98 pushes | n/a (features belt hasn't adopted) |

---

## Recommendation: Option B

**Rationale:**

1. **belt_conveyor_v1/rules.ts is dead code.** The engine never calls it. This alone is sufficient reason to delete it — it creates maintenance burden (we patched it in Phase 1) without being executed.

2. **Only 3 wording differences.** These can be handled by templating `{productName}` in 3 messages, with a lookup table: `{ 'belt_conveyor_v1': 'belt conveyor', default: 'sliderbed conveyor' }`.

3. **The 4 LOGIC_DIFF rules are legacy.** Belt's simpler `drive_rpm` check and optional part fields are superseded by sliderbed's evolved versions (speed mode branching, material form gating). Since the engine already uses sliderbed validation for belt products, deleting belt's rules changes nothing in production.

4. **The 1 SEVERITY_DIFF is also dead.** The belt ERROR for pulley-below-minimum never fires because the engine uses sliderbed's WARNING version. If we want it as an ERROR for belt products, we should add that override to sliderbed's rules with a productKey check — not maintain a dead file.

5. **The 1 BELT_ONLY rule (premium flags)** should be moved to sliderbed's `applyApplicationRules` with a productKey gate.

6. **No new framework needed.** The changes are:
   - Add `productName` parameter to 3 messages in sliderbed_v1/rules.ts
   - Move premium flags to sliderbed_v1/rules.ts behind `productKey === 'belt_conveyor_v1'` gate
   - Delete belt_conveyor_v1/rules.ts
   - Update belt_conveyor_v1/index.ts to import from sliderbed_v1/rules
   - Update product registry tests

---

## Golden Fixture Analysis

Pre-refactor differences captured between rule paths:

| Fixture | Sliderbed Errors | Sliderbed Warnings | Belt Errors | Belt Warnings | Divergence |
|---------|-----------------|-------------------|-------------|--------------|------------|
| 01-clean | 0 | 1 | 0 | 0 | Sliderbed has 1 extra warning (belt speed high) |
| 02-heavy-vguided | 0 | 2 | 0 | 2 | Identical counts |
| 03-heavy-crowned | 1 | 2 | 1 | 1 | Sliderbed has 1 extra warning |
| 04-incline-25 | 0 | 2 | 0 | 1 | Sliderbed has 1 extra warning |
| 05-incline-40 | 0 | 2 | 0 | 1 | Sliderbed has 1 extra warning |
| 06-incline-50 | 1 | 1 | 1 | 0 | Sliderbed has 1 extra warning |
| 07-multiple | 0 | 4 | 0 | 3 | Sliderbed has 1 extra warning |
| 08-red-hot | 1 | 1 | 1 | 0 | Wording diff + 1 extra warning |
| 09-pulley-min | 2 | 6 | 1 | 0 | Major divergence (sliderbed has more rules active) |
| 10-finger-safe | 0 | 3 | 0 | 2 | Sliderbed has 1 extra warning |

The consistent "sliderbed has 1 extra warning" pattern is because sliderbed has more rules active for the same inputs (e.g., belt speed warnings, split pulley checks). This is expected — it's the richer rule set.

Since production already uses sliderbed rules for belt products, the golden regression test should verify that sliderbed's output is preserved exactly (that's what users actually see).

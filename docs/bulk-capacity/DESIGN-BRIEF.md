# Bulk Conveyor Capacity & Margin — Design Brief

Terminology: belt conveyor is the product; bed type (slider | roller) is a configuration. See Conveyor-Console decision brief §2.

## 1. Purpose of this document
This is a hand-off spec for designing the correct **BULK-material capacity calculation** in the
belt conveyor calculator. A first implementation shipped to `main` and the domain owner judged its
model wrong. This document states the problem, the domain method we agreed on, what is already in
the code, the one open question (how "margin" works), and the constraints, so a solution can be
designed and handed back for implementation. Assume the reader has the repo but not the chat
history.

## 2. System context
- App: Next.js 15 belt conveyor design calculator. Pure-function calc model with required
  Excel parity.
- Calc model: `src/models/sliderbed_v1/` (`formulas.ts`, `schema.ts`, `rules.ts`).
- Orchestrator: `src/lib/calculator/engine.ts` (`runCalculation`).
- Results UI: `app/components/CalculationResults.tsx`.
- Material can be **PARTS** (discrete units) or **BULK** (flowable material: chips, granules).
  `material_form` input; `MaterialForm.Bulk === 'BULK'`.
- BULK input is either `WEIGHT_FLOW` (`mass_flow_lbs_per_hr`) or `VOLUME_FLOW`
  (`volume_flow_ft3_per_hr` + `density_lbs_per_ft3`). `bulk_input_method` selects which.

## 3. The originating bug (already fixed; the fix's MODEL is what's wrong)
- Symptom: application SO33806.1 (inclined, cleated PVC belt carrying bulk chips) showed
  `Capacity: Infinity pph`. It affected every BULK application.
- Root cause: BULK forces `pitch_in = 0`, then `capacity_pph = belt_speed × 720 / pitch`
  divided by zero → `Infinity`. It rendered literally because the UI number formatter only
  null-checked. The DB looked clean (`capacity_pph: null`) only because
  `JSON.stringify(Infinity)` becomes `null` on save; the live client auto-recalc produced the
  real `Infinity`.
- Shipped fix (commit `c6b46c4` on `main`): guard `calculateCapacity` (returns `null`, never
  Infinity); set `capacity_pph = null` for BULK; added per-cleat outputs computed as
  `cleats_per_hour = belt_speed × 720 / cleat_pitch`, then `mass_per_cleat = mass_flow /
  cleats_per_hour`, `volume_per_cleat = volume_flow / cleats_per_hour`; made the UI bulk-aware
  and finite-safe; added tests.

### Why that model is wrong (domain owner feedback)
1. **No margin.** PARTS mode inflates the requirement by `throughput_margin_pct` before sizing;
   the bulk math applied no margin at all.
2. **Built backwards, around the cleats.** It computes a per-hour cleat rate and divides an
   hourly flow rate by it. Everything is expressed as per-hour rates, which is confusing. The
   base load should be computed first as a plain horizontal cleatless conveyor, and cleats
   should only enter as the final division. (The per-cleat number happens to be arithmetically
   the same as base-load ÷ cleat-count, but the framing and the missing margin are the real
   defects.)
3. **Non-cleated bulk gets nothing.** The fix only ever produced per-cleat outputs, so a plain
   horizontal bulk conveyor has no capacity/margin figure at all.

## 4. The correct model (agreed with domain owner)
Two stages. Cleats are not part of the base.

**Stage 1 — base loading, cleatless & horizontal, per linear foot.** This is how they normally
do it: take the flow per hour "down to how much is on a linear foot of belt."
```
volume_per_ft (ft³/ft) = volume_flow_ft3_per_hr / (belt_speed_fpm × 60)
mass_per_ft   (lb/ft)  = mass_flow_lbs_per_hr   / (belt_speed_fpm × 60)   ( = volume_per_ft × density )
```
`belt_speed_fpm × 60` = feet of belt that pass per hour. This equals the model's existing
`load_on_belt_lbf ÷ conveyor_length_ft`, so it surfaces a number the engine already computes.
These two numbers (`lb/ft` and `ft³/ft`) are the primary deliverable and must show for **every**
bulk conveyor, cleated or not.

**Stage 2 — per cleat, only when cleated.** A cleat pocket spans one cleat pitch of belt length:
```
mass_per_cleat   = mass_per_ft   × (cleat_pitch_in / 12)      ( = base ÷ cleat_count )
volume_per_cleat = volume_per_ft × (cleat_pitch_in / 12)
```
No "cleats per hour." Cleats enter only here.

**Margin** applies to Stage 1 (see Section 6 — this is the open question).

## 5. Worked numbers — SO33806.1 (use to validate any design)
Inputs: `belt_speed_fpm = 100`, `mass_flow_lbs_per_hr = 7000`, `volume_flow_ft3_per_hr = 700`,
`density_lbs_per_ft3 = 10`, `conveyor_length_cc_in = 312` (26 ft), cleated with
`cleat_pitch_in = 24` (2 ft), `cleat_count_actual = 13`, `cleat_height_in = 3`,
`cleat_width_in = 30`.
- mass_per_ft = 7000 / (100×60) = **1.167 lb/ft**
- volume_per_ft = 700 / (100×60) = **0.1167 ft³/ft** (≈ 201.6 in³/ft)
- Cross-check: model's `load_on_belt_lbf = 30.33` ÷ 26 ft = 1.167 lb/ft ✓
- per cleat: 1.167 × 2 = **2.33 lb**, 0.1167 × 2 = **0.233 ft³** (≈ 403 in³) ✓

## 6. OPEN QUESTION — what "margin" means and how to calculate it
The domain owner said we need to "figure out how to calculate the margin," and to produce the
"lbs/ft it will require" plus the volume per linear foot. They said *calculate* the margin, not
just *apply* one. Two candidate definitions — the design needs to choose (or define a third):

**(A) Design margin (pad you enter, PARTS-style).** Reuse `throughput_margin_pct`; inflate the
required loading: `design_lb_ft = required_lb_ft × (1 + margin/100)` (same for ft³/ft). Simple,
consistent with PARTS, no new geometry. Pads the requirement but does not verify the pocket fits.

**(B) Calculated headroom vs a capacity.** margin = `(capacity_per_unit / required_per_unit − 1)
× 100`, i.e. how much spare there is (and fill % = required/capacity). This needs a capacity
figure. Without surcharge/incline modeling (explicitly out of scope), the only honest source is
flat-box geometry, e.g. cleat pocket = `cleat_height_in × cleat_width_in × cleat_pitch_in`
→ pocket volume; compare to required volume per cleat. For non-cleated bulk, the capacity source
is undefined and must be decided (belt cross-section? assumed fill height? or "no margin unless
cleated"?).

**Design must answer:** Which definition (A, B, or a blend)? If B: what sets "capacity" for
cleated vs non-cleated? What is the input (a % field, a fill factor, an assumed usable height)?
Where does margin apply (Stage-1 loading, or as a separate reported headroom/fill %)? Should
over-fill (fill % > 100) raise a warning/error like other rules?

## 7. Current code to change (grounding for the design)
- `src/models/sliderbed_v1/formulas.ts`
  - `calculateBulkLoad` (~L558): computes `massFlowLbsPerHr`, `volumeFlowFt3PerHr`,
    `timeOnBeltMin`, `loadOnBeltLbf`. Good place to also emit per-ft loading.
  - `calculateBulkLoadOnBelt` (~L498), `calculateTimeOnBeltMin`: residence-time load.
  - BULK branch in `calculate()` (~L1909) and the per-cleat block added by the shipped fix
    (~L2027, `cleatsPerHour`/`volumePerCleatFt3`/`massPerCleatLb`) — this block is what gets
    replaced.
  - `calculateCapacity` (~L892): now returns `null` for pitch ≤ 0 (keep the guard).
  - PARTS margin reference: `throughput_margin_pct`, `calculateTargetThroughput` (~L905),
    `calculateMarginAchieved` (~L938), throughput block (~L2160).
  - Cleat geometry: `calculateCleatWeight` (~L1279) → `cleat_pitch_in`, `cleat_count_actual`,
    `cleat_width_in`; `calculateCleatWidth` (~L1126), `calculateCleatLayout` (~L1159).
- `src/models/sliderbed_v1/schema.ts`: `SliderbedOutputs` interface (~L2272). Shipped fix added
  `cleats_per_hour`, `volume_per_cleat_ft3`, `mass_per_cleat_lb` and made `capacity_pph`
  `number | null`. New model will likely add per-ft outputs and margin/fill outputs and may
  retire `cleats_per_hour`.
- `app/components/CalculationResults.tsx`: bulk branch of the "Throughput Analysis" section
  (~L416) and `ResultRow` (~L604, keep it `Number.isFinite`-safe).

## 8. Constraints
- **No incline / surcharge / angle-of-repose pile-up modeling.** Base is "as if horizontal,
  even fill." Flat-box pocket geometry is acceptable if option B is chosen.
- Reuse existing inputs where possible (`throughput_margin_pct`, cleat fields) rather than adding
  new ones, unless the design justifies a new field.
- Model functions are pure and Excel-parity is expected; keep them deterministic.
- Test baseline (per `CLAUDE.md`): 4 suites fail pre-existing
  (`mounting-style`, `outputs_v2`, `beltCompatibility`, `middleware`). Do not add to that.
- Known data gotcha: `cleat_centers_in` (catalog/min-pulley lookup) can disagree with
  `cleat_spacing_in` (physical layout). Use `cleat_pitch_in` (physical layout pitch) for any
  per-cleat/per-length math.

## 9. What we need back from the design
A concrete spec covering: (1) exact Stage-1 per-ft formulas and output names/units;
(2) the chosen margin definition with formula, input source, and where it applies;
(3) Stage-2 per-cleat formulas; (4) how non-cleated bulk behaves; (5) output fields to
add/remove in `SliderbedOutputs`; (6) what the Throughput panel shows for bulk (cleated vs not);
(7) edge cases (zero speed, missing density, over-fill) and any warnings/errors;
(8) test cases with expected numbers (include the SO33806.1 values above).

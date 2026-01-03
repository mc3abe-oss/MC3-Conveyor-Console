# Contract Outputs: sliderbed_v1

> **Purpose:** Define the outputs that must not change unintentionally during refactoring or UI evolution.
> These outputs drive sizing, safety, and selection decisions. They will become the basis for golden fixtures (Excel parity testing).

**Model:** `sliderbed_v1`
**Version:** v1.41
**Created:** 2026-01-02

---

## Contract Outputs (19 keys)

These outputs are contract-critical and must remain stable. Changes require explicit review.

| Output Key | Units | Description | Why Contract-Critical | Rounding/Tolerance | Notes |
|------------|-------|-------------|----------------------|-------------------|-------|
| **Motor/Drive Sizing** |
| `torque_drive_shaft_inlbf` | in-lbf | Torque on drive shaft | Gearmotor selection; undersizing causes stall | ±0.1 in-lbf | Primary sizing output |
| `drive_shaft_rpm` | RPM | Required drive shaft RPM | Gearmotor speed selection | Integer preferred | Derived from belt speed and pulley diameter |
| `gearmotor_output_rpm` | RPM | Gearmotor output shaft RPM | Motor catalog matching | Integer preferred | = drive_shaft_rpm × chain_ratio |
| `gear_ratio` | ratio | Motor RPM / drive shaft RPM | Gearbox selection | 2 decimal places | |
| `chain_ratio` | ratio | Chain/sprocket ratio | Bottom-mount configurations | 2 decimal places | 1.0 for shaft-mounted |
| **Belt Pull / Effective Tension** |
| `total_belt_pull_lb` | lbf | Total belt pull (Te) | Belt specification; motor sizing | ±0.1 lbf | = friction + incline + starting |
| `friction_pull_lb` | lbf | Friction component of pull | Breakdown visibility | ±0.1 lbf | = COF × total_load |
| `incline_pull_lb` | lbf | Incline component of pull | Incline conveyor sizing | ±0.1 lbf | = total_load × sin(θ) |
| `drive_T1_lbf` | lbf | Tight side belt tension | Belt rating check; splice design | ±1 lbf | Higher tension side |
| `drive_T2_lbf` | lbf | Slack side belt tension | Take-up sizing | ±1 lbf | Lower tension side |
| **Shaft Sizing** |
| `drive_shaft_diameter_in` | inches | Required drive shaft diameter | Shaft procurement | Round to standard sizes | Based on torque and material |
| `tail_shaft_diameter_in` | inches | Required tail shaft diameter | Shaft procurement | Round to standard sizes | Typically matches or smaller than drive |
| `drive_pulley_resultant_load_lbf` | lbf | Resultant load on drive pulley | Bearing/shaft stress | ±1 lbf | Vector sum of T1 + T2 |
| **Minimum Pulley Diameter** |
| `required_min_pulley_diameter_in` | inches | Aggregate min pulley diameter | Pulley selection; belt life | Round to 0.5" | max(belt, vguide, cleats) |
| `drive_pulley_meets_minimum` | boolean | Drive pulley ≥ minimum | Go/no-go gate | Exact | Blocks commit if false |
| `tail_pulley_meets_minimum` | boolean | Tail pulley ≥ minimum | Go/no-go gate | Exact | Blocks commit if false |
| **Safety / Tube Stress** |
| `pci_tube_stress_status` | enum | PCI tube stress check result | Pulley structural safety | Exact | pass/warn/fail/incomplete |
| **Core Operating Parameters** |
| `belt_speed_fpm` | FPM | Belt speed | Fundamental parameter; throughput | ±0.1 FPM | Input or derived from RPM |
| `total_belt_length_in` | inches | Total belt length | Belt ordering | ±1 inch | 2 × L_cc + π × D_avg |

---

## Non-Contract Outputs (Allowed to Evolve)

These outputs are informational, UI-focused, or in active development. They may change without breaking contracts.

### UI Breakdown / Display Helpers
- `frame_height_breakdown` - Detailed breakdown object for UI display
- `cleats_summary` - Human-readable cleat specification string
- `cleats_rule_source` - Description of cleat rule applied
- `tracking_recommendation_rationale` - Explanation text
- `assumptions` - Array of human-readable assumption strings

### Intermediate Calculations
- `parts_on_belt` - Intermediate for load calculation
- `load_on_belt_lbf` - Intermediate
- `belt_weight_lbf` - Intermediate
- `total_load_lbf` - Intermediate (sum of above)
- `pitch_in` - Intermediate for throughput

### Echo/Pass-through Values
- `piw_used`, `pil_used` - Echo of effective belt weight values
- `safety_factor_used` - Echo of parameter
- `friction_coeff_used` - Echo of parameter
- `motor_rpm_used` - Echo of parameter
- `speed_mode_used` - Echo of input
- `material_form_used` - Echo of input
- `frame_construction_type` - Echo of input
- `return_frame_style`, `return_snub_mode` - Echo of inputs

### Cost Flags
- `cost_flag_low_profile` - Quoting flag
- `cost_flag_custom_frame` - Quoting flag
- `cost_flag_snub_rollers` - Quoting flag
- `cost_flag_design_review` - Quoting flag

### Roller Quantities (Quoting)
- `gravity_roller_quantity`, `gravity_roller_spacing_in`
- `snub_roller_quantity`
- `return_gravity_roller_count`, `return_gravity_roller_centers_in`

### Tracking Recommendation (Advisory)
- `tracking_lw_ratio`, `tracking_lw_band`
- `tracking_disturbance_count`, `tracking_disturbance_severity_raw`
- `tracking_mode_recommended`, `tracking_recommendation_note`

### Pulley Family/Variant Details
- `drive_pulley_shell_od_in`, `tail_pulley_shell_od_in`
- `drive_pulley_finished_od_in`, `tail_pulley_finished_od_in`
- `belt_family_used`

### V-Guide / Cleat Catalog Details
- `vguide_min_pulley_dia_in`, `vguide_pu_data_missing`
- `cleats_base_min_pulley_diameter_12in_in`, `cleats_centers_factor`
- `cleats_min_pulley_diameter_in`, `cleats_drill_siped_caution`
- `min_pulley_base_in`, `cleat_spacing_multiplier`

### Risk Flags (Evolving)
- `risk_flags` - Structured warnings array (format may evolve)

---

## Known Exceptions / In-Flux Outputs

### Pulley Catalog Phase 2 (Skipped Tests)
The following outputs depend on the pulley catalog system which is being redesigned:
- `drive_pulley_diameter_in` - Currently uses legacy fallback; Phase 2 will use `application_pulleys.finished_od_in`
- `tail_pulley_diameter_in` - Same as above
- Pulley-derived shaft calculations may shift slightly when Phase 2 completes

**When to resolve:** When Pulley Catalog Phase 2 is complete and skipped tests are unskipped.

### Outputs v2 Work
These outputs are being added or restructured:
- Tube stress outputs (`pci_*`) - Recently added, interface stable but edge cases being refined
- Return support outputs (`return_*`) - v1.29 addition, still maturing
- Bulk material outputs (`mass_flow_lbs_per_hr`, `volume_flow_ft3_per_hr`) - v1.29, BULK mode still being validated

---

## Validation Approach

### Current State
- Unit tests verify formula correctness against hand calculations
- Behavior tests (`hypothetical-behavior.test.ts`) verify expected outcomes for common scenarios

### Future State (Golden Fixtures)
Contract outputs will be validated against Excel reference calculations:
1. Define 10-20 reference scenarios covering typical use cases
2. Calculate expected outputs in Excel using documented formulas
3. Create golden fixture files with input → expected output mappings
4. Test runner compares model outputs against golden fixtures
5. Tolerance-aware comparison per output (see Rounding/Tolerance column)

---

## Change Log

| Date | Version | Change |
|------|---------|--------|
| 2026-01-02 | v1.41 | Initial contract definition (19 keys) |

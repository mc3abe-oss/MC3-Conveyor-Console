# Hypothetical Reference Applications

> **WARNING: These are NOT golden fixtures**

## Status

| Attribute | Value |
|-----------|-------|
| **Status** | HYPOTHETICAL |
| **Source** | Assumed / Illustrative |
| **Excel Verified** | NO |
| **Authoritative** | NO |

## Purpose

These scenarios exist ONLY to:
1. Document expected RELATIONSHIPS between inputs and outputs
2. Illustrate logic paths and validation triggers
3. Provide starting points for future Excel verification
4. Support developer understanding of system behavior

## What These Are NOT

- NOT golden fixtures
- NOT authoritative calculations
- NOT suitable for regression testing numeric values
- NOT a replacement for Excel-verified test cases

## Usage Rules

1. **DO NOT** use exact numbers from these scenarios as expected test values
2. **DO NOT** claim these represent correct engineering calculations
3. **DO** use these to understand which warnings/errors should trigger
4. **DO** use these as templates for creating Excel-verified fixtures

## Verification Required

Before any scenario becomes a golden fixture:
1. Enter inputs into Excel calculator
2. Record ALL outputs from Excel
3. Document tolerances per field
4. Move to `/fixtures/golden/` with `source: excel`

## Scenarios

| ID | Name | Intent |
|----|------|--------|
| 01 | basic-flat | Baseline flat conveyor |
| 02 | moderate-incline | 15° incline path |
| 03 | steep-incline | 35° warning threshold |
| 04 | vguided-tracking | V-guide logic path |
| 05 | cleated-belt | Cleat min pulley rules |
| 06 | floor-supported | Floor support + legs |
| 07 | high-speed | High FPM scenario |
| 08 | heavy-load | High part weight |
| 09 | hot-parts | Temperature warning |
| 10 | long-conveyor | Length warning threshold |

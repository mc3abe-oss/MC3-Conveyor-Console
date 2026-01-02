# Architecture Map - Belt Conveyor Calculator

> Opus Greenfield Review - January 2026

## Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│  app/components/                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ BeltConveyorCalculatorApp.tsx (1369 LOC)                             │   │
│  │   └── CalculatorForm.tsx (orchestrates tabs)                         │   │
│  │         ├── TabApplicationDemand.tsx                                 │   │
│  │         ├── TabConveyorPhysical.tsx (2004 LOC) ← HOTSPOT            │   │
│  │         ├── TabDriveControls.tsx (601 LOC)                          │   │
│  │         └── TabBuildOptions.tsx (585 LOC)                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ inputs: SliderbedInputs
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CALCULATION ENGINE                                 │
│  src/lib/calculator/engine.ts                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ runCalculation(request: CalculationRequest): CalculationResult      │   │
│  │   1. normalizeInputs() - legacy field compat                        │   │
│  │   2. validate(inputs, parameters) - pre-calc checks                 │   │
│  │   3. calculate(inputs, parameters) - formulas                       │   │
│  │   4. return { success, outputs, warnings, errors, metadata }        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODEL: sliderbed_v1                                  │
│  src/models/sliderbed_v1/                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ schema.ts (2891 LOC) ← SOURCE OF TRUTH for types                    │   │
│  │   - SliderbedInputs interface (~200 fields)                         │   │
│  │   - SliderbedOutputs interface (~80 fields)                         │   │
│  │   - SliderbedParameters interface (tuning constants)                │   │
│  │   - Enums with LABELS objects                                       │   │
│  │   - buildDefaultInputs() - canonical defaults                       │   │
│  │                                                                      │   │
│  │ formulas.ts (2064 LOC) - Pure calculation functions                 │   │
│  │   - calculate(inputs, parameters) → SliderbedOutputs                │   │
│  │   - No validation, no side effects                                  │   │
│  │                                                                      │   │
│  │ rules.ts (2040 LOC) - Validation & business rules                   │   │
│  │   - validateInputs() - pre-calc input validation                    │   │
│  │   - validateParameters() - parameter bounds                         │   │
│  │   - applyApplicationRules() - domain constraints                    │   │
│  │   - applyPciOutputRules() - post-calc checks                        │   │
│  │                                                                      │   │
│  │ geometry.ts (14KB) - Geometry calculations                          │   │
│  │ tracking-guidance.ts - Belt tracking recommendations                │   │
│  │ shaftCalc.ts - Von Mises shaft sizing                               │   │
│  │ pciHubConnections.ts - Hub/bushing selection                        │   │
│  │ migrate.ts - Version migration helpers                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CATALOG LAYER                                      │
│  src/lib/                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ belt-catalog.ts - Belt lookup, PIW/PIL tables                       │   │
│  │ cleat-catalog.ts - Cleat profiles, min pulley tables                │   │
│  │ tracking/ - Tracking recommendation engine                          │   │
│  │ pulley-library/ - Pulley catalog access                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERSISTENCE LAYER                                    │
│  app/api/                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ /configurations/save - Save configuration to database                │   │
│  │ /configurations/load - Load configuration by ID                      │   │
│  │ /configurations/revisions - Version history                          │   │
│  │ /catalog - Dynamic catalog lookups                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Supabase (PostgreSQL)                                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ configurations - Saved configurations                                │   │
│  │ configuration_revisions - Version history                           │   │
│  │ belts - Belt catalog                                                │   │
│  │ cleats - Cleat catalog                                              │   │
│  │ pulley_library - Pulley specifications                              │   │
│  │ catalog_items - Generic catalog entries                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Sources of Truth

| Concern | Source of Truth | Location |
|---------|-----------------|----------|
| Input field definitions | `SliderbedInputs` interface | `schema.ts:743` |
| Output field definitions | `SliderbedOutputs` interface | `schema.ts:1828` |
| Default values | `buildDefaultInputs()` | `schema.ts` |
| Enum labels | `*_LABELS` objects | `schema.ts` (various) |
| Validation rules | `validateInputs()`, `applyApplicationRules()` | `rules.ts` |
| Calculation formulas | `calculate()` | `formulas.ts` |
| Model version | `MODEL_VERSION_ID` | `lib/model-identity.ts` |

## Logic Leakage / Duplication Issues

### 1. UI Performing Validation
- **TabConveyorPhysical.tsx** contains significant validation-like logic:
  - Lines 206-230: Checking belt tracking method, cleats enabled
  - Lines 369-387: Frame height mode checks, cleat compatibility
  - Lines 440-467: TOB field requirements
  - This logic duplicates or shadows rules in `rules.ts`

### 2. Derived State in UI
- **TabConveyorPhysical.tsx** computes derived values that could come from model:
  - Lines 380-415: Frame height and roller value derivation
  - Lines 416-467: Geometry normalization and mode switching
  - `normalizeGeometry()` called in UI instead of model

### 3. Catalog Lookups in UI
- Pulley catalog lookups happen in UI components
- Belt PIW/PIL lookups partially in UI

### 4. Enum String Comparisons
- Multiple places compare enums as strings AND enum values:
  ```typescript
  inputs.shaft_diameter_mode === ShaftDiameterMode.Manual ||
  inputs.shaft_diameter_mode === 'Manual'
  ```
- This is defensive but indicates serialization inconsistency

## Recommended Separation

```
LAYER 1: UI (presentation only)
  - Display inputs/outputs
  - Form field binding
  - Visual state (accordions, modals)
  - NO calculation logic
  - NO validation logic

LAYER 2: View Model (optional future)
  - Derived display values
  - Field visibility rules
  - Label formatting

LAYER 3: Engine (orchestration)
  - Input normalization
  - Calculation invocation
  - Result packaging

LAYER 4: Model (pure functions)
  - Validation (rules.ts)
  - Calculation (formulas.ts)
  - Domain types (schema.ts)

LAYER 5: Catalog (data access)
  - Belt lookups
  - Pulley lookups
  - Cleat lookups

LAYER 6: Persistence
  - Save/load configurations
  - Version history
```

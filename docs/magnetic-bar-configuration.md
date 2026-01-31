# Magnetic Bar Configuration System

> **Version:** 1.0
> **Last Updated:** January 2026

## Overview

The Magnetic Bar Configuration System allows precise configuration of magnet bars for MC3 magnetic conveyors. It provides:

- **Bar Builder**: Configure individual magnet bars with ceramic and neodymium magnets
- **Pattern System**: Define how bar configurations repeat along the conveyor
- **Throughput Integration**: Calculate chip load and achieved throughput based on bar capacity

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Magnet Catalog │────▶│   Bar Template  │────▶│   Bar Pattern   │
│  (Ceramic/Neo)  │     │  (Slot Config)  │     │  (Repetition)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   Throughput    │
                                               │  Calculations   │
                                               └─────────────────┘
```

## Bar Builder

### How It Works

1. **Magnet Types Available**:
   - **Ceramic 3.5"** (1" × 1.38" × 3.5"): Standard ceramic magnet, ~0.1207 lb/bar capacity
   - **Neo 2"** (1" × 2" × 1.375"): High-power neodymium, ~0.298 lb/bar capacity

2. **OAL (Overall Length) Formula**:
   The bar builder calculates how many magnets fit in a given bar width:
   ```
   Available Length = Bar Width - 2 × End Clearance (0.125")
   Magnets That Fit = floor((Available Length + Gap) / (Magnet Length + Gap))
   ```

3. **Capacity Calculation**:
   ```typescript
   capacity = (ceramicCount × 0.1207) + (neoCount × 0.298)
   ```

   For high Neo counts (>2), saturation correction is applied:
   ```typescript
   if (neoCount > 2 && barWidth < 18) {
     correctionFactor = 0.85 - 0.05 × (neoCount - 2)
     capacity = capacity × correctionFactor
   }
   ```

### Capacity Reference Table

| Bar Width | Ceramic Only | 1 Neo    | 2 Neo    |
|-----------|--------------|----------|----------|
| 12"       | 0.362        | 0.52     | 0.717    |
| 15"       | 0.483        | 0.66     | 0.84     |
| 18"       | 0.483        | 0.78     | 1.08     |
| 24"       | 0.723        | 0.92     | 1.12     |
| 30"       | 0.965        | 1.16     | 1.36     |

## Pattern Modes

### All Same
Every bar uses the same template configuration.

```
[A][A][A][A][A][A][A][A]...
```

**Use case**: Standard configurations where uniform capacity is desired.

### Alternating
Two templates alternate along the conveyor.

```
[A][B][A][B][A][B][A][B]...
```

**Use case**: Mix of high-capacity Neo bars with ceramic bars for cost optimization.

### Interval
Secondary template appears every N bars.

```
[A][A][A][B][A][A][A][B]...  (interval = 4)
```

**Use case**: Sweeper bars placed every 4th position to clear accumulated material.

## Throughput Calculations

### Formulas

**Chip Load** (material on bed at any time):
```
chipLoad = barCapacity × qtyMagnets / 2
```

**Achieved Throughput** (lbs/hr the conveyor can handle):
```
achievedThroughput = barCapacity × qtyMagnets × beltSpeed × 60 / magnetCenters
```

**Throughput Margin**:
```
margin = achievedThroughput / requiredThroughput
```

### Margin Guidelines

| Margin    | Status          | Recommendation |
|-----------|-----------------|----------------|
| ≥ 1.5     | Healthy         | Good configuration |
| 1.25-1.5  | Adequate        | Consider Neo upgrade for chips |
| < 1.25    | Undersized      | Add Neo magnets or increase speed |

## UI Components

### Bar Builder Panel

Located in the Magnetic Geometry section under "Magnet Bar Configuration":

1. **Quick Fill Options**: Pre-configured templates (Ceramic Only, +1 Neo, +2 Neo, Max Neo)
2. **Manual Configuration**: Drag-and-drop magnet placement
3. **Capacity Display**: Real-time capacity calculation with reference comparison

### Pattern Selector

Configure how bars repeat along the conveyor:

1. Select pattern mode (All Same, Alternating, Interval)
2. Choose primary template
3. For Alternating/Interval: Select secondary template
4. For Interval: Set interval count (2-20)

## API Usage

### Basic Calculation with Bar Config

```typescript
import { calculate } from './formulas';

const inputs = {
  style: ConveyorStyle.B,
  conveyor_class: ConveyorClass.Standard,
  magnet_width_in: 12,
  magnet_centers_in: 12,
  belt_speed_fpm: 30,
  load_lbs_per_hr: 500,
  // ... other inputs
  bar_configuration: {
    bar_capacity_lb: 0.717,
    ceramic_count: 1,
    neo_count: 2,
  },
};

const outputs = calculate(inputs);
// outputs.achieved_throughput_lbs_hr
// outputs.throughput_margin
// outputs.bar_capacity_lb
```

### Calculate Bar Capacity Programmatically

```typescript
import { calculateBarCapacityFromCounts } from './magnet-bar/bar-builder';

const capacity = calculateBarCapacityFromCounts(
  ceramicCount, // 3
  neoCount,     // 0
  barWidth      // 12
);
// Returns: 0.362
```

### Apply Pattern and Calculate Total Capacity

```typescript
import { applyPattern, calculateConveyorCapacityFromValues } from './magnet-bar/patterns';

const pattern = {
  mode: BarPatternMode.Alternating,
  primary_template_id: 'neo-2',
  secondary_template_id: 'ceramic-only',
};

const result = calculateConveyorCapacityFromValues(
  pattern,
  totalBars,        // 22
  primaryCapacity,  // 0.717
  secondaryCapacity // 0.362
);
// result.total_capacity_lb
// result.capacity_per_bar_avg
```

## Backwards Compatibility

The system is fully backwards compatible with configurations that don't have bar configuration:

1. If `bar_configuration` is not provided, the system falls back to estimated ceramic-only capacity
2. Fallback uses: `ceramicCount = floor((width + 0.25) / 3.75)`
3. All existing quotes and saved configurations continue to work

## Troubleshooting

### Low Throughput Margin

**Symptoms**: Warning about undersized capacity, margin < 1.5

**Solutions**:
1. Add Neo magnets to increase per-bar capacity
2. Increase belt speed (if < 120 FPM)
3. Decrease magnet centers (12" vs 18")
4. Upgrade to Heavy Duty class for longer conveyors

### Capacity Doesn't Match Expected

**Check**:
1. Bar width is correct (affects how many magnets fit)
2. Neo count isn't exceeding saturation threshold (>2 on 12" bars)
3. Pattern mode is applied correctly

### Pattern Preview Shows Wrong Sequence

**Check**:
1. Primary and secondary templates are both selected
2. Interval count is set correctly for Interval mode
3. Total bar count (from geometry) is sufficient to show pattern

## File Structure

```
src/models/magnetic_conveyor_v1/
├── magnet-bar/
│   ├── schema.ts          # Types and enums
│   ├── bar-builder.ts     # Core bar building logic
│   ├── patterns.ts        # Pattern application logic
│   ├── seed-data.ts       # Default magnet catalog
│   └── index.ts           # Public exports
├── formulas.ts            # Main calculate() with throughput
└── schema.ts              # MagneticInputs/Outputs

app/components/magnetic/
├── BarBuilderPanel.tsx    # Bar configuration UI
├── MagnetSelector.tsx     # Magnet type picker
├── PatternSelector.tsx    # Pattern mode UI
└── VisualBarSlots.tsx     # Visual slot representation
```

## Testing

Run the test suite:
```bash
npm test -- --testPathPattern="magnet-bar"
```

Run E2E validation against reference jobs:
```bash
npx ts-node scripts/validate-magnetic-calcs.ts
```

## References

- Master Reference: `docs/reference/mc3-magnetic-conveyor-master-reference.md`
- Real job data: Jobs 32791, 32425, 32285, 33017, 32259

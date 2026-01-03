# TOB/Legs/Support Policy (v1.42)

## Current State

### Unified Support Method
The per-end support type system (`tail_support_type`, `drive_support_type`) was removed in v1.42.
Replaced by a single `support_method` field using the `SupportMethod` enum:

```typescript
enum SupportMethod {
  External = 'external',        // Suspended, wall-mounted (no floor contact)
  FloorSupported = 'floor_supported',  // Floor supported (requires TOB)
}
```

### Helper Function
```typescript
isFloorSupported(supportMethod?: SupportMethod | string): boolean
```
Returns `true` for `FloorSupported`, `Legs`, or `Casters` (legacy values).

### TOB Fields
TOB (Top of Belt) fields still exist in the schema:
- `tail_tob_in` - Tail end height
- `drive_tob_in` - Drive end height
- `adjustment_required_in` - Leg adjustment range

### TOB Visibility Rule
TOB fields are **optional/hidden** unless:
1. `support_method === 'floor_supported'` (or legacy `legs`/`casters`)
2. OR `geometry_mode === 'H_TOB'` (horizontal + both TOB heights mode)

### Validation
`validateTob(inputs, mode)` enforces:
- **Draft mode**: Lenient - allows missing TOB
- **Commit mode**: Requires TOB based on `reference_end` or geometry mode

## Removed (v1.42)

| Field/Function | Status |
|---------------|--------|
| `tail_support_type` | Stripped by migration |
| `drive_support_type` | Stripped by migration |
| `support_option` | Stripped by migration |
| `height_input_mode` | Stripped by migration |
| `derivedLegsRequired()` | No longer exported |

## Migration Behavior
`migrateInputs()` now strips these legacy fields:
```typescript
delete support_option;
delete tail_support_type;
delete drive_support_type;
delete height_input_mode;
```

## Test Implications
Tests referencing removed fields/functions should be **deleted**, not skipped.
Tests for `calculateImpliedAngleDeg`, `calculateOppositeTob`, `hasAngleMismatch`,
and `clearTobFields` can remain as these functions still exist (though deprecated).

# NORD Catalog Admin

Admin interface for viewing and analyzing NORD FLEXBLOC gearmotor catalog data.

**Location:** `/console/admin/nord`

## Tabs

### Catalog Tab

Read-only view of NORD vendor components from the `vendor_components` table.

- **Search**: Filter by part number or name
- **Filters**: Filter by component type (GEAR_UNIT, MOTOR, etc.) and series
- **Detail View**: Click a part to see full metadata

**Data Source**: Parts are seeded from CSV catalogs via `scripts/seed-nord-flexbloc-v2.mjs`. This is the single source of truth.

### Coverage Tab

Coverage analysis shows which application combinations resolve to real NORD part numbers.

#### What Coverage Means

Coverage = a matrix of application-relevant inputs run through the BOM resolver:

- **Series**: FLEXBLOC (v1)
- **Gear Unit Size**: SI31, SI40, SI50, SI63, SI75
- **Mounting Style**: shaft_mounted, bottom_mount
- **Output Shaft Option**: inch_keyed, metric_keyed, inch_hollow, metric_hollow
- **Plug-in Shaft Style**: single, double, flange_b5 (for keyed options)

Each combination is classified as:

| Status | Meaning | Badge Color |
|--------|---------|-------------|
| Resolved | All required components have real NORD PNs | Green |
| Ambiguous | Multiple PNs match (not currently used) | Yellow |
| Unresolved | One or more components missing ("PN pending") | Red |
| Invalid | Combination should not exist or resolver error | Gray |

#### How to Refresh Coverage

1. Navigate to `/console/admin/nord` → Coverage tab
2. Click "Recalculate Coverage" button
3. Wait for regeneration (typically a few seconds)
4. Summary counts and case list will update

**Note:** Coverage regeneration:
- Clears existing coverage data
- Enumerates all valid input combinations
- Runs each through the BOM resolver
- Stores results in `nord_coverage_cases` table

#### Using the Coverage View

- **Summary Cards**: Click a status to filter the cases list
- **Cases List**: Shows all test cases with their status
- **Case Detail**: Click a case to see:
  - Input parameters
  - Resolution message
  - Component-level breakdown (found/not found with PNs)

### Mappings Tab (Coming Soon)

Will allow managing versioned mapping rules for PN resolution.

## Database Tables

### nord_coverage_cases

Stores coverage analysis results. This is derived data that can be safely regenerated.

```sql
CREATE TABLE nord_coverage_cases (
  id UUID PRIMARY KEY,
  case_key TEXT NOT NULL UNIQUE,     -- Hash of inputs for deduplication
  inputs_json JSONB NOT NULL,        -- Input parameters
  status nord_coverage_status,       -- resolved/ambiguous/unresolved/invalid
  resolved_pns JSONB,                -- Array of resolved part numbers
  message TEXT,                      -- Diagnostic message
  components_json JSONB,             -- Component-level breakdown
  last_checked_at TIMESTAMPTZ
);
```

## What Coverage Does NOT Do

- Does not modify resolver logic
- Does not fix missing mappings
- Does not edit catalog data
- Does not change runtime behavior

Coverage is visibility only. It answers: "What resolves and what doesn't?"

To fix unresolved cases, update the source CSV catalogs and re-run the seed script.

## API Endpoints

### GET /api/admin/nord/coverage

Returns coverage summary and cases.

Query params:
- `status` (optional): Filter by status (resolved, ambiguous, unresolved, invalid)

### POST /api/admin/nord/coverage/refresh

Regenerates coverage analysis. Requires belt admin access.

Returns:
```json
{
  "success": true,
  "summary": {
    "total": 85,
    "resolved": 60,
    "ambiguous": 0,
    "unresolved": 25,
    "invalid": 0,
    "generated_at": "2026-01-10T..."
  }
}
```

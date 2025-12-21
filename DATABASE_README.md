# Database Integration (Supabase)

**Phase 2 Complete:** Versioning, Audit Trail, and Fixture Management

---

## Overview

Complete Supabase integration providing:
- **Model Versioning**: Draft → Published → Archived lifecycle
- **Calculation Audit Trail**: Every calculation persisted with full context
- **Test Fixture Management**: Excel parity validation before publishing
- **Rollback Capability**: Restore any published version instantly

---

## Database Schema

### Tables

#### `model_versions`
Stores versioned calculation models with immutability after publishing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `model_key` | TEXT | Model identifier (e.g., "sliderbed_conveyor_v1") |
| `version_number` | INTEGER | Sequential version number |
| `status` | TEXT | 'draft', 'published', or 'archived' |
| `formulas_hash` | TEXT | Hash of formulas code for change detection |
| `parameters` | JSONB | Snapshot of all parameters and defaults |
| `created_by` | UUID | User who created the version |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `published_at` | TIMESTAMPTZ | When published (NULL for drafts) |
| `published_by` | UUID | User who published |
| `archived_at` | TIMESTAMPTZ | When archived |
| `archived_by` | UUID | User who archived |

**Constraints:**
- Unique: `(model_key, version_number)`
- Only one published version per model_key at a time
- Status must match timestamp states

---

#### `calculation_runs`
Immutable audit trail of all calculations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `model_version_id` | UUID | FK to model_versions |
| `inputs` | JSONB | Complete input snapshot |
| `outputs` | JSONB | Complete output snapshot |
| `warnings` | JSONB | Validation warnings |
| `errors` | JSONB | Validation errors |
| `calculated_at` | TIMESTAMPTZ | Execution timestamp |
| `execution_time_ms` | INTEGER | Execution time in milliseconds |
| `user_id` | UUID | User who ran calculation |
| `session_id` | UUID | Session identifier |
| `tags` | TEXT[] | Categorization tags |
| `notes` | TEXT | Optional notes |

---

#### `test_fixtures`
Excel test cases for model validation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `model_key` | TEXT | Model identifier |
| `name` | TEXT | Fixture name |
| `description` | TEXT | Optional description |
| `source` | TEXT | Source (e.g., "Excel Case 1") |
| `inputs` | JSONB | Test input values |
| `expected_outputs` | JSONB | Expected output values |
| `tolerances` | JSONB | Field-specific tolerances |
| `active` | BOOLEAN | Whether fixture is active |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `created_by` | UUID | Creator |
| `updated_at` | TIMESTAMPTZ | Last update |
| `updated_by` | UUID | Last updater |

**Constraints:**
- Unique: `(model_key, name)`

---

#### `fixture_validation_runs`
History of fixture validation attempts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `model_version_id` | UUID | FK to model_versions |
| `test_fixture_id` | UUID | FK to test_fixtures |
| `passed` | BOOLEAN | Whether validation passed |
| `failures` | JSONB | Array of field-level failures |
| `actual_outputs` | JSONB | Actual calculated outputs |
| `validated_at` | TIMESTAMPTZ | Validation timestamp |
| `execution_time_ms` | INTEGER | Execution time |

---

#### `parameter_override_presets`
Saved parameter configurations for power users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `model_key` | TEXT | Model identifier |
| `name` | TEXT | Preset name |
| `description` | TEXT | Optional description |
| `parameters` | JSONB | Parameter overrides |
| `is_public` | BOOLEAN | Whether preset is shared |
| `owner_id` | UUID | Owner user ID |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update |

---

## Setup

### 1. Environment Variables

Create a `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
# OR for admin operations:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Run Schema Migration

```bash
# Using Supabase CLI
supabase db reset

# Or manually in Supabase SQL Editor
# Copy and paste contents of supabase/schema.sql
```

### 3. Verify Connection

```typescript
import { getSupabaseClient } from './src/lib/database';

const supabase = getSupabaseClient();
console.log('Connected to Supabase');
```

---

## Usage Examples

### Model Version Management

#### Create a Draft Version

```typescript
import { createDraftVersion } from './src/lib/database';
import { DEFAULT_PARAMETERS } from './src/models/sliderbed_v1/schema';

const newVersion = await createDraftVersion(
  'sliderbed_conveyor_v1',
  'hash_of_formulas_code',
  DEFAULT_PARAMETERS,
  'user-uuid-123'
);

console.log(`Created draft version ${newVersion.version_number}`);
```

#### Publish a Version (Requires Fixtures to Pass)

```typescript
import { publishVersion, runAllFixtureValidations } from './src/lib/database';
import { DEFAULT_PARAMETERS } from './src/models/sliderbed_v1/schema';

// First, run all fixtures
const validation = await runAllFixtureValidations(
  newVersion.id,
  'sliderbed_conveyor_v1',
  DEFAULT_PARAMETERS
);

if (!validation.all_passed) {
  console.error('Fixtures failed:', validation.results);
  return;
}

// Publish the version
const result = await publishVersion(newVersion.id, 'user-uuid-123');

if (result.success) {
  console.log('Version published successfully');
} else {
  console.error('Publishing failed:', result.errors);
}
```

#### Rollback to Previous Version

```typescript
import { rollbackToVersion, getModelVersions } from './src/lib/database';

// Get archived versions
const archived = await getModelVersions({
  model_key: 'sliderbed_conveyor_v1',
  status: 'archived',
});

// Rollback to version 5
const result = await rollbackToVersion(archived[0].id, 'user-uuid-123');

if (result.success) {
  console.log('Rolled back to version', result.version?.version_number);
}
```

---

### Calculation Audit Trail

#### Save a Calculation

```typescript
import { saveCalculationRun } from './src/lib/database';
import { calculateSliderbed } from './src';

const inputs = {
  conveyor_length_cc_in: 120,
  conveyor_width_in: 24,
  // ... other inputs
};

const result = calculateSliderbed(inputs);

const run = await saveCalculationRun(
  'model-version-uuid',
  inputs,
  result,
  150, // execution time in ms
  'user-uuid-123',
  'session-uuid-456',
  ['production', 'customer-x'],
  'Initial design calculation'
);

console.log(`Saved calculation run ${run.id}`);
```

#### Query Calculation History

```typescript
import { getCalculationRuns, getCalculationStats } from './src/lib/database';

// Get recent runs
const { runs, total } = await getCalculationRuns(
  {
    user_id: 'user-uuid-123',
    date_from: '2024-01-01',
    tags: ['production'],
  },
  50, // limit
  0   // offset
);

console.log(`Found ${total} calculation runs`);

// Get stats
const stats = await getCalculationStats('model-version-uuid');
console.log(`Success rate: ${(stats.successful_runs / stats.total_runs * 100).toFixed(1)}%`);
```

---

### Test Fixture Management

#### Create a Fixture

```typescript
import { createTestFixture } from './src/lib/database';

const fixture = await createTestFixture(
  {
    model_key: 'sliderbed_conveyor_v1',
    name: 'Excel Case 1 - Standard Configuration',
    description: 'Basic configuration from Excel row 10',
    source: 'Excel v1.0',
    inputs: {
      conveyor_length_cc_in: 120,
      conveyor_width_in: 24,
      // ... all inputs
    },
    expected_outputs: {
      drive_shaft_rpm: 152.789,
      torque_drive_shaft_inlbf: 1964.47,
      gear_ratio: 11.45,
      // ... all expected outputs
    },
    tolerances: {
      drive_shaft_rpm: 0.001, // ±0.1% for RPM
      // Use default 0.5% for others
    },
    active: true,
  },
  'user-uuid-123'
);
```

#### Validate a Version Against All Fixtures

```typescript
import { runAllFixtureValidations } from './src/lib/database';
import { DEFAULT_PARAMETERS } from './src/models/sliderbed_v1/schema';

const results = await runAllFixtureValidations(
  'model-version-uuid',
  'sliderbed_conveyor_v1',
  DEFAULT_PARAMETERS
);

console.log(`Passed: ${results.passed_count}/${results.total_fixtures}`);

if (!results.all_passed) {
  results.results.forEach(r => {
    if (!r.passed) {
      console.log(`❌ ${r.fixture_name}`);
      r.failures?.forEach(f => {
        console.log(`  ${f.field}: expected ${f.expected}, got ${f.actual} (${f.percent_diff.toFixed(2)}% diff)`);
      });
    }
  });
}
```

---

## API Reference

### Model Versions

| Function | Description |
|----------|-------------|
| `getModelVersions(filters?)` | Get all versions with optional filtering |
| `getModelVersion(id)` | Get specific version by ID |
| `getPublishedVersion(modelKey)` | Get currently published version |
| `getNextVersionNumber(modelKey)` | Get next available version number |
| `createDraftVersion(...)` | Create new draft version |
| `updateDraftVersion(id, updates)` | Update draft (only drafts can be updated) |
| `publishVersion(id, publishedBy?)` | Publish draft (requires fixtures to pass) |
| `archiveVersion(id, archivedBy?)` | Archive a version |
| `rollbackToVersion(id, publishedBy?)` | Restore archived version |
| `deleteDraftVersion(id)` | Delete draft (only drafts can be deleted) |

### Calculation Runs

| Function | Description |
|----------|-------------|
| `getCalculationRuns(filters?, limit, offset)` | Get runs with filtering and pagination |
| `getCalculationRun(id)` | Get specific run by ID |
| `getCalculationStats(modelVersionId)` | Get statistics for a version |
| `saveCalculationRun(...)` | Save a calculation to audit trail |
| `saveCalculationRunsBulk(runs)` | Bulk save multiple runs |
| `updateCalculationTags(id, tags)` | Update run tags |
| `updateCalculationNotes(id, notes)` | Update run notes |
| `deleteCalculationRuns(ids)` | Delete runs (use sparingly) |

### Test Fixtures

| Function | Description |
|----------|-------------|
| `getTestFixtures(filters?)` | Get fixtures with filtering |
| `getTestFixture(id)` | Get specific fixture |
| `getValidationRuns(modelVersionId)` | Get validation history for version |
| `createTestFixture(data, createdBy?)` | Create new fixture |
| `updateTestFixture(id, updates, updatedBy?)` | Update fixture |
| `deactivateTestFixture(id, updatedBy?)` | Deactivate fixture (soft delete) |
| `deleteTestFixture(id)` | Delete fixture (hard delete) |
| `runFixtureValidation(...)` | Run single fixture validation |
| `runAllFixtureValidations(...)` | Run all fixtures for a version |
| `getValidationSummary(modelVersionId)` | Get validation summary |

---

## Publishing Workflow

```
Draft Version Created
       ↓
Update Parameters/Formulas (optional)
       ↓
Run All Fixture Validations
       ↓
   All Pass? ──→ No ──→ Fix Issues & Re-validate
       ↓ Yes
Publish Version
       ↓
Current Published → Archived
       ↓
New Version → Published
```

**Publishing Rules:**
1. Only draft versions can be published
2. ALL active fixtures must pass validation
3. Only ONE published version per model_key
4. Previous published version is auto-archived
5. Published versions are immutable

---

## Row Level Security (RLS)

The schema includes commented-out RLS policy examples. Enable based on your auth setup:

```sql
-- Enable RLS
ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;

-- Example: Public read for published versions
CREATE POLICY "Published versions viewable by all"
  ON model_versions FOR SELECT
  USING (status = 'published');

-- Example: Authenticated users can create drafts
CREATE POLICY "Authenticated users create drafts"
  ON model_versions FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    status = 'draft' AND
    created_by = auth.uid()
  );
```

---

## Database Functions

The schema includes PostgreSQL functions:

### `get_published_version(p_model_key TEXT)`
Returns the currently published version for a model.

### `get_next_version_number(p_model_key TEXT)`
Returns the next sequential version number.

### `all_fixtures_pass(p_model_version_id UUID)`
Returns TRUE if all fixtures have passed for the version.

---

## Migration Strategy

### Initial Setup
1. Run `supabase/schema.sql` to create all tables
2. Factory default version (v1) is automatically inserted
3. Verify with: `SELECT * FROM model_versions;`

### Adding Fixtures
1. Extract Excel test cases
2. Use `createTestFixture()` to add each case
3. Validate against factory default version
4. Fix any discrepancies in formulas or tolerances

### Creating New Versions
1. Make code changes to formulas or parameters
2. Create draft: `createDraftVersion()`
3. Run fixtures: `runAllFixtureValidations()`
4. Fix failures, re-run
5. Publish: `publishVersion()`

---

## Best Practices

### Versioning
- Create drafts for experimental changes
- Only publish after thorough fixture validation
- Use descriptive formulas_hash (e.g., git commit SHA)
- Never modify published versions (create new draft instead)

### Audit Trail
- Save every calculation (storage is cheap, lost data is expensive)
- Use tags for categorization (e.g., ['production', 'customer-x'])
- Add notes for significant calculations
- Query by session_id to track user workflows

### Fixtures
- One fixture per Excel row/scenario
- Use descriptive names
- Set appropriate tolerances (tighter for critical outputs)
- Deactivate instead of delete (preserve history)
- Review and update fixtures when requirements change

### Performance
- Use pagination for large queries (`limit`, `offset`)
- Index on commonly filtered fields (already included)
- Archive old calculation runs periodically
- Use tags wisely (they're indexed with GIN)

---

## Troubleshooting

### "Failed to publish: Not all fixtures passed"
- Run `getValidationRuns(versionId)` to see failures
- Fix formulas or adjust tolerances
- Re-run `runAllFixtureValidations()`

### "Only draft versions can be updated"
- Published/archived versions are immutable
- Create new draft based on published version
- Make changes to draft, then publish

### "Failed to fetch: PGRST116"
- Record not found (returns null)
- Check ID is correct
- Verify RLS policies if enabled

---

## Next Steps

**Phase 3: UI Implementation**
- Input form with real-time validation
- Calculation results visualization
- Version history browser
- Fixture management interface
- Admin panel for parameters

---

**Database Layer Complete** ✅

All versioning, audit trail, and fixture management functionality is implemented and type-safe.
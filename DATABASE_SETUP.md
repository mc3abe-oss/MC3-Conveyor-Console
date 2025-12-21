# DATABASE SETUP GUIDE

Complete guide for setting up and using the Supabase database backend.

---

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Supabase Project**: Create a new project in the Supabase dashboard

---

## Initial Setup

### 1. Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details:
   - **Name**: `sliderbed-calculator` (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for project to finish provisioning (~2 minutes)

### 2. Get API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: Your anonymous/public key
   - **service_role**: Your service role key (keep secret!)

### 3. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values:
   ```bash
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 4. Run Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the SQL editor
5. Click **Run** (or press `Ctrl+Enter`)

You should see: `Success. No rows returned`

### 5. Verify Installation

Check that tables were created:

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `model_versions`
   - `calculation_runs`
   - `test_fixtures`
   - `fixture_validation_runs`
   - `parameter_override_presets`
   - `schema_migrations`

---

## Database Schema Overview

### Tables

#### `model_versions`
Stores versioned calculation models with draft/published/archived lifecycle.

**Key Columns:**
- `id` (UUID): Primary key
- `model_key` (TEXT): Model identifier (e.g., "sliderbed_conveyor_v1")
- `version_number` (INTEGER): Auto-incrementing version number
- `status` (TEXT): `draft` | `published` | `archived`
- `formulas_hash` (TEXT): Hash of formulas for change detection
- `parameters` (JSONB): Snapshot of all parameters and defaults

**Constraints:**
- Only one published version per model_key at a time
- Draft versions can be edited, published versions are immutable

#### `calculation_runs`
Immutable audit trail of every calculation performed.

**Key Columns:**
- `id` (UUID): Primary key
- `model_version_id` (UUID): Reference to model version used
- `inputs` (JSONB): Complete input snapshot
- `outputs` (JSONB): Complete output snapshot
- `warnings` (JSONB): Any warnings generated
- `errors` (JSONB): Any errors generated
- `calculated_at` (TIMESTAMPTZ): When calculation was performed
- `execution_time_ms` (INTEGER): How long calculation took
- `user_id` (UUID): User who ran calculation (optional)
- `tags` (TEXT[]): Custom tags for categorization

#### `test_fixtures`
Excel test cases for validating model calculations.

**Key Columns:**
- `id` (UUID): Primary key
- `model_key` (TEXT): Which model this tests
- `name` (TEXT): Fixture name (unique per model)
- `inputs` (JSONB): Test input values
- `expected_outputs` (JSONB): Expected output values
- `tolerances` (JSONB): Field-specific tolerances (optional)
- `active` (BOOLEAN): Whether to include in validation

#### `fixture_validation_runs`
History of running fixtures against model versions.

**Key Columns:**
- `id` (UUID): Primary key
- `model_version_id` (UUID): Version being tested
- `test_fixture_id` (UUID): Fixture being run
- `passed` (BOOLEAN): Did all outputs match?
- `failures` (JSONB): Array of field-level failures
- `actual_outputs` (JSONB): What was actually calculated

#### `parameter_override_presets`
Saved parameter configurations for reuse.

**Key Columns:**
- `id` (UUID): Primary key
- `model_key` (TEXT): Which model these apply to
- `name` (TEXT): Preset name
- `parameters` (JSONB): Parameter overrides
- `is_public` (BOOLEAN): Share with other users?
- `owner_id` (UUID): Who created this

---

## Usage Examples

### Creating a Draft Version

```typescript
import { createDraftVersion } from './src/lib/database';
import { DEFAULT_PARAMETERS } from './src/models/sliderbed_v1/schema';

const draftVersion = await createDraftVersion(
  'sliderbed_conveyor_v1',
  'formula_hash_v2',
  DEFAULT_PARAMETERS,
  userId // optional
);

console.log('Draft version created:', draftVersion.version_number);
```

### Publishing a Version (with Fixture Validation)

```typescript
import { publishVersion, runAllFixtureValidations } from './src/lib/database';

// First, run all fixtures
const validation = await runAllFixtureValidations(
  draftVersion.id,
  'sliderbed_conveyor_v1',
  DEFAULT_PARAMETERS
);

if (!validation.all_passed) {
  console.error('Fixtures failed:', validation.failed_count);
  validation.results.filter(r => !r.passed).forEach(result => {
    console.log(`Failed: ${result.fixture_name}`);
    result.failures?.forEach(f => {
      console.log(`  ${f.field}: expected ${f.expected}, got ${f.actual}`);
    });
  });
  return;
}

// All fixtures passed, publish
const result = await publishVersion(draftVersion.id, userId);

if (result.success) {
  console.log('Version published:', result.version?.version_number);
} else {
  console.error('Publish failed:', result.errors);
}
```

### Saving a Calculation Run

```typescript
import { saveCalculationRun } from './src/lib/database';
import { runCalculation } from './src/lib/calculator';

const calculationResult = runCalculation({ inputs });

await saveCalculationRun(
  modelVersionId,
  calculationResult,
  executionTimeMs,
  userId,       // optional
  sessionId,    // optional
  ['production', 'customer-xyz'], // tags (optional)
  'Note about this calculation'   // notes (optional)
);
```

### Querying Calculation History

```typescript
import { getCalculationRuns, getCalculationStats } from './src/lib/database';

// Get recent runs with filters
const { runs, total } = await getCalculationRuns({
  model_version_id: versionId,
  user_id: userId,
  date_from: '2024-01-01T00:00:00Z',
  tags: ['production']
}, 50, 0); // limit 50, offset 0

// Get statistics
const stats = await getCalculationStats(versionId);
console.log('Total runs:', stats.total_runs);
console.log('Success rate:', stats.successful_runs / stats.total_runs);
console.log('Avg execution time:', stats.avg_execution_time_ms, 'ms');
```

### Adding Test Fixtures

```typescript
import { createTestFixture } from './src/lib/database';

const fixture = await createTestFixture({
  model_key: 'sliderbed_conveyor_v1',
  name: 'Excel Case 1 - Standard Configuration',
  description: 'Standard conveyor with 2.5" pulley',
  source: 'Excel Row 15',
  inputs: {
    conveyor_length_cc_in: 120,
    // ... all inputs
  },
  expected_outputs: {
    drive_shaft_rpm: 152.789,
    torque_drive_shaft_inlbf: 1964.47,
    // ... expected outputs
  },
  tolerances: {
    drive_shaft_rpm: 0.001, // 0.1% tolerance
    torque_drive_shaft_inlbf: 0.005, // 0.5% tolerance
  },
  active: true
}, userId);
```

### Rollback to Previous Version

```typescript
import { rollbackToVersion, getModelVersions } from './src/lib/database';

// Find archived version to restore
const versions = await getModelVersions({
  model_key: 'sliderbed_conveyor_v1',
  status: 'archived'
});

const previousVersion = versions.find(v => v.version_number === 3);

if (previousVersion) {
  const result = await rollbackToVersion(previousVersion.id, userId);

  if (result.success) {
    console.log('Rolled back to version', result.version?.version_number);
  }
}
```

---

## Row Level Security (RLS)

The schema includes commented-out RLS policies. To enable security:

### 1. Enable RLS on Tables

```sql
ALTER TABLE model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE parameter_override_presets ENABLE ROW LEVEL SECURITY;
```

### 2. Create Policies

Example policies (customize based on your auth setup):

```sql
-- Anyone can read published versions
CREATE POLICY "Published versions are public"
  ON model_versions FOR SELECT
  USING (status = 'published');

-- Only authenticated users can create drafts
CREATE POLICY "Auth users can create drafts"
  ON model_versions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Users can only edit their own drafts
CREATE POLICY "Users can edit own drafts"
  ON model_versions FOR UPDATE
  USING (created_by = auth.uid() AND status = 'draft');

-- Anyone can save calculation runs
CREATE POLICY "Anyone can save calculations"
  ON calculation_runs FOR INSERT
  WITH CHECK (true);

-- Users can only view their own calculation runs
CREATE POLICY "Users see own calculations"
  ON calculation_runs FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);
```

---

## Backup & Maintenance

### Automated Backups

Supabase provides automated daily backups. Configure in:
- **Settings** → **Database** → **Backups**

### Manual Backup

Export database using pg_dump:

```bash
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql
```

### Cleanup Old Calculation Runs

If calculation_runs table grows too large:

```sql
-- Delete runs older than 90 days
DELETE FROM calculation_runs
WHERE calculated_at < NOW() - INTERVAL '90 days'
  AND tags IS NULL; -- Keep tagged runs
```

---

## Monitoring

### Database Size

Check in Supabase dashboard:
- **Settings** → **Database** → **Usage**

### Query Performance

Use Supabase's built-in query inspector:
- **Database** → **Query Performance**

### Indexes

The schema includes indexes on frequently-queried columns:
- `model_versions`: `model_key`, `status`, `created_at`
- `calculation_runs`: `model_version_id`, `user_id`, `calculated_at`, `tags`
- `test_fixtures`: `model_key`, `active`

Add custom indexes as needed:

```sql
CREATE INDEX idx_calculation_runs_custom
  ON calculation_runs(user_id, calculated_at DESC)
  WHERE errors IS NULL;
```

---

## Troubleshooting

### Connection Issues

**Error**: `Failed to fetch`

- Check `SUPABASE_URL` is correct
- Verify network connectivity
- Check Supabase project status (app.supabase.com)

### Authentication Errors

**Error**: `JWT expired` or `Invalid API key`

- Verify `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` is correct
- Regenerate keys in Supabase dashboard if compromised

### Permission Denied

**Error**: `permission denied for table X`

- Check RLS policies are correctly configured
- Use `SUPABASE_SERVICE_ROLE_KEY` for admin operations
- Verify user authentication state

### Unique Constraint Violations

**Error**: `duplicate key value violates unique constraint`

Common causes:
- Trying to publish when another version is already published
- Creating fixture with duplicate name for same model
- Creating preset with duplicate name for same user/model

---

## Migration Strategy

### Version Updates

When adding new tables or columns:

1. Create migration SQL file:
   ```sql
   -- Add new column to model_versions
   ALTER TABLE model_versions
   ADD COLUMN description TEXT;

   -- Update schema version
   INSERT INTO schema_migrations (version, description)
   VALUES (2, 'Add description field to model_versions');
   ```

2. Run in Supabase SQL Editor
3. Update TypeScript types in `database.types.ts`
4. Increment version in your app

### Data Migrations

When changing data structure:

```sql
-- Example: Convert old format to new format
UPDATE model_versions
SET parameters = jsonb_set(
  parameters,
  '{new_field}',
  '"default_value"'
)
WHERE parameters->>'new_field' IS NULL;
```

---

## Next Steps

After database setup:
1. ✅ Run migration SQL
2. ✅ Configure environment variables
3. ✅ Verify tables created
4. 📝 Add test fixtures for your model
5. 📝 Configure RLS policies (if needed)
6. 📝 Set up monitoring and alerts
7. 📝 Configure backup retention

For UI integration, see the Next.js implementation guide (Phase 3).

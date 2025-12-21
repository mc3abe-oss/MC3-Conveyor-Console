# Reference Line Implementation Summary

## Overview
Updated the Sliderbed Conveyor Calculator to use a 3-part configuration key: `(reference_type, reference_number, reference_line)` instead of the previous 2-part key.

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/20231221_add_reference_line.sql`

**Changes:**
- Add `reference_line` column (integer NOT NULL DEFAULT 1)
- Drop old unique constraint on `(reference_type, reference_number)`
- Add new unique constraint on `(reference_type, reference_number, reference_line)`
- Add index for efficient lookups

**To Apply:**
Run this SQL in Supabase SQL Editor or via migration tool.

### 2. API Routes Updated

#### `/app/api/configurations/save/route.ts`
- Added validation: `reference_number` must be digits-only (`/^\d+$/`)
- Added validation: `reference_line` must be integer >= 1
- Changed parameter from `line_key` to `reference_line`
- Updated upsert to use 3-part key

#### `/app/api/configurations/load/route.ts`
- Added validation for numeric `reference_number`
- Changed parameter from `line_key` to `reference_line`
- Updated lookup to use 3-part key

### 3. UI Changes

#### `/app/page.tsx`
**New Handlers:**
- `handleReferenceNumberChange`: Strips non-digits from input
- `handleLineKeyChange`: Enforces numeric input, minimum 1

**Save Logic:**
- **Existence Check:** If no configuration is loaded, check if (type, number, line) already exists
- If exists: Block save with message "This Quote/Sales Order number + line already exists. Click Load to open it, then make changes and Save to create a new revision."
- If not found: Proceed to create new configuration

**Updated API Calls:**
- Changed `line_key` to `reference_line` in all load/save calls
- Changed payload to use `reference_line: parseInt(lineKey)`

## Acceptance Tests

### Test 1: Create New Configuration
1. Open app at http://localhost:3001
2. Enter: Type=QUOTE, Number=62633, Line=1
3. Fill in calculator inputs
4. Click "Calculate"
5. Click "Save"

**Expected:** Configuration created with Rev 1. Toast shows "Saved Rev 1"

### Test 2: Prevent Duplicate Without Load
1. **Without clicking Load**, enter same: Type=QUOTE, Number=62633, Line=1
2. Fill in inputs (can be different)
3. Click "Calculate"
4. Click "Save"

**Expected:** Save blocked. Toast shows "This Quote number + line already exists. Click Load to open it, then make changes and Save to create a new revision."

### Test 3: Load and Create Revision
1. Click "Load" with Type=QUOTE, Number=62633, Line=1
2. Make a change to any input field
3. Click "Calculate"
4. Click "Save"

**Expected:** Rev 2 created. Toast shows "Saved Rev 2". Save button should have shown "*" before saving.

### Test 4: No Changes Detection
1. With configuration still loaded, click "Save" again without making changes

**Expected:** Toast shows "No changes to save". No new revision created.

### Test 5: Numeric Validation
1. Try entering letters in Number field (e.g., "abc123")

**Expected:** Only digits remain ("123")

2. Try entering letters in Line field (e.g., "abc")

**Expected:** Field resets to "1"

3. Try sending non-numeric via API (bypass UI)
```bash
curl -X POST http://localhost:3001/api/configurations/save \
  -H "Content-Type: application/json" \
  -d '{"reference_type":"QUOTE","reference_number":"abc","reference_line":1,"model_key":"sliderbed_conveyor_v1","inputs_json":{},"parameters_json":{},"application_json":{}}'
```

**Expected:** 400 error with message "Reference number must be numeric."

### Test 6: Different Lines Same Number
1. Create config: Type=QUOTE, Number=62633, Line=1
2. Create config: Type=QUOTE, Number=62633, Line=2

**Expected:** Both should save successfully as separate configurations

## How to Deploy

### Step 1: Apply Database Migration
```sql
-- Run in Supabase SQL Editor
-- Copy contents of supabase/migrations/20231221_add_reference_line.sql
```

### Step 2: Restart Dev Server
```bash
cd /Users/abraham/Vibe/dev/claude
npm run dev
```

### Step 3: Verify
- Check http://localhost:3001
- Test acceptance scenarios above

## Breaking Changes

**API Contract Changes:**
- `line_key` → `reference_line` (parameter name change)
- `reference_line` must be numeric integer >= 1
- `reference_number` must be digits-only

**Database Schema:**
- New column: `reference_line`
- New unique constraint replaces old one

## Rollback Plan

If issues occur:

1. **Revert code changes** (git revert)
2. **Revert database:**
```sql
-- Remove new constraint
ALTER TABLE configurations DROP CONSTRAINT IF EXISTS configurations_reference_key;

-- Re-add old constraint (if needed)
ALTER TABLE configurations
ADD CONSTRAINT configurations_reference_type_reference_number_key
UNIQUE (reference_type, reference_number);

-- Drop reference_line column
ALTER TABLE configurations DROP COLUMN IF EXISTS reference_line;
```

## Notes

- Existing configurations will get `reference_line = 1` by default
- Old API calls using `line_key` parameter will need to be updated to `reference_line`
- The UI enforces numeric-only input client-side, but server validates as well
- Dirty tracking does NOT consider reference field changes (only inputs/parameters/application payload)

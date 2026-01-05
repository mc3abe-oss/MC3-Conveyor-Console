# RBAC Phase 1.5 Smoke Tests

This document describes how to run the RBAC Phase 1.5 smoke tests to verify that:

1. **BELT_USER** is blocked by RLS on admin table writes
2. **SUPER_ADMIN** is allowed by RLS on admin table writes
3. **BELT_ADMIN** is allowed by RLS on admin table writes (if tested)
4. New user profile trigger creates BELT_USER role automatically

## Test Scripts

| Script | Purpose |
|--------|---------|
| `scripts/smoke-rls-direct.mjs` | **Primary** - Tests RLS policies directly against Supabase |
| `scripts/smoke-admin-routes.mjs` | Tests API routes (requires cookie auth, see notes) |
| `scripts/get-access-token.mjs` | Helper to obtain JWT tokens |

## Prerequisites

- Node.js 18+
- Access to Supabase project
- Test user accounts with known passwords:
  - `abek@mc3mfg.com` (SUPER_ADMIN)
  - `abe@mc3mfg.com` (BELT_USER)
  - Optional: a BELT_ADMIN test user

## Phase A: Verify User Profiles (Database)

Run these queries in Supabase SQL Editor to verify roles:

```sql
-- Check roles for known users
SELECT u.email, up.role, up.created_at
FROM public.user_profiles up
JOIN auth.users u ON u.id = up.user_id
WHERE u.email IN ('abe@mc3mfg.com', 'abek@mc3mfg.com')
ORDER BY u.email;
```

Expected output:
| email | role | created_at |
|-------|------|------------|
| abe@mc3mfg.com | BELT_USER | ... |
| abek@mc3mfg.com | SUPER_ADMIN | ... |

### Test New User Trigger

1. Create a fresh test user in Supabase Auth (Dashboard > Authentication > Users > Add User)
2. Verify the trigger created a BELT_USER profile:

```sql
SELECT u.email, up.role
FROM public.user_profiles up
JOIN auth.users u ON u.id = up.user_id
WHERE u.email = '<new-test-user-email>';
```

### Create BELT_ADMIN (Optional)

If you want to test BELT_ADMIN access:

```sql
UPDATE public.user_profiles up
SET role = 'BELT_ADMIN'
FROM auth.users u
WHERE u.id = up.user_id
  AND u.email = '<test-user-email>';
```

## Phase B: Get Access Tokens

### Setup Environment

```bash
# Source your .env.local (contains Supabase URL and anon key)
cd /path/to/project
source .env.local

# Or export manually:
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

### Get Tokens

```bash
# Get BELT_USER token
TEST_EMAIL="abe@mc3mfg.com" TEST_PASSWORD="<password>" \
  node scripts/get-access-token.mjs > /tmp/belt_user.json

# Get SUPER_ADMIN token
TEST_EMAIL="abek@mc3mfg.com" TEST_PASSWORD="<password>" \
  node scripts/get-access-token.mjs > /tmp/super_admin.json

# Get BELT_ADMIN token (optional)
TEST_EMAIL="<belt-admin-email>" TEST_PASSWORD="<password>" \
  node scripts/get-access-token.mjs > /tmp/belt_admin.json
```

### Extract Tokens

```bash
export BELT_USER_TOKEN=$(jq -r .access_token /tmp/belt_user.json)
export SUPER_ADMIN_TOKEN=$(jq -r .access_token /tmp/super_admin.json)
export BELT_ADMIN_TOKEN=$(jq -r .access_token /tmp/belt_admin.json)  # optional
```

## Phase C: Run Smoke Tests

### Option 1: Direct RLS Test (Recommended)

This tests RLS policies directly against Supabase, bypassing the Next.js middleware:

```bash
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
export BELT_USER_EMAIL="abe@mc3mfg.com"
export BELT_USER_PASSWORD="<password>"
export SUPER_ADMIN_EMAIL="abek@mc3mfg.com"
export SUPER_ADMIN_PASSWORD="<password>"

node scripts/smoke-rls-direct.mjs
```

### Option 2: API Route Test (Requires Cookie Auth)

The `smoke-admin-routes.mjs` script tests the Next.js API routes but requires cookie-based authentication (not Bearer tokens). This is more complex to set up - use direct RLS testing instead.

### Expected Output

```
============================================================
RBAC Phase 1.5 Smoke Tests
============================================================
Base URL: http://localhost:3000
BELT_USER token: eyJhbGciOiJIUzI1...
SUPER_ADMIN token: eyJhbGciOiJIUzI1...

--- /api/admin/v-guides ---
  ✓ POST /api/admin/v-guides as BELT_USER => 403 FORBIDDEN
  ✓ POST /api/admin/v-guides as SUPER_ADMIN => 201
  ✓ PUT /api/admin/v-guides as BELT_USER => 403 FORBIDDEN
  ✓ PUT /api/admin/v-guides as SUPER_ADMIN => 200

... (more routes)

============================================================
SUMMARY
============================================================

Total: 28 tests
Passed: 28

Results by Route:
--------------------------------------------------------------------------------
PASS POST /api/admin/v-guides
  ✓ BELT_USER => 403 FORBIDDEN
  ✓ SUPER_ADMIN => 2xx
...
```

## Routes Tested

| Route | Methods |
|-------|---------|
| `/api/admin/v-guides` | POST, PUT |
| `/api/admin/catalog-items` | POST, PUT |
| `/api/admin/cleats` | POST, PUT |
| `/api/admin/cleats/factors` | POST, PUT |
| `/api/admin/pulley-library` | POST, PUT, DELETE |
| `/api/admin/pulley-models` | POST, PUT, DELETE |

## Expected 403 Response Payload

```json
{
  "error": "FORBIDDEN",
  "message": "Admin permissions required."
}
```

## Phase D: Log Review

After running tests, check server logs for WARN entries:

```
[RBAC] Permission denied: INSERT on v_guides { route: '/api/admin/v-guides', userId: '...', code: '42501' }
```

These indicate the 403 handling is working correctly.

## Troubleshooting

### Token Expired
Tokens expire after ~1 hour. Re-run `get-access-token.mjs` if tests fail with 401.

### PCI_DRUM Style Not Found
The pulley-models tests require a `PCI_DRUM` style to exist. If missing, the test will skip with a note.

### 500 Instead of 403
If you see 500 errors for permission denials, verify:
1. Phase 1.5 PR was merged
2. Server was restarted after merge

## Cleanup

Test data created by smoke tests uses unique keys with timestamps (e.g., `K99_TEST_1704500000000`). These can be cleaned up with:

```sql
-- Clean up smoke test data
DELETE FROM public.v_guides WHERE key LIKE '%_TEST_%';
DELETE FROM public.catalog_items WHERE item_key LIKE '%_TEST_%';
DELETE FROM public.cleat_catalog WHERE material_family LIKE 'SMOKE_TEST%';
DELETE FROM public.cleat_center_factors WHERE material_family LIKE 'SMOKE_TEST%';
DELETE FROM public.pulley_library_styles WHERE key LIKE '%SMOKE_STYLE%';
DELETE FROM public.pulley_library_models WHERE model_key LIKE '%SMOKE_MODEL%';
```

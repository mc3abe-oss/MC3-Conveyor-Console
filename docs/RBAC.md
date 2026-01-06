# RBAC (Role-Based Access Control)

This document describes the role-based access control system for the Belt Conveyor application.

## Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `SUPER_ADMIN` | Full platform access | Can manage users, roles, and all admin tables |
| `BELT_ADMIN` | Belt conveyor module admin | Can manage belt conveyor admin tables |
| `BELT_USER` | Standard user (default) | Read-only access to admin tables |

## Default Behavior

- New users are automatically assigned `BELT_USER` role on signup
- A trigger on `auth.users` creates a `user_profiles` row with default role
- Users can view admin pages but cannot modify admin-managed data

## Admin-Managed Tables

The following tables require `BELT_ADMIN` or `SUPER_ADMIN` role to modify:

| Table | Purpose |
|-------|---------|
| `v_guides` | V-Guide profiles (min pulley diameters) |
| `pulley_library_styles` | Pulley style definitions (DRUM, WING, etc.) |
| `pulley_library_models` | Concrete pulley models (DRUM_4IN, DRUM_6IN, etc.) |
| `cleat_catalog` | Cleat catalog entries |
| `cleat_center_factors` | Cleat center spacing factors |
| `catalog_items` | Generic catalog items (leg models, casters, etc.) |

All authenticated users can **read** these tables. Only admins can **write**.

## Database Schema

### user_profiles table

```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'BELT_USER'
    CHECK (role IN ('SUPER_ADMIN', 'BELT_ADMIN', 'BELT_USER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Helper Functions

```sql
-- Check if current user is SUPER_ADMIN
SELECT public.is_super_admin();

-- Check if current user has belt admin access (BELT_ADMIN or SUPER_ADMIN)
SELECT public.has_belt_admin_access();

-- Get current user's role
SELECT public.get_current_user_role();
```

## How to Promote a User

### Option 1: Using the seed script (recommended)

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export SUPER_ADMIN_EMAIL="admin@example.com"

# Run the script
node scripts/seed-super-admin.mjs
```

### Option 2: Direct SQL (via Supabase Dashboard)

```sql
-- Promote user to SUPER_ADMIN
UPDATE user_profiles
SET role = 'SUPER_ADMIN', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');

-- Promote user to BELT_ADMIN
UPDATE user_profiles
SET role = 'BELT_ADMIN', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');

-- Demote user to BELT_USER
UPDATE user_profiles
SET role = 'BELT_USER', updated_at = NOW()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

**Note:** Only `SUPER_ADMIN` users can modify roles via the application. Direct SQL requires service role access.

## RLS Enforcement

Row Level Security (RLS) is enforced at the database level:

- **SELECT**: All authenticated users can read admin tables
- **INSERT/UPDATE/DELETE**: Only users with `has_belt_admin_access() = true`

This means:
- API routes don't need to check roles for read operations
- API routes that attempt writes will get permission denied from Postgres if user lacks role
- UI should disable write controls for non-admin users (Phase 3)

## Rollback

To temporarily disable RBAC restrictions (emergency use only):

```sql
-- Disable RLS on a table (allows all operations)
ALTER TABLE public.v_guides DISABLE ROW LEVEL SECURITY;

-- Or replace admin-only policies with auth-only
DROP POLICY "Admins can insert v_guides" ON public.v_guides;
CREATE POLICY "Authenticated can insert v_guides" ON public.v_guides
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

See the migration file for full rollback instructions.

## Implementation Phases

- **Phase 1** (this PR): Database foundation (user_profiles, RLS policies)
- **Phase 2**: API route role checks (return 403 instead of 500)
- **Phase 3**: UI adaptation (read-only mode, conditional controls)
- **Phase 4**: User Admin page (manage users and roles)

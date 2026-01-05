-- ============================================================================
-- RBAC Phase 1: User Profiles and Role-Aware RLS
-- ============================================================================
--
-- This migration establishes the foundation for role-based access control:
-- 1. Creates user_profiles table with role column
-- 2. Creates helper functions for role checks
-- 3. Enables RLS on user_profiles
-- 4. Updates RLS on admin-managed tables to require BELT_ADMIN or SUPER_ADMIN
--
-- Roles:
--   SUPER_ADMIN  - Full access, can manage users and all admin tables
--   BELT_ADMIN   - Can manage belt conveyor admin tables
--   BELT_USER    - Read-only access to admin tables (default for new users)
--
-- ROLLBACK: See bottom of file for rollback instructions
-- ============================================================================

-- ============================================================================
-- PHASE 1: CREATE USER_PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'BELT_USER'
    CHECK (role IN ('SUPER_ADMIN', 'BELT_ADMIN', 'BELT_USER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.user_profiles IS 'User profile with role for RBAC. One profile per auth user.';
COMMENT ON COLUMN public.user_profiles.user_id IS 'References auth.users(id). Deleted when user is deleted.';
COMMENT ON COLUMN public.user_profiles.role IS 'User role: SUPER_ADMIN, BELT_ADMIN, or BELT_USER (default)';

-- Create updated_at trigger (reuse pattern from other tables)
CREATE OR REPLACE FUNCTION public.update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_profiles_updated_at();

-- ============================================================================
-- PHASE 2: CREATE ROLE CHECK HELPER FUNCTIONS
-- ============================================================================
-- These functions are SECURITY DEFINER to allow RLS policies to check roles
-- without requiring users to have SELECT on user_profiles.
-- ============================================================================

-- Function: Get current user's role (returns NULL if no profile)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE user_id = auth.uid();
$$;

-- Function: Check if current user is SUPER_ADMIN
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
  );
$$;

-- Function: Check if current user has belt admin access (BELT_ADMIN or SUPER_ADMIN)
CREATE OR REPLACE FUNCTION public.has_belt_admin_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('BELT_ADMIN', 'SUPER_ADMIN')
  );
$$;

-- ============================================================================
-- PHASE 3: ENABLE RLS ON USER_PROFILES
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotence)
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile as BELT_USER" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can insert any profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.user_profiles;

-- SELECT: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- SELECT: Super admins can read all profiles
CREATE POLICY "Super admins can read all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (public.is_super_admin());

-- INSERT: Users can create their own profile, but only as BELT_USER
-- (Super admins can insert any role via the separate policy)
CREATE POLICY "Users can insert own profile as BELT_USER"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'BELT_USER'
  );

-- INSERT: Super admins can create profiles with any role
CREATE POLICY "Super admins can insert any profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (public.is_super_admin());

-- UPDATE: Only super admins can update profiles (role changes)
CREATE POLICY "Super admins can update any profile"
  ON public.user_profiles
  FOR UPDATE
  USING (public.is_super_admin());

-- DELETE: Only super admins can delete profiles
CREATE POLICY "Super admins can delete profiles"
  ON public.user_profiles
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================================================
-- PHASE 4: AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================================
-- This trigger creates a BELT_USER profile when a new auth user is created.
-- Runs as SECURITY DEFINER to bypass RLS.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role)
  VALUES (NEW.id, 'BELT_USER')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger (idempotence)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PHASE 5: UPDATE RLS ON ADMIN-MANAGED TABLES
-- ============================================================================
-- These tables are managed via /api/admin/* routes.
-- - Keep SELECT as authenticated-read (existing behavior)
-- - Restrict INSERT/UPDATE/DELETE to BELT_ADMIN or SUPER_ADMIN
-- ============================================================================

-- -----------------------------------------------------------------------------
-- TABLE: v_guides
-- -----------------------------------------------------------------------------
ALTER TABLE public.v_guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read v_guides" ON public.v_guides;
DROP POLICY IF EXISTS "Admins can insert v_guides" ON public.v_guides;
DROP POLICY IF EXISTS "Admins can update v_guides" ON public.v_guides;
DROP POLICY IF EXISTS "Admins can delete v_guides" ON public.v_guides;

CREATE POLICY "Authenticated can read v_guides"
  ON public.v_guides FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert v_guides"
  ON public.v_guides FOR INSERT
  WITH CHECK (public.has_belt_admin_access());

CREATE POLICY "Admins can update v_guides"
  ON public.v_guides FOR UPDATE
  USING (public.has_belt_admin_access());

CREATE POLICY "Admins can delete v_guides"
  ON public.v_guides FOR DELETE
  USING (public.has_belt_admin_access());

-- -----------------------------------------------------------------------------
-- TABLE: pulley_library_styles
-- -----------------------------------------------------------------------------
ALTER TABLE public.pulley_library_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read pulley_library_styles" ON public.pulley_library_styles;
DROP POLICY IF EXISTS "Admins can insert pulley_library_styles" ON public.pulley_library_styles;
DROP POLICY IF EXISTS "Admins can update pulley_library_styles" ON public.pulley_library_styles;
DROP POLICY IF EXISTS "Admins can delete pulley_library_styles" ON public.pulley_library_styles;

CREATE POLICY "Authenticated can read pulley_library_styles"
  ON public.pulley_library_styles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert pulley_library_styles"
  ON public.pulley_library_styles FOR INSERT
  WITH CHECK (public.has_belt_admin_access());

CREATE POLICY "Admins can update pulley_library_styles"
  ON public.pulley_library_styles FOR UPDATE
  USING (public.has_belt_admin_access());

CREATE POLICY "Admins can delete pulley_library_styles"
  ON public.pulley_library_styles FOR DELETE
  USING (public.has_belt_admin_access());

-- -----------------------------------------------------------------------------
-- TABLE: pulley_library_models
-- -----------------------------------------------------------------------------
ALTER TABLE public.pulley_library_models ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read pulley_library_models" ON public.pulley_library_models;
DROP POLICY IF EXISTS "Admins can insert pulley_library_models" ON public.pulley_library_models;
DROP POLICY IF EXISTS "Admins can update pulley_library_models" ON public.pulley_library_models;
DROP POLICY IF EXISTS "Admins can delete pulley_library_models" ON public.pulley_library_models;

CREATE POLICY "Authenticated can read pulley_library_models"
  ON public.pulley_library_models FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert pulley_library_models"
  ON public.pulley_library_models FOR INSERT
  WITH CHECK (public.has_belt_admin_access());

CREATE POLICY "Admins can update pulley_library_models"
  ON public.pulley_library_models FOR UPDATE
  USING (public.has_belt_admin_access());

CREATE POLICY "Admins can delete pulley_library_models"
  ON public.pulley_library_models FOR DELETE
  USING (public.has_belt_admin_access());

-- -----------------------------------------------------------------------------
-- TABLE: cleat_catalog
-- -----------------------------------------------------------------------------
ALTER TABLE public.cleat_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read cleat_catalog" ON public.cleat_catalog;
DROP POLICY IF EXISTS "Admins can insert cleat_catalog" ON public.cleat_catalog;
DROP POLICY IF EXISTS "Admins can update cleat_catalog" ON public.cleat_catalog;
DROP POLICY IF EXISTS "Admins can delete cleat_catalog" ON public.cleat_catalog;

CREATE POLICY "Authenticated can read cleat_catalog"
  ON public.cleat_catalog FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert cleat_catalog"
  ON public.cleat_catalog FOR INSERT
  WITH CHECK (public.has_belt_admin_access());

CREATE POLICY "Admins can update cleat_catalog"
  ON public.cleat_catalog FOR UPDATE
  USING (public.has_belt_admin_access());

CREATE POLICY "Admins can delete cleat_catalog"
  ON public.cleat_catalog FOR DELETE
  USING (public.has_belt_admin_access());

-- -----------------------------------------------------------------------------
-- TABLE: cleat_center_factors
-- -----------------------------------------------------------------------------
ALTER TABLE public.cleat_center_factors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read cleat_center_factors" ON public.cleat_center_factors;
DROP POLICY IF EXISTS "Admins can insert cleat_center_factors" ON public.cleat_center_factors;
DROP POLICY IF EXISTS "Admins can update cleat_center_factors" ON public.cleat_center_factors;
DROP POLICY IF EXISTS "Admins can delete cleat_center_factors" ON public.cleat_center_factors;

CREATE POLICY "Authenticated can read cleat_center_factors"
  ON public.cleat_center_factors FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert cleat_center_factors"
  ON public.cleat_center_factors FOR INSERT
  WITH CHECK (public.has_belt_admin_access());

CREATE POLICY "Admins can update cleat_center_factors"
  ON public.cleat_center_factors FOR UPDATE
  USING (public.has_belt_admin_access());

CREATE POLICY "Admins can delete cleat_center_factors"
  ON public.cleat_center_factors FOR DELETE
  USING (public.has_belt_admin_access());

-- -----------------------------------------------------------------------------
-- TABLE: catalog_items
-- -----------------------------------------------------------------------------
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read catalog_items" ON public.catalog_items;
DROP POLICY IF EXISTS "Admins can insert catalog_items" ON public.catalog_items;
DROP POLICY IF EXISTS "Admins can update catalog_items" ON public.catalog_items;
DROP POLICY IF EXISTS "Admins can delete catalog_items" ON public.catalog_items;

CREATE POLICY "Authenticated can read catalog_items"
  ON public.catalog_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert catalog_items"
  ON public.catalog_items FOR INSERT
  WITH CHECK (public.has_belt_admin_access());

CREATE POLICY "Admins can update catalog_items"
  ON public.catalog_items FOR UPDATE
  USING (public.has_belt_admin_access());

CREATE POLICY "Admins can delete catalog_items"
  ON public.catalog_items FOR DELETE
  USING (public.has_belt_admin_access());

-- ============================================================================
-- PHASE 6: VERIFICATION
-- ============================================================================

DO $$
DECLARE
  profile_count INTEGER;
  tables_with_rls INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.user_profiles;

  SELECT COUNT(*) INTO tables_with_rls
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('user_profiles', 'v_guides', 'pulley_library_styles',
                        'pulley_library_models', 'cleat_catalog',
                        'cleat_center_factors', 'catalog_items')
    AND c.relrowsecurity = true;

  RAISE NOTICE '=== RBAC Phase 1 Migration Complete ===';
  RAISE NOTICE 'user_profiles table created with % existing profiles', profile_count;
  RAISE NOTICE 'RLS enabled on % admin-managed tables', tables_with_rls;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run seed-super-admin script to create initial SUPER_ADMIN';
  RAISE NOTICE '2. Test admin API routes with non-admin user (should fail)';
  RAISE NOTICE '3. Test admin API routes with SUPER_ADMIN (should succeed)';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration, run the following SQL:
--
-- -- Drop user_profiles table and related objects
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
-- DROP FUNCTION IF EXISTS public.update_user_profiles_updated_at();
-- DROP TABLE IF EXISTS public.user_profiles;
--
-- -- Drop helper functions
-- DROP FUNCTION IF EXISTS public.get_current_user_role();
-- DROP FUNCTION IF EXISTS public.is_super_admin();
-- DROP FUNCTION IF EXISTS public.has_belt_admin_access();
--
-- -- Revert RLS policies on admin tables to auth-only (or disable RLS)
-- -- For each table (v_guides, pulley_library_styles, etc.):
-- ALTER TABLE public.v_guides DISABLE ROW LEVEL SECURITY;
-- (repeat for other tables)
--
-- OR to keep RLS but allow all authenticated writes:
-- DROP POLICY "Admins can insert v_guides" ON public.v_guides;
-- CREATE POLICY "Authenticated can insert v_guides" ON public.v_guides
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
-- (repeat for UPDATE/DELETE and other tables)
-- ============================================================================

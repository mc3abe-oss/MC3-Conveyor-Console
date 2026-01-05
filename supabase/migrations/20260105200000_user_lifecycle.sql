-- ============================================================================
-- User Lifecycle: Deactivation + Admin Audit Log
-- ============================================================================
--
-- This migration adds:
-- 1. is_active flag to user_profiles for deactivating users
-- 2. user_admin_audit table for tracking admin actions
--
-- ROLLBACK: See bottom of file for rollback instructions
-- ============================================================================

-- ============================================================================
-- PHASE 1: ADD DEACTIVATION COLUMNS TO USER_PROFILES
-- ============================================================================

-- Add is_active column (defaults to true for existing users)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Add deactivated_at timestamp
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ NULL;

-- Add deactivated_by reference (who deactivated this user)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS deactivated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON COLUMN public.user_profiles.is_active IS 'Whether user can access the application. Deactivated users are blocked at API layer.';
COMMENT ON COLUMN public.user_profiles.deactivated_at IS 'When the user was deactivated. NULL if active.';
COMMENT ON COLUMN public.user_profiles.deactivated_by IS 'User ID of admin who deactivated this user. NULL if active or self-deleted.';

-- Create index for efficient active user queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);

-- ============================================================================
-- PHASE 2: CREATE USER_ADMIN_AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN (
    'INVITE',
    'RESEND_INVITE',
    'SEND_MAGIC_LINK',
    'SEND_PASSWORD_RESET',
    'DEACTIVATE',
    'REACTIVATE',
    'FORCE_SIGNOUT',
    'ROLE_CHANGE'
  )),
  details JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.user_admin_audit IS 'Audit log for user administration actions. SUPER_ADMIN only.';
COMMENT ON COLUMN public.user_admin_audit.actor_user_id IS 'User who performed the action';
COMMENT ON COLUMN public.user_admin_audit.target_user_id IS 'User affected by the action';
COMMENT ON COLUMN public.user_admin_audit.action IS 'Type of admin action performed';
COMMENT ON COLUMN public.user_admin_audit.details IS 'Additional details (e.g., previous role, new role)';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_admin_audit_actor ON public.user_admin_audit(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_audit_target ON public.user_admin_audit(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_audit_action ON public.user_admin_audit(action);
CREATE INDEX IF NOT EXISTS idx_user_admin_audit_created_at ON public.user_admin_audit(created_at DESC);

-- ============================================================================
-- PHASE 3: ENABLE RLS ON USER_ADMIN_AUDIT
-- ============================================================================

ALTER TABLE public.user_admin_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotence)
DROP POLICY IF EXISTS "Super admins can read audit logs" ON public.user_admin_audit;
DROP POLICY IF EXISTS "Super admins can insert audit logs" ON public.user_admin_audit;

-- SELECT: Only SUPER_ADMIN can read audit logs
CREATE POLICY "Super admins can read audit logs"
  ON public.user_admin_audit
  FOR SELECT
  USING (public.is_super_admin());

-- INSERT: Only SUPER_ADMIN can insert audit logs
-- (API will insert with authenticated user session after role check)
CREATE POLICY "Super admins can insert audit logs"
  ON public.user_admin_audit
  FOR INSERT
  WITH CHECK (public.is_super_admin());

-- No UPDATE or DELETE policies - audit logs are immutable

-- ============================================================================
-- PHASE 4: HELPER FUNCTION TO CHECK IF USER IS ACTIVE
-- ============================================================================

-- Function: Check if a specific user is active
CREATE OR REPLACE FUNCTION public.is_user_active(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.user_profiles WHERE user_id = check_user_id),
    TRUE  -- Default to active if no profile exists
  );
$$;

COMMENT ON FUNCTION public.is_user_active(UUID) IS 'Returns whether a user is active. Defaults to TRUE if no profile.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  has_is_active BOOLEAN;
  has_audit_table BOOLEAN;
BEGIN
  -- Check if is_active column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'is_active'
  ) INTO has_is_active;

  -- Check if audit table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_admin_audit'
  ) INTO has_audit_table;

  RAISE NOTICE '=== User Lifecycle Migration Complete ===';
  RAISE NOTICE 'user_profiles.is_active column: %', has_is_active;
  RAISE NOTICE 'user_admin_audit table: %', has_audit_table;
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
--
-- -- Remove audit table
-- DROP TABLE IF EXISTS public.user_admin_audit;
--
-- -- Remove helper function
-- DROP FUNCTION IF EXISTS public.is_user_active(UUID);
--
-- -- Remove deactivation columns from user_profiles
-- ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS deactivated_by;
-- ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS deactivated_at;
-- ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS is_active;
--
-- -- Remove index
-- DROP INDEX IF EXISTS public.idx_user_profiles_is_active;
-- ============================================================================

-- ============================================================================
-- RBAC Hardening: Fail-Closed Defaults + Defensive Index
-- ============================================================================
--
-- This migration applies security hardening:
-- 1. Updates is_user_active() to fail-closed (FALSE if no profile)
-- 2. Adds explicit index on user_profiles.user_id (defensive)
--
-- Rule: If a profile does not exist, treat user as inactive (fail-closed)
-- ============================================================================

-- ============================================================================
-- PHASE 1: UPDATE is_user_active TO FAIL-CLOSED
-- ============================================================================
-- Change from fail-open (TRUE if no profile) to fail-closed (FALSE if no profile)

-- Drop existing function first (parameter name change requires this)
DROP FUNCTION IF EXISTS public.is_user_active(UUID);

CREATE FUNCTION public.is_user_active(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.user_profiles WHERE user_id = check_user_id),
    FALSE  -- FAIL-CLOSED: No profile = inactive user
  );
$$;

COMMENT ON FUNCTION public.is_user_active(UUID) IS 'Returns whether a user is active. FAIL-CLOSED: defaults to FALSE if no profile exists.';

-- ============================================================================
-- PHASE 2: ADD DEFENSIVE INDEX ON user_id
-- ============================================================================
-- user_id is already PRIMARY KEY (which creates an index), but this explicit
-- index serves as documentation and ensures the index exists if PK is ever changed.

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
ON public.user_profiles (user_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== RBAC Hardening Migration Complete ===';
  RAISE NOTICE 'is_user_active() now FAIL-CLOSED (FALSE if no profile)';
  RAISE NOTICE 'idx_user_profiles_user_id index created';
END $$;

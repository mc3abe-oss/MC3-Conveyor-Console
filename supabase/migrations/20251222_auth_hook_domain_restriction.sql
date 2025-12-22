-- Auth Hook: Before User Created
-- Restricts signups to @mc3mfg.com and @clearcode.ca domains

-- Create the hook function
CREATE OR REPLACE FUNCTION public.before_user_created_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Extract email from the event payload
  user_email := lower(trim(event->'user'->>'email'));

  -- Log for debugging
  RAISE LOG 'before_user_created_hook: email = %', user_email;

  -- Check if email ends with allowed domains
  IF user_email IS NULL OR user_email = '' THEN
    RETURN jsonb_build_object(
      'decision', 'reject',
      'message', 'Email address is required.'
    );
  END IF;

  IF NOT (user_email LIKE '%@mc3mfg.com' OR user_email LIKE '%@clearcode.ca') THEN
    RAISE LOG 'before_user_created_hook: rejected %', user_email;
    RETURN jsonb_build_object(
      'decision', 'reject',
      'message', 'Only @mc3mfg.com or @clearcode.ca email addresses are allowed.'
    );
  END IF;

  -- Allow the signup
  RAISE LOG 'before_user_created_hook: approved %', user_email;
  RETURN jsonb_build_object('decision', 'continue');
END;
$$;

-- Grant execute permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.before_user_created_hook TO supabase_auth_admin;

-- Revoke from other roles for security
REVOKE EXECUTE ON FUNCTION public.before_user_created_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.before_user_created_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.before_user_created_hook FROM authenticated;

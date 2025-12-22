-- Email Domain Restriction
-- Restricts signups to @mc3mfg.com and @clearcode.ca domains
-- This is a trigger function on auth.users table

CREATE OR REPLACE FUNCTION public.check_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@mc3mfg.com' AND NEW.email NOT LIKE '%@clearcode.ca' THEN
    RAISE EXCEPTION 'Only @mc3mfg.com or @clearcode.ca emails are allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

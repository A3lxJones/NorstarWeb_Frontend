-- Fix role-change outbox trigger to avoid referencing a missing NEW.user_id field.
-- Some environments use profiles.id, others may have user_id; this function supports both.

CREATE OR REPLACE FUNCTION public.profiles_role_change_outbox()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  effective_user_id uuid;
  old_role_text text;
  new_role_text text;
BEGIN
  -- Read keys dynamically so this function works even if only one column exists.
  effective_user_id := COALESCE(
    NULLIF(to_jsonb(NEW)->>'user_id', '')::uuid,
    NULLIF(to_jsonb(NEW)->>'id', '')::uuid,
    NULLIF(to_jsonb(OLD)->>'user_id', '')::uuid,
    NULLIF(to_jsonb(OLD)->>'id', '')::uuid
  );

  old_role_text := to_jsonb(OLD)->>'role';
  new_role_text := to_jsonb(NEW)->>'role';

  -- Only enqueue when role actually changes.
  IF old_role_text IS DISTINCT FROM new_role_text THEN
    INSERT INTO public.auth_outbox_role_changes (user_id, old_role, new_role)
    VALUES (effective_user_id, old_role_text, new_role_text);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

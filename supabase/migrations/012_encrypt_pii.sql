-- ============================================================
-- 012 — Encrypt personal data at rest (GDPR Art. 32)
--
-- Emails and phone numbers are now encrypted by the application
-- (AES-256-GCM, see src/server-api/utils/encryption.ts) before they are
-- written to Postgres. The key lives only in the server environment
-- (PII_ENCRYPTION_KEY), so it is never stored alongside the data.
--
-- NOTHING IS DELETED OR REWRITTEN BY THIS MIGRATION. Existing rows keep
-- their current plaintext values and stay readable, because ciphertext is
-- self-identifying (`enc:v1:` prefix) and the decrypt helper passes
-- unprefixed values straight through. Convert existing rows afterwards with:
--     npm run build:ts && node dist/scripts/encrypt-existing-pii.js --apply
-- ============================================================

-- The signup trigger seeds profiles from auth.users. The application now sends
-- already-encrypted values in raw_user_meta_data ('email_enc' and 'phone'), so
-- new profile rows are never written in plaintext, not even momentarily.
-- auth.users.email itself must stay plaintext — Supabase Auth needs it to log
-- users in — so profiles.email is the copy we protect.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    -- Falls back to the plaintext auth email for users created outside the
    -- app (e.g. the Supabase dashboard); the backfill script will encrypt it.
    COALESCE(NEW.raw_user_meta_data->>'email_enc', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'parent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON COLUMN public.profiles.email IS
  'Encrypted at rest (AES-256-GCM, enc:v1: prefix). Decrypted by the API layer.';
COMMENT ON COLUMN public.profiles.phone IS
  'Encrypted at rest (AES-256-GCM, enc:v1: prefix). Decrypted by the API layer.';
COMMENT ON COLUMN public.children.emergency_contact_phone IS
  'Encrypted at rest (AES-256-GCM, enc:v1: prefix). Decrypted by the API layer.';

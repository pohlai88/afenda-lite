-- Client profile identity fields for declarant onboarding (S6 extension)

ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS full_legal_name TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS country_of_residence TEXT,
  ADD COLUMN IF NOT EXISTS additional_residence_countries TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS passport_issuing_country TEXT,
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS identity_consent_at TIMESTAMPTZ;

-- Backfill legal name from accepted invitation where profile exists but name is empty.
-- Skipped when neon_auth schema is unavailable (e.g. pre-auth bootstrap).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'neon_auth'
  ) THEN
    UPDATE client_profiles cp
    SET full_legal_name = ci.full_name
    FROM client_invitations ci
    JOIN neon_auth."user" u ON lower(u.email) = lower(ci.email)
    WHERE cp.user_id::text = u.id::text
      AND ci.status = 'accepted'
      AND cp.full_legal_name IS NULL;
  END IF;
END $$;

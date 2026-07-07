ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS portal_ack_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_ack_version TEXT;

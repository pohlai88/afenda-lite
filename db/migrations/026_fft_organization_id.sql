-- ADR-002 follow-up: Feed Farm Trade tenant column (explicit reopen 2026-07-12)
-- Additive only — FFT permission catalog unchanged.

ALTER TABLE fft_event
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

ALTER TABLE fft_sales_member
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

ALTER TABLE fft_role
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

ALTER TABLE fft_role_assignment
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

CREATE INDEX IF NOT EXISTS fft_event_organization_id_idx
  ON fft_event (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS fft_sales_member_organization_id_idx
  ON fft_sales_member (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS fft_role_organization_id_idx
  ON fft_role (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS fft_role_assignment_organization_id_idx
  ON fft_role_assignment (organization_id)
  WHERE organization_id IS NOT NULL;

-- Hard multi-tenant cutover (ADR-002): NOT NULL on tenant roots + full indexes.
-- Apply on Neon child branch first; promote only after scripts/audit-tenancy-nulls.mjs exits 0.
-- Platform system templates may keep organization_id NULL when is_system_template = TRUE.

-- Safety stamp (expect 0 rows after Gate 0).
UPDATE surveys SET organization_id = (
  SELECT id FROM neon_auth.organization ORDER BY "createdAt" ASC NULLS LAST LIMIT 1
) WHERE organization_id IS NULL;

UPDATE client_invitations SET organization_id = (
  SELECT id FROM neon_auth.organization ORDER BY "createdAt" ASC NULLS LAST LIMIT 1
) WHERE organization_id IS NULL;

UPDATE client_profiles SET organization_id = (
  SELECT id FROM neon_auth.organization ORDER BY "createdAt" ASC NULLS LAST LIMIT 1
) WHERE organization_id IS NULL;

UPDATE client_assignments SET organization_id = (
  SELECT id FROM neon_auth.organization ORDER BY "createdAt" ASC NULLS LAST LIMIT 1
) WHERE organization_id IS NULL;

UPDATE fft_event SET organization_id = (
  SELECT id FROM neon_auth.organization ORDER BY "createdAt" ASC NULLS LAST LIMIT 1
) WHERE organization_id IS NULL;

UPDATE fft_sales_member SET organization_id = (
  SELECT id FROM neon_auth.organization ORDER BY "createdAt" ASC NULLS LAST LIMIT 1
) WHERE organization_id IS NULL;

UPDATE fft_role SET organization_id = (
  SELECT id FROM neon_auth.organization ORDER BY "createdAt" ASC NULLS LAST LIMIT 1
) WHERE organization_id IS NULL;

UPDATE fft_role_assignment SET organization_id = (
  SELECT id FROM neon_auth.organization ORDER BY "createdAt" ASC NULLS LAST LIMIT 1
) WHERE organization_id IS NULL;

ALTER TABLE surveys
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE client_invitations
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE client_profiles
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE client_assignments
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE fft_event
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE fft_sales_member
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE fft_role
  ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE fft_role_assignment
  ALTER COLUMN organization_id SET NOT NULL;

DROP INDEX IF EXISTS surveys_organization_id_idx;
DROP INDEX IF EXISTS client_invitations_organization_id_idx;
DROP INDEX IF EXISTS client_profiles_organization_id_idx;
DROP INDEX IF EXISTS client_assignments_organization_id_idx;
DROP INDEX IF EXISTS fft_event_organization_id_idx;
DROP INDEX IF EXISTS fft_sales_member_organization_id_idx;
DROP INDEX IF EXISTS fft_role_organization_id_idx;
DROP INDEX IF EXISTS fft_role_assignment_organization_id_idx;

CREATE INDEX IF NOT EXISTS surveys_organization_id_idx
  ON surveys (organization_id);

CREATE INDEX IF NOT EXISTS client_invitations_organization_id_idx
  ON client_invitations (organization_id);

CREATE INDEX IF NOT EXISTS client_profiles_organization_id_idx
  ON client_profiles (organization_id);

CREATE INDEX IF NOT EXISTS client_assignments_organization_id_idx
  ON client_assignments (organization_id);

CREATE INDEX IF NOT EXISTS fft_event_organization_id_idx
  ON fft_event (organization_id);

CREATE INDEX IF NOT EXISTS fft_sales_member_organization_id_idx
  ON fft_sales_member (organization_id);

CREATE INDEX IF NOT EXISTS fft_role_organization_id_idx
  ON fft_role (organization_id);

CREATE INDEX IF NOT EXISTS fft_role_assignment_organization_id_idx
  ON fft_role_assignment (organization_id);

ALTER TABLE platform_role
  DROP CONSTRAINT IF EXISTS platform_role_template_org_chk;

ALTER TABLE platform_role
  ADD CONSTRAINT platform_role_template_org_chk
  CHECK (organization_id IS NOT NULL OR is_system_template = TRUE);

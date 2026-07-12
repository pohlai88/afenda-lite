-- M2: scoped template_key uniqueness per organization (NULLS NOT DISTINCT)
-- Allows per-tenant system template clones without global UNIQUE(template_key).

ALTER TABLE platform_role
  DROP CONSTRAINT IF EXISTS platform_role_template_key_unique;

CREATE UNIQUE INDEX IF NOT EXISTS platform_role_org_template_key_uidx
  ON platform_role (organization_id, template_key)
  NULLS NOT DISTINCT
  WHERE template_key IS NOT NULL;

ALTER TABLE fft_role
  DROP CONSTRAINT IF EXISTS fft_role_template_key_unique;

CREATE UNIQUE INDEX IF NOT EXISTS fft_role_org_template_key_uidx
  ON fft_role (organization_id, template_key)
  NULLS NOT DISTINCT
  WHERE template_key IS NOT NULL;

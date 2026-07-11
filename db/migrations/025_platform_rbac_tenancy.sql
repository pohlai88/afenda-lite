-- ADR-002: Platform tenancy columns + permission-catalog RBAC (Identity-owned)
-- organization_id is TEXT to match Neon Auth organization ids (not necessarily UUID).

-- Progressive tenancy: nullable until backfill + enforcement.
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

ALTER TABLE client_invitations
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

ALTER TABLE client_assignments
  ADD COLUMN IF NOT EXISTS organization_id TEXT;

CREATE INDEX IF NOT EXISTS surveys_organization_id_idx
  ON surveys (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS client_invitations_organization_id_idx
  ON client_invitations (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS client_profiles_organization_id_idx
  ON client_profiles (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS client_assignments_organization_id_idx
  ON client_assignments (organization_id)
  WHERE organization_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS platform_permission (
  code TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  description TEXT NOT NULL,
  sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system_template BOOLEAN NOT NULL DEFAULT FALSE,
  template_key TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_role_template_key_unique UNIQUE (template_key)
);

CREATE INDEX IF NOT EXISTS platform_role_org_idx
  ON platform_role (organization_id)
  WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS platform_role_permission (
  role_id UUID NOT NULL REFERENCES platform_role(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES platform_permission(code) ON DELETE RESTRICT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by TEXT,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS platform_role_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES platform_role(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL
    CHECK (scope_type IN ('organization', 'platform')),
  scope_id TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_role_assignment_scope_chk CHECK (
    (scope_type = 'platform' AND scope_id IS NULL)
    OR (scope_type = 'organization' AND scope_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS platform_role_assignment_user_idx
  ON platform_role_assignment (user_id)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS platform_role_assignment_org_idx
  ON platform_role_assignment (organization_id)
  WHERE active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS platform_role_assignment_unique_idx
  ON platform_role_assignment (
    user_id,
    role_id,
    scope_type,
    COALESCE(scope_id, '')
  )
  WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS platform_rbac_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_user_id TEXT,
  organization_id TEXT,
  target_type TEXT,
  target_id TEXT,
  role_id UUID,
  permission_code TEXT,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_rbac_audit_created_idx
  ON platform_rbac_audit (created_at DESC);

CREATE INDEX IF NOT EXISTS platform_rbac_audit_org_idx
  ON platform_rbac_audit (organization_id);

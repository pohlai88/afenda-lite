-- Hot Sales Phase 2A — RBAC (additive; piglet-free; no Phase 1 drops)

CREATE TABLE IF NOT EXISTS hot_sales_permission (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  sensitive BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hot_sales_role (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system_template BOOLEAN NOT NULL DEFAULT FALSE,
  template_key TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hot_sales_role_template_key_unique UNIQUE (template_key)
);

CREATE INDEX IF NOT EXISTS hot_sales_role_active_idx
  ON hot_sales_role (active);

CREATE TABLE IF NOT EXISTS hot_sales_role_permission (
  role_id UUID NOT NULL REFERENCES hot_sales_role(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES hot_sales_permission(code) ON DELETE RESTRICT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS hot_sales_role_assignment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  role_id UUID NOT NULL REFERENCES hot_sales_role(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL
    CHECK (scope_type IN (
      'own', 'team', 'event', 'bu', 'company', 'platform'
    )),
  scope_id TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hot_sales_role_assignment_scope_id_chk CHECK (
    (scope_type IN ('platform', 'company', 'own') AND scope_id IS NULL)
    OR (scope_type IN ('team', 'event', 'bu') AND scope_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS hot_sales_role_assignment_user_idx
  ON hot_sales_role_assignment (user_id)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS hot_sales_role_assignment_role_idx
  ON hot_sales_role_assignment (role_id);

CREATE UNIQUE INDEX IF NOT EXISTS hot_sales_role_assignment_unique_idx
  ON hot_sales_role_assignment (
    user_id,
    role_id,
    scope_type,
    COALESCE(scope_id, '')
  )
  WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS hot_sales_rbac_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id UUID,
  actor_role TEXT,
  target_user_id UUID,
  role_id UUID,
  permission_code TEXT,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hot_sales_rbac_audit_created_idx
  ON hot_sales_rbac_audit (created_at DESC);

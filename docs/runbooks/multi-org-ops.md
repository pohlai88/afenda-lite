# Multi-org operations runbook (M4)

**Authority:** [doc/architecture/multi-tenant-ecosystem.md](../architecture/multi-tenant-ecosystem.md)  
**Audience:** operators applying tenancy backfills after M1–M3.

## Rules

1. **Never** stamp “first org” from `neon_auth.organization ORDER BY … LIMIT 1` when more than one Auth org exists.
2. Pass an explicit Neon Auth organization id for any script that fills null `organization_id` rows.
3. Prefer row-scoped `organization_id` already on tenant tables; fallback only when the CLI/env org is provided.

## Resolve organization id

```sql
SELECT id, name, slug, "createdAt"
FROM neon_auth.organization
ORDER BY "createdAt" ASC NULLS LAST;
```

Use the id for the tenant you intend to backfill — not Neon Cloud `NEON_ORG_ID`.

## FFT access backfill

```bash
npm run env:compose
node --env-file=.env scripts/backfill-fft-access.mjs --dry-run --organization-id=<org-uuid>
node --env-file=.env scripts/backfill-fft-access.mjs --organization-id=<org-uuid>
```

Or: `PORTAL_ORGANIZATION_ID=<org-uuid> npm run backfill:fft-access`.

If every candidate row already has `organization_id`, the flag is optional.

## Null audit

```bash
npm run audit:tenancy-nulls
```

Must report zero nulls on the eight hard tenant roots after Gate 0 / migration `027`.

## Migrations

```bash
npm run db:migrate
```

M2: `028_scoped_template_key_unique.sql` — scoped `(organization_id, template_key)` uniqueness.

## Org switcher (M1)

Local / staged multi-org chrome:

```bash
# env.config
PORTAL_ORG_SWITCHER_ENABLED=true
npm run env:compose
```

Do not enable on Vercel production until operators have a second membership and a rollback plan.

## Isolation smoke (M3)

```bash
# Always: missing UUID → not-found
npm run test:e2e:journey -- e2e/tenancy-isolation.spec.ts

# Optional foreign fixtures (cross-org):
# E2E_FOREIGN_SURVEY_ID / E2E_FOREIGN_USER_ID / E2E_FOREIGN_EVENT_ID
```

# Preview branch setup (Neon)

**Audience:** operators and release engineers  
**Purpose:** Isolate Vercel preview deployments and CI from production `neondb` (shared with Afenda ERP data).

---

## Branch topology

| Branch | ID | Use |
|--------|-----|-----|
| `production` | `br-young-term-aobkvd38` | Vercel **Production** only |
| `preview` | `br-red-dream-aoe3apvj` | Vercel **Preview**, GitHub Actions CI/E2E |

Neon project **afenda** (`snowy-dawn-60990429`), database `neondb`.

Console: [production](https://console.neon.tech/app/projects/snowy-dawn-60990429/branches/br-young-term-aobkvd38) · [preview](https://console.neon.tech/app/projects/snowy-dawn-60990429/branches/br-red-dream-aoe3apvj)

---

## Why

- Preview deploys and CI must not write to production portal tables or `neon_auth` users.
- `neondb` also holds ~249 ERP/HR tables; a preview branch isolates **writes** (snapshot still contains ERP data at fork time).
- Neon Auth is branch-scoped: each branch has its own `NEON_AUTH_BASE_URL`.

---

## 1. Vercel environment variables

Set **Preview** (not Production) in Vercel project `iam-check`:

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Neon Console → branch **preview** → Connection details → **Pooler** URI |
| `NEON_AUTH_BASE_URL` | `https://ep-flat-waterfall-ao8wh1wg.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth` |
| `NEON_AUTH_COOKIE_SECRET` | New secret (≥32 chars): `openssl rand -base64 32` — **different from production** |
| `SHARED_ADMIN_*` | Test operator credentials (can match CI) |
| `PREVIEW_CLIENT_*` | Sandbox client for operator preview (S16) |
| `APP_URL` | Leave unset on preview; Vercel sets `VERCEL_URL` |

**Production** keeps the existing `production` branch connection string and auth URL (`ep-snowy-hat-…`).

```bash
vercel env ls preview
vercel env ls production
```

---

## 2. GitHub Actions secrets

CI uses the preview branch (see `.github/workflows/ci.yml`):

| Secret | Branch |
|--------|--------|
| `DATABASE_URL_PREVIEW` | `preview` pooler URI |
| `NEON_AUTH_BASE_URL_PREVIEW` | Preview auth URL (above) |
| `NEON_AUTH_COOKIE_SECRET_PREVIEW` | Preview-only cookie secret |
| `SHARED_ADMIN_*` | Unchanged (test operator) |

Do **not** point CI `DATABASE_URL_PREVIEW` at the production branch.

---

## 3. Neon Auth trusted domains (preview branch)

Configured on branch **preview**:

- `http://localhost:3000`
- `https://iam-check.vercel.app`
- `https://*.vercel.app` (Vercel preview URLs)

Add custom preview hostnames via Neon Console or MCP `configure_neon_auth` → `add_trusted_origin`.

---

## 4. Seed preview sandbox (one-time / after reset)

From a machine with preview credentials in env:

```bash
# Point at preview branch (pooler URI from Neon Console)
export DATABASE_URL="postgresql://...@ep-flat-waterfall-...-pooler....neon.tech/neondb?sslmode=require"
export NEON_AUTH_BASE_URL="https://ep-flat-waterfall-ao8wh1wg.neonauth.c-2.ap-southeast-1.aws.neon.tech/neondb/auth"
export NEON_AUTH_COOKIE_SECRET="<preview-only-secret>"

npm run db:migrate          # idempotent; schema copied from production fork
npm run seed:admin
npm run seed:preview-client
```

Preview branch inherits production data at fork time; re-seed after `reset_from_parent` if you need a clean sandbox.

---

## 5. Protect production

In [Neon Console](https://console.neon.tech/app/projects/snowy-dawn-60990429/branches/br-young-term-aobkvd38) → branch **production** → enable **Branch protection** so automated tooling cannot drop or reset production.

---

## 6. Optional: per-PR ephemeral branches

For higher isolation, enable [Neon-Managed Vercel integration](https://neon.com/docs/guides/neon-managed-vercel-integration) (auto branch per preview, cleanup on Git branch delete). The shared `preview` branch is the minimum viable step.

---

## Verification

| Check | Expected |
|-------|----------|
| Vercel preview deploy | Uses `ep-flat-waterfall-…` pooler, not `ep-snowy-hat-…` |
| Operator login on preview | Works; session not valid on production |
| CI green | Migrations/E2E run against `DATABASE_URL_PREVIEW` |
| Production smoke | Unchanged after preview/CI activity |

---

## Related

- [production-go-live.md](./production-go-live.md)
- [S13 CI gate](../architecture/slices/s13-ci-gate.md)
- [S16 admin client preview](../architecture/slices/s16-admin-client-preview.md)

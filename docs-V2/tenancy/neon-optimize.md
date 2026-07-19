# Neon Auth + compute optimize (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/tenancy/neon-optimize.md` |
| Authority | **Scratch** — shipping / security boundary + Neon MCP (read-only) |
| Class | **A** (trusted-origin ↔ `APP_URL`) |
| Updated | 2026-07-19 |

---

## Cloud identity (non-secret)

| Item | Value |
|------|-------|
| Org | `org-fragrant-lake-90358173` |
| Project | `young-hat-54755363` · Afenda-Lite |
| Branch | `br-tiny-hill-ao82jp6f` · `production` · protected · default |
| Region | `aws-ap-southeast-1` |
| Auth host | `ep-dawn-bird-aofi3f7j.neonauth…/neondb/auth` |
| Email | Zoho SMTP · `no-reply@nexuscanon.com` |
| Other Neon project | `snowy-dawn-60990429` — **not** Lite prod; do not retarget |

---

## Trusted origins (Class A)

| Origin | Role |
|--------|------|
| `https://afenda-lite.vercel.app` | Production = `APP_URL` (canonical) |
| `https://*.vercel.app` | Preview Auth UI |
| `http://localhost:3000` | Local (`allow_localhost: true`) |
| `https://www.nexuscanon.com` | Allowlist only — see [vercel-domains.md](vercel-domains.md) A4 |

| ID | Action | Status |
|----|--------|--------|
| N1 | Remove trailing-slash dupe origin | **DONE** 2026-07-19 |
| N2 | `APP_URL` ⊆ trusted after every domain change | Standing |
| N3 | Keep `*.vercel.app` while previews use Auth UI | Standing |
| N4 | `www.nexuscanon.com` mail vs app host | Open |

**Coupling:** never edit `APP_URL` or Neon trusted origins alone.

---

## Compute posture

| Setting | Evidence |
|---------|----------|
| Autoscaling | min `0.25` · max `2` CU |
| Suspend | `0` (no scale-to-zero on prod) |
| App `DATABASE_URL` | Must use **-pooler** host |
| Tenancy | Shared schema · `organization_id` — not project-per-tenant |

**Anti-claim:** do not “fix CU” before pooler + short tx + org indexes are green. Trusted origins ≠ host→tenant.

---

## Verify

```text
Neon MCP: get_neon_auth_config · list_branch_computes · list_slow_queries
Local:    pnpm validate:neon-env · pnpm audit:neon-auth-production · pnpm check:tenancy-residue
```

No `configure_neon_auth` without a new explicit ask. Companion: [README.md](README.md) · [urls.md](urls.md) · [vercel-domains.md](vercel-domains.md).

# Tenancy + domain pack (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/tenancy/README.md` |
| Authority | **Scratch** — Neon MCP + Vercel MCP (read-only) + disk under `apps/web/**` · `packages/control-plane/auth/**` · `packages/foundation/env/**` |
| Farm | `neon-tenancy-efficiency` |
| Updated | 2026-07-19 |

No DOC-002 rows. No links into `docs/`. Re-probe MCP after domain or Neon Auth trusted-origin changes — do not treat this pack as Living SSOT.

---

## Class A / Class B matrix

| Class | Meaning | In scope this pack | Out of scope |
|-------|---------|--------------------|--------------|
| **A — Project domain hygiene** | Single Vercel project + Neon Auth trusted origins stay coherent with `APP_URL` | Inventory hosts · flag drift · keep invite/reset origins coupled | `buy_domain` · DNS mutate · `configure_neon_auth` without explicit ask |
| **B — Platforms contrast** | Document how Vercel **Platforms** host→tenant differs from Afenda shared-schema tenancy | Contrast only (Platforms middleware / custom domain per tenant vs session org) | Implement host→tenant · Edge Config tenant maps · Platforms provisioning |

**Afenda tenant binding (living product path):** Neon Auth identity + active organization → hard `organization_id` on BFF reads/writes. Host header is **not** the tenant key.

---

## Reading order

| Step | File |
|------|------|
| 1 | This README (Class A/B matrix) |
| 2 | [urls.md](urls.md) — `APP_URL` · invite vs Auth UI origin |
| 3 | [vercel-domains.md](vercel-domains.md) — project domain inventory |
| 4 | [neon-optimize.md](neon-optimize.md) — Neon Auth trusted origins + compute posture |

Companion App Router pack: [../nextjs/README.md](../nextjs/README.md). HTTP handlers: [../api/rest.md](../api/rest.md). Auth surfaces: [../auth/README.md](../auth/README.md).

---

## MCP verify (read-only)

```text
Neon plugin:   get_neon_auth_config · list_branch_computes · run_sql
Vercel plugin: list_teams · search_vercel_documentation
               (+ project MCP get_project / list_deployments if plugin project APIs 403/empty)
Live:          GET https://afenda-lite.vercel.app/api/health/liveness
```

Forbidden without an explicit user ask: `buy_domain` · `configure_neon_auth` · DNS add/remove · domain verify mutate.

# Auth + session (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/auth/README.md` |
| Authority | **Scratch** — security-and-hardening + disk `packages/auth/**` · `apps/web/proxy.ts` · `features/auth/**` |
| Updated | 2026-07-19 |

Re-probe after auth route or Neon Auth trusted-origin changes.

---

## Surfaces (disk)

| Path / file | Job |
|-------------|-----|
| `/auth/[path]` | Neon Auth UI + custom sign-in/sign-up (Path A) under `(public)` |
| `/join?invitationId=…` | Org invitation accept |
| `/client/(gate)/login` | Client gate login |
| `/api/auth/[...path]` | Neon Auth proxy (RH) |
| `/api/session/sync-cookies` | Session cookie mint / refresh |
| `/api/session/ensure-active-organization` | Active-org persistence |
| `apps/web/proxy.ts` | Document-navigation session gate + `x-correlation-id` |

---

## Session gate

- Gate via `createSessionProxy()` from `@afenda/auth`
- Bypass inventory: `apps/web/session-gate-policy.ts` (health · Neon Auth BFF · public auth)
- **Proxy alone is not authz** — every Server Action still authenticates + authorizes inside
- Matcher is a static literal array (Next compile-time parse)

---

## Mail + origins

| Flow | Delivery | Origin rule |
|------|----------|-------------|
| Password reset | Neon Auth → Zoho SMTP (`smtp.zoho.com`) — not app-side SMTP | Auth UI origin via `resolveAuthUiOrigin()` |
| Org invite | Neon Auth invitations via `@afenda/auth` (`inviteOrgMember`) | Join URL under production `APP_URL` → `/join?invitationId=…` |

Do not merge invite-link origin with Auth UI callback origin — see [../tenancy/urls.md](../tenancy/urls.md).

---

## Rate limit (auth abuse)

| Surface | Bucket | Owner |
|---------|--------|-------|
| Neon Auth BFF `POST` `/api/auth/*` | `auth_bff_post` (20 / 60s, key `IP:pathname`) | `@afenda/auth` → `@afenda/rate-limit` |
| Path A `signInAction` | `auth_sign_in` (5 / 60s, key `IP:email`) | `apps/web` → `@afenda/rate-limit` |

Outcomes: `toRateLimitAppError` → `RATE_LIMITED` (429 + `Retry-After` on BFF) or `SERVICE_UNAVAILABLE` (prod without Upstash / store fault). Store: Upstash REST when `UPSTASH_REDIS_*` set; process memory only for non-production without keys. Package README: [`packages/rate-limit`](../../packages/rate-limit/README.md). Observability: [../observability/README.md](../observability/README.md).

## Hard stops / Why

| Stop | Why |
|------|-----|
| No second IdP | Neon Auth is the identity plane |
| No dormant Portal Atmosphere restore | Production shell is Neon Auth UI + Studio login DNA |
| Authz inside every `'use server'` | Actions are public endpoints |
| No `middleware.ts` invent | Edge file is `proxy.ts` |
| No `configure_neon_auth` without ask | Trusted origins are Class A — [../tenancy/](../tenancy/README.md) |
| No VietERP ioredis / Express middleware port | Afenda store = Upstash REST or memory only (`_reference/packages/rate-limit` is DNA, not runtime) |

---

## Verify

```text
1. pnpm validate:neon-env
2. Disk: apps/web/proxy.ts · session-gate-policy.ts · app/(public)/auth · app/(public)/join
3. Live: GET https://afenda-lite.vercel.app/api/health/liveness
4. MCP (read-only): get_neon_auth_config — trusted_origins ↔ APP_URL
```

Companion: [../tenancy/README.md](../tenancy/README.md) · [../api/rest.md](../api/rest.md) · [../discipline/README.md](../discipline/README.md).

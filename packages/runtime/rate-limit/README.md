# `@afenda/rate-limit`

Rank-1 Platform abuse limiter for Afenda-Lite: shared sliding-window checks for Neon Auth BFF POSTs and Path A credential sign-in. Outcomes map to `@afenda/errors` via `toRateLimitAppError` — this package does not own HTTP status lines, `NextResponse`, or Action envelopes.

Use this package from `@afenda/auth` BFF handlers and `apps/web` credential Actions when a request must be allowed, delayed (`RATE_LIMITED` + `retryAfter`), or fail closed (`SERVICE_UNAVAILABLE` when Upstash is required but missing). Maintainers run lint / typecheck / Vitest via the filter scripts below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

Declaration and FFT product surfaces are removed from this checkout — no buckets for those modules.

## Consume

Workspace dependency — import from the root barrel:

```ts
import { checkRateLimit, toRateLimitAppError } from "@afenda/rate-limit";

const result = await checkRateLimit({
  bucket: "auth_sign_in",
  key: email,
});
if (!result.ok) {
  throw toRateLimitAppError(result);
}
```

`key` is an opaque composite identity (email, `org:user`, IP+path). Never log secrets. Empty/whitespace keys are treated as rate-limited (60s retry, `quota.limit = 0`).

Successful and `rate_limited` results include `quota: { limit, remaining, resetEpochMs }` for `X-RateLimit-*` attach via `@afenda/http` `applyRateLimitHeaders`. `unavailable` has no quota.

**Living consumers:** `@afenda/auth` (`auth_bff_post` on BFF POSTs — stamps RateLimit headers on Response); `apps/web` Path A sign-in Action (`auth_sign_in` keyed by email). Map `AppError` to product `ActionResult` / HTTP at the adapter — do not invent `{ success, data }` envelopes.

## Store

| Runtime | Backend |
|---------|---------|
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set | `@upstash/ratelimit` (shared across Vercel isolates) |
| Non-production (`VERCEL_ENV` ≠ `production`), no Upstash | Process-local memory sliding window |
| Vercel production (`VERCEL_ENV=production`), no Upstash | Fail closed (`unavailable` → `serviceUnavailable`) |

Env keys via `@afenda/env` only. No foreign Redis clients outside Upstash REST.

## Buckets

| Bucket | Limit / window | Typical key |
|--------|----------------|-------------|
| `auth_bff_post` | 20 / 60s | `IP:pathname` |
| `auth_sign_in` | 5 / 60s | `IP:email` (email lowercased; missing → `_invalid`) |

Callers never pass limit/window — policy lives in `BUCKET_POLICIES`. Resolved store throws (Upstash/network): production → `unavailable` / `SERVICE_UNAVAILABLE` (fail closed); non-production → process-memory fallback.

## Maintain

```bash
pnpm --filter @afenda/rate-limit lint
pnpm --filter @afenda/rate-limit typecheck
pnpm --filter @afenda/rate-limit test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `@afenda/rate-limit` | `checkRateLimit` · `toRateLimitAppError` · `BUCKET_POLICIES` / `bucketPolicy` · `RATE_LIMIT_BUCKETS` · `resolveRateLimitBackend` · `createMemoryRateLimitStore` · `RateLimitQuota` (+ types) |

`createMemoryRateLimitStore` and `checkRateLimit(..., { store })` are for Vitest injection. `resetResolvedRateLimitBackend` clears the process cache between tests. Production callers omit `store` and use the resolved backend.

## Ownership

| Surface | Owner |
|---------|-------|
| Bucket policies · store resolve · `checkRateLimit` · `toRateLimitAppError` | `@afenda/rate-limit` |
| `RATE_LIMITED` / `SERVICE_UNAVAILABLE` vocabulary + factories | [`@afenda/errors`](../errors/README.md) |
| Upstash URL/token schema | `@afenda/env` |
| BFF POST limit call sites | `@afenda/auth` |
| Path A sign-in Action + ActionResult mapping | `apps/web` |

**Layer:** Rank-1 Platform (`@afenda/env` · `@afenda/errors` · Upstash). Must not import Surfaces or `apps/*`. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md).

## Out of scope

Do not add to this package: Next.js handlers, ActionResult envelopes, OpenAPI document ownership, foreign Redis SDKs, declaration/FFT buckets, UI/locale copy, or a second tenancy model (shared schema · organization-scoped rows only — never multi-DB / project-per-tenant isolation).

## Authority

| Topic | Link |
|-------|------|
| Auth / Neon Auth BFF · Path A sign-in | [docs-V2/auth](../../docs-V2/auth/README.md) |
| Error vocabulary (`rateLimited` · `serviceUnavailable`) | [`@afenda/errors`](../errors/README.md) |
| Package DAG | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Agent checkout posture | [AGENTS.md](../../AGENTS.md) |

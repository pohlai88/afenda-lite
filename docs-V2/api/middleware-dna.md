# API middleware DNA (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/api/middleware-dna.md` |
| Authority | **Scratch** — api-and-interface-design · monorepo-discipline + disk `@afenda/{http,security,rate-limit,errors}` |
| Source DNA | `_reference/packages/api-middleware` (`@vierp/api-middleware`) — read-only historical; not a product package |
| Updated | 2026-07-20 |

Borrow/reject matrix for Fetch RH pipeline concerns. Living wire shapes stay in [README.md](README.md) · [rest.md](rest.md).

---

## Verdict

**Do not create `@afenda/api-middleware`.** Concerns stay split across Rank-1 leaves + a thin web adapter. Do not port the Vierp god-file, `{ success, data }` envelope, header-trust identity, in-memory Map limiter as product store, or Prisma helpers.

| Concern | Owner |
|---------|-------|
| Compose · `x-correlation-id` · pagination · `Retry-After` · `X-RateLimit-*` · `Server-Timing` · `withHttpContext` / `stampHttpResponse` | [`@afenda/http`](../../packages/runtime/http/README.md) |
| Security headers · CSP · CORS allow-list / preflight | [`@afenda/security`](../../packages/runtime/security/README.md) |
| Abuse limit store · buckets · `checkRateLimit` (+ quota) | [`@afenda/rate-limit`](../../packages/runtime/rate-limit/README.md) |
| `AppError` · ActionResult · RH `{ data }` / `{ error }` | [`@afenda/errors`](../../packages/foundation/errors/README.md) · web `jsonData` / `jsonError` |
| RH onion adapter (correlation + Server-Timing + optional CORS) | `apps/web/modules/platform/api/route-pipeline.ts` |
| Auth BFF rate-limit headers + Server-Timing | [`@afenda/auth`](../../packages/control-plane/auth/README.md) `createAuthApiHandlers` |
| Session gate | `apps/web/proxy.ts` + `@afenda/auth` |

---

## Shipped from DNA (do once)

| Idea | Disk |
|------|------|
| Onion `compose` + double-`next` | `packages/runtime/http/src/compose.ts` |
| Correlation SSOT | `x-correlation-id` via `createHttpContext` / `stampHttpResponse` |
| `X-RateLimit-Limit` / `Remaining` / `Reset` | Store quota → `applyRateLimitHeaders` → auth BFF POST |
| `Server-Timing` (not `x-response-time`) | `applyServerTimingHeader` · health via `createPlatformRouteHandler` · auth BFF |
| Pagination clamp | `extractPagination` → Drizzle `{ limit, offset }` |
| `Retry-After` | `applyRetryAfterHeader` · `jsonError` / auth BFF 429 |
| CORS + preflight builders | `@afenda/security` · opt-in via `createPlatformRouteHandler({ cors })` |
| Security headers / CSP | `securityHeadersForNext` · living `apps/web/next.config.ts` |

---

## Reject (do not port)

| Pattern | Why |
|---------|-----|
| `@afenda/api-middleware` monolith | Breaks Rank-1 leaf DAG |
| `{ success, data }` / `successResponse` | Forbidden — ActionResult / RH envelopes only |
| Header-trust `x-user-id` / `x-tenant-id` | Spoofable; Neon session + org tenancy |
| Product in-memory `Map` + `setInterval` as the only limiter | Vercel multi-instance — Upstash is production store |
| `toPrismaArgs` | Afenda is Drizzle |
| Hand-rolled validation sold as Zod | Stub-quality contract |
| `skipSecurity` / `skipRateLimit` dual paths | Insecure defaults |
| `*` CORS + credentials | Spec-dangerous; security package bans wildcard |
| Dual `x-request-id` + `x-trace-id` | Conflicts with `x-correlation-id` SSOT |
| Default locale `vi` / hardcoded product copy | Wrong product defaults |

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| No product `@afenda/api-middleware` | Leaf ownership + DAG already encode the DNA |
| No `_reference` upload to `@afenda/docs` / Vercel | Official docs must not ship historical trees |
| No Collapse/Vierp package rename into `@afenda/*` | Greenfield names only |

---

## Verify

```text
1. Test-Path packages/runtime/http · packages/runtime/security · packages/runtime/rate-limit · packages/foundation/errors (present)
2. Test-Path packages/api-middleware → False
3. rg "@afenda/api-middleware" apps packages — ban mentions in Scratch/README only
4. pnpm --filter @afenda/http test
5. pnpm --filter @afenda/rate-limit test
6. pnpm --filter @afenda/auth test -- api-handler
7. pnpm --filter @afenda/web test -- api-health-routes
```

Companion: [README.md](README.md) · [rest.md](rest.md) · [../monorepo/README.md](../monorepo/README.md) · [../observability/README.md](../observability/README.md).

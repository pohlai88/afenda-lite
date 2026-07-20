# `@afenda/http`

**What it is** — Rank-1 Platform Fetch helpers for Afenda-Lite: correlation identity, middleware composition, list pagination parse, and response header attach (`Retry-After`, `X-RateLimit-*`, `Server-Timing`).

**What it does** — Mints and validates `x-correlation-id`, builds `HttpContext` from a `Request`, runs a Fetch middleware onion via `compose`, clamps query pagination to Drizzle-shaped `{ limit, offset }`, stamps correlation + `Server-Timing` via `withHttpContext` / `stampHttpResponse`, and sets `Retry-After` / `X-RateLimit-*` when callers have quota or retry seconds.

**When you need it** — Proxy / Actions / Route Handlers that must propagate correlation, attach rate-limit or timing headers onto Fetch `Headers`, or parse list query params without inventing a second wire envelope.

**Who it's for** — Package consumers in `apps/web` (and future apps). Next-free leaf: no `@afenda/*` runtime deps, no `NextResponse`, no `{ success, data }` envelopes (use [`@afenda/errors`](../errors/README.md) + web JSON adapters).

## Consume

Workspace dependency — import from the root barrel:

```ts
import {
	CORRELATION_HEADER,
	applyRateLimitHeaders,
	applyRetryAfterHeader,
	compose,
	createCorrelationId,
	createHttpContext,
	extractPagination,
	resolveCorrelationId,
	withHttpContext,
} from "@afenda/http";

const ctx = createHttpContext(request);
const page = extractPagination(request);

const headers = new Headers();
applyRetryAfterHeader(headers, 30);
applyRateLimitHeaders(headers, {
	limit: 20,
	remaining: 17,
	resetEpochMs: Date.now() + 60_000,
});
headers.set(CORRELATION_HEADER, ctx.correlationId);

export const GET = withHttpContext(async (_req, httpCtx) => {
	return new Response("ok", {
		headers: { [CORRELATION_HEADER]: httpCtx.correlationId },
	});
});
```

`createCorrelationId` / `resolveCorrelationId` are the living API-007 helpers (promoted from the former web observability module). Prefer a valid inbound UUID; otherwise mint.

**Living consumers:** `apps/web/proxy.ts` and critical Actions (correlation); health RHs via `createPlatformRouteHandler` (`withHttpContext` + `Server-Timing`); auth BFF (`applyRateLimitHeaders` · `Server-Timing`); `apps/web/modules/platform/api/json-response.ts` (`applyRetryAfterHeader` on `jsonError`). RH `{ data }` / `{ error }` bodies stay on `@afenda/errors` + web adapters — do not invent tutorial envelopes here.

## Maintain

```bash
pnpm --filter @afenda/http lint
pnpm --filter @afenda/http typecheck
pnpm --filter @afenda/http test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `@afenda/http` | `CORRELATION_HEADER` · `isCorrelationId` · `resolveCorrelationId` · `createCorrelationId` · `createHttpContext` · `compose` · `withHttpContext` · `stampHttpResponse` · `extractPagination` · `DEFAULT_PAGE_LIMIT` / `MAX_PAGE_LIMIT` · `applyRetryAfterHeader` · `applyRateLimitHeaders` · `applyServerTimingHeader` (+ header name constants / types) |

Full surface: [`src/index.ts`](./src/index.ts).

## Ownership

| Surface | Owner |
|---------|-------|
| Correlation mint / header · compose · pagination · Retry-After / RateLimit / Server-Timing attach | `@afenda/http` |
| Error codes · HTTP error body · `retryAfterSeconds` details parse | [`@afenda/errors`](../errors/README.md) |
| RH `NextResponse` JSON (`jsonData` / `jsonError`) | `apps/web/modules/platform/api/json-response.ts` |
| Upstash / memory rate-limit store | [`@afenda/rate-limit`](../rate-limit/README.md) |
| Security headers · CSP · CORS builders | [`@afenda/security`](../security/README.md) |

**Layer:** Rank-1 Platform **leaf** (no `@afenda/*` runtime deps). Must not import Surfaces or `apps/*`. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md).

## Out of scope

Do not add to this package: Next.js handlers, ActionResult / `{ success, data }` envelopes, in-memory rate limiters, CORS/CSP/security-header maps (→ `@afenda/security`), Prisma helpers, header-trust “auth”, Zod body validators, or a second correlation header name. Do **not** grow this leaf into a Vierp-style `@afenda/api-middleware` god package — borrow/reject SSOT: [docs-V2/api/middleware-dna.md](../../docs-V2/api/middleware-dna.md).

## Authority

| Topic | Link |
|-------|------|
| Correlation / observability | [docs-V2/observability](../../docs-V2/observability/README.md) |
| ActionResult / RH envelopes | [docs-V2/api](../../docs-V2/api/README.md) · [`@afenda/errors`](../errors/README.md) |
| Package DAG | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Agent checkout posture | [AGENTS.md](../../AGENTS.md) |

# `@afenda/logger`

Rank-1 Platform structured logger: **Pino on Node**, edge-safe console emit for `proxy` / middleware, and a closed `logProductEvent` allowlist. Node and edge share allowlisted fields and the ISO `time` key — **without** Next.js, APM SDKs, or auto access-log middleware.

Use this package when Actions, BFF handlers, or the edge session gate need filterable JSON on stdout (Vercel / local turbo). Pass `correlationId` explicitly (or via `logger.child`); do not invent Sentry/Datadog/OpenTelemetry here. Maintainers run lint / typecheck / Vitest via the filter scripts below (Node `24.x`, pnpm `≥10.33.4` from the repo root `engines`).

## Consume

Workspace dependency — import by export path:

```ts
import { createLogger, logProductEvent } from "@afenda/logger";

const log = createLogger({ service: "afenda-auth-bff" });
log.child({ correlationId }).error({
  event: "auth_bff.unexpected_error",
  path: pathname,
  method: "POST",
});

logProductEvent({
  level: "info",
  event: "org_role.assign.ok",
  correlationId,
  orgId,
});
```

Edge (no Node streams / no Pino):

```ts
import { logProductEvent } from "@afenda/logger/edge";
```

**Living consumers:** `apps/web` (Actions + `modules/platform/observability/product-log` re-export; `proxy.ts` uses `@afenda/logger/edge`); `@afenda/auth` BFF unexpected-error path via `createLogger`.

**Product event allowlist:** `level` · `event` · `correlationId` · optional `orgId` · `actorUserId` · `path` · `code`. Never log secrets, tokens, SQL, stacks, or full request bodies.

## Maintain

```bash
pnpm --filter @afenda/logger lint
pnpm --filter @afenda/logger typecheck
pnpm --filter @afenda/logger test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `@afenda/logger` | `createLogger` (Pino), `logProductEvent`, `DEFAULT_REDACT_PATHS`, types |
| `@afenda/logger/edge` | Edge-safe `logProductEvent` + `createEdgeLogger` — no `pino` import |

## Ownership

| Surface | Owner |
|---------|-------|
| Pino factory · product allowlist · redact paths · edge emit | `@afenda/logger` |
| Correlation mint / header (`x-correlation-id`) | `@afenda/http` |
| When to emit product events | Call-site Actions / BFF / proxy |

**Layer:** Rank-1 Platform **leaf** (`pino` only; no `@afenda/*` runtime deps). Must not import Surfaces or `apps/*`. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md).

## Out of scope

Do not add to this package: Next.js handlers, `pino-http` auto access logs, AsyncLocalStorage request middleware, `pino-pretty` as a runtime dep, OTel/Sentry/Datadog SDKs, or open metadata bags on `logProductEvent`.

## Authority

| Topic | Link |
|-------|------|
| Correlation · product logs · ops path | [docs-V2/observability](../../docs-V2/observability/README.md) |
| Package DAG / leaf rules | [docs-V2/monorepo](../../docs-V2/monorepo/README.md) · [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md) |
| Agent checkout posture | [AGENTS.md](../../AGENTS.md) |

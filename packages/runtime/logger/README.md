# `@afenda/logger`

Canonical structured logging kernel for Afenda runtimes. One field and redaction policy drives the Node/Pino and edge/console projections while the package remains a Rank-1 leaf with no `@afenda/*` runtime dependencies.

## Consume

Use the same capability in either deployment context:

```ts
import { logger } from "@afenda/logger";

logger.event(
  {
    level: "error",
    event: "auth_bff.unexpected_error",
    correlationId,
    path: pathname,
    method: "POST",
  },
  { service: "afenda-auth-bff" },
);
```

Edge code selects the isolated projection; its event contract is identical and its import graph contains no Pino or Node modules:

```ts
import { logger } from "@afenda/logger/edge";
```

`correlationId` is mandatory. `@afenda/http` owns minting, validation, and the `x-correlation-id` transport header; logger only carries the canonical value.

## Canonical fields

Every event contains `level`, `event`, and `correlationId`. Optional fields are `orgId`, `actorUserId`, `path`, `method`, `module`, and canonical `code`. Consumers cannot attach open request bodies, stacks, SQL, vendor objects, or arbitrary metadata.

The package owns sensitive-name matching and the `[redacted]` censor through `logger.redactFieldValue(name, value)`. Node/Pino redact paths derive from the same policy used by the edge-safe capability. Consumers must not maintain credential-name or censor maps.

## Exports

| Path | Projection |
|------|------------|
| `@afenda/logger` | `logger` capability backed by Pino |
| `@afenda/logger/edge` | Identical `logger` capability backed by JSON console emission |

The removed constructor, standalone product-event function, public redact-path array, and app-local re-export are not compatibility surfaces.

## Ownership

| Concern | Owner |
|---------|-------|
| Structured field registry · redaction · timestamp/service/level projection | `@afenda/logger` |
| Correlation minting and HTTP header policy | `@afenda/http` |
| Event names, canonical codes, domain context, and when to emit | Calling domain |
| Node/edge composition choice | Deployment entrypoint import |

## Maintain

```bash
pnpm --filter @afenda/logger lint
pnpm --filter @afenda/logger typecheck
pnpm --filter @afenda/logger typecheck:contract
pnpm --filter @afenda/logger test
pnpm check:logger-boundary
pnpm test:logger-boundary
```

## Boundaries

- Runtime dependencies: `pino` only; no `@afenda/*`, Next.js, surfaces, apps, APM, or OpenTelemetry.
- `@afenda/logger/edge` must remain Pino/Node-free.
- No AsyncLocalStorage, HTTP middleware, correlation minting, or open metadata bags.
- Consumers import declared package exports only and do not import Pino directly.

Authority: [observability](../../../docs-V2/observability/README.md) · [monorepo](../../../docs-V2/monorepo/README.md) · [AGENTS.md](../../../AGENTS.md).

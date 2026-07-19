# `@afenda/logger`

Platform structured logger: **Pino on Node**, edge-safe console emit for proxy/middleware, closed `logProductEvent` allowlist. No APM SDKs.

## Consume

```ts
import { createLogger, logProductEvent } from "@afenda/logger";

const log = createLogger({ service: "afenda-auth-bff" });
log.error({
  event: "auth_bff.unexpected_error",
  correlationId,
  path: pathname,
});

logProductEvent({
  level: "info",
  event: "org_role.assign.ok",
  correlationId,
  orgId,
});
```

Edge (no Node streams):

```ts
import { logProductEvent } from "@afenda/logger/edge";
```

## Maintain

```bash
pnpm --filter @afenda/logger lint
pnpm --filter @afenda/logger typecheck
pnpm --filter @afenda/logger test
```

## Exports

| Path | Role |
|------|------|
| `@afenda/logger` | `createLogger` (Pino), `logProductEvent`, types, redact paths |
| `@afenda/logger/edge` | Edge-safe `logProductEvent` + `createEdgeLogger` |

**Layer:** Rank-1 Platform leaf (`pino` only). Must not import Surfaces or `apps/*`.

# Observability (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/observability/README.md` |
| Authority | **Scratch** — observability-and-instrumentation + disk `modules/platform/observability/**` |
| Updated | 2026-07-20 |

Thin operator path: correlate → health → logs. Not a metrics-platform design.

---

## Correlation

| Item | Disk |
|------|------|
| Header | `x-correlation-id` (`CORRELATION_HEADER`) |
| Resolve | `resolveCorrelationId(inbound)` — valid UUID or mint |
| Edge | `apps/web/proxy.ts` stamps correlation on gate responses |
| Actions | Unexpected fail → `actionFailInternal(message, correlationId)` — `details` = `{ correlationId }` only |

Path: `apps/web/modules/platform/observability/correlation.ts`.

---

## Structured product logs

`@afenda/logger` — Pino on Node; `@afenda/logger/edge` for `proxy.ts`. Closed `logProductEvent` allowlist (`service: "afenda-web"` default).

| Allowed fields | Forbidden |
|----------------|-----------|
| `level` · `event` · `correlationId` · optional `orgId` · `actorUserId` · `path` · `code` | Secrets · tokens · SQL · stacks · full request bodies |

Paths: `packages/logger` · web re-export `modules/platform/observability/product-log.ts` · edge import in `proxy.ts`.

---

## Health probes

| Path | Job |
|------|-----|
| `GET /api/health/liveness` | Process up |
| `GET /api/health/readiness` | Deps ready |

Domain helpers: `modules/platform/domain/health.ts` · schemas `modules/platform/schemas/health.ts`.

---

## Where to read logs (ops)

```text
1. Local: next / turbo stdout (JSON lines with correlationId)
2. Prod:  vercel logs --environment production --source serverless --since 1h
3. MCP:   Vercel get_runtime_logs / get_runtime_errors (when project APIs available)
```

Filter by `correlationId` from Action failure `details` or response header.

### Rate-limited responses (429)

`@afenda/rate-limit` denials map via `toRateLimitAppError` → `RATE_LIMITED` / `SERVICE_UNAVAILABLE` (+ `Retry-After` on Route Handlers). Living surfaces: auth BFF POST (`auth_bff_post`) · Path A `signInAction` (`auth_sign_in`, key `IP:email`). Limited paths log allowlisted fields only: `event` · `correlationId` · `path` · `code`. Store: Upstash when configured; process memory for non-production without keys; store throws fail closed as unavailable.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| No vendor APM SDK invent | stdout JSON + Vercel logs; Pino only via `@afenda/logger` (not direct app dep) |
| No secrets in log fields | Redaction-safe contract |
| No skip correlation on gate/Action fails | Needed to join edge + action evidence |

---

## Verify

```text
1. Disk: packages/logger · modules/platform/observability/{correlation,product-log}.ts
2. Live: GET /api/health/liveness → 200
3. After a fail: Action details.correlationId ↔ vercel logs / stdout
```

Companion: [../api/README.md](../api/README.md) · [../deploy/README.md](../deploy/README.md) · [../auth/README.md](../auth/README.md).

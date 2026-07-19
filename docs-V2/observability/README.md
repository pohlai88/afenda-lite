# Observability (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/observability/README.md` |
| Authority | **Scratch** — observability-and-instrumentation + disk `modules/platform/observability/**` |
| Updated | 2026-07-20 |

Thin operator path: correlate → health → logs → **Prometheus scrape**. No vendor APM / OpenTelemetry — scrape DNA: [metrics-dna.md](metrics-dna.md).

---

## Correlation

| Item | Disk |
|------|------|
| Header | `x-correlation-id` (`CORRELATION_HEADER`) |
| Resolve | `resolveCorrelationId(inbound)` — valid UUID or mint |
| Edge | `apps/web/proxy.ts` stamps correlation on gate responses |
| Actions | Unexpected fail → `actionFailInternal(message, correlationId)` — `details` = `{ correlationId }` only |

Path: `@afenda/http` (`packages/http` — `CORRELATION_HEADER` · `resolveCorrelationId` · `createCorrelationId`).

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
| `GET /api/health/liveness` | Process up (**200**) |
| `GET /api/health/readiness` | Deps ready (**200** ready/degraded; **503** when `not_ready` / storage down) |

Runtime SSOT: `@afenda/admin/health` (re-exported via `modules/platform/domain/health.ts`). OpenAPI wire Zod: `modules/platform/schemas/health.ts`.

---

## Prometheus scrape

| Item | Disk |
|------|------|
| Package | `@afenda/metrics` — registry · HTTP/DB/cache instruments · `renderPrometheusText` |
| Scrape | `GET /api/metrics` — bearer `METRICS_SCRAPE_TOKEN` (fail closed when unset → **404**) |
| HTTP record | `createPlatformRouteHandler({ routeTemplate })` → `recordHttpRequest` |
| Not this | `@afenda/http` `Server-Timing` (per-response header) · vendor APM / OTEL |

DNA absorb/reject: [metrics-dna.md](metrics-dna.md).

---

## Where to read logs (ops)

```text
1. Local: next / turbo stdout (JSON lines with correlationId)
2. Prod:  vercel logs --environment production --source serverless --since 1h
3. MCP:   Vercel get_runtime_logs / get_runtime_errors (when project APIs available)
```

Filter by `correlationId` from Action failure `details` or response header.

### Rate-limited responses (429)

`@afenda/rate-limit` denials map via `toRateLimitAppError` → `RATE_LIMITED` / `SERVICE_UNAVAILABLE` (+ `Retry-After` on Route Handlers). Allowed and rate-limited BFF responses also stamp `X-RateLimit-Limit` / `Remaining` / `Reset` from the store quota. Living surfaces: auth BFF POST (`auth_bff_post`) · Path A `signInAction` (`auth_sign_in`, key `IP:email`). Limited paths log allowlisted fields only: `event` · `correlationId` · `path` · `code`. Store: Upstash when configured; process memory for non-production without keys; store throws fail closed as unavailable.

Health RHs and auth BFF also emit `Server-Timing` (`health_*` / `auth_bff` metrics) via `@afenda/http` — not a second correlation header.

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| No vendor APM / OTEL SDK invent | stdout JSON + Vercel logs + Prometheus scrape; Pino only via `@afenda/logger` (not direct app dep) |
| No open `/api/metrics` without token | Fail closed — unset `METRICS_SCRAPE_TOKEN` → 404 |
| No secrets in log fields | Redaction-safe contract |
| No skip correlation on gate/Action fails | Needed to join edge + action evidence |

---

## Verify

```text
1. Disk: packages/logger · packages/metrics · modules/platform/observability/product-log.ts
2. Live: GET /api/health/liveness → 200
3. After a fail: Action details.correlationId ↔ vercel logs / stdout
4. Authorized GET /api/metrics → Prometheus text (token from METRICS_SCRAPE_TOKEN)
```

Companion: [metrics-dna.md](metrics-dna.md) · [../api/README.md](../api/README.md) · [../deploy/README.md](../deploy/README.md) · [../auth/README.md](../auth/README.md).

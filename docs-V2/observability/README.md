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

Path: `@afenda/http` (`packages/runtime/http` — `CORRELATION_HEADER` · `resolveCorrelationId` · `createCorrelationId`).

---

## Structured product logs

`@afenda/logger` — one `logger.event` capability with Pino on Node and an isolated `@afenda/logger/edge` console projection (`service: "afenda-web"` default). Both projections derive fields and redaction from the same canonical policy.

| Allowed fields | Forbidden |
|----------------|-----------|
| `level` · `event` · `correlationId` · optional `orgId` · `actorUserId` · `path` · `method` · `module` · `code` | Secrets · tokens · SQL · stacks · full request bodies · open metadata |

Paths: `packages/runtime/logger` · direct package consumers in Actions/auth · edge import in `proxy.ts`.

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
| Package | `@afenda/metrics` — private registry/names/labels · root `metrics.record` and `metrics.exposition` capabilities |
| Scrape | `GET /api/metrics` — bearer `METRICS_SCRAPE_TOKEN` (fail closed when unset → **404**) |
| HTTP record | `createPlatformRouteHandler({ routeTemplate })` → `metrics.record.http` |
| Not this | `@afenda/http` `Server-Timing` (per-response header) · vendor APM / OTEL |

DNA absorb/reject: [metrics-dna.md](metrics-dna.md).

**Not this pack:** org usage-position matrix (`@afenda/admin/usage` capacity bands) — see [../usage/README.md](../usage/README.md). That is product org-console telemetry, not Prometheus scrape.

---

## Where to read logs (ops)

```text
1. Local: next / turbo stdout (JSON lines with correlationId)
2. Prod:  vercel logs --environment production --source serverless --since 1h
3. MCP:   Vercel get_runtime_logs / get_runtime_errors (when project APIs available)
```

Filter by `correlationId` from Action failure `details` or response header.

### Rate-limited responses (429)

`@afenda/rate-limit` returns opaque decisions. Consumers request canonical failure, quota, and diagnostics through `rateLimit.project`; `@afenda/errors` supplies `RATE_LIMITED` / `SERVICE_UNAVAILABLE` and `Retry-After`, while `@afenda/http` serializes `X-RateLimit-*`. Living surfaces are auth BFF POST, Path A sign-in/dev-login, and authenticated AI chat. Keys, limits, windows, reset bounds, and Upstash normalization remain private to the package.

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
1. Disk: packages/runtime/logger · packages/runtime/metrics · modules/platform/observability/product-log.ts
2. Live: GET /api/health/liveness → 200
3. After a fail: Action details.correlationId ↔ vercel logs / stdout
4. Authorized GET /api/metrics → Prometheus text (token from METRICS_SCRAPE_TOKEN)
```

Companion: [metrics-dna.md](metrics-dna.md) · [../usage/README.md](../usage/README.md) · [../api/README.md](../api/README.md) · [../deploy/README.md](../deploy/README.md) · [../auth/README.md](../auth/README.md).

# Metrics DNA (scratch)

| Field | Value |
|-------|-------|
| Surface | `docs-V2/observability/metrics-dna.md` |
| Authority | **Scratch** — observability-and-instrumentation · monorepo-discipline + disk `@afenda/metrics` |
| Source DNA | `_reference/packages/metrics` (`@vierp/metrics`) — read-only historical; not a product package |
| Updated | 2026-07-20 |

Borrow/reject matrix for Prometheus scrape metrics. Operator path: [README.md](README.md).

---

## Verdict

**Create `@afenda/metrics` as a Rank-1 Platform leaf** (`prom-client` pull). Absorb registry + predeclared instruments + scrape text. Do **not** port Pages `withMetrics`, Prisma `$use`, NATS counters, raw `req.url` labels, or OpenTelemetry / vendor APM SDKs.

| Concern | Owner |
|---------|-------|
| Registry · instruments · `record*` · `renderPrometheusText` | [`@afenda/metrics`](../../packages/runtime/metrics/README.md) |
| Fail-closed scrape RH (`GET /api/metrics` + bearer) | `apps/web/app/api/metrics/route.ts` |
| HTTP timing record on platform RHs | `apps/web/modules/platform/api/route-pipeline.ts` |
| Request-header latency (`Server-Timing`) | [`@afenda/http`](../../packages/runtime/http/README.md) — **not** a second scrape surface |
| Structured logs | [`@afenda/logger`](../../packages/runtime/logger/README.md) |

---

## Shipped from DNA (do once)

| Idea | Disk |
|------|------|
| Dedicated Prometheus `Registry` | `packages/runtime/metrics/src/registry.ts` |
| `collectDefaultMetrics` (Node) | factory default (`collectDefaults: true`) |
| HTTP duration histogram + request counter | `http_request_duration_seconds` · `http_request_total` |
| DB query duration histogram | `db_query_duration_seconds` (labels: `operation`, `table`) |
| Cache access counter | `cache_access_total` (labels: `operation`, `result`) |
| Shared `service` label (was `app`) | all instruments; default `afenda-web` |
| Histogram bucket starting points | HTTP / DB constants in `instruments.ts` |
| Scrape text helper | `renderPrometheusText()` + `PROMETHEUS_CONTENT_TYPE` |

---

## Reject (do not port)

| Pattern | Why |
|---------|-----|
| Pages `withMetrics` / `res.end` monkey-patch | Afenda is App Router + Fetch `Response` |
| `withPrismaMetrics` / `any` | Afenda is Drizzle; coding-discipline bans product `any` |
| `natsEventTotal` | Not in Afenda stack |
| `route = req.url` | Cardinality bomb — use route **templates** only |
| `prom-client: *` | Pin via pnpm `catalog:` |
| Deep `@pkg/src/...` imports | Public `exports` only |
| OpenTelemetry / vendor APM SDK | Observability hard stop — Prometheus pull only this slice |
| Module-only singleton with no test isolation | Factory + default registry |
| Soft-fail `console.warn` wrappers | Fail closed; no silent degrade |
| `organization_id` / tenant Prometheus labels | Tenancy stays out of scrape cardinality |

---

## Hard stops / Why

| Stop | Why |
|------|-----|
| No vendor APM / OTEL invent | stdout JSON + Vercel logs + Prometheus scrape only |
| No open scrape without `METRICS_SCRAPE_TOKEN` | Fail closed — unset token → 404 |
| No Next.js inside `@afenda/metrics` | Leaf stays portable; web owns RH adapter |
| No `_reference` upload to `@afenda/docs` / Vercel | Official docs must not ship historical trees |

---

## Verify

```text
1. Test-Path packages/runtime/metrics (present)
2. Test-Path packages/api-middleware → False
3. pnpm --filter @afenda/metrics test
4. pnpm --filter @afenda/web test -- api-metrics-route api-health-routes auth-paths.inventory
5. Authorized GET /api/metrics → Prometheus text (after a health hit → route="/api/health/liveness")
```

Companion: [README.md](README.md) · [../api/rest.md](../api/rest.md) · [../monorepo/README.md](../monorepo/README.md) · [../api/middleware-dna.md](../api/middleware-dna.md).

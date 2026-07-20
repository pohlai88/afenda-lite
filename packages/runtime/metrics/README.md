# `@afenda/metrics`

**What it is** — Rank-1 Platform Prometheus metrics leaf for Afenda-Lite: dedicated registry, predeclared HTTP/DB/cache instruments, and scrape text rendering via `prom-client`.

**What it does** — Builds an isolated (or process-default) registry, optionally collects Node default metrics, records low-cardinality counters/histograms, and renders Prometheus exposition text for a scrape endpoint.

**When you need it** — Node Route Handlers or platform adapters that must emit aggregate RED-style metrics without inventing a vendor APM / OpenTelemetry stack.

**Who it's for** — `apps/web` (scrape RH + route-pipeline recording). Next-free leaf: no `@afenda/*` runtime deps, no Pages/Prisma wrappers, no org-id labels.

## Consume

**Runtime isolation via subpath exports** — `prom-client` is Node-only and must not be bundled into Edge runtimes. This package exposes three entry points:

- **`@afenda/metrics/core`** — Universal contracts (types, constants, validation) with no runtime dependencies
- **`@afenda/metrics/node`** — Prometheus implementation for Node.js Route Handlers
- **`@afenda/metrics/testing`** — Test utilities (registry reset)

**Node Route Handler example:**

```ts
import {
	PROMETHEUS_CONTENT_TYPE,
	recordHttpRequest,
	renderPrometheusText,
} from "@afenda/metrics/node";

// Explicitly declare Node runtime
export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
	recordHttpRequest({
		method: "GET",
		routeTemplate: "/api/health/liveness",
		statusCode: 200,
		durationSeconds: 0.012,
	});

	const body = await renderPrometheusText();
	return new Response(body, {
		headers: {
			"Content-Type": PROMETHEUS_CONTENT_TYPE,
			"Cache-Control": "no-store",
		},
	});
}
```

**Test example:**

```ts
import { resetDefaultMetricsRegistryForTests } from "@afenda/metrics/testing";

beforeEach(() => {
	resetDefaultMetricsRegistryForTests();
});
```

**Living consumers:** `GET /api/metrics` (bearer `METRICS_SCRAPE_TOKEN`); `createPlatformRouteHandler({ routeTemplate })` records HTTP metrics. Keep `@afenda/http` `Server-Timing` as the per-response header — do not merge surfaces.

DNA absorb/reject: [docs-V2/observability/metrics-dna.md](../../docs-V2/observability/metrics-dna.md).

## Maintain

```bash
pnpm --filter @afenda/metrics lint
pnpm --filter @afenda/metrics typecheck
pnpm --filter @afenda/metrics test
```

Requires root engines: **Node `24.x`**, **pnpm `≥10.33.4`**.

## Exports

| Path | Role |
|------|------|
| `@afenda/metrics/core` | Universal contracts: `RecordHttpRequestInput` · `RecordDbQueryInput` · `RecordCacheAccessInput` · `CacheAccessResult` · `assertRouteTemplate` · `HTTP_DURATION_BUCKETS` · `DB_DURATION_BUCKETS` · `DEFAULT_METRICS_SERVICE` |
| `@afenda/metrics/node` | Prometheus implementation: `createMetricsRegistry` · `getDefaultMetricsRegistry` · `recordHttpRequest` · `recordDbQuery` · `recordCacheAccess` · `renderPrometheusText` · `PROMETHEUS_CONTENT_TYPE` · `MetricsRegistryBundle` · `CreateMetricsRegistryOptions` |
| `@afenda/metrics/testing` | Test utilities: `resetDefaultMetricsRegistryForTests` |

**No root export** — bare `import {} from "@afenda/metrics"` is forbidden. All consumers must use explicit subpaths.

## Ownership

| Surface | Owner |
|---------|-------|
| Registry · instruments · record helpers · scrape text | `@afenda/metrics` |
| Fail-closed scrape RH + bearer gate | `apps/web/app/api/metrics/route.ts` |
| HTTP record on platform RHs | `apps/web/modules/platform/api/route-pipeline.ts` |
| `Server-Timing` header | [`@afenda/http`](../http/README.md) |
| Structured logs | [`@afenda/logger`](../logger/README.md) |

**Layer:** Rank-1 Platform **leaf** (no `@afenda/*` runtime deps). Must not import Surfaces, `apps/*`, Next.js, OTEL/APM SDKs, or Prisma middleware. See [docs-V2/monorepo](../../docs-V2/monorepo/README.md).

## Out of scope

- OpenTelemetry / OTLP / vendor APM
- **Edge runtime metrics** — no no-op implementation; real Edge metric sink deferred until genuine consumer exists
- NATS instruments
- Pages `withMetrics` / Prisma `$use` ports
- Multi-tenant Prometheus labels
- Grafana / Prometheus operator manifests

## Authority

- Scratch: [docs-V2/observability](../../docs-V2/observability/README.md) · [metrics-dna.md](../../docs-V2/observability/metrics-dna.md)
- DAG: [LAYERS.md](../../.cursor/skills/afenda-elite-monorepo-discipline/LAYERS.md)

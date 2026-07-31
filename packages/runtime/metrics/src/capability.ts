import {
	Counter,
	collectDefaultMetrics,
	Histogram,
	prometheusContentType,
	Registry,
} from "prom-client";
import { METRIC_SEMANTIC_REGISTRY } from "./semantic-registry";
import type {
	CacheMetricInput,
	DbMetricInput,
	HttpMetricInput,
	MetricsCapability,
} from "./types";
import {
	normalizeCacheInput,
	normalizeDbInput,
	normalizeHttpInput,
} from "./validation";

interface MetricsRuntime {
	readonly cacheTotal: Counter<"operation" | "result" | "service">;
	readonly dbDuration: Histogram<"operation" | "service" | "table">;
	readonly httpDuration: Histogram<
		"method" | "route" | "service" | "status_code"
	>;
	readonly httpTotal: Counter<"method" | "route" | "service" | "status_code">;
	readonly registry: Registry;
}

function createRuntime(collectDefaults: boolean): MetricsRuntime {
	const registry = new Registry();
	if (collectDefaults) {
		collectDefaultMetrics({ register: registry });
	}
	const definitions = METRIC_SEMANTIC_REGISTRY;
	return {
		registry,
		httpDuration: new Histogram({
			...definitions.httpRequestDuration,
			labelNames: definitions.httpRequestDuration.labels,
			buckets: [...definitions.httpRequestDuration.buckets],
			registers: [registry],
		}),
		httpTotal: new Counter({
			...definitions.httpRequestTotal,
			labelNames: definitions.httpRequestTotal.labels,
			registers: [registry],
		}),
		dbDuration: new Histogram({
			...definitions.dbQueryDuration,
			labelNames: definitions.dbQueryDuration.labels,
			buckets: [...definitions.dbQueryDuration.buckets],
			registers: [registry],
		}),
		cacheTotal: new Counter({
			...definitions.cacheAccessTotal,
			labelNames: definitions.cacheAccessTotal.labels,
			registers: [registry],
		}),
	};
}

let defaultRuntime: MetricsRuntime | undefined;

function getDefaultRuntime(): MetricsRuntime {
	defaultRuntime ??= createRuntime(true);
	return defaultRuntime;
}

export function resetDefaultRuntimeForTests(): void {
	defaultRuntime = undefined;
}

export function createMetricsCapability(
	resolveRuntime: () => MetricsRuntime,
): MetricsCapability {
	return Object.freeze({
		record: Object.freeze({
			http(input: HttpMetricInput) {
				const normalized = normalizeHttpInput(input);
				const runtime = resolveRuntime();
				const labels = {
					method: normalized.method,
					route: normalized.routeTemplate,
					status_code: String(normalized.statusCode),
					service: METRIC_SEMANTIC_REGISTRY.service,
				};
				runtime.httpDuration.observe(labels, normalized.durationSeconds);
				runtime.httpTotal.inc(labels);
			},
			db(input: DbMetricInput) {
				const normalized = normalizeDbInput(input);
				resolveRuntime().dbDuration.observe(
					{
						operation: normalized.operation,
						table: normalized.table,
						service: METRIC_SEMANTIC_REGISTRY.service,
					},
					normalized.durationSeconds,
				);
			},
			cache(input: CacheMetricInput) {
				const normalized = normalizeCacheInput(input);
				resolveRuntime().cacheTotal.inc({
					operation: normalized.operation,
					result: normalized.result,
					service: METRIC_SEMANTIC_REGISTRY.service,
				});
			},
		}),
		exposition: Object.freeze({
			contentType: prometheusContentType,
			render: () => resolveRuntime().registry.metrics(),
		}),
	});
}

export const metrics = createMetricsCapability(getDefaultRuntime);

export function createMetricsTestCapability(): MetricsCapability {
	const runtime = createRuntime(false);
	return createMetricsCapability(() => runtime);
}

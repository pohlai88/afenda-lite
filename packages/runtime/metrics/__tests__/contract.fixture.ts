import { metrics } from "@afenda/metrics";

metrics.record.http({
	method: "GET",
	routeTemplate: "/api/items/[id]",
	statusCode: 200,
	durationSeconds: 0.01,
});

metrics.record.http({
	method: "GET",
	routeTemplate: "/api/items",
	statusCode: 200,
	durationSeconds: 0.01,
	// @ts-expect-error organization labels are prohibited
	organizationId: "org-1",
});

metrics.record.cache({
	operation: "get",
	result: "hit",
	// @ts-expect-error consumers cannot pass open labels
	labels: { arbitrary: "value" },
});

// @ts-expect-error Prometheus registry internals are private
metrics.registry.clear();

// @ts-expect-error metric-name construction is not a consumer capability
metrics.createCounter({ name: "consumer_metric_total" });

import { describe, expect, it } from "vitest";
import {
	assertRouteTemplate,
	recordCacheAccess,
	recordDbQuery,
	recordHttpRequest,
} from "../src/record";
import { createMetricsRegistry } from "../src/registry";

describe("@afenda/metrics record helpers", () => {
	it("rejects empty method and high-cardinality route templates", () => {
		const bundle = createMetricsRegistry({ collectDefaults: false });
		expect(() =>
			recordHttpRequest({
				method: "   ",
				routeTemplate: "/api/health/liveness",
				statusCode: 200,
				durationSeconds: 0.01,
				registry: bundle,
			}),
		).toThrow(/method must be a non-empty/);
		expect(() => assertRouteTemplate("/api/x?q=1")).toThrow(/query strings/);
		expect(() => assertRouteTemplate("https://evil.example/api")).toThrow(
			/absolute URLs/,
		);
	});

	it("records HTTP duration and count with normalized method", async () => {
		const bundle = createMetricsRegistry({ collectDefaults: false });
		recordHttpRequest({
			method: "get",
			routeTemplate: "/api/health/liveness",
			statusCode: 200,
			durationSeconds: 0.042,
			registry: bundle,
		});

		const text = await bundle.registry.metrics();
		expect(text).toContain("http_request_duration_seconds");
		expect(text).toContain("http_request_total");
		expect(text).toContain('method="GET"');
		expect(text).toContain('route="/api/health/liveness"');
		expect(text).toContain('status_code="200"');
		expect(text).toContain('service="afenda-web"');
	});

	it("records DB query and cache access instruments", async () => {
		const bundle = createMetricsRegistry({ collectDefaults: false });
		recordDbQuery({
			operation: "select",
			table: "platform_audit_log",
			durationSeconds: 0.008,
			registry: bundle,
		});
		recordCacheAccess({
			operation: "get",
			result: "hit",
			registry: bundle,
		});

		const text = await bundle.registry.metrics();
		expect(text).toContain("db_query_duration_seconds");
		expect(text).toContain('table="platform_audit_log"');
		expect(text).toContain("cache_access_total");
		expect(text).toContain('result="hit"');
	});
});

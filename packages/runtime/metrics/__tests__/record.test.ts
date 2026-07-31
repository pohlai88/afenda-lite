import { describe, expect, it } from "vitest";
import { createMetricsTestCapability } from "../src/testing";

describe("@afenda/metrics recording capability", () => {
	it("records canonical HTTP, DB, and cache projections", async () => {
		const testMetrics = createMetricsTestCapability();
		testMetrics.record.http({
			method: "GET",
			routeTemplate: "/api/health/liveness",
			statusCode: 200,
			durationSeconds: 0.042,
		});
		testMetrics.record.db({
			operation: "select",
			table: "platform_audit_log",
			durationSeconds: 0.008,
		});
		testMetrics.record.cache({ operation: "get", result: "hit" });
		const text = await testMetrics.exposition.render();
		expect(text).toContain("http_request_duration_seconds");
		expect(text).toContain("http_request_total");
		expect(text).toContain('method="GET"');
		expect(text).toContain('route="/api/health/liveness"');
		expect(text).toContain('status_code="200"');
		expect(text).toContain('service="afenda-web"');
		expect(text).toContain("db_query_duration_seconds");
		expect(text).toContain('table="platform_audit_log"');
		expect(text).toContain("cache_access_total");
		expect(text).toContain('result="hit"');
	});
});

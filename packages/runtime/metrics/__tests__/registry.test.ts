import { describe, expect, it } from "vitest";
import { createMetricsTestCapability } from "../src/testing";

describe("@afenda/metrics semantic boundary", () => {
	it("rejects high-cardinality routes and invalid facts", () => {
		const testMetrics = createMetricsTestCapability();
		for (const routeTemplate of [
			"https://example.test/api",
			"/api/items?organization=1",
			"/api/items/123",
			"/api/items/11111111-1111-4111-8111-111111111111",
		]) {
			expect(() =>
				testMetrics.record.http({
					method: "GET",
					routeTemplate,
					statusCode: 200,
					durationSeconds: 0.01,
				}),
			).toThrow(RangeError);
		}
		expect(() =>
			testMetrics.record.http({
				method: "GET",
				routeTemplate: "/api/items",
				statusCode: 99,
				durationSeconds: 0.01,
			}),
		).toThrow(RangeError);
		expect(() =>
			testMetrics.record.db({
				operation: "select",
				table: "unsafe table",
				durationSeconds: 0.01,
			}),
		).toThrow(RangeError);
	});

	it("rejects organization, tenant, metric-name, and open-label injection", () => {
		const testMetrics = createMetricsTestCapability();
		const base = {
			method: "GET" as const,
			routeTemplate: "/api/items",
			statusCode: 200,
			durationSeconds: 0.01,
		};
		for (const extra of [
			{ organizationId: "org-1" },
			{ organization_id: "org-1" },
			{ tenantId: "tenant-1" },
			{ labels: { arbitrary: "value" } },
			{ metricName: "consumer_metric_total" },
		]) {
			expect(() => testMetrics.record.http({ ...base, ...extra })).toThrow(
				RangeError,
			);
		}
	});
});

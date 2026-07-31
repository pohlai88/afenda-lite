import { afterEach, describe, expect, it } from "vitest";
import { metrics } from "../src";
import { resetMetricsForTests } from "../src/testing";

describe("@afenda/metrics default exposition", () => {
	afterEach(resetMetricsForTests);

	it("renders the process capability without exposing its registry", async () => {
		metrics.record.http({
			method: "GET",
			routeTemplate: "/api/metrics",
			statusCode: 200,
			durationSeconds: 0.01,
		});
		const text = await metrics.exposition.render();
		expect(text).toContain("# HELP http_request_total");
		expect(metrics).not.toHaveProperty("registry");
		expect(metrics).not.toHaveProperty("create");
	});
});

import { afterEach, describe, expect, it } from "vitest";
import {
	createMetricsRegistry,
	PROMETHEUS_CONTENT_TYPE,
	recordHttpRequest,
	renderPrometheusText,
} from "../src/node";
import { resetDefaultMetricsRegistryForTests } from "../src/testing";

describe("@afenda/metrics renderPrometheusText", () => {
	afterEach(() => {
		resetDefaultMetricsRegistryForTests();
	});

	it("exports a Prometheus content type constant", () => {
		expect(PROMETHEUS_CONTENT_TYPE).toContain("text/plain");
	});

	it("renders exposition text from an explicit registry", async () => {
		const bundle = createMetricsRegistry({ collectDefaults: false });
		recordHttpRequest({
			method: "GET",
			routeTemplate: "/api/metrics",
			statusCode: 200,
			durationSeconds: 0.01,
			registry: bundle,
		});

		const text = await renderPrometheusText(bundle);
		expect(text).toContain("# HELP http_request_total");
		expect(text).toContain('route="/api/metrics"');
	});

	it("renders from the default registry when none is passed", async () => {
		recordHttpRequest({
			method: "GET",
			routeTemplate: "/api/health/readiness",
			statusCode: 200,
			durationSeconds: 0.02,
		});

		const text = await renderPrometheusText();
		expect(text).toContain("http_request_total");
		expect(text).toContain('route="/api/health/readiness"');
	});
});

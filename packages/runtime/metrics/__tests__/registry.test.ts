import { afterEach, describe, expect, it } from "vitest";

import {
	createMetricsRegistry,
	getDefaultMetricsRegistry,
	resetDefaultMetricsRegistryForTests,
} from "../src/registry";
import { DEFAULT_METRICS_SERVICE } from "../src/types";

describe("@afenda/metrics registry", () => {
	afterEach(() => {
		resetDefaultMetricsRegistryForTests();
	});

	it("creates an isolated registry with the default service label", () => {
		const bundle = createMetricsRegistry({ collectDefaults: false });
		expect(bundle.service).toBe(DEFAULT_METRICS_SERVICE);
		expect(bundle.registry).toBeDefined();
		expect(bundle.httpRequestDuration).toBeDefined();
		expect(bundle.httpRequestTotal).toBeDefined();
		expect(bundle.dbQueryDuration).toBeDefined();
		expect(bundle.cacheAccessTotal).toBeDefined();
	});

	it("honors a custom service label", () => {
		const bundle = createMetricsRegistry({
			collectDefaults: false,
			service: "afenda-worker",
		});
		expect(bundle.service).toBe("afenda-worker");
	});

	it("lazy-creates and reuses the default registry", () => {
		const first = getDefaultMetricsRegistry();
		const second = getDefaultMetricsRegistry();
		expect(first).toBe(second);
	});

	it("resets the default registry for tests", () => {
		const first = getDefaultMetricsRegistry();
		resetDefaultMetricsRegistryForTests();
		const second = getDefaultMetricsRegistry();
		expect(second).not.toBe(first);
	});
});

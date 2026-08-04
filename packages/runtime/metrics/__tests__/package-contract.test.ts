import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { metrics } from "../src";
import {
	createMetricsTestCapability,
	resetMetricsForTests,
} from "../src/testing";

describe("@afenda/metrics package contract", () => {
	it("exposes one production capability and test-only lifecycle helpers", () => {
		expect(typeof metrics.record.http).toBe("function");
		expect(typeof metrics.record.db).toBe("function");
		expect(typeof metrics.record.cache).toBe("function");
		expect(typeof metrics.exposition.render).toBe("function");
		expect(metrics.exposition.contentType).toContain("text/plain");
		expect(typeof createMetricsTestCapability).toBe("function");
		expect(typeof resetMetricsForTests).toBe("function");
	});

	it("declares one root capability entrypoint and testing, nothing else", () => {
		const manifest = JSON.parse(
			readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"),
		);
		// `./core` and `./node` were removed: node.ts re-exported the same
		// `metrics` capability as the root with a narrower type set, and core.ts
		// was types-only. Neither carried a runtime distinction, so they were
		// duplicate surfaces for one capability rather than an edge/node split.
		expect(Object.keys(manifest.exports)).toEqual([".", "./testing"]);
	});
});

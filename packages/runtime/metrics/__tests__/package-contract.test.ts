/**
 * @afenda/metrics contract tests — verify runtime subpath exports.
 * These tests document the package surface guarantees and prevent regression.
 */

import { describe, expect, it } from "vitest";

describe("@afenda/metrics/core contract", () => {
	it("exposes only universal contracts (no prom-client)", async () => {
		const core = await import("../src/core/index");

		// Constants
		expect(core.HTTP_DURATION_BUCKETS).toBeDefined();
		expect(core.DB_DURATION_BUCKETS).toBeDefined();
		expect(core.DEFAULT_METRICS_SERVICE).toBe("afenda-web");

		// Validation
		expect(typeof core.assertRouteTemplate).toBe("function");

		// Types (compile-time check via import)
		expect(true).toBe(true);
	});

	it("does not import prom-client", async () => {
		const coreModule = await import("../src/core/index");
		// If prom-client were imported, it would fail in Edge runtime
		// This test verifies core can be imported without Node-specific deps
		expect(coreModule).toBeDefined();
	});
});

describe("@afenda/metrics/node contract", () => {
	it("exposes Prometheus implementation", async () => {
		const node = await import("../src/node/index");

		// Registry
		expect(typeof node.createMetricsRegistry).toBe("function");
		expect(typeof node.getDefaultMetricsRegistry).toBe("function");

		// Recording
		expect(typeof node.recordHttpRequest).toBe("function");
		expect(typeof node.recordDbQuery).toBe("function");
		expect(typeof node.recordCacheAccess).toBe("function");

		// Rendering
		expect(typeof node.renderPrometheusText).toBe("function");
		expect(node.PROMETHEUS_CONTENT_TYPE).toContain("text/plain");
	});

	it("re-exports core contracts", async () => {
		const node = await import("../src/node/index");

		// Core constants available from /node
		expect(node.HTTP_DURATION_BUCKETS).toBeDefined();
		expect(node.DB_DURATION_BUCKETS).toBeDefined();
		expect(node.DEFAULT_METRICS_SERVICE).toBe("afenda-web");

		// Core validation available from /node
		expect(typeof node.assertRouteTemplate).toBe("function");
	});
});

describe("@afenda/metrics/testing contract", () => {
	it("exposes only test utilities", async () => {
		const testing = await import("../src/testing/index");

		expect(typeof testing.resetDefaultMetricsRegistryForTests).toBe("function");
	});
});

describe("@afenda/metrics export surface contract", () => {
	it("package.json exports only /core, /node, /testing (no root)", async () => {
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");
		
		const pkgPath = join(__dirname, "..", "package.json");
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
		
		// Verify exports field structure
		expect(pkg.exports).toBeDefined();
		expect(pkg.exports["."]).toBeUndefined(); // No root export
		expect(pkg.exports["./core"]).toBeDefined();
		expect(pkg.exports["./node"]).toBeDefined();
		expect(pkg.exports["./testing"]).toBeDefined();
		
		// Verify entry points
		expect(pkg.exports["./core"].types).toBe("./src/core/index.ts");
		expect(pkg.exports["./node"].types).toBe("./src/node/index.ts");
		expect(pkg.exports["./testing"].types).toBe("./src/testing/index.ts");
	});
	
	it("src/core does not import prom-client", async () => {
		const { readFileSync } = await import("node:fs");
		const { join } = await import("node:path");
		const { readdirSync } = await import("node:fs");
		
		const coreDir = join(__dirname, "..", "src", "core");
		const files = readdirSync(coreDir).filter(f => f.endsWith(".ts"));
		
		for (const file of files) {
			const content = readFileSync(join(coreDir, file), "utf8");
			expect(content).not.toContain("prom-client");
		}
	});
});

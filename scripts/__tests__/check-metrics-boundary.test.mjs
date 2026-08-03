import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";
import { checkMetricsBoundary } from "../check-metrics-boundary.mjs";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-metrics-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/runtime/metrics/src"), { recursive: true });
	writeFileSync(
		join(root, "packages/runtime/metrics/package.json"),
		JSON.stringify({
			exports: { ".": "./src/index.ts", "./testing": "./src/testing.ts" },
			dependencies: { "prom-client": "catalog:" },
		}),
	);
	writeFileSync(
		join(root, "packages/runtime/metrics/src/index.ts"),
		"export const metrics = Object.freeze({});\n",
	);
	return root;
}

test("accepts the opaque leaf metrics capability", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkMetricsBoundary(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects workspace edges, Prometheus bypass, names, labels, and old surfaces", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/runtime/metrics/package.json"),
			JSON.stringify({
				exports: { ".": "./src/index.ts", "./node": "./src/node.ts" },
				dependencies: {
					"@afenda/env": "workspace:*",
					"prom-client": "catalog:",
				},
			}),
		);
		writeFileSync(
			join(root, "apps/web/metrics.ts"),
			'import { Counter } from "prom-client";\nimport { recordHttpRequest } from "@afenda/metrics/node";\nconst name = "http_request_total";\nmetrics.record.http({ organizationId: "org-1" });\n',
		);
		const violations = checkMetricsBoundary(root);
		for (const expected of [
			"only root and testing",
			"runtime workspace dependency",
			"prohibited @afenda/metrics subpath",
			"direct prom-client bypass",
			"prohibited organization",
			"canonical metric name",
			"deleted metrics surface",
			"consumer-owned metric registry file",
		]) {
			assert.ok(
				violations.some((value) => value.includes(expected)),
				expected,
			);
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkRateLimitBoundary } from "./check-rate-limit-boundary.mjs";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-rate-limit-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/runtime/rate-limit/src"), { recursive: true });
	writeFileSync(
		join(root, "packages/runtime/rate-limit/package.json"),
		JSON.stringify({
			exports: { ".": "./src/index.ts", "./testing": "./src/testing.ts" },
			dependencies: {
				"@afenda/env": "workspace:*",
				"@afenda/errors": "workspace:*",
				"@upstash/ratelimit": "catalog:",
			},
		}),
	);
	writeFileSync(
		join(root, "apps/web/consumer.ts"),
		'import { rateLimit } from "@afenda/rate-limit";\nrateLimit.check({ bucket: "ai_chat", identity: { userId: "u1" } });\n',
	);
	return root;
}

test("accepts capability consumers and authorized owner dependencies", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkRateLimitBoundary(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects dependency, key, state, vendor, subpath, and legacy leaks", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/runtime/rate-limit/package.json"),
			JSON.stringify({
				exports: { ".": "./src/index.ts", "./node": "./src/node.ts" },
				dependencies: { "@afenda/http": "workspace:*" },
			}),
		);
		writeFileSync(
			join(root, "apps/web/consumer.ts"),
			'import { checkRateLimit } from "@afenda/rate-limit/node";\nimport { Ratelimit } from "@upstash/ratelimit";\nrateLimit.check({ bucket: "ai_chat", key: "u1" });\nif (limit.reason) console.log(limit.quota);\n',
		);
		const violations = checkRateLimitBoundary(root);
		for (const expected of [
			"only root and testing",
			"unauthorized workspace dependency",
			"prohibited @afenda/rate-limit subpath",
			"vendor bypass",
			"raw rate-limit key",
			"interprets private quota state",
			"deleted rate-limit surface",
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

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";

import { checkCacheBoundary } from "../check-cache-boundary.mjs";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-cache-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/runtime/cache/src"), { recursive: true });
	writeFileSync(
		join(root, "packages/runtime/cache/package.json"),
		JSON.stringify({
			exports: { ".": "./src/index.ts", "./testing": "./src/testing.ts" },
			dependencies: {
				"@afenda/env": "workspace:*",
				"@afenda/errors": "workspace:*",
				"@upstash/redis": "catalog:",
			},
		}),
	);
	writeFileSync(
		join(root, "apps/web/consumer.ts"),
		'import { cache } from "@afenda/cache";\nconst key = cache.key.userSession({ userId: "u1" });\ncache.get(key);\n',
	);
	return root;
}

test("accepts semantic cache capability consumers", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkCacheBoundary(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects dependency, raw key, prefix, flush, subpath, and legacy leaks", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/runtime/cache/package.json"),
			JSON.stringify({
				exports: { ".": "./src/index.ts", "./node": "./src/node.ts" },
				dependencies: { "@afenda/rate-limit": "workspace:*" },
			}),
		);
		writeFileSync(
			join(root, "apps/web/consumer.ts"),
			'import { CacheManager } from "@afenda/cache/node";\ncache.get("raw:key");\nconst prefix = "@afenda/cache:v1:";\nredis.flushdb();\n',
		);
		const violations = checkCacheBoundary(root);
		for (const expected of [
			"only root and testing",
			"unauthorized workspace dependency",
			"prohibited @afenda/cache subpath",
			"raw cache key",
			"private cache prefix",
			"database flush",
			"deleted cache surface",
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

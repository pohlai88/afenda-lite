import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkSearchBoundary } from "./check-search-boundary.mjs";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-search-boundary-"));
	mkdirSync(join(root, "apps/web/__tests__"), { recursive: true });
	mkdirSync(join(root, "packages/data-plane/search/src"), { recursive: true });
	writeFileSync(
		join(root, "packages/data-plane/search/package.json"),
		JSON.stringify({
			exports: { ".": "./src/index.ts", "./testing": "./src/testing.ts" },
			dependencies: {
				"@afenda/db": "workspace:*",
				"@afenda/errors": "workspace:*",
				zod: "catalog:",
			},
		}),
	);
	writeFileSync(
		join(root, "apps/web/consumer.ts"),
		'import { search } from "@afenda/search";\nsearch.query({ organizationId: "o", query: "a", entity: search.entities.identity.member });\n',
	);
	writeFileSync(
		join(root, "apps/web/__tests__/consumer.test.ts"),
		'import { searchTesting } from "@afenda/search/testing";\nsearchTesting.createMemory();\n',
	);
	return root;
}

test("accepts capability consumers and test-only memory capability", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkSearchBoundary(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects dependency, subpath, production testing, entities, ranking, table, and legacy leaks", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/data-plane/search/package.json"),
			JSON.stringify({
				exports: { ".": "./src/index.ts", "./store": "./src/store.ts" },
				dependencies: { "@afenda/master-data": "workspace:*" },
			}),
		);
		writeFileSync(
			join(root, "apps/web/consumer.ts"),
			'import { MemorySearchStore } from "@afenda/search/store";\nimport { searchTesting } from "@afenda/search/testing";\nconst input = { entity: "md_party" };\nplatformSearchDocument;\nts_rank_cd();\n',
		);
		const violations = checkSearchBoundary(root);
		for (const expected of [
			"only root and testing",
			"unauthorized workspace dependency",
			"prohibited @afenda/search subpath",
			"production source imports search testing",
			"consumer owns a search entity",
			"direct platform_search_document",
			"consumer interprets search ranking",
			"deleted search surface",
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

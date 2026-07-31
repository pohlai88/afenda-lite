import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkOpenApiBoundary } from "./check-openapi-boundary.mjs";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-openapi-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/runtime/openapi/src"), { recursive: true });
	mkdirSync(join(root, "scripts"), { recursive: true });
	writeFileSync(
		join(root, "packages/runtime/openapi/package.json"),
		JSON.stringify({
			exports: { ".": "./src/index.ts", "./node": "./src/node.ts" },
			dependencies: { zod: "catalog:" },
		}),
	);
	writeFileSync(
		join(root, "scripts/generate-openapi.mts"),
		'import { errorOpenApi } from "@afenda/errors";\nerrorOpenApi.responses(["NOT_FOUND"]);\n',
	);
	return root;
}

test("accepts the leaf facade and canonical error composition", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkOpenApiBoundary(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects workspace edges, bypasses, old surfaces, and error duplication", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/runtime/openapi/package.json"),
			JSON.stringify({
				exports: { ".": "./src/index.ts", "./zod": "./src/zod.ts" },
				dependencies: { "@afenda/errors": "workspace:*" },
			}),
		);
		writeFileSync(
			join(root, "apps/web/bypass.ts"),
			'import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";\nimport { z } from "@afenda/openapi/zod";\n',
		);
		writeFileSync(
			join(root, "scripts/generate-openapi.mts"),
			"const apiErrorBodySchema = {};\n",
		);
		const violations = checkOpenApiBoundary(root);
		for (const expected of [
			"only root and node",
			"runtime workspace dependency",
			"prohibited @afenda/openapi subpath",
			"vendor bypass",
			"deleted OpenAPI surface",
			"duplicated canonical error schema",
			"error responses must derive",
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

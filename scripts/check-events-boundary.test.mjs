import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkEventsBoundary } from "./check-events-boundary.mjs";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-events-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/data-plane/events/src"), { recursive: true });
	writeFileSync(
		join(root, "packages/data-plane/events/package.json"),
		JSON.stringify({
			exports: { ".": "./src/index.ts", "./schemas": "./src/schemas/index.ts" },
			dependencies: {
				"@afenda/db": "workspace:*",
				"@afenda/errors": "workspace:*",
				zod: "catalog:",
			},
		}),
	);
	writeFileSync(
		join(root, "apps/web/consumer.ts"),
		'import { events } from "@afenda/events";\nimport { PlatformEventSchemas } from "@afenda/events/schemas";\nevents.dispatcher.create({ handlers: {} });\nvoid PlatformEventSchemas;\n',
	);
	return root;
}

test("accepts the root capability, schema projection, and app handler composition", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkEventsBoundary(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects dependency, subpath, package handler, and legacy leaks", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/data-plane/events/package.json"),
			JSON.stringify({
				exports: { ".": "./src/index.ts", "./store": "./src/store.ts" },
				dependencies: { "@afenda/auth": "workspace:*" },
			}),
		);
		mkdirSync(join(root, "packages/erp/example"), { recursive: true });
		writeFileSync(
			join(root, "packages/erp/example/consumer.ts"),
			'import { createEventPublisher } from "@afenda/events/store";\nevents.dispatcher.create({ handlers: {} });\n',
		);
		const violations = checkEventsBoundary(root);
		for (const expected of [
			"only root and schemas",
			"unauthorized workspace dependency",
			"prohibited @afenda/events subpath",
			"handlers must be composed",
			"deleted events surface",
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

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkNotificationsBoundary } from "./check-notifications-boundary.mjs";

function fixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-notifications-boundary-"));
	mkdirSync(join(root, "apps/web"), { recursive: true });
	mkdirSync(join(root, "packages/data-plane/notifications/src"), {
		recursive: true,
	});
	writeFileSync(
		join(root, "packages/data-plane/notifications/package.json"),
		JSON.stringify({
			exports: { ".": "./src/index.ts" },
			dependencies: {
				"@afenda/db": "workspace:*",
				"@afenda/errors": "workspace:*",
				zod: "catalog:",
			},
		}),
	);
	writeFileSync(
		join(root, "apps/web/consumer.ts"),
		'import { notifications } from "@afenda/notifications";\nnotifications.record({ type: notifications.vocabulary.type.info });\n',
	);
	return root;
}

test("accepts the root notification capability", () => {
	const root = fixture();
	try {
		assert.deepEqual(checkNotificationsBoundary(root), []);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects dependency, subpath, vocabulary, table, and legacy leaks", () => {
	const root = fixture();
	try {
		writeFileSync(
			join(root, "packages/data-plane/notifications/package.json"),
			JSON.stringify({
				exports: { ".": "./src/index.ts", "./store": "./src/store.ts" },
				dependencies: { "@afenda/events": "workspace:*" },
			}),
		);
		writeFileSync(
			join(root, "apps/web/consumer.ts"),
			'import { createNotificationRecorder } from "@afenda/notifications/store";\nimport { notifications } from "@afenda/notifications";\nconst input = { channel: "IN_APP" };\nplatformNotification;\ncreateNotificationRecorder();\n',
		);
		writeFileSync(
			join(root, "packages/data-plane/notifications/src/handler.ts"),
			'import { events } from "@afenda/events";\nevents.handlers();\n',
		);
		const violations = checkNotificationsBoundary(root);
		for (const expected of [
			"only the root export",
			"unauthorized workspace dependency",
			"prohibited @afenda/notifications subpath",
			"consumer owns notification vocabulary",
			"direct platform_notification",
			"deleted notifications surface",
			"event interpretation belongs",
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

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";

import { checkAppActionRunners } from "../check-app-action-runners.mjs";

function createFixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-action-runners-"));
	mkdirSync(join(root, "apps/web/app/actions/_runtime"), { recursive: true });
	return root;
}

test("passes when exported run*Action lives under _runtime", () => {
	const root = createFixture();
	try {
		writeFileSync(
			join(
				root,
				"apps/web/app/actions/_runtime/run-operator-permission-action.ts",
			),
			"export async function runOperatorPermissionAction() {}\n",
		);
		writeFileSync(
			join(root, "apps/web/app/actions/create-party.ts"),
			'import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";\n',
		);
		assert.deepEqual(checkAppActionRunners(root), { ok: true });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails when an exported run*Action sits outside _runtime", () => {
	const root = createFixture();
	try {
		writeFileSync(
			join(root, "apps/web/app/actions/feature-local-runner.ts"),
			"export async function runFeatureLocalAction() {}\n",
		);
		const result = checkAppActionRunners(root);
		assert.equal(result.ok, false);
		assert.ok(
			result.offenders.some(
				(offender) =>
					offender.file.endsWith(
						"apps/web/app/actions/feature-local-runner.ts",
					) && offender.names.includes("runFeatureLocalAction"),
			),
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("ignores non-exported FormData run helpers outside _runtime", () => {
	const root = createFixture();
	try {
		writeFileSync(
			join(root, "apps/web/app/actions/legal-establishment-actions.ts"),
			"async function runEstablishmentAction() {}\n",
		);
		assert.deepEqual(checkAppActionRunners(root), { ok: true });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

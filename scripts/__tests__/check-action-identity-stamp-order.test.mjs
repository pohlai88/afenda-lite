import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "vitest";

import { checkActionIdentityStampOrder } from "../check-action-identity-stamp-order.mjs";

function createFixture() {
	const root = mkdtempSync(join(tmpdir(), "afenda-action-identity-"));
	mkdirSync(join(root, "apps/web/app/actions"), { recursive: true });
	return root;
}

test("passes when session identity is stamped after ...parsed.data", () => {
	const root = createFixture();
	try {
		writeFileSync(
			join(root, "apps/web/app/actions/safe.ts"),
			`const payload = {
  ...parsed.data,
  organizationId: session.orgId,
  actorUserId: session.userId,
};
`,
		);
		assert.deepEqual(checkActionIdentityStampOrder(root), { ok: true });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("fails when organizationId is stamped before ...parsed.data", () => {
	const root = createFixture();
	try {
		writeFileSync(
			join(root, "apps/web/app/actions/unsafe.ts"),
			`const payload = {
  organizationId: session.orgId,
  actorUserId: session.userId,
  ...parsed.data,
};
`,
		);
		const result = checkActionIdentityStampOrder(root);
		assert.equal(result.ok, false);
		assert.ok(
			result.files.some((file) => file.endsWith("apps/web/app/actions/unsafe.ts")),
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("passes when actions directory is absent", () => {
	const root = mkdtempSync(join(tmpdir(), "afenda-action-identity-empty-"));
	try {
		assert.deepEqual(checkActionIdentityStampOrder(root), { ok: true });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

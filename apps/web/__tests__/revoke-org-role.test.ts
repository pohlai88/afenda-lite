/**
 * GUIDE-018 I3.1 — revoke org role Zod + hard-tenancy soft-revoke.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { assignOrgRole } from "../modules/identity/domain/assign-org-role";
import {
	parseRevokeOrgRoleCommand,
	revokeOrgRole,
} from "../modules/identity/domain/revoke-org-role";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

function loadDatabaseUrl(): string | undefined {
	if (process.env.DATABASE_URL) {
		return process.env.DATABASE_URL;
	}
	try {
		const text = readFileSync(path.join(repoRoot, ".env.local"), "utf8");
		for (const line of text.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (trimmed.length === 0 || trimmed.startsWith("#")) continue;
			const match = /^DATABASE_URL\s*=\s*(.*)$/.exec(trimmed);
			if (!match) continue;
			let value = match[1]?.trim() ?? "";
			if (
				(value.startsWith('"') && value.endsWith('"')) ||
				(value.startsWith("'") && value.endsWith("'"))
			) {
				value = value.slice(1, -1);
			}
			return value.length > 0 ? value : undefined;
		}
	} catch {
		return undefined;
	}
	return undefined;
}

const databaseUrl = loadDatabaseUrl();
if (databaseUrl) {
	process.env.DATABASE_URL = databaseUrl;
}

const hasDatabase = typeof databaseUrl === "string" && databaseUrl.length > 0;

const VIEWER_TEMPLATE_ROLE_ID = "d9305ced-bbd5-493b-9b78-80ebb78c6450";

describe("parseRevokeOrgRoleCommand (I3.1)", () => {
	it("accepts uuid assignmentId", () => {
		expect(
			parseRevokeOrgRoleCommand({
				assignmentId: "9b42b710-000d-44fb-816e-a0b1cd946ac1",
			}),
		).toEqual({ assignmentId: "9b42b710-000d-44fb-816e-a0b1cd946ac1" });
	});

	it("rejects non-uuid assignmentId", () => {
		expect(() =>
			parseRevokeOrgRoleCommand({ assignmentId: "not-a-uuid" }),
		).toThrow();
	});
});

describe.skipIf(!hasDatabase)("revokeOrgRole tenancy (I3.1)", () => {
	const runId = `${Date.now()}`;
	const orgA = `org-i31-revoke-a-${runId}`;
	const orgB = `org-i31-revoke-b-${runId}`;
	const userId = `user-i31-revoke-target-${runId}`;
	const grantedBy = `user-i31-revoke-actor-${runId}`;

	it("soft-revokes only when id and organization_id match", async () => {
		const assigned = await assignOrgRole({
			orgId: orgA,
			userId,
			roleId: VIEWER_TEMPLATE_ROLE_ID,
			grantedBy,
		});
		expect(assigned.ok).toBe(true);
		if (!assigned.ok) {
			return;
		}

		const wrongOrg = await revokeOrgRole({
			orgId: orgB,
			assignmentId: assigned.assignment.id,
		});
		expect(wrongOrg.ok).toBe(false);
		if (!wrongOrg.ok) {
			expect(wrongOrg.code).toBe("NOT_FOUND");
		}

		const revoked = await revokeOrgRole({
			orgId: orgA,
			assignmentId: assigned.assignment.id,
		});
		expect(revoked.ok).toBe(true);
		if (!revoked.ok) {
			return;
		}
		expect(revoked.assignment.active).toBe(false);

		const second = await revokeOrgRole({
			orgId: orgA,
			assignmentId: assigned.assignment.id,
		});
		expect(second.ok).toBe(false);
		if (!second.ok) {
			expect(second.code).toBe("NOT_FOUND");
		}

		const reactivated = await assignOrgRole({
			orgId: orgA,
			userId,
			roleId: VIEWER_TEMPLATE_ROLE_ID,
			grantedBy,
		});
		expect(reactivated.ok).toBe(true);
		if (!reactivated.ok) {
			return;
		}
		expect(reactivated.reactivated).toBe(true);
		expect(reactivated.assignment.id).toBe(assigned.assignment.id);

		await revokeOrgRole({
			orgId: orgA,
			assignmentId: reactivated.assignment.id,
		});
	});
});

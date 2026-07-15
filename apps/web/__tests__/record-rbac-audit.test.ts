/**
 * GUIDE-018 I2.3 — first authenticated write under hard `organization_id`.
 *
 * Integration cases need `DATABASE_URL` (from the runner env or `.env.local`).
 * They insert real `platform_rbac_audit` rows on the configured Neon branch,
 * prove `withOrg` isolation, then delete the fixture ids.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { platformRbacAudit, withOrg } from "@afenda/db";
import { afterAll, describe, expect, it } from "vitest";

import {
	deleteRbacAuditRow,
	MEMBER_INVITE_AUDIT_ACTION,
	recordRbacAudit,
} from "../modules/platform/domain/record-rbac-audit";

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

const createdAuditIds: Array<{ id: string; orgId: string }> = [];

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

describe("recordRbacAudit guards (I2.3)", () => {
	it("rejects empty orgId before touching the database", async () => {
		await expect(
			recordRbacAudit({
				orgId: "   ",
				action: MEMBER_INVITE_AUDIT_ACTION,
				actorUserId: "user-a",
			}),
		).rejects.toThrow(/orgId/);
	});

	it("rejects empty actorUserId", async () => {
		await expect(
			recordRbacAudit({
				orgId: "org-a",
				action: MEMBER_INVITE_AUDIT_ACTION,
				actorUserId: "",
			}),
		).rejects.toThrow(/actorUserId/);
	});
});

describe.skipIf(!hasDatabase)("recordRbacAudit tenancy write (I2.3)", () => {
	const orgA = "org-i23-write-a";
	const orgB = "org-i23-write-b";
	const actorUserId = "user-i23-write-actor";

	afterAll(async () => {
		for (const row of createdAuditIds) {
			await deleteRbacAuditRow(row);
		}
	});

	it("inserts with explicit organization_id and isolates via withOrg", async () => {
		const row = await recordRbacAudit({
			orgId: orgA,
			action: MEMBER_INVITE_AUDIT_ACTION,
			actorUserId,
			targetType: "membership",
			targetId: "invitee@example.com",
			newValue: { email: "invitee@example.com", role: "client" },
		});
		createdAuditIds.push({ id: row.id, orgId: orgA });

		expect(row.organizationId).toBe(orgA);
		expect(row.action).toBe(MEMBER_INVITE_AUDIT_ACTION);
		expect(row.actorUserId).toBe(actorUserId);

		const forOrgA = await withOrg(platformRbacAudit, orgA);
		expect(forOrgA.some((item) => item.id === row.id)).toBe(true);

		const forOrgB = await withOrg(platformRbacAudit, orgB);
		expect(forOrgB.some((item) => item.id === row.id)).toBe(false);

		const wrongOrgDelete = await deleteRbacAuditRow({
			id: row.id,
			orgId: orgB,
		});
		expect(wrongOrgDelete).toBeNull();

		const forOrgAAfterDeniedDelete = await withOrg(platformRbacAudit, orgA);
		expect(forOrgAAfterDeniedDelete.some((item) => item.id === row.id)).toBe(
			true,
		);
	});
});

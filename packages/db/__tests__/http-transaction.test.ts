/**
 * Neon HTTP non-interactive transaction helper (N12 residual · ARCH-025).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

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

describe("runNeonHttpTransaction contract", () => {
	it("rejects an empty query list before contacting Neon", async () => {
		const { runNeonHttpTransaction } = await import("../src/http-transaction");
		await expect(runNeonHttpTransaction(() => [])).rejects.toThrow(
			/at least one query/,
		);
	});
});

describe.skipIf(!hasDatabase)("runNeonHttpTransaction atomicity (N12)", () => {
	const runId = `${Date.now()}`;
	const orgId = `org-n12-tx-${runId}`;
	const userId = `user-n12-tx-${runId}`;
	const assignmentId = crypto.randomUUID();
	/** Live Org Admin system template on br-tiny-hill (ARCH-023 seed). */
	const roleId = "22527ba9-7a74-4217-8b2e-986f36e0b444";

	afterAll(async () => {
		const { getNeonSql } = await import("../src/http-transaction");
		const sql = getNeonSql();
		await sql`
			DELETE FROM platform_rbac_audit
			WHERE organization_id = ${orgId}
		`;
		await sql`
			DELETE FROM platform_role_assignment
			WHERE organization_id = ${orgId}
		`;
	});

	it("commits mutate + audit together under ReadCommitted", async () => {
		const { runNeonHttpTransaction } = await import("../src/http-transaction");

		const [assignmentRows, auditRows] = await runNeonHttpTransaction<
			[
				Array<{ id: string; organization_id: string }>,
				Array<{ id: string; organization_id: string }>,
			]
		>((sql) => [
			sql`
				INSERT INTO platform_role_assignment (
					id,
					user_id,
					organization_id,
					role_id,
					scope_type,
					scope_id,
					active,
					granted_by
				)
				VALUES (
					${assignmentId},
					${userId},
					${orgId},
					${roleId},
					${"organization"},
					${orgId},
					true,
					${userId}
				)
				RETURNING id, organization_id
			`,
			sql`
				INSERT INTO platform_rbac_audit (
					action,
					actor_user_id,
					organization_id,
					target_type,
					target_id,
					role_id
				)
				VALUES (
					${"role.assign"},
					${userId},
					${orgId},
					${"role_assignment"},
					${assignmentId},
					${roleId}
				)
				RETURNING id, organization_id
			`,
		]);

		expect(assignmentRows[0]?.id).toBe(assignmentId);
		expect(assignmentRows[0]?.organization_id).toBe(orgId);
		expect(auditRows[0]?.organization_id).toBe(orgId);
		expect(auditRows[0]?.id).toBeTruthy();
	});

	it("rolls back the first statement when the second statement fails", async () => {
		const { getNeonSql, runNeonHttpTransaction } = await import(
			"../src/http-transaction"
		);
		const orphanAssignmentId = crypto.randomUUID();
		const sql = getNeonSql();

		await expect(
			runNeonHttpTransaction((txn) => [
				txn`
					INSERT INTO platform_role_assignment (
						id,
						user_id,
						organization_id,
						role_id,
						scope_type,
						scope_id,
						active,
						granted_by
					)
					VALUES (
						${orphanAssignmentId},
						${`${userId}-rollback`},
						${orgId},
						${roleId},
						${"organization"},
						${orgId},
						true,
						${userId}
					)
					RETURNING id
				`,
				txn`
					INSERT INTO platform_rbac_audit (
						action,
						actor_user_id,
						organization_id
					)
					VALUES (
						${"role.assign"},
						${userId},
						${null}
					)
					RETURNING id
				`,
			]),
		).rejects.toThrow();

		const leftover = await sql`
			SELECT id
			FROM platform_role_assignment
			WHERE id = ${orphanAssignmentId}
		`;
		expect(leftover).toEqual([]);
	});

	it("rejects a second active row for the same natural key (N12 Path-to-100%)", async () => {
		const { getNeonSql } = await import("../src/http-transaction");
		const sql = getNeonSql();
		const firstId = crypto.randomUUID();
		const secondId = crypto.randomUUID();
		const dupUser = `${userId}-unique`;

		await sql`
			INSERT INTO platform_role_assignment (
				id,
				user_id,
				organization_id,
				role_id,
				scope_type,
				scope_id,
				active,
				granted_by
			)
			VALUES (
				${firstId},
				${dupUser},
				${orgId},
				${roleId},
				${"organization"},
				${orgId},
				true,
				${userId}
			)
		`;

		await expect(
			sql`
				INSERT INTO platform_role_assignment (
					id,
					user_id,
					organization_id,
					role_id,
					scope_type,
					scope_id,
					active,
					granted_by
				)
				VALUES (
					${secondId},
					${dupUser},
					${orgId},
					${roleId},
					${"organization"},
					${orgId},
					true,
					${userId}
				)
			`,
		).rejects.toThrow();
	});
});

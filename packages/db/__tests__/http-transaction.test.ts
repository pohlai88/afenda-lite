/**
 * Neon HTTP non-interactive transaction helper (N12 residual · ARCH-025).
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const { hasDatabase } = resolveDatabaseUrlForTests();

describe("runNeonHttpTransaction contract", () => {
	it("rejects an empty query list before contacting Neon", async () => {
		const { runNeonHttpTransaction } = await import("../src/http-transaction");
		await expect(runNeonHttpTransaction([])).rejects.toThrow(
			/at least one query/,
		);
	});
});

describe.skipIf(!hasDatabase)("runNeonHttpTransaction atomicity (N12)", () => {
	const runId = `${Date.now()}`;
	const orgId = `org-n12-tx-${runId}`;
	const userId = `user-n12-tx-${runId}`;
	const assignmentId = crypto.randomUUID();
	/** Resolved from live Org Admin system template (ARCH-023 seed). */
	let roleId = "";

	beforeAll(async () => {
		const { getNeonSql } = await import("../src/http-transaction");
		const sql = getNeonSql();
		const [template] = await sql`
			SELECT id::text AS id
			FROM platform_role
			WHERE template_key = 'org_admin'
				AND is_system_template = true
				AND organization_id IS NULL
			LIMIT 1
		`;
		expect(template?.id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
		roleId = String(template.id);
	});

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

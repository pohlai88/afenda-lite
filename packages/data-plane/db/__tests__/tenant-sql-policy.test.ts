import { describe, expect, it } from "vitest";

import { assertTenantSqlSafety } from "../src/tenant-sql-policy";

describe("assertTenantSqlSafety", () => {
	it.each([
		"SELECT * FROM platform_role_assignment WHERE organization_id = $1",
		'SELECT * FROM "platform_role_assignment" AS "assignment" WHERE "assignment"."organization_id" = $1',
		`SELECT assignment.id, audit.id
			FROM platform_role_assignment assignment
			JOIN platform_rbac_audit audit
				ON audit.organization_id = assignment.organization_id
			WHERE assignment.organization_id = $1`,
		"INSERT INTO platform_role_assignment (id, organization_id, role_id) VALUES ($1, $2, $3)",
		"INSERT INTO platform_role_assignment (id, organization_id, role_id) VALUES ($1, $2, $3) ON CONFLICT (organization_id, id) DO UPDATE SET role_id = excluded.role_id",
		"INSERT INTO platform_role_assignment (id, organization_id, role_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
		"SELECT * FROM platform_permission WHERE code = $1",
	])("accepts tenant-owned or global SQL: %s", (statement) => {
		expect(() => assertTenantSqlSafety(statement)).not.toThrow();
	});

	it.each([
		{
			label: "unscoped read",
			statement: "SELECT * FROM platform_role_assignment",
		},
		{
			label: "one unscoped join alias",
			statement: `SELECT assignment.id
				FROM platform_role_assignment assignment
				JOIN platform_rbac_audit audit ON audit.assignment_id = assignment.id
				WHERE assignment.organization_id = $1`,
		},
		{
			label: "unscoped update",
			statement:
				"UPDATE platform_role_assignment SET organization_id = $1, role_id = $2",
		},
		{
			label: "unscoped delete",
			statement: "DELETE FROM platform_role_assignment WHERE id = $1",
		},
		{
			label: "insert without ownership column",
			statement:
				"INSERT INTO platform_role_assignment (id, role_id) VALUES ($1, $2)",
		},
		{
			label: "unscopable truncate",
			statement: "TRUNCATE TABLE platform_role_assignment",
		},
		{
			label: "ownership outside the predicate",
			statement:
				"DELETE FROM platform_role_assignment WHERE id = $1 RETURNING organization_id",
		},
		{
			label: "cross-tenant upsert conflict target",
			statement:
				"INSERT INTO platform_role_assignment (id, organization_id, role_id) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET role_id = excluded.role_id",
		},
		{
			label: "multiple statements with one tenant predicate",
			statement:
				"DELETE FROM platform_role_assignment WHERE organization_id = $1; DELETE FROM platform_role_assignment WHERE id = $2",
		},
		{
			label: "unsupported comma join",
			statement:
				"SELECT * FROM platform_role_assignment assignment, platform_rbac_audit audit WHERE assignment.organization_id = $1",
		},
	])("rejects $label", ({ statement }) => {
		expect(() => assertTenantSqlSafety(statement)).toThrow(
			/Tenant SQL policy rejected/,
		);
	});

	it("does not accept ownership text hidden in a comment or string", () => {
		expect(() =>
			assertTenantSqlSafety(
				"SELECT 'organization_id' FROM platform_role_assignment -- WHERE organization_id = $1",
			),
		).toThrow(/Tenant SQL policy rejected/);
	});

	it("does not let a comment marker inside a literal hide a real predicate", () => {
		expect(() =>
			assertTenantSqlSafety(
				"SELECT '--' FROM platform_role_assignment WHERE organization_id = $1",
			),
		).not.toThrow();
	});

	it("does not accept ownership text hidden in a dollar-quoted literal", () => {
		expect(() =>
			assertTenantSqlSafety(
				"SELECT $$organization_id$$ FROM platform_role_assignment WHERE id = $1",
			),
		).toThrow(/Tenant SQL policy rejected/);
	});

	it("does not accept ownership text left inside a nested block comment", () => {
		expect(() =>
			assertTenantSqlSafety(
				"SELECT * FROM platform_role_assignment WHERE id = $1 /* outer /* inner */ organization_id */",
			),
		).toThrow(/Tenant SQL policy rejected/);
	});
});

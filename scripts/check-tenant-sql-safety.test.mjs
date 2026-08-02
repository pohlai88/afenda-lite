import assert from "node:assert/strict";
import test from "node:test";

import {
	analyzeTenantSqlSafety,
	loadHardTenantTableIdentifiers,
	loadSystemSqlOperationOwners,
} from "./check-tenant-sql-safety.mjs";

const hardTenantTables = new Set(["platformRoleAssignment", "joinedTenant"]);

function analyze(source) {
	return analyzeTenantSqlSafety({
		file: "fixture.ts",
		hardTenantTables,
		source,
	});
}

test("loads hard-tenant identifiers from the package SSOT", () => {
	const identifiers = loadHardTenantTableIdentifiers(`
		export const HARD_TENANT_ROOT_ENTRIES = [
			["platform_role_assignment", platformRoleAssignment],
			["joined_tenant", joinedTenant],
		] as const;
	`);
	assert.deepEqual(
		[...identifiers],
		["platformRoleAssignment", "joinedTenant"],
	);
});

test("accepts an entity mutation with identity and organization predicates", () => {
	const findings = analyze(`
		await afendaDatabase.client.update(platformRoleAssignment).set(input).where(and(
			eq(platformRoleAssignment.id, assignmentId),
			afendaDatabase.tenancy.where(platformRoleAssignment.organizationId, organizationId),
		));
	`);
	assert.deepEqual(findings, []);
});

test("accepts a tenant insert that stamps organization ownership", () => {
	const findings = analyze(`
		await afendaDatabase.client.insert(platformRoleAssignment).values({
			id: assignmentId,
			organizationId,
		});
	`);
	assert.deepEqual(findings, []);
});

test("rejects a tenant insert without organization ownership", () => {
	const findings = analyze(`
		await afendaDatabase.client.insert(platformRoleAssignment).values({ id: assignmentId });
	`);
	assert.equal(findings[0]?.rule, "tenant-insert-missing-organization");
});

test("rejects ID-only mutation predicates", () => {
	const findings = analyze(`
		await afendaDatabase.client.delete(platformRoleAssignment).where(
			eq(platformRoleAssignment.id, assignmentId),
		);
	`);
	assert.equal(findings[0]?.rule, "tenant-mutation-missing-organization");
});

test("rejects organization-only mutation predicates", () => {
	const findings = analyze(`
		await afendaDatabase.client.delete(platformRoleAssignment).where(
			afendaDatabase.tenancy.where(platformRoleAssignment.organizationId, organizationId),
		);
	`);
	assert.equal(findings[0]?.rule, "tenant-mutation-missing-record-selection");
});

test("requires every tenant table in a join to be scoped", () => {
	const findings = analyze(`
		await afendaDatabase.client.select().from(platformRoleAssignment)
			.innerJoin(joinedTenant, eq(joinedTenant.assignmentId, platformRoleAssignment.id))
			.where(afendaDatabase.tenancy.where(platformRoleAssignment.organizationId, organizationId));
	`);
	assert.equal(findings.length, 1);
	assert.equal(findings[0]?.table, "joinedTenant");
	assert.equal(findings[0]?.rule, "tenant-read-missing-organization");
});

test("accepts organization predicates for every tenant table in a join", () => {
	const findings = analyze(`
		await afendaDatabase.client.select().from(platformRoleAssignment)
			.innerJoin(joinedTenant, and(
				eq(joinedTenant.assignmentId, platformRoleAssignment.id),
				afendaDatabase.tenancy.where(joinedTenant.organizationId, organizationId),
			))
			.where(afendaDatabase.tenancy.where(platformRoleAssignment.organizationId, organizationId));
	`);
	assert.deepEqual(findings, []);
});

test("loads system SQL operation owners from the canonical registry", () => {
	const operations = loadSystemSqlOperationOwners(`
		export const SYSTEM_SQL_OPERATION_POLICIES = {
			"human-resources.reliability.claim-due": {
				ownerSource: "packages/erp/human-resources/src/kernel/reliability/adapters/drizzle.ts",
				hardTenantTables: ["hr_reliability_work_item"],
			},
		} as const;
	`);
	assert.equal(
		operations.get("human-resources.reliability.claim-due"),
		"packages/erp/human-resources/src/kernel/reliability/adapters/drizzle.ts",
	);
});

test("rejects an unscoped raw SQL tagged template", () => {
	const findings = analyzeTenantSqlSafety({
		file: "fixture.ts",
		hardTenantTables,
		hardTenantTableNames: new Set(["platform_role_assignment"]),
		source: `database.transaction((sqlTag) => [
			sqlTag\`SELECT * FROM platform_role_assignment\`,
		]);`,
	});
	assert.equal(findings[0]?.rule, "raw-tenant-sql-missing-organization");
});

test("accepts explicitly scoped raw SQL", () => {
	const findings = analyzeTenantSqlSafety({
		file: "fixture.ts",
		hardTenantTables,
		hardTenantTableNames: new Set(["platform_role_assignment"]),
		source: `database.transaction((sqlTag) => [
			sqlTag\`SELECT * FROM platform_role_assignment AS assignment WHERE assignment.organization_id = \${organizationId}\`,
		]);`,
	});
	assert.deepEqual(findings, []);
});

test("restricts registered system SQL to its canonical owner source", () => {
	const systemSqlOperationOwners = new Map([
		[
			"human-resources.reliability.claim-due",
			"packages/erp/human-resources/src/kernel/reliability/adapters/drizzle.ts",
		],
	]);
	const findings = analyzeTenantSqlSafety({
		file: "packages/erp/other/src/drizzle.ts",
		hardTenantTables,
		hardTenantTableNames: new Set(["hr_reliability_work_item"]),
		systemSqlOperationOwners,
		source: `database.system.transaction(
			"human-resources.reliability.claim-due",
			(sqlTag) => [sqlTag\`SELECT * FROM hr_reliability_work_item\`],
		);`,
	});
	assert.equal(
		findings[0]?.rule,
		"system-sql-operation-owner-mismatch",
	);
});

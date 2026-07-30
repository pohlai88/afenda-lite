import { drizzle } from "drizzle-orm/neon-http";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "../src/client";
import { databaseSchema } from "../src/database-schema";
import {
	buildPlatformPermissionCatalogBatch,
	ensurePlatformPermissionCatalog,
	PLATFORM_PERMISSION_CODES_V1,
} from "../src/platform-permission-catalog";
import {
	buildPlatformPermissionCatalogBatch as buildReconciliationBatch,
	type PlatformPermissionCatalogReconciliationInput,
} from "../src/platform-permission-catalog-reconciler";

function createMockDatabase(): Database {
	return drizzle.mock({ schema: databaseSchema }) as Database;
}

function createReconciliationInput(): PlatformPermissionCatalogReconciliationInput {
	return {
		grantMigrations: [{ from: "permission.legacy", to: ["permission.read"] }],
		permissions: [
			{
				code: "permission.read",
				description: "Read records",
				module: "example",
				sensitive: false,
			},
		],
		retiredPermissionCodes: ["permission.legacy"],
		roleTemplates: [
			{
				description: "Example role",
				name: "Example",
				permissionCodes: ["permission.read"],
				templateKey: "example",
			},
		],
	};
}

describe("platform permission catalog transactional plan", () => {
	it.each([
		{
			label: "duplicate living permission",
			mutate: (input: PlatformPermissionCatalogReconciliationInput) => ({
				...input,
				permissions: [...input.permissions, input.permissions[0]],
			}),
			message: /duplicate living permission code/,
		},
		{
			label: "living and retired overlap",
			mutate: (input: PlatformPermissionCatalogReconciliationInput) => ({
				...input,
				retiredPermissionCodes: ["permission.read"],
			}),
			message: /both living and retired/,
		},
		{
			label: "unknown template permission",
			mutate: (input: PlatformPermissionCatalogReconciliationInput) => ({
				...input,
				roleTemplates: [
					{
						...input.roleTemplates[0],
						permissionCodes: ["permission.missing"],
					},
				],
			}),
			message: /references unknown permission/,
		},
		{
			label: "duplicate template key",
			mutate: (input: PlatformPermissionCatalogReconciliationInput) => ({
				...input,
				roleTemplates: [
					...input.roleTemplates,
					{ ...input.roleTemplates[0], name: "Duplicate" },
				],
			}),
			message: /duplicate role template key/,
		},
		{
			label: "unknown migration target",
			mutate: (input: PlatformPermissionCatalogReconciliationInput) => ({
				...input,
				grantMigrations: [
					{ from: "permission.legacy", to: ["permission.missing"] },
				],
			}),
			message: /migration target is not living/,
		},
		{
			label: "duplicate migration source",
			mutate: (input: PlatformPermissionCatalogReconciliationInput) => ({
				...input,
				grantMigrations: [
					...input.grantMigrations,
					{ from: "permission.legacy", to: ["permission.read"] },
				],
			}),
			message: /duplicate grant migration source/,
		},
	])("rejects $label before constructing a batch", ({ mutate, message }) => {
		const input = mutate(createReconciliationInput());
		expect(() => buildReconciliationBatch(createMockDatabase(), input)).toThrow(
			message,
		);
	});

	it("builds one bounded batch with a lock and one bulk permission upsert", () => {
		const plan = buildPlatformPermissionCatalogBatch(createMockDatabase());
		const dialect = new PgDialect();

		expect(plan.queries.length).toBeLessThanOrEqual(12);
		expect(plan.templateResultIndexes).toHaveLength(3);

		const lockQuery = plan.queries[0]
			? dialect.sqlToQuery(plan.queries[0].getSQL())
			: undefined;
		expect(lockQuery?.sql).toContain("pg_advisory_xact_lock");

		const permissionUpsert = plan.queries[1]
			? dialect.sqlToQuery(plan.queries[1].getSQL())
			: undefined;
		expect(permissionUpsert?.sql).toContain(
			'insert into "platform_permission"',
		);
		expect(permissionUpsert?.params).toHaveLength(
			PLATFORM_PERMISSION_CODES_V1.length * 4,
		);
	});

	it("submits the complete reconciliation through one atomic batch call", async () => {
		const database = createMockDatabase();
		const failure = new Error("batch failed");
		const batch = vi.fn().mockRejectedValue(failure);
		Object.defineProperty(database, "batch", { value: batch });

		await expect(ensurePlatformPermissionCatalog(database)).rejects.toBe(
			failure,
		);
		expect(batch).toHaveBeenCalledTimes(1);
	});

	it("validates and maps the three template results returned by Neon batch", async () => {
		const database = createMockDatabase();
		const plan = buildPlatformPermissionCatalogBatch(database);
		const results = plan.queries.map(() => ({ rows: [] }));
		for (const [position, template] of plan.templateResultIndexes.entries()) {
			results[template.index] = {
				rows: [{ created: position === 0, id: `role-${position + 1}` }],
			};
		}
		const batch = vi.fn().mockResolvedValue(results);
		Object.defineProperty(database, "batch", { value: batch });

		await expect(ensurePlatformPermissionCatalog(database)).resolves.toEqual({
			permissionCount: PLATFORM_PERMISSION_CODES_V1.length,
			templates: plan.templateResultIndexes.map((template, position) => ({
				created: position === 0,
				roleId: `role-${position + 1}`,
				templateKey: template.templateKey,
			})),
		});
		expect(batch).toHaveBeenCalledTimes(1);
	});
});

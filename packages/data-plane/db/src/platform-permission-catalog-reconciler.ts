import { inArray, sql } from "drizzle-orm";

import type { Database } from "./client";
import {
	platformPermission,
	platformRole,
	platformRolePermission,
} from "./schema/platform";

export interface PlatformPermissionCatalogRow {
	readonly code: string;
	readonly description: string;
	readonly module: string;
	readonly sensitive: boolean;
}

export interface PlatformPermissionGrantMigration {
	readonly from: string;
	readonly to: readonly string[];
}

export interface PlatformPermissionRoleTemplate {
	readonly description: string;
	readonly name: string;
	readonly permissionCodes: readonly string[];
	readonly templateKey: string;
}

export interface PlatformPermissionCatalogReconciliationInput {
	readonly grantMigrations: readonly PlatformPermissionGrantMigration[];
	readonly permissions: readonly PlatformPermissionCatalogRow[];
	readonly retiredPermissionCodes: readonly string[];
	readonly roleTemplates: readonly PlatformPermissionRoleTemplate[];
}

export interface PlatformPermissionCatalogBatchPlan {
	readonly queries: Parameters<Database["batch"]>[0];
	readonly templateResultIndexes: ReadonlyArray<{
		readonly index: number;
		readonly templateKey: string;
	}>;
}

export interface PlatformPermissionCatalogReconciliationResult {
	readonly permissionCount: number;
	readonly templates: ReadonlyArray<{
		readonly created: boolean;
		readonly roleId: string;
		readonly templateKey: string;
	}>;
}

const CATALOG_LOCK_NAME = "@afenda/db:platform-permission-catalog:v1";

function assertUnique(
	values: readonly string[],
	description: string,
): ReadonlySet<string> {
	const seen = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) {
			throw new Error(
				`Platform permission catalog has duplicate ${description}: ${value}`,
			);
		}
		seen.add(value);
	}
	return seen;
}

function validateRoleTemplates(
	templates: readonly PlatformPermissionRoleTemplate[],
	livingCodes: ReadonlySet<string>,
): void {
	assertUnique(
		templates.map(({ templateKey }) => templateKey),
		"role template key",
	);
	for (const template of templates) {
		if (template.permissionCodes.length === 0) {
			throw new Error(
				`Platform role template ${template.templateKey} requires at least one permission`,
			);
		}
		assertUnique(
			template.permissionCodes,
			`permission in role template ${template.templateKey}`,
		);
		for (const code of template.permissionCodes) {
			if (!livingCodes.has(code)) {
				throw new Error(
					`Platform role template ${template.templateKey} references unknown permission: ${code}`,
				);
			}
		}
	}
}

function validateGrantMigrations(
	migrations: readonly PlatformPermissionGrantMigration[],
	livingCodes: ReadonlySet<string>,
): void {
	assertUnique(
		migrations.map(({ from }) => from),
		"grant migration source",
	);
	for (const migration of migrations) {
		if (migration.to.length === 0) {
			throw new Error(
				`Platform permission grant migration ${migration.from} requires a target`,
			);
		}
		assertUnique(migration.to, `target in grant migration ${migration.from}`);
		for (const code of migration.to) {
			if (!livingCodes.has(code)) {
				throw new Error(
					`Platform permission grant migration target is not living: ${code}`,
				);
			}
		}
	}
}

function validateReconciliationInput(
	input: PlatformPermissionCatalogReconciliationInput,
): void {
	if (input.permissions.length === 0) {
		throw new Error(
			"Platform permission catalog requires at least one permission",
		);
	}
	if (input.retiredPermissionCodes.length === 0) {
		throw new Error(
			"Platform permission catalog requires an explicit retirement registry",
		);
	}
	if (input.roleTemplates.length === 0) {
		throw new Error(
			"Platform permission catalog requires at least one role template",
		);
	}

	const livingCodes = assertUnique(
		input.permissions.map(({ code }) => code),
		"living permission code",
	);
	const retiredCodes = assertUnique(
		input.retiredPermissionCodes,
		"retired permission code",
	);
	for (const code of livingCodes) {
		if (retiredCodes.has(code)) {
			throw new Error(
				`Platform permission catalog code is both living and retired: ${code}`,
			);
		}
	}

	validateRoleTemplates(input.roleTemplates, livingCodes);
	validateGrantMigrations(input.grantMigrations, livingCodes);
}

function buildGrantMigrationQueries(
	database: Database,
	migrations: readonly PlatformPermissionGrantMigration[],
) {
	return migrations.flatMap((migration) =>
		migration.to.map((permissionCode) =>
			database.execute(sql`
				insert into ${platformRolePermission} (
					"role_id",
					"permission_code",
					"granted_by"
				)
				select
					${platformRolePermission.roleId},
					${permissionCode},
					${platformRolePermission.grantedBy}
				from ${platformRolePermission}
				where ${platformRolePermission.permissionCode} = ${migration.from}
				on conflict ("role_id", "permission_code") do nothing
			`),
		),
	);
}

function buildTemplateReconciliationQuery(
	database: Database,
	template: PlatformPermissionRoleTemplate,
) {
	const permissionRows = sql.join(
		template.permissionCodes.map((code) => sql`(${code})`),
		sql`, `,
	);
	const permissionList = sql.join(
		template.permissionCodes.map((code) => sql`${code}`),
		sql`, `,
	);

	return database.execute(sql`
		with updated_role as (
			update ${platformRole}
			set
				"name" = ${template.name},
				"description" = ${template.description},
				"active" = true,
				"is_system_template" = true,
				"updated_at" = now()
			where ${platformRole.templateKey} = ${template.templateKey}
				and ${platformRole.isSystemTemplate} = true
				and ${platformRole.organizationId} is null
			returning ${platformRole.id} as "id", false as "created"
		),
		inserted_role as (
			insert into ${platformRole} (
				"organization_id",
				"name",
				"description",
				"active",
				"is_system_template",
				"template_key"
			)
			select
				null,
				${template.name},
				${template.description},
				true,
				true,
				${template.templateKey}
			where not exists (select 1 from updated_role)
			returning ${platformRole.id} as "id", true as "created"
		),
		template_role as (
			select "id", "created" from updated_role
			union all
			select "id", "created" from inserted_role
			order by "created" asc, "id" asc
			limit 1
		),
		inserted_permissions as (
			insert into ${platformRolePermission} ("role_id", "permission_code")
			select template_role."id", permission."code"
			from template_role
			cross join (values ${permissionRows}) as permission("code")
			on conflict ("role_id", "permission_code") do nothing
		),
		deleted_permissions as (
			delete from ${platformRolePermission}
			where ${platformRolePermission.roleId} = (select "id" from template_role)
				and ${platformRolePermission.permissionCode} not in (${permissionList})
		)
		select "id", "created" from template_role
	`);
}

export function buildPlatformPermissionCatalogBatch(
	database: Database,
	input: PlatformPermissionCatalogReconciliationInput,
): PlatformPermissionCatalogBatchPlan {
	validateReconciliationInput(input);

	const grantQueries = buildGrantMigrationQueries(
		database,
		input.grantMigrations,
	);
	const templateQueries = input.roleTemplates.map((template) =>
		buildTemplateReconciliationQuery(database, template),
	);
	const templateStartIndex = 4 + grantQueries.length;
	const queries = [
		database.execute(
			sql`select pg_advisory_xact_lock(hashtextextended(${CATALOG_LOCK_NAME}, 0))`,
		),
		database
			.insert(platformPermission)
			.values(input.permissions.map((row) => ({ ...row })))
			.onConflictDoUpdate({
				target: platformPermission.code,
				set: {
					description: sql.raw('excluded."description"'),
					module: sql.raw('excluded."module"'),
					sensitive: sql.raw('excluded."sensitive"'),
				},
			}),
		...grantQueries,
		database
			.delete(platformRolePermission)
			.where(
				inArray(platformRolePermission.permissionCode, [
					...input.retiredPermissionCodes,
				]),
			),
		database
			.delete(platformPermission)
			.where(
				inArray(platformPermission.code, [...input.retiredPermissionCodes]),
			),
		...templateQueries,
	] satisfies Parameters<Database["batch"]>[0];

	return {
		queries,
		templateResultIndexes: input.roleTemplates.map((template, index) => ({
			index: templateStartIndex + index,
			templateKey: template.templateKey,
		})),
	};
}

function readTemplateResult(
	result: unknown,
	templateKey: string,
): { created: boolean; roleId: string; templateKey: string } {
	if (!(typeof result === "object" && result !== null && "rows" in result)) {
		throw new Error(
			`Platform permission catalog returned no row set for template ${templateKey}`,
		);
	}
	const { rows } = result;
	const row = Array.isArray(rows) ? rows[0] : undefined;
	if (
		!(
			typeof row === "object" &&
			row !== null &&
			"id" in row &&
			typeof row.id === "string" &&
			"created" in row &&
			typeof row.created === "boolean"
		)
	) {
		throw new Error(
			`Platform permission catalog returned an invalid template result for ${templateKey}`,
		);
	}
	return { created: row.created, roleId: row.id, templateKey };
}

export async function reconcilePlatformPermissionCatalog(
	database: Database,
	input: PlatformPermissionCatalogReconciliationInput,
): Promise<PlatformPermissionCatalogReconciliationResult> {
	const plan = buildPlatformPermissionCatalogBatch(database, input);
	const results = await database.batch(plan.queries);
	return {
		permissionCount: input.permissions.length,
		templates: plan.templateResultIndexes.map(({ index, templateKey }) =>
			readTemplateResult(results[index], templateKey),
		),
	};
}

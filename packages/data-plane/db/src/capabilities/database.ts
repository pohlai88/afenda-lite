/**
 * @afenda/db permanent runtime capability facade.
 *
 * Schema tables and Drizzle operators remain root declarations because
 * consumers must compose typed SQL. Runtime infrastructure decisions stay
 * behind this object so client, tenancy, transaction, and catalog internals
 * can evolve without multiplying public APIs.
 */

import { db, orgWhere, tenantEntityPredicate, withOrg } from "../client";
import { databaseSchema } from "../database-schema";
import {
	HARD_TENANT_ROOT_ENTRIES,
	HARD_TENANT_ROOT_TABLE_NAMES,
	HARD_TENANT_ROOT_TABLES,
	type HardTenantRootTableName,
} from "../hard-tenant-roots";
import { runNeonHttpTransaction } from "../http-transaction";
import {
	ensurePlatformPermissionCatalog,
	isPlatformPermissionCodeV1,
	PLATFORM_PERMISSION_CODES_V1,
	PLATFORM_PERMISSION_V1,
	PLATFORM_ROLE_TEMPLATES_V1,
} from "../platform-permission-catalog";

export type PlatformPermissionCode =
	(typeof PLATFORM_PERMISSION_CODES_V1)[number];

function projectTenantRootNamesBySchemaSymbol() {
	const rootNameByTable = new Map<unknown, HardTenantRootTableName>();
	for (const [tableName, table] of HARD_TENANT_ROOT_ENTRIES) {
		rootNameByTable.set(table, tableName);
	}
	const projection: Record<string, HardTenantRootTableName> = {};
	for (const [symbol, value] of Object.entries(databaseSchema)) {
		const tableName = rootNameByTable.get(value);
		if (tableName !== undefined) {
			projection[symbol] = tableName;
		}
	}

	const expectedCount = HARD_TENANT_ROOT_TABLE_NAMES.length;
	const projectedNames = new Set(Object.values(projection));
	if (
		Object.keys(projection).length !== expectedCount ||
		projectedNames.size !== expectedCount
	) {
		throw new Error(
			`Tenant schema projection mismatch: expected ${expectedCount} unique root exports, received ${Object.keys(projection).length} exports for ${projectedNames.size} tables`,
		);
	}
	return Object.freeze(projection);
}

const databaseTenancy = Object.freeze({
	entity: tenantEntityPredicate,
	readAll: withOrg,
	rootNames: HARD_TENANT_ROOT_TABLE_NAMES,
	rootNamesBySchemaSymbol: projectTenantRootNamesBySchemaSymbol(),
	rootTables: HARD_TENANT_ROOT_TABLES,
	where: orgWhere,
});

const databasePermissions = Object.freeze({
	codes: PLATFORM_PERMISSION_CODES_V1,
	definitions: PLATFORM_PERMISSION_V1,
	ensure: () => ensurePlatformPermissionCatalog(db),
	isCode: isPlatformPermissionCodeV1,
	roles: PLATFORM_ROLE_TEMPLATES_V1,
});

/**
 * Permanent consumer facade for database runtime infrastructure.
 *
 * Do not destructure methods from this object. Keeping calls capability-bound
 * preserves the package boundary when an internal driver or policy changes.
 */
export const database = Object.freeze({
	client: db,
	permissions: databasePermissions,
	tenancy: databaseTenancy,
	transaction: runNeonHttpTransaction,
});

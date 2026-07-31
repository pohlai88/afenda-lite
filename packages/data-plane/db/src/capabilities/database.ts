/**
 * @afenda/db permanent runtime capability facade.
 *
 * Schema tables and Drizzle operators remain root declarations because
 * consumers must compose typed SQL. Runtime infrastructure decisions stay
 * behind this object so client, tenancy, transaction, and catalog internals
 * can evolve without multiplying public APIs.
 */

import { db, orgWhere, tenantEntityPredicate, withOrg } from "../client";
import {
	HARD_TENANT_ROOT_TABLE_NAMES,
	HARD_TENANT_ROOT_TABLES,
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

const databaseTenancy = Object.freeze({
	entity: tenantEntityPredicate,
	readAll: withOrg,
	rootNames: HARD_TENANT_ROOT_TABLE_NAMES,
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

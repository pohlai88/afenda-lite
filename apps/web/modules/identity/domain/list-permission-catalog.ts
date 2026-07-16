import { asc, db, platformPermission } from "@afenda/db";

export type PermissionCatalogRow = {
	code: string;
	module: string;
	description: string;
	sensitive: boolean;
};

/**
 * Identity — read the platform permission catalog from `platform_permission`
 * (ARCH-023 §3.2 · N10). Does not invent codes; product path is DB-backed.
 */
export async function listPermissionCatalog(): Promise<PermissionCatalogRow[]> {
	const rows = await db
		.select({
			code: platformPermission.code,
			module: platformPermission.module,
			description: platformPermission.description,
			sensitive: platformPermission.sensitive,
		})
		.from(platformPermission)
		.orderBy(asc(platformPermission.code));

	return rows;
}

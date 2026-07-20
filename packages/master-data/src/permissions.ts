/**
 * Master-data permission codes — ERP-owned; must stay aligned with
 * `@afenda/db` PLATFORM_PERMISSION_V1 (master_data.*).
 */

export const MASTER_DATA_PERMISSION_READ = "master_data.read" as const;
export const MASTER_DATA_PERMISSION_MANAGE = "master_data.manage" as const;
export const MASTER_DATA_PERMISSION_APPROVE = "master_data.approve" as const;
export const MASTER_DATA_PERMISSION_IMPORT_APPROVE =
	"master_data.import_approve" as const;

export const MASTER_DATA_PERMISSION_CODES = [
	MASTER_DATA_PERMISSION_READ,
	MASTER_DATA_PERMISSION_MANAGE,
	MASTER_DATA_PERMISSION_APPROVE,
	MASTER_DATA_PERMISSION_IMPORT_APPROVE,
] as const;

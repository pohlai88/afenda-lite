/**
 * Sales permission codes — ERP-owned; must stay aligned with
 * `@afenda/db` PLATFORM_PERMISSION_V1 (sales.*).
 */

export const SALES_PERMISSION_READ = "sales.read" as const;
export const SALES_PERMISSION_MANAGE = "sales.manage" as const;

export const SALES_PERMISSION_CODES = [
	SALES_PERMISSION_READ,
	SALES_PERMISSION_MANAGE,
] as const;

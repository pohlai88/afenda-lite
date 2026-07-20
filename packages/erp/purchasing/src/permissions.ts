/**
 * Purchasing permission codes — ERP-owned; must stay aligned with
 * `@afenda/db` PLATFORM_PERMISSION_V1 (purchasing.*).
 */

export const PURCHASING_PERMISSION_READ = "purchasing.read" as const;
export const PURCHASING_PERMISSION_MANAGE = "purchasing.manage" as const;

export const PURCHASING_PERMISSION_CODES = [
	PURCHASING_PERMISSION_READ,
	PURCHASING_PERMISSION_MANAGE,
] as const;

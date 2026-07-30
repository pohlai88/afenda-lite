import type { PlatformPermissionCatalogRow } from "../platform-permission-catalog-reconciler";

export const FOUNDATION_PLATFORM_PERMISSIONS = [
	{
		code: "org.users.manage",
		module: "org",
		description: "Create, update, ban, and remove organization users",
		sensitive: true,
	},
	{
		code: "org.roles.manage",
		module: "org",
		description: "Manage platform roles and assignments",
		sensitive: true,
	},
	{
		code: "clients.invite",
		module: "org",
		description: "Invite members to the organization",
		sensitive: false,
	},
	{
		code: "account.self",
		module: "account",
		description: "Manage own account settings",
		sensitive: false,
	},
] as const satisfies readonly PlatformPermissionCatalogRow[];

import type { PlatformPermissionCatalogRow } from "../platform-permission-catalog-reconciler";

export const CORPORATE_ADMINISTRATION_PLATFORM_PERMISSIONS = [
	{
		code: "corporate_administration.company.read",
		module: "corporate_administration",
		description: "Read Corporate Administration legal company drafts",
		sensitive: false,
	},
	{
		code: "corporate_administration.company.manage",
		module: "corporate_administration",
		description: "Register Corporate Administration legal company drafts",
		sensitive: true,
	},
	{
		code: "corporate_administration.establishment.manage",
		module: "corporate_administration",
		description: "Manage Corporate Administration legal establishments",
		sensitive: true,
	},
	{
		code: "corporate_administration.governance.read",
		module: "corporate_administration",
		description: "Read Corporate Administration governance records",
		sensitive: false,
	},
	{
		code: "corporate_administration.governance.manage",
		module: "corporate_administration",
		description: "Manage Corporate Administration governance records",
		sensitive: true,
	},
	{
		code: "corporate_administration.officer.read",
		module: "corporate_administration",
		description: "Read Corporate Administration officer records",
		sensitive: false,
	},
	{
		code: "corporate_administration.officer.manage",
		module: "corporate_administration",
		description: "Manage Corporate Administration officer records",
		sensitive: true,
	},
	{
		code: "corporate_administration.officer_compliance.read",
		module: "corporate_administration",
		description: "Read Corporate Administration officer compliance records",
		sensitive: true,
	},
	{
		code: "corporate_administration.officer_compliance.manage",
		module: "corporate_administration",
		description: "Manage Corporate Administration officer compliance records",
		sensitive: true,
	},
	{
		code: "corporate_administration.meeting.read",
		module: "corporate_administration",
		description: "Read Corporate Administration meeting records",
		sensitive: false,
	},
	{
		code: "corporate_administration.meeting.manage",
		module: "corporate_administration",
		description: "Manage Corporate Administration meeting records",
		sensitive: true,
	},
	{
		code: "corporate_administration.resolution.read",
		module: "corporate_administration",
		description: "Read Corporate Administration resolution records",
		sensitive: false,
	},
	{
		code: "corporate_administration.resolution.manage",
		module: "corporate_administration",
		description: "Manage Corporate Administration resolution records",
		sensitive: true,
	},
] as const satisfies readonly PlatformPermissionCatalogRow[];

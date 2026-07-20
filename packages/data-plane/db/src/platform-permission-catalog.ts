/**
 * ARCH-023 §3.2 — platform permission catalog v1 + system role templates.
 *
 * Adding a code is a release. Domain vertical catalogs are absent after the
 * declarations/FFT wipe — only platform / org / account codes remain.
 */
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";

import type { Database } from "./client";
import {
	platformPermission,
	platformRole,
	platformRolePermission,
} from "./schema/platform";

/** Seed permission codes (v1) — ARCH-023 §3.2 (shell after domain wipe). */
export const PLATFORM_PERMISSION_V1 = [
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
	{
		code: "master_data.read",
		module: "master_data",
		description: "Read organization master data (party, item, warehouse)",
		sensitive: false,
	},
	{
		code: "master_data.manage",
		module: "master_data",
		description: "Create and mutate organization master data",
		sensitive: true,
	},
	{
		code: "master_data.approve",
		module: "master_data",
		description: "Approve or reject master-data change requests (checker)",
		sensitive: true,
	},
	{
		code: "master_data.import_approve",
		module: "master_data",
		description: "Approve and apply master-data bulk import",
		sensitive: true,
	},
	{
		code: "sales.read",
		module: "sales",
		description: "Read organization sales orders",
		sensitive: false,
	},
	{
		code: "sales.manage",
		module: "sales",
		description: "Create, line, and post sales orders",
		sensitive: true,
	},
] as const;

/** Retired v1 codes removed by the domain wipe — deleted on ensure. */
const RETIRED_PLATFORM_PERMISSION_CODES = [
	"declarations.manage",
	"declarations.read",
	"fft.access",
] as const;

export type PlatformPermissionV1 = (typeof PLATFORM_PERMISSION_V1)[number];

export type PlatformPermissionCodeV1 = PlatformPermissionV1["code"];

export const PLATFORM_PERMISSION_CODES_V1: readonly PlatformPermissionCodeV1[] =
	PLATFORM_PERMISSION_V1.map((row) => row.code);

const PLATFORM_PERMISSION_CODE_SET = new Set<string>(
	PLATFORM_PERMISSION_CODES_V1,
);

/** True when `code` is an ARCH-023 v1 platform permission code. */
export function isPlatformPermissionCodeV1(
	code: string,
): code is PlatformPermissionCodeV1 {
	return PLATFORM_PERMISSION_CODE_SET.has(code);
}

export type PlatformRoleTemplateV1 = {
	templateKey: string;
	name: string;
	description: string;
	permissionCodes: readonly PlatformPermissionCodeV1[];
};

const ALL_V1_CODES = PLATFORM_PERMISSION_CODES_V1;

/** Seed role templates (display names only) — ARCH-023 §3.2. */
export const PLATFORM_ROLE_TEMPLATES_V1: readonly PlatformRoleTemplateV1[] = [
	{
		templateKey: "org_admin",
		name: "Org Admin",
		description: "Full organization administration (all v1 platform codes)",
		permissionCodes: ALL_V1_CODES,
	},
	{
		templateKey: "editor",
		name: "Editor",
		description:
			"Org invite + master-data manage + account self (no MDG/import approve)",
		permissionCodes: [
			"clients.invite",
			"account.self",
			"master_data.read",
			"master_data.manage",
			"sales.read",
			"sales.manage",
		],
	},
	{
		templateKey: "viewer",
		name: "Viewer",
		description: "Account self + master-data read + sales read",
		permissionCodes: ["account.self", "master_data.read", "sales.read"],
	},
] as const;

export type EnsurePlatformPermissionCatalogResult = {
	permissionCount: number;
	templates: ReadonlyArray<{
		templateKey: string;
		roleId: string;
		created: boolean;
	}>;
};

/**
 * Idempotent upsert of ARCH-023 v1 `platform_permission` rows and the three
 * system role templates (`org_admin` · `editor` · `viewer`) with exact
 * `platform_role_permission` links. Preserves existing template UUIDs when
 * `template_key` already exists. Removes retired domain permission codes.
 */
export async function ensurePlatformPermissionCatalog(
	database: Database,
): Promise<EnsurePlatformPermissionCatalogResult> {
	for (const row of PLATFORM_PERMISSION_V1) {
		await database
			.insert(platformPermission)
			.values({
				code: row.code,
				module: row.module,
				description: row.description,
				sensitive: row.sensitive,
			})
			.onConflictDoUpdate({
				target: platformPermission.code,
				set: {
					module: row.module,
					description: row.description,
					sensitive: row.sensitive,
				},
			});
	}

	await database
		.delete(platformRolePermission)
		.where(
			inArray(platformRolePermission.permissionCode, [
				...RETIRED_PLATFORM_PERMISSION_CODES,
			]),
		);
	await database
		.delete(platformPermission)
		.where(
			inArray(platformPermission.code, [...RETIRED_PLATFORM_PERMISSION_CODES]),
		);

	const templates: Array<{
		templateKey: string;
		roleId: string;
		created: boolean;
	}> = [];

	for (const template of PLATFORM_ROLE_TEMPLATES_V1) {
		const [existing] = await database
			.select({ id: platformRole.id })
			.from(platformRole)
			.where(
				and(
					eq(platformRole.templateKey, template.templateKey),
					eq(platformRole.isSystemTemplate, true),
					isNull(platformRole.organizationId),
				),
			)
			.limit(1);

		let roleId: string;
		let created = false;

		if (existing) {
			roleId = existing.id;
			await database
				.update(platformRole)
				.set({
					name: template.name,
					description: template.description,
					active: true,
					isSystemTemplate: true,
					updatedAt: new Date(),
				})
				.where(eq(platformRole.id, roleId));
		} else {
			const [inserted] = await database
				.insert(platformRole)
				.values({
					organizationId: null,
					name: template.name,
					description: template.description,
					active: true,
					isSystemTemplate: true,
					templateKey: template.templateKey,
				})
				.returning({ id: platformRole.id });
			if (!inserted) {
				throw new Error(
					`ensurePlatformPermissionCatalog failed to insert template ${template.templateKey}`,
				);
			}
			roleId = inserted.id;
			created = true;
		}

		const codes = [...template.permissionCodes];

		if (codes.length > 0) {
			await database
				.insert(platformRolePermission)
				.values(
					codes.map((permissionCode) => ({
						roleId,
						permissionCode,
					})),
				)
				.onConflictDoNothing();

			await database
				.delete(platformRolePermission)
				.where(
					and(
						eq(platformRolePermission.roleId, roleId),
						notInArray(platformRolePermission.permissionCode, codes),
					),
				);
		} else {
			await database
				.delete(platformRolePermission)
				.where(eq(platformRolePermission.roleId, roleId));
		}

		templates.push({
			templateKey: template.templateKey,
			roleId,
			created,
		});
	}

	const permissionRows = await database
		.select({ code: platformPermission.code })
		.from(platformPermission)
		.where(inArray(platformPermission.code, [...PLATFORM_PERMISSION_CODES_V1]));

	return {
		permissionCount: permissionRows.length,
		templates,
	};
}

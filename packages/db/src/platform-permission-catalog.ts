/**
 * ARCH-023 §3.2 — platform permission catalog v1 + system role templates.
 *
 * Adding a code is a release. FFT domain catalogs stay out of platform_* (R6).
 * `fft.access` is module entry only.
 */
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";

import type { Database } from "./client";
import {
	platformPermission,
	platformRole,
	platformRolePermission,
} from "./schema/platform";

/** Seed permission codes (v1) — ARCH-023 §3.2. */
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
		code: "declarations.manage",
		module: "declarations",
		description: "Create and manage declarations",
		sensitive: false,
	},
	{
		code: "declarations.read",
		module: "declarations",
		description: "View declarations",
		sensitive: false,
	},
	{
		code: "clients.invite",
		module: "declarations",
		description: "Invite clients to declarations",
		sensitive: false,
	},
	{
		code: "account.self",
		module: "account",
		description: "Manage own account settings",
		sensitive: false,
	},
	{
		code: "fft.access",
		module: "fft",
		description: "Enter Feed Farm Trade module and see FFT nav",
		sensitive: false,
	},
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
		description: "Declarations edit + client invite + account self",
		permissionCodes: [
			"declarations.manage",
			"declarations.read",
			"clients.invite",
			"account.self",
		],
	},
	{
		templateKey: "viewer",
		name: "Viewer",
		description: "Declarations read + account self",
		permissionCodes: ["declarations.read", "account.self"],
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
 * `template_key` already exists. Does not create/remove non-v1 templates
 * (e.g. live `fft_member`).
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

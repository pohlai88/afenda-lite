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
		code: "sales.order.create",
		module: "sales",
		description: "Create draft sales orders",
		sensitive: true,
	},
	{
		code: "sales.order.update",
		module: "sales",
		description: "Add or update lines on draft sales orders",
		sensitive: true,
	},
	{
		code: "sales.order.post",
		module: "sales",
		description: "Post draft sales orders and freeze snapshots",
		sensitive: true,
	},
	{
		code: "sales.order.cancel",
		module: "sales",
		description: "Cancel draft or posted sales orders",
		sensitive: true,
	},
	{
		code: "sales.order.read",
		module: "sales",
		description: "Read a single sales order by id",
		sensitive: false,
	},
	{
		code: "sales.order.list",
		module: "sales",
		description: "List organization sales orders",
		sensitive: false,
	},
	{
		code: "purchasing.order.create",
		module: "purchasing",
		description: "Create draft purchase orders",
		sensitive: true,
	},
	{
		code: "purchasing.order.update",
		module: "purchasing",
		description: "Add or update lines on draft purchase orders",
		sensitive: true,
	},
	{
		code: "purchasing.order.post",
		module: "purchasing",
		description: "Post draft purchase orders and freeze snapshots",
		sensitive: true,
	},
	{
		code: "purchasing.order.cancel",
		module: "purchasing",
		description: "Cancel draft purchase orders",
		sensitive: true,
	},
	{
		code: "purchasing.order.close",
		module: "purchasing",
		description: "Close posted purchase orders (terminate remaining commitment)",
		sensitive: true,
	},
	{
		code: "purchasing.order.read",
		module: "purchasing",
		description: "Read a single purchase order by id",
		sensitive: false,
	},
	{
		code: "purchasing.order.list",
		module: "purchasing",
		description: "List organization purchase orders",
		sensitive: false,
	},
	{
		code: "inventory.read",
		module: "inventory",
		description: "Read organization stock movements and availability",
		sensitive: false,
	},
	{
		code: "inventory.manage",
		module: "inventory",
		description: "Create, post, reserve, and release inventory stock",
		sensitive: true,
	},
	{
		code: "receiving.read",
		module: "receiving",
		description: "Read organization goods receipts and discrepancies",
		sensitive: false,
	},
	{
		code: "receiving.manage",
		module: "receiving",
		description: "Create, post, close, cancel, and reconcile goods receipts",
		sensitive: true,
	},
	{
		code: "fulfillment.read",
		module: "fulfillment",
		description:
			"Read organization deliveries, picks, packs, and proof of delivery",
		sensitive: false,
	},
	{
		code: "fulfillment.manage",
		module: "fulfillment",
		description:
			"Create, pick, pack, post, deliver, close, and cancel deliveries",
		sensitive: true,
	},
	{
		code: "receivables.read",
		module: "receivables",
		description:
			"Read organization sales invoices, credit notes, allocations, and balances",
		sensitive: false,
	},
	{
		code: "receivables.manage",
		module: "receivables",
		description: "Create, post, cancel, and allocate organization receivables",
		sensitive: true,
	},
	{
		code: "payables.read",
		module: "payables",
		description:
			"Read organization supplier invoices, credit notes, matches, allocations, and balances",
		sensitive: false,
	},
	{
		code: "payables.manage",
		module: "payables",
		description:
			"Create, match, post, cancel, and allocate organization payables",
		sensitive: true,
	},
	{
		code: "payments.read",
		module: "payments",
		description:
			"Read organization payments, allocations, reversals, and refunds",
		sensitive: false,
	},
	{
		code: "payments.manage",
		module: "payments",
		description:
			"Create, post, reverse, cancel, allocate, and refund organization payments",
		sensitive: true,
	},
	{
		code: "accounting.read",
		module: "accounting",
		description: "Read organization journals, ledger postings, and periods",
		sensitive: false,
	},
	{
		code: "accounting.manage",
		module: "accounting",
		description:
			"Create, post, reverse, and close organization accounting records",
		sensitive: true,
	},
] as const;

/** Retired v1 codes removed by the domain wipe / S15 cutover — deleted on ensure. */
const RETIRED_PLATFORM_PERMISSION_CODES = [
	"declarations.manage",
	"declarations.read",
	"fft.access",
	"sales.read",
	"sales.manage",
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
			"sales.order.create",
			"sales.order.update",
			"sales.order.post",
			"sales.order.cancel",
			"sales.order.read",
			"sales.order.list",
			"purchasing.order.create",
			"purchasing.order.update",
			"purchasing.order.post",
			"purchasing.order.cancel",
			"purchasing.order.close",
			"purchasing.order.read",
			"purchasing.order.list",
			"inventory.read",
			"inventory.manage",
			"receiving.read",
			"receiving.manage",
			"fulfillment.read",
			"fulfillment.manage",
			"receivables.read",
			"receivables.manage",
			"payables.read",
			"payables.manage",
			"payments.read",
			"payments.manage",
			"accounting.read",
			"accounting.manage",
		],
	},
	{
		templateKey: "viewer",
		name: "Viewer",
		description:
			"Account self + master-data and operational module read access",
		permissionCodes: [
			"account.self",
			"master_data.read",
			"sales.order.read",
			"sales.order.list",
			"purchasing.order.read",
			"purchasing.order.list",
			"inventory.read",
			"receiving.read",
			"fulfillment.read",
			"receivables.read",
			"payables.read",
			"payments.read",
			"accounting.read",
		],
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

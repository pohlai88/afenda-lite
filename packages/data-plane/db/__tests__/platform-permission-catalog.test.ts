/**
 * N10 — ARCH-023 v1 permission catalog + idempotent ensure.
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "../src/client";
import {
	ensurePlatformPermissionCatalog,
	isPlatformPermissionCodeV1,
	PLATFORM_PERMISSION_CODES_V1,
	PLATFORM_PERMISSION_V1,
	PLATFORM_ROLE_TEMPLATES_V1,
} from "../src/platform-permission-catalog";
import {
	platformPermission,
	platformRole,
	platformRolePermission,
} from "../src/schema/platform";

const { hasDatabase } = resolveDatabaseUrlForTests();

const ARCH023_V1_CODES = [
	"org.users.manage",
	"org.roles.manage",
	"clients.invite",
	"account.self",
	"master_data.read",
	"master_data.manage",
	"master_data.approve",
	"master_data.import_approve",
	"sales.read",
	"sales.manage",
	"purchasing.read",
	"purchasing.manage",
] as const;

describe("PLATFORM_PERMISSION_V1 (N10 / ARCH-023)", () => {
	it("matches ARCH-023 §3.2 seed codes exactly", () => {
		expect([...PLATFORM_PERMISSION_CODES_V1].toSorted()).toEqual(
			[...ARCH023_V1_CODES].toSorted(),
		);
		expect(PLATFORM_PERMISSION_V1).toHaveLength(12);
	});

	it("isPlatformPermissionCodeV1 accepts only v1 codes", () => {
		expect(isPlatformPermissionCodeV1("org.roles.manage")).toBe(true);
		expect(isPlatformPermissionCodeV1("sales.read")).toBe(true);
		expect(isPlatformPermissionCodeV1("fft.orders.manage")).toBe(false);
		expect(isPlatformPermissionCodeV1("declarations.read")).toBe(false);
		expect(isPlatformPermissionCodeV1("")).toBe(false);
	});

	it("defines Org Admin / Editor / Viewer templates only", () => {
		expect(
			PLATFORM_ROLE_TEMPLATES_V1.map((t) => t.templateKey).toSorted(),
		).toEqual(["editor", "org_admin", "viewer"]);

		const orgAdmin = PLATFORM_ROLE_TEMPLATES_V1.find(
			(t) => t.templateKey === "org_admin",
		);
		expect(orgAdmin?.permissionCodes.toSorted()).toEqual(
			[...ARCH023_V1_CODES].toSorted(),
		);

		const editor = PLATFORM_ROLE_TEMPLATES_V1.find(
			(t) => t.templateKey === "editor",
		);
		expect(editor?.permissionCodes.toSorted()).toEqual(
			[
				"account.self",
				"clients.invite",
				"master_data.manage",
				"master_data.read",
				"purchasing.manage",
				"purchasing.read",
				"sales.manage",
				"sales.read",
			].toSorted(),
		);

		const viewer = PLATFORM_ROLE_TEMPLATES_V1.find(
			(t) => t.templateKey === "viewer",
		);
		expect(viewer?.permissionCodes.toSorted()).toEqual(
			[
				"account.self",
				"master_data.read",
				"purchasing.read",
				"sales.read",
			].toSorted(),
		);
	});
});

describe.skipIf(!hasDatabase)("ensurePlatformPermissionCatalog (N10)", () => {
	it("is idempotent and preserves template_key → role ids", async () => {
		const first = await ensurePlatformPermissionCatalog(db);
		expect(first.permissionCount).toBe(12);
		expect(first.templates).toHaveLength(3);

		const second = await ensurePlatformPermissionCatalog(db);
		expect(second.permissionCount).toBe(12);
		expect(second.templates.map((t) => t.roleId).toSorted()).toEqual(
			first.templates.map((t) => t.roleId).toSorted(),
		);
		expect(second.templates.every((t) => t.created === false)).toBe(true);

		const codes = await db
			.select({ code: platformPermission.code })
			.from(platformPermission)
			.where(
				inArray(platformPermission.code, [...PLATFORM_PERMISSION_CODES_V1]),
			);
		expect(codes.map((r) => r.code).toSorted()).toEqual(
			[...ARCH023_V1_CODES].toSorted(),
		);

		for (const template of PLATFORM_ROLE_TEMPLATES_V1) {
			const [role] = await db
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
			expect(role).toBeDefined();
			if (!role) continue;

			const links = await db
				.select({ code: platformRolePermission.permissionCode })
				.from(platformRolePermission)
				.where(eq(platformRolePermission.roleId, role.id));
			expect(links.map((l) => l.code).toSorted()).toEqual(
				[...template.permissionCodes].toSorted(),
			);
		}

		// Stable UUIDs across ensure calls (values rotate after Mode C baseline wipe+reseed)
		const orgAdmin = first.templates.find((t) => t.templateKey === "org_admin");
		const viewer = first.templates.find((t) => t.templateKey === "viewer");
		expect(orgAdmin?.roleId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
		expect(viewer?.roleId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
		);
		expect(orgAdmin?.roleId).not.toBe(viewer?.roleId);
	}, 30_000);
});

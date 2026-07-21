/**
 * N10 — living PLATFORM_PERMISSION_V1 catalog + idempotent ensure.
 * SSOT = platform-permission-catalog.ts (no frozen ARCH-023 snapshot duplicate).
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

const V1_COUNT = PLATFORM_PERMISSION_CODES_V1.length;

function templateCodes(templateKey: string): readonly string[] {
	const template = PLATFORM_ROLE_TEMPLATES_V1.find(
		(row) => row.templateKey === templateKey,
	);
	expect(template).toBeDefined();
	return template?.permissionCodes ?? [];
}

describe("PLATFORM_PERMISSION_V1 (N10 / ARCH-023)", () => {
	it("keeps unique living catalog codes as SSOT", () => {
		expect(PLATFORM_PERMISSION_V1).toHaveLength(V1_COUNT);
		expect(new Set(PLATFORM_PERMISSION_CODES_V1).size).toBe(V1_COUNT);
		expect(V1_COUNT).toBeGreaterThan(74);
		expect(PLATFORM_PERMISSION_CODES_V1).toContain(
			"human-resources.employee.create",
		);
		expect(PLATFORM_PERMISSION_CODES_V1).toContain("accounting.journal.read");
		expect(PLATFORM_PERMISSION_CODES_V1).not.toContain("accounting.read");
		expect(PLATFORM_PERMISSION_CODES_V1).not.toContain("accounting.manage");
	});

	it("isPlatformPermissionCodeV1 accepts only living v1 codes", () => {
		expect(isPlatformPermissionCodeV1("org.roles.manage")).toBe(true);
		expect(isPlatformPermissionCodeV1("sales.order.read")).toBe(true);
		expect(isPlatformPermissionCodeV1("sales.order.list")).toBe(true);
		expect(isPlatformPermissionCodeV1("sales.read")).toBe(false);
		expect(isPlatformPermissionCodeV1("sales.manage")).toBe(false);
		expect(isPlatformPermissionCodeV1("purchasing.order.create")).toBe(true);
		expect(isPlatformPermissionCodeV1("purchasing.order.close")).toBe(true);
		expect(isPlatformPermissionCodeV1("purchasing.read")).toBe(false);
		expect(isPlatformPermissionCodeV1("purchasing.manage")).toBe(false);
		expect(isPlatformPermissionCodeV1("inventory.movement.read")).toBe(true);
		expect(isPlatformPermissionCodeV1("inventory.read")).toBe(false);
		expect(isPlatformPermissionCodeV1("inventory.manage")).toBe(false);
		expect(isPlatformPermissionCodeV1("receiving.receipt.read")).toBe(true);
		expect(isPlatformPermissionCodeV1("fulfillment.delivery.read")).toBe(true);
		expect(isPlatformPermissionCodeV1("fulfillment.read")).toBe(false);
		expect(isPlatformPermissionCodeV1("receivables.invoice.read")).toBe(true);
		expect(isPlatformPermissionCodeV1("receivables.read")).toBe(false);
		expect(isPlatformPermissionCodeV1("payables.read")).toBe(true);
		expect(isPlatformPermissionCodeV1("payments.payment.read")).toBe(true);
		expect(isPlatformPermissionCodeV1("payments.read")).toBe(false);
		expect(isPlatformPermissionCodeV1("payments.manage")).toBe(false);
		expect(isPlatformPermissionCodeV1("accounting.journal.read")).toBe(true);
		expect(isPlatformPermissionCodeV1("accounting.read")).toBe(false);
		expect(isPlatformPermissionCodeV1("accounting.manage")).toBe(false);
		expect(isPlatformPermissionCodeV1("human-resources.employee.read")).toBe(
			true,
		);
		expect(isPlatformPermissionCodeV1("fft.orders.manage")).toBe(false);
		expect(isPlatformPermissionCodeV1("declarations.read")).toBe(false);
		expect(isPlatformPermissionCodeV1("")).toBe(false);
	});

	it("defines Org Admin / Editor / Viewer templates with subset integrity", () => {
		expect(
			PLATFORM_ROLE_TEMPLATES_V1.map((t) => t.templateKey).toSorted(),
		).toEqual(["editor", "org_admin", "viewer"]);

		const orgAdminCodes = templateCodes("org_admin");
		const editorCodes = templateCodes("editor");
		const viewerCodes = templateCodes("viewer");
		const orgAdminSet = new Set(orgAdminCodes);

		expect([...orgAdminCodes].toSorted()).toEqual(
			[...PLATFORM_PERMISSION_CODES_V1].toSorted(),
		);
		expect(editorCodes.length).toBeLessThan(orgAdminCodes.length);
		expect(viewerCodes.length).toBeLessThan(editorCodes.length);

		for (const code of editorCodes) {
			expect(orgAdminSet.has(code)).toBe(true);
		}
		for (const code of viewerCodes) {
			expect(orgAdminSet.has(code)).toBe(true);
		}

		expect(editorCodes).toContain("master_data.manage");
		expect(editorCodes).not.toContain("master_data.approve");
		expect(viewerCodes).toContain("master_data.read");
		expect(viewerCodes).not.toContain("master_data.manage");
		expect(viewerCodes).toContain("accounting.journal.read");
		expect(viewerCodes).not.toContain("accounting.journal.post");
	});
});

describe.skipIf(!hasDatabase)("ensurePlatformPermissionCatalog (N10)", () => {
	it("is idempotent and preserves template_key → role ids", async () => {
		const first = await ensurePlatformPermissionCatalog(db);
		expect(first.permissionCount).toBe(V1_COUNT);
		expect(first.templates).toHaveLength(3);

		const second = await ensurePlatformPermissionCatalog(db);
		expect(second.permissionCount).toBe(V1_COUNT);
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
			[...PLATFORM_PERMISSION_CODES_V1].toSorted(),
		);

		const orgAdmin = first.templates.find((t) => t.templateKey === "org_admin");
		expect(orgAdmin).toBeDefined();
		if (orgAdmin === undefined) return;

		const links = await db
			.select({ permissionCode: platformRolePermission.permissionCode })
			.from(platformRolePermission)
			.where(eq(platformRolePermission.roleId, orgAdmin.roleId));
		expect(links.map((r) => r.permissionCode).toSorted()).toEqual(
			[...PLATFORM_PERMISSION_CODES_V1].toSorted(),
		);

		const [roleRow] = await db
			.select({
				templateKey: platformRole.templateKey,
				isSystemTemplate: platformRole.isSystemTemplate,
				organizationId: platformRole.organizationId,
			})
			.from(platformRole)
			.where(
				and(
					eq(platformRole.id, orgAdmin.roleId),
					eq(platformRole.isSystemTemplate, true),
					isNull(platformRole.organizationId),
				),
			)
			.limit(1);
		expect(roleRow?.templateKey).toBe("org_admin");
	}, 15_000);
});

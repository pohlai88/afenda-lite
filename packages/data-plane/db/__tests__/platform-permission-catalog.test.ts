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
	"inventory.movement.create",
	"inventory.movement.post",
	"inventory.movement.cancel",
	"inventory.movement.read",
	"inventory.reservation.create",
	"inventory.reservation.release",
	"inventory.availability.read",
	"inventory.adjustment.post",
	"receiving.receipt.read",
	"receiving.receipt.create",
	"receiving.receipt.update",
	"receiving.receipt.post",
	"receiving.receipt.cancel",
	"receiving.receipt.reverse",
	"receiving.discrepancy.record",
	"receiving.discrepancy.resolve",
	"fulfillment.delivery.read",
	"fulfillment.delivery.create",
	"fulfillment.delivery.update",
	"fulfillment.picking.confirm",
	"fulfillment.packing.confirm",
	"fulfillment.delivery.post",
	"fulfillment.delivery.cancel",
	"fulfillment.pod.record",
	"fulfillment.delivery.close",
	"receivables.invoice.read",
	"receivables.invoice.create",
	"receivables.invoice.update",
	"receivables.invoice.post",
	"receivables.invoice.cancel",
	"receivables.invoice.close",
	"receivables.credit_note.issue",
	"receivables.receipt.apply",
	"receivables.receipt_application.reverse",
	"receivables.balance.read",
	"receivables.aging.read",
	"payables.read",
	"payables.manage",
	"payments.payment.read",
	"payments.payment.create",
	"payments.payment.update",
	"payments.payment.post",
	"payments.payment.reverse",
	"payments.refund.create",
	"payments.refund.post",
	"payments.transfer.create",
	"payments.transfer.post",
	"payments.application_instruction.manage",
	"payments.account.manage",
	"payments.account.read",
	"payments.availability.read",
	"accounting.read",
	"accounting.manage",
] as const;

describe("PLATFORM_PERMISSION_V1 (N10 / ARCH-023)", () => {
	it("matches ARCH-023 §3.2 seed codes exactly", () => {
		expect([...PLATFORM_PERMISSION_CODES_V1].toSorted()).toEqual(
			[...ARCH023_V1_CODES].toSorted(),
		);
		expect(PLATFORM_PERMISSION_V1).toHaveLength(74);
	});

	it("isPlatformPermissionCodeV1 accepts only v1 codes", () => {
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
		expect(isPlatformPermissionCodeV1("accounting.read")).toBe(true);
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
				"accounting.manage",
				"accounting.read",
				"clients.invite",
				"fulfillment.delivery.cancel",
				"fulfillment.delivery.close",
				"fulfillment.delivery.create",
				"fulfillment.delivery.post",
				"fulfillment.delivery.read",
				"fulfillment.delivery.update",
				"fulfillment.packing.confirm",
				"fulfillment.picking.confirm",
				"fulfillment.pod.record",
				"inventory.adjustment.post",
				"inventory.availability.read",
				"inventory.movement.cancel",
				"inventory.movement.create",
				"inventory.movement.post",
				"inventory.movement.read",
				"inventory.reservation.create",
				"inventory.reservation.release",
				"master_data.manage",
				"master_data.read",
				"payables.manage",
				"payables.read",
				"payments.account.manage",
				"payments.account.read",
				"payments.application_instruction.manage",
				"payments.availability.read",
				"payments.payment.create",
				"payments.payment.post",
				"payments.payment.read",
				"payments.payment.reverse",
				"payments.payment.update",
				"payments.refund.create",
				"payments.refund.post",
				"payments.transfer.create",
				"payments.transfer.post",
				"purchasing.order.cancel",
				"purchasing.order.close",
				"purchasing.order.create",
				"purchasing.order.list",
				"purchasing.order.post",
				"purchasing.order.read",
				"purchasing.order.update",
				"receiving.discrepancy.record",
				"receiving.discrepancy.resolve",
				"receiving.receipt.cancel",
				"receiving.receipt.create",
				"receiving.receipt.post",
				"receiving.receipt.read",
				"receiving.receipt.reverse",
				"receiving.receipt.update",
				"receivables.aging.read",
				"receivables.balance.read",
				"receivables.credit_note.issue",
				"receivables.invoice.cancel",
				"receivables.invoice.close",
				"receivables.invoice.create",
				"receivables.invoice.post",
				"receivables.invoice.read",
				"receivables.invoice.update",
				"receivables.receipt.apply",
				"receivables.receipt_application.reverse",
				"sales.order.cancel",
				"sales.order.create",
				"sales.order.list",
				"sales.order.post",
				"sales.order.read",
				"sales.order.update",
			].toSorted(),
		);

		const viewer = PLATFORM_ROLE_TEMPLATES_V1.find(
			(t) => t.templateKey === "viewer",
		);
		expect(viewer?.permissionCodes.toSorted()).toEqual(
			[
				"account.self",
				"accounting.read",
				"fulfillment.delivery.read",
				"inventory.availability.read",
				"inventory.movement.read",
				"master_data.read",
				"payables.read",
				"payments.account.read",
				"payments.availability.read",
				"payments.payment.read",
				"purchasing.order.list",
				"purchasing.order.read",
				"receiving.receipt.read",
				"receivables.aging.read",
				"receivables.balance.read",
				"receivables.invoice.read",
				"sales.order.list",
				"sales.order.read",
			].toSorted(),
		);
	});
});

describe.skipIf(!hasDatabase)("ensurePlatformPermissionCatalog (N10)", () => {
	it("is idempotent and preserves template_key → role ids", async () => {
		const first = await ensurePlatformPermissionCatalog(db);
		expect(first.permissionCount).toBe(74);
		expect(first.templates).toHaveLength(3);

		const second = await ensurePlatformPermissionCatalog(db);
		expect(second.permissionCount).toBe(74);
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

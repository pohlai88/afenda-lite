import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { withOrg } from "../src/client";
import {
	HARD_TENANT_ROOT_TABLE_NAMES,
	HARD_TENANT_ROOT_TABLES,
} from "../src/hard-tenant-roots";
import {
	platformAuditLog,
	platformDomainEvent,
	platformNotification,
	platformRbacAudit,
	platformRole,
	platformRoleAssignment,
	platformSearchDocument,
} from "../src/schema/platform";

describe("@afenda/db hard tenant roots (N9 / ARCH-023)", () => {
	it("lists platform IAM + master-data hard tenant root table names", () => {
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toHaveLength(63);
		expect([...HARD_TENANT_ROOT_TABLE_NAMES]).toEqual([
			"platform_role_assignment",
			"platform_rbac_audit",
			"platform_audit_log",
			"platform_search_document",
			"platform_notification",
			"platform_domain_event",
			"md_party",
			"md_item_group",
			"md_item",
			"md_warehouse",
			"md_payment_term",
			"md_tax_registration",
			"md_party_role",
			"md_party_address",
			"md_party_contact",
			"md_party_external_id",
			"md_party_relationship",
			"md_item_uom",
			"md_item_barcode",
			"md_item_external_id",
			"md_item_alias",
			"md_warehouse_external_id",
			"md_item_template",
			"md_item_template_attribute",
			"md_item_template_attribute_option",
			"md_item_variant",
			"md_item_variant_attribute_value",
			"md_change_request",
			"sales_order",
			"sales_order_line",
			"purchase_order",
			"purchase_order_line",
			"sales_invoice",
			"sales_invoice_line",
			"sales_credit_note",
			"customer_allocation",
			"customer_balance_projection",
			"supplier_invoice",
			"supplier_invoice_line",
			"supplier_credit_note",
			"supplier_allocation",
			"three_way_match_result",
			"supplier_balance_projection",
			"payment",
			"payment_allocation",
			"payment_reversal",
			"stock_movement",
			"stock_movement_line",
			"stock_balance",
			"stock_ledger_entry",
			"stock_reservation",
			"goods_receipt",
			"goods_receipt_line",
			"receiving_discrepancy",
			"delivery",
			"delivery_line",
			"delivery_pick",
			"delivery_pack",
			"proof_of_delivery",
			"journal",
			"journal_line",
			"ledger_posting",
			"accounting_period",
		]);
	});

	it("exposes organization_id NOT NULL on every hard tenant root", () => {
		for (const table of Object.values(HARD_TENANT_ROOT_TABLES)) {
			const columns = getTableColumns(table);
			expect(columns.organizationId.name).toBe("organization_id");
			expect(columns.organizationId.notNull).toBe(true);
		}
	});

	it("keeps organization_id on living sample roots", () => {
		expect(getTableColumns(platformRoleAssignment).organizationId.name).toBe(
			"organization_id",
		);
		expect(getTableColumns(platformRbacAudit).organizationId.name).toBe(
			"organization_id",
		);
		expect(getTableColumns(platformAuditLog).organizationId.name).toBe(
			"organization_id",
		);
		expect(getTableColumns(platformSearchDocument).organizationId.name).toBe(
			"organization_id",
		);
		expect(getTableColumns(platformNotification).organizationId.name).toBe(
			"organization_id",
		);
		expect(getTableColumns(platformDomainEvent).organizationId.name).toBe(
			"organization_id",
		);
	});

	it("requires organization_id, type, status on platform_domain_event", () => {
		const columns = getTableColumns(platformDomainEvent);
		expect(columns.organizationId.notNull).toBe(true);
		expect(columns.type.notNull).toBe(true);
		expect(columns.sourceModule.notNull).toBe(true);
		expect(columns.correlationId.notNull).toBe(true);
		expect(columns.actorUserId.notNull).toBe(true);
		expect(columns.payload.notNull).toBe(true);
		expect(columns.status.notNull).toBe(true);
		expect(columns.attempts.notNull).toBe(true);
	});

	it("requires organization_id and user_id on platform_notification", () => {
		const columns = getTableColumns(platformNotification);
		expect(columns.organizationId.notNull).toBe(true);
		expect(columns.userId.notNull).toBe(true);
		expect(columns.channel.notNull).toBe(true);
		expect(columns.read.notNull).toBe(true);
	});

	it("requires organization_id and search_vector on platform_search_document", () => {
		const columns = getTableColumns(platformSearchDocument);
		expect(columns.organizationId.notNull).toBe(true);
		expect(columns.searchVector.notNull).toBe(true);
		expect(columns.documentId.name).toBe("document_id");
		expect(columns.entity.notNull).toBe(true);
	});

	it("requires organization_id, actor_user_id, correlation_id on platform_audit_log", () => {
		const columns = getTableColumns(platformAuditLog);
		expect(columns.organizationId.notNull).toBe(true);
		expect(columns.actorUserId.notNull).toBe(true);
		expect(columns.correlationId.notNull).toBe(true);
		expect(columns.correlationId.name).toBe("correlation_id");
	});

	it("exposes organization_id on platform_role (templates may be NULL)", () => {
		expect(getTableColumns(platformRole).organizationId.name).toBe(
			"organization_id",
		);
	});

	it("requires organization_id and actor_user_id on platform_rbac_audit (N12)", () => {
		const columns = getTableColumns(platformRbacAudit);
		expect(columns.organizationId.notNull).toBe(true);
		expect(columns.actorUserId.notNull).toBe(true);
	});

	it("exposes nullable correlation_id on platform_rbac_audit (I5.3 / API-007)", () => {
		const columns = getTableColumns(platformRbacAudit);
		expect(columns.correlationId.name).toBe("correlation_id");
		expect(columns.correlationId.notNull).toBe(false);
	});

	it("exposes nullable ip_address and user_agent on platform_rbac_audit", () => {
		const columns = getTableColumns(platformRbacAudit);
		expect(columns.ipAddress.name).toBe("ip_address");
		expect(columns.ipAddress.notNull).toBe(false);
		expect(columns.userAgent.name).toBe("user_agent");
		expect(columns.userAgent.notNull).toBe(false);
	});
});

describe("withOrg fail-closed (N9)", () => {
	it("rejects empty orgId before querying", async () => {
		await expect(withOrg(platformRoleAssignment, "   ")).rejects.toThrow(
			/non-empty orgId/,
		);
	});
});

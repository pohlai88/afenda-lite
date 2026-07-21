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
	it("lists hard tenant root table names including all HR roots", () => {
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toHaveLength(116);
		expect(Object.keys(HARD_TENANT_ROOT_TABLES)).toHaveLength(116);
		const hrRoots = HARD_TENANT_ROOT_TABLE_NAMES.filter((name) =>
			name.startsWith("hr_"),
		);
		expect(hrRoots).toHaveLength(43);
		expect(hrRoots[0]).toBe("hr_employee");
		expect(hrRoots.at(-1)).toBe("hr_compensation_review");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("supplier_credit_note_line");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain(
			"financial_posting_exception",
		);
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

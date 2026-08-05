import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { getTableColumns, getTableName, is } from "drizzle-orm";
import { getTableConfig, PgDialect, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { parseHardTenantRootEntries } from "../../../../scripts/lib/hard-tenant-root-registry.mjs";

import { database } from "../src/capabilities/database";
import { orgWhere, tenantEntityPredicate, withOrg } from "../src/client";
import { databaseSchema } from "../src/database-schema";
import {
	HARD_TENANT_ROOT_TABLE_NAMES,
	HARD_TENANT_ROOT_TABLES,
} from "../src/hard-tenant-roots";
import { mdParty } from "../src/schema/master-data";
import {
	platformAuditLog,
	platformDomainEvent,
	platformNotification,
	platformRbacAudit,
	platformRole,
	platformRoleAssignment,
	platformSearchDocument,
	platformWorkItem,
	platformWorkItemActivity,
} from "../src/schema/platform";

describe("@afenda/db hard tenant roots (N9 / ARCH-023)", () => {
	it("keeps tenant access-path indexes organization-leading", () => {
		const expectedIndexes = [
			{
				table: platformRoleAssignment,
				name: "platform_role_assignment_org_active_user_idx",
			},
			{
				table: platformRbacAudit,
				name: "platform_rbac_audit_org_created_id_idx",
			},
		];

		for (const expected of expectedIndexes) {
			const matchingIndex = getTableConfig(expected.table).indexes.find(
				(indexConfig) => indexConfig.config.name === expected.name,
			);
			expect(matchingIndex, `${expected.name} must exist`).toBeDefined();
			expect(matchingIndex?.config.columns[0]).toMatchObject({
				name: "organization_id",
			});
		}
	});

	it("builds reusable organization predicates and rejects empty scope", () => {
		const predicate = orgWhere(mdParty.organizationId, " org-a ");
		const query = new PgDialect().sqlToQuery(predicate);
		expect(query.sql).toBe('"md_party"."organization_id" = $1');
		expect(query.params).toEqual(["org-a"]);
		expect(() => orgWhere(mdParty.organizationId, "")).toThrow(
			/non-empty organizationId/,
		);
		expect(() => orgWhere(mdParty.organizationId, "   ")).toThrow(
			/non-empty organizationId/,
		);
	});

	it("builds entity identity predicates with both ID and organization", () => {
		const predicate = tenantEntityPredicate(
			{ id: mdParty.id, organizationId: mdParty.organizationId },
			{
				id: "11111111-1111-1111-1111-111111111111",
				organizationId: "org-a",
			},
		);
		expect(predicate).toBeDefined();
		if (predicate === undefined) {
			return;
		}

		const query = new PgDialect().sqlToQuery(predicate);
		expect(query.sql).toBe(
			'("md_party"."id" = $1 and "md_party"."organization_id" = $2)',
		);
		expect(query.params).toEqual([
			"11111111-1111-1111-1111-111111111111",
			"org-a",
		]);
	});

	it("keeps the Node operations parser aligned with the typed registry", () => {
		const registrySource = readFileSync(
			fileURLToPath(new URL("../src/hard-tenant-roots.ts", import.meta.url)),
			"utf8",
		);
		const parsedNames = parseHardTenantRootEntries(registrySource).map(
			(entry) => entry.sqlName,
		);
		expect(parsedNames).toEqual([...HARD_TENANT_ROOT_TABLE_NAMES]);
	});

	it("lists hard tenant root table names including all HR roots", () => {
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toHaveLength(285);
		expect(Object.keys(HARD_TENANT_ROOT_TABLES)).toHaveLength(285);
		const hrRoots = HARD_TENANT_ROOT_TABLE_NAMES.filter((name) =>
			name.startsWith("hr_"),
		);
		expect(hrRoots).toHaveLength(141);
		expect(hrRoots[0]).toBe("hr_person");
		expect(hrRoots.at(-1)).toBe("hr_overtime_approval");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("supplier_credit_note_line");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain(
			"financial_posting_exception",
		);
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("md_organization_dimension");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain(
			"md_item_variant_attribute_value_option",
		);
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_legal_company");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain(
			"ca_company_jurisdiction_profile",
		);
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_company_name");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain(
			"ca_company_legal_form_history",
		);
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_company_identifier");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_company_financial_year");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_company_activity");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_legal_establishment");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain(
			"ca_establishment_status_history",
		);
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_registered_address");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_premise");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_governance_body");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_governance_membership");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_statutory_office");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_officer_appointment");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_officer_qualification");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_officer_declaration");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain(
			"ca_officer_disqualification",
		);
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_conflict_disclosure");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_governance_meeting");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_meeting_notice");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_meeting_participant");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_meeting_quorum_result");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_meeting_vote");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_resolution");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("ca_resolution_action");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("platform_work_item");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain(
			"platform_work_item_activity",
		);
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("hr_bulk_import_checkpoint");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain(
			"hr_reliability_dead_letter",
		);
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("hr_connector_cursor");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("payroll_job");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("payroll_job_work_item");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("payroll_job_dead_letter");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("payroll_retro_item");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("payroll_retro_line");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain("payroll_final_settlement");
		expect(HARD_TENANT_ROOT_TABLE_NAMES).toContain(
			"payroll_final_settlement_line",
		);
	});

	it("exactly covers every schema table with required organization ownership", () => {
		const schemaTenantRoots = Object.values(databaseSchema)
			.filter((value) => is(value, PgTable))
			.filter((table) => {
				const { organizationId } = getTableColumns(table);
				return organizationId?.notNull === true;
			})
			.map((table) => getTableName(table))
			.sort();

		expect([...HARD_TENANT_ROOT_TABLE_NAMES].sort()).toEqual(schemaTenantRoots);
	});

	it("keeps each hard-tenant SQL name paired with its table reference", () => {
		expect(
			Object.values(HARD_TENANT_ROOT_TABLES).map((table) =>
				getTableName(table),
			),
		).toEqual([...HARD_TENANT_ROOT_TABLE_NAMES]);
	});

	it("derives one schema export symbol for every hard tenant root", () => {
		const projection = database.tenancy.rootNamesBySchemaSymbol;
		expect(Object.keys(projection)).toHaveLength(285);
		expect([...new Set(Object.values(projection))]).toHaveLength(285);
		expect(projection.hrBulkImportJob).toBe("hr_bulk_import_job");
		expect(projection.hrBulkExportArtifactChunk).toBe(
			"hr_bulk_export_artifact_chunk",
		);
		expect(projection.hrUserEmployee).toBe("hr_user_employee");
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
		expect(getTableColumns(platformWorkItem).organizationId.name).toBe(
			"organization_id",
		);
		expect(getTableColumns(platformWorkItemActivity).organizationId.name).toBe(
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
		await expect(withOrg(platformRoleAssignment, "")).rejects.toThrow(
			/non-empty organizationId/,
		);
		await expect(withOrg(platformRoleAssignment, "   ")).rejects.toThrow(
			/non-empty organizationId/,
		);
	});
});

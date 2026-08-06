import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
	PLATFORM_PERMISSION_CODES_V1,
	PLATFORM_PERMISSION_V1,
	PLATFORM_ROLE_TEMPLATES_V1,
} from "../src/platform-permission-catalog";
import { caMutationReceipt } from "../src/schema/corporate-administration";
import { platformDomainEvent } from "../src/schema/platform";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);

describe("Corporate Administration scaffold boundary", () => {
	it("keeps CA-owned schema in the authoritative DB source", () => {
		const schemaSource = readFileSync(
			path.join(packageRoot, "src/schema/corporate-administration.ts"),
			"utf8",
		);
		expect(schemaSource).toContain("caMutationReceipt");
		expect(schemaSource).toContain("reservedAt");
		expect(schemaSource).toContain("completedAt");
		expect(schemaSource).toContain("recordVersion");
		expect(schemaSource).toContain(
			"status} IN ('in_progress', 'completed', 'released')",
		);
		expect(schemaSource).toContain("ca_mutation_receipt_scope_uidx");
		for (const symbol of [
			"caLegalCompany",
			"caLegalEstablishment",
			"caEstablishmentStatusHistory",
			"caRegisteredAddress",
			"caPremise",
		]) {
			expect(schemaSource).toContain(symbol);
		}
		expect(schemaSource).not.toContain("caOutboxEvent");
		expect(schemaSource).not.toContain("ca_outbox_event");

		const schemaBarrel = readFileSync(
			path.join(packageRoot, "src/schema/index.ts"),
			"utf8",
		);
		expect(schemaBarrel).toContain("corporate-administration");
		expect(schemaBarrel).not.toContain("corporateAdministration");
	});

	it("defines the durable idempotency receipt facts", () => {
		const columns = getTableColumns(caMutationReceipt);
		expect(columns.organizationId.name).toBe("organization_id");
		expect(columns.organizationId.notNull).toBe(true);
		expect(columns.commandId.name).toBe("command_id");
		expect(columns.commandId.notNull).toBe(true);
		expect(columns.idempotencyKey.name).toBe("idempotency_key");
		expect(columns.idempotencyKey.notNull).toBe(true);
		expect(columns.fingerprint.notNull).toBe(true);
		expect(columns.status.notNull).toBe(true);
		expect(columns.reservationToken.name).toBe("reservation_token");
		expect(columns.reservationToken.notNull).toBe(true);
		expect(columns.reservedAt.name).toBe("reserved_at");
		expect(columns.reservedAt.notNull).toBe(true);
		expect(columns.completedAt.name).toBe("completed_at");
		expect(columns.completedAt.notNull).toBe(false);
		expect(columns.result.name).toBe("result");
		expect(columns.recordVersion.name).toBe("record_version");
		expect(columns.recordVersion.notNull).toBe(true);
		expect(columns.createdAt.notNull).toBe(true);
		expect(columns.updatedAt.notNull).toBe(true);
	});

	it("uses shared platform outbox schema instead of a CA-owned table", () => {
		const columns = getTableColumns(platformDomainEvent);
		expect(columns.id.name).toBe("id");
		expect(columns.organizationId.name).toBe("organization_id");
		expect(columns.organizationId.notNull).toBe(true);
		expect(columns.type.name).toBe("type");
		expect(columns.type.notNull).toBe(true);
		expect(columns.sourceModule.name).toBe("source_module");
		expect(columns.sourceModule.notNull).toBe(true);
		expect(columns.deduplicationKey.name).toBe("deduplication_key");
		expect(columns.correlationId.notNull).toBe(true);
		expect(columns.causationId.name).toBe("causation_id");
		expect(columns.actorUserId.notNull).toBe(true);
		expect(columns.payload.notNull).toBe(true);
		expect(columns.metadata.name).toBe("metadata");
		expect(columns.status.notNull).toBe(true);
		expect(columns.attempts.notNull).toBe(true);
		expect(columns.lastError.name).toBe("last_error");
		expect(columns.processedAt.name).toBe("processed_at");
		expect(columns.createdAt.notNull).toBe(true);
	});

	it("ships only governed Corporate Administration business migrations", () => {
		const migrationNames = readdirSync(path.join(packageRoot, "drizzle"));
		// Migrations owned by another ERP module may legitimately carry a
		// CA-shaped keyword (`0054_payroll_statutory_filings` contains "filing").
		// This guard governs Corporate Administration migrations only, so other
		// module namespaces are excluded before the keyword scan.
		const otherModuleMigration =
			/_(?:payroll|hr|sales|purchasing|inventory|receiving|fulfillment|receivables|payables|payments|accounting|platform)_/u;
		expect(
			migrationNames.filter(
				(name) =>
					!otherModuleMigration.test(name) &&
					/(?:legal[_-]company|establishment|governance|authority|capital|ownership|asset|filing|document|licence|banking)/u.test(
						name,
					),
			),
		).toEqual([
			"0034_ca_governance_bodies_memberships.sql",
			"0037_ca_governance_meetings.sql",
			"0050_ca_authority_mandate.sql",
		]);
	});

	it("registers only governed Corporate Administration permissions", () => {
		const livingCodes = PLATFORM_PERMISSION_CODES_V1.filter(
			(code) =>
				code.startsWith("corporate_administration.") ||
				code.startsWith("corporate-administration."),
		);
		expect(livingCodes).toEqual([
			"corporate_administration.company.read",
			"corporate_administration.company.manage",
			"corporate_administration.establishment.manage",
			"corporate_administration.governance.read",
			"corporate_administration.governance.manage",
			"corporate_administration.officer.read",
			"corporate_administration.officer.manage",
			"corporate_administration.officer_compliance.read",
			"corporate_administration.officer_compliance.manage",
			"corporate_administration.meeting.read",
			"corporate_administration.meeting.manage",
			"corporate_administration.resolution.read",
			"corporate_administration.resolution.manage",
			"corporate_administration.authority.read",
			"corporate_administration.authority.manage",
		]);

		const livingRows = PLATFORM_PERMISSION_V1.filter(
			(row) =>
				row.module === "corporate_administration" ||
				row.module === "corporate-administration",
		);
		expect(livingRows.map((row) => row.code)).toEqual(livingCodes);
	});

	it("grants only registered Corporate Administration permissions to role templates", () => {
		const granted = new Set(
			PLATFORM_ROLE_TEMPLATES_V1.flatMap((template) =>
				template.permissionCodes.filter((code) =>
					code.startsWith("corporate_administration."),
				),
			),
		);
		expect([...granted].toSorted()).toEqual(
			[
				"corporate_administration.authority.manage",
				"corporate_administration.authority.read",
				"corporate_administration.company.manage",
				"corporate_administration.company.read",
				"corporate_administration.establishment.manage",
				"corporate_administration.governance.manage",
				"corporate_administration.governance.read",
				"corporate_administration.meeting.manage",
				"corporate_administration.meeting.read",
				"corporate_administration.officer.manage",
				"corporate_administration.officer.read",
				"corporate_administration.officer_compliance.manage",
				"corporate_administration.officer_compliance.read",
				"corporate_administration.resolution.manage",
				"corporate_administration.resolution.read",
			].toSorted(),
		);
	});
});

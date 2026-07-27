import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";
import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

const migrationSql = readMigrationSqlForTables(["ca_mutation_receipt"]);

describe("Corporate Administration mutation receipt migration", () => {
	it("is additive and creates only the CA idempotency infrastructure table", () => {
		const additive = assertAdditiveMigrationSql(migrationSql);
		expect(additive.ok).toBe(true);
		expect(migrationSql).toContain('CREATE TABLE "ca_mutation_receipt"');
		expect(migrationSql).not.toContain("ca_legal_company");
		expect(migrationSql).not.toContain("legal_company");
		expect(migrationSql).not.toContain("establishment");
		expect(migrationSql).not.toContain('CREATE TABLE "ca_outbox_event"');
		expect(migrationSql).not.toContain('CREATE TABLE "ca_audit_fact"');
	});

	it("keeps every persisted row organization-scoped and timestamped", () => {
		expect(migrationSql).toContain('"organization_id" text NOT NULL');
		expect(migrationSql).toContain(
			'"reserved_at" timestamp with time zone DEFAULT now() NOT NULL',
		);
		expect(migrationSql).toContain('"completed_at" timestamp with time zone');
		expect(migrationSql).toContain(
			'"created_at" timestamp with time zone DEFAULT now() NOT NULL',
		);
		expect(migrationSql).toContain(
			'"updated_at" timestamp with time zone DEFAULT now() NOT NULL',
		);
	});

	it("enforces atomic idempotency scope and adapter access paths", () => {
		expect(migrationSql).toContain(
			'CREATE UNIQUE INDEX "ca_mutation_receipt_scope_uidx" ON "ca_mutation_receipt" USING btree ("organization_id","command_id","idempotency_key")',
		);
		expect(migrationSql).not.toContain('USING btree ("idempotency_key")');
		expect(migrationSql).toContain(
			'CREATE INDEX "ca_mutation_receipt_org_status_idx" ON "ca_mutation_receipt" USING btree ("organization_id","status")',
		);
		expect(migrationSql).toContain(
			'CREATE INDEX "ca_mutation_receipt_org_updated_idx" ON "ca_mutation_receipt" USING btree ("organization_id","updated_at")',
		);
	});

	it("uses the approved lifecycle status set and contains no placeholder columns or foreign keys", () => {
		expect(migrationSql).toContain(
			"IN ('in_progress', 'completed', 'released')",
		);
		for (const forbidden of [
			"placeholder",
			"todo",
			"future",
			"reserved_column",
			"REFERENCES",
			"FOREIGN KEY",
		]) {
			expect(migrationSql.toUpperCase()).not.toContain(forbidden.toUpperCase());
		}
	});

	it("enforces valid scope, fingerprint, reservation ownership, and replay state", () => {
		expect(migrationSql).toContain(
			'CONSTRAINT "ca_mutation_receipt_scope_check" CHECK (char_length(btrim("ca_mutation_receipt"."organization_id")) > 0',
		);
		expect(migrationSql).toContain(
			'CONSTRAINT "ca_mutation_receipt_fingerprint_check" CHECK ("ca_mutation_receipt"."fingerprint" ~ \'^[0-9a-f]{64}$\')',
		);
		expect(migrationSql).toContain(
			'CONSTRAINT "ca_mutation_receipt_reservation_check" CHECK (char_length("ca_mutation_receipt"."reservation_token") > 0)',
		);
		expect(migrationSql).toContain(
			'CONSTRAINT "ca_mutation_receipt_record_version_check" CHECK ("ca_mutation_receipt"."record_version" > 0)',
		);
		expect(migrationSql).toContain(
			'"ca_mutation_receipt"."status" = \'completed\' AND "ca_mutation_receipt"."completed_at" IS NOT NULL AND "ca_mutation_receipt"."result" IS NOT NULL',
		);
		expect(migrationSql).toContain(
			'"ca_mutation_receipt"."status" <> \'completed\' AND "ca_mutation_receipt"."completed_at" IS NULL AND "ca_mutation_receipt"."result" IS NULL',
		);
	});
});

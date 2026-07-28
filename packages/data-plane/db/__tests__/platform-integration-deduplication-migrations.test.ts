import { describe, expect, it } from "vitest";

import { readMigrationSqlForTables } from "./helpers/current-migration-sql";

describe("platform integration deduplication migrations", () => {
	it("makes notification intents replay-safe within org, user, and module", () => {
		const sql = readMigrationSqlForTables(["platform_notification"]);
		expect(sql).toContain('"deduplication_key" text');
		expect(sql).toMatch(
			/"organization_id",\s*"user_id",\s*"module",\s*"deduplication_key"/,
		);
		expect(sql).toContain(
			'WHERE "platform_notification"."deduplication_key" IS NOT NULL',
		);
	});

	it("makes derived outbox facts replay-safe without crossing tenants", () => {
		const sql = readMigrationSqlForTables(["platform_domain_event"]);
		expect(sql).toContain('"deduplication_key" text');
		expect(sql).toMatch(
			/"organization_id",\s*"source_module",\s*"type",\s*"deduplication_key"/,
		);
		expect(sql).toContain(
			'WHERE "platform_domain_event"."deduplication_key" IS NOT NULL',
		);
	});

	it("owns replay-safe platform work items with CAS and immutable activity", () => {
		const sql = readMigrationSqlForTables([
			"platform_work_item",
			"platform_work_item_activity",
		]);
		expect(sql).toContain('CREATE TABLE IF NOT EXISTS "platform_work_item"');
		expect(sql).toContain(
			'"platform_work_item_org_dedupe_uidx" ON "platform_work_item"',
		);
		expect(sql).toMatch(/"organization_id",\s*"deduplication_key"/);
		expect(sql).toContain('"version" integer DEFAULT 1 NOT NULL');
		expect(sql).toContain(
			'CREATE TABLE IF NOT EXISTS "platform_work_item_activity"',
		);
		expect(sql).toContain(
			'"platform_work_item_activity_org_item_version_uidx"',
		);
		expect(sql).toContain('FOREIGN KEY ("organization_id", "work_item_id")');
	});
});

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
});

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function migration(name: string): string {
	return readFileSync(
		fileURLToPath(new URL(`../drizzle/${name}`, import.meta.url)),
		"utf8",
	);
}

describe("platform integration deduplication migrations", () => {
	it("makes notification intents replay-safe within org, user, and module", () => {
		const sql = migration("0010_platform_notification_deduplication.sql");
		expect(sql).toContain('ADD COLUMN "deduplication_key" text');
		expect(sql).toMatch(
			/"organization_id",\s*"user_id",\s*"module",\s*"deduplication_key"/,
		);
		expect(sql).toContain('WHERE "deduplication_key" IS NOT NULL');
	});

	it("makes derived outbox facts replay-safe without crossing tenants", () => {
		const sql = migration("0015_platform_domain_event_deduplication.sql");
		expect(sql).toContain('ADD COLUMN "deduplication_key" text');
		expect(sql).toMatch(
			/"organization_id",\s*"source_module",\s*"type",\s*"deduplication_key"/,
		);
		expect(sql).toContain('WHERE "deduplication_key" IS NOT NULL');
	});
});

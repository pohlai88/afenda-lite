import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertAdditiveMigrationSql } from "../scripts/lib/assert-additive-migration.mjs";

const sql = readFileSync(
	fileURLToPath(
		new URL("../drizzle/0039_hr_reliability_scheduler.sql", import.meta.url),
	),
	"utf8",
);

describe("Human Resources reliability scheduler migration", () => {
	it("adds lease, acknowledgement, and authoritative target references", () => {
		expect(assertAdditiveMigrationSql(sql)).toEqual({ ok: true, findings: [] });
		for (const column of [
			"target_type",
			"target_id",
			"acknowledgement_deadline_at",
			"lease_owner",
			"lease_expires_at",
		]) {
			expect(sql).toContain(`"${column}"`);
		}
		expect(sql).toContain("awaiting_acknowledgement");
		expect(sql).toContain("hr_reliability_work_item_lease_check");
		expect(sql).toContain("hr_reliability_work_item_ack_check");
	});
});

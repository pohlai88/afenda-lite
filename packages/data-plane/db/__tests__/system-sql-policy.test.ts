import { describe, expect, it } from "vitest";

import { assertSystemSqlSafety } from "../src/system-sql-policy";

const claimDueSql = `
	WITH ranked AS (
		SELECT id, organization_id,
			row_number() OVER (PARTITION BY organization_id ORDER BY created_at, id) AS organization_rank
		FROM hr_reliability_work_item
	), eligible AS (
		SELECT work.id, work.organization_id
		FROM hr_reliability_work_item AS work
		INNER JOIN ranked
			ON ranked.id = work.id AND ranked.organization_id = work.organization_id
		FOR UPDATE OF work SKIP LOCKED
	)
	UPDATE hr_reliability_work_item AS work
	SET status = 'processing'
	FROM eligible
	WHERE work.id = eligible.id AND work.organization_id = eligible.organization_id
	RETURNING work.id, work.organization_id
`;

describe("assertSystemSqlSafety", () => {
	it("accepts the registered reliability claim with complete tenant lineage", () => {
		expect(() =>
			assertSystemSqlSafety(
				"human-resources.reliability.claim-due",
				claimDueSql,
			),
		).not.toThrow();
	});

	it.each([
		claimDueSql.replace("PARTITION BY organization_id", "PARTITION BY status"),
		claimDueSql.replace("FOR UPDATE OF work SKIP LOCKED", "FOR UPDATE OF work"),
		claimDueSql.replace(
			"ranked.organization_id = work.organization_id",
			"ranked.id = work.id",
		),
		claimDueSql.replace(
			"work.organization_id = eligible.organization_id",
			"work.id = eligible.id",
		),
		claimDueSql.replace(
			"RETURNING work.id, work.organization_id",
			"RETURNING work.id",
		),
		`${claimDueSql}; SELECT * FROM hr_reliability_work_item`,
		claimDueSql.replace(
			"hr_reliability_work_item AS work",
			"hr_employee AS work",
		),
	])("rejects a widened or lineage-incomplete claim", (statement) => {
		expect(() =>
			assertSystemSqlSafety("human-resources.reliability.claim-due", statement),
		).toThrow(/System SQL policy rejected/);
	});

	it("rejects unregistered operation identifiers at runtime", () => {
		expect(() =>
			assertSystemSqlSafety("unknown" as never, claimDueSql),
		).toThrow(/Unknown system SQL operation/);
	});
});

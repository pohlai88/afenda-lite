import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const source = readFileSync(
	fileURLToPath(new URL("../src/adapters/drizzle/runs.ts", import.meta.url)),
	"utf8",
);
const resolverSource = readFileSync(
	fileURLToPath(new URL("../src/resolve-store.ts", import.meta.url)),
	"utf8",
);
const setupSource = readFileSync(
	fileURLToPath(
		new URL(
			"../src/adapters/drizzle/setup-extended-methods.ts",
			import.meta.url,
		),
	),
	"utf8",
);

describe("payroll run production transaction contract", () => {
	it("commits run state, audit evidence, and lifecycle outbox together", () => {
		expect(source).toContain("afendaDatabase.transaction");
		expect(source).toContain("INSERT INTO platform_audit_log");
		expect(source).toContain("INSERT INTO platform_domain_event");
		expect(source).toContain("WITH mutated AS");
	});

	it("serializes finalization with exception creation and rechecks blockers", () => {
		expect(source.match(/FOR UPDATE/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
		expect(source).toContain("severity = 'blocking'");
		expect(source).toContain("status NOT IN ('finalized', 'reversed')");
	});

	it("records finalized rule usage from calculation snapshots atomically", () => {
		expect(source).toContain("pg_advisory_xact_lock");
		expect(source).toContain("ORDER BY rule_ref.rule_kind, rule_ref.rule_id");
		expect(source).toContain("snapshot_rule_refs AS MATERIALIZED");
		expect(source).toContain("record_version");
		expect(source).toContain("finalized_rule_usage AS");
		expect(source).toContain("INSERT INTO payroll_rule_finalized_usage");
		expect(source).toContain("snapshot_json -> 'earningRules'");
		expect(source).toContain("snapshot_json -> 'deductionRules'");
		expect(source).toContain("snapshot_json -> 'statutoryRules'");
		expect(source).toContain(
			"ON CONFLICT (organization_id, rule_kind, rule_id, run_id)",
		);
	});

	it("commits each setup-rule supersession and both audits atomically", () => {
		expect(
			setupSource.match(/pg_advisory_xact_lock/g)?.length ?? 0,
		).toBeGreaterThanOrEqual(9);
		expect(setupSource.match(/::uuid::text/g)).toHaveLength(9);
		expect(setupSource).not.toMatch(/organizationId}:earning:/);
		expect(setupSource).not.toMatch(/organizationId}:deduction:/);
		expect(setupSource).not.toMatch(/organizationId}:statutory:/);
		expect(setupSource.match(/WITH superseded AS/g)).toHaveLength(3);
		expect(setupSource.match(/predecessor_audited AS/g)).toHaveLength(3);
		expect(setupSource.match(/successor_audited AS/g)).toHaveLength(3);
		expect(setupSource).not.toContain("Supersede rollback failed");
		expect(setupSource).not.toContain("host.createEarningRule");
		expect(setupSource).not.toContain("host.createDeductionRule");
		expect(setupSource).not.toContain("host.createStatutoryRule");
	});

	it("never selects the memory adapter as an omitted production default", () => {
		expect(resolverSource).toContain("createDrizzlePayrollStore");
		expect(resolverSource).not.toContain("createMemoryPayrollStore");
	});
});

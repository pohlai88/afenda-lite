import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const source = readFileSync(
	fileURLToPath(
		new URL("../src/features/payroll-runs/runs.drizzle.ts", import.meta.url),
	),
	"utf8",
);
const resolverSource = readFileSync(
	fileURLToPath(
		new URL("../src/composition/store/resolve-store.ts", import.meta.url),
	),
	"utf8",
);
const setupSource = readFileSync(
	fileURLToPath(
		new URL(
			"../src/features/payroll-setup/setup-extended.drizzle.ts",
			import.meta.url,
		),
	),
	"utf8",
);
const outputSource = readFileSync(
	fileURLToPath(
		new URL("../src/features/calculation/outputs.drizzle.ts", import.meta.url),
	),
	"utf8",
);
const settlementSource = readFileSync(
	fileURLToPath(
		new URL(
			"../src/features/final-settlement/settlement.drizzle.ts",
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
		expect(source).toContain(
			"event_values(event_id, event_type, dedupe_key, payload_json)",
		);
		expect(source).toContain("event_values.payload_json");
	});

	it("serializes finalization with exception creation and rechecks blockers", () => {
		expect(source.match(/FOR UPDATE/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
		expect(source).toContain("severity = 'blocking'");
		expect(source).toContain("status NOT IN ('finalized', 'reversed')");
	});

	it("clears exceptions and records its audit in one transaction", () => {
		expect(source).toContain("WITH locked_run AS MATERIALIZED");
		expect(source).toContain("DELETE FROM payroll_exception");
		expect(source).toContain("deleted_summary AS");
		expect(source).toContain(
			"SELECT deleted.id FROM deleted CROSS JOIN audited",
		);
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

	it("creates one immutable payslip publication work item per finalized employee", () => {
		expect(source).toContain("payslip_work_items AS");
		expect(source).toContain("INSERT INTO payroll_payslip");
		expect(source).toContain(
			"ON CONFLICT (organization_id, run_employee_id, view_version)",
		);
		expect(source).toContain("NULL, 'pending', 1");
	});

	it("locks run status and replaces calculation outputs in one transaction", () => {
		expect(outputSource.match(/afendaDatabase\.transaction/g)).toHaveLength(2);
		expect(outputSource.match(/FOR UPDATE/g)).toHaveLength(2);
		expect(outputSource).toContain(
			"status NOT IN ('calculated', 'finalized', 'reversed')",
		);
		expect(outputSource).toContain("jsonb_to_recordset");
	});

	it("creates idempotent compensating adjustment records with reversal state", () => {
		expect(source).toContain("reversal_adjustments AS");
		expect(source).toContain("INSERT INTO payroll_adjustment");
		expect(source).toContain("-(reversal_total.net::numeric)");
		expect(source).toContain("input.reversalRequestFingerprint");
		expect(source).not.toContain(
			"ON CONFLICT (organization_id, create_idempotency_key) DO NOTHING",
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

	it("commits final-settlement transitions with audit evidence and lifecycle outbox", () => {
		expect(settlementSource).toContain("afendaDatabase.transaction");
		expect(settlementSource).toContain("INSERT INTO platform_audit_log");
		expect(settlementSource).toContain("INSERT INTO platform_domain_event");
		expect(settlementSource).toContain("WITH mutated AS");
		expect(settlementSource).toContain("async saveFinalSettlementTransition");
		expect(
			settlementSource.match(
				/SELECT mutated.id FROM mutated, audited, outboxed/g,
			)?.length ?? 0,
		).toBe(3);
	});
});

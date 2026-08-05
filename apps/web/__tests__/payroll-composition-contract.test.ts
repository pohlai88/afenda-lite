import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function readCompositionFile(relativePath: string): string {
	return readFileSync(
		fileURLToPath(new URL(`../lib/erp/${relativePath}`, import.meta.url)),
		"utf8",
	);
}

describe("Payroll application composition", () => {
	it("constructs only the opaque Payroll capability context without an HR pull", () => {
		const source = readCompositionFile("payroll-command-options.ts");

		expect(source).toContain("createPayrollCapabilityOptions");
		expect(source).not.toContain("createPayrollWorkforcePort");
		expect(source).not.toContain("assembleApprovedPayrollHandoff");
		expect(source).not.toContain("import type { PayrollCommandOptions");
	});

	it("routes durable payroll deliveries into the Payroll ingest capability", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL(
					"../modules/platform/domain/human-resources-payroll-delivery.ts",
					import.meta.url,
				),
			),
			"utf8",
		);

		expect(source).toContain("ingestApprovedPayrollHandoff");
		expect(source).toContain('from "@afenda/payroll"');
		expect(source).toContain("idempotencyKey: `payroll-delivery:");
	});

	it("assembles delivery payloads server-side instead of trusting caller-authored approved facts", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL("../app/actions/hr-payroll-delivery.ts", import.meta.url),
			),
			"utf8",
		);

		expect(source).toContain("assembleApprovedPayrollHandoff");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).not.toContain("payload: ApprovedPayrollHandoff");
		expect(source).not.toContain("approvedPayrollHandoffSchema");
	});

	it("exposes final-settlement operator actions without caller-authored leave balances", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL("../app/actions/payroll-final-settlement.ts", import.meta.url),
			),
			"utf8",
		);

		expect(source).toContain("initiateFinalSettlement");
		expect(source).toContain("calculateFinalSettlement");
		expect(source).toContain("finalizeFinalSettlement");
		expect(source).toContain("getOwnFinalSettlementStatement");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).toContain("createPayrollCommandOptions()");
		expect(source).not.toContain("leaveBalanceDays");
		expect(source).not.toContain("workforce:");
	});

	it("exposes payroll run lifecycle actions with session-stamped org and actor", () => {
		const source = readFileSync(
			fileURLToPath(new URL("../app/actions/payroll-run.ts", import.meta.url)),
			"utf8",
		);

		expect(source).toContain("createPayrollRun");
		expect(source).toContain("calculatePayrollRun");
		expect(source).toContain("finalizePayrollRun");
		expect(source).toContain("reversePayrollRun");
		expect(source).toContain("getPayrollRun");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).toContain("createPayrollCommandOptions()");
		expect(source).not.toContain("workforce:");
	});

	it("exposes payroll period setup actions including C3 input lock", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL("../app/actions/payroll-period.ts", import.meta.url),
			),
			"utf8",
		);

		expect(source).toContain("createPayrollPeriod");
		expect(source).toContain("lockPayrollPeriodInputs");
		expect(source).toContain("closePayrollPeriod");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).toContain("createPayrollCommandOptions()");
		expect(source).toContain("payroll.setup.manage");
	});
});

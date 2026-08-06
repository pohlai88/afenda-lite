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
		expect(source).toContain("recordPayrollException");
		expect(source).toContain("listPayrollExceptionsForRun");
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

	it("exposes payroll setup actions for calendars, pay groups, and all rule types", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL("../app/actions/payroll-setup.ts", import.meta.url),
			),
			"utf8",
		);

		expect(source).toContain("createPayrollCalendar");
		expect(source).toContain("createPayrollPayGroup");
		expect(source).toContain("createPayrollEarningRule");
		expect(source).toContain("createPayrollDeductionRule");
		expect(source).toContain("createPayrollStatutoryRule");
		expect(source).toContain("supersedePayrollEarningRule");
		expect(source).toContain("supersedePayrollDeductionRule");
		expect(source).toContain("supersedePayrollStatutoryRule");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).toContain("createPayrollCommandOptions()");
		expect(source).toContain("payroll.setup.manage");
	});

	it("exposes payroll retro-pay actions with correct permission boundaries", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL("../app/actions/payroll-retro-pay.ts", import.meta.url),
			),
			"utf8",
		);

		expect(source).toContain("queueRetroItem");
		expect(source).toContain("calculateRetroDifference");
		expect(source).toContain("applyRetroToPeriod");
		expect(source).toContain("listRetroItems");
		expect(source).toContain("payroll.input.manage");
		expect(source).toContain("payroll.run.review");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).toContain("createPayrollCommandOptions()");
	});

	it("exposes statutory filing actions with correct permission boundaries", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL("../app/actions/payroll-statutory-filings.ts", import.meta.url),
			),
			"utf8",
		);

		expect(source).toContain("generateStatutoryFiling");
		expect(source).toContain("generateAnnualStatement");
		expect(source).toContain("listFilingObligations");
		expect(source).toContain("sealFilingEvidence");
		expect(source).toContain("payroll.run.review");
		expect(source).toContain("payroll.run.finalize");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).toContain("createPayrollCommandOptions()");
	});

	it("exposes payroll privacy actions with read-all operator and read-own member surfaces", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL("../app/actions/payroll-privacy.ts", import.meta.url),
			),
			"utf8",
		);

		expect(source).toContain("restrictPayrollSubject");
		expect(source).toContain("liftPayrollRestriction");
		expect(source).toContain("recordPayrollRetentionEvidence");
		expect(source).toContain("expirePayrollRetention");
		expect(source).toContain("projectPayrollFields");
		expect(source).toContain("respondToPayrollSubjectAccess");
		expect(source).toContain("payroll.payslip.read-all");
		expect(source).toContain("payroll.payslip.read-own");
		expect(source).toContain("runMemberPermissionAction");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).toContain("createPayrollCommandOptions()");
	});

	it("exposes payroll jobs operator actions without cron-only surfaces", () => {
		const source = readFileSync(
			fileURLToPath(new URL("../app/actions/payroll-jobs.ts", import.meta.url)),
			"utf8",
		);

		expect(source).toContain("enqueuePayrollCalculationJob");
		expect(source).toContain("getPayrollJob");
		expect(source).toContain("listPayrollDeadLetters");
		expect(source).toContain("replayPayrollDeadLetter");
		expect(source).not.toContain("claimDuePayrollJobWork");
		expect(source).not.toContain("executePayrollJobWork");
		expect(source).toContain("payroll.run.calculate");
		expect(source).toContain("payroll.run.review");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).toContain("createPayrollCommandOptions()");
	});

	it("exposes payslip read-own member and read-all operator actions", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL("../app/actions/payroll-payslip.ts", import.meta.url),
			),
			"utf8",
		);

		expect(source).toContain("getOwnPayrollPayslip");
		expect(source).toContain("getPayrollPayslip");
		expect(source).toContain("payroll.payslip.read-own");
		expect(source).toContain("payroll.payslip.read-all");
		expect(source).toContain("runMemberPermissionAction");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).toContain("createPayrollCommandOptions()");
	});

	it("exposes reconciliation manage actions with session stamps", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL("../app/actions/payroll-reconciliation.ts", import.meta.url),
			),
			"utf8",
		);

		expect(source).toContain("recordPayrollReconciliation");
		expect(source).toContain("resolvePayrollReconciliation");
		expect(source).toContain("listPayrollReconciliationsForRun");
		expect(source).toContain("payroll.reconciliation.manage");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).toContain("createPayrollCommandOptions()");
	});

	it("exposes assignment and recurring-line setup actions", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL("../app/actions/payroll-assignments.ts", import.meta.url),
			),
			"utf8",
		);

		expect(source).toContain("createPayrollEmployeeAssignment");
		expect(source).toContain("getPayrollEmployeeAssignment");
		expect(source).toContain("createPayrollRecurringEarning");
		expect(source).toContain("createPayrollRecurringDeduction");
		expect(source).toContain("payroll.setup.manage");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).toContain("createPayrollCommandOptions()");
	});

	it("exposes variable-input manage actions with session stamps", () => {
		const source = readFileSync(
			fileURLToPath(
				new URL("../app/actions/payroll-variable-inputs.ts", import.meta.url),
			),
			"utf8",
		);

		expect(source).toContain("createPayrollVariableInput");
		expect(source).toContain("getPayrollVariableInput");
		expect(source).toContain("payroll.input.manage");
		expect(source).toContain("organizationId: session.orgId");
		expect(source).toContain("actorUserId: session.userId");
		expect(source).toContain("createPayrollCommandOptions()");
	});
});

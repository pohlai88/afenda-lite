import type { PayrollRoundingPolicy } from "../../kernel/money/rounding-policy";

/**
 * Terminal payslip contract version. The settlement statement is a derived
 * projection (like `payslips`), never a stored document: it is recomputed from
 * the sealed settlement and its sealed lines on every read.
 */
export const PAYROLL_FINAL_SETTLEMENT_STATEMENT_CONTRACT_VERSION =
	"payroll.final-settlement.statement.v1" as const;

export const PAYROLL_FINAL_SETTLEMENT_STATUSES = [
	"initiated",
	"clearance_required",
	"calculated",
	"finalized",
] as const;
export type PayrollFinalSettlementStatus =
	(typeof PAYROLL_FINAL_SETTLEMENT_STATUSES)[number];

export const PAYROLL_FINAL_SETTLEMENT_LINE_KINDS = [
	"prorated_base",
	"leave_encashment",
	"notice_pay",
	"notice_in_lieu",
	"recovery",
	"employee_statutory",
	"employer_statutory",
] as const;
export type PayrollFinalSettlementLineKind =
	(typeof PAYROLL_FINAL_SETTLEMENT_LINE_KINDS)[number];

/** Employment states that carry a termination fact (bridging D4). */
export const PAYROLL_FINAL_SETTLEMENT_TERMINAL_STATUSES = [
	"notice",
	"terminated",
] as const;
export type PayrollFinalSettlementTerminalStatus =
	(typeof PAYROLL_FINAL_SETTLEMENT_TERMINAL_STATUSES)[number];

export interface PayrollFinalSettlementRecovery {
	amount: string;
	code: string;
	reason: string;
}

/**
 * Non-statutory facts the caller supplies at initiate.
 *
 * `leaveBalanceDays` is an **HR-delivered** closing balance: Payroll encashes
 * the balance HR states and never derives one from leave requests. Statutory
 * amounts are deliberately absent — statutory treatment is owned by the
 * fail-closed statutory calculator seam, not by the caller.
 */
export interface PayrollFinalSettlementFacts {
	leaveBalanceDays: string;
	noticeInLieuAmount: string;
	noticePayAmount: string;
	recoveries: readonly PayrollFinalSettlementRecovery[];
}

/**
 * Compensation pinned from the accepted workforce handoff at initiate.
 *
 * Mirrors D3: the settlement prices from a sealed source, so a compensation
 * revision that supersedes the handoff after initiate can never retroactively
 * change what the settlement pays.
 */
export interface PayrollFinalSettlementCompensationSnapshot {
	baseCompensation: string;
	currencyCode: string;
	decimalScale: number;
	effectiveDate: string;
	employeeId: string;
	employmentId: string;
	employmentStatus: PayrollFinalSettlementTerminalStatus;
	payFrequency: string;
	roundingMode: string;
	roundingPolicy: PayrollRoundingPolicy;
	sourceVersion: {
		compensationVersion?: number | undefined;
		leavePolicyVersion?: number | undefined;
		timesheetVersion?: number | undefined;
	};
}

/** One statutory rule outcome, produced by a production-approved calculator. */
export interface PayrollFinalSettlementStatutoryEvidenceEntry {
	baseAmount: string;
	calculatorId: string;
	employeeAmount: string;
	employerAmount: string;
	jurisdictionCode: string;
	ruleCode: string;
	ruleVersion: string;
}

export interface PayrollFinalSettlementTotals {
	employeeStatutory: string;
	employerStatutory: string;
	gross: string;
	net: string;
	recoveries: string;
}

export interface PayrollFinalSettlementLine {
	amount: string;
	code: string;
	createdAt: Date;
	currencyCode: string;
	id: string;
	kind: PayrollFinalSettlementLineKind;
	organizationId: string;
	sequence: number;
	settlementId: string;
}

export interface PayrollFinalSettlementStatementLine {
	amount: string;
	category: PayrollFinalSettlementLineKind;
	code: string;
	currencyCode: string;
	sequence: number;
}

export interface PayrollFinalSettlementStatement {
	contentHash: string;
	contractVersion: typeof PAYROLL_FINAL_SETTLEMENT_STATEMENT_CONTRACT_VERSION;
	currencyCode: string;
	employeeId: string;
	lines: readonly PayrollFinalSettlementStatementLine[];
	organizationId: string;
	periodId: string;
	settlementId: string;
	status: PayrollFinalSettlementStatus;
	terminationEffectiveOn: string;
	terminationId: string;
	totals: PayrollFinalSettlementTotals;
}

/**
 * A termination pay capsule.
 *
 * One settlement per termination: `(organizationId, terminationId)` is the
 * natural key, enforced by `payroll_final_settlement_org_termination_uidx`. A
 * second settlement for the same termination is a `CONFLICT`, never a second
 * capsule — corrections move the existing settlement through its lifecycle.
 * `(organizationId, idempotencyKey)` is a separate uniqueness axis covering
 * request replay; a replayed initiate returns the settlement already pinned,
 * even if HR superseded compensation in between.
 */
export interface PayrollFinalSettlement {
	calculatedAt: Date | null;
	calculatedBy: string | null;
	clearanceAt: Date | null;
	clearanceBy: string | null;
	clearanceReason: string | null;
	clearanceRequiredReason: string | null;
	compensationSnapshot: PayrollFinalSettlementCompensationSnapshot;
	compensationSnapshotHash: string;
	correlationId: string;
	createdAt: Date;
	createdBy: string;
	employeeId: string;
	facts: PayrollFinalSettlementFacts;
	finalizedAt: Date | null;
	finalizedBy: string | null;
	id: string;
	idempotencyKey: string;
	organizationId: string;
	originRunId: string | null;
	payGroupId: string;
	periodId: string;
	requestFingerprint: string;
	status: PayrollFinalSettlementStatus;
	statutoryEvidence:
		| readonly PayrollFinalSettlementStatutoryEvidenceEntry[]
		| null;
	terminationEffectiveOn: string;
	terminationId: string;
	totals: PayrollFinalSettlementTotals | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PayrollFinalSettlementView {
	lines: readonly PayrollFinalSettlementLine[];
	settlement: PayrollFinalSettlement;
}

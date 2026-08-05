export const PAYROLL_FINAL_SETTLEMENT_STATUSES = [
	"initiated",
	"clearance_required",
	"calculated",
	"finalized",
	"stated",
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

export interface PayrollFinalSettlementRecovery {
	amount: string;
	code: string;
	reason: string;
}

export interface PayrollFinalSettlementFacts {
	baseCompensation: string;
	currencyCode: string;
	employeeStatutoryAmount: string;
	employerStatutoryAmount: string;
	leaveBalanceDays: string;
	noticeInLieuAmount: string;
	noticePayAmount: string;
	recoveries: readonly PayrollFinalSettlementRecovery[];
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

export interface PayrollFinalSettlementStatement {
	contentHash: string;
	currencyCode: string;
	employeeId: string;
	issuedAt: Date;
	issuedBy: string;
	lines: readonly PayrollFinalSettlementLine[];
	periodId: string;
	settlementId: string;
	terminationEffectiveOn: string;
	terminationId: string;
	totals: PayrollFinalSettlementTotals;
}

export interface PayrollFinalSettlement {
	calculatedAt: Date | null;
	calculatedBy: string | null;
	clearanceAt: Date | null;
	clearanceBy: string | null;
	clearanceReason: string | null;
	clearanceRequiredReason: string | null;
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
	statement: PayrollFinalSettlementStatement | null;
	status: PayrollFinalSettlementStatus;
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

import type {
	PayrollResultLineKind,
	PayrollResultLineRuleKind,
} from "../../kernel/contracts/projected-types";

export const PAYROLL_RETRO_STATUSES = [
	"queued",
	"calculated",
	"applied",
] as const;
export type PayrollRetroStatus = (typeof PAYROLL_RETRO_STATUSES)[number];

export const PAYROLL_RETRO_CORRECTION_KINDS = [
	"base_compensation",
	"variable_input",
] as const;
export type PayrollRetroCorrectionKind =
	(typeof PAYROLL_RETRO_CORRECTION_KINDS)[number];

/**
 * A deferred correction expressed against the sealed period's own snapshot.
 *
 * Every variant may only reference rules already pinned inside that snapshot —
 * a correction can restate what the sealed period paid, never introduce a rule
 * version that did not exist when the period was sealed.
 */
export type PayrollRetroCorrection =
	| {
			amount: string;
			kind: "base_compensation";
	  }
	| {
			amount: string;
			currencyCode: string;
			earningRuleCode: string;
			earningRuleId: string;
			earningRuleVersion: string;
			kind: "variable_input";
			sourceId: string;
			sourceType: string;
	  };

export interface PayrollRetroDifferenceLine {
	/** Signed delta — a reduced entitlement is a negative retro line. */
	amount: string;
	code: string;
	currencyCode: string;
	lineKind: PayrollResultLineKind;
	ruleCode: string;
	ruleKind: PayrollResultLineRuleKind;
	ruleVersion: string;
}

export interface PayrollRetroDifferenceTotals {
	employeeDeductions: string;
	employeeStatutory: string;
	employerCost: string;
	gross: string;
	net: string;
}

export interface PayrollRetroDifference {
	/** Pinned from the sealed run employee — never the calculator's today value. */
	calculationVersion: string;
	correctedSnapshotHash: string;
	currencyCode: string;
	lines: readonly PayrollRetroDifferenceLine[];
	sealedSnapshotHash: string;
	totals: PayrollRetroDifferenceTotals;
}

export interface PayrollRetroItem {
	appliedAt: Date | null;
	correction: PayrollRetroCorrection;
	correlationId: string;
	createdAt: Date;
	createdBy: string;
	difference: PayrollRetroDifference | null;
	employeeId: string;
	id: string;
	idempotencyKey: string;
	organizationId: string;
	originPeriodId: string;
	originRunId: string | null;
	reason: string;
	requestFingerprint: string;
	status: PayrollRetroStatus;
	targetPeriodId: string | null;
	targetRunId: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PayrollRetroLine {
	amount: string;
	code: string;
	createdAt: Date;
	currencyCode: string;
	employeeId: string;
	id: string;
	lineKind: PayrollResultLineKind;
	organizationId: string;
	/** Origin labelling — the sealed period this retro line corrects. */
	originPeriodId: string;
	originRunId: string;
	retroItemId: string;
	ruleCode: string;
	ruleKind: PayrollResultLineRuleKind;
	ruleVersion: string;
	sequence: number;
	targetRunId: string;
}

export interface PayrollRetroItemView {
	item: PayrollRetroItem;
	lines: readonly PayrollRetroLine[];
}

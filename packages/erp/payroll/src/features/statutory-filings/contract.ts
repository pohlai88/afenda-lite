/**
 * Statutory filings (bridging D5).
 *
 * Doctrine:
 *  - A filing artifact is derived **only** from sealed run evidence
 *    (`payroll_statutory_result` rows of finalized runs, each already carrying
 *    its version-pinned `ruleVersion` + `calculatorId`). Nothing is read from
 *    live statutory rule configuration at generation time, and no caller may
 *    supply amounts.
 *  - Generation passes the same fail-closed `PayrollStatutoryCapability` seam
 *    payroll runs and final settlements use. MY/VN packs are `awaiting_review`
 *    and `synth.v1` is `synthetic_only`, so production generation refuses with
 *    `CONFLICT` until a pack is reviewer-approved; synth filings are test-only.
 *  - Sealing is segregation-of-duties gated (generator ≠ sealer) and content
 *    hashes the artifact. A sealed filing is immutable: re-sealing replays the
 *    same artifact, and later changes to the source runs never alter it.
 *  - One filing per natural key: `(org, jurisdiction, instrument, period)` for
 *    period filings and `(org, jurisdiction, instrument, tax year, employee)`
 *    for annual statements.
 */
export const PAYROLL_STATUTORY_FILING_KINDS = [
	"period_filing",
	"annual_statement",
] as const;
export type PayrollStatutoryFilingKind =
	(typeof PAYROLL_STATUTORY_FILING_KINDS)[number];

export const PAYROLL_STATUTORY_FILING_STATUSES = [
	"generated",
	"sealed",
] as const;
export type PayrollStatutoryFilingStatus =
	(typeof PAYROLL_STATUTORY_FILING_STATUSES)[number];

export const PAYROLL_FILING_OBLIGATION_STATUSES = [
	"missing",
	"generated",
	"sealed",
] as const;
export type PayrollFilingObligationStatus =
	(typeof PAYROLL_FILING_OBLIGATION_STATUSES)[number];

export interface PayrollStatutoryFilingTotals {
	baseAmount: string;
	employeeAmount: string;
	employerAmount: string;
}

export interface PayrollStatutoryFilingLine {
	baseAmount: string;
	calculatorId: string;
	createdAt: Date;
	currencyCode: string;
	employeeAmount: string;
	employeeId: string;
	employerAmount: string;
	filingId: string;
	id: string;
	organizationId: string;
	ruleCode: string;
	ruleVersion: string;
	runId: string;
	sequence: number;
}

export interface PayrollStatutoryFilingEvidence {
	contentHash: string;
	instrumentCode: string;
	jurisdictionCode: string;
	kind: PayrollStatutoryFilingKind;
	lines: readonly PayrollStatutoryFilingLine[];
	sourceRunIds: readonly string[];
	totals: PayrollStatutoryFilingTotals;
}

export interface PayrollStatutoryFiling {
	correlationId: string;
	createdAt: Date;
	createdBy: string;
	employeeId: string | null;
	evidence: PayrollStatutoryFilingEvidence | null;
	id: string;
	idempotencyKey: string;
	instrumentCode: string;
	jurisdictionCode: string;
	kind: PayrollStatutoryFilingKind;
	organizationId: string;
	periodId: string | null;
	requestFingerprint: string;
	sealedAt: Date | null;
	sealedBy: string | null;
	sourceRunIds: readonly string[];
	status: PayrollStatutoryFilingStatus;
	taxYear: number;
	totals: PayrollStatutoryFilingTotals;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PayrollStatutoryFilingView {
	filing: PayrollStatutoryFiling;
	lines: readonly PayrollStatutoryFilingLine[];
}

export interface PayrollFilingObligation {
	employeeId: string | null;
	filingId: string | null;
	instrumentCode: string;
	jurisdictionCode: string;
	kind: PayrollStatutoryFilingKind;
	periodId: string | null;
	status: PayrollFilingObligationStatus;
	taxYear: number;
}

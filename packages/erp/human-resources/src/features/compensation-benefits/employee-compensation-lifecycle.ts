import type { EmployeeCompensationStatus, PayFrequency } from "./status";

export function utcTodayIsoDate(now = new Date()): string {
	return now.toISOString().slice(0, 10);
}

export function dayBeforeIsoDate(isoDate: string): string {
	const date = new Date(`${isoDate}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() - 1);
	return date.toISOString().slice(0, 10);
}

export function resolveEmployeeCompensationApprovalStatus(
	effectiveFrom: string,
	today = utcTodayIsoDate(),
): "active" | "scheduled" {
	return effectiveFrom <= today ? "active" : "scheduled";
}

export function isEmployeeCompensationDraft(
	status: EmployeeCompensationStatus,
): boolean {
	return status === "draft";
}

export function isEmployeeCompensationScheduled(
	status: EmployeeCompensationStatus,
): boolean {
	return status === "scheduled";
}

export function isEmployeeCompensationEnded(
	status: EmployeeCompensationStatus,
): boolean {
	return status === "ended";
}

export function isEmployeeCompensationSuperseded(
	status: EmployeeCompensationStatus,
): boolean {
	return status === "superseded";
}

/** Records whose effective range may be resolved for as-of reads. */
export function isEmployeeCompensationAsOfEligible(
	status: EmployeeCompensationStatus,
): boolean {
	return status === "active" || status === "ended" || status === "superseded";
}

export function isEmployeeCompensationCancellable(
	status: EmployeeCompensationStatus,
): boolean {
	return status === "draft" || status === "scheduled" || status === "active";
}

export function isEmployeeCompensationCorrectable(
	status: EmployeeCompensationStatus,
): boolean {
	return status === "active" || status === "ended";
}

export interface EmployeeCompensationDraftFields {
	baseAmount: string;
	confidentialNote: string | null;
	currencyCode: string;
	effectiveFrom: string;
	effectiveTo: string | null;
	gradeId: string | null;
	payFrequency: PayFrequency;
	reason: string;
	salaryBandId: string | null;
}

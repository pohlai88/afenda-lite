import { errorResult, type Result } from "@afenda/errors";

const PAYROLL_DISBURSEMENT_REFERENCE =
	/^payroll-run:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):employee:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export interface PayrollDisbursementReference {
	readonly employeeId: string;
	readonly runId: string;
}

export function parsePayrollDisbursementReference(
	reference: string | null | undefined,
): Result<PayrollDisbursementReference | null> {
	if (
		reference === null ||
		reference === undefined ||
		reference.trim() === ""
	) {
		return errorResult.ok(null);
	}
	const matched = PAYROLL_DISBURSEMENT_REFERENCE.exec(reference.trim());
	if (matched === null) {
		return errorResult.ok(null);
	}
	const [, runId, employeeId] = matched;
	if (runId === undefined || employeeId === undefined) {
		return errorResult.ok(null);
	}
	return errorResult.ok({ runId, employeeId });
}

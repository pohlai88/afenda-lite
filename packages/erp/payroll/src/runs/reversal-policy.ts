import { errorResult, type Result } from "@afenda/errors";

import type { PayrollRun, PayrollRunUpdateInput } from "../types";

/**
 * Protects the evidence sealed by finalization. A reversal is compensating state,
 * never an opportunity to rewrite the calculation that was finalized.
 */
export function assertPayrollRunReversalUpdate(input: {
	current: PayrollRun;
	update: PayrollRunUpdateInput;
	nextStatus: PayrollRun["status"];
}): Result<void> {
	if (
		(input.update.auditReason !== undefined ||
			input.update.reversalReasonCode !== undefined ||
			input.update.reversalIdempotencyKey !== undefined ||
			input.update.reversalRequestFingerprint !== undefined) &&
		input.nextStatus !== "reversed"
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "A reversal reason is only valid for a run reversal",
		});
	}
	if (input.current.status !== "finalized" || input.nextStatus !== "reversed") {
		return errorResult.ok(undefined);
	}

	if (
		input.update.auditReason === undefined ||
		input.update.auditReason.trim() === ""
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "A payroll run reversal requires an audit reason",
		});
	}
	if (input.update.reversalProjection === undefined) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "A payroll run reversal requires compensating evidence",
		});
	}
	if (
		input.update.reversalReasonCode === undefined ||
		input.update.reversalIdempotencyKey === undefined ||
		input.update.reversalRequestFingerprint === undefined
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "A payroll run reversal requires idempotency evidence",
		});
	}
	if (
		input.update.calculationSnapshotHash !== undefined ||
		input.update.calculationVersion !== undefined ||
		input.update.roundingPolicyJson !== undefined ||
		input.update.finalizedAt !== undefined ||
		input.update.finalizedBy !== undefined
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Finalized payroll evidence cannot be changed by reversal",
		});
	}

	return errorResult.ok(undefined);
}

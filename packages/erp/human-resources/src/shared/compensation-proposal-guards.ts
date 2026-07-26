import { ok, type Result } from "@afenda/errors/result";
import type { CompensationProposalStatus } from "./compensation-status";
import {
	alreadyInStatus,
	cannotTransition,
	invalidState,
} from "./domain-guards";

export function canTransitionCompensationProposalStatus(
	current: CompensationProposalStatus,
	next: CompensationProposalStatus,
): boolean {
	if (current === next) return false;
	if (current === "draft" && next === "approved") {
		return true;
	}
	return false;
}

export function assertCompensationProposalStatusTransition(
	current: CompensationProposalStatus,
	next: CompensationProposalStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Compensation proposal", next);
	}
	if (!canTransitionCompensationProposalStatus(current, next)) {
		return cannotTransition("compensation proposal", current, next);
	}
	return ok(undefined);
}

export function assertCompensationProposalAmendable(
	status: CompensationProposalStatus,
): Result<void> {
	if (status !== "draft") {
		return invalidState(
			"Compensation proposal can only be amended while draft",
		);
	}
	return ok(undefined);
}

export function assertCompensationProposalApproved(
	status: CompensationProposalStatus,
): Result<void> {
	if (status !== "approved") {
		return invalidState("Compensation proposal must be approved");
	}
	return ok(undefined);
}

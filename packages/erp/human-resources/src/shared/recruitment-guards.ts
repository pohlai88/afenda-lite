import { fail, ok, type Result } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../error-codes";
import { invalidState } from "./domain-guards";
import {
	type ApplicationStatus,
	type CandidateStatus,
	type InterviewStatus,
	isApplicationTerminal,
	isOfferTerminal,
	type OfferStatus,
	type RequisitionStatus,
} from "./recruitment-status";

function alreadyInStatus(entity: string, status: string): Result<never> {
	return fail(
		"BAD_REQUEST",
		`${entity} is already in status '${status}'`,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
	);
}

function cannotTransition(
	entity: string,
	current: string,
	next: string,
): Result<never> {
	return fail(
		"BAD_REQUEST",
		`Cannot transition ${entity} from '${current}' to '${next}'`,
		humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION),
	);
}

export function canTransitionRequisitionStatus(
	current: RequisitionStatus,
	next: RequisitionStatus,
): boolean {
	if (current === next) return false;
	if (current === "draft" && (next === "submitted" || next === "cancelled")) {
		return true;
	}
	if (
		current === "submitted" &&
		(next === "approved" || next === "cancelled")
	) {
		return true;
	}
	if (current === "approved" && (next === "open" || next === "cancelled")) {
		return true;
	}
	if (
		current === "open" &&
		(next === "on_hold" || next === "closed" || next === "cancelled")
	) {
		return true;
	}
	if (
		current === "on_hold" &&
		(next === "open" || next === "closed" || next === "cancelled")
	) {
		return true;
	}
	return false;
}

export function assertRequisitionStatusTransition(
	current: RequisitionStatus,
	next: RequisitionStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Requisition", next);
	}
	if (!canTransitionRequisitionStatus(current, next)) {
		return cannotTransition("requisition", current, next);
	}
	return ok(undefined);
}

export function assertRequisitionAmendable(
	status: RequisitionStatus,
): Result<void> {
	if (status !== "draft") {
		return invalidState("Requisition can only be amended while draft");
	}
	return ok(undefined);
}

export function assertRequisitionOpenForApplication(
	status: RequisitionStatus,
): Result<void> {
	if (status !== "open") {
		return invalidState("Requisition must be open to accept applications");
	}
	return ok(undefined);
}

export function canTransitionCandidateStatus(
	current: CandidateStatus,
	next: CandidateStatus,
): boolean {
	if (current === next) return false;
	if (current === "active" && next === "archived") return true;
	if (current === "archived" && next === "active") return true;
	return false;
}

export function assertCandidateStatusTransition(
	current: CandidateStatus,
	next: CandidateStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Candidate", next);
	}
	if (!canTransitionCandidateStatus(current, next)) {
		return cannotTransition("candidate", current, next);
	}
	return ok(undefined);
}

export function assertCandidateActive(status: CandidateStatus): Result<void> {
	if (status !== "active") {
		return invalidState("Candidate is not active");
	}
	return ok(undefined);
}

export function canTransitionApplicationStatus(
	current: ApplicationStatus,
	next: ApplicationStatus,
): boolean {
	if (current === next) return false;
	if (isApplicationTerminal(current)) return false;
	if (current === "submitted" && next === "in_review") return true;
	if (current === "in_review" && next === "interviewing") return true;
	if (
		(current === "submitted" ||
			current === "in_review" ||
			current === "interviewing") &&
		(next === "rejected" || next === "withdrawn")
	) {
		return true;
	}
	if (current === "interviewing" && next === "offered") return true;
	if (current === "in_review" && next === "offered") return true;
	if (current === "offered" && next === "accepted") return true;
	if (current === "offered" && (next === "rejected" || next === "withdrawn")) {
		return true;
	}
	return false;
}

export function assertApplicationStatusTransition(
	current: ApplicationStatus,
	next: ApplicationStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Application", next);
	}
	if (!canTransitionApplicationStatus(current, next)) {
		return cannotTransition("application", current, next);
	}
	return ok(undefined);
}

export function assertApplicationEligibleForOffer(
	status: ApplicationStatus,
): Result<void> {
	if (status !== "in_review" && status !== "interviewing") {
		return invalidState(
			"Offer can only be created for applications in review or interviewing",
		);
	}
	return ok(undefined);
}

export function canTransitionInterviewStatus(
	current: InterviewStatus,
	next: InterviewStatus,
): boolean {
	if (current === next) return false;
	if (
		current === "scheduled" &&
		(next === "completed" || next === "cancelled")
	) {
		return true;
	}
	return false;
}

export function assertInterviewStatusTransition(
	current: InterviewStatus,
	next: InterviewStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Interview", next);
	}
	if (!canTransitionInterviewStatus(current, next)) {
		return cannotTransition("interview", current, next);
	}
	return ok(undefined);
}

export function assertInterviewSchedulable(
	applicationStatus: ApplicationStatus,
): Result<void> {
	if (
		applicationStatus !== "submitted" &&
		applicationStatus !== "in_review" &&
		applicationStatus !== "interviewing"
	) {
		return invalidState(
			"Interview can only be scheduled for an active application",
		);
	}
	return ok(undefined);
}

export function canTransitionOfferStatus(
	current: OfferStatus,
	next: OfferStatus,
): boolean {
	if (current === next) return false;
	if (isOfferTerminal(current)) return false;
	if (current === "draft" && (next === "issued" || next === "withdrawn")) {
		return true;
	}
	if (
		current === "issued" &&
		(next === "accepted" ||
			next === "declined" ||
			next === "expired" ||
			next === "withdrawn")
	) {
		return true;
	}
	return false;
}

export function assertOfferStatusTransition(
	current: OfferStatus,
	next: OfferStatus,
): Result<void> {
	if (current === next) {
		return alreadyInStatus("Offer", next);
	}
	if (!canTransitionOfferStatus(current, next)) {
		return cannotTransition("offer", current, next);
	}
	return ok(undefined);
}

export function assertOfferAmendable(status: OfferStatus): Result<void> {
	if (status !== "draft") {
		return invalidState("Offer can only be amended while draft");
	}
	return ok(undefined);
}

export function assertOfferAcceptable(input: {
	status: OfferStatus;
	expiresOn: string;
	asOfDate: string;
}): Result<void> {
	const transition = assertOfferStatusTransition(input.status, "accepted");
	if (!transition.ok) {
		return transition;
	}
	if (input.expiresOn < input.asOfDate) {
		return invalidState("Offer has expired and cannot be accepted");
	}
	return ok(undefined);
}

export function normalizeCandidateEmail(email: string): string {
	return email.trim().toLowerCase();
}

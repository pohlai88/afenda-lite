import { errorResult, type Result } from "@afenda/errors";
import { invalidState } from "../../kernel/execution/domain-guards";
import {
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import {
	type ApplicationStatus,
	type CandidateStatus,
	type InterviewStatus,
	isOfferTerminal,
	type OfferStatus,
	type RequisitionStatus,
} from "./status";

function alreadyInStatus(_entity: string, _status: string): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		),
	});
}

function cannotTransition(
	_entity: string,
	_current: string,
	_next: string,
): Result<never> {
	return errorResult.fail("BAD_REQUEST", {
		publicMessage: "The request is invalid",
		internalContext: humanResourcesErrorDetails(
			HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
		),
	});
}

export function canTransitionRequisitionStatus(
	current: RequisitionStatus,
	next: RequisitionStatus,
): boolean {
	if (current === next) {
		return false;
	}
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
	return errorResult.ok(undefined);
}

export function assertRequisitionAmendable(
	status: RequisitionStatus,
): Result<void> {
	if (status !== "draft") {
		return invalidState("Requisition can only be amended while draft");
	}
	return errorResult.ok(undefined);
}

export function assertRequisitionOpenForApplication(
	status: RequisitionStatus,
): Result<void> {
	if (status !== "open") {
		return invalidState("Requisition must be open to accept applications");
	}
	return errorResult.ok(undefined);
}

export function assertRequisitionHasHiringManager(input: {
	hiringManagerEmployeeId: string | null;
}): Result<void> {
	if (input.hiringManagerEmployeeId === null) {
		return invalidState(
			"Requisition requires a hiring manager before this transition",
		);
	}
	return errorResult.ok(undefined);
}

export function assertRequisitionHiringManagerAssignable(
	status: RequisitionStatus,
): Result<void> {
	if (status === "closed" || status === "cancelled") {
		return invalidState(
			"Cannot assign a hiring manager on a terminal requisition",
		);
	}
	return errorResult.ok(undefined);
}

export function assertRequisitionAllowsHeadcountReservation(
	status: RequisitionStatus,
): Result<void> {
	if (status !== "approved" && status !== "open") {
		return invalidState(
			"Headcount can only be reserved for approved or open requisitions",
		);
	}
	return errorResult.ok(undefined);
}

export function canTransitionCandidateStatus(
	current: CandidateStatus,
	next: CandidateStatus,
): boolean {
	if (current === next) {
		return false;
	}
	if (current === "anonymized") {
		return false;
	}
	if (current === "active" && next === "archived") {
		return true;
	}
	if (current === "archived" && next === "active") {
		return true;
	}
	if (
		(current === "active" || current === "archived") &&
		next === "anonymized"
	) {
		return true;
	}
	return false;
}

export function assertCandidateNotAnonymized(
	status: CandidateStatus,
): Result<void> {
	if (status === "anonymized") {
		return invalidState("Candidate has been anonymized");
	}
	return errorResult.ok(undefined);
}

export function assertCandidateAnonymizationEligible(input: {
	status: CandidateStatus;
	consentWithdrawnAt: Date | null;
	retentionUntil: string | null;
	asOf: string;
}): Result<void> {
	if (input.status === "anonymized") {
		return invalidState("Candidate has already been anonymized");
	}
	const transition = assertCandidateStatusTransition(
		input.status,
		"anonymized",
	);
	if (!transition.ok) {
		return transition;
	}
	const withdrawn = input.consentWithdrawnAt !== null;
	const retentionDue =
		input.retentionUntil !== null && input.retentionUntil <= input.asOf;
	if (!(withdrawn || retentionDue)) {
		return invalidState(
			"Candidate anonymization requires consent withdrawal or due retention",
		);
	}
	return errorResult.ok(undefined);
}

export const ANONYMIZED_CANDIDATE_DISPLAY_NAME =
	"Anonymized Candidate" as const;

export function anonymizedCandidateEmail(candidateId: string): string {
	return `anonymized+${candidateId}@invalid.local`;
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
	return errorResult.ok(undefined);
}

export function assertCandidateActive(status: CandidateStatus): Result<void> {
	if (status !== "active") {
		return invalidState("Candidate is not active");
	}
	return errorResult.ok(undefined);
}

const APPLICATION_STATUS_TRANSITIONS = new Set<string>([
	"rejected:submitted",
	"withdrawn:submitted",
	"submitted:in_review",
	"submitted:rejected",
	"submitted:withdrawn",
	"in_review:interviewing",
	"in_review:offered",
	"in_review:rejected",
	"in_review:withdrawn",
	"interviewing:offered",
	"interviewing:rejected",
	"interviewing:withdrawn",
	"offered:accepted",
	"offered:rejected",
	"offered:withdrawn",
]);

export function canTransitionApplicationStatus(
	current: ApplicationStatus,
	next: ApplicationStatus,
): boolean {
	return APPLICATION_STATUS_TRANSITIONS.has(`${current}:${next}`);
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
	return errorResult.ok(undefined);
}

export function assertApplicationReopenable(
	current: ApplicationStatus,
): Result<void> {
	if (current !== "rejected" && current !== "withdrawn") {
		return invalidState(
			"Application can only be reopened from rejected or withdrawn status",
		);
	}
	return errorResult.ok(undefined);
}

export function assertApplicationEligibleForOffer(
	status: ApplicationStatus,
): Result<void> {
	if (status !== "in_review" && status !== "interviewing") {
		return invalidState(
			"Offer can only be created for applications in review or interviewing",
		);
	}
	return errorResult.ok(undefined);
}

export function assertInterviewInterviewerAssignable(
	status: InterviewStatus,
): Result<void> {
	if (status !== "scheduled") {
		return invalidState(
			"Interviewer can only be assigned while interview is scheduled",
		);
	}
	return errorResult.ok(undefined);
}

export function canTransitionInterviewStatus(
	current: InterviewStatus,
	next: InterviewStatus,
): boolean {
	if (current === next) {
		return false;
	}
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
	return errorResult.ok(undefined);
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
	return errorResult.ok(undefined);
}

export function canTransitionOfferStatus(
	current: OfferStatus,
	next: OfferStatus,
): boolean {
	if (current === next) {
		return false;
	}
	if (isOfferTerminal(current)) {
		return false;
	}
	if (current === "draft" && (next === "approved" || next === "withdrawn")) {
		return true;
	}
	if (current === "approved" && (next === "issued" || next === "withdrawn")) {
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
	return errorResult.ok(undefined);
}

export function assertOfferAmendable(status: OfferStatus): Result<void> {
	if (status !== "draft") {
		return invalidState("Offer can only be amended while draft");
	}
	return errorResult.ok(undefined);
}

export function assertOfferProposalMutable(status: OfferStatus): Result<void> {
	if (status !== "draft") {
		return invalidState(
			"Compensation proposal reference can only change while offer is draft",
		);
	}
	return errorResult.ok(undefined);
}

export function assertOfferReadyForApproval(input: {
	compensationProposalId: string | null;
}): Result<void> {
	if (input.compensationProposalId === null) {
		return invalidState(
			"Compensation proposal reference is required before offer approval",
		);
	}
	return errorResult.ok(undefined);
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
	return errorResult.ok(undefined);
}

export function normalizeCandidateEmail(email: string): string {
	return email.trim().toLowerCase();
}

import { z } from "zod";

export const REQUISITION_STATUSES = [
	"draft",
	"submitted",
	"approved",
	"open",
	"on_hold",
	"closed",
	"cancelled",
] as const;
export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

export const CANDIDATE_STATUSES = ["active", "archived"] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const CANDIDATE_CONSENT_SOURCES = [
	"self_service",
	"recruiter_recorded",
	"import",
] as const;
export type CandidateConsentSource =
	(typeof CANDIDATE_CONSENT_SOURCES)[number];

export const APPLICATION_STATUSES = [
	"submitted",
	"in_review",
	"interviewing",
	"offered",
	"accepted",
	"rejected",
	"withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_TERMINAL_STATUSES = [
	"accepted",
	"rejected",
	"withdrawn",
] as const satisfies readonly ApplicationStatus[];

export const INTERVIEW_STATUSES = [
	"scheduled",
	"completed",
	"cancelled",
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_EVALUATION_RESULTS = [
	"advance",
	"hold",
	"reject",
] as const;
export type InterviewEvaluationResult =
	(typeof INTERVIEW_EVALUATION_RESULTS)[number];

export const OFFER_STATUSES = [
	"draft",
	"issued",
	"accepted",
	"declined",
	"expired",
	"withdrawn",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_ACTIVE_STATUSES = [
	"draft",
	"issued",
] as const satisfies readonly OfferStatus[];

export const requisitionStatusSchema = z.enum(REQUISITION_STATUSES);
export const candidateStatusSchema = z.enum(CANDIDATE_STATUSES);
export const candidateConsentSourceSchema = z.enum(CANDIDATE_CONSENT_SOURCES);
export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
export const interviewStatusSchema = z.enum(INTERVIEW_STATUSES);
export const interviewEvaluationResultSchema = z.enum(
	INTERVIEW_EVALUATION_RESULTS,
);
export const offerStatusSchema = z.enum(OFFER_STATUSES);

export function isApplicationTerminal(status: ApplicationStatus): boolean {
	return (
		status === "accepted" || status === "rejected" || status === "withdrawn"
	);
}

export function isOfferActive(status: OfferStatus): boolean {
	return status === "draft" || status === "issued";
}

export function isOfferTerminal(status: OfferStatus): boolean {
	return (
		status === "accepted" ||
		status === "declined" ||
		status === "expired" ||
		status === "withdrawn"
	);
}

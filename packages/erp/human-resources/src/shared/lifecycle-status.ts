import { z } from "zod";

export const ONBOARDING_CASE_STATUSES = [
	"in_progress",
	"completed",
	"cancelled",
] as const;
export type OnboardingCaseStatus = (typeof ONBOARDING_CASE_STATUSES)[number];

export const LIFECYCLE_TASK_STATUSES = [
	"pending",
	"completed",
	"waived",
] as const;
export type LifecycleTaskStatus = (typeof LIFECYCLE_TASK_STATUSES)[number];

export const PROBATION_STATUSES = ["open", "closed"] as const;
export type ProbationStatus = (typeof PROBATION_STATUSES)[number];

export const PROBATION_OUTCOMES = ["passed", "failed"] as const;
export type ProbationOutcome = (typeof PROBATION_OUTCOMES)[number];

export const TERMINATION_STATUSES = ["draft", "finalized"] as const;
export type TerminationStatus = (typeof TERMINATION_STATUSES)[number];

export const OFFBOARDING_CASE_STATUSES = [
	"in_progress",
	"completed",
	"cancelled",
] as const;
export type OffboardingCaseStatus = (typeof OFFBOARDING_CASE_STATUSES)[number];

export const CLEARANCE_STATUSES = ["pending", "cleared"] as const;
export type ClearanceStatus = (typeof CLEARANCE_STATUSES)[number];

export const MOVEMENT_KINDS = ["transfer"] as const;
export type MovementKind = (typeof MOVEMENT_KINDS)[number];

export const onboardingCaseStatusSchema = z.enum(ONBOARDING_CASE_STATUSES);
export const lifecycleTaskStatusSchema = z.enum(LIFECYCLE_TASK_STATUSES);
export const probationStatusSchema = z.enum(PROBATION_STATUSES);
export const probationOutcomeSchema = z.enum(PROBATION_OUTCOMES);
export const terminationStatusSchema = z.enum(TERMINATION_STATUSES);
export const offboardingCaseStatusSchema = z.enum(OFFBOARDING_CASE_STATUSES);
export const clearanceStatusSchema = z.enum(CLEARANCE_STATUSES);
export const movementKindSchema = z.enum(MOVEMENT_KINDS);

export function isOnboardingCaseActive(status: OnboardingCaseStatus): boolean {
	return status === "in_progress";
}

export function isOnboardingCaseTerminal(
	status: OnboardingCaseStatus,
): boolean {
	return status === "completed" || status === "cancelled";
}

export function isOffboardingCaseActive(
	status: OffboardingCaseStatus,
): boolean {
	return status === "in_progress";
}

export function isOffboardingCaseTerminal(
	status: OffboardingCaseStatus,
): boolean {
	return status === "completed" || status === "cancelled";
}

export function isProbationOpen(status: ProbationStatus): boolean {
	return status === "open";
}

export function isTerminationFinalized(status: TerminationStatus): boolean {
	return status === "finalized";
}

export function isClearancePending(status: ClearanceStatus): boolean {
	return status === "pending";
}

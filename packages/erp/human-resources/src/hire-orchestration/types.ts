import type {
	HumanResourcesAssignmentId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesHireAttemptId,
	HumanResourcesOfferId,
	HumanResourcesOnboardingCaseId,
	HumanResourcesPersonId,
	HumanResourcesWorkerId,
} from "../brands";
import type { OfferAcceptanceHandoff } from "../types";

export const HIRE_ATTEMPT_STATUSES = [
	"in_progress",
	"completed",
	"failed_compensated",
] as const;

export type HireAttemptStatus = (typeof HIRE_ATTEMPT_STATUSES)[number];

export const HIRE_SAGA_STEPS = [
	"reservation_verified",
	"person_created",
	"employee_created",
	"employment_created",
	"worker_created",
	"assignment_created",
	"onboarding_started",
] as const;

export type HireSagaStep = (typeof HIRE_SAGA_STEPS)[number];

export type HireCompensationLogEntry = {
	step: HireSagaStep | "compensation";
	action: string;
	entityId?: string;
	success: boolean;
	onboardingOrphaned?: boolean;
};

export type HireAttempt = {
	id: HumanResourcesHireAttemptId;
	organizationId: string;
	offerId: HumanResourcesOfferId;
	correlationId: string;
	idempotencyKey: string;
	requestFingerprint: string;
	status: HireAttemptStatus;
	currentStep: HireSagaStep | null;
	personId: HumanResourcesPersonId | null;
	employeeId: HumanResourcesEmployeeId | null;
	employmentId: HumanResourcesEmploymentId | null;
	workerId: HumanResourcesWorkerId | null;
	assignmentId: HumanResourcesAssignmentId | null;
	onboardingCaseId: HumanResourcesOnboardingCaseId | null;
	compensationLog: readonly HireCompensationLogEntry[];
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type HireFromAcceptedOfferResult = {
	attempt: HireAttempt;
	handoff: OfferAcceptanceHandoff;
	personId: HumanResourcesPersonId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	workerId: HumanResourcesWorkerId;
	assignmentId: HumanResourcesAssignmentId;
	onboardingCaseId: HumanResourcesOnboardingCaseId;
};

export function hireStepIdempotencyKey(
	sagaIdempotencyKey: string,
	step: string,
): string {
	return `${sagaIdempotencyKey}:${step}`;
}

export function isHireStepComplete(
	attempt: HireAttempt,
	step: HireSagaStep,
): boolean {
	switch (step) {
		case "reservation_verified":
			return (
				attempt.currentStep !== null &&
				HIRE_SAGA_STEPS.indexOf(attempt.currentStep) >=
					HIRE_SAGA_STEPS.indexOf("reservation_verified")
			);
		case "person_created":
			return attempt.personId !== null;
		case "employee_created":
			return attempt.employeeId !== null;
		case "employment_created":
			return attempt.employmentId !== null;
		case "worker_created":
			return attempt.workerId !== null;
		case "assignment_created":
			return attempt.assignmentId !== null;
		case "onboarding_started":
			return attempt.onboardingCaseId !== null;
		default: {
			const _exhaustive: never = step;
			return _exhaustive;
		}
	}
}

import type { OfferAcceptanceHandoff } from "../../kernel/contracts";
import type {
	HumanResourcesAssignmentId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
	HumanResourcesHireAttemptId,
	HumanResourcesOfferId,
	HumanResourcesOnboardingCaseId,
	HumanResourcesPersonId,
	HumanResourcesWorkerId,
} from "../../kernel/identity/brands";

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

export interface HireCompensationLogEntry {
	action: string;
	entityId?: string;
	onboardingOrphaned?: boolean;
	step: HireSagaStep | "compensation";
	success: boolean;
}

export interface HireAttempt {
	assignmentId: HumanResourcesAssignmentId | null;
	compensationLog: readonly HireCompensationLogEntry[];
	correlationId: string;
	createdAt: Date;
	createdBy: string;
	currentStep: HireSagaStep | null;
	employeeId: HumanResourcesEmployeeId | null;
	employmentId: HumanResourcesEmploymentId | null;
	id: HumanResourcesHireAttemptId;
	idempotencyKey: string;
	offerId: HumanResourcesOfferId;
	onboardingCaseId: HumanResourcesOnboardingCaseId | null;
	organizationId: string;
	personId: HumanResourcesPersonId | null;
	requestFingerprint: string;
	status: HireAttemptStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
	workerId: HumanResourcesWorkerId | null;
}

export interface HireFromAcceptedOfferResult {
	assignmentId: HumanResourcesAssignmentId;
	attempt: HireAttempt;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	handoff: OfferAcceptanceHandoff;
	onboardingCaseId: HumanResourcesOnboardingCaseId;
	personId: HumanResourcesPersonId;
	workerId: HumanResourcesWorkerId;
}

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

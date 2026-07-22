import type { Result } from "@afenda/errors/result";
import type {
	HumanResourcesAssignmentId,
	HumanResourcesClearanceId,
	HumanResourcesEmploymentConfirmationId,
	HumanResourcesEmploymentId,
	HumanResourcesOffboardingCaseId,
	HumanResourcesOffboardingTaskId,
	HumanResourcesOfferId,
	HumanResourcesOnboardingCaseId,
	HumanResourcesOnboardingTaskId,
	HumanResourcesPositionId,
	HumanResourcesProbationReviewId,
	HumanResourcesTerminationId,
} from "../brands";
import type { MutationPorts } from "../ports";
import type {
	LifecycleTaskStatus,
	ProbationOutcome,
} from "../shared/lifecycle-status";
import type {
	Clearance,
	EmploymentConfirmation,
	EmploymentMovement,
	OffboardingCase,
	OffboardingTask,
	OnboardingCase,
	OnboardingTask,
	ProbationReview,
	Termination,
} from "../types";

/**
 * Persistence contract for Employee lifecycle.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export type OnboardingTaskSeed = {
	code: string;
	title: string;
	mandatory: boolean;
};

export type OnboardingCaseCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	sourceOfferId: HumanResourcesOfferId | null;
	tasks: OnboardingTaskSeed[];
	idempotencyKey: string;
	startRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentOnboardingCaseRecord = {
	onboardingCase: OnboardingCase;
	startRequestFingerprint: string;
};

export type ProbationReviewCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	startsOn: string;
	endsOn: string;
	idempotencyKey: string;
	openRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentProbationReviewRecord = {
	probationReview: ProbationReview;
	openRequestFingerprint: string;
};

export type EmploymentConfirmationCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	confirmedOn: string;
	evidenceNote: string;
	idempotencyKey: string;
	confirmRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentEmploymentConfirmationRecord = {
	employmentConfirmation: EmploymentConfirmation;
	confirmRequestFingerprint: string;
};

export type TerminationCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	reasonCode: string;
	reasonDetail: string;
	effectiveOn: string;
	idempotencyKey: string;
	terminationRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentTerminationRecord = {
	termination: Termination;
	terminationRequestFingerprint: string;
};

export type EmploymentMovementCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	fromAssignmentId: HumanResourcesAssignmentId;
	toAssignmentId: HumanResourcesAssignmentId;
	kind: "transfer";
	effectiveOn: string;
	reason: string;
	idempotencyKey: string;
	transferRequestFingerprint: string;
	actorUserId: string;
};

export type IdempotentEmploymentMovementRecord = {
	employmentMovement: EmploymentMovement;
	transferRequestFingerprint: string;
};

export type OffboardingCaseCreateRecord = {
	organizationId: string;
	employmentId: HumanResourcesEmploymentId;
	terminationId: HumanResourcesTerminationId | null;
	tasks: OnboardingTaskSeed[];
	idempotencyKey: string;
	startRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentOffboardingCaseRecord = {
	offboardingCase: OffboardingCase;
	startRequestFingerprint: string;
};

export type HumanResourcesLifecycleStore = {
	// Onboarding
	getOnboardingCase(input: {
		organizationId: string;
		onboardingCaseId: HumanResourcesOnboardingCaseId;
	}): Promise<Result<OnboardingCase | null>>;

	findOnboardingByStartIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentOnboardingCaseRecord | null>>;

	startOnboarding(
		record: OnboardingCaseCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OnboardingCase>>;

	completeOnboardingTask(
		input: {
			organizationId: string;
			taskId: HumanResourcesOnboardingTaskId;
			newStatus: LifecycleTaskStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OnboardingCase>>;

	completeOnboarding(
		input: {
			organizationId: string;
			onboardingCaseId: HumanResourcesOnboardingCaseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OnboardingCase>>;

	listOnboardingTasks(input: {
		organizationId: string;
		onboardingCaseId: HumanResourcesOnboardingCaseId;
	}): Promise<Result<OnboardingTask[]>>;
	// Probation
	getProbationReview(input: {
		organizationId: string;
		probationReviewId: HumanResourcesProbationReviewId;
	}): Promise<Result<ProbationReview | null>>;

	findProbationByOpenIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentProbationReviewRecord | null>>;

	openProbation(
		record: ProbationReviewCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ProbationReview>>;

	extendProbation(
		input: {
			organizationId: string;
			probationReviewId: HumanResourcesProbationReviewId;
			newEndsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ProbationReview>>;

	recordProbationOutcome(
		input: {
			organizationId: string;
			probationReviewId: HumanResourcesProbationReviewId;
			outcome: ProbationOutcome;
			concludedOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ProbationReview>>;
	// Employment Confirmation
	getEmploymentConfirmation(input: {
		organizationId: string;
		employmentConfirmationId: HumanResourcesEmploymentConfirmationId;
	}): Promise<Result<EmploymentConfirmation | null>>;

	findConfirmationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmploymentConfirmationRecord | null>>;

	confirmEmployment(
		record: EmploymentConfirmationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentConfirmation>>;
	// Transfer
	findTransferByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmploymentMovementRecord | null>>;

	transferAssignment(
		input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			toPositionId: HumanResourcesPositionId;
			effectiveOn: string;
			reason: string;
			idempotencyKey: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentMovement>>;
	// Termination
	getTermination(input: {
		organizationId: string;
		terminationId: HumanResourcesTerminationId;
	}): Promise<Result<Termination | null>>;

	findTerminationByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentTerminationRecord | null>>;

	finalizeTermination(
		record: TerminationCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Termination>>;
	// Offboarding
	getOffboardingCase(input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}): Promise<Result<OffboardingCase | null>>;

	findOffboardingByStartIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentOffboardingCaseRecord | null>>;

	startOffboarding(
		record: OffboardingCaseCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>>;

	completeOffboardingTask(
		input: {
			organizationId: string;
			taskId: HumanResourcesOffboardingTaskId;
			newStatus: LifecycleTaskStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>>;

	recordExitInterview(
		input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
			conductedOn: string;
			notes: string | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>>;

	recordClearance(
		input: {
			organizationId: string;
			clearanceId: HumanResourcesClearanceId;
			clearedOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>>;

	completeOffboarding(
		input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OffboardingCase>>;

	listOffboardingTasks(input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}): Promise<Result<OffboardingTask[]>>;

	getClearanceByOffboardingCase(input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}): Promise<Result<Clearance | null>>;
};

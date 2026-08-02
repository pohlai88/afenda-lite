import type { Result } from "@afenda/errors";
import type {
	Clearance,
	EmploymentConfirmation,
	EmploymentMovement,
	OffboardingAccessRevocation,
	OffboardingCase,
	OffboardingPayrollHandoff,
	OffboardingTask,
	OnboardingAccessHandoff,
	OnboardingCase,
	OnboardingEquipmentHandoff,
	OnboardingOrientation,
	OnboardingTask,
	ProbationAssessment,
	ProbationReview,
	Termination,
} from "../../kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../kernel/emissions/mutation-meta";
import type {
	HumanResourcesOrganizationDimensions,
	MutationPorts,
} from "../../kernel/execution/ports";
import type {
	HumanResourcesAssignmentId,
	HumanResourcesClearanceId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentConfirmationId,
	HumanResourcesEmploymentId,
	HumanResourcesOffboardingAccessRevocationId,
	HumanResourcesOffboardingCaseId,
	HumanResourcesOffboardingPayrollHandoffId,
	HumanResourcesOffboardingTaskId,
	HumanResourcesOfferId,
	HumanResourcesOnboardingAccessHandoffId,
	HumanResourcesOnboardingCaseId,
	HumanResourcesOnboardingEquipmentHandoffId,
	HumanResourcesOnboardingOrientationId,
	HumanResourcesOnboardingTaskId,
	HumanResourcesPositionId,
	HumanResourcesProbationReviewId,
	HumanResourcesTerminationId,
	HumanResourcesWorkCalendarId,
} from "../../kernel/identity/brands";
import type { LifecycleTaskStatus, ProbationOutcome } from "./status";

/**
 * Persistence contract for Employee lifecycle.
 *
 * This feature owns its narrow persistence contract. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export interface OnboardingTaskSeed {
	code: string;
	mandatory: boolean;
	title: string;
}

export interface OnboardingCaseCreateRecord {
	createdBy: string;
	employmentId: HumanResourcesEmploymentId;
	idempotencyKey: string;
	organizationId: string;
	sourceOfferId: HumanResourcesOfferId | null;
	startRequestFingerprint: string;
	tasks: OnboardingTaskSeed[];
}

export interface IdempotentOnboardingCaseRecord {
	onboardingCase: OnboardingCase;
	startRequestFingerprint: string;
}

export interface ProbationReviewCreateRecord {
	createdBy: string;
	employmentId: HumanResourcesEmploymentId;
	endsOn: string;
	idempotencyKey: string;
	openRequestFingerprint: string;
	organizationId: string;
	startsOn: string;
}

export interface IdempotentProbationReviewRecord {
	openRequestFingerprint: string;
	probationReview: ProbationReview;
}

export interface EmploymentConfirmationCreateRecord {
	confirmedOn: string;
	confirmRequestFingerprint: string;
	createdBy: string;
	employmentId: HumanResourcesEmploymentId;
	evidenceNote: string;
	idempotencyKey: string;
	organizationId: string;
}

export interface IdempotentEmploymentConfirmationRecord {
	confirmRequestFingerprint: string;
	employmentConfirmation: EmploymentConfirmation;
}

export interface TerminationCreateRecord {
	createdBy: string;
	effectiveOn: string;
	employmentId: HumanResourcesEmploymentId;
	idempotencyKey: string;
	organizationId: string;
	reasonCode: string;
	reasonDetail: string;
	rehireEligible: boolean;
	terminationRequestFingerprint: string;
}

export interface TerminationApproveRecord {
	actorUserId: string;
	expectedVersion: number;
	organizationId: string;
	terminationId: HumanResourcesTerminationId;
}

export interface TerminationFinalizeRecord {
	actorUserId: string;
	expectedVersion: number;
	organizationId: string;
	terminationId: HumanResourcesTerminationId;
}

export interface IdempotentTerminationRecord {
	termination: Termination;
	terminationRequestFingerprint: string;
}

export interface EmploymentMovementCreateRecord {
	actorUserId: string;
	effectiveOn: string;
	employmentId: HumanResourcesEmploymentId;
	fromAssignmentId: HumanResourcesAssignmentId;
	idempotencyKey: string;
	kind: "transfer";
	organizationId: string;
	reason: string;
	toAssignmentId: HumanResourcesAssignmentId;
	transferRequestFingerprint: string;
}

export interface IdempotentEmploymentMovementRecord {
	employmentMovement: EmploymentMovement;
	transferRequestFingerprint: string;
}

export interface OffboardingCaseCreateRecord {
	createdBy: string;
	employmentId: HumanResourcesEmploymentId;
	idempotencyKey: string;
	organizationId: string;
	startRequestFingerprint: string;
	tasks: OnboardingTaskSeed[];
	terminationId: HumanResourcesTerminationId | null;
}

export interface IdempotentOffboardingCaseRecord {
	offboardingCase: OffboardingCase;
	startRequestFingerprint: string;
}

export interface HumanResourcesLifecycleStore {
	approveTermination: (
		record: TerminationApproveRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Termination>>;

	completeOffboarding: (
		input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OffboardingCase>>;

	completeOffboardingTask: (
		input: {
			organizationId: string;
			taskId: HumanResourcesOffboardingTaskId;
			newStatus: LifecycleTaskStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OffboardingCase>>;

	completeOnboarding: (
		input: {
			organizationId: string;
			onboardingCaseId: HumanResourcesOnboardingCaseId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OnboardingCase>>;

	completeOnboardingTask: (
		input: {
			organizationId: string;
			taskId: HumanResourcesOnboardingTaskId;
			newStatus: LifecycleTaskStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OnboardingCase>>;

	confirmEmployment: (
		record: EmploymentConfirmationCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmploymentConfirmation>>;

	extendProbation: (
		input: {
			organizationId: string;
			probationReviewId: HumanResourcesProbationReviewId;
			newEndsOn: string;
			reason: string;
			evidenceReference: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<ProbationReview>>;

	finalizeTermination: (
		record: TerminationFinalizeRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Termination>>;

	findConfirmationByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentEmploymentConfirmationRecord | null>>;

	findOffboardingByStartIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentOffboardingCaseRecord | null>>;

	findOnboardingByStartIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentOnboardingCaseRecord | null>>;

	findProbationByOpenIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentProbationReviewRecord | null>>;

	findTerminationByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentTerminationRecord | null>>;
	// Transfer
	findTransferByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentEmploymentMovementRecord | null>>;

	getClearanceByOffboardingCase: (input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}) => Promise<Result<Clearance | null>>;
	// Employment Confirmation
	getEmploymentConfirmation: (input: {
		organizationId: string;
		employmentConfirmationId: HumanResourcesEmploymentConfirmationId;
	}) => Promise<Result<EmploymentConfirmation | null>>;

	getOffboardingAccessRevocationByCase: (input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}) => Promise<Result<OffboardingAccessRevocation | null>>;
	// Offboarding
	getOffboardingCase: (input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}) => Promise<Result<OffboardingCase | null>>;

	getOffboardingPayrollHandoffByCase: (input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}) => Promise<Result<OffboardingPayrollHandoff | null>>;

	getOnboardingAccessHandoffByCase: (input: {
		organizationId: string;
		onboardingCaseId: HumanResourcesOnboardingCaseId;
	}) => Promise<Result<OnboardingAccessHandoff | null>>;
	// Onboarding
	getOnboardingCase: (input: {
		organizationId: string;
		onboardingCaseId: HumanResourcesOnboardingCaseId;
	}) => Promise<Result<OnboardingCase | null>>;

	getOnboardingEquipmentHandoffByCase: (input: {
		organizationId: string;
		onboardingCaseId: HumanResourcesOnboardingCaseId;
	}) => Promise<Result<OnboardingEquipmentHandoff | null>>;

	getOnboardingOrientationByCase: (input: {
		organizationId: string;
		onboardingCaseId: HumanResourcesOnboardingCaseId;
	}) => Promise<Result<OnboardingOrientation | null>>;

	getOnboardingTask: (input: {
		organizationId: string;
		taskId: HumanResourcesOnboardingTaskId;
	}) => Promise<Result<OnboardingTask | null>>;
	// Probation
	getProbationReview: (input: {
		organizationId: string;
		probationReviewId: HumanResourcesProbationReviewId;
	}) => Promise<Result<ProbationReview | null>>;
	// Termination
	getTermination: (input: {
		organizationId: string;
		terminationId: HumanResourcesTerminationId;
	}) => Promise<Result<Termination | null>>;

	listOffboardingTasks: (input: {
		organizationId: string;
		offboardingCaseId: HumanResourcesOffboardingCaseId;
	}) => Promise<Result<OffboardingTask[]>>;

	listOnboardingTasks: (input: {
		organizationId: string;
		onboardingCaseId: HumanResourcesOnboardingCaseId;
	}) => Promise<Result<OnboardingTask[]>>;

	listProbationAssessments: (input: {
		organizationId: string;
		probationReviewId: HumanResourcesProbationReviewId;
	}) => Promise<Result<ProbationAssessment[]>>;

	listProbationReviewsByEmployment: (input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}) => Promise<Result<ProbationReview[]>>;

	openProbation: (
		record: ProbationReviewCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<ProbationReview>>;

	proposeTermination: (
		record: TerminationCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Termination>>;

	recordClearance: (
		input: {
			organizationId: string;
			clearanceId: HumanResourcesClearanceId;
			clearedOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OffboardingCase>>;

	recordExitInterview: (
		input: {
			organizationId: string;
			offboardingCaseId: HumanResourcesOffboardingCaseId;
			conductedOn: string;
			notes: string | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OffboardingCase>>;

	recordOffboardingAccessRevocation: (
		input: {
			organizationId: string;
			accessRevocationId: HumanResourcesOffboardingAccessRevocationId;
			revokedOn: string;
			summary: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OffboardingCase>>;

	recordOffboardingPayrollHandoff: (
		input: {
			organizationId: string;
			payrollHandoffId: HumanResourcesOffboardingPayrollHandoffId;
			readyOn: string;
			summary: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OffboardingCase>>;

	recordOnboardingAccessHandoff: (
		input: {
			organizationId: string;
			accessHandoffId: HumanResourcesOnboardingAccessHandoffId;
			grantedOn: string;
			summary: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OnboardingCase>>;

	recordOnboardingEquipmentHandoff: (
		input: {
			organizationId: string;
			equipmentHandoffId: HumanResourcesOnboardingEquipmentHandoffId;
			handedOverOn: string;
			summary: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OnboardingCase>>;

	recordOnboardingOrientation: (
		input: {
			organizationId: string;
			orientationId: HumanResourcesOnboardingOrientationId;
			acknowledgedOn: string;
			notes: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OnboardingCase>>;

	recordProbationAssessment: (
		input: {
			organizationId: string;
			probationReviewId: HumanResourcesProbationReviewId;
			reviewedOn: string;
			reason: string;
			evidenceReference: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<ProbationAssessment>>;

	recordProbationOutcome: (
		input: {
			organizationId: string;
			probationReviewId: HumanResourcesProbationReviewId;
			outcome: ProbationOutcome;
			concludedOn: string;
			reason: string;
			evidenceReference: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<ProbationReview>>;

	startOffboarding: (
		record: OffboardingCaseCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OffboardingCase>>;

	startOnboarding: (
		record: OnboardingCaseCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OnboardingCase>>;

	transferAssignment: (
		input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			toPositionId: HumanResourcesPositionId;
			organizationDimensions: HumanResourcesOrganizationDimensions;
			managerEmployeeIdSnapshot: HumanResourcesEmployeeId | null;
			workCalendarIdSnapshot: HumanResourcesWorkCalendarId | null;
			effectiveOn: string;
			reason: string;
			idempotencyKey: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmploymentMovement>>;
}

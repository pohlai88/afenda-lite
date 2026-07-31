import type { Result } from "@afenda/errors";
import type {
	HumanResourcesEmployeeCaseActionId,
	HumanResourcesEmployeeCaseAppealId,
	HumanResourcesEmployeeCaseEventId,
	HumanResourcesEmployeeCaseId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
} from "../brands";
import type {
	EmployeeCase,
	EmployeeCaseAction,
	EmployeeCaseAppeal,
	EmployeeCaseEvent,
	EmployeeCaseOutcome,
	EmployeeCaseTimeline,
} from "../employee-relations/types";
import type { MutationPorts } from "../ports";
import type {
	EmployeeCaseActionType,
	EmployeeCaseEventKind,
	EmployeeCaseParticipantRole,
	EmployeeCaseSeverity,
	EmployeeCaseStatus,
	EmployeeCaseType,
} from "../shared/employee-relations-status";
import type { HumanResourcesMutationMeta } from "../shared/mutation-meta";

/**
 * Persistence contract for Employee relations.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export interface EmployeeCaseCreateRecord {
	allegationSummary: string;
	caseType: EmployeeCaseType;
	classificationCode: string;
	conflictedActorUserIds: string[];
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	organizationId: string;
	ownerActorUserId: string;
	severity: EmployeeCaseSeverity;
	subjectActorUserId: string | null;
}

export interface IdempotentEmployeeCaseOpenRecord {
	caseId: HumanResourcesEmployeeCaseId;
	createRequestFingerprint: string;
}

export interface EmployeeCaseActionCreateRecord {
	actionType: EmployeeCaseActionType;
	caseId: HumanResourcesEmployeeCaseId;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	expectedVersion: number;
	organizationId: string;
	recommendationNote: string | null;
	recommendedBy: string;
}

export interface IdempotentEmployeeCaseActionOpenRecord {
	actionId: HumanResourcesEmployeeCaseActionId;
	createRequestFingerprint: string;
}

export interface EmployeeCaseAppealCreateRecord {
	appealGroundsSummary: string;
	caseId: HumanResourcesEmployeeCaseId;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	expectedVersion: number;
	organizationId: string;
}

export interface IdempotentEmployeeCaseAppealOpenRecord {
	appealId: HumanResourcesEmployeeCaseAppealId;
	createRequestFingerprint: string;
}

export interface HumanResourcesEmployeeRelationsStore {
	addEmployeeCaseEvidenceReference: (
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			documentRef: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCaseEvent>>;

	addEmployeeCaseParticipant: (
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			participantActorUserId: string;
			role: EmployeeCaseParticipantRole;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCase>>;

	approveEmployeeCaseAction: (
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			actionId: HumanResourcesEmployeeCaseActionId;
			policyValidationRecorded: boolean;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCaseAction>>;

	assignEmployeeCaseOwner: (
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			ownerActorUserId: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCase>>;

	closeEmployeeCase: (
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			outcomeCode: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCase>>;

	findEmployeeCaseActionByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<
		Result<
			| (IdempotentEmployeeCaseActionOpenRecord & {
					action: EmployeeCaseAction;
			  })
			| null
		>
	>;

	findEmployeeCaseAppealByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<
		Result<
			| (IdempotentEmployeeCaseAppealOpenRecord & {
					appeal: EmployeeCaseAppeal;
			  })
			| null
		>
	>;
	// Employee relations
	findEmployeeCaseByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<
		Result<(IdempotentEmployeeCaseOpenRecord & { case: EmployeeCase }) | null>
	>;

	/** Org-scoped case load for authorization decisions (no actor ACL). */
	findEmployeeCaseInOrganization: (input: {
		organizationId: string;
		caseId: HumanResourcesEmployeeCaseId;
	}) => Promise<Result<EmployeeCase | null>>;

	getEmployeeCaseById: (input: {
		organizationId: string;
		caseId: HumanResourcesEmployeeCaseId;
		actorUserId: string;
	}) => Promise<Result<EmployeeCase>>;

	getEmployeeCaseOutcome: (input: {
		organizationId: string;
		caseId: HumanResourcesEmployeeCaseId;
		actorUserId: string;
	}) => Promise<Result<EmployeeCaseOutcome>>;

	getEmployeeCaseTimeline: (input: {
		organizationId: string;
		caseId: HumanResourcesEmployeeCaseId;
		actorUserId: string;
	}) => Promise<Result<EmployeeCaseTimeline>>;

	getEmployeeRelationsHistoryByEmployee: (input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}) => Promise<Result<EmployeeCase[]>>;

	issueInterimEmployeeMeasure: (
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			interimAuthority: string;
			interimReason: string;
			interimStartsOn: string;
			interimReviewOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCase>>;

	listCasesAssignedToActor: (input: {
		organizationId: string;
		ownerActorUserId: string;
	}) => Promise<Result<EmployeeCase[]>>;

	listEmployeeCases: (input: {
		organizationId: string;
		status?: EmployeeCaseStatus | undefined;
	}) => Promise<Result<EmployeeCase[]>>;

	listOpenEmployeeRelationsCases: (input: {
		organizationId: string;
	}) => Promise<Result<EmployeeCase[]>>;

	openEmployeeCase: (
		record: EmployeeCaseCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCase>>;

	recommendEmployeeCaseAction: (
		record: EmployeeCaseActionCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCaseAction>>;

	recordEmployeeCaseAppeal: (
		record: EmployeeCaseAppealCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCaseAppeal>>;

	recordEmployeeCaseEvent: (
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			eventKind: EmployeeCaseEventKind;
			payloadJson?: Record<string, unknown> | null | undefined;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCaseEvent>>;

	recordEmployeeCaseFinding: (
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			findingCode: string;
			findingSummary: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCase>>;

	redactEmployeeCaseEvidenceReference: (
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			eventId: HumanResourcesEmployeeCaseEventId;
			reasonCode: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCaseEvent>>;

	reopenEmployeeCase: (
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			reasonCode: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCase>>;

	resolveEmployeeCaseAppeal: (
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			appealId: HumanResourcesEmployeeCaseAppealId;
			appealOutcomeCode: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCaseAppeal>>;

	updateEmployeeCaseClassification: (
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			classificationCode: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmployeeCase>>;
}

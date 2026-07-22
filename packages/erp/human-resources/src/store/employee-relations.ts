import type { Result } from "@afenda/errors/result";
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
	EmployeeCaseListPage,
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

/**
 * Persistence contract for Employee relations.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export type EmployeeCaseCreateRecord = {
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	caseType: EmployeeCaseType;
	severity: EmployeeCaseSeverity;
	allegationSummary: string;
	classificationCode: string;
	ownerActorUserId: string;
	subjectActorUserId: string | null;
	conflictedActorUserIds: string[];
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentEmployeeCaseOpenRecord = {
	caseId: HumanResourcesEmployeeCaseId;
	createRequestFingerprint: string;
};

export type EmployeeCaseActionCreateRecord = {
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
	actionType: EmployeeCaseActionType;
	recommendationNote: string | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	expectedVersion: number;
	recommendedBy: string;
};

export type IdempotentEmployeeCaseActionOpenRecord = {
	actionId: HumanResourcesEmployeeCaseActionId;
	createRequestFingerprint: string;
};

export type EmployeeCaseAppealCreateRecord = {
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
	appealGroundsSummary: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	expectedVersion: number;
	createdBy: string;
};

export type IdempotentEmployeeCaseAppealOpenRecord = {
	appealId: HumanResourcesEmployeeCaseAppealId;
	createRequestFingerprint: string;
};

export type HumanResourcesEmployeeRelationsStore = {
	// Employee relations
	findEmployeeCaseByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<
		Result<(IdempotentEmployeeCaseOpenRecord & { case: EmployeeCase }) | null>
	>;

	openEmployeeCase(
		record: EmployeeCaseCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	getEmployeeCaseById(input: {
		organizationId: string;
		caseId: HumanResourcesEmployeeCaseId;
		actorUserId: string;
	}): Promise<Result<EmployeeCase>>;

	listEmployeeCases(input: {
		organizationId: string;
		actorUserId: string;
		page?: number;
		pageSize?: number;
		status?: EmployeeCaseStatus;
	}): Promise<Result<EmployeeCaseListPage>>;

	listCasesAssignedToActor(input: {
		organizationId: string;
		actorUserId: string;
		page?: number;
		pageSize?: number;
	}): Promise<Result<EmployeeCaseListPage>>;

	listOpenEmployeeRelationsCases(input: {
		organizationId: string;
		actorUserId: string;
		page?: number;
		pageSize?: number;
	}): Promise<Result<EmployeeCaseListPage>>;

	getEmployeeRelationsHistoryByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		page?: number;
		pageSize?: number;
	}): Promise<Result<EmployeeCaseListPage>>;

	updateEmployeeCaseClassification(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			classificationCode: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	assignEmployeeCaseOwner(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			ownerActorUserId: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	addEmployeeCaseParticipant(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			participantActorUserId: string;
			role: EmployeeCaseParticipantRole;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	recordEmployeeCaseEvent(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			eventKind: EmployeeCaseEventKind;
			payloadJson?: Record<string, unknown> | null;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseEvent>>;

	addEmployeeCaseEvidenceReference(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			documentRef: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseEvent>>;

	redactEmployeeCaseEvidenceReference(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			eventId: HumanResourcesEmployeeCaseEventId;
			reasonCode: string;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseEvent>>;

	issueInterimEmployeeMeasure(
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
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	recordEmployeeCaseFinding(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			findingCode: string;
			findingSummary: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	findEmployeeCaseActionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<
		Result<
			| (IdempotentEmployeeCaseActionOpenRecord & {
					action: EmployeeCaseAction;
			  })
			| null
		>
	>;

	recommendEmployeeCaseAction(
		record: EmployeeCaseActionCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseAction>>;

	approveEmployeeCaseAction(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			actionId: HumanResourcesEmployeeCaseActionId;
			policyValidationRecorded: boolean;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseAction>>;

	findEmployeeCaseAppealByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<
		Result<
			| (IdempotentEmployeeCaseAppealOpenRecord & {
					appeal: EmployeeCaseAppeal;
			  })
			| null
		>
	>;

	recordEmployeeCaseAppeal(
		record: EmployeeCaseAppealCreateRecord,
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseAppeal>>;

	resolveEmployeeCaseAppeal(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			appealId: HumanResourcesEmployeeCaseAppealId;
			appealOutcomeCode: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCaseAppeal>>;

	closeEmployeeCase(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			outcomeCode: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	reopenEmployeeCase(
		input: {
			organizationId: string;
			caseId: HumanResourcesEmployeeCaseId;
			reasonCode: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmployeeCase>>;

	getEmployeeCaseTimeline(input: {
		organizationId: string;
		caseId: HumanResourcesEmployeeCaseId;
		actorUserId: string;
	}): Promise<Result<EmployeeCaseTimeline>>;

	getEmployeeCaseOutcome(input: {
		organizationId: string;
		caseId: HumanResourcesEmployeeCaseId;
		actorUserId: string;
	}): Promise<Result<EmployeeCaseOutcome>>;
};

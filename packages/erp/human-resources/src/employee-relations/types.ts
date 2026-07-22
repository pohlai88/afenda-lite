import type {
	HumanResourcesEmployeeCaseActionId,
	HumanResourcesEmployeeCaseAppealId,
	HumanResourcesEmployeeCaseEventId,
	HumanResourcesEmployeeCaseId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
} from "../brands";
import type {
	EmployeeCaseActionStatus,
	EmployeeCaseActionType,
	EmployeeCaseAppealStatus,
	EmployeeCaseEventKind,
	EmployeeCaseInterimStatus,
	EmployeeCaseParticipantRole,
	EmployeeCaseSeverity,
	EmployeeCaseStatus,
	EmployeeCaseType,
} from "../shared/employee-relations-status";

export type EmployeeCaseParticipant = {
	actorUserId: string;
	role: EmployeeCaseParticipantRole;
	addedAt: string;
};

export type EmployeeCase = {
	id: HumanResourcesEmployeeCaseId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	caseType: EmployeeCaseType;
	status: EmployeeCaseStatus;
	severity: EmployeeCaseSeverity;
	allegationSummary: string;
	classificationCode: string;
	ownerActorUserId: string;
	subjectActorUserId: string | null;
	participants: EmployeeCaseParticipant[];
	conflictedActorUserIds: string[];
	interimAuthority: string | null;
	interimReason: string | null;
	interimStartsOn: string | null;
	interimReviewOn: string | null;
	interimStatus: EmployeeCaseInterimStatus | null;
	findingCode: string | null;
	findingSummary: string | null;
	findingRecordedBy: string | null;
	findingRecordedAt: Date | null;
	outcomeCode: string | null;
	closedAt: Date | null;
	closedBy: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmployeeCaseEvent = {
	id: HumanResourcesEmployeeCaseEventId;
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
	eventKind: EmployeeCaseEventKind;
	sequenceNo: number;
	documentRef: string | null;
	payloadJson: Record<string, unknown> | null;
	redactsEventId: HumanResourcesEmployeeCaseEventId | null;
	recordedBy: string;
	recordedAt: Date;
	createdAt: Date;
};

export type EmployeeCaseAction = {
	id: HumanResourcesEmployeeCaseActionId;
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
	actionType: EmployeeCaseActionType;
	status: EmployeeCaseActionStatus;
	recommendedBy: string;
	approvedBy: string | null;
	policyValidationRecorded: boolean;
	recommendationNote: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmployeeCaseAppeal = {
	id: HumanResourcesEmployeeCaseAppealId;
	organizationId: string;
	caseId: HumanResourcesEmployeeCaseId;
	originalFindingCode: string;
	originalFindingRecordedAt: Date;
	appealGroundsSummary: string;
	status: EmployeeCaseAppealStatus;
	appealOutcomeCode: string | null;
	resolvedBy: string | null;
	resolvedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type EmployeeCaseListPage = {
	cases: EmployeeCase[];
	totalCount: number;
	page: number;
	pageSize: number;
};

export type EmployeeCaseTimeline = {
	caseId: HumanResourcesEmployeeCaseId;
	events: EmployeeCaseEvent[];
};

export type EmployeeCaseTerminationHandoff = {
	caseId: HumanResourcesEmployeeCaseId;
	actionId: HumanResourcesEmployeeCaseActionId;
	organizationId: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
};

export type EmployeeCaseOutcome = {
	caseId: HumanResourcesEmployeeCaseId;
	status: EmployeeCaseStatus;
	outcomeCode: string | null;
	findingCode: string | null;
	approvedActions: EmployeeCaseAction[];
	openAppeals: EmployeeCaseAppeal[];
	terminationHandoff: EmployeeCaseTerminationHandoff | null;
};

export type IdempotentEmployeeCaseRecord = {
	caseId: HumanResourcesEmployeeCaseId;
	fingerprint: string;
};

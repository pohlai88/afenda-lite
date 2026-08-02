import type {
	HumanResourcesEmployeeCaseActionId,
	HumanResourcesEmployeeCaseAppealId,
	HumanResourcesEmployeeCaseEventId,
	HumanResourcesEmployeeCaseId,
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
} from "../../kernel/identity/brands";
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
} from "./status";

export interface EmployeeCaseParticipant {
	actorUserId: string;
	addedAt: string;
	role: EmployeeCaseParticipantRole;
}

export interface EmployeeCase {
	allegationSummary: string;
	caseType: EmployeeCaseType;
	classificationCode: string;
	closedAt: Date | null;
	closedBy: string | null;
	conflictedActorUserIds: string[];
	createdAt: Date;
	createdBy: string;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	findingCode: string | null;
	findingRecordedAt: Date | null;
	findingRecordedBy: string | null;
	findingSummary: string | null;
	id: HumanResourcesEmployeeCaseId;
	interimAuthority: string | null;
	interimReason: string | null;
	interimReviewOn: string | null;
	interimStartsOn: string | null;
	interimStatus: EmployeeCaseInterimStatus | null;
	organizationId: string;
	outcomeCode: string | null;
	ownerActorUserId: string;
	participants: EmployeeCaseParticipant[];
	severity: EmployeeCaseSeverity;
	status: EmployeeCaseStatus;
	subjectActorUserId: string | null;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface EmployeeCaseEvent {
	caseId: HumanResourcesEmployeeCaseId;
	createdAt: Date;
	documentRef: string | null;
	eventKind: EmployeeCaseEventKind;
	id: HumanResourcesEmployeeCaseEventId;
	organizationId: string;
	payloadJson: Record<string, unknown> | null;
	recordedAt: Date;
	recordedBy: string;
	redactsEventId: HumanResourcesEmployeeCaseEventId | null;
	sequenceNo: number;
}

export interface EmployeeCaseAction {
	actionType: EmployeeCaseActionType;
	approvedBy: string | null;
	caseId: HumanResourcesEmployeeCaseId;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesEmployeeCaseActionId;
	organizationId: string;
	policyValidationRecorded: boolean;
	recommendationNote: string | null;
	recommendedBy: string;
	status: EmployeeCaseActionStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface EmployeeCaseAppeal {
	appealGroundsSummary: string;
	appealOutcomeCode: string | null;
	caseId: HumanResourcesEmployeeCaseId;
	createdAt: Date;
	createdBy: string;
	id: HumanResourcesEmployeeCaseAppealId;
	organizationId: string;
	originalFindingCode: string;
	originalFindingRecordedAt: Date;
	resolvedAt: Date | null;
	resolvedBy: string | null;
	status: EmployeeCaseAppealStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

/** Case row after ACL field projection (dates as ISO strings). */
export type ProjectedEmployeeCase = {
	[K in keyof EmployeeCase]?: EmployeeCase[K] extends Date
		? string
		: EmployeeCase[K];
};

export interface EmployeeCaseListPage {
	cases: ProjectedEmployeeCase[];
	page: number;
	pageSize: number;
	totalCount: number;
}

export interface EmployeeCaseTimeline {
	caseId: HumanResourcesEmployeeCaseId;
	events: EmployeeCaseEvent[];
}

export interface EmployeeCaseTerminationHandoff {
	actionId: HumanResourcesEmployeeCaseActionId;
	caseId: HumanResourcesEmployeeCaseId;
	employeeId: HumanResourcesEmployeeId;
	employmentId: HumanResourcesEmploymentId;
	organizationId: string;
}

export interface EmployeeCaseOutcome {
	approvedActions: EmployeeCaseAction[];
	caseId: HumanResourcesEmployeeCaseId;
	findingCode: string | null;
	openAppeals: EmployeeCaseAppeal[];
	outcomeCode: string | null;
	status: EmployeeCaseStatus;
	terminationHandoff: EmployeeCaseTerminationHandoff | null;
}

export interface IdempotentEmployeeCaseRecord {
	caseId: HumanResourcesEmployeeCaseId;
	fingerprint: string;
}

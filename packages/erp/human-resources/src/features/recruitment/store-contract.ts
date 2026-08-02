import type { Result } from "@afenda/errors";
import type {
	ApplicationListPage,
	ApplicationStatusHistory,
	Candidate,
	CandidateApplication,
	CandidateDuplicateMatch,
	CandidateListPage,
	EmploymentOffer,
	Interview,
	InterviewEvaluation,
	InterviewListPage,
	InterviewScorecard,
	JobRequisition,
	OfferAcceptanceHandoff,
	OfferListPage,
	RequisitionListPage,
} from "../../kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { MutationPorts } from "../../kernel/execution/ports";
import type {
	HumanResourcesApplicationId,
	HumanResourcesCandidateId,
	HumanResourcesCompensationProposalId,
	HumanResourcesDepartmentId,
	HumanResourcesEmployeeId,
	HumanResourcesInterviewId,
	HumanResourcesJobId,
	HumanResourcesOfferId,
	HumanResourcesPositionId,
	HumanResourcesRequisitionId,
} from "../../kernel/identity/brands";
import type { ApplicationStatusChangeKind } from "./application-history";
import type {
	ApplicationStatus,
	CandidateConsentSource,
	CandidateStatus,
	InterviewEvaluationResult,
	OfferStatus,
	RequisitionStatus,
} from "./status";

/**
 * Persistence contract for Recruitment.
 *
 * This feature owns its narrow persistence contract. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export interface RequisitionCreateRecord {
	code: string;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	departmentId: HumanResourcesDepartmentId | null;
	hiringManagerEmployeeId: HumanResourcesEmployeeId | null;
	jobId: HumanResourcesJobId | null;
	organizationId: string;
	positionId: HumanResourcesPositionId | null;
	title: string;
}

export interface IdempotentRequisitionRecord {
	createRequestFingerprint: string;
	requisition: JobRequisition;
}

export interface CandidateCreateRecord {
	consentCapturedAt: Date;
	consentPolicyVersion: string;
	consentSource: CandidateConsentSource;
	createdBy: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	displayName: string;
	email: string;
	normalizedEmail: string;
	organizationId: string;
	phone: string | null;
	retentionUntil: string;
}

export interface IdempotentCandidateRecord {
	candidate: Candidate;
	createRequestFingerprint: string;
}

export interface IdempotentOfferAcceptRecord {
	acceptRequestFingerprint: string;
	handoff: OfferAcceptanceHandoff;
}

export interface ApplicationCreateRecord {
	candidateId: HumanResourcesCandidateId;
	createdBy: string;
	organizationId: string;
	requisitionId: HumanResourcesRequisitionId;
}

export interface ApplicationStatusHistoryAppendRecord {
	actorUserId: string;
	applicationId: HumanResourcesApplicationId;
	candidateId: HumanResourcesCandidateId;
	changeKind: ApplicationStatusChangeKind;
	correlationId: string;
	fromStatus: ApplicationStatus | null;
	organizationId: string;
	reason: string | null;
	reasonCode: string | null;
	requisitionId: HumanResourcesRequisitionId;
	toStatus: ApplicationStatus;
}

export interface InterviewScheduleRecord {
	applicationId: HumanResourcesApplicationId;
	createdBy: string;
	interviewerActorId: string;
	organizationId: string;
	scheduledAt: string;
}

export interface InterviewEvaluationCreateRecord {
	createdBy: string;
	evaluatorActorId: string;
	expectedVersion: number;
	interviewId: HumanResourcesInterviewId;
	organizationId: string;
	privateNotes: string | null;
	result: InterviewEvaluationResult;
	scorecard: InterviewScorecard;
}

export interface OfferCreateRecord {
	applicationId: HumanResourcesApplicationId;
	compensationProposalId?:
		| HumanResourcesCompensationProposalId
		| null
		| undefined;
	createdBy: string;
	expiresOn: string;
	organizationId: string;
	termsSummary: string;
}

export interface HumanResourcesRecruitmentStore {
	acceptOffer: (
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			idempotencyKey: string;
			acceptRequestFingerprint: string;
			expectedVersion: number;
			actorUserId: string;
			asOfDate: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<OfferAcceptanceHandoff>>;

	amendOfferDraft: (
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			termsSummary?: string | undefined;
			expiresOn?: string | undefined;
			compensationProposalId?:
				| HumanResourcesCompensationProposalId
				| null
				| undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmploymentOffer>>;

	amendRequisition: (
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			title?: string | undefined;
			jobId?: HumanResourcesJobId | null | undefined;
			positionId?: HumanResourcesPositionId | null | undefined;
			departmentId?: HumanResourcesDepartmentId | null | undefined;
			hiringManagerEmployeeId?: HumanResourcesEmployeeId | null | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<JobRequisition>>;

	anonymizeCandidate: (
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			expectedVersion: number;
			actorUserId: string;
			asOf: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Candidate>>;

	appendApplicationStatusHistory: (
		record: ApplicationStatusHistoryAppendRecord,
	) => Promise<Result<ApplicationStatusHistory>>;

	assignHiringManager: (
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			hiringManagerEmployeeId: HumanResourcesEmployeeId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<JobRequisition>>;

	assignInterviewInterviewer: (
		input: {
			organizationId: string;
			interviewId: HumanResourcesInterviewId;
			interviewerActorId: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Interview>>;

	cancelInterview: (
		input: {
			organizationId: string;
			interviewId: HumanResourcesInterviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Interview>>;

	changeCandidateRetention: (
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			retentionUntil: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Candidate>>;

	createApplication: (
		record: ApplicationCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CandidateApplication>>;

	createCandidate: (
		record: CandidateCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Candidate>>;

	createDraftRequisition: (
		record: RequisitionCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<JobRequisition>>;

	createOffer: (
		record: OfferCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmploymentOffer>>;

	detectCandidateDuplicates: (input: {
		organizationId: string;
		email?: string | undefined;
		displayName?: string | undefined;
	}) => Promise<Result<readonly CandidateDuplicateMatch[]>>;

	findActiveApplicationByCandidateRequisition: (input: {
		organizationId: string;
		candidateId: HumanResourcesCandidateId;
		requisitionId: HumanResourcesRequisitionId;
	}) => Promise<Result<CandidateApplication | null>>;

	findActiveOfferByApplication: (input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}) => Promise<Result<EmploymentOffer | null>>;
	// Candidate
	findCandidateByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentCandidateRecord | null>>;

	findCandidateByNormalizedEmail: (input: {
		organizationId: string;
		normalizedEmail: string;
	}) => Promise<Result<Candidate | null>>;

	findOfferByAcceptIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentOfferAcceptRecord | null>>;

	findRequisitionByCode: (input: {
		organizationId: string;
		code: string;
	}) => Promise<Result<JobRequisition | null>>;
	// Requisition
	findRequisitionByIdempotencyKey: (input: {
		organizationId: string;
		idempotencyKey: string;
	}) => Promise<Result<IdempotentRequisitionRecord | null>>;
	// Application
	getApplicationById: (input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}) => Promise<Result<CandidateApplication | null>>;

	getCandidateById: (input: {
		organizationId: string;
		candidateId: HumanResourcesCandidateId;
	}) => Promise<Result<Candidate | null>>;
	// Interview
	getInterviewById: (input: {
		organizationId: string;
		interviewId: HumanResourcesInterviewId;
	}) => Promise<Result<Interview | null>>;
	// Interview evaluation
	getInterviewEvaluationByInterviewId: (input: {
		organizationId: string;
		interviewId: HumanResourcesInterviewId;
	}) => Promise<Result<InterviewEvaluation | null>>;
	// Offer
	getOfferById: (input: {
		organizationId: string;
		offerId: HumanResourcesOfferId;
	}) => Promise<Result<EmploymentOffer | null>>;

	getRequisitionById: (input: {
		organizationId: string;
		requisitionId: HumanResourcesRequisitionId;
	}) => Promise<Result<JobRequisition | null>>;

	listApplicationStatusHistory: (input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}) => Promise<Result<ApplicationStatusHistory[]>>;

	listApplications: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: ApplicationStatus | undefined;
		candidateId?: HumanResourcesCandidateId | undefined;
		requisitionId?: HumanResourcesRequisitionId | undefined;
	}) => Promise<Result<ApplicationListPage>>;

	listCandidates: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CandidateStatus | undefined;
		retentionDueAsOf?: string | undefined;
		query?: string | undefined;
	}) => Promise<Result<CandidateListPage>>;

	listInterviews: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		applicationId?: HumanResourcesApplicationId | undefined;
	}) => Promise<Result<InterviewListPage>>;

	listOffers: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: OfferStatus | undefined;
		applicationId?: HumanResourcesApplicationId | undefined;
	}) => Promise<Result<OfferListPage>>;

	listRequisitions: (input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: RequisitionStatus | undefined;
	}) => Promise<Result<RequisitionListPage>>;

	recordInterviewEvaluation: (
		record: InterviewEvaluationCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<InterviewEvaluation>>;

	reopenApplication: (
		input: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
			expectedVersion: number;
			actorUserId: string;
			reason?: string | null | undefined;
			reasonCode?: string | null | undefined;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CandidateApplication>>;

	scheduleInterview: (
		record: InterviewScheduleRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Interview>>;

	transitionApplicationStatus: (
		input: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
			status: ApplicationStatus;
			expectedVersion: number;
			actorUserId: string;
			reason?: string | null | undefined;
			reasonCode?: string | null | undefined;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<CandidateApplication>>;

	transitionOfferStatus: (
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			status: OfferStatus;
			expectedVersion: number;
			actorUserId: string;
			asOfDate?: string | undefined;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<EmploymentOffer>>;

	transitionRequisitionStatus: (
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			status: RequisitionStatus;
			expectedVersion: number;
			actorUserId: string;
			emitApprovedEvent?: boolean | undefined;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<JobRequisition>>;

	updateCandidateProfile: (
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			displayName?: string | undefined;
			phone?: string | null | undefined;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Candidate>>;

	withdrawCandidateConsent: (
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	) => Promise<Result<Candidate>>;
}

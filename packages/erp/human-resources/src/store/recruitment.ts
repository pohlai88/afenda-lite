import type { Result } from "@afenda/errors/result";
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
} from "../brands";
import type { MutationPorts } from "../ports";
import type { ApplicationStatusChangeKind } from "../shared/application-history";
import type { HumanResourcesMutationMeta } from "../shared/mutation-meta";
import type {
	ApplicationStatus,
	CandidateConsentSource,
	CandidateStatus,
	InterviewEvaluationResult,
	OfferStatus,
	RequisitionStatus,
} from "../shared/recruitment-status";
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
} from "../types";

/**
 * Persistence contract for Recruitment.
 *
 * This is a domain slice of `HumanResourcesStore`. Keep persistence behavior
 * here; cross-domain orchestration belongs in application commands/services.
 */
export type RequisitionCreateRecord = {
	organizationId: string;
	code: string;
	title: string;
	jobId: HumanResourcesJobId | null;
	positionId: HumanResourcesPositionId | null;
	departmentId: HumanResourcesDepartmentId | null;
	hiringManagerEmployeeId: HumanResourcesEmployeeId | null;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentRequisitionRecord = {
	requisition: JobRequisition;
	createRequestFingerprint: string;
};

export type CandidateCreateRecord = {
	organizationId: string;
	displayName: string;
	email: string;
	normalizedEmail: string;
	phone: string | null;
	consentPolicyVersion: string;
	consentCapturedAt: Date;
	consentSource: CandidateConsentSource;
	retentionUntil: string;
	createIdempotencyKey: string;
	createRequestFingerprint: string;
	createdBy: string;
};

export type IdempotentCandidateRecord = {
	candidate: Candidate;
	createRequestFingerprint: string;
};

export type IdempotentOfferAcceptRecord = {
	handoff: OfferAcceptanceHandoff;
	acceptRequestFingerprint: string;
};

export type ApplicationCreateRecord = {
	organizationId: string;
	candidateId: HumanResourcesCandidateId;
	requisitionId: HumanResourcesRequisitionId;
	createdBy: string;
};

export type ApplicationStatusHistoryAppendRecord = {
	organizationId: string;
	applicationId: HumanResourcesApplicationId;
	candidateId: HumanResourcesCandidateId;
	requisitionId: HumanResourcesRequisitionId;
	fromStatus: ApplicationStatus | null;
	toStatus: ApplicationStatus;
	changeKind: ApplicationStatusChangeKind;
	reason: string | null;
	reasonCode: string | null;
	correlationId: string;
	actorUserId: string;
};

export type InterviewScheduleRecord = {
	organizationId: string;
	applicationId: HumanResourcesApplicationId;
	scheduledAt: string;
	interviewerActorId: string;
	createdBy: string;
};

export type InterviewEvaluationCreateRecord = {
	organizationId: string;
	interviewId: HumanResourcesInterviewId;
	result: InterviewEvaluationResult;
	scorecard: InterviewScorecard;
	privateNotes: string | null;
	evaluatorActorId: string;
	expectedVersion: number;
	createdBy: string;
};

export type OfferCreateRecord = {
	organizationId: string;
	applicationId: HumanResourcesApplicationId;
	termsSummary: string;
	expiresOn: string;
	compensationProposalId?: HumanResourcesCompensationProposalId | null;
	createdBy: string;
};

export type HumanResourcesRecruitmentStore = {
	// Requisition
	findRequisitionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentRequisitionRecord | null>>;

	getRequisitionById(input: {
		organizationId: string;
		requisitionId: HumanResourcesRequisitionId;
	}): Promise<Result<JobRequisition | null>>;

	findRequisitionByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<JobRequisition | null>>;

	createDraftRequisition(
		record: RequisitionCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<JobRequisition>>;

	amendRequisition(
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			title?: string;
			jobId?: HumanResourcesJobId | null;
			positionId?: HumanResourcesPositionId | null;
			departmentId?: HumanResourcesDepartmentId | null;
			hiringManagerEmployeeId?: HumanResourcesEmployeeId | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<JobRequisition>>;

	assignHiringManager(
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			hiringManagerEmployeeId: HumanResourcesEmployeeId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<JobRequisition>>;

	transitionRequisitionStatus(
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			status: RequisitionStatus;
			expectedVersion: number;
			actorUserId: string;
			emitApprovedEvent?: boolean;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<JobRequisition>>;

	listRequisitions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: RequisitionStatus;
	}): Promise<Result<RequisitionListPage>>;
	// Candidate
	findCandidateByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCandidateRecord | null>>;

	getCandidateById(input: {
		organizationId: string;
		candidateId: HumanResourcesCandidateId;
	}): Promise<Result<Candidate | null>>;

	findCandidateByNormalizedEmail(input: {
		organizationId: string;
		normalizedEmail: string;
	}): Promise<Result<Candidate | null>>;

	createCandidate(
		record: CandidateCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Candidate>>;

	updateCandidateProfile(
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			displayName?: string;
			phone?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Candidate>>;

	withdrawCandidateConsent(
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Candidate>>;

	changeCandidateRetention(
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			retentionUntil: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Candidate>>;

	anonymizeCandidate(
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			expectedVersion: number;
			actorUserId: string;
			asOf: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Candidate>>;

	listCandidates(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CandidateStatus;
		retentionDueAsOf?: string;
		query?: string;
	}): Promise<Result<CandidateListPage>>;

	detectCandidateDuplicates(input: {
		organizationId: string;
		email?: string;
		displayName?: string;
	}): Promise<Result<readonly CandidateDuplicateMatch[]>>;
	// Application
	getApplicationById(input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}): Promise<Result<CandidateApplication | null>>;

	findActiveApplicationByCandidateRequisition(input: {
		organizationId: string;
		candidateId: HumanResourcesCandidateId;
		requisitionId: HumanResourcesRequisitionId;
	}): Promise<Result<CandidateApplication | null>>;

	createApplication(
		record: ApplicationCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CandidateApplication>>;

	transitionApplicationStatus(
		input: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
			status: ApplicationStatus;
			expectedVersion: number;
			actorUserId: string;
			reason?: string | null;
			reasonCode?: string | null;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CandidateApplication>>;

	reopenApplication(
		input: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
			expectedVersion: number;
			actorUserId: string;
			reason?: string | null;
			reasonCode?: string | null;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CandidateApplication>>;

	listApplicationStatusHistory(input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}): Promise<Result<ApplicationStatusHistory[]>>;

	appendApplicationStatusHistory(
		record: ApplicationStatusHistoryAppendRecord,
	): Promise<Result<ApplicationStatusHistory>>;

	listApplications(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: ApplicationStatus;
		candidateId?: HumanResourcesCandidateId;
		requisitionId?: HumanResourcesRequisitionId;
	}): Promise<Result<ApplicationListPage>>;
	// Interview
	getInterviewById(input: {
		organizationId: string;
		interviewId: HumanResourcesInterviewId;
	}): Promise<Result<Interview | null>>;

	scheduleInterview(
		record: InterviewScheduleRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Interview>>;

	cancelInterview(
		input: {
			organizationId: string;
			interviewId: HumanResourcesInterviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Interview>>;

	assignInterviewInterviewer(
		input: {
			organizationId: string;
			interviewId: HumanResourcesInterviewId;
			interviewerActorId: string;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Interview>>;

	listInterviews(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		applicationId?: HumanResourcesApplicationId;
	}): Promise<Result<InterviewListPage>>;
	// Interview evaluation
	getInterviewEvaluationByInterviewId(input: {
		organizationId: string;
		interviewId: HumanResourcesInterviewId;
	}): Promise<Result<InterviewEvaluation | null>>;

	recordInterviewEvaluation(
		record: InterviewEvaluationCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<InterviewEvaluation>>;
	// Offer
	getOfferById(input: {
		organizationId: string;
		offerId: HumanResourcesOfferId;
	}): Promise<Result<EmploymentOffer | null>>;

	findActiveOfferByApplication(input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}): Promise<Result<EmploymentOffer | null>>;

	findOfferByAcceptIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentOfferAcceptRecord | null>>;

	createOffer(
		record: OfferCreateRecord,
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmploymentOffer>>;

	amendOfferDraft(
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			termsSummary?: string;
			expiresOn?: string;
			compensationProposalId?: HumanResourcesCompensationProposalId | null;
			expectedVersion: number;
			actorUserId: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmploymentOffer>>;

	transitionOfferStatus(
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			status: OfferStatus;
			expectedVersion: number;
			actorUserId: string;
			asOfDate?: string;
		},
		ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmploymentOffer>>;

	acceptOffer(
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
	): Promise<Result<OfferAcceptanceHandoff>>;

	listOffers(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: OfferStatus;
		applicationId?: HumanResourcesApplicationId;
	}): Promise<Result<OfferListPage>>;
};

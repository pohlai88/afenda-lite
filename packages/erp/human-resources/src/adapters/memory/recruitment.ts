import { randomUUID } from "node:crypto";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	type HumanResourcesApplicationId,
	type HumanResourcesCandidateId,
	type HumanResourcesCompensationProposalId,
	type HumanResourcesDepartmentId,
	type HumanResourcesEmployeeId,
	type HumanResourcesInterviewEvaluationId,
	type HumanResourcesInterviewId,
	type HumanResourcesJobId,
	type HumanResourcesOfferId,
	type HumanResourcesPositionId,
	type HumanResourcesRequisitionId,
	parseHumanResourcesApplicationId,
	parseHumanResourcesCandidateId,
	parseHumanResourcesInterviewEvaluationId,
	parseHumanResourcesInterviewId,
	parseHumanResourcesOfferId,
	parseHumanResourcesRequisitionId,
} from "../../brands";
import { appendRegistryGatedOutbox } from "../../emissions/sql-side-effects";
import {
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	humanResourcesErrorDetails,
} from "../../error-codes";
import { HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE } from "../../module-ids";
import type { MutationPorts } from "../../ports";
import type { ApplicationStatusHistory } from "../../shared/application-history";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidState, notFound } from "../../shared/domain-guards";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import {
	ANONYMIZED_CANDIDATE_DISPLAY_NAME,
	anonymizedCandidateEmail,
	assertApplicationEligibleForOffer,
	assertApplicationReopenable,
	assertApplicationStatusTransition,
	assertCandidateActive,
	assertCandidateAnonymizationEligible,
	assertCandidateNotAnonymized,
	assertInterviewInterviewerAssignable,
	assertInterviewSchedulable,
	assertInterviewStatusTransition,
	assertOfferAcceptable,
	assertOfferAmendable,
	assertOfferProposalMutable,
	assertOfferReadyForApproval,
	assertOfferStatusTransition,
	assertRequisitionAmendable,
	assertRequisitionHiringManagerAssignable,
	assertRequisitionOpenForApplication,
	assertRequisitionStatusTransition,
	normalizeCandidateEmail,
} from "../../shared/recruitment-guards";
import {
	type ApplicationStatus,
	type CandidateStatus,
	isApplicationTerminal,
	isOfferActive,
	type OfferStatus,
	type RequisitionStatus,
} from "../../shared/recruitment-status";
import { runSequential, sequentialReturn } from "../../shared/run-sequential";
import { validateOfferCompensationProposalAttachment } from "../../shared/validate-offer-compensation-proposal-attachment";
import type {
	ApplicationCreateRecord,
	ApplicationStatusHistoryAppendRecord,
	CandidateCreateRecord,
	HumanResourcesStore,
	IdempotentCandidateRecord,
	IdempotentOfferAcceptRecord,
	IdempotentRequisitionRecord,
	InterviewEvaluationCreateRecord,
	InterviewScheduleRecord,
	OfferCreateRecord,
	RequisitionCreateRecord,
} from "../../store";
import type {
	ApplicationListPage,
	Candidate,
	CandidateApplication,
	CandidateDuplicateMatch,
	CandidateDuplicateMatchReason,
	CandidateListPage,
	EmploymentOffer,
	Interview,
	InterviewEvaluation,
	InterviewListPage,
	JobRequisition,
	OfferAcceptanceHandoff,
	OfferListPage,
	RequisitionListPage,
} from "../../types";
import { idempotencyMapKey } from "./shared";

function assertRecruitmentOrgMatch(
	entity: { organizationId: string },
	organizationId: string,
	label: string,
): Result<void> {
	if (entity.organizationId !== organizationId) {
		return notFound(`${label} not found`);
	}
	return ok(undefined);
}

function cloneRequisition(requisition: JobRequisition): JobRequisition {
	return { ...requisition };
}

function cloneCandidate(candidate: Candidate): Candidate {
	return { ...candidate };
}

function cloneApplication(
	application: CandidateApplication,
): CandidateApplication {
	return { ...application };
}

function cloneInterview(interview: Interview): Interview {
	return { ...interview };
}

function cloneEvaluation(evaluation: InterviewEvaluation): InterviewEvaluation {
	return {
		...evaluation,
		scorecard: {
			criteria: evaluation.scorecard.criteria.map((criterion) => ({
				...criterion,
			})),
		},
	};
}

function cloneOffer(offer: EmploymentOffer): EmploymentOffer {
	return { ...offer };
}

function cloneHandoff(handoff: OfferAcceptanceHandoff): OfferAcceptanceHandoff {
	return {
		...handoff,
		acceptedAt: new Date(handoff.acceptedAt),
		offer: cloneOffer(handoff.offer),
	};
}

async function validateRequisitionReferences(
	this: RecruitmentMemoryHost & MemoryRecruitmentMethods,
	input: {
		organizationId: string;
		jobId: HumanResourcesJobId | null;
		positionId: HumanResourcesPositionId | null;
		departmentId: HumanResourcesDepartmentId | null;
	},
): Promise<Result<void>> {
	if (input.jobId !== null) {
		const job = await this.getJobById({
			organizationId: input.organizationId,
			jobId: input.jobId,
		});
		if (!job.ok) {
			return job;
		}
		if (job.data === null) {
			return notFound(
				"Job not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
	}
	if (input.positionId !== null) {
		const position = await this.getPositionById({
			organizationId: input.organizationId,
			positionId: input.positionId,
		});
		if (!position.ok) {
			return position;
		}
		if (position.data === null) {
			return notFound(
				"Position not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
	}
	if (input.departmentId !== null) {
		const department = await this.getDepartmentById({
			organizationId: input.organizationId,
			departmentId: input.departmentId,
		});
		if (!department.ok) {
			return department;
		}
		if (department.data === null) {
			return notFound(
				"Department not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
	}
	return ok(undefined);
}

function appendApplicationHistoryToState(
	state: RecruitmentMemoryState,
	record: ApplicationStatusHistoryAppendRecord,
): ApplicationStatusHistory {
	const row: ApplicationStatusHistory = {
		id: randomUUID(),
		organizationId: record.organizationId,
		applicationId: record.applicationId,
		candidateId: record.candidateId,
		requisitionId: record.requisitionId,
		fromStatus: record.fromStatus,
		toStatus: record.toStatus,
		changeKind: record.changeKind,
		reason: record.reason,
		reasonCode: record.reasonCode,
		correlationId: record.correlationId,
		actorUserId: record.actorUserId,
		createdAt: new Date(),
	};
	state.applicationStatusHistory.set(row.id, row);
	return { ...row };
}

export interface RecruitmentMemoryState {
	applicationStatusHistory: Map<string, ApplicationStatusHistory>;
	applications: Map<HumanResourcesApplicationId, CandidateApplication>;
	candidateByNormalizedEmail: Map<string, string>;
	candidateIdempotencyByKey: Map<string, IdempotentCandidateRecord>;
	candidates: Map<HumanResourcesCandidateId, Candidate>;
	interviewEvaluationByInterviewId: Map<string, string>;
	interviewEvaluations: Map<
		HumanResourcesInterviewEvaluationId,
		InterviewEvaluation
	>;
	interviews: Map<HumanResourcesInterviewId, Interview>;
	offerAcceptIdempotencyByKey: Map<string, IdempotentOfferAcceptRecord>;
	offers: Map<HumanResourcesOfferId, EmploymentOffer>;
	requisitionIdempotencyByKey: Map<string, IdempotentRequisitionRecord>;
	requisitions: Map<HumanResourcesRequisitionId, JobRequisition>;
}

function resolveRequisitionAmendmentValues(
	requisition: JobRequisition,
	input: {
		title?: string | undefined;
		jobId?: HumanResourcesJobId | null | undefined;
		positionId?: HumanResourcesPositionId | null | undefined;
		departmentId?: HumanResourcesDepartmentId | null | undefined;
		hiringManagerEmployeeId?: HumanResourcesEmployeeId | null | undefined;
	},
) {
	return {
		title: input.title === undefined ? requisition.title : input.title,
		jobId: input.jobId === undefined ? requisition.jobId : input.jobId,
		positionId:
			input.positionId === undefined
				? requisition.positionId
				: input.positionId,
		departmentId:
			input.departmentId === undefined
				? requisition.departmentId
				: input.departmentId,
		hiringManagerEmployeeId:
			input.hiringManagerEmployeeId === undefined
				? requisition.hiringManagerEmployeeId
				: input.hiringManagerEmployeeId,
	};
}

function resolveApplicationReferences(
	state: RecruitmentMemoryState,
	record: ApplicationCreateRecord,
): Result<{ candidate: Candidate; requisition: JobRequisition }> {
	const candidate = state.candidates.get(record.candidateId);
	if (candidate === undefined) {
		return notFound("Candidate not found");
	}
	const candidateOrg = assertRecruitmentOrgMatch(
		candidate,
		record.organizationId,
		"Candidate",
	);
	if (!candidateOrg.ok) {
		return candidateOrg;
	}
	const activeCandidate = assertCandidateActive(candidate.status);
	if (!activeCandidate.ok) {
		return activeCandidate;
	}
	const requisition = state.requisitions.get(record.requisitionId);
	if (requisition === undefined) {
		return notFound("Requisition not found");
	}
	const requisitionOrg = assertRecruitmentOrgMatch(
		requisition,
		record.organizationId,
		"Requisition",
	);
	if (!requisitionOrg.ok) {
		return requisitionOrg;
	}
	const openRequisition = assertRequisitionOpenForApplication(
		requisition.status,
	);
	return openRequisition.ok ? ok({ candidate, requisition }) : openRequisition;
}

export type MemoryRecruitmentMethods = Pick<
	HumanResourcesStore,
	| "findRequisitionByIdempotencyKey"
	| "getRequisitionById"
	| "findRequisitionByCode"
	| "createDraftRequisition"
	| "amendRequisition"
	| "assignHiringManager"
	| "transitionRequisitionStatus"
	| "listRequisitions"
	| "findCandidateByIdempotencyKey"
	| "getCandidateById"
	| "findCandidateByNormalizedEmail"
	| "createCandidate"
	| "updateCandidateProfile"
	| "withdrawCandidateConsent"
	| "changeCandidateRetention"
	| "anonymizeCandidate"
	| "listCandidates"
	| "detectCandidateDuplicates"
	| "getApplicationById"
	| "findActiveApplicationByCandidateRequisition"
	| "createApplication"
	| "transitionApplicationStatus"
	| "reopenApplication"
	| "listApplicationStatusHistory"
	| "appendApplicationStatusHistory"
	| "listApplications"
	| "getInterviewById"
	| "scheduleInterview"
	| "cancelInterview"
	| "assignInterviewInterviewer"
	| "listInterviews"
	| "getInterviewEvaluationByInterviewId"
	| "recordInterviewEvaluation"
	| "getOfferById"
	| "findActiveOfferByApplication"
	| "findOfferByAcceptIdempotencyKey"
	| "createOffer"
	| "amendOfferDraft"
	| "transitionOfferStatus"
	| "acceptOffer"
	| "listOffers"
>;

export type RecruitmentMemoryHost = Pick<
	HumanResourcesStore,
	| "getDepartmentById"
	| "getJobById"
	| "getPositionById"
	| "getCompensationProposal"
	| "releaseActiveHeadcountReservationsForRequisition"
	| "consumeActiveHeadcountReservationForRequisition"
>;

export function createRecruitmentMemoryState(): RecruitmentMemoryState {
	return {
		requisitions: new Map(),
		requisitionIdempotencyByKey: new Map(),
		candidates: new Map(),
		candidateIdempotencyByKey: new Map(),
		candidateByNormalizedEmail: new Map(),
		applications: new Map(),
		applicationStatusHistory: new Map(),
		interviews: new Map(),
		interviewEvaluations: new Map(),
		interviewEvaluationByInterviewId: new Map(),
		offers: new Map(),
		offerAcceptIdempotencyByKey: new Map(),
	};
}

export function resetRecruitmentMemoryState(
	state: RecruitmentMemoryState,
): void {
	state.requisitions.clear();
	state.requisitionIdempotencyByKey.clear();
	state.candidates.clear();
	state.candidateIdempotencyByKey.clear();
	state.candidateByNormalizedEmail.clear();
	state.applications.clear();
	state.applicationStatusHistory.clear();
	state.interviews.clear();
	state.interviewEvaluations.clear();
	state.interviewEvaluationByInterviewId.clear();
	state.offers.clear();
	state.offerAcceptIdempotencyByKey.clear();
}

export function createMemoryRecruitmentMethods(
	state: RecruitmentMemoryState,
): MemoryRecruitmentMethods &
	ThisType<RecruitmentMemoryHost & MemoryRecruitmentMethods> {
	return {
		async findRequisitionByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentRequisitionRecord | null>> {
			const record = state.requisitionIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return await ok(null);
			}
			return await ok({
				requisition: cloneRequisition(record.requisition),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async getRequisitionById(input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
		}): Promise<Result<JobRequisition | null>> {
			const requisition = state.requisitions.get(input.requisitionId);
			if (requisition === undefined) {
				return await ok(null);
			}
			const orgCheck = assertRecruitmentOrgMatch(
				requisition,
				input.organizationId,
				"Requisition",
			);
			if (!orgCheck.ok) {
				return await notFound("Requisition not found");
			}
			return await ok(cloneRequisition(requisition));
		},

		async findRequisitionByCode(input: {
			organizationId: string;
			code: string;
		}): Promise<Result<JobRequisition | null>> {
			const sequentialOutcome1 = await runSequential(
				state.requisitions.values(),
				async (requisition) => {
					if (
						requisition.organizationId === input.organizationId &&
						requisition.code === input.code
					) {
						return sequentialReturn(await ok(cloneRequisition(requisition)));
					}
				},
			);
			if (sequentialOutcome1.kind === "return") {
				return sequentialOutcome1.value;
			}
			return await ok(null);
		},

		async createDraftRequisition(
			record: RequisitionCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<JobRequisition>> {
			const existingByKey = await this.findRequisitionByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.createIdempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				return ok(cloneRequisition(existingByKey.data.requisition));
			}

			const existingByCode = await this.findRequisitionByCode({
				organizationId: record.organizationId,
				code: record.code,
			});
			if (!existingByCode.ok) {
				return existingByCode;
			}
			if (existingByCode.data !== null) {
				return fail(
					"CONFLICT",
					"Requisition with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
				);
			}

			const refs = await validateRequisitionReferences.call(this, {
				organizationId: record.organizationId,
				jobId: record.jobId,
				positionId: record.positionId,
				departmentId: record.departmentId,
			});
			if (!refs.ok) {
				return refs;
			}

			const idResult = parseHumanResourcesRequisitionId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const requisition: JobRequisition = {
				id: idResult.data,
				organizationId: record.organizationId,
				code: record.code,
				title: record.title,
				status: "draft",
				jobId: record.jobId,
				positionId: record.positionId,
				departmentId: record.departmentId,
				hiringManagerEmployeeId: record.hiringManagerEmployeeId,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.requisitions.set(requisition.id, requisition);
			state.requisitionIdempotencyByKey.set(
				idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				{
					requisition: cloneRequisition(requisition),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await ports.audit.record({
				organizationId: requisition.organizationId,
				actorUserId: requisition.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_job_requisition",
				entityId: requisition.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.requisitions.delete(requisition.id);
				state.requisitionIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return audit;
			}

			return ok(cloneRequisition(requisition));
		},

		async amendRequisition(
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
		): Promise<Result<JobRequisition>> {
			const requisition = state.requisitions.get(input.requisitionId);
			if (requisition === undefined) {
				return notFound("Requisition not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				requisition,
				input.organizationId,
				"Requisition",
			);
			if (!orgCheck.ok) {
				return notFound("Requisition not found");
			}

			const versionCheck = assertExpectedVersion(
				requisition.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const amendable = assertRequisitionAmendable(requisition.status);
			if (!amendable.ok) {
				return amendable;
			}

			const amendments = resolveRequisitionAmendmentValues(requisition, input);

			const refs = await validateRequisitionReferences.call(this, {
				organizationId: input.organizationId,
				jobId: amendments.jobId,
				positionId: amendments.positionId,
				departmentId: amendments.departmentId,
			});
			if (!refs.ok) {
				return refs;
			}

			const now = new Date();
			const updated: JobRequisition = {
				...requisition,
				title: amendments.title,
				jobId: amendments.jobId,
				positionId: amendments.positionId,
				departmentId: amendments.departmentId,
				hiringManagerEmployeeId: amendments.hiringManagerEmployeeId,
				version: requisition.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.requisitions.set(input.requisitionId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_job_requisition",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.requisitions.set(input.requisitionId, requisition);
				return audit;
			}

			return ok(cloneRequisition(updated));
		},

		async assignHiringManager(
			input: {
				organizationId: string;
				requisitionId: HumanResourcesRequisitionId;
				hiringManagerEmployeeId: HumanResourcesEmployeeId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<JobRequisition>> {
			const requisition = state.requisitions.get(input.requisitionId);
			if (requisition === undefined) {
				return notFound("Requisition not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				requisition,
				input.organizationId,
				"Requisition",
			);
			if (!orgCheck.ok) {
				return notFound("Requisition not found");
			}

			const versionCheck = assertExpectedVersion(
				requisition.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const assignable = assertRequisitionHiringManagerAssignable(
				requisition.status,
			);
			if (!assignable.ok) {
				return assignable;
			}

			const now = new Date();
			const updated: JobRequisition = {
				...requisition,
				hiringManagerEmployeeId: input.hiringManagerEmployeeId,
				version: requisition.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.requisitions.set(input.requisitionId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_job_requisition",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.requisitions.set(input.requisitionId, requisition);
				return audit;
			}

			return ok(cloneRequisition(updated));
		},

		async transitionRequisitionStatus(
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
		): Promise<Result<JobRequisition>> {
			const requisition = state.requisitions.get(input.requisitionId);
			if (requisition === undefined) {
				return notFound("Requisition not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				requisition,
				input.organizationId,
				"Requisition",
			);
			if (!orgCheck.ok) {
				return notFound("Requisition not found");
			}

			const versionCheck = assertExpectedVersion(
				requisition.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const transition = assertRequisitionStatusTransition(
				requisition.status,
				input.status,
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const updated: JobRequisition = {
				...requisition,
				status: input.status,
				version: requisition.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.requisitions.set(input.requisitionId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_job_requisition",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.requisitions.set(input.requisitionId, requisition);
				return audit;
			}

			const outbox = await appendRegistryGatedOutbox(ports, {
				commandId: meta.operationId,
				meta,
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				aggregateId: updated.id,
				eventEntityType: "hr_job_requisition",
				conditionalEventSuppressed:
					meta.operationId === HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE &&
					!(input.status === "approved" && input.emitApprovedEvent === true),
			});
			if (!outbox.ok) {
				state.requisitions.set(input.requisitionId, requisition);
				return outbox;
			}

			if (input.status === "cancelled" || input.status === "closed") {
				const released =
					await this.releaseActiveHeadcountReservationsForRequisition(
						{
							organizationId: input.organizationId,
							requisitionId: input.requisitionId,
							actorUserId: input.actorUserId,
						},
						ports,
						meta,
					);
				if (!released.ok) {
					state.requisitions.set(input.requisitionId, requisition);
					return released;
				}
			}

			return ok(cloneRequisition(updated));
		},

		async listRequisitions(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: RequisitionStatus | undefined;
		}): Promise<Result<RequisitionListPage>> {
			let filtered = Array.from(state.requisitions.values()).filter(
				(r) => r.organizationId === input.organizationId,
			);
			if (input.status !== undefined) {
				filtered = filtered.filter((r) => r.status === input.status);
			}
			filtered.sort((a, b) => a.code.localeCompare(b.code));
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const requisitions = filtered
				.slice(start, start + input.pageSize)
				.map((r) => cloneRequisition(r));
			return await ok({
				requisitions,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// Candidate methods
		async findCandidateByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentCandidateRecord | null>> {
			const record = state.candidateIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return await ok(null);
			}
			return await ok({
				candidate: cloneCandidate(record.candidate),
				createRequestFingerprint: record.createRequestFingerprint,
			});
		},

		async getCandidateById(input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
		}): Promise<Result<Candidate | null>> {
			const candidate = state.candidates.get(input.candidateId);
			if (candidate === undefined) {
				return await ok(null);
			}
			const orgCheck = assertRecruitmentOrgMatch(
				candidate,
				input.organizationId,
				"Candidate",
			);
			if (!orgCheck.ok) {
				return await notFound("Candidate not found");
			}
			return await ok(cloneCandidate(candidate));
		},

		async findCandidateByNormalizedEmail(input: {
			organizationId: string;
			normalizedEmail: string;
		}): Promise<Result<Candidate | null>> {
			const candidateId = state.candidateByNormalizedEmail.get(
				`${input.organizationId}:${input.normalizedEmail}`,
			);
			if (candidateId === undefined) {
				return await ok(null);
			}
			const candidate = state.candidates.get(
				candidateId as HumanResourcesCandidateId,
			);
			if (candidate === undefined) {
				return await ok(null);
			}
			return await ok(cloneCandidate(candidate));
		},

		async createCandidate(
			record: CandidateCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Candidate>> {
			const existingByKey = await this.findCandidateByIdempotencyKey({
				organizationId: record.organizationId,
				idempotencyKey: record.createIdempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				return ok(cloneCandidate(existingByKey.data.candidate));
			}

			const existingByEmail = await this.findCandidateByNormalizedEmail({
				organizationId: record.organizationId,
				normalizedEmail: record.normalizedEmail,
			});
			if (!existingByEmail.ok) {
				return existingByEmail;
			}
			if (existingByEmail.data !== null) {
				return fail(
					"CONFLICT",
					"Candidate with this email already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
				);
			}

			const idResult = parseHumanResourcesCandidateId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const candidate: Candidate = {
				id: idResult.data,
				organizationId: record.organizationId,
				displayName: record.displayName,
				email: record.email,
				phone: record.phone,
				consentPolicyVersion: record.consentPolicyVersion,
				consentCapturedAt: record.consentCapturedAt,
				consentSource: record.consentSource,
				retentionUntil: record.retentionUntil,
				consentWithdrawnAt: null,
				status: "active",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.candidates.set(candidate.id, candidate);
			state.candidateByNormalizedEmail.set(
				`${record.organizationId}:${record.normalizedEmail}`,
				candidate.id,
			);
			state.candidateIdempotencyByKey.set(
				idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				{
					candidate: cloneCandidate(candidate),
					createRequestFingerprint: record.createRequestFingerprint,
				},
			);

			const audit = await ports.audit.record({
				organizationId: candidate.organizationId,
				actorUserId: candidate.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_candidate",
				entityId: candidate.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.candidates.delete(candidate.id);
				state.candidateByNormalizedEmail.delete(
					`${record.organizationId}:${record.normalizedEmail}`,
				);
				state.candidateIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return audit;
			}

			const outbox = await appendRegistryGatedOutbox(ports, {
				commandId: meta.operationId,
				meta,
				organizationId: candidate.organizationId,
				actorUserId: candidate.createdBy,
				aggregateId: candidate.id,
				eventEntityType: "hr_candidate",
			});
			if (!outbox.ok) {
				state.candidates.delete(candidate.id);
				state.candidateByNormalizedEmail.delete(
					`${record.organizationId}:${record.normalizedEmail}`,
				);
				state.candidateIdempotencyByKey.delete(
					idempotencyMapKey(record.organizationId, record.createIdempotencyKey),
				);
				return outbox;
			}

			return ok(cloneCandidate(candidate));
		},

		async updateCandidateProfile(
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
		): Promise<Result<Candidate>> {
			const candidate = state.candidates.get(input.candidateId);
			if (candidate === undefined) {
				return notFound("Candidate not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				candidate,
				input.organizationId,
				"Candidate",
			);
			if (!orgCheck.ok) {
				return orgCheck;
			}

			const versionCheck = assertExpectedVersion(
				candidate.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const notAnonymized = assertCandidateNotAnonymized(candidate.status);
			if (!notAnonymized.ok) {
				return notAnonymized;
			}

			const now = new Date();
			const updated: Candidate = {
				...candidate,
				displayName:
					input.displayName === undefined
						? candidate.displayName
						: input.displayName,
				phone: input.phone === undefined ? candidate.phone : input.phone,
				version: candidate.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.candidates.set(input.candidateId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_candidate",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.candidates.set(input.candidateId, candidate);
				return audit;
			}

			return ok(cloneCandidate(updated));
		},

		async withdrawCandidateConsent(
			input: {
				organizationId: string;
				candidateId: HumanResourcesCandidateId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Candidate>> {
			const candidate = state.candidates.get(input.candidateId);
			if (candidate === undefined) {
				return notFound("Candidate not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				candidate,
				input.organizationId,
				"Candidate",
			);
			if (!orgCheck.ok) {
				return orgCheck;
			}

			const versionCheck = assertExpectedVersion(
				candidate.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const notAnonymized = assertCandidateNotAnonymized(candidate.status);
			if (!notAnonymized.ok) {
				return notAnonymized;
			}

			if (candidate.consentWithdrawnAt !== null) {
				return conflict("Candidate consent has already been withdrawn");
			}

			const now = new Date();
			const updated: Candidate = {
				...candidate,
				consentWithdrawnAt: now,
				version: candidate.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.candidates.set(input.candidateId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_candidate",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.candidates.set(input.candidateId, candidate);
				return audit;
			}

			const outbox = await appendRegistryGatedOutbox(ports, {
				commandId: meta.operationId,
				meta,
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				aggregateId: updated.id,
				eventEntityType: "hr_candidate",
			});
			if (!outbox.ok) {
				state.candidates.set(input.candidateId, candidate);
				return outbox;
			}

			return ok(cloneCandidate(updated));
		},

		async changeCandidateRetention(
			input: {
				organizationId: string;
				candidateId: HumanResourcesCandidateId;
				retentionUntil: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Candidate>> {
			const candidate = state.candidates.get(input.candidateId);
			if (candidate === undefined) {
				return notFound("Candidate not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				candidate,
				input.organizationId,
				"Candidate",
			);
			if (!orgCheck.ok) {
				return orgCheck;
			}

			const versionCheck = assertExpectedVersion(
				candidate.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const notAnonymized = assertCandidateNotAnonymized(candidate.status);
			if (!notAnonymized.ok) {
				return notAnonymized;
			}

			if (candidate.consentWithdrawnAt !== null) {
				return invalidState(
					"Cannot change retention after candidate consent withdrawal",
				);
			}

			const now = new Date();
			const updated: Candidate = {
				...candidate,
				retentionUntil: input.retentionUntil,
				version: candidate.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.candidates.set(input.candidateId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_candidate",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.candidates.set(input.candidateId, candidate);
				return audit;
			}

			const outbox = await appendRegistryGatedOutbox(ports, {
				commandId: meta.operationId,
				meta,
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				aggregateId: updated.id,
				eventEntityType: "hr_candidate",
			});
			if (!outbox.ok) {
				state.candidates.set(input.candidateId, candidate);
				return outbox;
			}

			return ok(cloneCandidate(updated));
		},

		async anonymizeCandidate(
			input: {
				organizationId: string;
				candidateId: HumanResourcesCandidateId;
				expectedVersion: number;
				actorUserId: string;
				asOf: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Candidate>> {
			const candidate = state.candidates.get(input.candidateId);
			if (candidate === undefined) {
				return notFound("Candidate not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				candidate,
				input.organizationId,
				"Candidate",
			);
			if (!orgCheck.ok) {
				return orgCheck;
			}

			const versionCheck = assertExpectedVersion(
				candidate.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const eligible = assertCandidateAnonymizationEligible({
				status: candidate.status,
				consentWithdrawnAt: candidate.consentWithdrawnAt,
				retentionUntil: candidate.retentionUntil,
				asOf: input.asOf,
			});
			if (!eligible.ok) {
				return eligible;
			}

			const previousNormalizedEmail = normalizeCandidateEmail(candidate.email);
			const scrubbedEmail = anonymizedCandidateEmail(candidate.id);
			const scrubbedNormalizedEmail = normalizeCandidateEmail(scrubbedEmail);
			const now = new Date();
			const updated: Candidate = {
				...candidate,
				displayName: ANONYMIZED_CANDIDATE_DISPLAY_NAME,
				email: scrubbedEmail,
				phone: null,
				status: "anonymized",
				version: candidate.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.candidates.set(input.candidateId, updated);
			state.candidateByNormalizedEmail.delete(
				`${candidate.organizationId}:${previousNormalizedEmail}`,
			);
			state.candidateByNormalizedEmail.set(
				`${candidate.organizationId}:${scrubbedNormalizedEmail}`,
				candidate.id,
			);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_candidate",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.candidates.set(input.candidateId, candidate);
				state.candidateByNormalizedEmail.delete(
					`${candidate.organizationId}:${scrubbedNormalizedEmail}`,
				);
				state.candidateByNormalizedEmail.set(
					`${candidate.organizationId}:${previousNormalizedEmail}`,
					candidate.id,
				);
				return audit;
			}

			const outbox = await appendRegistryGatedOutbox(ports, {
				commandId: meta.operationId,
				meta,
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				aggregateId: updated.id,
				eventEntityType: "hr_candidate",
			});
			if (!outbox.ok) {
				state.candidates.set(input.candidateId, candidate);
				state.candidateByNormalizedEmail.delete(
					`${candidate.organizationId}:${scrubbedNormalizedEmail}`,
				);
				state.candidateByNormalizedEmail.set(
					`${candidate.organizationId}:${previousNormalizedEmail}`,
					candidate.id,
				);
				return outbox;
			}

			return ok(cloneCandidate(updated));
		},

		async listCandidates(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: CandidateStatus | undefined;
			retentionDueAsOf?: string | undefined;
			query?: string | undefined;
		}): Promise<Result<CandidateListPage>> {
			let filtered = Array.from(state.candidates.values()).filter(
				(c) => c.organizationId === input.organizationId,
			);
			if (input.status !== undefined) {
				filtered = filtered.filter((c) => c.status === input.status);
			}
			if (input.retentionDueAsOf !== undefined) {
				const { retentionDueAsOf } = input;
				filtered = filtered.filter(
					(candidate) =>
						candidate.retentionUntil !== null &&
						candidate.retentionUntil <= retentionDueAsOf,
				);
			}
			if (input.query !== undefined) {
				const needle = input.query.trim().toLowerCase();
				filtered = filtered.filter((candidate) => {
					const normalizedEmail = normalizeCandidateEmail(candidate.email);
					return (
						candidate.displayName.toLowerCase().includes(needle) ||
						candidate.email.toLowerCase().includes(needle) ||
						normalizedEmail.includes(needle)
					);
				});
			}
			filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const candidates = filtered
				.slice(start, start + input.pageSize)
				.map((c) => cloneCandidate(c));
			return await ok({
				candidates,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async detectCandidateDuplicates(input: {
			organizationId: string;
			email?: string | undefined;
			displayName?: string | undefined;
		}): Promise<Result<readonly CandidateDuplicateMatch[]>> {
			const matches = new Map<
				HumanResourcesCandidateId,
				Set<CandidateDuplicateMatchReason>
			>();
			const addMatch = (
				candidateId: HumanResourcesCandidateId,
				reason: CandidateDuplicateMatchReason,
			) => {
				const existing = matches.get(candidateId) ?? new Set();
				existing.add(reason);
				matches.set(candidateId, existing);
			};

			const normalizedEmail =
				input.email === undefined
					? undefined
					: normalizeCandidateEmail(input.email);
			const normalizedDisplayName =
				input.displayName === undefined
					? undefined
					: input.displayName.trim().toLowerCase();

			for (const candidate of state.candidates.values()) {
				if (candidate.organizationId !== input.organizationId) {
					continue;
				}
				if (candidate.status === "anonymized") {
					continue;
				}
				if (
					normalizedEmail !== undefined &&
					normalizeCandidateEmail(candidate.email) === normalizedEmail
				) {
					addMatch(candidate.id, "email");
				}
				if (
					normalizedDisplayName !== undefined &&
					candidate.displayName.trim().toLowerCase() === normalizedDisplayName
				) {
					addMatch(candidate.id, "display_name");
				}
			}

			const results: CandidateDuplicateMatch[] = [];
			for (const [candidateId, reasons] of matches) {
				const candidate = state.candidates.get(candidateId);
				if (candidate === undefined) {
					continue;
				}
				results.push({
					candidateId,
					matchReasons: [...reasons],
					displayName: candidate.displayName,
					email: candidate.email,
				});
			}
			results.sort((a, b) => a.displayName.localeCompare(b.displayName));
			return await ok(results);
		},

		// Application methods
		async getApplicationById(input: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
		}): Promise<Result<CandidateApplication | null>> {
			const application = state.applications.get(input.applicationId);
			if (application === undefined) {
				return await ok(null);
			}
			const orgCheck = assertRecruitmentOrgMatch(
				application,
				input.organizationId,
				"Application",
			);
			if (!orgCheck.ok) {
				return await notFound("Application not found");
			}
			return await ok(cloneApplication(application));
		},

		async findActiveApplicationByCandidateRequisition(input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			requisitionId: HumanResourcesRequisitionId;
		}): Promise<Result<CandidateApplication | null>> {
			const sequentialOutcome2 = await runSequential(
				state.applications.values(),
				async (application) => {
					if (
						application.organizationId === input.organizationId &&
						application.candidateId === input.candidateId &&
						application.requisitionId === input.requisitionId &&
						!isApplicationTerminal(application.status)
					) {
						return sequentialReturn(await ok(cloneApplication(application)));
					}
				},
			);
			if (sequentialOutcome2.kind === "return") {
				return sequentialOutcome2.value;
			}
			return await ok(null);
		},

		async createApplication(
			record: ApplicationCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<CandidateApplication>> {
			const references = resolveApplicationReferences(state, record);
			if (!references.ok) {
				return references;
			}

			const existingActive =
				await this.findActiveApplicationByCandidateRequisition({
					organizationId: record.organizationId,
					candidateId: record.candidateId,
					requisitionId: record.requisitionId,
				});
			if (!existingActive.ok) {
				return existingActive;
			}
			if (existingActive.data !== null) {
				return conflict(
					"An active application already exists for this candidate and requisition",
				);
			}

			const idResult = parseHumanResourcesApplicationId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const application: CandidateApplication = {
				id: idResult.data,
				organizationId: record.organizationId,
				candidateId: record.candidateId,
				requisitionId: record.requisitionId,
				status: "submitted",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.applications.set(application.id, application);

			const historyRow = appendApplicationHistoryToState(state, {
				organizationId: application.organizationId,
				applicationId: application.id,
				candidateId: application.candidateId,
				requisitionId: application.requisitionId,
				fromStatus: null,
				toStatus: "submitted",
				changeKind: "create",
				reason: null,
				reasonCode: null,
				correlationId: meta.correlationId,
				actorUserId: application.createdBy,
			});

			const audit = await ports.audit.record({
				organizationId: application.organizationId,
				actorUserId: application.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_candidate_application",
				entityId: application.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.applications.delete(application.id);
				state.applicationStatusHistory.delete(historyRow.id);
				return audit;
			}

			const outbox = await appendRegistryGatedOutbox(ports, {
				commandId: meta.operationId,
				meta,
				organizationId: application.organizationId,
				actorUserId: application.createdBy,
				aggregateId: application.id,
				eventEntityType: "hr_candidate_application",
			});
			if (!outbox.ok) {
				state.applications.delete(application.id);
				state.applicationStatusHistory.delete(historyRow.id);
				return outbox;
			}

			return ok(cloneApplication(application));
		},

		async transitionApplicationStatus(
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
		): Promise<Result<CandidateApplication>> {
			const application = state.applications.get(input.applicationId);
			if (application === undefined) {
				return notFound("Application not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				application,
				input.organizationId,
				"Application",
			);
			if (!orgCheck.ok) {
				return orgCheck;
			}

			const versionCheck = assertExpectedVersion(
				application.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const transition = assertApplicationStatusTransition(
				application.status,
				input.status,
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const updated: CandidateApplication = {
				...application,
				status: input.status,
				version: application.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.applications.set(input.applicationId, updated);

			const historyRow = appendApplicationHistoryToState(state, {
				organizationId: updated.organizationId,
				applicationId: updated.id,
				candidateId: updated.candidateId,
				requisitionId: updated.requisitionId,
				fromStatus: application.status,
				toStatus: input.status,
				changeKind: "lifecycle",
				reason: input.reason ?? null,
				reasonCode: input.reasonCode ?? null,
				correlationId: meta.correlationId,
				actorUserId: input.actorUserId,
			});

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_candidate_application",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.applications.set(input.applicationId, application);
				state.applicationStatusHistory.delete(historyRow.id);
				return audit;
			}

			const outbox = await appendRegistryGatedOutbox(ports, {
				commandId: meta.operationId,
				meta,
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				aggregateId: updated.id,
				eventEntityType: "hr_candidate_application",
			});
			if (!outbox.ok) {
				state.applications.set(input.applicationId, application);
				state.applicationStatusHistory.delete(historyRow.id);
				return outbox;
			}

			return ok(cloneApplication(updated));
		},

		async reopenApplication(
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
		): Promise<Result<CandidateApplication>> {
			const application = state.applications.get(input.applicationId);
			if (application === undefined) {
				return notFound("Application not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				application,
				input.organizationId,
				"Application",
			);
			if (!orgCheck.ok) {
				return orgCheck;
			}

			const versionCheck = assertExpectedVersion(
				application.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const reopenable = assertApplicationReopenable(application.status);
			if (!reopenable.ok) {
				return reopenable;
			}

			const existingActive =
				await this.findActiveApplicationByCandidateRequisition({
					organizationId: input.organizationId,
					candidateId: application.candidateId,
					requisitionId: application.requisitionId,
				});
			if (!existingActive.ok) {
				return existingActive;
			}
			if (existingActive.data !== null) {
				return conflict(
					"An active application already exists for this candidate and requisition",
				);
			}

			return this.transitionApplicationStatus(
				{
					organizationId: input.organizationId,
					applicationId: input.applicationId,
					status: "submitted",
					expectedVersion: input.expectedVersion,
					actorUserId: input.actorUserId,
					reason: input.reason ?? null,
					reasonCode: input.reasonCode ?? null,
				},
				ports,
				meta,
			);
		},

		async listApplicationStatusHistory(input: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
		}): Promise<Result<ApplicationStatusHistory[]>> {
			const rows = [...state.applicationStatusHistory.values()]
				.filter(
					(row) =>
						row.organizationId === input.organizationId &&
						row.applicationId === input.applicationId,
				)
				.sort(
					(left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
				)
				.map((row) => ({ ...row }));
			return await ok(rows);
		},

		async appendApplicationStatusHistory(
			record: ApplicationStatusHistoryAppendRecord,
		): Promise<Result<ApplicationStatusHistory>> {
			return await ok(appendApplicationHistoryToState(state, record));
		},

		async listApplications(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: ApplicationStatus | undefined;
			candidateId?: HumanResourcesCandidateId | undefined;
			requisitionId?: HumanResourcesRequisitionId | undefined;
		}): Promise<Result<ApplicationListPage>> {
			let filtered = Array.from(state.applications.values()).filter(
				(a) => a.organizationId === input.organizationId,
			);
			if (input.status !== undefined) {
				filtered = filtered.filter((a) => a.status === input.status);
			}
			if (input.candidateId !== undefined) {
				filtered = filtered.filter((a) => a.candidateId === input.candidateId);
			}
			if (input.requisitionId !== undefined) {
				filtered = filtered.filter(
					(a) => a.requisitionId === input.requisitionId,
				);
			}
			filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const applications = filtered
				.slice(start, start + input.pageSize)
				.map((a) => cloneApplication(a));
			return await ok({
				applications,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// Interview methods
		async getInterviewById(input: {
			organizationId: string;
			interviewId: HumanResourcesInterviewId;
		}): Promise<Result<Interview | null>> {
			const interview = state.interviews.get(input.interviewId);
			if (interview === undefined) {
				return await ok(null);
			}
			const orgCheck = assertRecruitmentOrgMatch(
				interview,
				input.organizationId,
				"Interview",
			);
			if (!orgCheck.ok) {
				return await notFound("Interview not found");
			}
			return await ok(cloneInterview(interview));
		},

		async scheduleInterview(
			record: InterviewScheduleRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Interview>> {
			const application = state.applications.get(record.applicationId);
			if (application === undefined) {
				return notFound("Application not found");
			}
			const applicationOrg = assertRecruitmentOrgMatch(
				application,
				record.organizationId,
				"Application",
			);
			if (!applicationOrg.ok) {
				return applicationOrg;
			}

			const schedulable = assertInterviewSchedulable(application.status);
			if (!schedulable.ok) {
				return schedulable;
			}

			const idResult = parseHumanResourcesInterviewId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const interview: Interview = {
				id: idResult.data,
				organizationId: record.organizationId,
				applicationId: record.applicationId,
				scheduledAt: new Date(record.scheduledAt),
				status: "scheduled",
				interviewerActorId: record.interviewerActorId,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.interviews.set(interview.id, interview);

			const audit = await ports.audit.record({
				organizationId: interview.organizationId,
				actorUserId: interview.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_interview",
				entityId: interview.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.interviews.delete(interview.id);
				return audit;
			}

			const outbox = await appendRegistryGatedOutbox(ports, {
				commandId: meta.operationId,
				meta,
				organizationId: interview.organizationId,
				actorUserId: interview.createdBy,
				aggregateId: interview.id,
				eventEntityType: "hr_interview",
			});
			if (!outbox.ok) {
				state.interviews.delete(interview.id);
				return outbox;
			}

			return ok(cloneInterview(interview));
		},

		async cancelInterview(
			input: {
				organizationId: string;
				interviewId: HumanResourcesInterviewId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Interview>> {
			const interview = state.interviews.get(input.interviewId);
			if (interview === undefined) {
				return notFound("Interview not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				interview,
				input.organizationId,
				"Interview",
			);
			if (!orgCheck.ok) {
				return orgCheck;
			}

			const versionCheck = assertExpectedVersion(
				interview.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const transition = assertInterviewStatusTransition(
				interview.status,
				"cancelled",
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const updated: Interview = {
				...interview,
				status: "cancelled",
				version: interview.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.interviews.set(input.interviewId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_interview",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.interviews.set(input.interviewId, interview);
				return audit;
			}

			return ok(cloneInterview(updated));
		},

		async assignInterviewInterviewer(
			input: {
				organizationId: string;
				interviewId: HumanResourcesInterviewId;
				interviewerActorId: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<Interview>> {
			const interview = state.interviews.get(input.interviewId);
			if (interview === undefined) {
				return notFound("Interview not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				interview,
				input.organizationId,
				"Interview",
			);
			if (!orgCheck.ok) {
				return notFound("Interview not found");
			}

			const versionCheck = assertExpectedVersion(
				interview.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const assignable = assertInterviewInterviewerAssignable(interview.status);
			if (!assignable.ok) {
				return assignable;
			}

			const now = new Date();
			const updated: Interview = {
				...interview,
				interviewerActorId: input.interviewerActorId,
				version: interview.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.interviews.set(input.interviewId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_interview",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.interviews.set(input.interviewId, interview);
				return audit;
			}

			return ok(cloneInterview(updated));
		},

		async listInterviews(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			applicationId?: HumanResourcesApplicationId | undefined;
		}): Promise<Result<InterviewListPage>> {
			let filtered = Array.from(state.interviews.values()).filter(
				(i) => i.organizationId === input.organizationId,
			);
			if (input.applicationId !== undefined) {
				filtered = filtered.filter(
					(i) => i.applicationId === input.applicationId,
				);
			}
			filtered.sort(
				(a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
			);
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const interviews = filtered
				.slice(start, start + input.pageSize)
				.map((i) => cloneInterview(i));
			return await ok({
				interviews,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// Interview evaluation methods
		async getInterviewEvaluationByInterviewId(input: {
			organizationId: string;
			interviewId: HumanResourcesInterviewId;
		}): Promise<Result<InterviewEvaluation | null>> {
			const evaluationId = state.interviewEvaluationByInterviewId.get(
				input.interviewId,
			);
			if (evaluationId === undefined) {
				return await ok(null);
			}
			const evaluation = state.interviewEvaluations.get(
				evaluationId as HumanResourcesInterviewEvaluationId,
			);
			if (evaluation === undefined) {
				return await ok(null);
			}
			const orgCheck = assertRecruitmentOrgMatch(
				evaluation,
				input.organizationId,
				"Interview evaluation",
			);
			if (!orgCheck.ok) {
				return await notFound("Interview evaluation not found");
			}
			return await ok(cloneEvaluation(evaluation));
		},

		async recordInterviewEvaluation(
			record: InterviewEvaluationCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<InterviewEvaluation>> {
			const interview = state.interviews.get(record.interviewId);
			if (interview === undefined) {
				return notFound("Interview not found");
			}
			const interviewOrg = assertRecruitmentOrgMatch(
				interview,
				record.organizationId,
				"Interview",
			);
			if (!interviewOrg.ok) {
				return interviewOrg;
			}

			const existingEvaluation = state.interviewEvaluationByInterviewId.get(
				record.interviewId,
			);
			if (existingEvaluation !== undefined) {
				return conflict("Interview evaluation already recorded");
			}

			const versionCheck = assertExpectedVersion(
				interview.version,
				record.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const completeTransition = assertInterviewStatusTransition(
				interview.status,
				"completed",
			);
			if (!completeTransition.ok) {
				return completeTransition;
			}

			const evaluationIdResult = parseHumanResourcesInterviewEvaluationId(
				randomUUID(),
			);
			if (!evaluationIdResult.ok) {
				return evaluationIdResult;
			}

			const now = new Date();
			const completedInterview: Interview = {
				...interview,
				status: "completed",
				version: interview.version + 1,
				updatedBy: record.createdBy,
				updatedAt: now,
			};

			const evaluation: InterviewEvaluation = {
				id: evaluationIdResult.data,
				organizationId: record.organizationId,
				interviewId: record.interviewId,
				result: record.result,
				scorecard: {
					criteria: record.scorecard.criteria.map((criterion) => ({
						...criterion,
					})),
				},
				privateNotes: record.privateNotes,
				evaluatorActorId: record.evaluatorActorId,
				recordedAt: now,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.interviews.set(record.interviewId, completedInterview);
			state.interviewEvaluations.set(evaluation.id, evaluation);
			state.interviewEvaluationByInterviewId.set(
				record.interviewId,
				evaluation.id,
			);

			const interviewAudit = await ports.audit.record({
				organizationId: completedInterview.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_interview",
				entityId: completedInterview.id,
				action: "UPDATE",
				changes: [],
			});
			if (!interviewAudit.ok) {
				state.interviews.set(record.interviewId, interview);
				state.interviewEvaluations.delete(evaluation.id);
				state.interviewEvaluationByInterviewId.delete(record.interviewId);
				return interviewAudit;
			}

			const evaluationAudit = await ports.audit.record({
				organizationId: evaluation.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_interview_evaluation",
				entityId: evaluation.id,
				action: "CREATE",
				changes: [],
			});
			if (!evaluationAudit.ok) {
				state.interviews.set(record.interviewId, interview);
				state.interviewEvaluations.delete(evaluation.id);
				state.interviewEvaluationByInterviewId.delete(record.interviewId);
				return evaluationAudit;
			}

			const outbox = await appendRegistryGatedOutbox(ports, {
				commandId: meta.operationId,
				meta,
				organizationId: completedInterview.organizationId,
				actorUserId: record.createdBy,
				aggregateId: completedInterview.id,
				eventEntityType: "hr_interview",
			});
			if (!outbox.ok) {
				state.interviews.set(record.interviewId, interview);
				state.interviewEvaluations.delete(evaluation.id);
				state.interviewEvaluationByInterviewId.delete(record.interviewId);
				return outbox;
			}

			return ok(cloneEvaluation(evaluation));
		},

		// Offer methods
		async getOfferById(input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
		}): Promise<Result<EmploymentOffer | null>> {
			const offer = state.offers.get(input.offerId);
			if (offer === undefined) {
				return await ok(null);
			}
			const orgCheck = assertRecruitmentOrgMatch(
				offer,
				input.organizationId,
				"Offer",
			);
			if (!orgCheck.ok) {
				return await notFound("Offer not found");
			}
			return await ok(cloneOffer(offer));
		},

		async findActiveOfferByApplication(input: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
		}): Promise<Result<EmploymentOffer | null>> {
			const sequentialOutcome3 = await runSequential(
				state.offers.values(),
				async (offer) => {
					if (
						offer.organizationId === input.organizationId &&
						offer.applicationId === input.applicationId &&
						isOfferActive(offer.status)
					) {
						return sequentialReturn(await ok(cloneOffer(offer)));
					}
				},
			);
			if (sequentialOutcome3.kind === "return") {
				return sequentialOutcome3.value;
			}
			return await ok(null);
		},

		async findOfferByAcceptIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentOfferAcceptRecord | null>> {
			const record = state.offerAcceptIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return await ok(null);
			}
			return await ok({
				handoff: cloneHandoff(record.handoff),
				acceptRequestFingerprint: record.acceptRequestFingerprint,
			});
		},

		async createOffer(
			record: OfferCreateRecord,
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmploymentOffer>> {
			const application = state.applications.get(record.applicationId);
			if (application === undefined) {
				return notFound("Application not found");
			}
			const applicationOrg = assertRecruitmentOrgMatch(
				application,
				record.organizationId,
				"Application",
			);
			if (!applicationOrg.ok) {
				return applicationOrg;
			}

			const eligible = assertApplicationEligibleForOffer(application.status);
			if (!eligible.ok) {
				return eligible;
			}

			const existingActive = await this.findActiveOfferByApplication({
				organizationId: record.organizationId,
				applicationId: record.applicationId,
			});
			if (!existingActive.ok) {
				return existingActive;
			}
			if (existingActive.data !== null) {
				return conflict("An active offer already exists for this application");
			}

			const proposalCheck = await validateOfferCompensationProposalAttachment(
				this,
				{
					organizationId: record.organizationId,
					applicationId: record.applicationId,
					compensationProposalId: record.compensationProposalId,
				},
			);
			if (!proposalCheck.ok) {
				return proposalCheck;
			}

			const idResult = parseHumanResourcesOfferId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const offer: EmploymentOffer = {
				id: idResult.data,
				organizationId: record.organizationId,
				applicationId: record.applicationId,
				status: "draft",
				termsSummary: record.termsSummary,
				expiresOn: record.expiresOn,
				compensationProposalId: record.compensationProposalId ?? null,
				issuedAt: null,
				respondedAt: null,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};

			state.offers.set(offer.id, offer);

			const audit = await ports.audit.record({
				organizationId: offer.organizationId,
				actorUserId: offer.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_employment_offer",
				entityId: offer.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.offers.delete(offer.id);
				return audit;
			}

			return ok(cloneOffer(offer));
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async amendOfferDraft(
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
		): Promise<Result<EmploymentOffer>> {
			const offer = state.offers.get(input.offerId);
			if (offer === undefined) {
				return notFound("Offer not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				offer,
				input.organizationId,
				"Offer",
			);
			if (!orgCheck.ok) {
				return orgCheck;
			}

			const versionCheck = assertExpectedVersion(
				offer.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const amendable = assertOfferAmendable(offer.status);
			if (!amendable.ok) {
				return amendable;
			}

			const nextCompensationProposalId =
				input.compensationProposalId === undefined
					? offer.compensationProposalId
					: input.compensationProposalId;
			if (input.compensationProposalId !== undefined) {
				const proposalMutable = assertOfferProposalMutable(offer.status);
				if (!proposalMutable.ok) {
					return proposalMutable;
				}
			}
			const proposalCheck = await validateOfferCompensationProposalAttachment(
				this,
				{
					organizationId: input.organizationId,
					applicationId: offer.applicationId,
					compensationProposalId: nextCompensationProposalId,
				},
			);
			if (!proposalCheck.ok) {
				return proposalCheck;
			}

			const now = new Date();
			const updated: EmploymentOffer = {
				...offer,
				termsSummary:
					input.termsSummary === undefined
						? offer.termsSummary
						: input.termsSummary,
				expiresOn:
					input.expiresOn === undefined ? offer.expiresOn : input.expiresOn,
				compensationProposalId: nextCompensationProposalId,
				version: offer.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.offers.set(input.offerId, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employment_offer",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.offers.set(input.offerId, offer);
				return audit;
			}

			return ok(cloneOffer(updated));
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async transitionOfferStatus(
			input: {
				organizationId: string;
				offerId: HumanResourcesOfferId;
				status: OfferStatus;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmploymentOffer>> {
			const offer = state.offers.get(input.offerId);
			if (offer === undefined) {
				return notFound("Offer not found");
			}
			const orgCheck = assertRecruitmentOrgMatch(
				offer,
				input.organizationId,
				"Offer",
			);
			if (!orgCheck.ok) {
				return orgCheck;
			}

			const versionCheck = assertExpectedVersion(
				offer.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const transition = assertOfferStatusTransition(
				offer.status,
				input.status,
			);
			if (!transition.ok) {
				return transition;
			}

			if (input.status === "approved") {
				const ready = assertOfferReadyForApproval({
					compensationProposalId: offer.compensationProposalId,
				});
				if (!ready.ok) {
					return ready;
				}
				const proposalCheck = await validateOfferCompensationProposalAttachment(
					this,
					{
						organizationId: input.organizationId,
						applicationId: offer.applicationId,
						compensationProposalId: offer.compensationProposalId,
						offerStatus: "approved",
					},
				);
				if (!proposalCheck.ok) {
					return proposalCheck;
				}
			}

			const application = state.applications.get(offer.applicationId);
			if (application === undefined) {
				return notFound("Application not found");
			}
			const applicationOrg = assertRecruitmentOrgMatch(
				application,
				input.organizationId,
				"Application",
			);
			if (!applicationOrg.ok) {
				return applicationOrg;
			}

			let updatedApplication: CandidateApplication | null = null;
			if (input.status === "issued") {
				const proposalCheck = await validateOfferCompensationProposalAttachment(
					this,
					{
						organizationId: input.organizationId,
						applicationId: offer.applicationId,
						compensationProposalId: offer.compensationProposalId,
						offerStatus: "issued",
					},
				);
				if (!proposalCheck.ok) {
					return proposalCheck;
				}
				const applicationTransition = assertApplicationStatusTransition(
					application.status,
					"offered",
				);
				if (!applicationTransition.ok) {
					return applicationTransition;
				}
				const nowForApp = new Date();
				updatedApplication = {
					...application,
					status: "offered",
					version: application.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: nowForApp,
				};
			}

			const now = new Date();
			const updated: EmploymentOffer = {
				...offer,
				status: input.status,
				issuedAt: input.status === "issued" ? now : offer.issuedAt,
				respondedAt:
					input.status === "declined" ||
					input.status === "expired" ||
					input.status === "withdrawn"
						? now
						: offer.respondedAt,
				version: offer.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.offers.set(input.offerId, updated);
			if (updatedApplication !== null) {
				state.applications.set(application.id, updatedApplication);
			}

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employment_offer",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.offers.set(input.offerId, offer);
				if (updatedApplication !== null) {
					state.applications.set(application.id, application);
				}
				return audit;
			}

			if (updatedApplication !== null) {
				const applicationAudit = await ports.audit.record({
					organizationId: updatedApplication.organizationId,
					actorUserId: input.actorUserId,
					correlationId: meta.correlationId,
					entity: "hr_candidate_application",
					entityId: updatedApplication.id,
					action: "UPDATE",
					changes: [],
				});
				if (!applicationAudit.ok) {
					state.offers.set(input.offerId, offer);
					state.applications.set(application.id, application);
					return applicationAudit;
				}
			}

			const outbox = await appendRegistryGatedOutbox(ports, {
				commandId: meta.operationId,
				meta,
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				aggregateId: updated.id,
				eventEntityType: "hr_employment_offer",
			});
			if (!outbox.ok) {
				state.offers.set(input.offerId, offer);
				if (updatedApplication !== null) {
					state.applications.set(application.id, application);
				}
				return outbox;
			}

			return ok(cloneOffer(updated));
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async acceptOffer(
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
		): Promise<Result<OfferAcceptanceHandoff>> {
			const existingByKey = await this.findOfferByAcceptIdempotencyKey({
				organizationId: input.organizationId,
				idempotencyKey: input.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				return ok(cloneHandoff(existingByKey.data.handoff));
			}

			const offer = state.offers.get(input.offerId);
			if (offer === undefined) {
				return notFound("Offer not found");
			}
			const offerOrg = assertRecruitmentOrgMatch(
				offer,
				input.organizationId,
				"Offer",
			);
			if (!offerOrg.ok) {
				return offerOrg;
			}

			const versionCheck = assertExpectedVersion(
				offer.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const acceptable = assertOfferAcceptable({
				status: offer.status,
				expiresOn: offer.expiresOn,
				asOfDate: input.asOfDate,
			});
			if (!acceptable.ok) {
				return acceptable;
			}

			const application = state.applications.get(offer.applicationId);
			if (application === undefined) {
				return notFound("Application not found");
			}
			const applicationOrg = assertRecruitmentOrgMatch(
				application,
				input.organizationId,
				"Application",
			);
			if (!applicationOrg.ok) {
				return applicationOrg;
			}

			const applicationTransition = assertApplicationStatusTransition(
				application.status,
				"accepted",
			);
			if (!applicationTransition.ok) {
				return applicationTransition;
			}

			const candidate = state.candidates.get(application.candidateId);
			if (candidate === undefined) {
				return notFound("Candidate not found");
			}
			const candidateOrg = assertRecruitmentOrgMatch(
				candidate,
				input.organizationId,
				"Candidate",
			);
			if (!candidateOrg.ok) {
				return candidateOrg;
			}

			const requisition = state.requisitions.get(application.requisitionId);
			if (requisition === undefined) {
				return notFound("Requisition not found");
			}
			const requisitionOrg = assertRecruitmentOrgMatch(
				requisition,
				input.organizationId,
				"Requisition",
			);
			if (!requisitionOrg.ok) {
				return requisitionOrg;
			}

			const now = new Date();
			const updatedOffer: EmploymentOffer = {
				...offer,
				status: "accepted",
				respondedAt: now,
				version: offer.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			const updatedApplication: CandidateApplication = {
				...application,
				status: "accepted",
				version: application.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.offers.set(input.offerId, updatedOffer);
			state.applications.set(application.id, updatedApplication);

			const handoff: OfferAcceptanceHandoff = {
				organizationId: input.organizationId,
				offerId: updatedOffer.id,
				applicationId: application.id,
				candidateId: application.candidateId,
				requisitionId: application.requisitionId,
				correlationId: meta.correlationId,
				acceptedAt: now,
				offer: cloneOffer(updatedOffer),
			};

			const offerAudit = await ports.audit.record({
				organizationId: updatedOffer.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employment_offer",
				entityId: updatedOffer.id,
				action: "UPDATE",
				changes: [],
			});
			if (!offerAudit.ok) {
				state.offers.set(input.offerId, offer);
				state.applications.set(application.id, application);
				return offerAudit;
			}

			const applicationAudit = await ports.audit.record({
				organizationId: updatedApplication.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_candidate_application",
				entityId: updatedApplication.id,
				action: "UPDATE",
				changes: [],
			});
			if (!applicationAudit.ok) {
				state.offers.set(input.offerId, offer);
				state.applications.set(application.id, application);
				return applicationAudit;
			}

			const outbox = await appendRegistryGatedOutbox(ports, {
				commandId: meta.operationId,
				meta,
				organizationId: updatedOffer.organizationId,
				actorUserId: input.actorUserId,
				aggregateId: updatedOffer.id,
				eventEntityType: "hr_employment_offer",
			});
			if (!outbox.ok) {
				state.offers.set(input.offerId, offer);
				state.applications.set(application.id, application);
				return outbox;
			}

			const consumed =
				await this.consumeActiveHeadcountReservationForRequisition(
					{
						organizationId: input.organizationId,
						requisitionId: application.requisitionId,
						actorUserId: input.actorUserId,
					},
					ports,
					meta,
				);
			if (!consumed.ok) {
				state.offers.set(input.offerId, offer);
				state.applications.set(application.id, application);
				return consumed;
			}

			state.offerAcceptIdempotencyByKey.set(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
				{
					handoff: cloneHandoff(handoff),
					acceptRequestFingerprint: input.acceptRequestFingerprint,
				},
			);

			return ok(cloneHandoff(handoff));
		},

		async listOffers(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: OfferStatus | undefined;
			applicationId?: HumanResourcesApplicationId | undefined;
		}): Promise<Result<OfferListPage>> {
			let filtered = Array.from(state.offers.values()).filter(
				(o) => o.organizationId === input.organizationId,
			);
			if (input.status !== undefined) {
				filtered = filtered.filter((o) => o.status === input.status);
			}
			if (input.applicationId !== undefined) {
				filtered = filtered.filter(
					(o) => o.applicationId === input.applicationId,
				);
			}
			filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const offers = filtered
				.slice(start, start + input.pageSize)
				.map((o) => cloneOffer(o));
			return await ok({
				offers,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// --- Lifecycle: onboarding ---
	};
}

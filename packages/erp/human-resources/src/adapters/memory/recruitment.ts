import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
	HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
} from "@afenda/events/schemas";

import {
	type HumanResourcesApplicationId,
	type HumanResourcesCandidateId,
	type HumanResourcesDepartmentId,
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
import {
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, notFound } from "../../shared/domain-guards";
import {
	assertApplicationEligibleForOffer,
	assertApplicationStatusTransition,
	assertCandidateActive,
	assertInterviewSchedulable,
	assertInterviewStatusTransition,
	assertOfferAcceptable,
	assertOfferAmendable,
	assertOfferStatusTransition,
	assertRequisitionAmendable,
	assertRequisitionOpenForApplication,
	assertRequisitionStatusTransition,
} from "../../shared/recruitment-guards";
import {
	type ApplicationStatus,
	type CandidateStatus,
	isApplicationTerminal,
	isOfferActive,
	type OfferStatus,
	type RequisitionStatus,
} from "../../shared/recruitment-status";
import type {
	ApplicationCreateRecord,
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
	return { ...evaluation };
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
		if (!job.ok) return job;
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
		if (!position.ok) return position;
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
		if (!department.ok) return department;
		if (department.data === null) {
			return notFound(
				"Department not found",
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			);
		}
	}
	return ok(undefined);
}

export type RecruitmentMemoryState = {
	requisitions: Map<HumanResourcesRequisitionId, JobRequisition>;
	requisitionIdempotencyByKey: Map<string, IdempotentRequisitionRecord>;
	candidates: Map<HumanResourcesCandidateId, Candidate>;
	candidateIdempotencyByKey: Map<string, IdempotentCandidateRecord>;
	candidateByNormalizedEmail: Map<string, string>;
	applications: Map<HumanResourcesApplicationId, CandidateApplication>;
	interviews: Map<HumanResourcesInterviewId, Interview>;
	interviewEvaluations: Map<
		HumanResourcesInterviewEvaluationId,
		InterviewEvaluation
	>;
	interviewEvaluationByInterviewId: Map<string, string>;
	offers: Map<HumanResourcesOfferId, EmploymentOffer>;
	offerAcceptIdempotencyByKey: Map<string, IdempotentOfferAcceptRecord>;
};

export type MemoryRecruitmentMethods = Pick<
	HumanResourcesStore,
	| "findRequisitionByIdempotencyKey"
	| "getRequisitionById"
	| "findRequisitionByCode"
	| "createDraftRequisition"
	| "amendRequisition"
	| "transitionRequisitionStatus"
	| "listRequisitions"
	| "findCandidateByIdempotencyKey"
	| "getCandidateById"
	| "findCandidateByNormalizedEmail"
	| "createCandidate"
	| "updateCandidateProfile"
	| "listCandidates"
	| "getApplicationById"
	| "findActiveApplicationByCandidateRequisition"
	| "createApplication"
	| "transitionApplicationStatus"
	| "listApplications"
	| "getInterviewById"
	| "scheduleInterview"
	| "cancelInterview"
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
				return ok(null);
			}
			return ok({
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
				return ok(null);
			}
			const orgCheck = assertRecruitmentOrgMatch(
				requisition,
				input.organizationId,
				"Requisition",
			);
			if (!orgCheck.ok) {
				return notFound("Requisition not found");
			}
			return ok(cloneRequisition(requisition));
		},

		async findRequisitionByCode(input: {
			organizationId: string;
			code: string;
		}): Promise<Result<JobRequisition | null>> {
			for (const requisition of state.requisitions.values()) {
				if (
					requisition.organizationId === input.organizationId &&
					requisition.code === input.code
				) {
					return ok(cloneRequisition(requisition));
				}
			}
			return ok(null);
		},

		async createDraftRequisition(
			record: RequisitionCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
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
				title?: string;
				jobId?: HumanResourcesJobId | null;
				positionId?: HumanResourcesPositionId | null;
				departmentId?: HumanResourcesDepartmentId | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			const nextTitle =
				input.title !== undefined ? input.title : requisition.title;
			const nextJobId =
				input.jobId !== undefined ? input.jobId : requisition.jobId;
			const nextPositionId =
				input.positionId !== undefined
					? input.positionId
					: requisition.positionId;
			const nextDepartmentId =
				input.departmentId !== undefined
					? input.departmentId
					: requisition.departmentId;

			const refs = await validateRequisitionReferences.call(this, {
				organizationId: input.organizationId,
				jobId: nextJobId,
				positionId: nextPositionId,
				departmentId: nextDepartmentId,
			});
			if (!refs.ok) {
				return refs;
			}

			const now = new Date();
			const updated: JobRequisition = {
				...requisition,
				title: nextTitle,
				jobId: nextJobId,
				positionId: nextPositionId,
				departmentId: nextDepartmentId,
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
				emitApprovedEvent?: boolean;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			const shouldEmitApproved =
				input.status === "approved" && input.emitApprovedEvent === true;
			if (shouldEmitApproved) {
				const outbox = await ports.outbox.append({
					organizationId: updated.organizationId,
					actorUserId: input.actorUserId,
					correlationId: meta.correlationId,
					type: HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
					payload: {
						organizationId: updated.organizationId,
						entityType: "hr_job_requisition",
						entityId: updated.id,
						actorId: input.actorUserId,
						correlationId: meta.correlationId,
					},
				});
				if (!outbox.ok) {
					state.requisitions.set(input.requisitionId, requisition);
					return outbox;
				}
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
			status?: RequisitionStatus;
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
			return ok({
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
				return ok(null);
			}
			return ok({
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
				return ok(null);
			}
			const orgCheck = assertRecruitmentOrgMatch(
				candidate,
				input.organizationId,
				"Candidate",
			);
			if (!orgCheck.ok) {
				return notFound("Candidate not found");
			}
			return ok(cloneCandidate(candidate));
		},

		async findCandidateByNormalizedEmail(input: {
			organizationId: string;
			normalizedEmail: string;
		}): Promise<Result<Candidate | null>> {
			const candidateId = state.candidateByNormalizedEmail.get(
				`${input.organizationId}:${input.normalizedEmail}`,
			);
			if (candidateId === undefined) {
				return ok(null);
			}
			const candidate = state.candidates.get(
				candidateId as HumanResourcesCandidateId,
			);
			if (candidate === undefined) {
				return ok(null);
			}
			return ok(cloneCandidate(candidate));
		},

		async createCandidate(
			record: CandidateCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok(cloneCandidate(candidate));
		},

		async updateCandidateProfile(
			input: {
				organizationId: string;
				candidateId: HumanResourcesCandidateId;
				displayName?: string;
				phone?: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			const now = new Date();
			const updated: Candidate = {
				...candidate,
				displayName:
					input.displayName !== undefined
						? input.displayName
						: candidate.displayName,
				phone: input.phone !== undefined ? input.phone : candidate.phone,
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

		async listCandidates(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: CandidateStatus;
		}): Promise<Result<CandidateListPage>> {
			let filtered = Array.from(state.candidates.values()).filter(
				(c) => c.organizationId === input.organizationId,
			);
			if (input.status !== undefined) {
				filtered = filtered.filter((c) => c.status === input.status);
			}
			filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
			const totalCount = filtered.length;
			const start = (input.page - 1) * input.pageSize;
			const candidates = filtered
				.slice(start, start + input.pageSize)
				.map((c) => cloneCandidate(c));
			return ok({
				candidates,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// Application methods
		async getApplicationById(input: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
		}): Promise<Result<CandidateApplication | null>> {
			const application = state.applications.get(input.applicationId);
			if (application === undefined) {
				return ok(null);
			}
			const orgCheck = assertRecruitmentOrgMatch(
				application,
				input.organizationId,
				"Application",
			);
			if (!orgCheck.ok) {
				return notFound("Application not found");
			}
			return ok(cloneApplication(application));
		},

		async findActiveApplicationByCandidateRequisition(input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			requisitionId: HumanResourcesRequisitionId;
		}): Promise<Result<CandidateApplication | null>> {
			for (const application of state.applications.values()) {
				if (
					application.organizationId === input.organizationId &&
					application.candidateId === input.candidateId &&
					application.requisitionId === input.requisitionId &&
					!isApplicationTerminal(application.status)
				) {
					return ok(cloneApplication(application));
				}
			}
			return ok(null);
		},

		async createApplication(
			record: ApplicationCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<CandidateApplication>> {
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
			if (!openRequisition.ok) {
				return openRequisition;
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
				return audit;
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
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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
				return audit;
			}

			return ok(cloneApplication(updated));
		},

		async listApplications(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: ApplicationStatus;
			candidateId?: HumanResourcesCandidateId;
			requisitionId?: HumanResourcesRequisitionId;
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
			return ok({
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
				return ok(null);
			}
			const orgCheck = assertRecruitmentOrgMatch(
				interview,
				input.organizationId,
				"Interview",
			);
			if (!orgCheck.ok) {
				return notFound("Interview not found");
			}
			return ok(cloneInterview(interview));
		},

		async scheduleInterview(
			record: InterviewScheduleRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
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
			meta: { correlationId: string },
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

		async listInterviews(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			applicationId?: HumanResourcesApplicationId;
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
			return ok({
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
				return ok(null);
			}
			const evaluation = state.interviewEvaluations.get(
				evaluationId as HumanResourcesInterviewEvaluationId,
			);
			if (evaluation === undefined) {
				return ok(null);
			}
			const orgCheck = assertRecruitmentOrgMatch(
				evaluation,
				input.organizationId,
				"Interview evaluation",
			);
			if (!orgCheck.ok) {
				return notFound("Interview evaluation not found");
			}
			return ok(cloneEvaluation(evaluation));
		},

		async recordInterviewEvaluation(
			record: InterviewEvaluationCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok(cloneEvaluation(evaluation));
		},

		// Offer methods
		async getOfferById(input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
		}): Promise<Result<EmploymentOffer | null>> {
			const offer = state.offers.get(input.offerId);
			if (offer === undefined) {
				return ok(null);
			}
			const orgCheck = assertRecruitmentOrgMatch(
				offer,
				input.organizationId,
				"Offer",
			);
			if (!orgCheck.ok) {
				return notFound("Offer not found");
			}
			return ok(cloneOffer(offer));
		},

		async findActiveOfferByApplication(input: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
		}): Promise<Result<EmploymentOffer | null>> {
			for (const offer of state.offers.values()) {
				if (
					offer.organizationId === input.organizationId &&
					offer.applicationId === input.applicationId &&
					isOfferActive(offer.status)
				) {
					return ok(cloneOffer(offer));
				}
			}
			return ok(null);
		},

		async findOfferByAcceptIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<IdempotentOfferAcceptRecord | null>> {
			const record = state.offerAcceptIdempotencyByKey.get(
				idempotencyMapKey(input.organizationId, input.idempotencyKey),
			);
			if (record === undefined) {
				return ok(null);
			}
			return ok({
				handoff: cloneHandoff(record.handoff),
				acceptRequestFingerprint: record.acceptRequestFingerprint,
			});
		},

		async createOffer(
			record: OfferCreateRecord,
			ports: MutationPorts,
			meta: { correlationId: string },
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

		async amendOfferDraft(
			input: {
				organizationId: string;
				offerId: HumanResourcesOfferId;
				termsSummary?: string;
				expiresOn?: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			const now = new Date();
			const updated: EmploymentOffer = {
				...offer,
				termsSummary:
					input.termsSummary !== undefined
						? input.termsSummary
						: offer.termsSummary,
				expiresOn:
					input.expiresOn !== undefined ? input.expiresOn : offer.expiresOn,
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

		async transitionOfferStatus(
			input: {
				organizationId: string;
				offerId: HumanResourcesOfferId;
				status: OfferStatus;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok(cloneOffer(updated));
		},

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
			meta: { correlationId: string },
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

			const outbox = await ports.outbox.append({
				organizationId: updatedOffer.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
				payload: {
					organizationId: updatedOffer.organizationId,
					entityType: "hr_employment_offer",
					entityId: updatedOffer.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
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
			status?: OfferStatus;
			applicationId?: HumanResourcesApplicationId;
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
			return ok({
				offers,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// --- Lifecycle: onboarding ---
	};
}

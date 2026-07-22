import { randomUUID } from "node:crypto";
import {
	and,
	asc,
	db,
	desc,
	eq,
	hrCandidate,
	hrCandidateApplication,
	hrEmploymentOffer,
	hrInterview,
	hrInterviewEvaluation,
	hrJobRequisition,
	runNeonHttpTransaction,
	sql,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
	HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
} from "@afenda/events/schemas";
import {
	type HumanResourcesApplicationId,
	type HumanResourcesCandidateId,
	type HumanResourcesDepartmentId,
	type HumanResourcesInterviewId,
	type HumanResourcesJobId,
	type HumanResourcesOfferId,
	type HumanResourcesPositionId,
	type HumanResourcesRequisitionId,
	parseHumanResourcesApplicationId,
	parseHumanResourcesCandidateId,
	parseHumanResourcesDepartmentId,
	parseHumanResourcesInterviewEvaluationId,
	parseHumanResourcesInterviewId,
	parseHumanResourcesJobId,
	parseHumanResourcesOfferId,
	parseHumanResourcesPositionId,
	parseHumanResourcesRequisitionId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import {
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
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
	applicationStatusSchema,
	type CandidateStatus,
	candidateStatusSchema,
	interviewEvaluationResultSchema,
	interviewStatusSchema,
	type OfferStatus,
	offerStatusSchema,
	type RequisitionStatus,
	requisitionStatusSchema,
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

function mapNullableDepartmentId(
	value: string | null,
): Result<HumanResourcesDepartmentId | null> {
	if (value === null) {
		return ok(null);
	}
	return parseHumanResourcesDepartmentId(value);
}

function mapNullableJobId(
	value: string | null,
): Result<HumanResourcesJobId | null> {
	if (value === null) {
		return ok(null);
	}
	return parseHumanResourcesJobId(value);
}

function mapNullablePositionId(
	value: string | null,
): Result<HumanResourcesPositionId | null> {
	if (value === null) {
		return ok(null);
	}
	return parseHumanResourcesPositionId(value);
}

type RequisitionSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	title: string;
	status: string;
	job_id: string | null;
	position_id: string | null;
	department_id: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapRequisitionFields(input: {
	id: string;
	organizationId: string;
	code: string;
	title: string;
	status: string;
	jobId: string | null;
	positionId: string | null;
	departmentId: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
}): Result<JobRequisition> {
	const id = parseHumanResourcesRequisitionId(input.id);
	if (!id.ok) return id;
	const jobId = mapNullableJobId(input.jobId);
	if (!jobId.ok) return jobId;
	const positionId = mapNullablePositionId(input.positionId);
	if (!positionId.ok) return positionId;
	const departmentId = mapNullableDepartmentId(input.departmentId);
	if (!departmentId.ok) return departmentId;
	const status = requisitionStatusSchema.safeParse(input.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid requisition status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: input.organizationId,
		code: input.code,
		title: input.title,
		status: status.data,
		jobId: jobId.data,
		positionId: positionId.data,
		departmentId: departmentId.data,
		version: input.version,
		createdBy: input.createdBy,
		updatedBy: input.updatedBy,
		createdAt: input.createdAt,
		updatedAt: input.updatedAt,
	});
}

function mapRequisitionSqlRow(row: RequisitionSqlRow): Result<JobRequisition> {
	return mapRequisitionFields({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		title: row.title,
		status: row.status,
		jobId: row.job_id,
		positionId: row.position_id,
		departmentId: row.department_id,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapRequisition(
	row: typeof hrJobRequisition.$inferSelect,
): Result<JobRequisition> {
	return mapRequisitionFields({
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		title: row.title,
		status: row.status,
		jobId: row.jobId,
		positionId: row.positionId,
		departmentId: row.departmentId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

type CandidateSqlRow = {
	id: string;
	organization_id: string;
	display_name: string;
	email: string;
	phone: string | null;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapCandidateFields(input: {
	id: string;
	organizationId: string;
	displayName: string;
	email: string;
	phone: string | null;
	status: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
}): Result<Candidate> {
	const id = parseHumanResourcesCandidateId(input.id);
	if (!id.ok) return id;
	const status = candidateStatusSchema.safeParse(input.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid candidate status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: input.organizationId,
		displayName: input.displayName,
		email: input.email,
		phone: input.phone,
		status: status.data,
		version: input.version,
		createdBy: input.createdBy,
		updatedBy: input.updatedBy,
		createdAt: input.createdAt,
		updatedAt: input.updatedAt,
	});
}

function mapCandidateSqlRow(row: CandidateSqlRow): Result<Candidate> {
	return mapCandidateFields({
		id: row.id,
		organizationId: row.organization_id,
		displayName: row.display_name,
		email: row.email,
		phone: row.phone,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapCandidate(row: typeof hrCandidate.$inferSelect): Result<Candidate> {
	return mapCandidateFields({
		id: row.id,
		organizationId: row.organizationId,
		displayName: row.displayName,
		email: row.email,
		phone: row.phone,
		status: row.status,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

type ApplicationSqlRow = {
	id: string;
	organization_id: string;
	candidate_id: string;
	requisition_id: string;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapApplicationFields(input: {
	id: string;
	organizationId: string;
	candidateId: string;
	requisitionId: string;
	status: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
}): Result<CandidateApplication> {
	const id = parseHumanResourcesApplicationId(input.id);
	if (!id.ok) return id;
	const candidateId = parseHumanResourcesCandidateId(input.candidateId);
	if (!candidateId.ok) return candidateId;
	const requisitionId = parseHumanResourcesRequisitionId(input.requisitionId);
	if (!requisitionId.ok) return requisitionId;
	const status = applicationStatusSchema.safeParse(input.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid application status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: input.organizationId,
		candidateId: candidateId.data,
		requisitionId: requisitionId.data,
		status: status.data,
		version: input.version,
		createdBy: input.createdBy,
		updatedBy: input.updatedBy,
		createdAt: input.createdAt,
		updatedAt: input.updatedAt,
	});
}

function mapApplicationSqlRow(
	row: ApplicationSqlRow,
): Result<CandidateApplication> {
	return mapApplicationFields({
		id: row.id,
		organizationId: row.organization_id,
		candidateId: row.candidate_id,
		requisitionId: row.requisition_id,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapApplication(
	row: typeof hrCandidateApplication.$inferSelect,
): Result<CandidateApplication> {
	return mapApplicationFields({
		id: row.id,
		organizationId: row.organizationId,
		candidateId: row.candidateId,
		requisitionId: row.requisitionId,
		status: row.status,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

type InterviewSqlRow = {
	id: string;
	organization_id: string;
	application_id: string;
	scheduled_at: Date;
	status: string;
	interviewer_actor_id: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapInterviewFields(input: {
	id: string;
	organizationId: string;
	applicationId: string;
	scheduledAt: Date;
	status: string;
	interviewerActorId: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
}): Result<Interview> {
	const id = parseHumanResourcesInterviewId(input.id);
	if (!id.ok) return id;
	const applicationId = parseHumanResourcesApplicationId(input.applicationId);
	if (!applicationId.ok) return applicationId;
	const status = interviewStatusSchema.safeParse(input.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid interview status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: input.organizationId,
		applicationId: applicationId.data,
		scheduledAt: input.scheduledAt,
		status: status.data,
		interviewerActorId: input.interviewerActorId,
		version: input.version,
		createdBy: input.createdBy,
		updatedBy: input.updatedBy,
		createdAt: input.createdAt,
		updatedAt: input.updatedAt,
	});
}

function mapInterviewSqlRow(row: InterviewSqlRow): Result<Interview> {
	return mapInterviewFields({
		id: row.id,
		organizationId: row.organization_id,
		applicationId: row.application_id,
		scheduledAt: row.scheduled_at,
		status: row.status,
		interviewerActorId: row.interviewer_actor_id,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapInterview(row: typeof hrInterview.$inferSelect): Result<Interview> {
	return mapInterviewFields({
		id: row.id,
		organizationId: row.organizationId,
		applicationId: row.applicationId,
		scheduledAt: row.scheduledAt,
		status: row.status,
		interviewerActorId: row.interviewerActorId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

type InterviewEvaluationSqlRow = {
	id: string;
	organization_id: string;
	interview_id: string;
	result: string;
	private_notes: string | null;
	evaluator_actor_id: string;
	recorded_at: Date;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapInterviewEvaluationSqlRow(
	row: InterviewEvaluationSqlRow,
): Result<InterviewEvaluation> {
	const id = parseHumanResourcesInterviewEvaluationId(row.id);
	if (!id.ok) return id;
	const interviewId = parseHumanResourcesInterviewId(row.interview_id);
	if (!interviewId.ok) return interviewId;
	const result = interviewEvaluationResultSchema.safeParse(row.result);
	if (!result.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid interview evaluation result in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organization_id,
		interviewId: interviewId.data,
		result: result.data,
		privateNotes: row.private_notes,
		evaluatorActorId: row.evaluator_actor_id,
		recordedAt: row.recorded_at,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapInterviewEvaluation(
	row: typeof hrInterviewEvaluation.$inferSelect,
): Result<InterviewEvaluation> {
	const id = parseHumanResourcesInterviewEvaluationId(row.id);
	if (!id.ok) return id;
	const interviewId = parseHumanResourcesInterviewId(row.interviewId);
	if (!interviewId.ok) return interviewId;
	const result = interviewEvaluationResultSchema.safeParse(row.result);
	if (!result.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid interview evaluation result in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		interviewId: interviewId.data,
		result: result.data,
		privateNotes: row.privateNotes,
		evaluatorActorId: row.evaluatorActorId,
		recordedAt: row.recordedAt,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

type OfferSqlRow = {
	id: string;
	organization_id: string;
	application_id: string;
	status: string;
	terms_summary: string;
	expires_on: string;
	issued_at: Date | null;
	responded_at: Date | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapOfferFields(input: {
	id: string;
	organizationId: string;
	applicationId: string;
	status: string;
	termsSummary: string;
	expiresOn: string;
	issuedAt: Date | null;
	respondedAt: Date | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
}): Result<EmploymentOffer> {
	const id = parseHumanResourcesOfferId(input.id);
	if (!id.ok) return id;
	const applicationId = parseHumanResourcesApplicationId(input.applicationId);
	if (!applicationId.ok) return applicationId;
	const status = offerStatusSchema.safeParse(input.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid offer status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: input.organizationId,
		applicationId: applicationId.data,
		status: status.data,
		termsSummary: input.termsSummary,
		expiresOn: input.expiresOn,
		issuedAt: input.issuedAt,
		respondedAt: input.respondedAt,
		version: input.version,
		createdBy: input.createdBy,
		updatedBy: input.updatedBy,
		createdAt: input.createdAt,
		updatedAt: input.updatedAt,
	});
}

function mapOfferSqlRow(row: OfferSqlRow): Result<EmploymentOffer> {
	return mapOfferFields({
		id: row.id,
		organizationId: row.organization_id,
		applicationId: row.application_id,
		status: row.status,
		termsSummary: row.terms_summary,
		expiresOn: row.expires_on,
		issuedAt: row.issued_at,
		respondedAt: row.responded_at,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapOffer(
	row: typeof hrEmploymentOffer.$inferSelect,
): Result<EmploymentOffer> {
	return mapOfferFields({
		id: row.id,
		organizationId: row.organizationId,
		applicationId: row.applicationId,
		status: row.status,
		termsSummary: row.termsSummary,
		expiresOn: row.expiresOn,
		issuedAt: row.issuedAt,
		respondedAt: row.respondedAt,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function buildOfferAcceptanceHandoff(input: {
	organizationId: string;
	offer: EmploymentOffer;
	application: CandidateApplication;
	correlationId: string;
	acceptedAt: Date;
}): OfferAcceptanceHandoff {
	return {
		organizationId: input.organizationId,
		offerId: input.offer.id,
		applicationId: input.application.id,
		candidateId: input.application.candidateId,
		requisitionId: input.application.requisitionId,
		correlationId: input.correlationId,
		acceptedAt: input.acceptedAt,
		offer: input.offer,
	};
}

function uniqueConstraintMessage(error: unknown): string {
	if (typeof error === "object" && error !== null && "message" in error) {
		const message = (error as { message: unknown }).message;
		if (typeof message === "string") {
			return message;
		}
	}
	return error instanceof Error ? error.message : String(error);
}

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

type DrizzleRecruitmentHost = Pick<
	HumanResourcesStore,
	"getDepartmentById" | "getJobById" | "getPositionById"
>;

export type DrizzleRecruitmentMethods = Pick<
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

async function validateRequisitionReferences(
	host: DrizzleRecruitmentHost & DrizzleRecruitmentMethods,
	input: {
		organizationId: string;
		jobId: HumanResourcesJobId | null;
		positionId: HumanResourcesPositionId | null;
		departmentId: HumanResourcesDepartmentId | null;
	},
): Promise<Result<void>> {
	if (input.jobId !== null) {
		const job = await host.getJobById({
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
		const position = await host.getPositionById({
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
		const department = await host.getDepartmentById({
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

export const drizzleRecruitmentMethods: DrizzleRecruitmentMethods &
	ThisType<DrizzleRecruitmentHost & DrizzleRecruitmentMethods> = {
	async findRequisitionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentRequisitionRecord | null>> {
		try {
			const result = await db
				.select()
				.from(hrJobRequisition)
				.where(
					and(
						eq(hrJobRequisition.organizationId, input.organizationId),
						eq(hrJobRequisition.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			const mapped = mapRequisition(row);
			if (!mapped.ok) return mapped;
			return ok({
				requisition: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load requisition idempotency record",
			);
		}
	},

	async getRequisitionById(input: {
		organizationId: string;
		requisitionId: HumanResourcesRequisitionId;
	}): Promise<Result<JobRequisition | null>> {
		try {
			const result = await db
				.select()
				.from(hrJobRequisition)
				.where(
					and(
						eq(hrJobRequisition.organizationId, input.organizationId),
						eq(hrJobRequisition.id, input.requisitionId),
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapRequisition(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load requisition");
		}
	},

	async findRequisitionByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<JobRequisition | null>> {
		try {
			const result = await db
				.select()
				.from(hrJobRequisition)
				.where(
					and(
						eq(hrJobRequisition.organizationId, input.organizationId),
						eq(hrJobRequisition.code, input.code),
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapRequisition(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find requisition by code");
		}
	},

	async createDraftRequisition(
		record: RequisitionCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobRequisition>> {
		const existingByKey = await this.findRequisitionByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existingByKey.ok) return existingByKey;
		if (existingByKey.data !== null) {
			return ok(existingByKey.data.requisition);
		}

		const existingByCode = await this.findRequisitionByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existingByCode.ok) return existingByCode;
		if (existingByCode.data !== null) {
			return fail(
				"CONFLICT",
				"Requisition with this code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const refs = await validateRequisitionReferences(this, {
			organizationId: record.organizationId,
			jobId: record.jobId,
			positionId: record.positionId,
			departmentId: record.departmentId,
		});
		if (!refs.ok) return refs;

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesRequisitionId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[RequisitionSqlRow[]]>(
				(sql) => [
					sql`
							WITH mutated AS (
								INSERT INTO hr_job_requisition (
									id, organization_id, code, title, status,
									job_id, position_id, department_id,
									create_idempotency_key, create_request_fingerprint,
									version, created_by, updated_by
								) VALUES (
									${brandedId.data}, ${record.organizationId}, ${record.code}, ${record.title},
									'draft', ${record.jobId}, ${record.positionId}, ${record.departmentId},
									${record.createIdempotencyKey}, ${record.createRequestFingerprint},
									1, ${record.createdBy}, ${record.createdBy}
								)
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, created_by, ${meta.correlationId},
									'human-resources', 'hr_job_requisition', id, 'CREATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				return fail("INTERNAL_ERROR", "Requisition create returned no row");
			}
			return mapRequisitionSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				const message = uniqueConstraintMessage(error);
				if (/hr_job_requisition_org_create_idempotency_uidx/i.test(message)) {
					const existing = await this.findRequisitionByIdempotencyKey({
						organizationId: record.organizationId,
						idempotencyKey: record.createIdempotencyKey,
					});
					if (!existing.ok) return existing;
					if (existing.data !== null) {
						return ok(existing.data.requisition);
					}
				}
				if (/hr_job_requisition_org_code_uidx/i.test(message)) {
					return fail(
						"CONFLICT",
						"Requisition with this code already exists",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
					);
				}
			}
			return mapPersistenceFailure(error, "Failed to create requisition");
		}
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
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobRequisition>> {
		const existing = await this.getRequisitionById({
			organizationId: input.organizationId,
			requisitionId: input.requisitionId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Requisition not found");
		}
		const requisition = existing.data;

		const versionCheck = assertExpectedVersion(
			requisition.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const amendable = assertRequisitionAmendable(requisition.status);
		if (!amendable.ok) return amendable;

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

		const refs = await validateRequisitionReferences(this, {
			organizationId: input.organizationId,
			jobId: nextJobId,
			positionId: nextPositionId,
			departmentId: nextDepartmentId,
		});
		if (!refs.ok) return refs;

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[RequisitionSqlRow[]]>(
				(sql) => [
					sql`
							WITH mutated AS (
								UPDATE hr_job_requisition
								SET title = ${nextTitle},
									job_id = ${nextJobId},
									position_id = ${nextPositionId},
									department_id = ${nextDepartmentId},
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.requisitionId}
									AND organization_id = ${input.organizationId}
									AND version = ${input.expectedVersion}
									AND status = 'draft'
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
									'human-resources', 'hr_job_requisition', id, 'UPDATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getRequisitionById({
					organizationId: input.organizationId,
					requisitionId: input.requisitionId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Requisition",
				});
			}
			return mapRequisitionSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to amend requisition");
		}
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
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<JobRequisition>> {
		const existing = await this.getRequisitionById({
			organizationId: input.organizationId,
			requisitionId: input.requisitionId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Requisition not found");
		}
		const requisition = existing.data;

		const versionCheck = assertExpectedVersion(
			requisition.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const transition = assertRequisitionStatusTransition(
			requisition.status,
			input.status,
		);
		if (!transition.ok) return transition;

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const shouldEmitApproved =
			input.status === "approved" && input.emitApprovedEvent === true;
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_job_requisition",
			entityId: input.requisitionId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		const releaseReservationsAuditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[RequisitionSqlRow[]]>(
				(sql) => [
					shouldEmitApproved
						? sql`
								WITH mutated AS (
									UPDATE hr_job_requisition
									SET status = ${input.status},
										version = ${nextVersion},
										updated_by = ${input.actorUserId},
										updated_at = now()
									WHERE id = ${input.requisitionId}
										AND organization_id = ${input.organizationId}
										AND version = ${input.expectedVersion}
									RETURNING *
								),
								audited AS (
									INSERT INTO platform_audit_log (
										id, organization_id, actor_user_id, correlation_id, module, entity,
										entity_id, action, changes
									)
									SELECT
										${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
										'human-resources', 'hr_job_requisition', id, 'UPDATE', '[]'::jsonb
									FROM mutated
									RETURNING id
								),
								outboxed AS (
									INSERT INTO platform_domain_event (
										id, organization_id, type, source_module, correlation_id, actor_user_id,
										payload, status, attempts
									)
									SELECT
										${eventId}, organization_id, ${HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT},
										'human-resources', ${meta.correlationId}, ${input.actorUserId},
										${payloadJson}::jsonb, 'pending', 0
									FROM mutated
									RETURNING id
								),
								released_reservations AS (
									UPDATE hr_headcount_reservation r
									SET status = 'released',
										version = r.version + 1,
										updated_by = ${input.actorUserId},
										updated_at = now()
									FROM mutated m
									WHERE r.requisition_id = m.id
										AND r.organization_id = m.organization_id
										AND r.status = 'active'
										AND m.status IN ('cancelled', 'closed')
									RETURNING r.id, r.organization_id
								),
								reservations_audited AS (
									INSERT INTO platform_audit_log (
										id, organization_id, actor_user_id, correlation_id, module, entity,
										entity_id, action, changes
									)
									SELECT
										${releaseReservationsAuditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
										'human-resources', 'hr_headcount_reservation', id, 'UPDATE', '[]'::jsonb
									FROM released_reservations
									RETURNING id
								)
								SELECT mutated.* FROM mutated, audited, outboxed
								LEFT JOIN released_reservations ON true
								LEFT JOIN reservations_audited ON true
							`
						: sql`
								WITH mutated AS (
									UPDATE hr_job_requisition
									SET status = ${input.status},
										version = ${nextVersion},
										updated_by = ${input.actorUserId},
										updated_at = now()
									WHERE id = ${input.requisitionId}
										AND organization_id = ${input.organizationId}
										AND version = ${input.expectedVersion}
									RETURNING *
								),
								audited AS (
									INSERT INTO platform_audit_log (
										id, organization_id, actor_user_id, correlation_id, module, entity,
										entity_id, action, changes
									)
									SELECT
										${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
										'human-resources', 'hr_job_requisition', id, 'UPDATE', '[]'::jsonb
									FROM mutated
									RETURNING id
								),
								released_reservations AS (
									UPDATE hr_headcount_reservation r
									SET status = 'released',
										version = r.version + 1,
										updated_by = ${input.actorUserId},
										updated_at = now()
									FROM mutated m
									WHERE r.requisition_id = m.id
										AND r.organization_id = m.organization_id
										AND r.status = 'active'
										AND m.status IN ('cancelled', 'closed')
									RETURNING r.id, r.organization_id
								),
								reservations_audited AS (
									INSERT INTO platform_audit_log (
										id, organization_id, actor_user_id, correlation_id, module, entity,
										entity_id, action, changes
									)
									SELECT
										${releaseReservationsAuditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
										'human-resources', 'hr_headcount_reservation', id, 'UPDATE', '[]'::jsonb
									FROM released_reservations
									RETURNING id
								)
								SELECT mutated.* FROM mutated, audited
								LEFT JOIN released_reservations ON true
								LEFT JOIN reservations_audited ON true
							`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getRequisitionById({
					organizationId: input.organizationId,
					requisitionId: input.requisitionId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Requisition",
				});
			}
			return mapRequisitionSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to transition requisition status",
			);
		}
	},

	async listRequisitions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: RequisitionStatus;
	}): Promise<Result<RequisitionListPage>> {
		try {
			const conditions = [
				eq(hrJobRequisition.organizationId, input.organizationId),
			];
			if (input.status !== undefined) {
				conditions.push(eq(hrJobRequisition.status, input.status));
			}
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrJobRequisition)
					.where(and(...conditions))
					.orderBy(asc(hrJobRequisition.code))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrJobRequisition)
					.where(and(...conditions)),
			]);
			const requisitions: JobRequisition[] = [];
			for (const row of rows) {
				const mapped = mapRequisition(row);
				if (mapped.ok) {
					requisitions.push(mapped.data);
				}
			}
			return ok({
				requisitions,
				totalCount: countRows[0]?.count ?? 0,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list requisitions");
		}
	},

	async findCandidateByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentCandidateRecord | null>> {
		try {
			const result = await db
				.select()
				.from(hrCandidate)
				.where(
					and(
						eq(hrCandidate.organizationId, input.organizationId),
						eq(hrCandidate.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			const mapped = mapCandidate(row);
			if (!mapped.ok) return mapped;
			return ok({
				candidate: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load candidate idempotency record",
			);
		}
	},

	async getCandidateById(input: {
		organizationId: string;
		candidateId: HumanResourcesCandidateId;
	}): Promise<Result<Candidate | null>> {
		try {
			const result = await db
				.select()
				.from(hrCandidate)
				.where(
					and(
						eq(hrCandidate.organizationId, input.organizationId),
						eq(hrCandidate.id, input.candidateId),
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapCandidate(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load candidate");
		}
	},

	async findCandidateByNormalizedEmail(input: {
		organizationId: string;
		normalizedEmail: string;
	}): Promise<Result<Candidate | null>> {
		try {
			const result = await db
				.select()
				.from(hrCandidate)
				.where(
					and(
						eq(hrCandidate.organizationId, input.organizationId),
						eq(hrCandidate.normalizedEmail, input.normalizedEmail),
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapCandidate(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find candidate by normalized email",
			);
		}
	},

	async createCandidate(
		record: CandidateCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Candidate>> {
		const existingByKey = await this.findCandidateByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existingByKey.ok) return existingByKey;
		if (existingByKey.data !== null) {
			return ok(existingByKey.data.candidate);
		}

		const existingByEmail = await this.findCandidateByNormalizedEmail({
			organizationId: record.organizationId,
			normalizedEmail: record.normalizedEmail,
		});
		if (!existingByEmail.ok) return existingByEmail;
		if (existingByEmail.data !== null) {
			return fail(
				"CONFLICT",
				"Candidate with this email already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesCandidateId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[CandidateSqlRow[]]>(
				(sql) => [
					sql`
							WITH mutated AS (
								INSERT INTO hr_candidate (
									id, organization_id, display_name, email, normalized_email, phone,
									status, create_idempotency_key, create_request_fingerprint,
									version, created_by, updated_by
								) VALUES (
									${brandedId.data}, ${record.organizationId}, ${record.displayName},
									${record.email}, ${record.normalizedEmail}, ${record.phone},
									'active', ${record.createIdempotencyKey}, ${record.createRequestFingerprint},
									1, ${record.createdBy}, ${record.createdBy}
								)
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, created_by, ${meta.correlationId},
									'human-resources', 'hr_candidate', id, 'CREATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				return fail("INTERNAL_ERROR", "Candidate create returned no row");
			}
			return mapCandidateSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				const message = uniqueConstraintMessage(error);
				if (/hr_candidate_org_create_idempotency_uidx/i.test(message)) {
					const existing = await this.findCandidateByIdempotencyKey({
						organizationId: record.organizationId,
						idempotencyKey: record.createIdempotencyKey,
					});
					if (!existing.ok) return existing;
					if (existing.data !== null) {
						return ok(existing.data.candidate);
					}
				}
				if (/hr_candidate_org_normalized_email_uidx/i.test(message)) {
					return fail(
						"CONFLICT",
						"Candidate with this email already exists",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
					);
				}
			}
			return mapPersistenceFailure(error, "Failed to create candidate");
		}
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
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Candidate>> {
		const existing = await this.getCandidateById({
			organizationId: input.organizationId,
			candidateId: input.candidateId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Candidate not found");
		}
		const candidate = existing.data;

		const versionCheck = assertExpectedVersion(
			candidate.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextDisplayName =
			input.displayName !== undefined
				? input.displayName
				: candidate.displayName;
		const nextPhone = input.phone !== undefined ? input.phone : candidate.phone;

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[CandidateSqlRow[]]>(
				(sql) => [
					sql`
							WITH mutated AS (
								UPDATE hr_candidate
								SET display_name = ${nextDisplayName},
									phone = ${nextPhone},
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.candidateId}
									AND organization_id = ${input.organizationId}
									AND version = ${input.expectedVersion}
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
									'human-resources', 'hr_candidate', id, 'UPDATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getCandidateById({
					organizationId: input.organizationId,
					candidateId: input.candidateId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Candidate",
				});
			}
			return mapCandidateSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update candidate profile");
		}
	},

	async listCandidates(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CandidateStatus;
	}): Promise<Result<CandidateListPage>> {
		try {
			const conditions = [eq(hrCandidate.organizationId, input.organizationId)];
			if (input.status !== undefined) {
				conditions.push(eq(hrCandidate.status, input.status));
			}
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrCandidate)
					.where(and(...conditions))
					.orderBy(asc(hrCandidate.displayName))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrCandidate)
					.where(and(...conditions)),
			]);
			const candidates: Candidate[] = [];
			for (const row of rows) {
				const mapped = mapCandidate(row);
				if (mapped.ok) {
					candidates.push(mapped.data);
				}
			}
			return ok({
				candidates,
				totalCount: countRows[0]?.count ?? 0,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list candidates");
		}
	},

	async getApplicationById(input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}): Promise<Result<CandidateApplication | null>> {
		try {
			const result = await db
				.select()
				.from(hrCandidateApplication)
				.where(
					and(
						eq(hrCandidateApplication.organizationId, input.organizationId),
						eq(hrCandidateApplication.id, input.applicationId),
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapApplication(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load application");
		}
	},

	async findActiveApplicationByCandidateRequisition(input: {
		organizationId: string;
		candidateId: HumanResourcesCandidateId;
		requisitionId: HumanResourcesRequisitionId;
	}): Promise<Result<CandidateApplication | null>> {
		try {
			const result = await db
				.select()
				.from(hrCandidateApplication)
				.where(
					and(
						eq(hrCandidateApplication.organizationId, input.organizationId),
						eq(hrCandidateApplication.candidateId, input.candidateId),
						eq(hrCandidateApplication.requisitionId, input.requisitionId),
						sql`${hrCandidateApplication.status} NOT IN ('accepted', 'rejected', 'withdrawn')`,
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapApplication(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find active application");
		}
	},

	async createApplication(
		record: ApplicationCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CandidateApplication>> {
		const candidate = await this.getCandidateById({
			organizationId: record.organizationId,
			candidateId: record.candidateId,
		});
		if (!candidate.ok) return candidate;
		if (candidate.data === null) {
			return notFound("Candidate not found");
		}
		const activeCandidate = assertCandidateActive(candidate.data.status);
		if (!activeCandidate.ok) return activeCandidate;

		const requisition = await this.getRequisitionById({
			organizationId: record.organizationId,
			requisitionId: record.requisitionId,
		});
		if (!requisition.ok) return requisition;
		if (requisition.data === null) {
			return notFound("Requisition not found");
		}
		const openRequisition = assertRequisitionOpenForApplication(
			requisition.data.status,
		);
		if (!openRequisition.ok) return openRequisition;

		const existingActive =
			await this.findActiveApplicationByCandidateRequisition({
				organizationId: record.organizationId,
				candidateId: record.candidateId,
				requisitionId: record.requisitionId,
			});
		if (!existingActive.ok) return existingActive;
		if (existingActive.data !== null) {
			return conflict(
				"An active application already exists for this candidate and requisition",
			);
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesApplicationId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[ApplicationSqlRow[]]>(
				(sql) => [
					sql`
							WITH candidate_ref AS (
								SELECT id, organization_id
								FROM hr_candidate
								WHERE id = ${record.candidateId}
									AND organization_id = ${record.organizationId}
									AND status = 'active'
							),
							requisition_ref AS (
								SELECT id, organization_id
								FROM hr_job_requisition
								WHERE id = ${record.requisitionId}
									AND organization_id = ${record.organizationId}
									AND status = 'open'
							),
							mutated AS (
								INSERT INTO hr_candidate_application (
									id, organization_id, candidate_id, requisition_id, status,
									version, created_by, updated_by
								)
								SELECT
									${brandedId.data}, candidate_ref.organization_id,
									candidate_ref.id, requisition_ref.id, 'submitted',
									1, ${record.createdBy}, ${record.createdBy}
								FROM candidate_ref, requisition_ref
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, created_by, ${meta.correlationId},
									'human-resources', 'hr_candidate_application', id, 'CREATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				const candidateAgain = await this.getCandidateById({
					organizationId: record.organizationId,
					candidateId: record.candidateId,
				});
				if (!candidateAgain.ok) return candidateAgain;
				if (candidateAgain.data === null) {
					return notFound("Candidate not found");
				}
				if (candidateAgain.data.status !== "active") {
					const activeCheck = assertCandidateActive(candidateAgain.data.status);
					if (!activeCheck.ok) return activeCheck;
				}
				const requisitionAgain = await this.getRequisitionById({
					organizationId: record.organizationId,
					requisitionId: record.requisitionId,
				});
				if (!requisitionAgain.ok) return requisitionAgain;
				if (requisitionAgain.data === null) {
					return notFound("Requisition not found");
				}
				const openCheck = assertRequisitionOpenForApplication(
					requisitionAgain.data.status,
				);
				if (!openCheck.ok) return openCheck;
				return conflict("Could not create application");
			}
			return mapApplicationSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				const message = uniqueConstraintMessage(error);
				if (
					/hr_candidate_application_org_candidate_requisition_open_uidx/i.test(
						message,
					)
				) {
					return conflict(
						"An active application already exists for this candidate and requisition",
					);
				}
			}
			return mapPersistenceFailure(error, "Failed to create application");
		}
	},

	async transitionApplicationStatus(
		input: {
			organizationId: string;
			applicationId: HumanResourcesApplicationId;
			status: ApplicationStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<CandidateApplication>> {
		const existing = await this.getApplicationById({
			organizationId: input.organizationId,
			applicationId: input.applicationId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Application not found");
		}
		const application = existing.data;

		const versionCheck = assertExpectedVersion(
			application.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const transition = assertApplicationStatusTransition(
			application.status,
			input.status,
		);
		if (!transition.ok) return transition;

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[ApplicationSqlRow[]]>(
				(sql) => [
					sql`
							WITH mutated AS (
								UPDATE hr_candidate_application
								SET status = ${input.status},
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.applicationId}
									AND organization_id = ${input.organizationId}
									AND version = ${input.expectedVersion}
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
									'human-resources', 'hr_candidate_application', id, 'UPDATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getApplicationById({
					organizationId: input.organizationId,
					applicationId: input.applicationId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Application",
				});
			}
			return mapApplicationSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to transition application status",
			);
		}
	},

	async listApplications(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: ApplicationStatus;
		candidateId?: HumanResourcesCandidateId;
		requisitionId?: HumanResourcesRequisitionId;
	}): Promise<Result<ApplicationListPage>> {
		try {
			const conditions = [
				eq(hrCandidateApplication.organizationId, input.organizationId),
			];
			if (input.status !== undefined) {
				conditions.push(eq(hrCandidateApplication.status, input.status));
			}
			if (input.candidateId !== undefined) {
				conditions.push(
					eq(hrCandidateApplication.candidateId, input.candidateId),
				);
			}
			if (input.requisitionId !== undefined) {
				conditions.push(
					eq(hrCandidateApplication.requisitionId, input.requisitionId),
				);
			}
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrCandidateApplication)
					.where(and(...conditions))
					.orderBy(desc(hrCandidateApplication.createdAt))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrCandidateApplication)
					.where(and(...conditions)),
			]);
			const applications: CandidateApplication[] = [];
			for (const row of rows) {
				const mapped = mapApplication(row);
				if (mapped.ok) {
					applications.push(mapped.data);
				}
			}
			return ok({
				applications,
				totalCount: countRows[0]?.count ?? 0,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list applications");
		}
	},

	async getInterviewById(input: {
		organizationId: string;
		interviewId: HumanResourcesInterviewId;
	}): Promise<Result<Interview | null>> {
		try {
			const result = await db
				.select()
				.from(hrInterview)
				.where(
					and(
						eq(hrInterview.organizationId, input.organizationId),
						eq(hrInterview.id, input.interviewId),
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapInterview(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load interview");
		}
	},

	async scheduleInterview(
		record: InterviewScheduleRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Interview>> {
		const application = await this.getApplicationById({
			organizationId: record.organizationId,
			applicationId: record.applicationId,
		});
		if (!application.ok) return application;
		if (application.data === null) {
			return notFound("Application not found");
		}
		const schedulable = assertInterviewSchedulable(application.data.status);
		if (!schedulable.ok) return schedulable;

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesInterviewId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const scheduledAt = new Date(record.scheduledAt);
		try {
			const [rows] = await runNeonHttpTransaction<[InterviewSqlRow[]]>(
				(sql) => [
					sql`
							WITH application_ref AS (
								SELECT id, organization_id
								FROM hr_candidate_application
								WHERE id = ${record.applicationId}
									AND organization_id = ${record.organizationId}
									AND status IN ('submitted', 'in_review', 'interviewing')
							),
							mutated AS (
								INSERT INTO hr_interview (
									id, organization_id, application_id, scheduled_at, status,
									interviewer_actor_id, version, created_by, updated_by
								)
								SELECT
									${brandedId.data}, application_ref.organization_id,
									application_ref.id, ${scheduledAt}, 'scheduled',
									${record.interviewerActorId}, 1, ${record.createdBy}, ${record.createdBy}
								FROM application_ref
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, created_by, ${meta.correlationId},
									'human-resources', 'hr_interview', id, 'CREATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				const applicationAgain = await this.getApplicationById({
					organizationId: record.organizationId,
					applicationId: record.applicationId,
				});
				if (!applicationAgain.ok) return applicationAgain;
				if (applicationAgain.data === null) {
					return notFound("Application not found");
				}
				const schedulableCheck = assertInterviewSchedulable(
					applicationAgain.data.status,
				);
				if (!schedulableCheck.ok) return schedulableCheck;
				return conflict("Could not schedule interview");
			}
			return mapInterviewSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to schedule interview");
		}
	},

	async cancelInterview(
		input: {
			organizationId: string;
			interviewId: HumanResourcesInterviewId;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Interview>> {
		const existing = await this.getInterviewById({
			organizationId: input.organizationId,
			interviewId: input.interviewId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Interview not found");
		}
		const interview = existing.data;

		const versionCheck = assertExpectedVersion(
			interview.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const transition = assertInterviewStatusTransition(
			interview.status,
			"cancelled",
		);
		if (!transition.ok) return transition;

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[InterviewSqlRow[]]>(
				(sql) => [
					sql`
							WITH mutated AS (
								UPDATE hr_interview
								SET status = 'cancelled',
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.interviewId}
									AND organization_id = ${input.organizationId}
									AND version = ${input.expectedVersion}
									AND status = 'scheduled'
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
									'human-resources', 'hr_interview', id, 'UPDATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getInterviewById({
					organizationId: input.organizationId,
					interviewId: input.interviewId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Interview",
				});
			}
			return mapInterviewSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to cancel interview");
		}
	},

	async listInterviews(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		applicationId?: HumanResourcesApplicationId;
	}): Promise<Result<InterviewListPage>> {
		try {
			const conditions = [eq(hrInterview.organizationId, input.organizationId)];
			if (input.applicationId !== undefined) {
				conditions.push(eq(hrInterview.applicationId, input.applicationId));
			}
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select({
						id: hrInterview.id,
						organizationId: hrInterview.organizationId,
						applicationId: hrInterview.applicationId,
						scheduledAt: hrInterview.scheduledAt,
						status: hrInterview.status,
						interviewerActorId: hrInterview.interviewerActorId,
						version: hrInterview.version,
						createdBy: hrInterview.createdBy,
						updatedBy: hrInterview.updatedBy,
						createdAt: hrInterview.createdAt,
						updatedAt: hrInterview.updatedAt,
					})
					.from(hrInterview)
					.where(and(...conditions))
					.orderBy(asc(hrInterview.scheduledAt))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrInterview)
					.where(and(...conditions)),
			]);
			const interviews: Interview[] = [];
			for (const row of rows) {
				const mapped = mapInterview({
					...row,
					organizationId: row.organizationId,
				});
				if (mapped.ok) {
					interviews.push(mapped.data);
				}
			}
			return ok({
				interviews,
				totalCount: countRows[0]?.count ?? 0,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list interviews");
		}
	},

	async getInterviewEvaluationByInterviewId(input: {
		organizationId: string;
		interviewId: HumanResourcesInterviewId;
	}): Promise<Result<InterviewEvaluation | null>> {
		try {
			const result = await db
				.select()
				.from(hrInterviewEvaluation)
				.where(
					and(
						eq(hrInterviewEvaluation.organizationId, input.organizationId),
						eq(hrInterviewEvaluation.interviewId, input.interviewId),
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapInterviewEvaluation(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load interview evaluation",
			);
		}
	},

	async recordInterviewEvaluation(
		record: InterviewEvaluationCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<InterviewEvaluation>> {
		const interview = await this.getInterviewById({
			organizationId: record.organizationId,
			interviewId: record.interviewId,
		});
		if (!interview.ok) return interview;
		if (interview.data === null) {
			return notFound("Interview not found");
		}

		const existingEvaluation = await this.getInterviewEvaluationByInterviewId({
			organizationId: record.organizationId,
			interviewId: record.interviewId,
		});
		if (!existingEvaluation.ok) return existingEvaluation;
		if (existingEvaluation.data !== null) {
			return conflict("Interview evaluation already recorded");
		}

		const versionCheck = assertExpectedVersion(
			interview.data.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const completeTransition = assertInterviewStatusTransition(
			interview.data.status,
			"completed",
		);
		if (!completeTransition.ok) return completeTransition;

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesInterviewEvaluationId(entityId);
		if (!brandedId.ok) return brandedId;
		const interviewAuditId = randomUUID();
		const evaluationAuditId = randomUUID();
		const nextInterviewVersion = record.expectedVersion + 1;
		const recordedAt = new Date();
		try {
			const [rows] = await runNeonHttpTransaction<
				[InterviewEvaluationSqlRow[]]
			>((sql) => [
				sql`
						WITH completed_interview AS (
							UPDATE hr_interview
							SET status = 'completed',
								version = ${nextInterviewVersion},
								updated_by = ${record.createdBy},
								updated_at = now()
							WHERE id = ${record.interviewId}
								AND organization_id = ${record.organizationId}
								AND version = ${record.expectedVersion}
								AND status = 'scheduled'
							RETURNING *
						),
						interview_audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${interviewAuditId}, organization_id, ${record.createdBy}, ${meta.correlationId},
								'human-resources', 'hr_interview', id, 'UPDATE', '[]'::jsonb
							FROM completed_interview
							RETURNING id
						),
						mutated AS (
							INSERT INTO hr_interview_evaluation (
								id, organization_id, interview_id, result, private_notes,
								evaluator_actor_id, recorded_at, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, completed_interview.organization_id,
								completed_interview.id, ${record.result}, ${record.privateNotes},
								${record.evaluatorActorId}, ${recordedAt}, 1,
								${record.createdBy}, ${record.createdBy}
							FROM completed_interview
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${evaluationAuditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_interview_evaluation', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, completed_interview, interview_audited, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				const again = await this.getInterviewById({
					organizationId: record.organizationId,
					interviewId: record.interviewId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Interview",
				});
			}
			return mapInterviewEvaluationSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				const message = uniqueConstraintMessage(error);
				if (/hr_interview_evaluation_org_interview_uidx/i.test(message)) {
					return conflict("Interview evaluation already recorded");
				}
			}
			return mapPersistenceFailure(
				error,
				"Failed to record interview evaluation",
			);
		}
	},

	async getOfferById(input: {
		organizationId: string;
		offerId: HumanResourcesOfferId;
	}): Promise<Result<EmploymentOffer | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmploymentOffer)
				.where(
					and(
						eq(hrEmploymentOffer.organizationId, input.organizationId),
						eq(hrEmploymentOffer.id, input.offerId),
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapOffer(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load offer");
		}
	},

	async findActiveOfferByApplication(input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}): Promise<Result<EmploymentOffer | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmploymentOffer)
				.where(
					and(
						eq(hrEmploymentOffer.organizationId, input.organizationId),
						eq(hrEmploymentOffer.applicationId, input.applicationId),
						sql`${hrEmploymentOffer.status} IN ('draft', 'issued')`,
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapOffer(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find active offer");
		}
	},

	async findOfferByAcceptIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentOfferAcceptRecord | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmploymentOffer)
				.where(
					and(
						eq(hrEmploymentOffer.organizationId, input.organizationId),
						eq(hrEmploymentOffer.acceptIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const offerRow = result[0];
			if (offerRow === undefined) {
				return ok(null);
			}
			const mappedOffer = mapOffer(offerRow);
			if (!mappedOffer.ok) return mappedOffer;
			const application = await this.getApplicationById({
				organizationId: input.organizationId,
				applicationId: mappedOffer.data.applicationId,
			});
			if (!application.ok) return application;
			if (application.data === null) {
				return fail(
					"INTERNAL_ERROR",
					"Application for accepted offer not found",
				);
			}
			const acceptedAt =
				mappedOffer.data.respondedAt ?? mappedOffer.data.updatedAt;
			return ok({
				handoff: buildOfferAcceptanceHandoff({
					organizationId: input.organizationId,
					offer: mappedOffer.data,
					application: application.data,
					correlationId: "",
					acceptedAt,
				}),
				acceptRequestFingerprint: offerRow.acceptRequestFingerprint ?? "",
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load offer accept idempotency record",
			);
		}
	},

	async createOffer(
		record: OfferCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentOffer>> {
		const application = await this.getApplicationById({
			organizationId: record.organizationId,
			applicationId: record.applicationId,
		});
		if (!application.ok) return application;
		if (application.data === null) {
			return notFound("Application not found");
		}
		const eligible = assertApplicationEligibleForOffer(application.data.status);
		if (!eligible.ok) return eligible;

		const existingActive = await this.findActiveOfferByApplication({
			organizationId: record.organizationId,
			applicationId: record.applicationId,
		});
		if (!existingActive.ok) return existingActive;
		if (existingActive.data !== null) {
			return conflict("An active offer already exists for this application");
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesOfferId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[OfferSqlRow[]]>((sql) => [
				sql`
						WITH application_ref AS (
							SELECT id, organization_id
							FROM hr_candidate_application
							WHERE id = ${record.applicationId}
								AND organization_id = ${record.organizationId}
								AND status IN ('in_review', 'interviewing')
						),
						mutated AS (
							INSERT INTO hr_employment_offer (
								id, organization_id, application_id, status, terms_summary, expires_on,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, application_ref.organization_id,
								application_ref.id, 'draft', ${record.termsSummary}, ${record.expiresOn},
								1, ${record.createdBy}, ${record.createdBy}
							FROM application_ref
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_employment_offer', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				const applicationAgain = await this.getApplicationById({
					organizationId: record.organizationId,
					applicationId: record.applicationId,
				});
				if (!applicationAgain.ok) return applicationAgain;
				if (applicationAgain.data === null) {
					return notFound("Application not found");
				}
				const eligibleCheck = assertApplicationEligibleForOffer(
					applicationAgain.data.status,
				);
				if (!eligibleCheck.ok) return eligibleCheck;
				return conflict("Could not create offer");
			}
			return mapOfferSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				const message = uniqueConstraintMessage(error);
				if (
					/hr_employment_offer_org_application_draft_issued_uidx/i.test(message)
				) {
					return conflict(
						"An active offer already exists for this application",
					);
				}
			}
			return mapPersistenceFailure(error, "Failed to create offer");
		}
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
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentOffer>> {
		const existing = await this.getOfferById({
			organizationId: input.organizationId,
			offerId: input.offerId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Offer not found");
		}
		const offer = existing.data;

		const versionCheck = assertExpectedVersion(
			offer.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const amendable = assertOfferAmendable(offer.status);
		if (!amendable.ok) return amendable;

		const nextTermsSummary =
			input.termsSummary !== undefined
				? input.termsSummary
				: offer.termsSummary;
		const nextExpiresOn =
			input.expiresOn !== undefined ? input.expiresOn : offer.expiresOn;

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[OfferSqlRow[]]>((sql) => [
				sql`
						WITH mutated AS (
							UPDATE hr_employment_offer
							SET terms_summary = ${nextTermsSummary},
								expires_on = ${nextExpiresOn},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.offerId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'draft'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employment_offer', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				const again = await this.getOfferById({
					organizationId: input.organizationId,
					offerId: input.offerId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Offer",
				});
			}
			return mapOfferSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to amend offer draft");
		}
	},

	async transitionOfferStatus(
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			status: OfferStatus;
			expectedVersion: number;
			actorUserId: string;
			asOfDate?: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentOffer>> {
		const existing = await this.getOfferById({
			organizationId: input.organizationId,
			offerId: input.offerId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Offer not found");
		}
		const offer = existing.data;

		const versionCheck = assertExpectedVersion(
			offer.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const transition = assertOfferStatusTransition(offer.status, input.status);
		if (!transition.ok) return transition;

		if (input.status === "issued") {
			const application = await this.getApplicationById({
				organizationId: input.organizationId,
				applicationId: offer.applicationId,
			});
			if (!application.ok) return application;
			if (application.data === null) {
				return notFound("Application not found");
			}
			const applicationTransition = assertApplicationStatusTransition(
				application.data.status,
				"offered",
			);
			if (!applicationTransition.ok) return applicationTransition;
		}

		const auditId = randomUUID();
		const applicationAuditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const setRespondedAt =
			input.status === "declined" ||
			input.status === "expired" ||
			input.status === "withdrawn";

		try {
			if (input.status === "issued") {
				const [rows] = await runNeonHttpTransaction<[OfferSqlRow[]]>((sql) => [
					sql`
								WITH updated_offer AS (
									UPDATE hr_employment_offer
									SET status = 'issued',
										issued_at = now(),
										version = ${nextVersion},
										updated_by = ${input.actorUserId},
										updated_at = now()
									WHERE id = ${input.offerId}
										AND organization_id = ${input.organizationId}
										AND version = ${input.expectedVersion}
										AND status = 'draft'
									RETURNING *
								),
								offer_audited AS (
									INSERT INTO platform_audit_log (
										id, organization_id, actor_user_id, correlation_id, module, entity,
										entity_id, action, changes
									)
									SELECT
										${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
										'human-resources', 'hr_employment_offer', id, 'UPDATE', '[]'::jsonb
									FROM updated_offer
									RETURNING id
								),
								updated_application AS (
									UPDATE hr_candidate_application a
									SET status = 'offered',
										version = a.version + 1,
										updated_by = ${input.actorUserId},
										updated_at = now()
									FROM updated_offer o
									WHERE a.id = o.application_id
										AND a.organization_id = o.organization_id
										AND a.status IN ('in_review', 'interviewing')
									RETURNING a.*
								),
								application_audited AS (
									INSERT INTO platform_audit_log (
										id, organization_id, actor_user_id, correlation_id, module, entity,
										entity_id, action, changes
									)
									SELECT
										${applicationAuditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
										'human-resources', 'hr_candidate_application', id, 'UPDATE', '[]'::jsonb
									FROM updated_application
									RETURNING id
								)
								SELECT updated_offer.* FROM updated_offer, offer_audited, updated_application, application_audited
							`,
				]);
				const row = rows[0];
				if (!row) {
					const again = await this.getOfferById({
						organizationId: input.organizationId,
						offerId: input.offerId,
					});
					if (!again.ok) return again;
					return missAfterOptimisticUpdate({
						found: again.data !== null,
						entityLabel: "Offer",
					});
				}
				return mapOfferSqlRow(row);
			}

			const [rows] = await runNeonHttpTransaction<[OfferSqlRow[]]>((sql) => [
				sql`
						WITH mutated AS (
							UPDATE hr_employment_offer
							SET status = ${input.status},
								responded_at = CASE
									WHEN ${setRespondedAt} THEN now()
									ELSE responded_at
								END,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.offerId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employment_offer', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				const again = await this.getOfferById({
					organizationId: input.organizationId,
					offerId: input.offerId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Offer",
				});
			}
			return mapOfferSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to transition offer status");
		}
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
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<OfferAcceptanceHandoff>> {
		const existingByKey = await this.findOfferByAcceptIdempotencyKey({
			organizationId: input.organizationId,
			idempotencyKey: input.idempotencyKey,
		});
		if (!existingByKey.ok) return existingByKey;
		if (existingByKey.data !== null) {
			return ok({
				...existingByKey.data.handoff,
				correlationId: meta.correlationId,
			});
		}

		const existing = await this.getOfferById({
			organizationId: input.organizationId,
			offerId: input.offerId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Offer not found");
		}
		const offer = existing.data;

		const versionCheck = assertExpectedVersion(
			offer.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const acceptable = assertOfferAcceptable({
			status: offer.status,
			expiresOn: offer.expiresOn,
			asOfDate: input.asOfDate,
		});
		if (!acceptable.ok) return acceptable;

		const application = await this.getApplicationById({
			organizationId: input.organizationId,
			applicationId: offer.applicationId,
		});
		if (!application.ok) return application;
		if (application.data === null) {
			return notFound("Application not found");
		}
		const applicationRecord = application.data;
		const applicationTransition = assertApplicationStatusTransition(
			applicationRecord.status,
			"accepted",
		);
		if (!applicationTransition.ok) return applicationTransition;

		const offerAuditId = randomUUID();
		const applicationAuditId = randomUUID();
		const eventId = randomUUID();
		const reservationAuditId = randomUUID();
		const nextOfferVersion = input.expectedVersion + 1;
		const nextApplicationVersion = applicationRecord.version + 1;
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employment_offer",
			entityId: input.offerId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<
				[
					(OfferSqlRow & {
						application_id: string;
						candidate_id: string;
						requisition_id: string;
					})[],
				]
			>((sql) => [
				sql`
						WITH updated_offer AS (
							UPDATE hr_employment_offer
							SET status = 'accepted',
								responded_at = now(),
								accept_idempotency_key = ${input.idempotencyKey},
								accept_request_fingerprint = ${input.acceptRequestFingerprint},
								version = ${nextOfferVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.offerId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'issued'
								AND expires_on >= ${input.asOfDate}::date
							RETURNING *
						),
						offer_audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${offerAuditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employment_offer', id, 'UPDATE', '[]'::jsonb
							FROM updated_offer
							RETURNING id
						),
						updated_application AS (
							UPDATE hr_candidate_application a
							SET status = 'accepted',
								version = ${nextApplicationVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM updated_offer o
							WHERE a.id = o.application_id
								AND a.organization_id = o.organization_id
								AND a.status = 'offered'
								AND a.version = ${applicationRecord.version}
							RETURNING a.*
						),
						application_audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${applicationAuditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_candidate_application', id, 'UPDATE', '[]'::jsonb
							FROM updated_application
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadJson}::jsonb, 'pending', 0
							FROM updated_offer
							RETURNING id
						),
						consumed_reservation AS (
							UPDATE hr_headcount_reservation r
							SET status = 'consumed',
								version = r.version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM updated_application ua
							WHERE r.requisition_id = ua.requisition_id
								AND r.organization_id = ua.organization_id
								AND r.status = 'active'
							RETURNING r.id, r.organization_id
						),
						reservation_audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${reservationAuditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_headcount_reservation', id, 'UPDATE', '[]'::jsonb
							FROM consumed_reservation
							RETURNING id
						)
						SELECT
							updated_offer.*,
							updated_application.candidate_id,
							updated_application.requisition_id
						FROM updated_offer, offer_audited, updated_application, application_audited, outboxed
						LEFT JOIN consumed_reservation ON true
						LEFT JOIN reservation_audited ON true
					`,
			]);
			const row = rows[0];
			if (!row) {
				const idempotent = await this.findOfferByAcceptIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!idempotent.ok) return idempotent;
				if (idempotent.data !== null) {
					return ok({
						...idempotent.data.handoff,
						correlationId: meta.correlationId,
					});
				}
				const again = await this.getOfferById({
					organizationId: input.organizationId,
					offerId: input.offerId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Offer",
				});
			}

			const mappedOffer = mapOfferSqlRow(row);
			if (!mappedOffer.ok) return mappedOffer;

			const candidateId = parseHumanResourcesCandidateId(row.candidate_id);
			if (!candidateId.ok) return candidateId;
			const requisitionId = parseHumanResourcesRequisitionId(
				row.requisition_id,
			);
			if (!requisitionId.ok) return requisitionId;

			const acceptedAt = mappedOffer.data.respondedAt ?? new Date();
			return ok(
				buildOfferAcceptanceHandoff({
					organizationId: input.organizationId,
					offer: mappedOffer.data,
					application: {
						id: mappedOffer.data.applicationId,
						organizationId: input.organizationId,
						candidateId: candidateId.data,
						requisitionId: requisitionId.data,
						status: "accepted",
						version: nextApplicationVersion,
						createdBy: applicationRecord.createdBy,
						updatedBy: input.actorUserId,
						createdAt: applicationRecord.createdAt,
						updatedAt: acceptedAt,
					},
					correlationId: meta.correlationId,
					acceptedAt,
				}),
			);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				const message = uniqueConstraintMessage(error);
				if (/hr_employment_offer_org_accept_idempotency_uidx/i.test(message)) {
					const idempotent = await this.findOfferByAcceptIdempotencyKey({
						organizationId: input.organizationId,
						idempotencyKey: input.idempotencyKey,
					});
					if (!idempotent.ok) return idempotent;
					if (idempotent.data !== null) {
						return ok({
							...idempotent.data.handoff,
							correlationId: meta.correlationId,
						});
					}
				}
			}
			return mapPersistenceFailure(error, "Failed to accept offer");
		}
	},

	async listOffers(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: OfferStatus;
		applicationId?: HumanResourcesApplicationId;
	}): Promise<Result<OfferListPage>> {
		try {
			const conditions = [
				eq(hrEmploymentOffer.organizationId, input.organizationId),
			];
			if (input.status !== undefined) {
				conditions.push(eq(hrEmploymentOffer.status, input.status));
			}
			if (input.applicationId !== undefined) {
				conditions.push(
					eq(hrEmploymentOffer.applicationId, input.applicationId),
				);
			}
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrEmploymentOffer)
					.where(and(...conditions))
					.orderBy(desc(hrEmploymentOffer.createdAt))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrEmploymentOffer)
					.where(and(...conditions)),
			]);
			const offers: EmploymentOffer[] = [];
			for (const row of rows) {
				const mapped = mapOffer(row);
				if (mapped.ok) {
					offers.push(mapped.data);
				}
			}
			return ok({
				offers,
				totalCount: countRows[0]?.count ?? 0,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list offers");
		}
	},
};

export function attachDrizzleRecruitment(target: DrizzleRecruitmentHost): void {
	Object.assign(target, drizzleRecruitmentMethods);
}

import { randomUUID } from "node:crypto";
import {
	audit as afendaAudit,
	type PreparedDerivedEntityAuditInsertValues,
	type PreparedTransactionalAuditInsertValues,
} from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	asc,
	desc,
	eq,
	hrCandidate,
	hrCandidateApplication,
	hrCandidateApplicationStatusHistory,
	hrEmploymentOffer,
	hrInterview,
	hrInterviewEvaluation,
	hrJobRequisition,
	lte,
	or,
	sql,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
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
} from "../../../composition/store/index";
import type {
	ApplicationListPage,
	ApplicationStatusHistory,
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
} from "../../../kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../../kernel/emissions/mutation-meta";
import { planRecruitmentMutationOutboxEventType } from "../../../kernel/emissions/sql-side-effects";
import { assertExpectedVersion } from "../../../kernel/execution/concurrency";
import {
	conflict,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../../kernel/execution/domain-guards";
import {
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	humanResourcesErrorDetails,
} from "../../../kernel/execution/error-codes";
import {
	isPostgresUniqueConstraint,
	mapPersistenceFailure,
} from "../../../kernel/execution/persistence-errors";
import type { MutationPorts } from "../../../kernel/execution/ports";
import {
	type HumanResourcesApplicationId,
	type HumanResourcesCandidateId,
	type HumanResourcesCompensationProposalId,
	type HumanResourcesDepartmentId,
	type HumanResourcesEmployeeId,
	type HumanResourcesInterviewId,
	type HumanResourcesJobId,
	type HumanResourcesOfferId,
	type HumanResourcesPositionId,
	type HumanResourcesRequisitionId,
	parseHumanResourcesApplicationId,
	parseHumanResourcesCandidateId,
	parseHumanResourcesCompensationProposalId,
	parseHumanResourcesDepartmentId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesInterviewEvaluationId,
	parseHumanResourcesInterviewId,
	parseHumanResourcesJobId,
	parseHumanResourcesOfferId,
	parseHumanResourcesPositionId,
	parseHumanResourcesRequisitionId,
} from "../../../kernel/identity/brands";
import {
	HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE,
	type HumanResourcesCommandId,
} from "../../../kernel/operations/module-ids";
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
} from "../guards";
import { interviewScorecardSchema } from "../schema";
import {
	type ApplicationStatus,
	applicationStatusSchema,
	type CandidateConsentSource,
	type CandidateStatus,
	candidateConsentSourceSchema,
	candidateStatusSchema,
	interviewEvaluationResultSchema,
	interviewStatusSchema,
	type OfferStatus,
	offerStatusSchema,
	type RequisitionStatus,
	requisitionStatusSchema,
} from "../status";
import { validateOfferCompensationProposalAttachment } from "../validate-offer-compensation-proposal-attachment";

const HR_REGEX_1 = /hr_job_requisition_org_create_idempotency_uidx/i;
const HR_REGEX_2 = /hr_job_requisition_org_code_uidx/i;
const HR_REGEX_3 = /hr_candidate_org_create_idempotency_uidx/i;
const HR_REGEX_4 = /hr_candidate_org_normalized_email_uidx/i;
const HR_REGEX_5 =
	/hr_candidate_application_org_candidate_requisition_open_uidx/i;
const HR_REGEX_6 = /hr_interview_evaluation_org_interview_uidx/i;
const HR_REGEX_7 = /hr_employment_offer_org_application_draft_issued_uidx/i;
const HR_REGEX_8 = /hr_employment_offer_org_accept_idempotency_uidx/i;

const RECRUITMENT_AUDIT_SOURCE = "human-resources.recruitment-drizzle";

type RecruitmentAuditEntity =
	| "hr_candidate"
	| "hr_candidate_application"
	| "hr_employment_offer"
	| "hr_headcount_reservation"
	| "hr_interview"
	| "hr_interview_evaluation"
	| "hr_job_requisition";

interface RecruitmentAuditInput {
	action: "CREATE" | "UPDATE";
	actorUserId: string;
	correlationId: string;
	entity: RecruitmentAuditEntity;
	entityId: string;
	meta: HumanResourcesMutationMeta;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
	reasonCode: string;
}

function recruitmentAuditEventContext(input: {
	correlationId: string;
	meta: HumanResourcesMutationMeta;
	reasonCode: string;
}) {
	return {
		version: 1 as const,
		outcome: "SUCCEEDED" as const,
		source: RECRUITMENT_AUDIT_SOURCE,
		causationId:
			input.meta.causationId ??
			input.meta.idempotencyKey ??
			input.correlationId,
		reasonCode: input.reasonCode,
	};
}

function prepareRecruitmentAudit(
	input: RecruitmentAuditInput,
): Result<PreparedTransactionalAuditInsertValues> {
	return afendaAudit.transaction.prepare({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: input.entity,
		entityId: input.entityId,
		action: input.action,
		oldValue: input.oldValue ?? null,
		newValue: input.newValue ?? null,
		eventContext: recruitmentAuditEventContext(input),
	});
}

function prepareDerivedRecruitmentAudit(
	input: Omit<RecruitmentAuditInput, "entityId">,
): Result<PreparedDerivedEntityAuditInsertValues> {
	return afendaAudit.transaction.prepareDerived({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: input.entity,
		action: input.action,
		oldValue: input.oldValue ?? null,
		newValue: input.newValue ?? null,
		eventContext: recruitmentAuditEventContext(input),
	});
}

function mapNullableDepartmentId(
	value: string | null,
): Result<HumanResourcesDepartmentId | null> {
	if (value === null) {
		return errorResult.ok(null);
	}
	return parseHumanResourcesDepartmentId(value);
}

function mapNullableJobId(
	value: string | null,
): Result<HumanResourcesJobId | null> {
	if (value === null) {
		return errorResult.ok(null);
	}
	return parseHumanResourcesJobId(value);
}

function mapNullablePositionId(
	value: string | null,
): Result<HumanResourcesPositionId | null> {
	if (value === null) {
		return errorResult.ok(null);
	}
	return parseHumanResourcesPositionId(value);
}

function mapNullableEmployeeId(
	value: string | null,
): Result<HumanResourcesEmployeeId | null> {
	if (value === null) {
		return errorResult.ok(null);
	}
	return parseHumanResourcesEmployeeId(value);
}

interface RequisitionSqlRow {
	code: string;
	created_at: Date;
	created_by: string;
	department_id: string | null;
	hiring_manager_employee_id: string | null;
	id: string;
	job_id: string | null;
	organization_id: string;
	position_id: string | null;
	status: string;
	title: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

function mapRequisitionFields(input: {
	id: string;
	organizationId: string;
	code: string;
	title: string;
	status: string;
	jobId: string | null;
	positionId: string | null;
	departmentId: string | null;
	hiringManagerEmployeeId: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
}): Result<JobRequisition> {
	const id = parseHumanResourcesRequisitionId(input.id);
	if (!id.ok) {
		return id;
	}
	const jobId = mapNullableJobId(input.jobId);
	if (!jobId.ok) {
		return jobId;
	}
	const positionId = mapNullablePositionId(input.positionId);
	if (!positionId.ok) {
		return positionId;
	}
	const departmentId = mapNullableDepartmentId(input.departmentId);
	if (!departmentId.ok) {
		return departmentId;
	}
	const hiringManagerEmployeeId = mapNullableEmployeeId(
		input.hiringManagerEmployeeId,
	);
	if (!hiringManagerEmployeeId.ok) {
		return hiringManagerEmployeeId;
	}
	const status = requisitionStatusSchema.safeParse(input.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok({
		id: id.data,
		organizationId: input.organizationId,
		code: input.code,
		title: input.title,
		status: status.data,
		jobId: jobId.data,
		positionId: positionId.data,
		departmentId: departmentId.data,
		hiringManagerEmployeeId: hiringManagerEmployeeId.data,
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
		hiringManagerEmployeeId: row.hiring_manager_employee_id,
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
		hiringManagerEmployeeId: row.hiringManagerEmployeeId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

interface CandidateSqlRow {
	consent_captured_at: Date | string | null;
	consent_policy_version: string | null;
	consent_source: string | null;
	consent_withdrawn_at: Date | string | null;
	created_at: Date | string;
	created_by: string;
	display_name: string;
	email: string;
	id: string;
	organization_id: string;
	phone: string | null;
	retention_until: string | null;
	status: string;
	updated_at: Date | string;
	updated_by: string;
	version: number;
}

function coercePersistedTimestamp(value: Date | string | null): Date | null {
	if (value === null) {
		return null;
	}
	return value instanceof Date ? value : new Date(value);
}

function parsePersistedCandidateConsentSource(
	value: string | null,
): Result<CandidateConsentSource | null> {
	if (value === null) {
		return errorResult.ok(null);
	}
	const parsed = candidateConsentSourceSchema.safeParse(value);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok(parsed.data);
}

function mapCandidateFields(input: {
	id: string;
	organizationId: string;
	displayName: string;
	email: string;
	phone: string | null;
	consentPolicyVersion: string | null;
	consentCapturedAt: Date | string | null;
	consentSource: string | null;
	retentionUntil: string | null;
	consentWithdrawnAt: Date | string | null;
	status: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date | string;
	updatedAt: Date | string;
}): Result<Candidate> {
	const id = parseHumanResourcesCandidateId(input.id);
	if (!id.ok) {
		return id;
	}
	const status = candidateStatusSchema.safeParse(input.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	const consentSource = parsePersistedCandidateConsentSource(
		input.consentSource,
	);
	if (!consentSource.ok) {
		return consentSource;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: input.organizationId,
		displayName: input.displayName,
		email: input.email,
		phone: input.phone,
		consentPolicyVersion: input.consentPolicyVersion,
		consentCapturedAt: coercePersistedTimestamp(input.consentCapturedAt),
		consentSource: consentSource.data,
		retentionUntil: input.retentionUntil,
		consentWithdrawnAt: coercePersistedTimestamp(input.consentWithdrawnAt),
		status: status.data,
		version: input.version,
		createdBy: input.createdBy,
		updatedBy: input.updatedBy,
		createdAt: coercePersistedTimestamp(input.createdAt) ?? new Date(0),
		updatedAt: coercePersistedTimestamp(input.updatedAt) ?? new Date(0),
	});
}

function mapCandidateSqlRow(row: CandidateSqlRow): Result<Candidate> {
	return mapCandidateFields({
		id: row.id,
		organizationId: row.organization_id,
		displayName: row.display_name,
		email: row.email,
		phone: row.phone,
		consentPolicyVersion: row.consent_policy_version,
		consentCapturedAt: row.consent_captured_at,
		consentSource: row.consent_source,
		retentionUntil: row.retention_until,
		consentWithdrawnAt: row.consent_withdrawn_at,
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
		consentPolicyVersion: row.consentPolicyVersion,
		consentCapturedAt: row.consentCapturedAt,
		consentSource: row.consentSource,
		retentionUntil: row.retentionUntil,
		consentWithdrawnAt: row.consentWithdrawnAt,
		status: row.status,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

interface ApplicationSqlRow {
	candidate_id: string;
	created_at: Date;
	created_by: string;
	id: string;
	organization_id: string;
	requisition_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

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
	if (!id.ok) {
		return id;
	}
	const candidateId = parseHumanResourcesCandidateId(input.candidateId);
	if (!candidateId.ok) {
		return candidateId;
	}
	const requisitionId = parseHumanResourcesRequisitionId(input.requisitionId);
	if (!requisitionId.ok) {
		return requisitionId;
	}
	const status = applicationStatusSchema.safeParse(input.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok({
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

interface ApplicationStatusHistorySqlRow {
	actor_user_id: string;
	application_id: string;
	candidate_id: string;
	change_kind: string;
	correlation_id: string;
	created_at: Date;
	from_status: string | null;
	id: string;
	organization_id: string;
	reason: string | null;
	reason_code: string | null;
	requisition_id: string;
	to_status: string;
}

function mapApplicationStatusHistorySqlRow(
	row: ApplicationStatusHistorySqlRow,
): Result<ApplicationStatusHistory> {
	const applicationId = parseHumanResourcesApplicationId(row.application_id);
	if (!applicationId.ok) {
		return applicationId;
	}
	const candidateId = parseHumanResourcesCandidateId(row.candidate_id);
	if (!candidateId.ok) {
		return candidateId;
	}
	const requisitionId = parseHumanResourcesRequisitionId(row.requisition_id);
	if (!requisitionId.ok) {
		return requisitionId;
	}
	const statusParse = applicationStatusSchema.safeParse(row.to_status);
	if (!statusParse.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	let fromStatus: ApplicationStatus | null = null;
	if (row.from_status !== null) {
		const parsed = applicationStatusSchema.safeParse(row.from_status);
		if (!parsed.success) {
			return errorResult.fail("INTERNAL_ERROR", {
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_INVALID_INPUT,
				),
			});
		}
		fromStatus = parsed.data;
	}
	const changeKind =
		row.change_kind === "create" || row.change_kind === "lifecycle"
			? row.change_kind
			: null;
	if (changeKind === null) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok({
		id: row.id,
		organizationId: row.organization_id,
		applicationId: applicationId.data,
		candidateId: candidateId.data,
		requisitionId: requisitionId.data,
		fromStatus,
		toStatus: statusParse.data,
		changeKind,
		reason: row.reason,
		reasonCode: row.reason_code,
		correlationId: row.correlation_id,
		actorUserId: row.actor_user_id,
		createdAt: row.created_at,
	});
}

function mapApplicationStatusHistory(
	row: typeof hrCandidateApplicationStatusHistory.$inferSelect,
): Result<ApplicationStatusHistory> {
	return mapApplicationStatusHistorySqlRow({
		id: row.id,
		organization_id: row.organizationId,
		application_id: row.applicationId,
		candidate_id: row.candidateId,
		requisition_id: row.requisitionId,
		from_status: row.fromStatus,
		to_status: row.toStatus,
		change_kind: row.changeKind,
		reason: row.reason,
		reason_code: row.reasonCode,
		correlation_id: row.correlationId,
		actor_user_id: row.actorUserId,
		created_at: row.createdAt,
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

interface InterviewSqlRow {
	application_id: string;
	created_at: Date;
	created_by: string;
	id: string;
	interviewer_actor_id: string;
	organization_id: string;
	scheduled_at: Date;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

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
	if (!id.ok) {
		return id;
	}
	const applicationId = parseHumanResourcesApplicationId(input.applicationId);
	if (!applicationId.ok) {
		return applicationId;
	}
	const status = interviewStatusSchema.safeParse(input.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok({
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

interface InterviewEvaluationSqlRow {
	created_at: Date;
	created_by: string;
	evaluator_actor_id: string;
	id: string;
	interview_id: string;
	organization_id: string;
	private_notes: string | null;
	recorded_at: Date;
	result: string;
	scorecard_json: unknown;
	updated_at: Date;
	updated_by: string;
	version: number;
}

function parsePersistedInterviewScorecard(
	value: unknown,
): Result<InterviewEvaluation["scorecard"]> {
	const parsed = interviewScorecardSchema.safeParse(value);
	if (!parsed.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok(parsed.data);
}

function mapInterviewEvaluationSqlRow(
	row: InterviewEvaluationSqlRow,
): Result<InterviewEvaluation> {
	const id = parseHumanResourcesInterviewEvaluationId(row.id);
	if (!id.ok) {
		return id;
	}
	const interviewId = parseHumanResourcesInterviewId(row.interview_id);
	if (!interviewId.ok) {
		return interviewId;
	}
	const result = interviewEvaluationResultSchema.safeParse(row.result);
	if (!result.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	const scorecard = parsePersistedInterviewScorecard(row.scorecard_json);
	if (!scorecard.ok) {
		return scorecard;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organization_id,
		interviewId: interviewId.data,
		result: result.data,
		scorecard: scorecard.data,
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
	if (!id.ok) {
		return id;
	}
	const interviewId = parseHumanResourcesInterviewId(row.interviewId);
	if (!interviewId.ok) {
		return interviewId;
	}
	const result = interviewEvaluationResultSchema.safeParse(row.result);
	if (!result.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	const scorecard = parsePersistedInterviewScorecard(row.scorecardJson);
	if (!scorecard.ok) {
		return scorecard;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		interviewId: interviewId.data,
		result: result.data,
		scorecard: scorecard.data,
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

interface OfferSqlRow {
	application_id: string;
	compensation_proposal_id: string | null;
	created_at: Date;
	created_by: string;
	expires_on: string;
	id: string;
	issued_at: Date | null;
	organization_id: string;
	responded_at: Date | null;
	status: string;
	terms_summary: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

function mapOfferFields(input: {
	id: string;
	organizationId: string;
	applicationId: string;
	compensationProposalId: string | null;
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
	if (!id.ok) {
		return id;
	}
	const applicationId = parseHumanResourcesApplicationId(input.applicationId);
	if (!applicationId.ok) {
		return applicationId;
	}
	let compensationProposalId =
		null as EmploymentOffer["compensationProposalId"];
	if (input.compensationProposalId !== null) {
		const parsed = parseHumanResourcesCompensationProposalId(
			input.compensationProposalId,
		);
		if (!parsed.ok) {
			return parsed;
		}
		compensationProposalId = parsed.data;
	}
	const status = offerStatusSchema.safeParse(input.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR", {
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_INVALID_INPUT,
			),
		});
	}
	return errorResult.ok({
		id: id.data,
		organizationId: input.organizationId,
		applicationId: applicationId.data,
		status: status.data,
		termsSummary: input.termsSummary,
		expiresOn: input.expiresOn,
		compensationProposalId,
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
		compensationProposalId: row.compensation_proposal_id,
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
		compensationProposalId: row.compensationProposalId,
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

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

function planRecruitmentDrizzleOutbox(input: {
	commandId: HumanResourcesCommandId;
	meta: HumanResourcesMutationMeta;
	organizationId: string;
	actorUserId: string;
	aggregateId: string;
	entityType: string;
	auditAction: "CREATE" | "UPDATE";
	conditionalEventSuppressed?: boolean | undefined;
}):
	| {
			eventType: NonNullable<
				ReturnType<typeof planRecruitmentMutationOutboxEventType>
			>;
			payloadJson: string;
	  }
	| undefined {
	const eventType = planRecruitmentMutationOutboxEventType({
		commandId: input.commandId,
		meta: input.meta,
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		aggregateId: input.aggregateId,
		audit: {
			entity: input.entityType,
			action: input.auditAction,
			changes: [],
		},
		eventEntityId: input.aggregateId,
		eventEntityType: input.entityType,
		conditionalEventSuppressed: input.conditionalEventSuppressed,
	});
	if (eventType === undefined) {
		return;
	}
	return {
		eventType,
		payloadJson: eventPayloadJson({
			organizationId: input.organizationId,
			entityType: input.entityType,
			entityId: input.aggregateId,
			actorId: input.actorUserId,
			correlationId: input.meta.correlationId,
			operation: input.meta.operationId,
		}),
	};
}

type DrizzleRecruitmentHost = Pick<
	HumanResourcesStore,
	| "getDepartmentById"
	| "getJobById"
	| "getPositionById"
	| "getCompensationProposal"
>;

export type DrizzleRecruitmentMethods = Pick<
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
		const position = await host.getPositionById({
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
		const department = await host.getDepartmentById({
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
	return errorResult.ok(undefined);
}

export const drizzleRecruitmentMethods: DrizzleRecruitmentMethods &
	ThisType<DrizzleRecruitmentHost & DrizzleRecruitmentMethods> = {
	async findRequisitionByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentRequisitionRecord | null>> {
		try {
			const result = await afendaDatabase.client
				.select()
				.from(hrJobRequisition)
				.where(
					and(
						eq(hrJobRequisition.organizationId, input.organizationId),
						eq(hrJobRequisition.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			const mapped = mapRequisition(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
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
			const result = await afendaDatabase.client
				.select()
				.from(hrJobRequisition)
				.where(
					and(
						eq(hrJobRequisition.organizationId, input.organizationId),
						eq(hrJobRequisition.id, input.requisitionId),
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return errorResult.ok(null);
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
			const result = await afendaDatabase.client
				.select()
				.from(hrJobRequisition)
				.where(
					and(
						eq(hrJobRequisition.organizationId, input.organizationId),
						eq(hrJobRequisition.code, input.code),
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			return mapRequisition(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find requisition by code");
		}
	},

	async createDraftRequisition(
		record: RequisitionCreateRecord,
		_ports: MutationPorts,
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
			return errorResult.ok(existingByKey.data.requisition);
		}

		const existingByCode = await this.findRequisitionByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existingByCode.ok) {
			return existingByCode;
		}
		if (existingByCode.data !== null) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_DUPLICATE,
				),
			});
		}

		const refs = await validateRequisitionReferences(this, {
			organizationId: record.organizationId,
			jobId: record.jobId,
			positionId: record.positionId,
			departmentId: record.departmentId,
		});
		if (!refs.ok) {
			return refs;
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesRequisitionId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedAudit = prepareRecruitmentAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_job_requisition",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: { status: "draft", version: 1 },
			meta,
			reasonCode: "REQUISITION_CREATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue19) => [
				sqlValue19`
							WITH mutated AS (
								INSERT INTO hr_job_requisition (
									id, organization_id, code, title, status,
									job_id, position_id, department_id, hiring_manager_employee_id,
									create_idempotency_key, create_request_fingerprint,
									version, created_by, updated_by
								) VALUES (
									${brandedId.data}, ${record.organizationId}, ${record.code}, ${record.title},
									'draft', ${record.jobId}, ${record.positionId}, ${record.departmentId},
									${record.hiringManagerEmployeeId},
									${record.createIdempotencyKey}, ${record.createRequestFingerprint},
									1, ${record.createdBy}, ${record.createdBy}
								)
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
			]);
			const [row] = rows;
			if (!row) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return mapRequisitionSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueConstraint(error, HR_REGEX_1)) {
				const existing = await this.findRequisitionByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!existing.ok) {
					return existing;
				}
				if (existing.data !== null) {
					return errorResult.ok(existing.data.requisition);
				}
			}
			if (isPostgresUniqueConstraint(error, HR_REGEX_2)) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DUPLICATE,
					),
				});
			}
			return mapPersistenceFailure(error, "Failed to create requisition");
		}
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
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<JobRequisition>> {
		const existing = await this.getRequisitionById({
			organizationId: input.organizationId,
			requisitionId: input.requisitionId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Requisition not found");
		}
		const requisition = existing.data;

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
			input.title === undefined ? requisition.title : input.title;
		const nextJobId =
			input.jobId === undefined ? requisition.jobId : input.jobId;
		const nextPositionId =
			input.positionId === undefined
				? requisition.positionId
				: input.positionId;
		const nextDepartmentId =
			input.departmentId === undefined
				? requisition.departmentId
				: input.departmentId;
		const nextHiringManagerEmployeeId =
			input.hiringManagerEmployeeId === undefined
				? requisition.hiringManagerEmployeeId
				: input.hiringManagerEmployeeId;

		const refs = await validateRequisitionReferences(this, {
			organizationId: input.organizationId,
			jobId: nextJobId,
			positionId: nextPositionId,
			departmentId: nextDepartmentId,
		});
		if (!refs.ok) {
			return refs;
		}

		const preparedAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_job_requisition",
			entityId: input.requisitionId,
			action: "UPDATE",
			oldValue: { version: input.expectedVersion },
			newValue: { version: input.expectedVersion + 1 },
			meta,
			reasonCode: "REQUISITION_AMENDED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue18) => [
				sqlValue18`
							WITH mutated AS (
								UPDATE hr_job_requisition
								SET title = ${nextTitle},
									job_id = ${nextJobId},
									position_id = ${nextPositionId},
									department_id = ${nextDepartmentId},
									hiring_manager_employee_id = ${nextHiringManagerEmployeeId},
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
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getRequisitionById({
					organizationId: input.organizationId,
					requisitionId: input.requisitionId,
				});
				if (!again.ok) {
					return again;
				}
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

	async assignHiringManager(
		input: {
			organizationId: string;
			requisitionId: HumanResourcesRequisitionId;
			hiringManagerEmployeeId: HumanResourcesEmployeeId;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<JobRequisition>> {
		const existing = await this.getRequisitionById({
			organizationId: input.organizationId,
			requisitionId: input.requisitionId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Requisition not found");
		}
		const requisition = existing.data;

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

		const preparedAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_job_requisition",
			entityId: input.requisitionId,
			action: "UPDATE",
			oldValue: { version: input.expectedVersion },
			newValue: { version: input.expectedVersion + 1 },
			meta,
			reasonCode: "REQUISITION_HIRING_MANAGER_ASSIGNED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue17) => [
				sqlValue17`
							WITH mutated AS (
								UPDATE hr_job_requisition
								SET hiring_manager_employee_id = ${input.hiringManagerEmployeeId},
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.requisitionId}
									AND organization_id = ${input.organizationId}
									AND version = ${input.expectedVersion}
									AND status NOT IN ('closed', 'cancelled')
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getRequisitionById({
					organizationId: input.organizationId,
					requisitionId: input.requisitionId,
				});
				if (!again.ok) {
					return again;
				}
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Requisition",
				});
			}
			return mapRequisitionSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to assign requisition hiring manager",
			);
		}
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
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<JobRequisition>> {
		const existing = await this.getRequisitionById({
			organizationId: input.organizationId,
			requisitionId: input.requisitionId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Requisition not found");
		}
		const requisition = existing.data;

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

		const preparedAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_job_requisition",
			entityId: input.requisitionId,
			action: "UPDATE",
			oldValue: {
				status: requisition.status,
				version: input.expectedVersion,
			},
			newValue: { status: input.status, version: input.expectedVersion + 1 },
			meta,
			reasonCode: "REQUISITION_STATUS_TRANSITIONED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const preparedReleasedReservationsAudit = prepareDerivedRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_headcount_reservation",
			action: "UPDATE",
			oldValue: { status: "active" },
			newValue: { status: "released" },
			meta,
			reasonCode: "HEADCOUNT_RESERVATIONS_RELEASED",
		});
		if (!preparedReleasedReservationsAudit.ok) {
			return preparedReleasedReservationsAudit;
		}
		const releasedReservationsAudit = preparedReleasedReservationsAudit.data;
		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const plannedOutbox = planRecruitmentDrizzleOutbox({
			commandId: meta.operationId,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.requisitionId,
			entityType: "hr_job_requisition",
			auditAction: "UPDATE",
			conditionalEventSuppressed:
				meta.operationId === HUMAN_RESOURCES_COMMAND_REQUISITION_APPROVE &&
				!(input.status === "approved" && input.emitApprovedEvent === true),
		});
		const eventId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue16) => [
				plannedOutbox
					? sqlValue16`
								WITH mutated AS (
									UPDATE hr_job_requisition AS requisition
									SET status = ${input.status},
										version = ${nextVersion},
										updated_by = ${input.actorUserId},
										updated_at = now()
									WHERE requisition.id = ${input.requisitionId}
										AND requisition.organization_id = ${input.organizationId}
										AND requisition.version = ${input.expectedVersion}
									RETURNING requisition.*
								),
								audited AS (
									INSERT INTO platform_audit_log (
										id, organization_id, actor_user_id, correlation_id, module, entity,
										entity_id, action, changes, old_value, new_value, metadata,
										ip_address, user_agent
									)
									SELECT 										${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 										${audit.correlationId}, ${audit.module}, ${audit.entity}, 										id, ${audit.action}, ${audit.changesJson}::jsonb, 										${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 										${audit.metadataJson}::jsonb, ${audit.ipAddress}, 										${audit.userAgent}
									FROM mutated
									RETURNING id
								),
								outboxed AS (
									INSERT INTO platform_domain_event (
										id, organization_id, type, source_module, correlation_id, actor_user_id,
										payload, status, attempts
									)
									SELECT
										${eventId}, organization_id, ${plannedOutbox.eventType},
										'human-resources', ${meta.correlationId}, ${input.actorUserId},
										${plannedOutbox.payloadJson}::jsonb, 'pending', 0
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
										entity_id, action, changes, old_value, new_value, metadata,
										ip_address, user_agent
									)
									SELECT 										gen_random_uuid(), ${releasedReservationsAudit.organizationId}, ${releasedReservationsAudit.actorUserId}, 										${releasedReservationsAudit.correlationId}, ${releasedReservationsAudit.module}, ${releasedReservationsAudit.entity}, 										id, ${releasedReservationsAudit.action}, ${releasedReservationsAudit.changesJson}::jsonb, 										${releasedReservationsAudit.oldValueJson}::jsonb, ${releasedReservationsAudit.newValueJson}::jsonb, 										${releasedReservationsAudit.metadataJson}::jsonb, ${releasedReservationsAudit.ipAddress}, 										${releasedReservationsAudit.userAgent}
									FROM released_reservations
									RETURNING id
								)
								SELECT mutated.* FROM mutated, audited, outboxed
								LEFT JOIN released_reservations ON true
								LEFT JOIN reservations_audited ON true
							`
					: sqlValue16`
								WITH mutated AS (
									UPDATE hr_job_requisition AS requisition
									SET status = ${input.status},
										version = ${nextVersion},
										updated_by = ${input.actorUserId},
										updated_at = now()
									WHERE requisition.id = ${input.requisitionId}
										AND requisition.organization_id = ${input.organizationId}
										AND requisition.version = ${input.expectedVersion}
									RETURNING requisition.*
								),
								audited AS (
									INSERT INTO platform_audit_log (
										id, organization_id, actor_user_id, correlation_id, module, entity,
										entity_id, action, changes, old_value, new_value, metadata,
										ip_address, user_agent
									)
									SELECT 										${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 										${audit.correlationId}, ${audit.module}, ${audit.entity}, 										id, ${audit.action}, ${audit.changesJson}::jsonb, 										${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 										${audit.metadataJson}::jsonb, ${audit.ipAddress}, 										${audit.userAgent}
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
										entity_id, action, changes, old_value, new_value, metadata,
										ip_address, user_agent
									)
									SELECT 										gen_random_uuid(), ${releasedReservationsAudit.organizationId}, ${releasedReservationsAudit.actorUserId}, 										${releasedReservationsAudit.correlationId}, ${releasedReservationsAudit.module}, ${releasedReservationsAudit.entity}, 										id, ${releasedReservationsAudit.action}, ${releasedReservationsAudit.changesJson}::jsonb, 										${releasedReservationsAudit.oldValueJson}::jsonb, ${releasedReservationsAudit.newValueJson}::jsonb, 										${releasedReservationsAudit.metadataJson}::jsonb, ${releasedReservationsAudit.ipAddress}, 										${releasedReservationsAudit.userAgent}
									FROM released_reservations
									RETURNING id
								)
								SELECT mutated.* FROM mutated, audited
								LEFT JOIN released_reservations ON true
								LEFT JOIN reservations_audited ON true
							`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getRequisitionById({
					organizationId: input.organizationId,
					requisitionId: input.requisitionId,
				});
				if (!again.ok) {
					return again;
				}
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
		status?: RequisitionStatus | undefined;
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
				afendaDatabase.client
					.select()
					.from(hrJobRequisition)
					.where(and(...conditions))
					.orderBy(asc(hrJobRequisition.code))
					.limit(input.pageSize)
					.offset(offset),
				afendaDatabase.client
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
			return errorResult.ok({
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
			const result = await afendaDatabase.client
				.select()
				.from(hrCandidate)
				.where(
					and(
						eq(hrCandidate.organizationId, input.organizationId),
						eq(hrCandidate.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			const mapped = mapCandidate(row);
			if (!mapped.ok) {
				return mapped;
			}
			return errorResult.ok({
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
			const result = await afendaDatabase.client
				.select()
				.from(hrCandidate)
				.where(
					and(
						eq(hrCandidate.organizationId, input.organizationId),
						eq(hrCandidate.id, input.candidateId),
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return errorResult.ok(null);
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
			const result = await afendaDatabase.client
				.select()
				.from(hrCandidate)
				.where(
					and(
						eq(hrCandidate.organizationId, input.organizationId),
						eq(hrCandidate.normalizedEmail, input.normalizedEmail),
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return errorResult.ok(null);
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
			return errorResult.ok(existingByKey.data.candidate);
		}

		const existingByEmail = await this.findCandidateByNormalizedEmail({
			organizationId: record.organizationId,
			normalizedEmail: record.normalizedEmail,
		});
		if (!existingByEmail.ok) {
			return existingByEmail;
		}
		if (existingByEmail.data !== null) {
			return errorResult.fail("CONFLICT", {
				publicMessage: "The request conflicts with current state",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_DUPLICATE,
				),
			});
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesCandidateId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const plannedOutbox = planRecruitmentDrizzleOutbox({
			commandId: meta.operationId,
			meta,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			aggregateId: brandedId.data,
			entityType: "hr_candidate",
			auditAction: "CREATE",
		});
		if (plannedOutbox === undefined) {
			return invalidState("Candidate create requires a domain event");
		}
		const preparedAudit = prepareRecruitmentAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_candidate",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: {
				status: "active",
				consentCaptured: true,
				version: 1,
			},
			meta,
			reasonCode: "CANDIDATE_CREATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue15) => [
				sqlValue15`
							WITH mutated AS (
								INSERT INTO hr_candidate (
									id, organization_id, display_name, email, normalized_email, phone,
									consent_policy_version, consent_captured_at, consent_source,
									retention_until, consent_withdrawn_at,
									status, create_idempotency_key, create_request_fingerprint,
									version, created_by, updated_by
								) VALUES (
									${brandedId.data}, ${record.organizationId}, ${record.displayName},
									${record.email}, ${record.normalizedEmail}, ${record.phone},
									${record.consentPolicyVersion}, ${record.consentCapturedAt},
									${record.consentSource}, ${record.retentionUntil}, NULL,
									'active', ${record.createIdempotencyKey}, ${record.createRequestFingerprint},
									1, ${record.createdBy}, ${record.createdBy}
								)
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							),
							outboxed AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id, actor_user_id,
									payload, status, attempts
								)
								SELECT
									${eventId}, organization_id, ${plannedOutbox.eventType},
									'human-resources', ${meta.correlationId}, created_by,
									${plannedOutbox.payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
						`,
			]);
			const [row] = rows;
			if (!row) {
				return errorResult.fail("INTERNAL_ERROR");
			}
			return mapCandidateSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueConstraint(error, HR_REGEX_3)) {
				const existing = await this.findCandidateByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!existing.ok) {
					return existing;
				}
				if (existing.data !== null) {
					return errorResult.ok(existing.data.candidate);
				}
			}
			if (isPostgresUniqueConstraint(error, HR_REGEX_4)) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_DUPLICATE,
					),
				});
			}
			return mapPersistenceFailure(error, "Failed to create candidate");
		}
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
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Candidate>> {
		const existing = await this.getCandidateById({
			organizationId: input.organizationId,
			candidateId: input.candidateId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Candidate not found");
		}
		const candidate = existing.data;

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

		const nextDisplayName =
			input.displayName === undefined
				? candidate.displayName
				: input.displayName;
		const nextPhone = input.phone === undefined ? candidate.phone : input.phone;

		const preparedAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_candidate",
			entityId: input.candidateId,
			action: "UPDATE",
			oldValue: { version: input.expectedVersion },
			newValue: { version: input.expectedVersion + 1 },
			meta,
			reasonCode: "CANDIDATE_PROFILE_UPDATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue14) => [
				sqlValue14`
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
									AND status <> 'anonymized'
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getCandidateById({
					organizationId: input.organizationId,
					candidateId: input.candidateId,
				});
				if (!again.ok) {
					return again;
				}
				if (again.data?.status === "anonymized") {
					return invalidState("Candidate has been anonymized");
				}
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

	async withdrawCandidateConsent(
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Candidate>> {
		const existing = await this.getCandidateById({
			organizationId: input.organizationId,
			candidateId: input.candidateId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Candidate not found");
		}
		const candidate = existing.data;

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

		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const plannedOutbox = planRecruitmentDrizzleOutbox({
			commandId: meta.operationId,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.candidateId,
			entityType: "hr_candidate",
			auditAction: "UPDATE",
		});
		if (plannedOutbox === undefined) {
			return invalidState(
				"Candidate consent withdrawal requires a domain event",
			);
		}
		const preparedAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_candidate",
			entityId: input.candidateId,
			action: "UPDATE",
			oldValue: { consentWithdrawn: false, version: input.expectedVersion },
			newValue: { consentWithdrawn: true, version: input.expectedVersion + 1 },
			meta,
			reasonCode: "CANDIDATE_CONSENT_WITHDRAWN",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue13) => [
				sqlValue13`
							WITH mutated AS (
								UPDATE hr_candidate
								SET consent_withdrawn_at = now(),
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.candidateId}
									AND organization_id = ${input.organizationId}
									AND version = ${input.expectedVersion}
									AND consent_withdrawn_at IS NULL
									AND status <> 'anonymized'
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							),
							outboxed AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id, actor_user_id,
									payload, status, attempts
								)
								SELECT
									${eventId}, organization_id, ${plannedOutbox.eventType},
									'human-resources', ${meta.correlationId}, ${input.actorUserId},
									${plannedOutbox.payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
						`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getCandidateById({
					organizationId: input.organizationId,
					candidateId: input.candidateId,
				});
				if (!again.ok) {
					return again;
				}
				if (again.data === null) {
					return notFound("Candidate not found");
				}
				if (again.data.consentWithdrawnAt !== null) {
					return conflict("Candidate consent has already been withdrawn");
				}
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Candidate",
				});
			}
			return mapCandidateSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to withdraw candidate consent",
			);
		}
	},

	async changeCandidateRetention(
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			retentionUntil: string;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Candidate>> {
		const existing = await this.getCandidateById({
			organizationId: input.organizationId,
			candidateId: input.candidateId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Candidate not found");
		}
		const candidate = existing.data;

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

		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const plannedOutbox = planRecruitmentDrizzleOutbox({
			commandId: meta.operationId,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.candidateId,
			entityType: "hr_candidate",
			auditAction: "UPDATE",
		});
		if (plannedOutbox === undefined) {
			return invalidState("Candidate retention change requires a domain event");
		}
		const preparedAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_candidate",
			entityId: input.candidateId,
			action: "UPDATE",
			oldValue: { version: input.expectedVersion },
			newValue: { version: input.expectedVersion + 1 },
			meta,
			reasonCode: "CANDIDATE_RETENTION_CHANGED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue12) => [
				sqlValue12`
							WITH mutated AS (
								UPDATE hr_candidate
								SET retention_until = ${input.retentionUntil},
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.candidateId}
									AND organization_id = ${input.organizationId}
									AND version = ${input.expectedVersion}
									AND consent_withdrawn_at IS NULL
									AND status <> 'anonymized'
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							),
							outboxed AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id, actor_user_id,
									payload, status, attempts
								)
								SELECT
									${eventId}, organization_id, ${plannedOutbox.eventType},
									'human-resources', ${meta.correlationId}, ${input.actorUserId},
									${plannedOutbox.payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
						`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getCandidateById({
					organizationId: input.organizationId,
					candidateId: input.candidateId,
				});
				if (!again.ok) {
					return again;
				}
				if (again.data === null) {
					return notFound("Candidate not found");
				}
				if (again.data.consentWithdrawnAt !== null) {
					return invalidState(
						"Cannot change retention after candidate consent withdrawal",
					);
				}
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Candidate",
				});
			}
			return mapCandidateSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to change candidate retention",
			);
		}
	},

	async anonymizeCandidate(
		input: {
			organizationId: string;
			candidateId: HumanResourcesCandidateId;
			expectedVersion: number;
			actorUserId: string;
			asOf: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Candidate>> {
		const existing = await this.getCandidateById({
			organizationId: input.organizationId,
			candidateId: input.candidateId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Candidate not found");
		}
		const candidate = existing.data;

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

		const scrubbedEmail = anonymizedCandidateEmail(candidate.id);
		const scrubbedNormalizedEmail = normalizeCandidateEmail(scrubbedEmail);
		const auditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const plannedOutbox = planRecruitmentDrizzleOutbox({
			commandId: meta.operationId,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.candidateId,
			entityType: "hr_candidate",
			auditAction: "UPDATE",
		});
		if (plannedOutbox === undefined) {
			return invalidState("Candidate anonymization requires a domain event");
		}
		const preparedAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_candidate",
			entityId: input.candidateId,
			action: "UPDATE",
			oldValue: { status: candidate.status, version: input.expectedVersion },
			newValue: { status: "anonymized", version: input.expectedVersion + 1 },
			meta,
			reasonCode: "CANDIDATE_ANONYMIZED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((txSql) => [
				txSql`
							WITH mutated AS (
								UPDATE hr_candidate
								SET display_name = ${ANONYMIZED_CANDIDATE_DISPLAY_NAME},
									email = ${scrubbedEmail},
									normalized_email = ${scrubbedNormalizedEmail},
									phone = NULL,
									status = 'anonymized',
									version = ${nextVersion},
									updated_by = ${input.actorUserId},
									updated_at = now()
								WHERE id = ${input.candidateId}
									AND organization_id = ${input.organizationId}
									AND version = ${input.expectedVersion}
									AND status <> 'anonymized'
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							),
							outboxed AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id, actor_user_id,
									payload, status, attempts
								)
								SELECT
									${eventId}, organization_id, ${plannedOutbox.eventType},
									'human-resources', ${meta.correlationId}, ${input.actorUserId},
									${plannedOutbox.payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
						`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getCandidateById({
					organizationId: input.organizationId,
					candidateId: input.candidateId,
				});
				if (!again.ok) {
					return again;
				}
				if (again.data === null) {
					return notFound("Candidate not found");
				}
				if (again.data.status === "anonymized") {
					return invalidState("Candidate has already been anonymized");
				}
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Candidate",
				});
			}
			return mapCandidateSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to anonymize candidate");
		}
	},

	async listCandidates(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: CandidateStatus | undefined;
		retentionDueAsOf?: string | undefined;
		query?: string | undefined;
	}): Promise<Result<CandidateListPage>> {
		try {
			const conditions = [eq(hrCandidate.organizationId, input.organizationId)];
			if (input.status !== undefined) {
				conditions.push(eq(hrCandidate.status, input.status));
			}
			if (input.retentionDueAsOf !== undefined) {
				conditions.push(sql`${hrCandidate.retentionUntil} IS NOT NULL`);
				conditions.push(
					lte(hrCandidate.retentionUntil, input.retentionDueAsOf),
				);
			}
			if (input.query !== undefined) {
				const needle = `%${input.query.trim()}%`;
				conditions.push(
					sql`(
						${hrCandidate.displayName} ILIKE ${needle}
						OR ${hrCandidate.email} ILIKE ${needle}
						OR ${hrCandidate.normalizedEmail} ILIKE ${needle}
					)`,
				);
			}
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				afendaDatabase.client
					.select()
					.from(hrCandidate)
					.where(and(...conditions))
					.orderBy(asc(hrCandidate.displayName))
					.limit(input.pageSize)
					.offset(offset),
				afendaDatabase.client
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
			return errorResult.ok({
				candidates,
				totalCount: countRows[0]?.count ?? 0,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list candidates");
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async detectCandidateDuplicates(input: {
		organizationId: string;
		email?: string | undefined;
		displayName?: string | undefined;
	}): Promise<Result<readonly CandidateDuplicateMatch[]>> {
		try {
			const conditions = [
				eq(hrCandidate.organizationId, input.organizationId),
				sql`${hrCandidate.status} <> 'anonymized'`,
			];
			const normalizedEmail =
				input.email === undefined
					? undefined
					: normalizeCandidateEmail(input.email);
			const normalizedDisplayName =
				input.displayName === undefined
					? undefined
					: input.displayName.trim().toLowerCase();
			const emailMatch =
				normalizedEmail === undefined
					? undefined
					: eq(hrCandidate.normalizedEmail, normalizedEmail);
			const nameMatch =
				normalizedDisplayName === undefined
					? undefined
					: sql`lower(trim(${hrCandidate.displayName})) = ${normalizedDisplayName}`;
			if (emailMatch !== undefined && nameMatch !== undefined) {
				const combinedMatch = or(emailMatch, nameMatch);
				if (combinedMatch !== undefined) {
					conditions.push(combinedMatch);
				}
			} else if (emailMatch !== undefined) {
				conditions.push(emailMatch);
			} else if (nameMatch === undefined) {
				return errorResult.ok([]);
			} else {
				conditions.push(nameMatch);
			}

			const rows = await afendaDatabase.client
				.select()
				.from(hrCandidate)
				.where(and(...conditions))
				.orderBy(asc(hrCandidate.displayName));

			const results: CandidateDuplicateMatch[] = [];
			for (const row of rows) {
				const mapped = mapCandidate(row);
				if (!mapped.ok) {
					continue;
				}
				const reasons: CandidateDuplicateMatchReason[] = [];
				if (
					normalizedEmail !== undefined &&
					normalizeCandidateEmail(mapped.data.email) === normalizedEmail
				) {
					reasons.push("email");
				}
				if (
					normalizedDisplayName !== undefined &&
					mapped.data.displayName.trim().toLowerCase() === normalizedDisplayName
				) {
					reasons.push("display_name");
				}
				if (reasons.length === 0) {
					continue;
				}
				results.push({
					candidateId: mapped.data.id,
					matchReasons: reasons,
					displayName: mapped.data.displayName,
					email: mapped.data.email,
				});
			}
			return errorResult.ok(results);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to detect candidate duplicates",
			);
		}
	},

	async getApplicationById(input: {
		organizationId: string;
		applicationId: HumanResourcesApplicationId;
	}): Promise<Result<CandidateApplication | null>> {
		try {
			const result = await afendaDatabase.client
				.select()
				.from(hrCandidateApplication)
				.where(
					and(
						eq(hrCandidateApplication.organizationId, input.organizationId),
						eq(hrCandidateApplication.id, input.applicationId),
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return errorResult.ok(null);
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
			const result = await afendaDatabase.client
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
			const [row] = result;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			return mapApplication(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find active application");
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async createApplication(
		record: ApplicationCreateRecord,
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CandidateApplication>> {
		const candidate = await this.getCandidateById({
			organizationId: record.organizationId,
			candidateId: record.candidateId,
		});
		if (!candidate.ok) {
			return candidate;
		}
		if (candidate.data === null) {
			return notFound("Candidate not found");
		}
		const activeCandidate = assertCandidateActive(candidate.data.status);
		if (!activeCandidate.ok) {
			return activeCandidate;
		}

		const requisition = await this.getRequisitionById({
			organizationId: record.organizationId,
			requisitionId: record.requisitionId,
		});
		if (!requisition.ok) {
			return requisition;
		}
		if (requisition.data === null) {
			return notFound("Requisition not found");
		}
		const openRequisition = assertRequisitionOpenForApplication(
			requisition.data.status,
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

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesApplicationId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const historyId = randomUUID();
		const plannedOutbox = planRecruitmentDrizzleOutbox({
			commandId: meta.operationId,
			meta,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			aggregateId: brandedId.data,
			entityType: "hr_candidate_application",
			auditAction: "CREATE",
		});
		if (plannedOutbox === undefined) {
			return invalidState("Application create requires a domain event");
		}
		const preparedAudit = prepareRecruitmentAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_candidate_application",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: { status: "submitted", version: 1 },
			meta,
			reasonCode: "APPLICATION_CREATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue11) => [
				sqlValue11`
							WITH candidate_ref AS (
								SELECT candidate.id, candidate.organization_id
								FROM hr_candidate AS candidate
								WHERE candidate.id = ${record.candidateId}
									AND candidate.organization_id = ${record.organizationId}
									AND candidate.status = 'active'
							),
							requisition_ref AS (
								SELECT requisition.id, requisition.organization_id
								FROM hr_job_requisition AS requisition
								WHERE requisition.id = ${record.requisitionId}
									AND requisition.organization_id = ${record.organizationId}
									AND requisition.status = 'open'
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
							history AS (
								INSERT INTO hr_candidate_application_status_history (
									id, organization_id, application_id, candidate_id, requisition_id,
									from_status, to_status, change_kind, reason, reason_code,
									correlation_id, actor_user_id
								)
								SELECT
									${historyId}, organization_id, id, candidate_id, requisition_id,
									NULL, 'submitted', 'create', NULL, NULL,
									${meta.correlationId}, created_by
								FROM mutated
								RETURNING id
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							),
							outboxed AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id, actor_user_id,
									payload, status, attempts
								)
								SELECT
									${eventId}, organization_id, ${plannedOutbox.eventType},
									'human-resources', ${meta.correlationId}, created_by,
									${plannedOutbox.payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, history, audited, outboxed
						`,
			]);
			const [row] = rows;
			if (!row) {
				const candidateAgain = await this.getCandidateById({
					organizationId: record.organizationId,
					candidateId: record.candidateId,
				});
				if (!candidateAgain.ok) {
					return candidateAgain;
				}
				if (candidateAgain.data === null) {
					return notFound("Candidate not found");
				}
				if (candidateAgain.data.status !== "active") {
					const activeCheck = assertCandidateActive(candidateAgain.data.status);
					if (!activeCheck.ok) {
						return activeCheck;
					}
				}
				const requisitionAgain = await this.getRequisitionById({
					organizationId: record.organizationId,
					requisitionId: record.requisitionId,
				});
				if (!requisitionAgain.ok) {
					return requisitionAgain;
				}
				if (requisitionAgain.data === null) {
					return notFound("Requisition not found");
				}
				const openCheck = assertRequisitionOpenForApplication(
					requisitionAgain.data.status,
				);
				if (!openCheck.ok) {
					return openCheck;
				}
				return conflict("Could not create application");
			}
			return mapApplicationSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueConstraint(error, HR_REGEX_5)) {
				return conflict(
					"An active application already exists for this candidate and requisition",
				);
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
			reason?: string | null | undefined;
			reasonCode?: string | null | undefined;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<CandidateApplication>> {
		const existing = await this.getApplicationById({
			organizationId: input.organizationId,
			applicationId: input.applicationId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Application not found");
		}
		const application = existing.data;

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

		const auditId = randomUUID();
		const eventId = randomUUID();
		const historyId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const fromStatus = application.status;
		const reason = input.reason ?? null;
		const reasonCode = input.reasonCode ?? null;
		const plannedOutbox = planRecruitmentDrizzleOutbox({
			commandId: meta.operationId,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.applicationId,
			entityType: "hr_candidate_application",
			auditAction: "UPDATE",
		});
		if (plannedOutbox === undefined) {
			return invalidState(
				"Application status transition requires a domain event",
			);
		}
		const preparedAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_candidate_application",
			entityId: input.applicationId,
			action: "UPDATE",
			oldValue: { status: fromStatus, version: input.expectedVersion },
			newValue: { status: input.status, version: nextVersion },
			meta,
			reasonCode: "APPLICATION_STATUS_TRANSITIONED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue10) => [
				sqlValue10`
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
							history AS (
								INSERT INTO hr_candidate_application_status_history (
									id, organization_id, application_id, candidate_id, requisition_id,
									from_status, to_status, change_kind, reason, reason_code,
									correlation_id, actor_user_id
								)
								SELECT
									${historyId}, organization_id, id, candidate_id, requisition_id,
									${fromStatus}, ${input.status}, 'lifecycle', ${reason}, ${reasonCode},
									${meta.correlationId}, ${input.actorUserId}
								FROM mutated
								RETURNING id
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							),
							outboxed AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id, actor_user_id,
									payload, status, attempts
								)
								SELECT
									${eventId}, organization_id, ${plannedOutbox.eventType},
									'human-resources', ${meta.correlationId}, ${input.actorUserId},
									${plannedOutbox.payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, history, audited, outboxed
						`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getApplicationById({
					organizationId: input.organizationId,
					applicationId: input.applicationId,
				});
				if (!again.ok) {
					return again;
				}
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Application",
				});
			}
			return mapApplicationSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueConstraint(error, HR_REGEX_5)) {
				return conflict(
					"An active application already exists for this candidate and requisition",
				);
			}
			return mapPersistenceFailure(
				error,
				"Failed to transition application status",
			);
		}
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
		const existing = await this.getApplicationById({
			organizationId: input.organizationId,
			applicationId: input.applicationId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Application not found");
		}

		const reopenable = assertApplicationReopenable(existing.data.status);
		if (!reopenable.ok) {
			return reopenable;
		}

		const activeDuplicate =
			await this.findActiveApplicationByCandidateRequisition({
				organizationId: input.organizationId,
				candidateId: existing.data.candidateId,
				requisitionId: existing.data.requisitionId,
			});
		if (!activeDuplicate.ok) {
			return activeDuplicate;
		}
		if (activeDuplicate.data !== null) {
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
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrCandidateApplicationStatusHistory)
				.where(
					and(
						eq(
							hrCandidateApplicationStatusHistory.organizationId,
							input.organizationId,
						),
						eq(
							hrCandidateApplicationStatusHistory.applicationId,
							input.applicationId,
						),
					),
				)
				.orderBy(asc(hrCandidateApplicationStatusHistory.createdAt));
			const history: ApplicationStatusHistory[] = [];
			for (const row of rows) {
				const mapped = mapApplicationStatusHistory(row);
				if (!mapped.ok) {
					return mapped;
				}
				history.push(mapped.data);
			}
			return errorResult.ok(history);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list application status history",
			);
		}
	},

	async appendApplicationStatusHistory(
		record: ApplicationStatusHistoryAppendRecord,
	): Promise<Result<ApplicationStatusHistory>> {
		try {
			const [row] = await afendaDatabase.client
				.insert(hrCandidateApplicationStatusHistory)
				.values({
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
				})
				.returning();
			if (!row) {
				return errorResult.fail("INTERNAL_ERROR", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_INVALID_INPUT,
					),
				});
			}
			return mapApplicationStatusHistory(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to append application status history",
			);
		}
	},

	async listApplications(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: ApplicationStatus | undefined;
		candidateId?: HumanResourcesCandidateId | undefined;
		requisitionId?: HumanResourcesRequisitionId | undefined;
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
				afendaDatabase.client
					.select()
					.from(hrCandidateApplication)
					.where(and(...conditions))
					.orderBy(desc(hrCandidateApplication.createdAt))
					.limit(input.pageSize)
					.offset(offset),
				afendaDatabase.client
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
			return errorResult.ok({
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
			const result = await afendaDatabase.client
				.select()
				.from(hrInterview)
				.where(
					and(
						eq(hrInterview.organizationId, input.organizationId),
						eq(hrInterview.id, input.interviewId),
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return errorResult.ok(null);
			}
			return mapInterview(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load interview");
		}
	},

	async scheduleInterview(
		record: InterviewScheduleRecord,
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Interview>> {
		const application = await this.getApplicationById({
			organizationId: record.organizationId,
			applicationId: record.applicationId,
		});
		if (!application.ok) {
			return application;
		}
		if (application.data === null) {
			return notFound("Application not found");
		}
		const schedulable = assertInterviewSchedulable(application.data.status);
		if (!schedulable.ok) {
			return schedulable;
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesInterviewId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const scheduledAt = new Date(record.scheduledAt);
		const plannedOutbox = planRecruitmentDrizzleOutbox({
			commandId: meta.operationId,
			meta,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			aggregateId: brandedId.data,
			entityType: "hr_interview",
			auditAction: "CREATE",
		});
		if (plannedOutbox === undefined) {
			return invalidState("Interview schedule requires a domain event");
		}
		const preparedAudit = prepareRecruitmentAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_interview",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: { status: "scheduled", version: 1 },
			meta,
			reasonCode: "INTERVIEW_SCHEDULED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue9) => [
				sqlValue9`
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
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							),
							outboxed AS (
								INSERT INTO platform_domain_event (
									id, organization_id, type, source_module, correlation_id, actor_user_id,
									payload, status, attempts
								)
								SELECT
									${eventId}, organization_id, ${plannedOutbox.eventType},
									'human-resources', ${meta.correlationId}, created_by,
									${plannedOutbox.payloadJson}::jsonb, 'pending', 0
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited, outboxed
						`,
			]);
			const [row] = rows;
			if (!row) {
				const applicationAgain = await this.getApplicationById({
					organizationId: record.organizationId,
					applicationId: record.applicationId,
				});
				if (!applicationAgain.ok) {
					return applicationAgain;
				}
				if (applicationAgain.data === null) {
					return notFound("Application not found");
				}
				const schedulableCheck = assertInterviewSchedulable(
					applicationAgain.data.status,
				);
				if (!schedulableCheck.ok) {
					return schedulableCheck;
				}
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
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Interview>> {
		const existing = await this.getInterviewById({
			organizationId: input.organizationId,
			interviewId: input.interviewId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Interview not found");
		}
		const interview = existing.data;

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

		const preparedAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_interview",
			entityId: input.interviewId,
			action: "UPDATE",
			oldValue: { status: interview.status, version: input.expectedVersion },
			newValue: { status: "cancelled", version: input.expectedVersion + 1 },
			meta,
			reasonCode: "INTERVIEW_CANCELLED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue8) => [
				sqlValue8`
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
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getInterviewById({
					organizationId: input.organizationId,
					interviewId: input.interviewId,
				});
				if (!again.ok) {
					return again;
				}
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

	async assignInterviewInterviewer(
		input: {
			organizationId: string;
			interviewId: HumanResourcesInterviewId;
			interviewerActorId: string;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<Interview>> {
		const existing = await this.getInterviewById({
			organizationId: input.organizationId,
			interviewId: input.interviewId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Interview not found");
		}
		const interview = existing.data;

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

		const preparedAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_interview",
			entityId: input.interviewId,
			action: "UPDATE",
			oldValue: { version: input.expectedVersion },
			newValue: { version: input.expectedVersion + 1 },
			meta,
			reasonCode: "INTERVIEW_INTERVIEWER_ASSIGNED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue7) => [
				sqlValue7`
							WITH mutated AS (
								UPDATE hr_interview
								SET interviewer_actor_id = ${input.interviewerActorId},
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
									entity_id, action, changes, old_value, new_value, metadata,
									ip_address, user_agent
								)
								SELECT 									${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 									${audit.correlationId}, ${audit.module}, ${audit.entity}, 									id, ${audit.action}, ${audit.changesJson}::jsonb, 									${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 									${audit.metadataJson}::jsonb, ${audit.ipAddress}, 									${audit.userAgent}
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getInterviewById({
					organizationId: input.organizationId,
					interviewId: input.interviewId,
				});
				if (!again.ok) {
					return again;
				}
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Interview",
				});
			}
			return mapInterviewSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to assign interview interviewer",
			);
		}
	},

	async listInterviews(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		applicationId?: HumanResourcesApplicationId | undefined;
	}): Promise<Result<InterviewListPage>> {
		try {
			const conditions = [eq(hrInterview.organizationId, input.organizationId)];
			if (input.applicationId !== undefined) {
				conditions.push(eq(hrInterview.applicationId, input.applicationId));
			}
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				afendaDatabase.client
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
				afendaDatabase.client
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
			return errorResult.ok({
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
			const result = await afendaDatabase.client
				.select()
				.from(hrInterviewEvaluation)
				.where(
					and(
						eq(hrInterviewEvaluation.organizationId, input.organizationId),
						eq(hrInterviewEvaluation.interviewId, input.interviewId),
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return errorResult.ok(null);
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
		meta: HumanResourcesMutationMeta,
	): Promise<Result<InterviewEvaluation>> {
		const interview = await this.getInterviewById({
			organizationId: record.organizationId,
			interviewId: record.interviewId,
		});
		if (!interview.ok) {
			return interview;
		}
		if (interview.data === null) {
			return notFound("Interview not found");
		}

		const existingEvaluation = await this.getInterviewEvaluationByInterviewId({
			organizationId: record.organizationId,
			interviewId: record.interviewId,
		});
		if (!existingEvaluation.ok) {
			return existingEvaluation;
		}
		if (existingEvaluation.data !== null) {
			return conflict("Interview evaluation already recorded");
		}

		const versionCheck = assertExpectedVersion(
			interview.data.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const completeTransition = assertInterviewStatusTransition(
			interview.data.status,
			"completed",
		);
		if (!completeTransition.ok) {
			return completeTransition;
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesInterviewEvaluationId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const interviewAuditId = randomUUID();
		const evaluationAuditId = randomUUID();
		const eventId = randomUUID();
		const nextInterviewVersion = record.expectedVersion + 1;
		const recordedAt = new Date();
		const scorecardJson = JSON.stringify(record.scorecard);
		const plannedOutbox = planRecruitmentDrizzleOutbox({
			commandId: meta.operationId,
			meta,
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			aggregateId: record.interviewId,
			entityType: "hr_interview",
			auditAction: "UPDATE",
		});
		if (plannedOutbox === undefined) {
			return invalidState("Interview evaluation requires a domain event");
		}
		const preparedInterviewAudit = prepareRecruitmentAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_interview",
			entityId: record.interviewId,
			action: "UPDATE",
			oldValue: {
				status: interview.data.status,
				version: record.expectedVersion,
			},
			newValue: { status: "completed", version: nextInterviewVersion },
			meta,
			reasonCode: "INTERVIEW_COMPLETED",
		});
		if (!preparedInterviewAudit.ok) {
			return preparedInterviewAudit;
		}
		const interviewAudit = preparedInterviewAudit.data;
		const preparedEvaluationAudit = prepareRecruitmentAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_interview_evaluation",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: { version: 1 },
			meta,
			reasonCode: "INTERVIEW_EVALUATION_RECORDED",
		});
		if (!preparedEvaluationAudit.ok) {
			return preparedEvaluationAudit;
		}
		const evaluationAudit = preparedEvaluationAudit.data;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue6) => [
				sqlValue6`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT 								${interviewAuditId}, ${interviewAudit.organizationId}, ${interviewAudit.actorUserId}, 								${interviewAudit.correlationId}, ${interviewAudit.module}, ${interviewAudit.entity}, 								id, ${interviewAudit.action}, ${interviewAudit.changesJson}::jsonb, 								${interviewAudit.oldValueJson}::jsonb, ${interviewAudit.newValueJson}::jsonb, 								${interviewAudit.metadataJson}::jsonb, ${interviewAudit.ipAddress}, 								${interviewAudit.userAgent}
							FROM completed_interview
							RETURNING id
						),
						mutated AS (
							INSERT INTO hr_interview_evaluation (
								id, organization_id, interview_id, result, private_notes,
								scorecard_json, evaluator_actor_id, recorded_at, version,
								created_by, updated_by
							)
							SELECT
								${brandedId.data}, completed_interview.organization_id,
								completed_interview.id, ${record.result}, ${record.privateNotes},
								${scorecardJson}::jsonb, ${record.evaluatorActorId}, ${recordedAt}, 1,
								${record.createdBy}, ${record.createdBy}
							FROM completed_interview
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT 								${evaluationAuditId}, ${evaluationAudit.organizationId}, ${evaluationAudit.actorUserId}, 								${evaluationAudit.correlationId}, ${evaluationAudit.module}, ${evaluationAudit.entity}, 								id, ${evaluationAudit.action}, ${evaluationAudit.changesJson}::jsonb, 								${evaluationAudit.oldValueJson}::jsonb, ${evaluationAudit.newValueJson}::jsonb, 								${evaluationAudit.metadataJson}::jsonb, ${evaluationAudit.ipAddress}, 								${evaluationAudit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${plannedOutbox.eventType},
								'human-resources', ${meta.correlationId}, ${record.createdBy},
								${plannedOutbox.payloadJson}::jsonb, 'pending', 0
							FROM completed_interview
							RETURNING id
						)
						SELECT mutated.* FROM mutated, completed_interview, interview_audited, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getInterviewById({
					organizationId: record.organizationId,
					interviewId: record.interviewId,
				});
				if (!again.ok) {
					return again;
				}
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Interview",
				});
			}
			return mapInterviewEvaluationSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueConstraint(error, HR_REGEX_6)) {
				return conflict("Interview evaluation already recorded");
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
			const result = await afendaDatabase.client
				.select()
				.from(hrEmploymentOffer)
				.where(
					and(
						eq(hrEmploymentOffer.organizationId, input.organizationId),
						eq(hrEmploymentOffer.id, input.offerId),
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return errorResult.ok(null);
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
			const result = await afendaDatabase.client
				.select()
				.from(hrEmploymentOffer)
				.where(
					and(
						eq(hrEmploymentOffer.organizationId, input.organizationId),
						eq(hrEmploymentOffer.applicationId, input.applicationId),
						sql`${hrEmploymentOffer.status} IN ('draft', 'approved', 'issued')`,
					),
				)
				.limit(1);
			const [row] = result;
			if (row === undefined) {
				return errorResult.ok(null);
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
			const result = await afendaDatabase.client
				.select()
				.from(hrEmploymentOffer)
				.where(
					and(
						eq(hrEmploymentOffer.organizationId, input.organizationId),
						eq(hrEmploymentOffer.acceptIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [offerRow] = result;
			if (offerRow === undefined) {
				return errorResult.ok(null);
			}
			const mappedOffer = mapOffer(offerRow);
			if (!mappedOffer.ok) {
				return mappedOffer;
			}
			const application = await this.getApplicationById({
				organizationId: input.organizationId,
				applicationId: mappedOffer.data.applicationId,
			});
			if (!application.ok) {
				return application;
			}
			if (application.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			const acceptedAt =
				mappedOffer.data.respondedAt ?? mappedOffer.data.updatedAt;
			return errorResult.ok({
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
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmploymentOffer>> {
		const application = await this.getApplicationById({
			organizationId: record.organizationId,
			applicationId: record.applicationId,
		});
		if (!application.ok) {
			return application;
		}
		if (application.data === null) {
			return notFound("Application not found");
		}
		const eligible = assertApplicationEligibleForOffer(application.data.status);
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

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesOfferId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedAudit = prepareRecruitmentAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			entity: "hr_employment_offer",
			entityId: brandedId.data,
			action: "CREATE",
			newValue: { status: "draft", version: 1 },
			meta,
			reasonCode: "OFFER_CREATED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue5) => [
				sqlValue5`
						WITH application_ref AS (
							SELECT id, organization_id
							FROM hr_candidate_application
							WHERE id = ${record.applicationId}
								AND organization_id = ${record.organizationId}
								AND status IN ('in_review', 'interviewing')
						),
						mutated AS (
							INSERT INTO hr_employment_offer (
								id, organization_id, application_id, compensation_proposal_id,
								status, terms_summary, expires_on,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, application_ref.organization_id,
								application_ref.id, ${record.compensationProposalId ?? null},
								'draft', ${record.termsSummary}, ${record.expiresOn},
								1, ${record.createdBy}, ${record.createdBy}
							FROM application_ref
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT 								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 								${audit.correlationId}, ${audit.module}, ${audit.entity}, 								id, ${audit.action}, ${audit.changesJson}::jsonb, 								${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 								${audit.metadataJson}::jsonb, ${audit.ipAddress}, 								${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				const applicationAgain = await this.getApplicationById({
					organizationId: record.organizationId,
					applicationId: record.applicationId,
				});
				if (!applicationAgain.ok) {
					return applicationAgain;
				}
				if (applicationAgain.data === null) {
					return notFound("Application not found");
				}
				const eligibleCheck = assertApplicationEligibleForOffer(
					applicationAgain.data.status,
				);
				if (!eligibleCheck.ok) {
					return eligibleCheck;
				}
				return conflict("Could not create offer");
			}
			return mapOfferSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueConstraint(error, HR_REGEX_7)) {
				return conflict("An active offer already exists for this application");
			}
			return mapPersistenceFailure(error, "Failed to create offer");
		}
	},

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
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmploymentOffer>> {
		const existing = await this.getOfferById({
			organizationId: input.organizationId,
			offerId: input.offerId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Offer not found");
		}
		const offer = existing.data;

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

		const nextTermsSummary =
			input.termsSummary === undefined
				? offer.termsSummary
				: input.termsSummary;
		const nextExpiresOn =
			input.expiresOn === undefined ? offer.expiresOn : input.expiresOn;
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

		const preparedAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employment_offer",
			entityId: input.offerId,
			action: "UPDATE",
			oldValue: { version: input.expectedVersion },
			newValue: { version: input.expectedVersion + 1 },
			meta,
			reasonCode: "OFFER_DRAFT_AMENDED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await afendaDatabase.transaction((sqlValue4) => [
				sqlValue4`
						WITH mutated AS (
							UPDATE hr_employment_offer
							SET terms_summary = ${nextTermsSummary},
								expires_on = ${nextExpiresOn},
								compensation_proposal_id = ${nextCompensationProposalId},
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT 								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 								${audit.correlationId}, ${audit.module}, ${audit.entity}, 								id, ${audit.action}, ${audit.changesJson}::jsonb, 								${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 								${audit.metadataJson}::jsonb, ${audit.ipAddress}, 								${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getOfferById({
					organizationId: input.organizationId,
					offerId: input.offerId,
				});
				if (!again.ok) {
					return again;
				}
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async transitionOfferStatus(
		input: {
			organizationId: string;
			offerId: HumanResourcesOfferId;
			status: OfferStatus;
			expectedVersion: number;
			actorUserId: string;
			asOfDate?: string | undefined;
		},
		_ports: MutationPorts,
		meta: HumanResourcesMutationMeta,
	): Promise<Result<EmploymentOffer>> {
		const existing = await this.getOfferById({
			organizationId: input.organizationId,
			offerId: input.offerId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Offer not found");
		}
		const offer = existing.data;

		const versionCheck = assertExpectedVersion(
			offer.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const transition = assertOfferStatusTransition(offer.status, input.status);
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
			const application = await this.getApplicationById({
				organizationId: input.organizationId,
				applicationId: offer.applicationId,
			});
			if (!application.ok) {
				return application;
			}
			if (application.data === null) {
				return notFound("Application not found");
			}
			const applicationTransition = assertApplicationStatusTransition(
				application.data.status,
				"offered",
			);
			if (!applicationTransition.ok) {
				return applicationTransition;
			}
		}

		const auditId = randomUUID();
		const applicationAuditId = randomUUID();
		const eventId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const setRespondedAt =
			input.status === "declined" ||
			input.status === "expired" ||
			input.status === "withdrawn";
		const plannedOutbox = planRecruitmentDrizzleOutbox({
			commandId: meta.operationId,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.offerId,
			entityType: "hr_employment_offer",
			auditAction: "UPDATE",
		});
		if (plannedOutbox === undefined) {
			return invalidState("Offer status transition requires a domain event");
		}
		const preparedAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employment_offer",
			entityId: input.offerId,
			action: "UPDATE",
			oldValue: { status: offer.status, version: input.expectedVersion },
			newValue: { status: input.status, version: nextVersion },
			meta,
			reasonCode: "OFFER_STATUS_TRANSITIONED",
		});
		if (!preparedAudit.ok) {
			return preparedAudit;
		}
		const audit = preparedAudit.data;
		const preparedApplicationAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_candidate_application",
			entityId: offer.applicationId,
			action: "UPDATE",
			newValue: { status: "offered" },
			meta,
			reasonCode: "APPLICATION_OFFERED",
		});
		if (!preparedApplicationAudit.ok) {
			return preparedApplicationAudit;
		}
		const applicationAudit = preparedApplicationAudit.data;

		try {
			if (input.status === "issued") {
				const [rows] = await afendaDatabase.transaction((sqlValue3) => [
					sqlValue3`
								WITH updated_offer AS (
									UPDATE hr_employment_offer AS employment_offer
									SET status = 'issued',
										issued_at = now(),
										version = ${nextVersion},
										updated_by = ${input.actorUserId},
										updated_at = now()
									WHERE employment_offer.id = ${input.offerId}
										AND employment_offer.organization_id = ${input.organizationId}
										AND employment_offer.version = ${input.expectedVersion}
										AND employment_offer.status = 'approved'
									RETURNING employment_offer.*
								),
								offer_audited AS (
									INSERT INTO platform_audit_log (
										id, organization_id, actor_user_id, correlation_id, module, entity,
										entity_id, action, changes, old_value, new_value, metadata,
										ip_address, user_agent
									)
									SELECT 										${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 										${audit.correlationId}, ${audit.module}, ${audit.entity}, 										id, ${audit.action}, ${audit.changesJson}::jsonb, 										${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 										${audit.metadataJson}::jsonb, ${audit.ipAddress}, 										${audit.userAgent}
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
										entity_id, action, changes, old_value, new_value, metadata,
										ip_address, user_agent
									)
									SELECT 										${applicationAuditId}, ${applicationAudit.organizationId}, ${applicationAudit.actorUserId}, 										${applicationAudit.correlationId}, ${applicationAudit.module}, ${applicationAudit.entity}, 										id, ${applicationAudit.action}, ${applicationAudit.changesJson}::jsonb, 										${applicationAudit.oldValueJson}::jsonb, ${applicationAudit.newValueJson}::jsonb, 										${applicationAudit.metadataJson}::jsonb, ${applicationAudit.ipAddress}, 										${applicationAudit.userAgent}
									FROM updated_application
									RETURNING id
								),
								outboxed AS (
									INSERT INTO platform_domain_event (
										id, organization_id, type, source_module, correlation_id, actor_user_id,
										payload, status, attempts
									)
									SELECT
										${eventId}, organization_id, ${plannedOutbox.eventType},
										'human-resources', ${meta.correlationId}, ${input.actorUserId},
										${plannedOutbox.payloadJson}::jsonb, 'pending', 0
									FROM updated_offer
									RETURNING id
								)
								SELECT updated_offer.* FROM updated_offer, offer_audited, updated_application, application_audited, outboxed
							`,
				]);
				const [row] = rows;
				if (!row) {
					const again = await this.getOfferById({
						organizationId: input.organizationId,
						offerId: input.offerId,
					});
					if (!again.ok) {
						return again;
					}
					return missAfterOptimisticUpdate({
						found: again.data !== null,
						entityLabel: "Offer",
					});
				}
				return mapOfferSqlRow(row);
			}

			const [rows] = await afendaDatabase.transaction((sqlValue2) => [
				sqlValue2`
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT 								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, 								${audit.correlationId}, ${audit.module}, ${audit.entity}, 								id, ${audit.action}, ${audit.changesJson}::jsonb, 								${audit.oldValueJson}::jsonb, ${audit.newValueJson}::jsonb, 								${audit.metadataJson}::jsonb, ${audit.ipAddress}, 								${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${plannedOutbox.eventType},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${plannedOutbox.payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const [row] = rows;
			if (!row) {
				const again = await this.getOfferById({
					organizationId: input.organizationId,
					offerId: input.offerId,
				});
				if (!again.ok) {
					return again;
				}
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
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
			return errorResult.ok({
				...existingByKey.data.handoff,
				correlationId: meta.correlationId,
			});
		}

		const existing = await this.getOfferById({
			organizationId: input.organizationId,
			offerId: input.offerId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Offer not found");
		}
		const offer = existing.data;

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

		const application = await this.getApplicationById({
			organizationId: input.organizationId,
			applicationId: offer.applicationId,
		});
		if (!application.ok) {
			return application;
		}
		if (application.data === null) {
			return notFound("Application not found");
		}
		const applicationRecord = application.data;
		const applicationTransition = assertApplicationStatusTransition(
			applicationRecord.status,
			"accepted",
		);
		if (!applicationTransition.ok) {
			return applicationTransition;
		}

		const offerAuditId = randomUUID();
		const applicationAuditId = randomUUID();
		const eventId = randomUUID();
		const nextOfferVersion = input.expectedVersion + 1;
		const nextApplicationVersion = applicationRecord.version + 1;
		const plannedOutbox = planRecruitmentDrizzleOutbox({
			commandId: meta.operationId,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.offerId,
			entityType: "hr_employment_offer",
			auditAction: "UPDATE",
		});
		if (plannedOutbox === undefined) {
			return invalidState("Offer accept requires a domain event");
		}
		const preparedOfferAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_employment_offer",
			entityId: input.offerId,
			action: "UPDATE",
			oldValue: { status: offer.status, version: input.expectedVersion },
			newValue: { status: "accepted", version: nextOfferVersion },
			meta,
			reasonCode: "OFFER_ACCEPTED",
		});
		if (!preparedOfferAudit.ok) {
			return preparedOfferAudit;
		}
		const offerAudit = preparedOfferAudit.data;
		const preparedApplicationAudit = prepareRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_candidate_application",
			entityId: applicationRecord.id,
			action: "UPDATE",
			oldValue: {
				status: applicationRecord.status,
				version: applicationRecord.version,
			},
			newValue: { status: "accepted", version: nextApplicationVersion },
			meta,
			reasonCode: "APPLICATION_ACCEPTED",
		});
		if (!preparedApplicationAudit.ok) {
			return preparedApplicationAudit;
		}
		const applicationAudit = preparedApplicationAudit.data;
		const preparedReservationAudit = prepareDerivedRecruitmentAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			entity: "hr_headcount_reservation",
			action: "UPDATE",
			oldValue: { status: "active" },
			newValue: { status: "consumed" },
			meta,
			reasonCode: "HEADCOUNT_RESERVATION_CONSUMED",
		});
		if (!preparedReservationAudit.ok) {
			return preparedReservationAudit;
		}
		const reservationAudit = preparedReservationAudit.data;

		try {
			const [rows] = await afendaDatabase.transaction((sqlValue) => [
				sqlValue`
						WITH updated_offer AS (
							UPDATE hr_employment_offer AS employment_offer
							SET status = 'accepted',
								responded_at = now(),
								accept_idempotency_key = ${input.idempotencyKey},
								accept_request_fingerprint = ${input.acceptRequestFingerprint},
								version = ${nextOfferVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE employment_offer.id = ${input.offerId}
								AND employment_offer.organization_id = ${input.organizationId}
								AND employment_offer.version = ${input.expectedVersion}
								AND employment_offer.status = 'issued'
								AND employment_offer.expires_on >= ${input.asOfDate}::date
							RETURNING employment_offer.*
						),
						offer_audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT 								${offerAuditId}, ${offerAudit.organizationId}, ${offerAudit.actorUserId}, 								${offerAudit.correlationId}, ${offerAudit.module}, ${offerAudit.entity}, 								id, ${offerAudit.action}, ${offerAudit.changesJson}::jsonb, 								${offerAudit.oldValueJson}::jsonb, ${offerAudit.newValueJson}::jsonb, 								${offerAudit.metadataJson}::jsonb, ${offerAudit.ipAddress}, 								${offerAudit.userAgent}
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT 								${applicationAuditId}, ${applicationAudit.organizationId}, ${applicationAudit.actorUserId}, 								${applicationAudit.correlationId}, ${applicationAudit.module}, ${applicationAudit.entity}, 								id, ${applicationAudit.action}, ${applicationAudit.changesJson}::jsonb, 								${applicationAudit.oldValueJson}::jsonb, ${applicationAudit.newValueJson}::jsonb, 								${applicationAudit.metadataJson}::jsonb, ${applicationAudit.ipAddress}, 								${applicationAudit.userAgent}
							FROM updated_application
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id, actor_user_id,
								payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${plannedOutbox.eventType},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${plannedOutbox.payloadJson}::jsonb, 'pending', 0
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
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT 								gen_random_uuid(), ${reservationAudit.organizationId}, ${reservationAudit.actorUserId}, 								${reservationAudit.correlationId}, ${reservationAudit.module}, ${reservationAudit.entity}, 								id, ${reservationAudit.action}, ${reservationAudit.changesJson}::jsonb, 								${reservationAudit.oldValueJson}::jsonb, ${reservationAudit.newValueJson}::jsonb, 								${reservationAudit.metadataJson}::jsonb, ${reservationAudit.ipAddress}, 								${reservationAudit.userAgent}
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
			const [row] = rows;
			if (!row) {
				const idempotent = await this.findOfferByAcceptIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!idempotent.ok) {
					return idempotent;
				}
				if (idempotent.data !== null) {
					return errorResult.ok({
						...idempotent.data.handoff,
						correlationId: meta.correlationId,
					});
				}
				const again = await this.getOfferById({
					organizationId: input.organizationId,
					offerId: input.offerId,
				});
				if (!again.ok) {
					return again;
				}
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Offer",
				});
			}

			const mappedOffer = mapOfferSqlRow(row);
			if (!mappedOffer.ok) {
				return mappedOffer;
			}

			const candidateId = parseHumanResourcesCandidateId(row.candidate_id);
			if (!candidateId.ok) {
				return candidateId;
			}
			const requisitionId = parseHumanResourcesRequisitionId(
				row.requisition_id,
			);
			if (!requisitionId.ok) {
				return requisitionId;
			}

			const acceptedAt = mappedOffer.data.respondedAt ?? new Date();
			return errorResult.ok(
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
			if (isPostgresUniqueConstraint(error, HR_REGEX_8)) {
				const idempotent = await this.findOfferByAcceptIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.idempotencyKey,
				});
				if (!idempotent.ok) {
					return idempotent;
				}
				if (idempotent.data !== null) {
					return errorResult.ok({
						...idempotent.data.handoff,
						correlationId: meta.correlationId,
					});
				}
			}
			return mapPersistenceFailure(error, "Failed to accept offer");
		}
	},

	async listOffers(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: OfferStatus | undefined;
		applicationId?: HumanResourcesApplicationId | undefined;
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
				afendaDatabase.client
					.select()
					.from(hrEmploymentOffer)
					.where(and(...conditions))
					.orderBy(desc(hrEmploymentOffer.createdAt))
					.limit(input.pageSize)
					.offset(offset),
				afendaDatabase.client
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
			return errorResult.ok({
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

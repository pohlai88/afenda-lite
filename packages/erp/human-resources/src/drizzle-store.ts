import { randomUUID } from "node:crypto";

import {
	and,
	asc,
	db,
	desc,
	eq,
	gte,
	hrCandidate,
	hrCandidateApplication,
	hrDepartment,
	hrEmployee,
	hrEmployment,
	hrEmploymentContract,
	hrEmploymentOffer,
	hrInterview,
	hrInterviewEvaluation,
	hrJob,
	hrJobRequisition,
	hrPosition,
	hrReportingLine,
	hrWorkAssignment,
	isNull,
	lte,
	or,
	runNeonHttpTransaction,
	sql,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
	HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
	HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
} from "@afenda/events/schemas";

import {
	type HumanResourcesApplicationId,
	type HumanResourcesAssignmentId,
	type HumanResourcesCandidateId,
	type HumanResourcesDepartmentId,
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentContractId,
	type HumanResourcesEmploymentId,
	type HumanResourcesInterviewId,
	type HumanResourcesJobId,
	type HumanResourcesOfferId,
	type HumanResourcesPositionId,
	type HumanResourcesReportingLineId,
	type HumanResourcesRequisitionId,
	parseHumanResourcesApplicationId,
	parseHumanResourcesAssignmentId,
	parseHumanResourcesCandidateId,
	parseHumanResourcesDepartmentId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentContractId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesInterviewEvaluationId,
	parseHumanResourcesInterviewId,
	parseHumanResourcesJobId,
	parseHumanResourcesOfferId,
	parseHumanResourcesPositionId,
	parseHumanResourcesReportingLineId,
	parseHumanResourcesRequisitionId,
} from "./brands";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_DUPLICATE,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	humanResourcesErrorDetails,
} from "./error-codes";
import type { MutationPorts } from "./ports";
import { assertExpectedVersion } from "./shared/concurrency";
import {
	conflict,
	missAfterOptimisticUpdate,
	notFound,
} from "./shared/domain-guards";
import {
	assertValidDateRange,
	type DepartmentStatus,
	departmentStatusSchema,
	employmentStatusSchema,
	type JobStatus,
	jobStatusSchema,
	type PositionStatus,
	positionStatusSchema,
	reportingRelationshipKindSchema,
} from "./shared/employment-status";
import {
	assertActiveDepartment,
	assertActiveJob,
	assertDepartmentParentAcyclic,
	assertDepartmentStatusTransition,
	assertJobStatusTransition,
	assertNoPrimaryReportingOverlap,
	assertPositionStatusTransition,
	assertReportingLineAcyclic,
	buildBoundedDepartmentTree,
} from "./shared/organization-guards";
import {
	isCreateIdempotencyUniqueViolation,
	isEmployeeNumberUniqueViolation,
	isPostgresUniqueViolation,
	mapEmployeeNumberDuplicate,
	mapPersistenceFailure,
} from "./shared/persistence-errors";
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
} from "./shared/recruitment-guards";
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
} from "./shared/recruitment-status";
import type {
	ApplicationCreateRecord,
	AssignmentCreateRecord,
	CandidateCreateRecord,
	DepartmentCreateRecord,
	EmployeeCreateRecord,
	EmploymentContractCreateRecord,
	EmploymentCreateRecord,
	HumanResourcesStore,
	IdempotentCandidateRecord,
	IdempotentEmployeeRecord,
	IdempotentOfferAcceptRecord,
	IdempotentRequisitionRecord,
	InterviewEvaluationCreateRecord,
	InterviewScheduleRecord,
	JobCreateRecord,
	OfferCreateRecord,
	PositionCreateRecord,
	ReportingLineCreateRecord,
	RequisitionCreateRecord,
} from "./store";
import type {
	ApplicationListPage,
	Candidate,
	CandidateApplication,
	CandidateListPage,
	Department,
	Employee,
	EmployeeListPage,
	Employment,
	EmploymentContract,
	EmploymentOffer,
	Interview,
	InterviewEvaluation,
	InterviewListPage,
	Job,
	JobRequisition,
	OfferAcceptanceHandoff,
	OfferListPage,
	OrganizationTreePage,
	Position,
	ReportingLine,
	RequisitionListPage,
	WorkAssignment,
} from "./types";

type EmployeeSqlRow = {
	id: string;
	organization_id: string;
	employee_number: string;
	legal_name: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapEmployeeFields(input: {
	id: HumanResourcesEmployeeId;
	organizationId: string;
	employeeNumber: string;
	legalName: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
}): Employee {
	return input;
}

function mapEmployeeRow(row: EmployeeSqlRow): Result<Employee> {
	const id = parseHumanResourcesEmployeeId(row.id);
	if (!id.ok) {
		return id;
	}
	return ok(
		mapEmployeeFields({
			id: id.data,
			organizationId: row.organization_id,
			employeeNumber: row.employee_number,
			legalName: row.legal_name,
			version: row.version,
			createdBy: row.created_by,
			updatedBy: row.updated_by,
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		}),
	);
}

function mapEmployee(row: typeof hrEmployee.$inferSelect): Result<Employee> {
	const id = parseHumanResourcesEmployeeId(row.id);
	if (!id.ok) {
		return id;
	}
	return ok(
		mapEmployeeFields({
			id: id.data,
			organizationId: row.organizationId,
			employeeNumber: row.employeeNumber,
			legalName: row.legalName,
			version: row.version,
			createdBy: row.createdBy,
			updatedBy: row.updatedBy,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}),
	);
}

function mapEmployment(
	row: typeof hrEmployment.$inferSelect,
): Result<Employment> {
	const id = parseHumanResourcesEmploymentId(row.id);
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!id.ok) return id;
	if (!employeeId.ok) return employeeId;
	const status = employmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid employment status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		status: status.data,
		startsOn: row.startsOn,
		endsOn: row.endsOn,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapEmploymentContract(
	row: typeof hrEmploymentContract.$inferSelect,
): Result<EmploymentContract> {
	const id = parseHumanResourcesEmploymentContractId(row.id);
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!id.ok) return id;
	if (!employmentId.ok) return employmentId;
	if (!employeeId.ok) return employeeId;
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		referenceCode: row.referenceCode,
		startsOn: row.startsOn,
		endsOn: row.endsOn,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

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

function mapDepartment(
	row: typeof hrDepartment.$inferSelect,
): Result<Department> {
	const id = parseHumanResourcesDepartmentId(row.id);
	if (!id.ok) return id;
	const parentDepartmentId = mapNullableDepartmentId(row.parentDepartmentId);
	if (!parentDepartmentId.ok) return parentDepartmentId;
	const status = departmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid department status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		parentDepartmentId: parentDepartmentId.data,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapJob(row: typeof hrJob.$inferSelect): Result<Job> {
	const id = parseHumanResourcesJobId(row.id);
	if (!id.ok) return id;
	const status = jobStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid job status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		title: row.title,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapPosition(row: typeof hrPosition.$inferSelect): Result<Position> {
	const id = parseHumanResourcesPositionId(row.id);
	if (!id.ok) return id;
	const departmentId = mapNullableDepartmentId(row.departmentId);
	if (!departmentId.ok) return departmentId;
	const jobId = mapNullableJobId(row.jobId);
	if (!jobId.ok) return jobId;
	const status = positionStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid position status in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		title: row.title,
		departmentId: departmentId.data,
		jobId: jobId.data,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapReportingLine(
	row: typeof hrReportingLine.$inferSelect,
): Result<ReportingLine> {
	const id = parseHumanResourcesReportingLineId(row.id);
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	const managerEmployeeId = parseHumanResourcesEmployeeId(
		row.managerEmployeeId,
	);
	if (!id.ok) return id;
	if (!employeeId.ok) return employeeId;
	if (!managerEmployeeId.ok) return managerEmployeeId;
	const relationshipKind = reportingRelationshipKindSchema.safeParse(
		row.relationshipKind,
	);
	if (!relationshipKind.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid reporting relationship kind in persistence",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
		);
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		managerEmployeeId: managerEmployeeId.data,
		relationshipKind: relationshipKind.data,
		startsOn: row.startsOn,
		endsOn: row.endsOn,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

type PositionSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	title: string;
	department_id: string | null;
	job_id: string | null;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapPositionSqlRow(row: PositionSqlRow): Result<Position> {
	return mapPosition({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		title: row.title,
		departmentId: row.department_id,
		jobId: row.job_id,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

type DepartmentSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	name: string;
	parent_department_id: string | null;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapDepartmentSqlRow(row: DepartmentSqlRow): Result<Department> {
	return mapDepartment({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		parentDepartmentId: row.parent_department_id,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

type JobSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	title: string;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapJobSqlRow(row: JobSqlRow): Result<Job> {
	return mapJob({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		title: row.title,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

type ReportingLineSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	manager_employee_id: string;
	relationship_kind: string;
	starts_on: string;
	ends_on: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapReportingLineSqlRow(
	row: ReportingLineSqlRow,
): Result<ReportingLine> {
	return mapReportingLine({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		managerEmployeeId: row.manager_employee_id,
		relationshipKind: row.relationship_kind,
		startsOn: row.starts_on,
		endsOn: row.ends_on,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
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

function mapAssignment(
	row: typeof hrWorkAssignment.$inferSelect,
): Result<WorkAssignment> {
	const id = parseHumanResourcesAssignmentId(row.id);
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	const positionId = parseHumanResourcesPositionId(row.positionId);
	if (!id.ok) return id;
	if (!employmentId.ok) return employmentId;
	if (!employeeId.ok) return employeeId;
	if (!positionId.ok) return positionId;
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employmentId: employmentId.data,
		employeeId: employeeId.data,
		positionId: positionId.data,
		startsOn: row.startsOn,
		endsOn: row.endsOn,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function fieldChangeJson(
	field: string,
	oldValue: unknown,
	newValue: unknown,
): string {
	return JSON.stringify([{ field, oldValue, newValue }]);
}

function valueSnapshotJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

export class DrizzleHumanResourcesStore implements HumanResourcesStore {
	async getEmployeeById(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<Employee | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmployee)
				.where(
					and(
						eq(hrEmployee.organizationId, input.organizationId),
						eq(hrEmployee.id, input.employeeId),
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			return mapEmployee(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load employee");
		}
	}

	async findEmployeeByIdempotencyKey(input: {
		organizationId: string;
		idempotencyKey: string;
	}): Promise<Result<IdempotentEmployeeRecord | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmployee)
				.where(
					and(
						eq(hrEmployee.organizationId, input.organizationId),
						eq(hrEmployee.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = result[0];
			if (row === undefined) {
				return ok(null);
			}
			const mapped = mapEmployee(row);
			if (!mapped.ok) {
				return mapped;
			}
			return ok({
				employee: mapped.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load employee idempotency record",
			);
		}
	}

	async createEmployee(
		record: EmployeeCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employee>> {
		const entityId = randomUUID();
		const brandedId = parseHumanResourcesEmployeeId(entityId);
		if (!brandedId.ok) {
			return brandedId;
		}
		const auditId = randomUUID();
		const eventId = randomUUID();
		const changesJson = fieldChangeJson(
			"employeeNumber",
			null,
			record.employeeNumber,
		);
		const newValueJson = valueSnapshotJson({
			employeeNumber: record.employeeNumber,
			legalName: record.legalName,
		});
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_employee",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<[EmployeeSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO hr_employee (
							id, organization_id, employee_number, normalized_employee_number,
							legal_name, create_idempotency_key, create_request_fingerprint,
							version, created_by, updated_by
						) VALUES (
							${brandedId.data}, ${record.organizationId}, ${record.employeeNumber},
							${record.normalizedEmployeeNumber}, ${record.legalName},
							${record.createIdempotencyKey}, ${record.createRequestFingerprint},
							1, ${record.createdBy}, ${record.createdBy}
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, new_value
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'human-resources', 'hr_employee', id, 'CREATE', ${changesJson}::jsonb, ${newValueJson}::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT}, 'human-resources',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				return fail("INTERNAL_ERROR", "Employee create returned no row");
			}
			return mapEmployeeRow(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const existing = await this.findEmployeeByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!existing.ok) {
					return existing;
				}
				if (existing.data !== null) {
					return ok(existing.data.employee);
				}
			}
			if (isEmployeeNumberUniqueViolation(error)) {
				return mapEmployeeNumberDuplicate();
			}
			return mapPersistenceFailure(error, "Failed to create employee");
		}
	}

	async updateEmployee(
		input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			legalName: string;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employee>> {
		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[EmployeeSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE hr_employee
						SET legal_name = ${input.legalName},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.employeeId}
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
							'human-resources', 'hr_employee', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (row === undefined) {
				const existing = await this.getEmployeeById({
					organizationId: input.organizationId,
					employeeId: input.employeeId,
				});
				if (!existing.ok) return existing;
				return missAfterOptimisticUpdate({
					found: existing.data !== null,
					entityLabel: "Employee",
				});
			}
			return mapEmployeeRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update employee");
		}
	}

	async listEmployees(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		employeeNumberPrefix?: string;
		legalNamePrefix?: string;
		employmentStatus?: string;
	}): Promise<Result<EmployeeListPage>> {
		try {
			const conditions = [eq(hrEmployee.organizationId, input.organizationId)];

			if (input.employeeNumberPrefix) {
				conditions.push(
					sql`${hrEmployee.normalizedEmployeeNumber} ILIKE ${input.employeeNumberPrefix.toUpperCase()}||'%'`,
				);
			}

			if (input.legalNamePrefix) {
				conditions.push(
					sql`${hrEmployee.legalName} ILIKE ${input.legalNamePrefix}||'%'`,
				);
			}

			let employeeIds: HumanResourcesEmployeeId[] | undefined;
			if (input.employmentStatus) {
				const employments = await db
					.select({ employeeId: hrEmployment.employeeId })
					.from(hrEmployment)
					.where(
						and(
							eq(hrEmployment.organizationId, input.organizationId),
							eq(hrEmployment.status, input.employmentStatus),
						),
					);
				employeeIds = [];
				for (const employment of employments) {
					const parsed = parseHumanResourcesEmployeeId(employment.employeeId);
					if (parsed.ok) {
						employeeIds.push(parsed.data);
					}
				}
				if (employeeIds.length === 0) {
					return ok({
						employees: [],
						totalCount: 0,
						page: input.page,
						pageSize: input.pageSize,
					});
				}
			}

			if (employeeIds) {
				conditions.push(sql`${hrEmployee.id} = ANY(${employeeIds})`);
			}

			const offset = (input.page - 1) * input.pageSize;

			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrEmployee)
					.where(and(...conditions))
					.orderBy(desc(hrEmployee.updatedAt))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrEmployee)
					.where(and(...conditions)),
			]);

			const employees: Employee[] = [];
			for (const row of rows) {
				const mapped = mapEmployee(row);
				if (mapped.ok) {
					employees.push(mapped.data);
				}
			}

			return ok({
				employees,
				totalCount: countRows[0]?.count ?? 0,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list employees");
		}
	}

	async getEmploymentById(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<Employment | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmployment)
				.where(
					and(
						eq(hrEmployment.organizationId, input.organizationId),
						eq(hrEmployment.id, input.employmentId),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapEmployment(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load employment");
		}
	}

	async findOpenEmploymentByEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<Employment | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmployment)
				.where(
					and(
						eq(hrEmployment.organizationId, input.organizationId),
						eq(hrEmployment.employeeId, input.employeeId),
						isNull(hrEmployment.endsOn),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapEmployment(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find open employment");
		}
	}

	async createEmployment(
		record: EmploymentCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employment>> {
		const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}
		const entityId = randomUUID();
		const brandedId = parseHumanResourcesEmploymentId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_employment",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					{
						id: string;
						organization_id: string;
						employee_id: string;
						status: string;
						starts_on: string;
						ends_on: string | null;
						version: number;
						created_by: string;
						updated_by: string;
						created_at: Date;
						updated_at: Date;
					}[],
				]
			>((sql) => [
				sql`
					WITH parent AS (
						SELECT id, organization_id
						FROM hr_employee
						WHERE id = ${record.employeeId}
							AND organization_id = ${record.organizationId}
					),
					mutated AS (
						INSERT INTO hr_employment (
							id, organization_id, employee_id, status, starts_on, ends_on,
							version, created_by, updated_by
						)
						SELECT
							${brandedId.data}, parent.organization_id, parent.id, 'active',
							${record.startsOn}, ${record.endsOn}, 1, ${record.createdBy}, ${record.createdBy}
						FROM parent
						WHERE NOT EXISTS (
							SELECT 1
							FROM hr_employment open_employment
							WHERE open_employment.organization_id = parent.organization_id
								AND open_employment.employee_id = parent.id
								AND open_employment.ends_on IS NULL
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
							'human-resources', 'hr_employment', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT}, 'human-resources',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (!row) {
				const employee = await this.getEmployeeById({
					organizationId: record.organizationId,
					employeeId: record.employeeId,
				});
				if (!employee.ok) return employee;
				if (employee.data === null) {
					return fail(
						"NOT_FOUND",
						"Employee not found",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					);
				}
				return fail(
					"CONFLICT",
					"Employee already has an open employment",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}
			const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
			if (!employeeId.ok) return employeeId;
			const status = employmentStatusSchema.safeParse(row.status);
			if (!status.success) {
				return fail(
					"INTERNAL_ERROR",
					"Invalid employment status in persistence",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}
			return ok({
				id: brandedId.data,
				organizationId: row.organization_id,
				employeeId: employeeId.data,
				status: status.data,
				startsOn: row.starts_on,
				endsOn: row.ends_on,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to create employment");
		}
	}

	async amendEmployment(
		input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
			status?: string;
			startsOn?: string;
			endsOn?: string | null;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Employment>> {
		const auditId = randomUUID();
		const eventId = randomUUID();
		const terminatedEventId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employment",
			entityId: input.employmentId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		try {
			const statusValue = input.status ?? null;
			const startsOnValue = input.startsOn ?? null;
			const endsOnProvidedFlag = input.endsOn !== undefined ? 1 : 0;
			const endsOnValue = input.endsOn ?? null;
			const emitTerminatedFlag = input.status === "terminated" ? 1 : 0;

			const [rows] = await runNeonHttpTransaction<
				[
					{
						id: string;
						organization_id: string;
						employee_id: string;
						status: string;
						starts_on: string;
						ends_on: string | null;
						version: number;
						created_by: string;
						updated_by: string;
						created_at: Date;
						updated_at: Date;
					}[],
				]
			>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE hr_employment
						SET status = COALESCE(${statusValue}::text, status),
							starts_on = COALESCE(${startsOnValue}::date, starts_on),
							ends_on = CASE
								WHEN ${endsOnProvidedFlag}::int = 1 THEN ${endsOnValue}::date
								ELSE ends_on
							END,
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.employmentId}
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
							'human-resources', 'hr_employment', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT}, 'human-resources',
							${meta.correlationId}, ${input.actorUserId}, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					),
					outboxed_terminated AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${terminatedEventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT},
							'human-resources', ${meta.correlationId}, ${input.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id,
								'entityType', 'hr_employee',
								'entityId', employee_id::text,
								'actorId', ${input.actorUserId}::text,
								'correlationId', ${meta.correlationId}::text
							),
							'pending', 0
						FROM mutated
						WHERE ${emitTerminatedFlag}::int = 1
							AND status = 'terminated'
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (!row) {
				const existing = await this.getEmploymentById({
					organizationId: input.organizationId,
					employmentId: input.employmentId,
				});
				if (!existing.ok) return existing;
				return missAfterOptimisticUpdate({
					found: existing.data !== null,
					entityLabel: "Employment",
				});
			}
			const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
			if (!employeeId.ok) return employeeId;
			const status = employmentStatusSchema.safeParse(row.status);
			if (!status.success) {
				return fail(
					"INTERNAL_ERROR",
					"Invalid employment status in persistence",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
				);
			}
			return ok({
				id: input.employmentId,
				organizationId: row.organization_id,
				employeeId: employeeId.data,
				status: status.data,
				startsOn: row.starts_on,
				endsOn: row.ends_on,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to amend employment");
		}
	}

	async getEmploymentContractById(input: {
		organizationId: string;
		employmentContractId: HumanResourcesEmploymentContractId;
	}): Promise<Result<EmploymentContract | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmploymentContract)
				.where(
					and(
						eq(hrEmploymentContract.organizationId, input.organizationId),
						eq(hrEmploymentContract.id, input.employmentContractId),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapEmploymentContract(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load employment contract");
		}
	}

	async findContractByEmploymentAndCode(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
		referenceCode: string;
	}): Promise<Result<EmploymentContract | null>> {
		try {
			const result = await db
				.select()
				.from(hrEmploymentContract)
				.where(
					and(
						eq(hrEmploymentContract.organizationId, input.organizationId),
						eq(hrEmploymentContract.employmentId, input.employmentId),
						eq(hrEmploymentContract.referenceCode, input.referenceCode),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapEmploymentContract(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find employment contract");
		}
	}

	async createEmploymentContract(
		record: EmploymentContractCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<EmploymentContract>> {
		const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}
		const entityId = randomUUID();
		const brandedId = parseHumanResourcesEmploymentContractId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_employment_contract",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					{
						id: string;
						organization_id: string;
						employment_id: string;
						employee_id: string;
						reference_code: string;
						starts_on: string;
						ends_on: string | null;
						version: number;
						created_by: string;
						updated_by: string;
						created_at: Date;
						updated_at: Date;
					}[],
				]
			>((sql) => [
				sql`
					WITH parent AS (
						SELECT id, organization_id, employee_id
						FROM hr_employment
						WHERE id = ${record.employmentId}
							AND organization_id = ${record.organizationId}
							AND employee_id = ${record.employeeId}
					),
					mutated AS (
						INSERT INTO hr_employment_contract (
							id, organization_id, employment_id, employee_id, reference_code,
							starts_on, ends_on, version, created_by, updated_by
						)
						SELECT
							${brandedId.data}, parent.organization_id, parent.id, parent.employee_id,
							${record.referenceCode}, ${record.startsOn}, ${record.endsOn}, 1,
							${record.createdBy}, ${record.createdBy}
						FROM parent
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'human-resources', 'hr_employment_contract', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id, actor_user_id,
							payload, status, attempts
						)
						SELECT
							${eventId}, organization_id, ${HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT}, 'human-resources',
							${meta.correlationId}, created_by, ${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (!row) {
				return fail(
					"NOT_FOUND",
					"Employment not found",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				);
			}
			const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
			const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
			if (!employmentId.ok) return employmentId;
			if (!employeeId.ok) return employeeId;
			return ok({
				id: brandedId.data,
				organizationId: row.organization_id,
				employmentId: employmentId.data,
				employeeId: employeeId.data,
				referenceCode: row.reference_code,
				startsOn: row.starts_on,
				endsOn: row.ends_on,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to create employment contract",
			);
		}
	}

	async getDepartmentById(input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
	}): Promise<Result<Department | null>> {
		try {
			const result = await db
				.select()
				.from(hrDepartment)
				.where(
					and(
						eq(hrDepartment.organizationId, input.organizationId),
						eq(hrDepartment.id, input.departmentId),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapDepartment(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load department");
		}
	}

	async findDepartmentByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Department | null>> {
		try {
			const result = await db
				.select()
				.from(hrDepartment)
				.where(
					and(
						eq(hrDepartment.organizationId, input.organizationId),
						eq(hrDepartment.code, input.code),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapDepartment(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find department by code");
		}
	}

	async createDepartment(
		record: DepartmentCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Department>> {
		const existing = await this.findDepartmentByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			return fail(
				"CONFLICT",
				"Department with this code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesDepartmentId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const parentId = record.parentDepartmentId;
		try {
			const [rows] = await runNeonHttpTransaction<[DepartmentSqlRow[]]>(
				(sql) => [
					parentId === null
						? sql`
							WITH mutated AS (
								INSERT INTO hr_department (
									id, organization_id, code, name, parent_department_id, status,
									version, created_by, updated_by
								) VALUES (
									${brandedId.data}, ${record.organizationId}, ${record.code}, ${record.name},
									NULL, ${record.status}, 1, ${record.createdBy}, ${record.createdBy}
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
									'human-resources', 'hr_department', id, 'CREATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`
						: sql`
							WITH parent AS (
								SELECT id, organization_id
								FROM hr_department
								WHERE id = ${parentId}
									AND organization_id = ${record.organizationId}
									AND status = 'active'
							),
							mutated AS (
								INSERT INTO hr_department (
									id, organization_id, code, name, parent_department_id, status,
									version, created_by, updated_by
								)
								SELECT
									${brandedId.data}, parent.organization_id, ${record.code}, ${record.name},
									parent.id, ${record.status}, 1, ${record.createdBy}, ${record.createdBy}
								FROM parent
								RETURNING *
							),
							audited AS (
								INSERT INTO platform_audit_log (
									id, organization_id, actor_user_id, correlation_id, module, entity,
									entity_id, action, changes
								)
								SELECT
									${auditId}, organization_id, created_by, ${meta.correlationId},
									'human-resources', 'hr_department', id, 'CREATE', '[]'::jsonb
								FROM mutated
								RETURNING id
							)
							SELECT mutated.* FROM mutated, audited
						`,
				],
			);
			const row = rows[0];
			if (!row) {
				if (parentId !== null) {
					const parent = await this.getDepartmentById({
						organizationId: record.organizationId,
						departmentId: parentId,
					});
					if (!parent.ok) return parent;
					if (parent.data === null) {
						return fail(
							"NOT_FOUND",
							"Parent department not found",
							humanResourcesErrorDetails(
								HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
							),
						);
					}
					const parentActive = assertActiveDepartment(parent.data.status);
					if (!parentActive.ok) return parentActive;
				}
				return fail("INTERNAL_ERROR", "Department create returned no row");
			}
			return mapDepartmentSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return fail(
					"CONFLICT",
					"Department with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
				);
			}
			return mapPersistenceFailure(error, "Failed to create department");
		}
	}

	async updateDepartment(
		input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
			name?: string;
			parentDepartmentId?: HumanResourcesDepartmentId | null;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Department>> {
		const existing = await this.getDepartmentById({
			organizationId: input.organizationId,
			departmentId: input.departmentId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Department not found");
		}

		if (input.parentDepartmentId !== undefined) {
			if (input.parentDepartmentId !== null) {
				const parent = await this.getDepartmentById({
					organizationId: input.organizationId,
					departmentId: input.parentDepartmentId,
				});
				if (!parent.ok) return parent;
				if (parent.data === null) {
					return fail(
						"NOT_FOUND",
						"Parent department not found",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					);
				}
				const parentActive = assertActiveDepartment(parent.data.status);
				if (!parentActive.ok) return parentActive;
			}

			// Prefetch parent chain with sequential queries to match memory semantics.
			const parentCache = new Map<
				string,
				HumanResourcesDepartmentId | null | undefined
			>();
			if (input.parentDepartmentId !== null) {
				let current: HumanResourcesDepartmentId | null =
					input.parentDepartmentId;
				while (current !== null) {
					if (parentCache.has(current)) {
						break;
					}
					const loaded = await this.getDepartmentById({
						organizationId: input.organizationId,
						departmentId: current,
					});
					if (!loaded.ok) return loaded;
					if (loaded.data === null) {
						parentCache.set(current, undefined);
						break;
					}
					parentCache.set(current, loaded.data.parentDepartmentId);
					current = loaded.data.parentDepartmentId;
				}
			}
			const acyclic = assertDepartmentParentAcyclic({
				departmentId: input.departmentId,
				proposedParentId: input.parentDepartmentId,
				getParentId: (id) => parentCache.get(id),
			});
			if (!acyclic.ok) return acyclic;
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const nameValue = input.name ?? null;
		const parentProvided = input.parentDepartmentId !== undefined ? 1 : 0;
		const parentValue = input.parentDepartmentId ?? null;
		try {
			const [rows] = await runNeonHttpTransaction<[DepartmentSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE hr_department
							SET name = COALESCE(${nameValue}::text, name),
								parent_department_id = CASE
									WHEN ${parentProvided}::int = 1 THEN ${parentValue}::uuid
									ELSE parent_department_id
								END,
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.departmentId}
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
								'human-resources', 'hr_department', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getDepartmentById({
					organizationId: input.organizationId,
					departmentId: input.departmentId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Department",
				});
			}
			return mapDepartmentSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update department");
		}
	}

	async setDepartmentStatus(
		input: {
			organizationId: string;
			departmentId: HumanResourcesDepartmentId;
			status: DepartmentStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Department>> {
		const existing = await this.getDepartmentById({
			organizationId: input.organizationId,
			departmentId: input.departmentId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Department not found");
		}
		const transition = assertDepartmentStatusTransition(
			existing.data.status,
			input.status,
		);
		if (!transition.ok) return transition;

		if (input.status === "archived") {
			const children = await this.countActiveChildDepartments({
				organizationId: input.organizationId,
				parentDepartmentId: input.departmentId,
			});
			if (!children.ok) return children;
			if (children.data > 0) {
				return conflict(
					"Cannot archive department with active child departments",
				);
			}
			const positions = await this.countActiveOrFrozenPositionsForDepartment({
				organizationId: input.organizationId,
				departmentId: input.departmentId,
			});
			if (!positions.ok) return positions;
			if (positions.data > 0) {
				return conflict(
					"Cannot archive department with active or frozen positions",
				);
			}
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[DepartmentSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE hr_department
							SET status = ${input.status},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.departmentId}
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
								'human-resources', 'hr_department', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getDepartmentById({
					organizationId: input.organizationId,
					departmentId: input.departmentId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Department",
				});
			}
			return mapDepartmentSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to set department status");
		}
	}

	async listDepartments(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: DepartmentStatus;
		parentDepartmentId?: HumanResourcesDepartmentId | null;
	}): Promise<Result<{ departments: Department[]; totalCount: number }>> {
		try {
			const conditions = [
				eq(hrDepartment.organizationId, input.organizationId),
			];
			if (input.status) {
				conditions.push(eq(hrDepartment.status, input.status));
			}
			if (input.parentDepartmentId !== undefined) {
				if (input.parentDepartmentId === null) {
					conditions.push(isNull(hrDepartment.parentDepartmentId));
				} else {
					conditions.push(
						eq(hrDepartment.parentDepartmentId, input.parentDepartmentId),
					);
				}
			}

			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrDepartment)
					.where(and(...conditions))
					.orderBy(asc(hrDepartment.code))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrDepartment)
					.where(and(...conditions)),
			]);

			const departments: Department[] = [];
			for (const row of rows) {
				const mapped = mapDepartment(row);
				if (!mapped.ok) return mapped;
				departments.push(mapped.data);
			}
			return ok({
				departments,
				totalCount: countRows[0]?.count ?? 0,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list departments");
		}
	}

	async listAllDepartments(input: {
		organizationId: string;
	}): Promise<Result<Department[]>> {
		try {
			const rows = await db
				.select()
				.from(hrDepartment)
				.where(eq(hrDepartment.organizationId, input.organizationId))
				.orderBy(asc(hrDepartment.code));
			const departments: Department[] = [];
			for (const row of rows) {
				const mapped = mapDepartment(row);
				if (!mapped.ok) return mapped;
				departments.push(mapped.data);
			}
			return ok(departments);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list all departments");
		}
	}

	async getJobById(input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
	}): Promise<Result<Job | null>> {
		try {
			const result = await db
				.select()
				.from(hrJob)
				.where(
					and(
						eq(hrJob.organizationId, input.organizationId),
						eq(hrJob.id, input.jobId),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapJob(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load job");
		}
	}

	async findJobByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Job | null>> {
		try {
			const result = await db
				.select()
				.from(hrJob)
				.where(
					and(
						eq(hrJob.organizationId, input.organizationId),
						eq(hrJob.code, input.code),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapJob(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find job by code");
		}
	}

	async createJob(
		record: JobCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Job>> {
		const existing = await this.findJobByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			return fail(
				"CONFLICT",
				"Job with this code already exists",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
			);
		}

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesJobId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[JobSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						INSERT INTO hr_job (
							id, organization_id, code, title, status,
							version, created_by, updated_by
						) VALUES (
							${brandedId.data}, ${record.organizationId}, ${record.code}, ${record.title},
							${record.status}, 1, ${record.createdBy}, ${record.createdBy}
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
							'human-resources', 'hr_job', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				return fail("INTERNAL_ERROR", "Job create returned no row");
			}
			return mapJobSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return fail(
					"CONFLICT",
					"Job with this code already exists",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_DUPLICATE),
				);
			}
			return mapPersistenceFailure(error, "Failed to create job");
		}
	}

	async updateJob(
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			title: string;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Job>> {
		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[JobSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE hr_job
						SET title = ${input.title},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.jobId}
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
							'human-resources', 'hr_job', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				const existing = await this.getJobById({
					organizationId: input.organizationId,
					jobId: input.jobId,
				});
				if (!existing.ok) return existing;
				return missAfterOptimisticUpdate({
					found: existing.data !== null,
					entityLabel: "Job",
				});
			}
			return mapJobSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update job");
		}
	}

	async setJobStatus(
		input: {
			organizationId: string;
			jobId: HumanResourcesJobId;
			status: JobStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Job>> {
		const existing = await this.getJobById({
			organizationId: input.organizationId,
			jobId: input.jobId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Job not found");
		}
		const transition = assertJobStatusTransition(
			existing.data.status,
			input.status,
		);
		if (!transition.ok) return transition;

		if (input.status === "archived") {
			const positions = await this.countActiveOrFrozenPositionsForJob({
				organizationId: input.organizationId,
				jobId: input.jobId,
			});
			if (!positions.ok) return positions;
			if (positions.data > 0) {
				return conflict("Cannot archive job with active or frozen positions");
			}
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[JobSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE hr_job
						SET status = ${input.status},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.jobId}
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
							'human-resources', 'hr_job', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				const again = await this.getJobById({
					organizationId: input.organizationId,
					jobId: input.jobId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Job",
				});
			}
			return mapJobSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to set job status");
		}
	}

	async listJobs(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: JobStatus;
	}): Promise<Result<{ jobs: Job[]; totalCount: number }>> {
		try {
			const conditions = [eq(hrJob.organizationId, input.organizationId)];
			if (input.status) {
				conditions.push(eq(hrJob.status, input.status));
			}
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrJob)
					.where(and(...conditions))
					.orderBy(asc(hrJob.code))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrJob)
					.where(and(...conditions)),
			]);
			const jobs: Job[] = [];
			for (const row of rows) {
				const mapped = mapJob(row);
				if (!mapped.ok) return mapped;
				jobs.push(mapped.data);
			}
			return ok({
				jobs,
				totalCount: countRows[0]?.count ?? 0,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list jobs");
		}
	}

	async getPositionById(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}): Promise<Result<Position | null>> {
		try {
			const result = await db
				.select()
				.from(hrPosition)
				.where(
					and(
						eq(hrPosition.organizationId, input.organizationId),
						eq(hrPosition.id, input.positionId),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapPosition(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load position");
		}
	}

	async findPositionByCode(input: {
		organizationId: string;
		code: string;
	}): Promise<Result<Position | null>> {
		try {
			const result = await db
				.select()
				.from(hrPosition)
				.where(
					and(
						eq(hrPosition.organizationId, input.organizationId),
						eq(hrPosition.code, input.code),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapPosition(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find position by code");
		}
	}

	async createPosition(
		record: PositionCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Position>> {
		const entityId = randomUUID();
		const brandedId = parseHumanResourcesPositionId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[PositionSqlRow[]]>((sql) => [
				sql`
					WITH department AS (
						SELECT id, organization_id
						FROM hr_department
						WHERE id = ${record.departmentId}
							AND organization_id = ${record.organizationId}
							AND status = 'active'
					),
					job AS (
						SELECT id
						FROM hr_job
						WHERE id = ${record.jobId}
							AND organization_id = ${record.organizationId}
							AND status = 'active'
					),
					mutated AS (
						INSERT INTO hr_position (
							id, organization_id, code, title, department_id, job_id, status,
							version, created_by, updated_by
						)
						SELECT
							${brandedId.data}, department.organization_id, ${record.code}, ${record.title},
							department.id, job.id, ${record.status}, 1, ${record.createdBy}, ${record.createdBy}
						FROM department, job
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'human-resources', 'hr_position', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				const department = await this.getDepartmentById({
					organizationId: record.organizationId,
					departmentId: record.departmentId,
				});
				if (!department.ok) return department;
				if (department.data === null) {
					return fail(
						"NOT_FOUND",
						"Department not found",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					);
				}
				const departmentActive = assertActiveDepartment(department.data.status);
				if (!departmentActive.ok) return departmentActive;
				const job = await this.getJobById({
					organizationId: record.organizationId,
					jobId: record.jobId,
				});
				if (!job.ok) return job;
				if (job.data === null) {
					return fail(
						"NOT_FOUND",
						"Job not found",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					);
				}
				const jobActive = assertActiveJob(job.data.status);
				if (!jobActive.ok) return jobActive;
				return fail("INTERNAL_ERROR", "Position create returned no row");
			}
			return mapPositionSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to create position");
		}
	}

	async updatePosition(
		input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			title?: string;
			departmentId?: HumanResourcesDepartmentId;
			jobId?: HumanResourcesJobId;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Position>> {
		if (input.departmentId !== undefined) {
			const department = await this.getDepartmentById({
				organizationId: input.organizationId,
				departmentId: input.departmentId,
			});
			if (!department.ok) return department;
			if (department.data === null) {
				return fail(
					"NOT_FOUND",
					"Department not found",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				);
			}
			const departmentActive = assertActiveDepartment(department.data.status);
			if (!departmentActive.ok) return departmentActive;
		}
		if (input.jobId !== undefined) {
			const job = await this.getJobById({
				organizationId: input.organizationId,
				jobId: input.jobId,
			});
			if (!job.ok) return job;
			if (job.data === null) {
				return fail(
					"NOT_FOUND",
					"Job not found",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					),
				);
			}
			const jobActive = assertActiveJob(job.data.status);
			if (!jobActive.ok) return jobActive;
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		const titleValue = input.title ?? null;
		const departmentProvided = input.departmentId !== undefined ? 1 : 0;
		const departmentValue = input.departmentId ?? null;
		const jobProvided = input.jobId !== undefined ? 1 : 0;
		const jobValue = input.jobId ?? null;
		try {
			const [rows] = await runNeonHttpTransaction<[PositionSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE hr_position
						SET title = COALESCE(${titleValue}::text, title),
							department_id = CASE
								WHEN ${departmentProvided}::int = 1 THEN ${departmentValue}::uuid
								ELSE department_id
							END,
							job_id = CASE
								WHEN ${jobProvided}::int = 1 THEN ${jobValue}::uuid
								ELSE job_id
							END,
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.positionId}
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
							'human-resources', 'hr_position', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				const existing = await this.getPositionById({
					organizationId: input.organizationId,
					positionId: input.positionId,
				});
				if (!existing.ok) return existing;
				return missAfterOptimisticUpdate({
					found: existing.data !== null,
					entityLabel: "Position",
				});
			}
			return mapPositionSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update position");
		}
	}

	async setPositionStatus(
		input: {
			organizationId: string;
			positionId: HumanResourcesPositionId;
			status: PositionStatus;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<Position>> {
		const existing = await this.getPositionById({
			organizationId: input.organizationId,
			positionId: input.positionId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Position not found");
		}
		const transition = assertPositionStatusTransition(
			existing.data.status,
			input.status,
		);
		if (!transition.ok) return transition;

		if (input.status === "frozen" || input.status === "closed") {
			const openAssignments = await this.countOpenAssignmentsForPosition({
				organizationId: input.organizationId,
				positionId: input.positionId,
			});
			if (!openAssignments.ok) return openAssignments;
			if (openAssignments.data > 0) {
				return conflict(
					"Cannot freeze or close position with open assignments",
				);
			}
		}

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[PositionSqlRow[]]>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE hr_position
						SET status = ${input.status},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.positionId}
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
							'human-resources', 'hr_position', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				const again = await this.getPositionById({
					organizationId: input.organizationId,
					positionId: input.positionId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Position",
				});
			}
			return mapPositionSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to set position status");
		}
	}

	async listPositions(input: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: string;
		departmentId?: HumanResourcesDepartmentId;
		jobId?: HumanResourcesJobId;
	}): Promise<Result<{ positions: Position[]; totalCount: number }>> {
		try {
			const conditions = [eq(hrPosition.organizationId, input.organizationId)];
			if (input.status) {
				conditions.push(eq(hrPosition.status, input.status));
			}
			if (input.departmentId) {
				conditions.push(eq(hrPosition.departmentId, input.departmentId));
			}
			if (input.jobId) {
				conditions.push(eq(hrPosition.jobId, input.jobId));
			}

			const offset = (input.page - 1) * input.pageSize;

			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrPosition)
					.where(and(...conditions))
					.orderBy(asc(hrPosition.title))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrPosition)
					.where(and(...conditions)),
			]);

			const positions: Position[] = [];
			for (const row of rows) {
				const mapped = mapPosition(row);
				if (!mapped.ok) return mapped;
				positions.push(mapped.data);
			}

			return ok({
				positions,
				totalCount: countRows[0]?.count ?? 0,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list positions");
		}
	}

	async countOpenAssignmentsForPosition(input: {
		organizationId: string;
		positionId: HumanResourcesPositionId;
	}): Promise<Result<number>> {
		try {
			const rows = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(hrWorkAssignment)
				.where(
					and(
						eq(hrWorkAssignment.organizationId, input.organizationId),
						eq(hrWorkAssignment.positionId, input.positionId),
						isNull(hrWorkAssignment.endsOn),
					),
				);
			return ok(rows[0]?.count ?? 0);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to count open assignments for position",
			);
		}
	}

	async countActiveOrFrozenPositionsForDepartment(input: {
		organizationId: string;
		departmentId: HumanResourcesDepartmentId;
	}): Promise<Result<number>> {
		try {
			const rows = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(hrPosition)
				.where(
					and(
						eq(hrPosition.organizationId, input.organizationId),
						eq(hrPosition.departmentId, input.departmentId),
						or(
							eq(hrPosition.status, "active"),
							eq(hrPosition.status, "frozen"),
						),
					),
				);
			return ok(rows[0]?.count ?? 0);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to count active or frozen positions for department",
			);
		}
	}

	async countActiveOrFrozenPositionsForJob(input: {
		organizationId: string;
		jobId: HumanResourcesJobId;
	}): Promise<Result<number>> {
		try {
			const rows = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(hrPosition)
				.where(
					and(
						eq(hrPosition.organizationId, input.organizationId),
						eq(hrPosition.jobId, input.jobId),
						or(
							eq(hrPosition.status, "active"),
							eq(hrPosition.status, "frozen"),
						),
					),
				);
			return ok(rows[0]?.count ?? 0);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to count active or frozen positions for job",
			);
		}
	}

	async countActiveChildDepartments(input: {
		organizationId: string;
		parentDepartmentId: HumanResourcesDepartmentId;
	}): Promise<Result<number>> {
		try {
			const rows = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(hrDepartment)
				.where(
					and(
						eq(hrDepartment.organizationId, input.organizationId),
						eq(hrDepartment.parentDepartmentId, input.parentDepartmentId),
						eq(hrDepartment.status, "active"),
					),
				);
			return ok(rows[0]?.count ?? 0);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to count active child departments",
			);
		}
	}

	async getAssignmentById(input: {
		organizationId: string;
		assignmentId: HumanResourcesAssignmentId;
	}): Promise<Result<WorkAssignment | null>> {
		try {
			const result = await db
				.select()
				.from(hrWorkAssignment)
				.where(
					and(
						eq(hrWorkAssignment.organizationId, input.organizationId),
						eq(hrWorkAssignment.id, input.assignmentId),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapAssignment(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load assignment");
		}
	}

	async findOpenAssignmentByEmployment(input: {
		organizationId: string;
		employmentId: HumanResourcesEmploymentId;
	}): Promise<Result<WorkAssignment | null>> {
		try {
			const result = await db
				.select()
				.from(hrWorkAssignment)
				.where(
					and(
						eq(hrWorkAssignment.organizationId, input.organizationId),
						eq(hrWorkAssignment.employmentId, input.employmentId),
						isNull(hrWorkAssignment.endsOn),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapAssignment(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to find open assignment");
		}
	}

	async createAssignment(
		record: AssignmentCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkAssignment>> {
		const dateCheck = assertValidDateRange(record.startsOn, record.endsOn);
		if (!dateCheck.ok) {
			return dateCheck;
		}
		const entityId = randomUUID();
		const brandedId = parseHumanResourcesAssignmentId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					{
						id: string;
						organization_id: string;
						employment_id: string;
						employee_id: string;
						position_id: string;
						starts_on: string;
						ends_on: string | null;
						version: number;
						created_by: string;
						updated_by: string;
						created_at: Date;
						updated_at: Date;
					}[],
				]
			>((sql) => [
				sql`
					WITH employment AS (
						SELECT id, organization_id, employee_id
						FROM hr_employment
						WHERE id = ${record.employmentId}
							AND organization_id = ${record.organizationId}
							AND employee_id = ${record.employeeId}
					),
					position AS (
						SELECT id
						FROM hr_position
						WHERE id = ${record.positionId}
							AND organization_id = ${record.organizationId}
							AND status = 'active'
					),
					mutated AS (
						INSERT INTO hr_work_assignment (
							id, organization_id, employment_id, employee_id, position_id,
							starts_on, ends_on, version, created_by, updated_by
						)
						SELECT
							${brandedId.data}, employment.organization_id, employment.id,
							employment.employee_id, position.id, ${record.startsOn},
							${record.endsOn}, 1, ${record.createdBy}, ${record.createdBy}
						FROM employment, position
						WHERE NOT EXISTS (
							SELECT 1
							FROM hr_work_assignment open_assignment
							WHERE open_assignment.organization_id = employment.organization_id
								AND open_assignment.employment_id = employment.id
								AND open_assignment.ends_on IS NULL
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
							'human-resources', 'hr_work_assignment', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				const employment = await this.getEmploymentById({
					organizationId: record.organizationId,
					employmentId: record.employmentId,
				});
				if (!employment.ok) return employment;
				if (employment.data === null) {
					return fail(
						"NOT_FOUND",
						"Employment not found",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					);
				}
				const position = await this.getPositionById({
					organizationId: record.organizationId,
					positionId: record.positionId,
				});
				if (!position.ok) return position;
				if (position.data === null) {
					return fail(
						"NOT_FOUND",
						"Position not found",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
						),
					);
				}
				if (position.data.status !== "active") {
					return fail(
						"BAD_REQUEST",
						"Position is not active",
						humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
						),
					);
				}
				return fail(
					"CONFLICT",
					"Employment already has an open assignment",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
				);
			}
			const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
			const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
			const positionId = parseHumanResourcesPositionId(row.position_id);
			if (!employmentId.ok) return employmentId;
			if (!employeeId.ok) return employeeId;
			if (!positionId.ok) return positionId;
			return ok({
				id: brandedId.data,
				organizationId: row.organization_id,
				employmentId: employmentId.data,
				employeeId: employeeId.data,
				positionId: positionId.data,
				startsOn: row.starts_on,
				endsOn: row.ends_on,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to create assignment");
		}
	}

	async endAssignment(
		input: {
			organizationId: string;
			assignmentId: HumanResourcesAssignmentId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<WorkAssignment>> {
		const existing = await this.getAssignmentById({
			organizationId: input.organizationId,
			assignmentId: input.assignmentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return missAfterOptimisticUpdate({
				found: false,
				entityLabel: "Assignment",
			});
		}
		const dateCheck = assertValidDateRange(
			existing.data.startsOn,
			input.endsOn,
		);
		if (!dateCheck.ok) {
			return dateCheck;
		}
		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					{
						id: string;
						organization_id: string;
						employment_id: string;
						employee_id: string;
						position_id: string;
						starts_on: string;
						ends_on: string | null;
						version: number;
						created_by: string;
						updated_by: string;
						created_at: Date;
						updated_at: Date;
					}[],
				]
			>((sql) => [
				sql`
					WITH mutated AS (
						UPDATE hr_work_assignment
						SET ends_on = ${input.endsOn},
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.assignmentId}
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
							'human-resources', 'hr_work_assignment', id, 'UPDATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				const existing = await this.getAssignmentById({
					organizationId: input.organizationId,
					assignmentId: input.assignmentId,
				});
				if (!existing.ok) return existing;
				return missAfterOptimisticUpdate({
					found: existing.data !== null,
					entityLabel: "Assignment",
				});
			}
			const employmentId = parseHumanResourcesEmploymentId(row.employment_id);
			const employeeId = parseHumanResourcesEmployeeId(row.employee_id);
			const positionId = parseHumanResourcesPositionId(row.position_id);
			if (!employmentId.ok) return employmentId;
			if (!employeeId.ok) return employeeId;
			if (!positionId.ok) return positionId;
			return ok({
				id: input.assignmentId,
				organizationId: row.organization_id,
				employmentId: employmentId.data,
				employeeId: employeeId.data,
				positionId: positionId.data,
				startsOn: row.starts_on,
				endsOn: row.ends_on,
				version: row.version,
				createdBy: row.created_by,
				updatedBy: row.updated_by,
				createdAt: row.created_at,
				updatedAt: row.updated_at,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to end assignment");
		}
	}

	async getReportingLineById(input: {
		organizationId: string;
		reportingLineId: HumanResourcesReportingLineId;
	}): Promise<Result<ReportingLine | null>> {
		try {
			const result = await db
				.select()
				.from(hrReportingLine)
				.where(
					and(
						eq(hrReportingLine.organizationId, input.organizationId),
						eq(hrReportingLine.id, input.reportingLineId),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapReportingLine(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load reporting line");
		}
	}

	async listReportingLinesForEmployee(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ReportingLine[]>> {
		try {
			const rows = await db
				.select()
				.from(hrReportingLine)
				.where(
					and(
						eq(hrReportingLine.organizationId, input.organizationId),
						eq(hrReportingLine.employeeId, input.employeeId),
					),
				)
				.orderBy(desc(hrReportingLine.startsOn));
			const lines: ReportingLine[] = [];
			for (const row of rows) {
				const mapped = mapReportingLine(row);
				if (!mapped.ok) return mapped;
				lines.push(mapped.data);
			}
			return ok(lines);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list reporting lines for employee",
			);
		}
	}

	async findOpenPrimaryReportingLine(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
	}): Promise<Result<ReportingLine | null>> {
		try {
			const result = await db
				.select()
				.from(hrReportingLine)
				.where(
					and(
						eq(hrReportingLine.organizationId, input.organizationId),
						eq(hrReportingLine.employeeId, input.employeeId),
						eq(hrReportingLine.relationshipKind, "primary"),
						isNull(hrReportingLine.endsOn),
					),
				)
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapReportingLine(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find open primary reporting line",
			);
		}
	}

	async resolvePrimaryManager(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		asOf: string;
	}): Promise<Result<ReportingLine | null>> {
		try {
			const result = await db
				.select()
				.from(hrReportingLine)
				.where(
					and(
						eq(hrReportingLine.organizationId, input.organizationId),
						eq(hrReportingLine.employeeId, input.employeeId),
						eq(hrReportingLine.relationshipKind, "primary"),
						lte(hrReportingLine.startsOn, input.asOf),
						or(
							isNull(hrReportingLine.endsOn),
							gte(hrReportingLine.endsOn, input.asOf),
						),
					),
				)
				.orderBy(desc(hrReportingLine.startsOn))
				.limit(1);
			if (result.length === 0) return ok(null);
			return mapReportingLine(result[0]!);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to resolve primary manager");
		}
	}

	async listDirectReports(input: {
		organizationId: string;
		managerEmployeeId: HumanResourcesEmployeeId;
		asOf: string;
		page: number;
		pageSize: number;
	}): Promise<Result<{ reportingLines: ReportingLine[]; totalCount: number }>> {
		try {
			const conditions = and(
				eq(hrReportingLine.organizationId, input.organizationId),
				eq(hrReportingLine.managerEmployeeId, input.managerEmployeeId),
				eq(hrReportingLine.relationshipKind, "primary"),
				lte(hrReportingLine.startsOn, input.asOf),
				or(
					isNull(hrReportingLine.endsOn),
					gte(hrReportingLine.endsOn, input.asOf),
				),
			);
			const offset = (input.page - 1) * input.pageSize;
			const [rows, countRows] = await Promise.all([
				db
					.select()
					.from(hrReportingLine)
					.where(conditions)
					.orderBy(asc(hrReportingLine.startsOn))
					.limit(input.pageSize)
					.offset(offset),
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(hrReportingLine)
					.where(conditions),
			]);
			const reportingLines: ReportingLine[] = [];
			for (const row of rows) {
				const mapped = mapReportingLine(row);
				if (!mapped.ok) return mapped;
				reportingLines.push(mapped.data);
			}
			return ok({
				reportingLines,
				totalCount: countRows[0]?.count ?? 0,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list direct reports");
		}
	}

	private async assertReportingLineAssignable(input: {
		organizationId: string;
		employeeId: HumanResourcesEmployeeId;
		managerEmployeeId: HumanResourcesEmployeeId;
		startsOn: string;
		endsOn: string | null;
		excludeReportingLineId?: HumanResourcesReportingLineId;
	}): Promise<Result<void>> {
		const dateCheck = assertValidDateRange(input.startsOn, input.endsOn);
		if (!dateCheck.ok) return dateCheck;

		const employee = await this.getEmployeeById({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!employee.ok) return employee;
		if (employee.data === null) {
			return fail(
				"NOT_FOUND",
				"Employee not found",
				humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				),
			);
		}
		const manager = await this.getEmployeeById({
			organizationId: input.organizationId,
			employeeId: input.managerEmployeeId,
		});
		if (!manager.ok) return manager;
		if (manager.data === null) {
			return fail(
				"NOT_FOUND",
				"Manager employee not found",
				humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				),
			);
		}

		const managerCache = new Map<
			string,
			HumanResourcesEmployeeId | null | undefined
		>();
		let current: HumanResourcesEmployeeId | null = input.managerEmployeeId;
		while (current !== null) {
			if (managerCache.has(current)) break;
			const openPrimary = await this.findOpenPrimaryReportingLine({
				organizationId: input.organizationId,
				employeeId: current,
			});
			if (!openPrimary.ok) return openPrimary;
			const next =
				openPrimary.data === null ? null : openPrimary.data.managerEmployeeId;
			managerCache.set(current, next);
			current = next;
		}

		const acyclic = assertReportingLineAcyclic({
			employeeId: input.employeeId,
			managerEmployeeId: input.managerEmployeeId,
			getOpenPrimaryManagerId: (employeeId) => managerCache.get(employeeId),
		});
		if (!acyclic.ok) return acyclic;

		const existingLines = await this.listReportingLinesForEmployee({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!existingLines.ok) return existingLines;
		const overlapCandidates = existingLines.data.filter(
			(line) =>
				input.excludeReportingLineId === undefined ||
				line.id !== input.excludeReportingLineId,
		);
		const openPrimary = overlapCandidates.find(
			(line) => line.relationshipKind === "primary" && line.endsOn === null,
		);
		if (openPrimary !== undefined) {
			return conflict("Employee already has an open primary reporting line");
		}
		return assertNoPrimaryReportingOverlap({
			candidateStartsOn: input.startsOn,
			candidateEndsOn: input.endsOn,
			existing: overlapCandidates,
		});
	}

	async assignPrimaryReportingLine(
		record: ReportingLineCreateRecord,
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReportingLine>> {
		const assignable = await this.assertReportingLineAssignable({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
			managerEmployeeId: record.managerEmployeeId,
			startsOn: record.startsOn,
			endsOn: record.endsOn,
		});
		if (!assignable.ok) return assignable;

		const entityId = randomUUID();
		const brandedId = parseHumanResourcesReportingLineId(entityId);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[ReportingLineSqlRow[]]>(
				(sql) => [
					sql`
						WITH employee AS (
							SELECT id, organization_id
							FROM hr_employee
							WHERE id = ${record.employeeId}
								AND organization_id = ${record.organizationId}
						),
						manager AS (
							SELECT id
							FROM hr_employee
							WHERE id = ${record.managerEmployeeId}
								AND organization_id = ${record.organizationId}
						),
						mutated AS (
							INSERT INTO hr_reporting_line (
								id, organization_id, employee_id, manager_employee_id,
								relationship_kind, starts_on, ends_on, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, employee.organization_id, employee.id, manager.id,
								'primary', ${record.startsOn}, ${record.endsOn}, 1,
								${record.createdBy}, ${record.createdBy}
							FROM employee, manager
							WHERE NOT EXISTS (
								SELECT 1
								FROM hr_reporting_line open_primary
								WHERE open_primary.organization_id = employee.organization_id
									AND open_primary.employee_id = employee.id
									AND open_primary.relationship_kind = 'primary'
									AND open_primary.ends_on IS NULL
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
								'human-resources', 'hr_reporting_line', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Employee already has an open primary reporting line");
			}
			return mapReportingLineSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Employee already has an open primary reporting line");
			}
			return mapPersistenceFailure(
				error,
				"Failed to assign primary reporting line",
			);
		}
	}

	async closeReportingLine(
		input: {
			organizationId: string;
			reportingLineId: HumanResourcesReportingLineId;
			endsOn: string;
			expectedVersion: number;
			actorUserId: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReportingLine>> {
		const existing = await this.getReportingLineById({
			organizationId: input.organizationId,
			reportingLineId: input.reportingLineId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Reporting line not found");
		}
		const dateCheck = assertValidDateRange(
			existing.data.startsOn,
			input.endsOn,
		);
		if (!dateCheck.ok) return dateCheck;

		const auditId = randomUUID();
		const nextVersion = input.expectedVersion + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[ReportingLineSqlRow[]]>(
				(sql) => [
					sql`
						WITH mutated AS (
							UPDATE hr_reporting_line
							SET ends_on = ${input.endsOn},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.reportingLineId}
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
								'human-resources', 'hr_reporting_line', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				const again = await this.getReportingLineById({
					organizationId: input.organizationId,
					reportingLineId: input.reportingLineId,
				});
				if (!again.ok) return again;
				return missAfterOptimisticUpdate({
					found: again.data !== null,
					entityLabel: "Reporting line",
				});
			}
			return mapReportingLineSqlRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to close reporting line");
		}
	}

	async replacePrimaryReportingLine(
		input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			managerEmployeeId: HumanResourcesEmployeeId;
			startsOn: string;
			endsOn: string | null;
			closePriorOn: string;
			createdBy: string;
		},
		_ports: MutationPorts,
		meta: { correlationId: string },
	): Promise<Result<ReportingLine>> {
		const prior = await this.findOpenPrimaryReportingLine({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!prior.ok) return prior;
		if (prior.data === null) {
			return notFound("Open primary reporting line not found");
		}
		const priorLine = prior.data;
		const closeDateCheck = assertValidDateRange(
			priorLine.startsOn,
			input.closePriorOn,
		);
		if (!closeDateCheck.ok) return closeDateCheck;
		if (input.closePriorOn > input.startsOn) {
			return fail(
				"BAD_REQUEST",
				"Prior reporting line close date must be on or before new start date",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_INVALID_INPUT),
			);
		}

		const assignable = await this.assertReportingLineAssignable({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
			managerEmployeeId: input.managerEmployeeId,
			startsOn: input.startsOn,
			endsOn: input.endsOn,
			excludeReportingLineId: priorLine.id,
		});
		if (!assignable.ok) return assignable;

		const newId = randomUUID();
		const brandedId = parseHumanResourcesReportingLineId(newId);
		if (!brandedId.ok) return brandedId;
		const closeAuditId = randomUUID();
		const createAuditId = randomUUID();
		const nextPriorVersion = priorLine.version + 1;
		try {
			const [rows] = await runNeonHttpTransaction<[ReportingLineSqlRow[]]>(
				(sql) => [
					sql`
						WITH closed AS (
							UPDATE hr_reporting_line
							SET ends_on = ${input.closePriorOn},
								version = ${nextPriorVersion},
								updated_by = ${input.createdBy},
								updated_at = now()
							WHERE id = ${priorLine.id}
								AND organization_id = ${input.organizationId}
								AND version = ${priorLine.version}
								AND ends_on IS NULL
							RETURNING *
						),
						closed_audit AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${closeAuditId}, organization_id, ${input.createdBy}, ${meta.correlationId},
								'human-resources', 'hr_reporting_line', id, 'UPDATE', '[]'::jsonb
							FROM closed
							RETURNING id
						),
						employee AS (
							SELECT id, organization_id
							FROM hr_employee
							WHERE id = ${input.employeeId}
								AND organization_id = ${input.organizationId}
						),
						manager AS (
							SELECT id
							FROM hr_employee
							WHERE id = ${input.managerEmployeeId}
								AND organization_id = ${input.organizationId}
						),
						mutated AS (
							INSERT INTO hr_reporting_line (
								id, organization_id, employee_id, manager_employee_id,
								relationship_kind, starts_on, ends_on, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, employee.organization_id, employee.id, manager.id,
								'primary', ${input.startsOn}, ${input.endsOn}, 1,
								${input.createdBy}, ${input.createdBy}
							FROM employee, manager, closed
							RETURNING *
						),
						created_audit AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${createAuditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_reporting_line', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, closed_audit, created_audit
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Could not replace primary reporting line");
			}
			return mapReportingLineSqlRow(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Employee already has an open primary reporting line");
			}
			return mapPersistenceFailure(
				error,
				"Failed to replace primary reporting line",
			);
		}
	}

	async getOrganizationTree(input: {
		organizationId: string;
		rootDepartmentId: HumanResourcesDepartmentId | null;
		maxDepth: number;
		maxNodes: number;
	}): Promise<Result<OrganizationTreePage>> {
		const departments = await this.listAllDepartments({
			organizationId: input.organizationId,
		});
		if (!departments.ok) return departments;
		if (input.rootDepartmentId !== null) {
			const root = departments.data.find(
				(d) => d.id === input.rootDepartmentId,
			);
			if (root === undefined) {
				return notFound("Root department not found");
			}
		}
		const tree = buildBoundedDepartmentTree({
			departments: departments.data,
			rootDepartmentId: input.rootDepartmentId,
			maxDepth: input.maxDepth,
			maxNodes: input.maxNodes,
		});
		return ok(tree);
	}

	private async validateRequisitionReferences(input: {
		organizationId: string;
		jobId: HumanResourcesJobId | null;
		positionId: HumanResourcesPositionId | null;
		departmentId: HumanResourcesDepartmentId | null;
	}): Promise<Result<void>> {
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
	}

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
	}

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
	}

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

		const refs = await this.validateRequisitionReferences({
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
	}

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

		const refs = await this.validateRequisitionReferences({
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
	}

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
							)
							SELECT mutated.* FROM mutated, audited, outboxed
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
			return mapPersistenceFailure(
				error,
				"Failed to transition requisition status",
			);
		}
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
	}

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
					)
					SELECT
						updated_offer.*,
						updated_application.candidate_id,
						updated_application.requisition_id
					FROM updated_offer, offer_audited, updated_application, application_audited, outboxed
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
	}

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
	}
}

export function createDrizzleHumanResourcesStore(): DrizzleHumanResourcesStore {
	return new DrizzleHumanResourcesStore();
}

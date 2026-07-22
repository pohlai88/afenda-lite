import { randomUUID } from "node:crypto";

import {
	and,
	db,
	desc,
	eq,
	hrCareerPlan,
	hrCareerPlanAction,
	hrCompetency,
	hrCompetencyAssessment,
	hrJobCompetency,
	hrSuccessionCandidate,
	hrSuccessionPlan,
	hrTalentPool,
	hrTalentPoolMember,
	hrTalentProfile,
	hrTalentProfileAssessment,
	inArray,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_CAREER_PLAN_ACKNOWLEDGED_EVENT,
	HUMAN_RESOURCES_COMPETENCY_ASSESSED_EVENT,
	HUMAN_RESOURCES_SUCCESSION_CANDIDATE_APPROVED_EVENT,
	HUMAN_RESOURCES_SUCCESSION_READINESS_CHANGED_EVENT,
	HUMAN_RESOURCES_TALENT_POOL_MEMBERSHIP_APPROVED_EVENT,
} from "@afenda/events/schemas";

import {
	parseHumanResourcesCareerPlanActionId,
	parseHumanResourcesCareerPlanId,
	parseHumanResourcesCompetencyAssessmentId,
	parseHumanResourcesCompetencyId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesJobCompetencyId,
	parseHumanResourcesJobId,
	parseHumanResourcesLearningAssignmentId,
	parseHumanResourcesPositionId,
	parseHumanResourcesSuccessionCandidateId,
	parseHumanResourcesSuccessionPlanId,
	parseHumanResourcesTalentPoolId,
	parseHumanResourcesTalentPoolMemberId,
	parseHumanResourcesTalentProfileAssessmentId,
	parseHumanResourcesTalentProfileId,
} from "../../brands";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../shared/domain-guards";
import type { EmploymentStatus } from "../../shared/employment-status";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../shared/persistence-errors";
import {
	assertAssessmentInputValid,
	assertAssessmentSupersedable,
	assertCareerPlanAcknowledgeable,
	assertCareerPlanActionAddable,
	assertCareerPlanActionCompletable,
	assertCareerPlanOpen,
	assertCareerPlanStatusTransition,
	assertCompetencyStatusTransition,
	assertJobCompetencyMappable,
	assertJobCompetencyRemovable,
	assertProfileAssessmentConfirmable,
	assertProfileAssessmentDraftable,
	assertReadinessAssessmentValid,
	assertReadinessNotStale,
	assertSuccessionCandidateActive,
	assertSuccessionCandidateApprovable,
	assertSuccessionCandidateNominatable,
	assertSuccessionCandidateRemovable,
	assertSuccessionPlanStatusTransition,
	assertTalentPoolClosable,
	assertTalentPoolMemberApprovable,
	assertTalentPoolMemberNominatable,
	assertTalentPoolMemberRemovable,
	assertTalentPoolOpen,
	assertTalentProfileActive,
	assertTalentProfileArchivable,
} from "../../shared/talent-guards";
import {
	careerPlanActionStatusSchema,
	careerPlanStatusSchema,
	competencyAssessmentStatusSchema,
	competencyScaleCodeSchema,
	competencyStatusSchema,
	jobCompetencyStatusSchema,
	successionCandidateStatusSchema,
	successionPlanStatusSchema,
	successionReadinessCodeSchema,
	talentPoolMemberStatusSchema,
	talentPoolStatusSchema,
	talentProfileAssessmentMethodCodeSchema,
	talentProfileAssessmentStatusSchema,
	talentProfileStatusSchema,
} from "../../shared/talent-status";
import type { HumanResourcesStore } from "../../store";
import type {
	CareerPlan,
	CareerPlanAction,
	CareerPlanWithActions,
	Competency,
	CompetencyAssessment,
	EmployeeCompetencyProfile,
	JobCompetency,
	PositionSuccessionCoverage,
	SuccessionCandidate,
	SuccessionPlan,
	TalentPool,
	TalentPoolMember,
	TalentProfile,
	TalentProfileAssessment,
} from "../../types";

type TalentHost = {
	getEmployeeById: HumanResourcesStore["getEmployeeById"];
	getEmploymentById: HumanResourcesStore["getEmploymentById"];
	getJobById: HumanResourcesStore["getJobById"];
	getPositionById: HumanResourcesStore["getPositionById"];
	getLearningAssignmentById: HumanResourcesStore["getLearningAssignmentById"];
	findOpenEmploymentByEmployee: HumanResourcesStore["findOpenEmploymentByEmployee"];
};

export type DrizzleTalentMethods = Pick<
	HumanResourcesStore,
	| "getCompetencyById"
	| "findCompetencyByIdempotencyKey"
	| "createCompetency"
	| "updateCompetency"
	| "retireCompetency"
	| "listCompetencies"
	| "mapCompetencyToJob"
	| "removeCompetencyFromJob"
	| "listJobCompetencies"
	| "getCompetencyAssessmentById"
	| "findCurrentCompetencyAssessment"
	| "findCompetencyAssessmentByIdempotencyKey"
	| "createCompetencyAssessment"
	| "supersedeCompetencyAssessment"
	| "getEmployeeCompetencyProfile"
	| "getTalentProfileById"
	| "findTalentProfileByEmployeeId"
	| "findTalentProfileByIdempotencyKey"
	| "createTalentProfile"
	| "updateTalentProfile"
	| "archiveTalentProfile"
	| "getTalentProfileByEmployee"
	| "recordTalentProfileAssessment"
	| "confirmTalentProfileAssessment"
	| "getTalentPoolById"
	| "findTalentPoolByIdempotencyKey"
	| "createTalentPool"
	| "updateTalentPool"
	| "closeTalentPool"
	| "findTalentPoolMemberByIdempotencyKey"
	| "nominateTalentPoolMember"
	| "approveTalentPoolMember"
	| "removeTalentPoolMember"
	| "listTalentPoolMembers"
	| "findCareerPlanByIdempotencyKey"
	| "createCareerPlan"
	| "updateCareerPlan"
	| "acknowledgeCareerPlan"
	| "closeCareerPlan"
	| "getCareerPlanById"
	| "listEmployeeCareerPlans"
	| "addCareerPlanAction"
	| "completeCareerPlanAction"
	| "getCareerPlanActionById"
	| "findSuccessionPlanByIdempotencyKey"
	| "createSuccessionPlan"
	| "updateSuccessionPlan"
	| "closeSuccessionPlan"
	| "getSuccessionPlanById"
	| "listSuccessionPlans"
	| "findSuccessionCandidateByIdempotencyKey"
	| "nominateSuccessionCandidate"
	| "assessSuccessionReadiness"
	| "approveSuccessionCandidate"
	| "removeSuccessionCandidate"
	| "listSuccessionCandidates"
	| "getPositionSuccessionCoverage"
>;

function todayIsoDate(): string {
	return new Date().toISOString().slice(0, 10);
}

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

function paginate<T extends { createdAt: Date }>(
	items: T[],
	page: number,
	pageSize: number,
): { items: T[]; totalCount: number } {
	const sorted = [...items].sort(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
	);
	const offset = (page - 1) * pageSize;
	return {
		items: sorted.slice(offset, offset + pageSize),
		totalCount: sorted.length,
	};
}

type CompetencySqlRow = {
	id: string;
	organization_id: string;
	code: string;
	name: string;
	description: string | null;
	category: string | null;
	scale_code: string;
	status: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type JobCompetencySqlRow = {
	id: string;
	organization_id: string;
	job_id: string;
	competency_id: string;
	required_level: number;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type CompetencyAssessmentSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	competency_id: string;
	assessor_user_id: string;
	evidence_source: string;
	scale_code: string;
	level: number;
	effective_on: string;
	status: string;
	supersedes_assessment_id: string | null;
	superseded_by_assessment_id: string | null;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type TalentProfileSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	summary: string | null;
	current_classification: string | null;
	status: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type TalentProfileAssessmentSqlRow = {
	id: string;
	organization_id: string;
	talent_profile_id: string;
	method_code: string;
	classification: string;
	evidence_summary: string;
	assessor_user_id: string;
	status: string;
	confirmed_at: Date | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type TalentPoolSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	name: string;
	description: string | null;
	status: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type TalentPoolMemberSqlRow = {
	id: string;
	organization_id: string;
	pool_id: string;
	employee_id: string;
	nominator_user_id: string;
	status: string;
	nominated_at: Date;
	approved_at: Date | null;
	removed_at: Date | null;
	approver_user_id: string | null;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type CareerPlanSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	owner_user_id: string;
	code: string;
	title: string;
	status: string;
	acknowledged_at: Date | null;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type CareerPlanActionSqlRow = {
	id: string;
	organization_id: string;
	career_plan_id: string;
	title: string;
	due_on: string | null;
	status: string;
	learning_assignment_id: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type SuccessionPlanSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	title: string;
	position_id: string;
	status: string;
	allows_external_candidates: boolean;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type SuccessionCandidateSqlRow = {
	id: string;
	organization_id: string;
	succession_plan_id: string;
	employee_id: string | null;
	external_candidate_ref: string | null;
	nominator_user_id: string;
	readiness: string;
	readiness_effective_on: string;
	evidence_summary: string;
	status: string;
	create_idempotency_key: string | null;
	create_request_fingerprint: string | null;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapCompetency(
	row: typeof hrCompetency.$inferSelect,
): Result<Competency> {
	const id = parseHumanResourcesCompetencyId(row.id);
	if (!id.ok) return id;
	const scaleCode = competencyScaleCodeSchema.safeParse(row.scaleCode);
	if (!scaleCode.success) {
		return fail("INTERNAL_ERROR", "Invalid competency scale code");
	}
	const status = competencyStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid competency status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		description: row.description,
		category: row.category,
		scaleCode: scaleCode.data,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapCompetencySql(row: CompetencySqlRow): Result<Competency> {
	return mapCompetency({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		description: row.description,
		category: row.category,
		scaleCode: row.scale_code,
		status: row.status,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapJobCompetency(
	row: typeof hrJobCompetency.$inferSelect,
): Result<JobCompetency> {
	const id = parseHumanResourcesJobCompetencyId(row.id);
	if (!id.ok) return id;
	const jobId = parseHumanResourcesJobId(row.jobId);
	if (!jobId.ok) return jobId;
	const competencyId = parseHumanResourcesCompetencyId(row.competencyId);
	if (!competencyId.ok) return competencyId;
	const status = jobCompetencyStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid job competency status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		jobId: jobId.data,
		competencyId: competencyId.data,
		requiredLevel: row.requiredLevel,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapJobCompetencySql(row: JobCompetencySqlRow): Result<JobCompetency> {
	return mapJobCompetency({
		id: row.id,
		organizationId: row.organization_id,
		jobId: row.job_id,
		competencyId: row.competency_id,
		requiredLevel: row.required_level,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapCompetencyAssessment(
	row: typeof hrCompetencyAssessment.$inferSelect,
): Result<CompetencyAssessment> {
	const id = parseHumanResourcesCompetencyAssessmentId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const competencyId = parseHumanResourcesCompetencyId(row.competencyId);
	if (!competencyId.ok) return competencyId;
	const scaleCode = competencyScaleCodeSchema.safeParse(row.scaleCode);
	if (!scaleCode.success) {
		return fail("INTERNAL_ERROR", "Invalid competency assessment scale code");
	}
	const status = competencyAssessmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid competency assessment status");
	}
	let supersedesAssessmentId =
		null as CompetencyAssessment["supersedesAssessmentId"];
	if (row.supersedesAssessmentId !== null) {
		const parsed = parseHumanResourcesCompetencyAssessmentId(
			row.supersedesAssessmentId,
		);
		if (!parsed.ok) return parsed;
		supersedesAssessmentId = parsed.data;
	}
	let supersededByAssessmentId =
		null as CompetencyAssessment["supersededByAssessmentId"];
	if (row.supersededByAssessmentId !== null) {
		const parsed = parseHumanResourcesCompetencyAssessmentId(
			row.supersededByAssessmentId,
		);
		if (!parsed.ok) return parsed;
		supersededByAssessmentId = parsed.data;
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		competencyId: competencyId.data,
		assessorUserId: row.assessorUserId,
		evidenceSource: row.evidenceSource,
		scaleCode: scaleCode.data,
		level: row.level,
		effectiveOn: row.effectiveOn,
		status: status.data,
		supersedesAssessmentId,
		supersededByAssessmentId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapCompetencyAssessmentSql(
	row: CompetencyAssessmentSqlRow,
): Result<CompetencyAssessment> {
	return mapCompetencyAssessment({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		competencyId: row.competency_id,
		assessorUserId: row.assessor_user_id,
		evidenceSource: row.evidence_source,
		scaleCode: row.scale_code,
		level: row.level,
		effectiveOn: row.effective_on,
		status: row.status,
		supersedesAssessmentId: row.supersedes_assessment_id,
		supersededByAssessmentId: row.superseded_by_assessment_id,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapTalentProfile(
	row: typeof hrTalentProfile.$inferSelect,
): Result<TalentProfile> {
	const id = parseHumanResourcesTalentProfileId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const status = talentProfileStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid talent profile status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		summary: row.summary,
		currentClassification: row.currentClassification,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapTalentProfileSql(row: TalentProfileSqlRow): Result<TalentProfile> {
	return mapTalentProfile({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		summary: row.summary,
		currentClassification: row.current_classification,
		status: row.status,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapTalentProfileAssessment(
	row: typeof hrTalentProfileAssessment.$inferSelect,
): Result<TalentProfileAssessment> {
	const id = parseHumanResourcesTalentProfileAssessmentId(row.id);
	if (!id.ok) return id;
	const talentProfileId = parseHumanResourcesTalentProfileId(
		row.talentProfileId,
	);
	if (!talentProfileId.ok) return talentProfileId;
	const methodCode = talentProfileAssessmentMethodCodeSchema.safeParse(
		row.methodCode,
	);
	if (!methodCode.success) {
		return fail("INTERNAL_ERROR", "Invalid talent profile assessment method");
	}
	const status = talentProfileAssessmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid talent profile assessment status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		talentProfileId: talentProfileId.data,
		methodCode: methodCode.data,
		classification: row.classification,
		evidenceSummary: row.evidenceSummary,
		assessorUserId: row.assessorUserId,
		status: status.data,
		confirmedAt: row.confirmedAt,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapTalentProfileAssessmentSql(
	row: TalentProfileAssessmentSqlRow,
): Result<TalentProfileAssessment> {
	return mapTalentProfileAssessment({
		id: row.id,
		organizationId: row.organization_id,
		talentProfileId: row.talent_profile_id,
		methodCode: row.method_code,
		classification: row.classification,
		evidenceSummary: row.evidence_summary,
		assessorUserId: row.assessor_user_id,
		status: row.status,
		confirmedAt: row.confirmed_at,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapTalentPool(
	row: typeof hrTalentPool.$inferSelect,
): Result<TalentPool> {
	const id = parseHumanResourcesTalentPoolId(row.id);
	if (!id.ok) return id;
	const status = talentPoolStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid talent pool status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		description: row.description,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapTalentPoolSql(row: TalentPoolSqlRow): Result<TalentPool> {
	return mapTalentPool({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		description: row.description,
		status: row.status,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapTalentPoolMember(
	row: typeof hrTalentPoolMember.$inferSelect,
): Result<TalentPoolMember> {
	const id = parseHumanResourcesTalentPoolMemberId(row.id);
	if (!id.ok) return id;
	const poolId = parseHumanResourcesTalentPoolId(row.poolId);
	if (!poolId.ok) return poolId;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const status = talentPoolMemberStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid talent pool member status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		poolId: poolId.data,
		employeeId: employeeId.data,
		nominatorUserId: row.nominatorUserId,
		status: status.data,
		nominatedAt: row.nominatedAt,
		approvedAt: row.approvedAt,
		removedAt: row.removedAt,
		approverUserId: row.approverUserId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapTalentPoolMemberSql(
	row: TalentPoolMemberSqlRow,
): Result<TalentPoolMember> {
	return mapTalentPoolMember({
		id: row.id,
		organizationId: row.organization_id,
		poolId: row.pool_id,
		employeeId: row.employee_id,
		nominatorUserId: row.nominator_user_id,
		status: row.status,
		nominatedAt: row.nominated_at,
		approvedAt: row.approved_at,
		removedAt: row.removed_at,
		approverUserId: row.approver_user_id,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapCareerPlan(
	row: typeof hrCareerPlan.$inferSelect,
): Result<CareerPlan> {
	const id = parseHumanResourcesCareerPlanId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const status = careerPlanStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid career plan status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		ownerUserId: row.ownerUserId,
		code: row.code,
		title: row.title,
		status: status.data,
		acknowledgedAt: row.acknowledgedAt,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapCareerPlanSql(row: CareerPlanSqlRow): Result<CareerPlan> {
	return mapCareerPlan({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		ownerUserId: row.owner_user_id,
		code: row.code,
		title: row.title,
		status: row.status,
		acknowledgedAt: row.acknowledged_at,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapCareerPlanAction(
	row: typeof hrCareerPlanAction.$inferSelect,
): Result<CareerPlanAction> {
	const id = parseHumanResourcesCareerPlanActionId(row.id);
	if (!id.ok) return id;
	const careerPlanId = parseHumanResourcesCareerPlanId(row.careerPlanId);
	if (!careerPlanId.ok) return careerPlanId;
	let learningAssignmentId = null as CareerPlanAction["learningAssignmentId"];
	if (row.learningAssignmentId !== null) {
		const parsed = parseHumanResourcesLearningAssignmentId(
			row.learningAssignmentId,
		);
		if (!parsed.ok) return parsed;
		learningAssignmentId = parsed.data;
	}
	const status = careerPlanActionStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid career plan action status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		careerPlanId: careerPlanId.data,
		title: row.title,
		dueOn: row.dueOn,
		status: status.data,
		learningAssignmentId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapCareerPlanActionSql(
	row: CareerPlanActionSqlRow,
): Result<CareerPlanAction> {
	return mapCareerPlanAction({
		id: row.id,
		organizationId: row.organization_id,
		careerPlanId: row.career_plan_id,
		title: row.title,
		dueOn: row.due_on,
		status: row.status,
		learningAssignmentId: row.learning_assignment_id,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapSuccessionPlan(
	row: typeof hrSuccessionPlan.$inferSelect,
): Result<SuccessionPlan> {
	const id = parseHumanResourcesSuccessionPlanId(row.id);
	if (!id.ok) return id;
	const positionId = parseHumanResourcesPositionId(row.positionId);
	if (!positionId.ok) return positionId;
	const status = successionPlanStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid succession plan status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		title: row.title,
		positionId: positionId.data,
		status: status.data,
		allowsExternalCandidates: row.allowsExternalCandidates,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapSuccessionPlanSql(
	row: SuccessionPlanSqlRow,
): Result<SuccessionPlan> {
	return mapSuccessionPlan({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		title: row.title,
		positionId: row.position_id,
		status: row.status,
		allowsExternalCandidates: row.allows_external_candidates,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapSuccessionCandidate(
	row: typeof hrSuccessionCandidate.$inferSelect,
): Result<SuccessionCandidate> {
	const id = parseHumanResourcesSuccessionCandidateId(row.id);
	if (!id.ok) return id;
	const successionPlanId = parseHumanResourcesSuccessionPlanId(
		row.successionPlanId,
	);
	if (!successionPlanId.ok) return successionPlanId;
	let employeeId = null as SuccessionCandidate["employeeId"];
	if (row.employeeId !== null) {
		const parsed = parseHumanResourcesEmployeeId(row.employeeId);
		if (!parsed.ok) return parsed;
		employeeId = parsed.data;
	}
	const readiness = successionReadinessCodeSchema.safeParse(row.readiness);
	if (!readiness.success) {
		return fail("INTERNAL_ERROR", "Invalid succession readiness code");
	}
	const status = successionCandidateStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid succession candidate status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		successionPlanId: successionPlanId.data,
		employeeId,
		externalCandidateRef: row.externalCandidateRef,
		nominatorUserId: row.nominatorUserId,
		readiness: readiness.data,
		readinessEffectiveOn: row.readinessEffectiveOn,
		evidenceSummary: row.evidenceSummary,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapSuccessionCandidateSql(
	row: SuccessionCandidateSqlRow,
): Result<SuccessionCandidate> {
	return mapSuccessionCandidate({
		id: row.id,
		organizationId: row.organization_id,
		successionPlanId: row.succession_plan_id,
		employeeId: row.employee_id,
		externalCandidateRef: row.external_candidate_ref,
		nominatorUserId: row.nominator_user_id,
		readiness: row.readiness,
		readinessEffectiveOn: row.readiness_effective_on,
		evidenceSummary: row.evidence_summary,
		status: row.status,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

export const drizzleTalentMethods: DrizzleTalentMethods &
	ThisType<TalentHost & DrizzleTalentMethods> = {
	async getCompetencyById(input) {
		try {
			const rows = await db
				.select()
				.from(hrCompetency)
				.where(
					and(
						eq(hrCompetency.organizationId, input.organizationId),
						eq(hrCompetency.id, input.competencyId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCompetency(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load competency");
		}
	},

	async findCompetencyByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrCompetency)
				.where(
					and(
						eq(hrCompetency.organizationId, input.organizationId),
						eq(hrCompetency.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const competency = mapCompetency(row);
			if (!competency.ok) return competency;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail(
					"INTERNAL_ERROR",
					"Competency idempotency metadata is missing",
				);
			}
			return ok({
				competency: competency.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find competency by idempotency key",
			);
		}
	},

	async createCompetency(record, _ports, meta) {
		const existing = await this.findCompetencyByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.competency);
			}
			return conflict("Idempotency key already used with different data");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCompetencyId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CompetencySqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							INSERT INTO hr_competency (
								id, organization_id, code, name, description, category,
								scale_code, status, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, ${record.code},
								${record.name}, ${record.description}, ${record.category},
								${record.scaleCode}, 'active', ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy},
								${record.createdBy}
							WHERE NOT EXISTS (
								SELECT 1 FROM hr_competency existing
								WHERE existing.organization_id = ${record.organizationId}
									AND existing.code = ${record.code}
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
								'human-resources', 'hr_competency', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Competency with this code already exists");
			}
			return mapCompetencySql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findCompetencyByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.competency);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict("Competency with this code already exists");
			}
			return mapPersistenceFailure(error, "Failed to create competency");
		}
	},

	async updateCompetency(input, _ports, meta) {
		const existing = await this.getCompetencyById({
			organizationId: input.organizationId,
			competencyId: input.competencyId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Competency not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextName = input.name ?? existing.data.name;
		const nextDescription =
			input.description !== undefined
				? input.description
				: existing.data.description;
		const nextCategory =
			input.category !== undefined ? input.category : existing.data.category;
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CompetencySqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_competency
							SET name = ${nextName},
								description = ${nextDescription},
								category = ${nextCategory},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.competencyId}
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
								'human-resources', 'hr_competency', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Competency",
				});
			}
			return mapCompetencySql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update competency");
		}
	},

	async retireCompetency(input, _ports, meta) {
		const existing = await this.getCompetencyById({
			organizationId: input.organizationId,
			competencyId: input.competencyId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Competency not found");
		}
		const transition = assertCompetencyStatusTransition(
			existing.data.status,
			"retired",
		);
		if (!transition.ok) return transition;
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CompetencySqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_competency
							SET status = 'retired',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.competencyId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'active'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_competency', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Competency",
				});
			}
			return mapCompetencySql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to retire competency");
		}
	},

	async listCompetencies(input) {
		try {
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const conditions = [
				eq(hrCompetency.organizationId, input.organizationId),
			];
			if (input.status !== undefined) {
				conditions.push(eq(hrCompetency.status, input.status));
			}
			const rows = await db
				.select()
				.from(hrCompetency)
				.where(and(...conditions))
				.orderBy(desc(hrCompetency.createdAt));
			const competencies: Competency[] = [];
			for (const row of rows) {
				const mapped = mapCompetency(row);
				if (!mapped.ok) return mapped;
				competencies.push(mapped.data);
			}
			const { items, totalCount } = paginate(competencies, page, pageSize);
			return ok({ competencies: items, totalCount, page, pageSize });
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list competencies");
		}
	},

	async mapCompetencyToJob(input, _ports, meta) {
		const job = await this.getJobById({
			organizationId: input.organizationId,
			jobId: input.jobId,
		});
		if (!job.ok) return job;
		if (job.data === null) {
			return notFound("Job not found");
		}
		const competency = await this.getCompetencyById({
			organizationId: input.organizationId,
			competencyId: input.competencyId,
		});
		if (!competency.ok) return competency;
		if (competency.data === null) {
			return notFound("Competency not found");
		}

		try {
			const existingRows = await db
				.select()
				.from(hrJobCompetency)
				.where(
					and(
						eq(hrJobCompetency.organizationId, input.organizationId),
						eq(hrJobCompetency.jobId, input.jobId),
						eq(hrJobCompetency.competencyId, input.competencyId),
						eq(hrJobCompetency.status, "active"),
					),
				)
				.limit(1);
			let existingMappingStatus = null as JobCompetency["status"] | null;
			if (existingRows[0]) {
				const parsed = jobCompetencyStatusSchema.safeParse(
					existingRows[0].status,
				);
				if (parsed.success) {
					existingMappingStatus = parsed.data;
				}
			}
			const mappable = assertJobCompetencyMappable({
				competencyStatus: competency.data.status,
				existingMappingStatus,
			});
			if (!mappable.ok) return mappable;
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to check job competency mapping",
			);
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesJobCompetencyId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[JobCompetencySqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							INSERT INTO hr_job_competency (
								id, organization_id, job_id, competency_id, required_level,
								status, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${input.organizationId}, ${input.jobId},
								${input.competencyId}, ${input.requiredLevel}, 'active', 1,
								${input.actorUserId}, ${input.actorUserId}
							WHERE EXISTS (
								SELECT 1 FROM hr_competency c
								WHERE c.id = ${input.competencyId}
									AND c.organization_id = ${input.organizationId}
									AND c.status = 'active'
							)
							AND NOT EXISTS (
								SELECT 1 FROM hr_job_competency existing
								WHERE existing.organization_id = ${input.organizationId}
									AND existing.job_id = ${input.jobId}
									AND existing.competency_id = ${input.competencyId}
									AND existing.status = 'active'
							)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_job_competency', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Competency is already mapped to this job");
			}
			return mapJobCompetencySql(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Competency is already mapped to this job");
			}
			return mapPersistenceFailure(error, "Failed to map competency to job");
		}
	},

	async removeCompetencyFromJob(input, _ports, meta) {
		try {
			const existingRows = await db
				.select()
				.from(hrJobCompetency)
				.where(
					and(
						eq(hrJobCompetency.organizationId, input.organizationId),
						eq(hrJobCompetency.id, input.jobCompetencyId),
					),
				)
				.limit(1);
			const row = existingRows[0];
			if (!row) {
				return notFound("Job competency mapping not found");
			}
			const mapped = mapJobCompetency(row);
			if (!mapped.ok) return mapped;
			const removable = assertJobCompetencyRemovable(mapped.data.status);
			if (!removable.ok) return removable;
			const versionCheck = assertExpectedVersion(
				mapped.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;

			const nextVersion = input.expectedVersion + 1;
			const auditId = randomUUID();
			const [rows] = await runNeonHttpTransaction<[JobCompetencySqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_job_competency
							SET status = 'removed',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.jobCompetencyId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'active'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_job_competency', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const updated = rows[0];
			if (!updated) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Job competency mapping",
				});
			}
			return mapJobCompetencySql(updated);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to remove competency from job",
			);
		}
	},

	async listJobCompetencies(input) {
		try {
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const rows = await db
				.select()
				.from(hrJobCompetency)
				.where(
					and(
						eq(hrJobCompetency.organizationId, input.organizationId),
						eq(hrJobCompetency.jobId, input.jobId),
					),
				)
				.orderBy(desc(hrJobCompetency.createdAt));
			const jobCompetencies: JobCompetency[] = [];
			for (const row of rows) {
				const mapped = mapJobCompetency(row);
				if (!mapped.ok) return mapped;
				jobCompetencies.push(mapped.data);
			}
			const { items, totalCount } = paginate(jobCompetencies, page, pageSize);
			return ok({ jobCompetencies: items, totalCount, page, pageSize });
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list job competencies");
		}
	},

	async getCompetencyAssessmentById(input) {
		try {
			const rows = await db
				.select()
				.from(hrCompetencyAssessment)
				.where(
					and(
						eq(hrCompetencyAssessment.organizationId, input.organizationId),
						eq(hrCompetencyAssessment.id, input.assessmentId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCompetencyAssessment(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load competency assessment",
			);
		}
	},

	async findCurrentCompetencyAssessment(input) {
		try {
			const rows = await db
				.select()
				.from(hrCompetencyAssessment)
				.where(
					and(
						eq(hrCompetencyAssessment.organizationId, input.organizationId),
						eq(hrCompetencyAssessment.employeeId, input.employeeId),
						eq(hrCompetencyAssessment.competencyId, input.competencyId),
						eq(hrCompetencyAssessment.status, "current"),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCompetencyAssessment(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find current competency assessment",
			);
		}
	},

	async findCompetencyAssessmentByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrCompetencyAssessment)
				.where(
					and(
						eq(hrCompetencyAssessment.organizationId, input.organizationId),
						eq(
							hrCompetencyAssessment.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const assessment = mapCompetencyAssessment(row);
			if (!assessment.ok) return assessment;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail(
					"INTERNAL_ERROR",
					"Competency assessment idempotency metadata is missing",
				);
			}
			return ok({
				assessment: assessment.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find competency assessment by idempotency key",
			);
		}
	},

	async createCompetencyAssessment(record, _ports, meta) {
		const existing = await this.findCompetencyAssessmentByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.assessment);
			}
			return conflict("Idempotency key already used with different data");
		}

		const competency = await this.getCompetencyById({
			organizationId: record.organizationId,
			competencyId: record.competencyId,
		});
		if (!competency.ok) return competency;
		if (competency.data === null) {
			return notFound("Competency not found");
		}
		const validInput = assertAssessmentInputValid({
			competencyStatus: competency.data.status,
			competencyScaleCode: competency.data.scaleCode,
			assessmentScaleCode: record.scaleCode,
			assessorUserId: record.assessorUserId,
			evidenceSource: record.evidenceSource,
			level: record.level,
			effectiveOn: record.effectiveOn,
			todayDate: todayIsoDate(),
		});
		if (!validInput.ok) return validInput;

		const current = await this.findCurrentCompetencyAssessment({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
			competencyId: record.competencyId,
		});
		if (!current.ok) return current;
		if (current.data !== null) {
			return conflict(
				"A current assessment already exists for this employee and competency; use supersede",
			);
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCompetencyAssessmentId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_competency_assessment",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<
				[CompetencyAssessmentSqlRow[]]
			>((sqlTag) => [
				sqlTag`
					WITH competency AS (
						SELECT id, scale_code
						FROM hr_competency
						WHERE id = ${record.competencyId}
							AND organization_id = ${record.organizationId}
							AND status = 'active'
					),
					mutated AS (
						INSERT INTO hr_competency_assessment (
							id, organization_id, employee_id, competency_id, assessor_user_id,
							evidence_source, scale_code, level, effective_on, status,
							supersedes_assessment_id, superseded_by_assessment_id,
							create_idempotency_key, create_request_fingerprint,
							version, created_by, updated_by
						)
						SELECT
							${brandedId.data}, ${record.organizationId}, ${record.employeeId},
							${record.competencyId}, ${record.assessorUserId},
							${record.evidenceSource}, ${record.scaleCode}, ${record.level},
							${record.effectiveOn}, 'current', NULL, NULL,
							${record.createIdempotencyKey}, ${record.createRequestFingerprint},
							1, ${record.createdBy}, ${record.createdBy}
						FROM competency
						WHERE NOT EXISTS (
							SELECT 1 FROM hr_competency_assessment existing
							WHERE existing.organization_id = ${record.organizationId}
								AND existing.employee_id = ${record.employeeId}
								AND existing.competency_id = ${record.competencyId}
								AND existing.status = 'current'
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
							'human-resources', 'hr_competency_assessment', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventId}, organization_id,
							${HUMAN_RESOURCES_COMPETENCY_ASSESSED_EVENT},
							'human-resources', ${meta.correlationId}, created_by,
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (!row) {
				return conflict(
					"A current assessment already exists for this employee and competency; use supersede",
				);
			}
			return mapCompetencyAssessmentSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findCompetencyAssessmentByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.assessment);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(
				error,
				"Failed to create competency assessment",
			);
		}
	},

	async supersedeCompetencyAssessment(record, _ports, meta) {
		const existing = await this.findCompetencyAssessmentByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.assessment);
			}
			return conflict("Idempotency key already used with different data");
		}

		const sourceResult = await this.getCompetencyAssessmentById({
			organizationId: record.organizationId,
			assessmentId: record.sourceAssessmentId,
		});
		if (!sourceResult.ok) return sourceResult;
		if (sourceResult.data === null) {
			return notFound("Competency assessment not found");
		}
		const source = sourceResult.data;
		const supersedable = assertAssessmentSupersedable(source.status);
		if (!supersedable.ok) return supersedable;
		const versionCheck = assertExpectedVersion(
			source.version,
			record.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const competency = await this.getCompetencyById({
			organizationId: record.organizationId,
			competencyId: source.competencyId,
		});
		if (!competency.ok) return competency;
		if (competency.data === null) {
			return notFound("Competency not found");
		}
		const validInput = assertAssessmentInputValid({
			competencyStatus: competency.data.status,
			competencyScaleCode: competency.data.scaleCode,
			assessmentScaleCode: source.scaleCode,
			assessorUserId: record.assessorUserId,
			evidenceSource: record.evidenceSource,
			level: record.level,
			effectiveOn: record.effectiveOn,
			todayDate: todayIsoDate(),
		});
		if (!validInput.ok) return validInput;

		const id = randomUUID();
		const brandedId = parseHumanResourcesCompetencyAssessmentId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_competency_assessment",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		const nextSourceVersion = record.expectedVersion + 1;

		try {
			const [rows] = await runNeonHttpTransaction<
				[CompetencyAssessmentSqlRow[]]
			>((sqlTag) => [
				sqlTag`
					WITH source AS (
						SELECT *
						FROM hr_competency_assessment
						WHERE id = ${record.sourceAssessmentId}
							AND organization_id = ${record.organizationId}
							AND version = ${record.expectedVersion}
							AND status = 'current'
					),
					superseded AS (
						UPDATE hr_competency_assessment ca
						SET status = 'superseded',
							superseded_by_assessment_id = ${brandedId.data},
							version = ${nextSourceVersion},
							updated_by = ${record.createdBy},
							updated_at = now()
						FROM source s
						WHERE ca.id = s.id
						RETURNING s.*
					),
					mutated AS (
						INSERT INTO hr_competency_assessment (
							id, organization_id, employee_id, competency_id, assessor_user_id,
							evidence_source, scale_code, level, effective_on, status,
							supersedes_assessment_id, superseded_by_assessment_id,
							create_idempotency_key, create_request_fingerprint,
							version, created_by, updated_by
						)
						SELECT
							${brandedId.data}, s.organization_id, s.employee_id, s.competency_id,
							${record.assessorUserId}, ${record.evidenceSource}, s.scale_code,
							${record.level}, ${record.effectiveOn}, 'current',
							s.id, NULL, ${record.createIdempotencyKey},
							${record.createRequestFingerprint}, 1, ${record.createdBy},
							${record.createdBy}
						FROM superseded s
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, created_by, ${meta.correlationId},
							'human-resources', 'hr_competency_assessment', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT
							${eventId}, organization_id,
							${HUMAN_RESOURCES_COMPETENCY_ASSESSED_EVENT},
							'human-resources', ${meta.correlationId}, created_by,
							${payloadJson}::jsonb, 'pending', 0
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited, outboxed
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Competency assessment",
				});
			}
			return mapCompetencyAssessmentSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findCompetencyAssessmentByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.assessment);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(
				error,
				"Failed to supersede competency assessment",
			);
		}
	},

	async getEmployeeCompetencyProfile(input) {
		const employee = await this.getEmployeeById({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!employee.ok) return employee;
		if (employee.data === null) {
			return notFound("Employee not found");
		}
		try {
			const rows = await db
				.select()
				.from(hrCompetencyAssessment)
				.where(
					and(
						eq(hrCompetencyAssessment.organizationId, input.organizationId),
						eq(hrCompetencyAssessment.employeeId, input.employeeId),
					),
				)
				.orderBy(desc(hrCompetencyAssessment.createdAt));
			const assessments: CompetencyAssessment[] = [];
			for (const row of rows) {
				const mapped = mapCompetencyAssessment(row);
				if (!mapped.ok) return mapped;
				assessments.push(mapped.data);
			}
			return ok({
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				assessments,
			} satisfies EmployeeCompetencyProfile);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load employee competency profile",
			);
		}
	},

	async getTalentProfileById(input) {
		try {
			const rows = await db
				.select()
				.from(hrTalentProfile)
				.where(
					and(
						eq(hrTalentProfile.organizationId, input.organizationId),
						eq(hrTalentProfile.id, input.talentProfileId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapTalentProfile(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load talent profile");
		}
	},

	async findTalentProfileByEmployeeId(input) {
		return this.getTalentProfileByEmployee(input);
	},

	async findTalentProfileByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrTalentProfile)
				.where(
					and(
						eq(hrTalentProfile.organizationId, input.organizationId),
						eq(hrTalentProfile.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const profile = mapTalentProfile(row);
			if (!profile.ok) return profile;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail(
					"INTERNAL_ERROR",
					"Talent profile idempotency metadata is missing",
				);
			}
			return ok({
				profile: profile.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find talent profile by idempotency key",
			);
		}
	},

	async createTalentProfile(record, _ports, meta) {
		const existing = await this.findTalentProfileByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.profile);
			}
			return conflict("Idempotency key already used with different data");
		}

		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) return employee;
		if (employee.data === null) {
			return notFound("Employee not found");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesTalentProfileId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[TalentProfileSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							INSERT INTO hr_talent_profile (
								id, organization_id, employee_id, summary, current_classification,
								status, create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, ${record.employeeId},
								${record.summary}, NULL, 'active', ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy},
								${record.createdBy}
							WHERE NOT EXISTS (
								SELECT 1 FROM hr_talent_profile existing
								WHERE existing.organization_id = ${record.organizationId}
									AND existing.employee_id = ${record.employeeId}
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
								'human-resources', 'hr_talent_profile', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Talent profile already exists for this employee");
			}
			return mapTalentProfileSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findTalentProfileByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.profile);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict("Talent profile already exists for this employee");
			}
			return mapPersistenceFailure(error, "Failed to create talent profile");
		}
	},

	async updateTalentProfile(input, _ports, meta) {
		const existing = await this.getTalentProfileById({
			organizationId: input.organizationId,
			talentProfileId: input.talentProfileId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Talent profile not found");
		}
		const active = assertTalentProfileActive(existing.data.status);
		if (!active.ok) return active;
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextSummary =
			input.summary !== undefined ? input.summary : existing.data.summary;
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[TalentProfileSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_talent_profile
							SET summary = ${nextSummary},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.talentProfileId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'active'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_talent_profile', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Talent profile",
				});
			}
			return mapTalentProfileSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update talent profile");
		}
	},

	async archiveTalentProfile(input, _ports, meta) {
		const existing = await this.getTalentProfileById({
			organizationId: input.organizationId,
			talentProfileId: input.talentProfileId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Talent profile not found");
		}
		const archivable = assertTalentProfileArchivable(existing.data.status);
		if (!archivable.ok) return archivable;
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[TalentProfileSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_talent_profile
							SET status = 'archived',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.talentProfileId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'active'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_talent_profile', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Talent profile",
				});
			}
			return mapTalentProfileSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to archive talent profile");
		}
	},

	async getTalentProfileByEmployee(input) {
		try {
			const rows = await db
				.select()
				.from(hrTalentProfile)
				.where(
					and(
						eq(hrTalentProfile.organizationId, input.organizationId),
						eq(hrTalentProfile.employeeId, input.employeeId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapTalentProfile(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load talent profile by employee",
			);
		}
	},

	async recordTalentProfileAssessment(input, _ports, meta) {
		const profile = await this.getTalentProfileById({
			organizationId: input.organizationId,
			talentProfileId: input.talentProfileId,
		});
		if (!profile.ok) return profile;
		if (profile.data === null) {
			return notFound("Talent profile not found");
		}
		const active = assertTalentProfileActive(profile.data.status);
		if (!active.ok) return active;
		const draftable = assertProfileAssessmentDraftable({
			methodCode: input.methodCode,
			evidenceSummary: input.evidenceSummary,
		});
		if (!draftable.ok) return draftable;

		const id = randomUUID();
		const brandedId = parseHumanResourcesTalentProfileAssessmentId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<
				[TalentProfileAssessmentSqlRow[]]
			>((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						INSERT INTO hr_talent_profile_assessment (
							id, organization_id, talent_profile_id, method_code, classification,
							evidence_summary, assessor_user_id, status, confirmed_at,
							version, created_by, updated_by
						)
						SELECT
							${brandedId.data}, ${input.organizationId}, ${input.talentProfileId},
							${input.methodCode}, ${input.classification}, ${input.evidenceSummary},
							${input.assessorUserId}, 'draft', NULL, 1, ${input.actorUserId},
							${input.actorUserId}
						WHERE EXISTS (
							SELECT 1 FROM hr_talent_profile p
							WHERE p.id = ${input.talentProfileId}
								AND p.organization_id = ${input.organizationId}
								AND p.status = 'active'
						)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_talent_profile_assessment', id, 'CREATE', '[]'::jsonb
						FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				return notFound("Talent profile not found");
			}
			return mapTalentProfileAssessmentSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to record talent profile assessment",
			);
		}
	},

	async confirmTalentProfileAssessment(input, _ports, meta) {
		try {
			const existingRows = await db
				.select()
				.from(hrTalentProfileAssessment)
				.where(
					and(
						eq(hrTalentProfileAssessment.organizationId, input.organizationId),
						eq(hrTalentProfileAssessment.id, input.assessmentId),
					),
				)
				.limit(1);
			const existingRow = existingRows[0];
			if (!existingRow) {
				return notFound("Talent profile assessment not found");
			}
			const loaded = mapTalentProfileAssessment(existingRow);
			if (!loaded.ok) return loaded;
			const confirmable = assertProfileAssessmentConfirmable(
				loaded.data.status,
			);
			if (!confirmable.ok) return confirmable;
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;

			const nextVersion = input.expectedVersion + 1;
			const auditId = randomUUID();

			const [rows] = await runNeonHttpTransaction<
				[TalentProfileAssessmentSqlRow[]]
			>((sqlTag) => [
				sqlTag`
					WITH target AS (
						SELECT *
						FROM hr_talent_profile_assessment
						WHERE id = ${input.assessmentId}
							AND organization_id = ${input.organizationId}
							AND version = ${input.expectedVersion}
							AND status = 'draft'
					),
					supersede_prev AS (
						UPDATE hr_talent_profile_assessment tpa
						SET status = 'superseded',
							version = tpa.version + 1,
							updated_by = ${input.actorUserId},
							updated_at = now()
						FROM target t
						WHERE tpa.organization_id = t.organization_id
							AND tpa.talent_profile_id = t.talent_profile_id
							AND tpa.status = 'confirmed'
						RETURNING tpa.id
					),
					confirmed AS (
						UPDATE hr_talent_profile_assessment tpa
						SET status = 'confirmed',
							confirmed_at = now(),
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						FROM target t
						WHERE tpa.id = t.id
						RETURNING tpa.*
					),
					profile_updated AS (
						UPDATE hr_talent_profile tp
						SET current_classification = c.classification,
							version = tp.version + 1,
							updated_by = ${input.actorUserId},
							updated_at = now()
						FROM confirmed c
						WHERE tp.id = c.talent_profile_id
							AND tp.organization_id = c.organization_id
						RETURNING tp.id
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes
						)
						SELECT
							${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
							'human-resources', 'hr_talent_profile_assessment', id, 'UPDATE', '[]'::jsonb
						FROM confirmed
						RETURNING id
					)
					SELECT confirmed.* FROM confirmed, profile_updated, audited
				`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Talent profile assessment",
				});
			}
			return mapTalentProfileAssessmentSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to confirm talent profile assessment",
			);
		}
	},

	async getTalentPoolById(input) {
		try {
			const rows = await db
				.select()
				.from(hrTalentPool)
				.where(
					and(
						eq(hrTalentPool.organizationId, input.organizationId),
						eq(hrTalentPool.id, input.poolId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapTalentPool(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load talent pool");
		}
	},

	async findTalentPoolByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrTalentPool)
				.where(
					and(
						eq(hrTalentPool.organizationId, input.organizationId),
						eq(hrTalentPool.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const pool = mapTalentPool(row);
			if (!pool.ok) return pool;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail(
					"INTERNAL_ERROR",
					"Talent pool idempotency metadata is missing",
				);
			}
			return ok({
				pool: pool.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find talent pool by idempotency key",
			);
		}
	},

	async createTalentPool(record, _ports, meta) {
		const existing = await this.findTalentPoolByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.pool);
			}
			return conflict("Idempotency key already used with different data");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesTalentPoolId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[TalentPoolSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							INSERT INTO hr_talent_pool (
								id, organization_id, code, name, description, status,
								create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, ${record.code},
								${record.name}, ${record.description}, 'open',
								${record.createIdempotencyKey}, ${record.createRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							WHERE NOT EXISTS (
								SELECT 1 FROM hr_talent_pool existing
								WHERE existing.organization_id = ${record.organizationId}
									AND existing.code = ${record.code}
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
								'human-resources', 'hr_talent_pool', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Talent pool with this code already exists");
			}
			return mapTalentPoolSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findTalentPoolByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.pool);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict("Talent pool with this code already exists");
			}
			return mapPersistenceFailure(error, "Failed to create talent pool");
		}
	},

	async updateTalentPool(input, _ports, meta) {
		const existing = await this.getTalentPoolById({
			organizationId: input.organizationId,
			poolId: input.poolId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Talent pool not found");
		}
		const open = assertTalentPoolOpen(existing.data.status);
		if (!open.ok) return open;
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextName = input.name ?? existing.data.name;
		const nextDescription =
			input.description !== undefined
				? input.description
				: existing.data.description;
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[TalentPoolSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_talent_pool
							SET name = ${nextName},
								description = ${nextDescription},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.poolId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'open'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_talent_pool', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Talent pool",
				});
			}
			return mapTalentPoolSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update talent pool");
		}
	},

	async closeTalentPool(input, _ports, meta) {
		const existing = await this.getTalentPoolById({
			organizationId: input.organizationId,
			poolId: input.poolId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Talent pool not found");
		}
		const closable = assertTalentPoolClosable(existing.data.status);
		if (!closable.ok) return closable;
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[TalentPoolSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_talent_pool
							SET status = 'closed',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.poolId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'open'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_talent_pool', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Talent pool",
				});
			}
			return mapTalentPoolSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to close talent pool");
		}
	},

	async findTalentPoolMemberByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrTalentPoolMember)
				.where(
					and(
						eq(hrTalentPoolMember.organizationId, input.organizationId),
						eq(hrTalentPoolMember.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const member = mapTalentPoolMember(row);
			if (!member.ok) return member;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail(
					"INTERNAL_ERROR",
					"Talent pool member idempotency metadata is missing",
				);
			}
			return ok({
				member: member.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find talent pool member by idempotency key",
			);
		}
	},

	async nominateTalentPoolMember(record, _ports, meta) {
		const existing = await this.findTalentPoolMemberByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.member);
			}
			return conflict("Idempotency key already used with different data");
		}

		const pool = await this.getTalentPoolById({
			organizationId: record.organizationId,
			poolId: record.poolId,
		});
		if (!pool.ok) return pool;
		if (pool.data === null) {
			return notFound("Talent pool not found");
		}
		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) return employee;
		if (employee.data === null) {
			return notFound("Employee not found");
		}

		try {
			const existingMemberRows = await db
				.select()
				.from(hrTalentPoolMember)
				.where(
					and(
						eq(hrTalentPoolMember.organizationId, record.organizationId),
						eq(hrTalentPoolMember.poolId, record.poolId),
						eq(hrTalentPoolMember.employeeId, record.employeeId),
						inArray(hrTalentPoolMember.status, ["nominated", "approved"]),
					),
				)
				.limit(1);
			let existingMemberStatus = null as TalentPoolMember["status"] | null;
			if (existingMemberRows[0]) {
				const parsed = talentPoolMemberStatusSchema.safeParse(
					existingMemberRows[0].status,
				);
				if (parsed.success) {
					existingMemberStatus = parsed.data;
				}
			}
			const nominatable = assertTalentPoolMemberNominatable({
				poolStatus: pool.data.status,
				existingMemberStatus,
				nominatorUserId: record.nominatorUserId,
			});
			if (!nominatable.ok) return nominatable;
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to check talent pool member");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesTalentPoolMemberId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[TalentPoolMemberSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH pool_ok AS (
							SELECT id, status
							FROM hr_talent_pool
							WHERE id = ${record.poolId}
								AND organization_id = ${record.organizationId}
								AND status = 'open'
						),
						mutated AS (
							INSERT INTO hr_talent_pool_member (
								id, organization_id, pool_id, employee_id, nominator_user_id,
								status, nominated_at, approved_at, removed_at, approver_user_id,
								create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, ${record.poolId},
								${record.employeeId}, ${record.nominatorUserId}, 'nominated', now(),
								NULL, NULL, NULL, ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy},
								${record.createdBy}
							FROM pool_ok
							WHERE NOT EXISTS (
								SELECT 1 FROM hr_talent_pool_member existing
								WHERE existing.organization_id = ${record.organizationId}
									AND existing.pool_id = ${record.poolId}
									AND existing.employee_id = ${record.employeeId}
									AND existing.status IN ('nominated', 'approved')
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
								'human-resources', 'hr_talent_pool_member', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Employee is already an active member of this pool");
			}
			return mapTalentPoolMemberSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findTalentPoolMemberByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.member);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict("Employee is already an active member of this pool");
			}
			return mapPersistenceFailure(
				error,
				"Failed to nominate talent pool member",
			);
		}
	},

	async approveTalentPoolMember(input, _ports, meta) {
		try {
			const existingRows = await db
				.select()
				.from(hrTalentPoolMember)
				.where(
					and(
						eq(hrTalentPoolMember.organizationId, input.organizationId),
						eq(hrTalentPoolMember.id, input.memberId),
					),
				)
				.limit(1);
			const existingRow = existingRows[0];
			if (!existingRow) {
				return notFound("Talent pool member not found");
			}
			const loaded = mapTalentPoolMember(existingRow);
			if (!loaded.ok) return loaded;
			const approvable = assertTalentPoolMemberApprovable({
				status: loaded.data.status,
				approverUserId: input.approverUserId,
			});
			if (!approvable.ok) return approvable;
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;

			const nextVersion = input.expectedVersion + 1;
			const auditId = randomUUID();
			const eventId = randomUUID();
			const payloadJson = eventPayloadJson({
				organizationId: input.organizationId,
				entityType: "hr_talent_pool_member",
				entityId: input.memberId,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			});

			const [rows] = await runNeonHttpTransaction<[TalentPoolMemberSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_talent_pool_member
							SET status = 'approved',
								approved_at = now(),
								approver_user_id = ${input.approverUserId},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.memberId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'nominated'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_talent_pool_member', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id,
								${HUMAN_RESOURCES_TALENT_POOL_MEMBERSHIP_APPROVED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Talent pool member",
				});
			}
			return mapTalentPoolMemberSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to approve talent pool member",
			);
		}
	},

	async removeTalentPoolMember(input, _ports, meta) {
		try {
			const existingRows = await db
				.select()
				.from(hrTalentPoolMember)
				.where(
					and(
						eq(hrTalentPoolMember.organizationId, input.organizationId),
						eq(hrTalentPoolMember.id, input.memberId),
					),
				)
				.limit(1);
			const existingRow = existingRows[0];
			if (!existingRow) {
				return notFound("Talent pool member not found");
			}
			const loaded = mapTalentPoolMember(existingRow);
			if (!loaded.ok) return loaded;
			const removable = assertTalentPoolMemberRemovable(loaded.data.status);
			if (!removable.ok) return removable;
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;

			const nextVersion = input.expectedVersion + 1;
			const auditId = randomUUID();

			const [rows] = await runNeonHttpTransaction<[TalentPoolMemberSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_talent_pool_member
							SET status = 'removed',
								removed_at = now(),
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.memberId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status IN ('nominated', 'approved')
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_talent_pool_member', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Talent pool member",
				});
			}
			return mapTalentPoolMemberSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to remove talent pool member",
			);
		}
	},

	async listTalentPoolMembers(input) {
		try {
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const conditions = [
				eq(hrTalentPoolMember.organizationId, input.organizationId),
				eq(hrTalentPoolMember.poolId, input.poolId),
			];
			if (input.status !== undefined) {
				conditions.push(eq(hrTalentPoolMember.status, input.status));
			}
			const rows = await db
				.select()
				.from(hrTalentPoolMember)
				.where(and(...conditions))
				.orderBy(desc(hrTalentPoolMember.createdAt));
			const members: TalentPoolMember[] = [];
			for (const row of rows) {
				const mapped = mapTalentPoolMember(row);
				if (!mapped.ok) return mapped;
				members.push(mapped.data);
			}
			const { items, totalCount } = paginate(members, page, pageSize);
			return ok({ members: items, totalCount, page, pageSize });
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list talent pool members");
		}
	},

	async findCareerPlanByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrCareerPlan)
				.where(
					and(
						eq(hrCareerPlan.organizationId, input.organizationId),
						eq(hrCareerPlan.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const careerPlan = mapCareerPlan(row);
			if (!careerPlan.ok) return careerPlan;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail(
					"INTERNAL_ERROR",
					"Career plan idempotency metadata is missing",
				);
			}
			return ok({
				careerPlan: careerPlan.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find career plan by idempotency key",
			);
		}
	},

	async createCareerPlan(record, _ports, meta) {
		const existing = await this.findCareerPlanByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.careerPlan);
			}
			return conflict("Idempotency key already used with different data");
		}

		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) return employee;
		if (employee.data === null) {
			return notFound("Employee not found");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCareerPlanId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CareerPlanSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							INSERT INTO hr_career_plan (
								id, organization_id, employee_id, owner_user_id, code, title,
								status, acknowledged_at, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, ${record.employeeId},
								${record.ownerUserId}, ${record.code}, ${record.title}, 'draft', NULL,
								${record.createIdempotencyKey}, ${record.createRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							WHERE NOT EXISTS (
								SELECT 1 FROM hr_career_plan existing
								WHERE existing.organization_id = ${record.organizationId}
									AND existing.code = ${record.code}
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
								'human-resources', 'hr_career_plan', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Career plan with this code already exists");
			}
			return mapCareerPlanSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findCareerPlanByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.careerPlan);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict("Career plan with this code already exists");
			}
			return mapPersistenceFailure(error, "Failed to create career plan");
		}
	},

	async updateCareerPlan(input, _ports, meta) {
		const existing = await this.getCareerPlanById({
			organizationId: input.organizationId,
			careerPlanId: input.careerPlanId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Career plan not found");
		}
		const open = assertCareerPlanOpen(existing.data.status);
		if (!open.ok) return open;
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextTitle = input.title ?? existing.data.title;
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CareerPlanSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_career_plan
							SET title = ${nextTitle},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.careerPlanId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status != 'closed'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_career_plan', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Career plan",
				});
			}
			return mapCareerPlanSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update career plan");
		}
	},

	async acknowledgeCareerPlan(input, _ports, meta) {
		const existing = await this.getCareerPlanById({
			organizationId: input.organizationId,
			careerPlanId: input.careerPlanId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Career plan not found");
		}
		const acknowledgeable = assertCareerPlanAcknowledgeable(
			existing.data.status,
		);
		if (!acknowledgeable.ok) return acknowledgeable;
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_career_plan",
			entityId: input.careerPlanId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[CareerPlanSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_career_plan
							SET status = 'acknowledged',
								acknowledged_at = now(),
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.careerPlanId}
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
								'human-resources', 'hr_career_plan', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id,
								${HUMAN_RESOURCES_CAREER_PLAN_ACKNOWLEDGED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Career plan",
				});
			}
			return mapCareerPlanSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to acknowledge career plan");
		}
	},

	async closeCareerPlan(input, _ports, meta) {
		const existing = await this.getCareerPlanById({
			organizationId: input.organizationId,
			careerPlanId: input.careerPlanId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Career plan not found");
		}
		const transition = assertCareerPlanStatusTransition(
			existing.data.status,
			"closed",
		);
		if (!transition.ok) return transition;
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CareerPlanSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_career_plan
							SET status = 'closed',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.careerPlanId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status IN ('draft', 'acknowledged', 'active')
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_career_plan', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Career plan",
				});
			}
			return mapCareerPlanSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to close career plan");
		}
	},

	async getCareerPlanById(input) {
		try {
			const rows = await db
				.select()
				.from(hrCareerPlan)
				.where(
					and(
						eq(hrCareerPlan.organizationId, input.organizationId),
						eq(hrCareerPlan.id, input.careerPlanId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const plan = mapCareerPlan(row);
			if (!plan.ok) return plan;

			const actionRows = await db
				.select()
				.from(hrCareerPlanAction)
				.where(
					and(
						eq(hrCareerPlanAction.organizationId, input.organizationId),
						eq(hrCareerPlanAction.careerPlanId, input.careerPlanId),
					),
				)
				.orderBy(hrCareerPlanAction.createdAt);
			const actions: CareerPlanAction[] = [];
			for (const actionRow of actionRows) {
				const mapped = mapCareerPlanAction(actionRow);
				if (!mapped.ok) return mapped;
				actions.push(mapped.data);
			}
			const withActions: CareerPlanWithActions = {
				...plan.data,
				actions,
			};
			return ok(withActions);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load career plan");
		}
	},

	async listEmployeeCareerPlans(input) {
		try {
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const conditions = [
				eq(hrCareerPlan.organizationId, input.organizationId),
				eq(hrCareerPlan.employeeId, input.employeeId),
			];
			if (input.status !== undefined) {
				conditions.push(eq(hrCareerPlan.status, input.status));
			}
			const rows = await db
				.select()
				.from(hrCareerPlan)
				.where(and(...conditions))
				.orderBy(desc(hrCareerPlan.createdAt));
			const careerPlans: CareerPlan[] = [];
			for (const row of rows) {
				const mapped = mapCareerPlan(row);
				if (!mapped.ok) return mapped;
				careerPlans.push(mapped.data);
			}
			const { items, totalCount } = paginate(careerPlans, page, pageSize);
			return ok({ careerPlans: items, totalCount, page, pageSize });
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list employee career plans",
			);
		}
	},

	async addCareerPlanAction(input, _ports, meta) {
		const plan = await this.getCareerPlanById({
			organizationId: input.organizationId,
			careerPlanId: input.careerPlanId,
		});
		if (!plan.ok) return plan;
		if (plan.data === null) {
			return notFound("Career plan not found");
		}
		const addable = assertCareerPlanActionAddable(plan.data.status);
		if (!addable.ok) return addable;

		if (input.learningAssignmentId !== null) {
			const assignment = await this.getLearningAssignmentById({
				organizationId: input.organizationId,
				assignmentId: input.learningAssignmentId,
			});
			if (!assignment.ok) return assignment;
			if (assignment.data === null) {
				return notFound("Learning assignment not found");
			}
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCareerPlanActionId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CareerPlanActionSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH plan_ok AS (
							SELECT id
							FROM hr_career_plan
							WHERE id = ${input.careerPlanId}
								AND organization_id = ${input.organizationId}
								AND status != 'closed'
						),
						assignment_ok AS (
							SELECT 1 AS ok
							WHERE ${input.learningAssignmentId}::uuid IS NULL
							UNION ALL
							SELECT 1
							FROM hr_learning_assignment la
							WHERE la.id = ${input.learningAssignmentId}
								AND la.organization_id = ${input.organizationId}
						),
						mutated AS (
							INSERT INTO hr_career_plan_action (
								id, organization_id, career_plan_id, title, due_on, status,
								learning_assignment_id, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${input.organizationId}, ${input.careerPlanId},
								${input.title}, ${input.dueOn}, 'open', ${input.learningAssignmentId},
								1, ${input.actorUserId}, ${input.actorUserId}
							FROM plan_ok, assignment_ok
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_career_plan_action', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return notFound("Career plan not found");
			}
			return mapCareerPlanActionSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to add career plan action");
		}
	},

	async completeCareerPlanAction(input, _ports, meta) {
		try {
			const existingRows = await db
				.select()
				.from(hrCareerPlanAction)
				.where(
					and(
						eq(hrCareerPlanAction.organizationId, input.organizationId),
						eq(hrCareerPlanAction.id, input.actionId),
					),
				)
				.limit(1);
			const existingRow = existingRows[0];
			if (!existingRow) {
				return notFound("Career plan action not found");
			}
			const loaded = mapCareerPlanAction(existingRow);
			if (!loaded.ok) return loaded;
			const completable = assertCareerPlanActionCompletable(loaded.data.status);
			if (!completable.ok) return completable;
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;

			const nextVersion = input.expectedVersion + 1;
			const auditId = randomUUID();

			const [rows] = await runNeonHttpTransaction<[CareerPlanActionSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_career_plan_action
							SET status = 'done',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.actionId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'open'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_career_plan_action', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Career plan action",
				});
			}
			return mapCareerPlanActionSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to complete career plan action",
			);
		}
	},

	async getCareerPlanActionById(input) {
		try {
			const rows = await db
				.select()
				.from(hrCareerPlanAction)
				.where(
					and(
						eq(hrCareerPlanAction.organizationId, input.organizationId),
						eq(hrCareerPlanAction.id, input.actionId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCareerPlanAction(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load career plan action");
		}
	},

	async findSuccessionPlanByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrSuccessionPlan)
				.where(
					and(
						eq(hrSuccessionPlan.organizationId, input.organizationId),
						eq(hrSuccessionPlan.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const successionPlan = mapSuccessionPlan(row);
			if (!successionPlan.ok) return successionPlan;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail(
					"INTERNAL_ERROR",
					"Succession plan idempotency metadata is missing",
				);
			}
			return ok({
				successionPlan: successionPlan.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find succession plan by idempotency key",
			);
		}
	},

	async createSuccessionPlan(record, _ports, meta) {
		const existing = await this.findSuccessionPlanByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.successionPlan);
			}
			return conflict("Idempotency key already used with different data");
		}

		const position = await this.getPositionById({
			organizationId: record.organizationId,
			positionId: record.positionId,
		});
		if (!position.ok) return position;
		if (position.data === null) {
			return notFound("Position not found");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesSuccessionPlanId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[SuccessionPlanSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							INSERT INTO hr_succession_plan (
								id, organization_id, code, title, position_id, status,
								allows_external_candidates, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, ${record.code},
								${record.title}, ${record.positionId}, 'draft',
								${record.allowsExternalCandidates}, ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy},
								${record.createdBy}
							WHERE NOT EXISTS (
								SELECT 1 FROM hr_succession_plan existing
								WHERE existing.organization_id = ${record.organizationId}
									AND existing.code = ${record.code}
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
								'human-resources', 'hr_succession_plan', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Succession plan with this code already exists");
			}
			return mapSuccessionPlanSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findSuccessionPlanByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.successionPlan);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			if (isPostgresUniqueViolation(error)) {
				return conflict("Succession plan with this code already exists");
			}
			return mapPersistenceFailure(error, "Failed to create succession plan");
		}
	},

	async updateSuccessionPlan(input, _ports, meta) {
		const existing = await this.getSuccessionPlanById({
			organizationId: input.organizationId,
			successionPlanId: input.successionPlanId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Succession plan not found");
		}
		if (existing.data.status === "closed") {
			return invalidState("Succession plan is closed");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextTitle = input.title ?? existing.data.title;
		const nextAllowsExternal =
			input.allowsExternalCandidates ?? existing.data.allowsExternalCandidates;
		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[SuccessionPlanSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_succession_plan
							SET title = ${nextTitle},
								allows_external_candidates = ${nextAllowsExternal},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.successionPlanId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status != 'closed'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_succession_plan', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Succession plan",
				});
			}
			return mapSuccessionPlanSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update succession plan");
		}
	},

	async closeSuccessionPlan(input, _ports, meta) {
		const existing = await this.getSuccessionPlanById({
			organizationId: input.organizationId,
			successionPlanId: input.successionPlanId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Succession plan not found");
		}
		const transition = assertSuccessionPlanStatusTransition(
			existing.data.status,
			"closed",
		);
		if (!transition.ok) return transition;
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[SuccessionPlanSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_succession_plan
							SET status = 'closed',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.successionPlanId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status IN ('draft', 'active')
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_succession_plan', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Succession plan",
				});
			}
			return mapSuccessionPlanSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to close succession plan");
		}
	},

	async getSuccessionPlanById(input) {
		try {
			const rows = await db
				.select()
				.from(hrSuccessionPlan)
				.where(
					and(
						eq(hrSuccessionPlan.organizationId, input.organizationId),
						eq(hrSuccessionPlan.id, input.successionPlanId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapSuccessionPlan(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load succession plan");
		}
	},

	async listSuccessionPlans(input) {
		try {
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const conditions = [
				eq(hrSuccessionPlan.organizationId, input.organizationId),
			];
			if (input.positionId !== undefined) {
				conditions.push(eq(hrSuccessionPlan.positionId, input.positionId));
			}
			if (input.status !== undefined) {
				conditions.push(eq(hrSuccessionPlan.status, input.status));
			}
			const rows = await db
				.select()
				.from(hrSuccessionPlan)
				.where(and(...conditions))
				.orderBy(desc(hrSuccessionPlan.createdAt));
			const successionPlans: SuccessionPlan[] = [];
			for (const row of rows) {
				const mapped = mapSuccessionPlan(row);
				if (!mapped.ok) return mapped;
				successionPlans.push(mapped.data);
			}
			const { items, totalCount } = paginate(successionPlans, page, pageSize);
			return ok({ successionPlans: items, totalCount, page, pageSize });
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list succession plans");
		}
	},

	async findSuccessionCandidateByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrSuccessionCandidate)
				.where(
					and(
						eq(hrSuccessionCandidate.organizationId, input.organizationId),
						eq(
							hrSuccessionCandidate.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			const candidate = mapSuccessionCandidate(row);
			if (!candidate.ok) return candidate;
			if (
				row.createIdempotencyKey === null ||
				row.createRequestFingerprint === null
			) {
				return fail(
					"INTERNAL_ERROR",
					"Succession candidate idempotency metadata is missing",
				);
			}
			return ok({
				candidate: candidate.data,
				createRequestFingerprint: row.createRequestFingerprint,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find succession candidate by idempotency key",
			);
		}
	},

	async nominateSuccessionCandidate(record, _ports, meta) {
		const existing = await this.findSuccessionCandidateByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (
				existing.data.createRequestFingerprint ===
				record.createRequestFingerprint
			) {
				return ok(existing.data.candidate);
			}
			return conflict("Idempotency key already used with different data");
		}

		const plan = await this.getSuccessionPlanById({
			organizationId: record.organizationId,
			successionPlanId: record.successionPlanId,
		});
		if (!plan.ok) return plan;
		if (plan.data === null) {
			return notFound("Succession plan not found");
		}

		let employmentStatus: EmploymentStatus | null = null;
		if (record.employeeId !== null) {
			const employee = await this.getEmployeeById({
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!employee.ok) return employee;
			if (employee.data === null) {
				return notFound("Employee not found");
			}
			const employment = await this.findOpenEmploymentByEmployee({
				organizationId: record.organizationId,
				employeeId: record.employeeId,
			});
			if (!employment.ok) return employment;
			employmentStatus = employment.data?.status ?? null;
		}

		const nominatable = assertSuccessionCandidateNominatable({
			planStatus: plan.data.status,
			allowsExternalCandidates: plan.data.allowsExternalCandidates,
			employeeId: record.employeeId,
			externalCandidateRef: record.externalCandidateRef,
			employmentStatus,
			nominatorUserId: record.nominatorUserId,
		});
		if (!nominatable.ok) return nominatable;

		const id = randomUUID();
		const brandedId = parseHumanResourcesSuccessionCandidateId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_succession_candidate",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<
				[SuccessionCandidateSqlRow[]]
			>((sqlTag) => [
				sqlTag`
						WITH plan_ok AS (
							SELECT id, status, allows_external_candidates
							FROM hr_succession_plan
							WHERE id = ${record.successionPlanId}
								AND organization_id = ${record.organizationId}
								AND status != 'closed'
						),
						mutated AS (
							INSERT INTO hr_succession_candidate (
								id, organization_id, succession_plan_id, employee_id,
								external_candidate_ref, nominator_user_id, readiness,
								readiness_effective_on, evidence_summary, status,
								create_idempotency_key, create_request_fingerprint,
								version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId},
								${record.successionPlanId}, ${record.employeeId},
								${record.externalCandidateRef}, ${record.nominatorUserId},
								${record.readiness}, ${record.readinessEffectiveOn},
								${record.evidenceSummary}, 'nominated',
								${record.createIdempotencyKey}, ${record.createRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							FROM plan_ok
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_succession_candidate', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id,
								${HUMAN_RESOURCES_SUCCESSION_READINESS_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, created_by,
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const row = rows[0];
			if (!row) {
				return invalidState("Succession plan is closed");
			}
			return mapSuccessionCandidateSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findSuccessionCandidateByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (
						replay.data.createRequestFingerprint ===
						record.createRequestFingerprint
					) {
						return ok(replay.data.candidate);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(
				error,
				"Failed to nominate succession candidate",
			);
		}
	},

	async assessSuccessionReadiness(input, _ports, meta) {
		try {
			const existingRows = await db
				.select()
				.from(hrSuccessionCandidate)
				.where(
					and(
						eq(hrSuccessionCandidate.organizationId, input.organizationId),
						eq(hrSuccessionCandidate.id, input.candidateId),
					),
				)
				.limit(1);
			const existingRow = existingRows[0];
			if (!existingRow) {
				return notFound("Succession candidate not found");
			}
			const loaded = mapSuccessionCandidate(existingRow);
			if (!loaded.ok) return loaded;
			const candidateActive = assertSuccessionCandidateActive(
				loaded.data.status,
			);
			if (!candidateActive.ok) return candidateActive;
			const validAssessment = assertReadinessAssessmentValid({
				evidenceSummary: input.evidenceSummary,
				effectiveOn: input.readinessEffectiveOn,
				todayDate: todayIsoDate(),
			});
			if (!validAssessment.ok) return validAssessment;
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;

			const nextVersion = input.expectedVersion + 1;
			const auditId = randomUUID();
			const eventId = randomUUID();
			const payloadJson = eventPayloadJson({
				organizationId: input.organizationId,
				entityType: "hr_succession_candidate",
				entityId: input.candidateId,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			});

			const [rows] = await runNeonHttpTransaction<
				[SuccessionCandidateSqlRow[]]
			>((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_succession_candidate
							SET readiness = ${input.readiness},
								readiness_effective_on = ${input.readinessEffectiveOn},
								evidence_summary = ${input.evidenceSummary},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.candidateId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status IN ('nominated', 'approved')
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_succession_candidate', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id,
								${HUMAN_RESOURCES_SUCCESSION_READINESS_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Succession candidate",
				});
			}
			return mapSuccessionCandidateSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to assess succession readiness",
			);
		}
	},

	async approveSuccessionCandidate(input, _ports, meta) {
		try {
			const existingRows = await db
				.select()
				.from(hrSuccessionCandidate)
				.where(
					and(
						eq(hrSuccessionCandidate.organizationId, input.organizationId),
						eq(hrSuccessionCandidate.id, input.candidateId),
					),
				)
				.limit(1);
			const existingRow = existingRows[0];
			if (!existingRow) {
				return notFound("Succession candidate not found");
			}
			const loaded = mapSuccessionCandidate(existingRow);
			if (!loaded.ok) return loaded;
			const approvable = assertSuccessionCandidateApprovable(
				loaded.data.status,
			);
			if (!approvable.ok) return approvable;
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;

			const nextVersion = input.expectedVersion + 1;
			const auditId = randomUUID();
			const eventId = randomUUID();
			const payloadJson = eventPayloadJson({
				organizationId: input.organizationId,
				entityType: "hr_succession_candidate",
				entityId: input.candidateId,
				actorId: input.actorUserId,
				correlationId: meta.correlationId,
			});

			const [rows] = await runNeonHttpTransaction<
				[SuccessionCandidateSqlRow[]]
			>((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_succession_candidate
							SET status = 'approved',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.candidateId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status = 'nominated'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_succession_candidate', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id,
								${HUMAN_RESOURCES_SUCCESSION_CANDIDATE_APPROVED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited, outboxed
					`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Succession candidate",
				});
			}
			return mapSuccessionCandidateSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to approve succession candidate",
			);
		}
	},

	async removeSuccessionCandidate(input, _ports, meta) {
		try {
			const existingRows = await db
				.select()
				.from(hrSuccessionCandidate)
				.where(
					and(
						eq(hrSuccessionCandidate.organizationId, input.organizationId),
						eq(hrSuccessionCandidate.id, input.candidateId),
					),
				)
				.limit(1);
			const existingRow = existingRows[0];
			if (!existingRow) {
				return notFound("Succession candidate not found");
			}
			const loaded = mapSuccessionCandidate(existingRow);
			if (!loaded.ok) return loaded;
			const removable = assertSuccessionCandidateRemovable(loaded.data.status);
			if (!removable.ok) return removable;
			const versionCheck = assertExpectedVersion(
				loaded.data.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) return versionCheck;

			const nextVersion = input.expectedVersion + 1;
			const auditId = randomUUID();

			const [rows] = await runNeonHttpTransaction<
				[SuccessionCandidateSqlRow[]]
			>((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_succession_candidate
							SET status = 'removed',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.candidateId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status IN ('nominated', 'approved')
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_succession_candidate', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const row = rows[0];
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Succession candidate",
				});
			}
			return mapSuccessionCandidateSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to remove succession candidate",
			);
		}
	},

	async listSuccessionCandidates(input) {
		try {
			const page = input.page ?? 1;
			const pageSize = input.pageSize ?? 20;
			const conditions = [
				eq(hrSuccessionCandidate.organizationId, input.organizationId),
				eq(hrSuccessionCandidate.successionPlanId, input.successionPlanId),
			];
			if (input.status !== undefined) {
				conditions.push(eq(hrSuccessionCandidate.status, input.status));
			}
			const rows = await db
				.select()
				.from(hrSuccessionCandidate)
				.where(and(...conditions))
				.orderBy(desc(hrSuccessionCandidate.createdAt));
			const candidates: SuccessionCandidate[] = [];
			for (const row of rows) {
				const mapped = mapSuccessionCandidate(row);
				if (!mapped.ok) return mapped;
				candidates.push(mapped.data);
			}
			const { items, totalCount } = paginate(candidates, page, pageSize);
			return ok({ candidates: items, totalCount, page, pageSize });
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list succession candidates",
			);
		}
	},

	async getPositionSuccessionCoverage(input) {
		try {
			const planRows = await db
				.select()
				.from(hrSuccessionPlan)
				.where(
					and(
						eq(hrSuccessionPlan.organizationId, input.organizationId),
						eq(hrSuccessionPlan.positionId, input.positionId),
					),
				);
			const successionPlans: SuccessionPlan[] = [];
			for (const row of planRows) {
				const mapped = mapSuccessionPlan(row);
				if (!mapped.ok) return mapped;
				successionPlans.push(mapped.data);
			}
			const planIds = successionPlans.map((plan) => plan.id);
			if (planIds.length === 0) {
				return ok({
					organizationId: input.organizationId,
					positionId: input.positionId,
					successionPlans: [],
					readyNowCandidateCount: 0,
					readySoonCandidateCount: 0,
					totalActiveCandidateCount: 0,
				} satisfies PositionSuccessionCoverage);
			}

			const candidateRows = await db
				.select()
				.from(hrSuccessionCandidate)
				.where(
					and(
						eq(hrSuccessionCandidate.organizationId, input.organizationId),
						inArray(hrSuccessionCandidate.successionPlanId, planIds),
					),
				);
			const asOfDate = todayIsoDate();
			let readyNowCandidateCount = 0;
			let readySoonCandidateCount = 0;
			let totalActiveCandidateCount = 0;

			for (const row of candidateRows) {
				const mapped = mapSuccessionCandidate(row);
				if (!mapped.ok) return mapped;
				const candidate = mapped.data;
				if (
					candidate.status !== "nominated" &&
					candidate.status !== "approved"
				) {
					continue;
				}
				totalActiveCandidateCount += 1;
				const notStale = assertReadinessNotStale({
					readinessEffectiveOn: candidate.readinessEffectiveOn,
					asOfDate,
				});
				if (!notStale.ok) {
					continue;
				}
				if (candidate.readiness === "ready_now") {
					readyNowCandidateCount += 1;
				} else if (candidate.readiness === "ready_soon") {
					readySoonCandidateCount += 1;
				}
			}

			return ok({
				organizationId: input.organizationId,
				positionId: input.positionId,
				successionPlans,
				readyNowCandidateCount,
				readySoonCandidateCount,
				totalActiveCandidateCount,
			} satisfies PositionSuccessionCoverage);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load position succession coverage",
			);
		}
	},
};

export function attachDrizzleTalent(target: TalentHost): void {
	Object.assign(target, drizzleTalentMethods);
}

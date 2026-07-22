import { randomUUID } from "node:crypto";

import {
	and,
	db,
	desc,
	eq,
	hrBenefitEnrollment,
	hrBenefitPlan,
	hrCompensationGrade,
	hrCompensationReview,
	hrEmployeeCompensation,
	hrEmployment,
	hrSalaryBand,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
} from "@afenda/events/schemas";

import {
	parseHumanResourcesBenefitEnrollmentId,
	parseHumanResourcesBenefitPlanId,
	parseHumanResourcesCompensationGradeId,
	parseHumanResourcesCompensationReviewId,
	parseHumanResourcesEmployeeCompensationId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesSalaryBandId,
} from "./brands";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "./error-codes";
import { assertExpectedVersion } from "./shared/concurrency";
import {
	compareMoneyOrder,
	rangesOverlap,
} from "./shared/compensation-money";
import {
	benefitEnrollmentStatusSchema,
	benefitPlanStatusSchema,
	compensationGradeStatusSchema,
	compensationReviewStatusSchema,
	employeeCompensationStatusSchema,
	isCompensationGradeActive,
	isCompensationReviewFinalized,
	isEmployeeCompensationActive,
	isSalaryBandActive,
	salaryBandStatusSchema,
	type BenefitEnrollmentStatus,
	type BenefitPlanStatus,
	type CompensationGradeStatus,
	type CompensationReviewStatus,
	type EmployeeCompensationStatus,
	type SalaryBandStatus,
} from "./shared/compensation-status";

// Helper: check if a review is in draft status
function isCompensationReviewDraft(status: CompensationReviewStatus): boolean {
	return status === "draft";
}
import {
	conflict,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "./shared/domain-guards";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "./shared/persistence-errors";
import type { HumanResourcesStore } from "./store";
import type {
	BenefitEnrollment,
	BenefitEnrollmentListPage,
	BenefitPlan,
	BenefitPlanListPage,
	CompensationGrade,
	CompensationGradeListPage,
	CompensationReview,
	CompensationReviewListPage,
	EmployeeCompensation,
	EmployeeCompensationListPage,
	SalaryBand,
	SalaryBandListPage,
	ApprovedCompensationHandoff,
} from "./types";

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

type CompensationHost = {
	getEmploymentById: HumanResourcesStore["getEmploymentById"];
	getEmployeeById: HumanResourcesStore["getEmployeeById"];
};

export type DrizzleCompensationMethods = Pick<
	HumanResourcesStore,
	| "getCompensationGrade"
	| "findCompensationGradeByCode"
	| "createCompensationGrade"
	| "updateCompensationGrade"
	| "archiveCompensationGrade"
	| "listCompensationGrades"
	| "getSalaryBand"
	| "createSalaryBand"
	| "supersedeSalaryBand"
	| "archiveSalaryBand"
	| "listSalaryBandsByGrade"
	| "getEmployeeCompensation"
	| "findEmployeeCompensationByIdempotencyKey"
	| "createEmployeeCompensation"
	| "endEmployeeCompensation"
	| "listEmployeeCompensationsByEmployee"
	| "findActiveEmployeeCompensationByEmployment"
	| "getCompensationReview"
	| "findCompensationReviewByIdempotencyKey"
	| "createCompensationReviewDraft"
	| "recordCompensationRecommendation"
	| "finalizeCompensationReview"
	| "applyApprovedCompensationResult"
	| "listCompensationReviewsByEmployee"
	| "getBenefitPlan"
	| "findBenefitPlanByCode"
	| "createBenefitPlan"
	| "updateBenefitPlan"
	| "archiveBenefitPlan"
	| "listBenefitPlans"
	| "getBenefitEnrollment"
	| "findBenefitEnrollmentByIdempotencyKey"
	| "enrolBenefit"
	| "endBenefitEnrollment"
	| "cancelBenefitEnrollment"
	| "listBenefitEnrollmentsByEmployee"
	| "getApprovedCompensationHandoff"
>;

type CompensationGradeSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	name: string;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type SalaryBandSqlRow = {
	id: string;
	organization_id: string;
	grade_id: string;
	currency_code: string;
	minimum_amount: string;
	midpoint_amount: string;
	maximum_amount: string;
	effective_from: string;
	effective_to: string | null;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type EmployeeCompensationSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	employment_id: string;
	grade_id: string | null;
	salary_band_id: string | null;
	base_amount: string;
	currency_code: string;
	effective_from: string;
	effective_to: string | null;
	reason: string;
	status: string;
	source_review_id: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type CompensationReviewSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	employment_id: string;
	status: string;
	proposed_base_amount: string | null;
	proposed_currency_code: string | null;
	proposed_grade_id: string | null;
	proposed_salary_band_id: string | null;
	recommendation_note: string | null;
	effective_from: string | null;
	finalized_at: Date | null;
	applied_compensation_id: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type BenefitPlanSqlRow = {
	id: string;
	organization_id: string;
	code: string;
	name: string;
	eligibility_note: string | null;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type BenefitEnrollmentSqlRow = {
	id: string;
	organization_id: string;
	employee_id: string;
	employment_id: string;
	plan_id: string;
	effective_from: string;
	effective_to: string | null;
	status: string;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapCompensationGrade(
	row: typeof hrCompensationGrade.$inferSelect,
): Result<CompensationGrade> {
	const id = parseHumanResourcesCompensationGradeId(row.id);
	if (!id.ok) return id;
	const status = compensationGradeStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid compensation grade status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapSalaryBand(
	row: typeof hrSalaryBand.$inferSelect,
): Result<SalaryBand> {
	const id = parseHumanResourcesSalaryBandId(row.id);
	if (!id.ok) return id;
	const gradeId = parseHumanResourcesCompensationGradeId(row.gradeId);
	if (!gradeId.ok) return gradeId;
	const status = salaryBandStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid salary band status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		gradeId: gradeId.data,
		currencyCode: row.currencyCode,
		minAmount: row.minimumAmount,
		midAmount: row.midpointAmount,
		maxAmount: row.maximumAmount,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapEmployeeCompensation(
	row: typeof hrEmployeeCompensation.$inferSelect,
): Result<EmployeeCompensation> {
	const id = parseHumanResourcesEmployeeCompensationId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	let gradeId = null as EmployeeCompensation["gradeId"];
	if (row.gradeId !== null) {
		const parsed = parseHumanResourcesCompensationGradeId(row.gradeId);
		if (!parsed.ok) return parsed;
		gradeId = parsed.data;
	}
	let salaryBandId = null as EmployeeCompensation["salaryBandId"];
	if (row.salaryBandId !== null) {
		const parsed = parseHumanResourcesSalaryBandId(row.salaryBandId);
		if (!parsed.ok) return parsed;
		salaryBandId = parsed.data;
	}
	let sourceReviewId = null as EmployeeCompensation["sourceReviewId"];
	if (row.sourceReviewId !== null) {
		const parsed = parseHumanResourcesCompensationReviewId(row.sourceReviewId);
		if (!parsed.ok) return parsed;
		sourceReviewId = parsed.data;
	}
	const status = employeeCompensationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid employee compensation status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		gradeId,
		salaryBandId,
		baseAmount: row.baseAmount,
		currencyCode: row.currencyCode,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		reason: row.reason,
		status: status.data,
		sourceReviewId,
		createIdempotencyKey: row.createIdempotencyKey,
		fingerprint: row.createRequestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapCompensationReview(
	row: typeof hrCompensationReview.$inferSelect,
): Result<CompensationReview> {
	const id = parseHumanResourcesCompensationReviewId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	let proposedGradeId = null as CompensationReview["proposedGradeId"];
	if (row.proposedGradeId !== null) {
		const parsed = parseHumanResourcesCompensationGradeId(row.proposedGradeId);
		if (!parsed.ok) return parsed;
		proposedGradeId = parsed.data;
	}
	let proposedSalaryBandId = null as CompensationReview["proposedSalaryBandId"];
	if (row.proposedSalaryBandId !== null) {
		const parsed = parseHumanResourcesSalaryBandId(row.proposedSalaryBandId);
		if (!parsed.ok) return parsed;
		proposedSalaryBandId = parsed.data;
	}
	let appliedCompensationId = null as CompensationReview["appliedCompensationId"];
	if (row.appliedCompensationId !== null) {
		const parsed = parseHumanResourcesEmployeeCompensationId(
			row.appliedCompensationId,
		);
		if (!parsed.ok) return parsed;
		appliedCompensationId = parsed.data;
	}
	const status = compensationReviewStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid compensation review status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		status: status.data,
		proposedBaseAmount: row.proposedBaseAmount,
		proposedCurrencyCode: row.proposedCurrencyCode,
		proposedGradeId,
		proposedSalaryBandId,
		recommendationNote: row.recommendationNote,
		effectiveFrom: row.effectiveFrom,
		finalizedAt: row.finalizedAt,
		appliedCompensationId,
		createIdempotencyKey: row.createIdempotencyKey,
		fingerprint: row.createRequestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapBenefitPlan(
	row: typeof hrBenefitPlan.$inferSelect,
): Result<BenefitPlan> {
	const id = parseHumanResourcesBenefitPlanId(row.id);
	if (!id.ok) return id;
	const status = benefitPlanStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid benefit plan status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		code: row.code,
		name: row.name,
		eligibilityNote: row.eligibilityNote,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapBenefitEnrollment(
	row: typeof hrBenefitEnrollment.$inferSelect,
): Result<BenefitEnrollment> {
	const id = parseHumanResourcesBenefitEnrollmentId(row.id);
	if (!id.ok) return id;
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) return employeeId;
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) return employmentId;
	const planId = parseHumanResourcesBenefitPlanId(row.planId);
	if (!planId.ok) return planId;
	const status = benefitEnrollmentStatusSchema.safeParse(row.status);
	if (!status.success) {
		return fail("INTERNAL_ERROR", "Invalid benefit enrollment status");
	}
	return ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		planId: planId.data,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		status: status.data,
		createIdempotencyKey: row.createIdempotencyKey,
		fingerprint: row.createRequestFingerprint,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapCompensationGradeSql(
	row: CompensationGradeSqlRow,
): Result<CompensationGrade> {
	return mapCompensationGrade({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapSalaryBandSql(row: SalaryBandSqlRow): Result<SalaryBand> {
	return mapSalaryBand({
		id: row.id,
		organizationId: row.organization_id,
		gradeId: row.grade_id,
		currencyCode: row.currency_code,
		minimumAmount: row.minimum_amount,
		midpointAmount: row.midpoint_amount,
		maximumAmount: row.maximum_amount,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapEmployeeCompensationSql(
	row: EmployeeCompensationSqlRow,
): Result<EmployeeCompensation> {
	return mapEmployeeCompensation({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		employmentId: row.employment_id,
		gradeId: row.grade_id,
		salaryBandId: row.salary_band_id,
		baseAmount: row.base_amount,
		currencyCode: row.currency_code,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		reason: row.reason,
		status: row.status,
		sourceReviewId: row.source_review_id,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapCompensationReviewSql(
	row: CompensationReviewSqlRow,
): Result<CompensationReview> {
	return mapCompensationReview({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		employmentId: row.employment_id,
		status: row.status,
		proposedBaseAmount: row.proposed_base_amount,
		proposedCurrencyCode: row.proposed_currency_code,
		proposedGradeId: row.proposed_grade_id,
		proposedSalaryBandId: row.proposed_salary_band_id,
		recommendationNote: row.recommendation_note,
		effectiveFrom: row.effective_from,
		finalizedAt: row.finalized_at,
		appliedCompensationId: row.applied_compensation_id,
		createIdempotencyKey: row.create_idempotency_key,
		createRequestFingerprint: row.create_request_fingerprint,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapBenefitPlanSql(row: BenefitPlanSqlRow): Result<BenefitPlan> {
	return mapBenefitPlan({
		id: row.id,
		organizationId: row.organization_id,
		code: row.code,
		name: row.name,
		eligibilityNote: row.eligibility_note,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapBenefitEnrollmentSql(
	row: BenefitEnrollmentSqlRow,
): Result<BenefitEnrollment> {
	return mapBenefitEnrollment({
		id: row.id,
		organizationId: row.organization_id,
		employeeId: row.employee_id,
		employmentId: row.employment_id,
		planId: row.plan_id,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
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

export const drizzleCompensationMethods: DrizzleCompensationMethods &
	ThisType<CompensationHost & DrizzleCompensationMethods> = {
	async getCompensationGrade(input) {
		try {
			const rows = await db
				.select()
				.from(hrCompensationGrade)
				.where(
					and(
						eq(hrCompensationGrade.organizationId, input.organizationId),
						eq(hrCompensationGrade.id, input.gradeId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCompensationGrade(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load compensation grade");
		}
	},

	async findCompensationGradeByCode(input) {
		try {
			const rows = await db
				.select()
				.from(hrCompensationGrade)
				.where(
					and(
						eq(hrCompensationGrade.organizationId, input.organizationId),
						eq(hrCompensationGrade.code, input.code),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCompensationGrade(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find compensation grade by code",
			);
		}
	},

	async createCompensationGrade(record, ports, meta) {
		const existing = await this.findCompensationGradeByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			return conflict("Compensation grade code already exists");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCompensationGradeId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CompensationGradeSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							INSERT INTO hr_compensation_grade (
								id, organization_id, code, name, status, version,
								created_by, updated_by
							)
							VALUES (
								${brandedId.data}, ${record.organizationId}, ${record.code},
								${record.name}, 'active', 1, ${record.createdBy}, ${record.createdBy}
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
								'human-resources', 'hr_compensation_grade', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Unable to create compensation grade");
			}
			return mapCompensationGradeSql(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Compensation grade code already exists");
			}
			return mapPersistenceFailure(error, "Failed to create compensation grade");
		}
	},

	async updateCompensationGrade(input, ports, meta) {
		const existing = await this.getCompensationGrade({
			organizationId: input.organizationId,
			gradeId: input.gradeId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Compensation grade not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CompensationGradeSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_compensation_grade
							SET name = COALESCE(${input.name}, name),
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.gradeId}
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
								'human-resources', 'hr_compensation_grade', id, 'UPDATE', '[]'::jsonb
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
					entityLabel: "Compensation grade",
				});
			}
			return mapCompensationGradeSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update compensation grade");
		}
	},

	async archiveCompensationGrade(input, ports, meta) {
		const existing = await this.getCompensationGrade({
			organizationId: input.organizationId,
			gradeId: input.gradeId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Compensation grade not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CompensationGradeSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH active_bands AS (
							SELECT 1 AS exists
							FROM hr_salary_band
							WHERE organization_id = ${input.organizationId}
								AND grade_id = ${input.gradeId}
								AND status = 'active'
							LIMIT 1
						),
						mutated AS (
							UPDATE hr_compensation_grade
							SET status = 'archived',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.gradeId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND NOT EXISTS (SELECT 1 FROM active_bands)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_compensation_grade', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				const bandRows = await db
					.select()
					.from(hrSalaryBand)
					.where(
						and(
							eq(hrSalaryBand.organizationId, input.organizationId),
							eq(hrSalaryBand.gradeId, input.gradeId),
							eq(hrSalaryBand.status, "active"),
						),
					)
					.limit(1);
				if (bandRows.length > 0) {
					return invalidState(
						"Cannot archive grade while active salary bands reference it",
					);
				}
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Compensation grade",
				});
			}
			return mapCompensationGradeSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to archive compensation grade",
			);
		}
	},

	async listCompensationGrades(input) {
		try {
			const conditions = [
				eq(hrCompensationGrade.organizationId, input.organizationId),
			];
			if (input.status) {
				conditions.push(eq(hrCompensationGrade.status, input.status));
			}
			const allRows = await db
				.select()
				.from(hrCompensationGrade)
				.where(and(...conditions));
			const grades: CompensationGrade[] = [];
			for (const row of allRows) {
				const mapped = mapCompensationGrade(row);
				if (!mapped.ok) return mapped;
				grades.push(mapped.data);
			}
			grades.sort((a, b) => a.code.localeCompare(b.code));
			const totalCount = grades.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = grades.slice(offset, offset + input.pageSize);
			return ok({
				grades: paginated,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list compensation grades");
		}
	},

	async getSalaryBand(input) {
		try {
			const rows = await db
				.select()
				.from(hrSalaryBand)
				.where(
					and(
						eq(hrSalaryBand.organizationId, input.organizationId),
						eq(hrSalaryBand.id, input.salaryBandId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapSalaryBand(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load salary band");
		}
	},

	async createSalaryBand(record, ports, meta) {
		const grade = await this.getCompensationGrade({
			organizationId: record.organizationId,
			gradeId: record.gradeId,
		});
		if (!grade.ok) return grade;
		if (grade.data === null) {
			return fail(
				"NOT_FOUND",
				"Compensation grade not found or cross-org reference",
				{ code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE },
			);
		}
		if (!isCompensationGradeActive(grade.data.status)) {
			return invalidState("Grade must be active");
		}

		const moneyCheck = compareMoneyOrder(
			record.minAmount,
			record.midAmount,
			record.maxAmount,
		);
		if (!moneyCheck.ok) return moneyCheck;

		const id = randomUUID();
		const brandedId = parseHumanResourcesSalaryBandId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[SalaryBandSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH overlapping AS (
							SELECT 1 AS exists
							FROM hr_salary_band
							WHERE organization_id = ${record.organizationId}
								AND grade_id = ${record.gradeId}
								AND status IN ('active', 'superseded')
								AND (
									(${record.effectiveFrom}::date <= COALESCE(effective_to::date, '9999-12-31'::date))
									AND (effective_from::date <= COALESCE(${record.effectiveTo}::date, '9999-12-31'::date))
								)
							LIMIT 1
						),
						mutated AS (
							INSERT INTO hr_salary_band (
								id, organization_id, grade_id, currency_code,
								minimum_amount, midpoint_amount, maximum_amount,
								effective_from, effective_to, status, version,
								created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, ${record.gradeId},
								${record.currencyCode}, ${record.minAmount}, ${record.midAmount},
								${record.maxAmount}, ${record.effectiveFrom}, ${record.effectiveTo},
								'active', 1, ${record.createdBy}, ${record.createdBy}
							WHERE NOT EXISTS (SELECT 1 FROM overlapping)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_salary_band', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Overlapping salary band exists for this grade");
			}
			return mapSalaryBandSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to create salary band");
		}
	},

	async supersedeSalaryBand(input, ports, meta) {
		const grade = await this.getCompensationGrade({
			organizationId: input.organizationId,
			gradeId: input.gradeId,
		});
		if (!grade.ok) return grade;
		if (grade.data === null) {
			return fail(
				"NOT_FOUND",
				"Compensation grade not found or cross-org reference",
				{ code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE },
			);
		}

		const moneyCheck = compareMoneyOrder(
			input.minAmount,
			input.midAmount,
			input.maxAmount,
		);
		if (!moneyCheck.ok) return moneyCheck;

		const id = randomUUID();
		const brandedId = parseHumanResourcesSalaryBandId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[SalaryBandSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH overlapping_ids AS (
							SELECT id, version
							FROM hr_salary_band
							WHERE organization_id = ${input.organizationId}
								AND grade_id = ${input.gradeId}
								AND status IN ('active', 'superseded')
								AND (
									(${input.effectiveFrom}::date <= COALESCE(effective_to::date, '9999-12-31'::date))
									AND (effective_from::date <= COALESCE(${input.effectiveTo}::date, '9999-12-31'::date))
								)
							FOR UPDATE
						),
						superseded_bands AS (
							UPDATE hr_salary_band
							SET status = 'superseded',
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM overlapping_ids
							WHERE hr_salary_band.id = overlapping_ids.id
								AND hr_salary_band.version = overlapping_ids.version
							RETURNING hr_salary_band.id
						),
						mutated AS (
							INSERT INTO hr_salary_band (
								id, organization_id, grade_id, currency_code,
								minimum_amount, midpoint_amount, maximum_amount,
								effective_from, effective_to, status, version,
								created_by, updated_by
							)
							VALUES (
								${brandedId.data}, ${input.organizationId}, ${input.gradeId},
								${input.currencyCode}, ${input.minAmount}, ${input.midAmount},
								${input.maxAmount}, ${input.effectiveFrom}, ${input.effectiveTo},
								'active', 1, ${input.actorUserId}, ${input.actorUserId}
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
								'human-resources', 'hr_salary_band', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Unable to supersede salary band");
			}
			return mapSalaryBandSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to supersede salary band");
		}
	},

	async archiveSalaryBand(input, ports, meta) {
		const existing = await this.getSalaryBand({
			organizationId: input.organizationId,
			salaryBandId: input.salaryBandId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Salary band not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[SalaryBandSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_salary_band
							SET status = 'archived',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.salaryBandId}
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
								'human-resources', 'hr_salary_band', id, 'UPDATE', '[]'::jsonb
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
					entityLabel: "Salary band",
				});
			}
			return mapSalaryBandSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to archive salary band");
		}
	},

	async listSalaryBandsByGrade(input) {
		const grade = await this.getCompensationGrade({
			organizationId: input.organizationId,
			gradeId: input.gradeId,
		});
		if (!grade.ok) return grade;
		if (grade.data === null) {
			return notFound("Compensation grade not found");
		}

		try {
			const conditions = [
				eq(hrSalaryBand.organizationId, input.organizationId),
				eq(hrSalaryBand.gradeId, input.gradeId),
			];
			if (input.status) {
				conditions.push(eq(hrSalaryBand.status, input.status));
			}
			const allRows = await db
				.select()
				.from(hrSalaryBand)
				.where(and(...conditions))
				.orderBy(desc(hrSalaryBand.effectiveFrom));
			const bands: SalaryBand[] = [];
			for (const row of allRows) {
				const mapped = mapSalaryBand(row);
				if (!mapped.ok) return mapped;
				bands.push(mapped.data);
			}
			const totalCount = bands.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = bands.slice(offset, offset + input.pageSize);
			return ok({
				bands: paginated,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list salary bands");
		}
	},

	async getEmployeeCompensation(input) {
		try {
			const rows = await db
				.select()
				.from(hrEmployeeCompensation)
				.where(
					and(
						eq(hrEmployeeCompensation.organizationId, input.organizationId),
						eq(hrEmployeeCompensation.id, input.compensationId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapEmployeeCompensation(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load employee compensation",
			);
		}
	},

	async findEmployeeCompensationByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrEmployeeCompensation)
				.where(
					and(
						eq(hrEmployeeCompensation.organizationId, input.organizationId),
						eq(hrEmployeeCompensation.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapEmployeeCompensation(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find employee compensation by idempotency key",
			);
		}
	},

	async createEmployeeCompensation(record, ports, meta) {
		const existing = await this.findEmployeeCompensationByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			return ok(existing.data);
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) return employment;
		if (employment.data === null) {
			return fail(
				"NOT_FOUND",
				"Employment not found or cross-org reference",
				{ code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE },
			);
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesEmployeeCompensationId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_employee_compensation",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<
				[EmployeeCompensationSqlRow[]]
			>((sqlTag) => [
				sqlTag`
						WITH employment AS (
							SELECT id, organization_id, employee_id
							FROM hr_employment
							WHERE id = ${record.employmentId}
								AND organization_id = ${record.organizationId}
						),
						active_check AS (
							SELECT 1 AS exists
							FROM hr_employee_compensation
							WHERE organization_id = ${record.organizationId}
								AND employment_id = ${record.employmentId}
								AND status = 'active'
							LIMIT 1
						),
						mutated AS (
							INSERT INTO hr_employee_compensation (
								id, organization_id, employee_id, employment_id, grade_id,
								salary_band_id, base_amount, currency_code, effective_from,
								effective_to, reason, status, source_review_id,
								create_idempotency_key, create_request_fingerprint, version,
								created_by, updated_by
							)
							SELECT
								${brandedId.data}, employment.organization_id, employment.employee_id,
								employment.id, ${record.gradeId}, ${record.salaryBandId},
								${record.baseAmount}, ${record.currencyCode}, ${record.effectiveFrom},
								NULL, ${record.reason}, 'active', ${record.sourceReviewId},
								${record.createIdempotencyKey}, ${record.createRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							FROM employment
							WHERE NOT EXISTS (SELECT 1 FROM active_check)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_employee_compensation', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
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
					"An active compensation agreement already exists for this employment",
				);
			}
			return mapEmployeeCompensationSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findEmployeeCompensationByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					return ok(replay.data);
				}
			}
			return mapPersistenceFailure(
				error,
				"Failed to create employee compensation",
			);
		}
	},

	async endEmployeeCompensation(input, ports, meta) {
		const existing = await this.getEmployeeCompensation({
			organizationId: input.organizationId,
			compensationId: input.compensationId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Employee compensation not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		if (!isEmployeeCompensationActive(existing.data.status)) {
			return invalidState("Compensation is not active");
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employee_compensation",
			entityId: input.compensationId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<
				[EmployeeCompensationSqlRow[]]
			>((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_employee_compensation
							SET status = 'ended',
								effective_to = ${input.endsOn},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.compensationId}
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
								'human-resources', 'hr_employee_compensation', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
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
					entityLabel: "Employee compensation",
				});
			}
			return mapEmployeeCompensationSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to end employee compensation",
			);
		}
	},

	async listEmployeeCompensationsByEmployee(input) {
		try {
			const allRows = await db
				.select()
				.from(hrEmployeeCompensation)
				.where(
					and(
						eq(hrEmployeeCompensation.organizationId, input.organizationId),
						eq(hrEmployeeCompensation.employeeId, input.employeeId),
					),
				)
				.orderBy(desc(hrEmployeeCompensation.effectiveFrom));
			const compensations: EmployeeCompensation[] = [];
			for (const row of allRows) {
				const mapped = mapEmployeeCompensation(row);
				if (!mapped.ok) return mapped;
				compensations.push(mapped.data);
			}
			const totalCount = compensations.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = compensations.slice(offset, offset + input.pageSize);
			return ok({
				compensations: paginated,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list employee compensations",
			);
		}
	},

	async findActiveEmployeeCompensationByEmployment(input) {
		try {
			const rows = await db
				.select()
				.from(hrEmployeeCompensation)
				.where(
					and(
						eq(hrEmployeeCompensation.organizationId, input.organizationId),
						eq(hrEmployeeCompensation.employmentId, input.employmentId),
						eq(hrEmployeeCompensation.status, "active"),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapEmployeeCompensation(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find active employee compensation",
			);
		}
	},

	async getCompensationReview(input) {
		try {
			const rows = await db
				.select()
				.from(hrCompensationReview)
				.where(
					and(
						eq(hrCompensationReview.organizationId, input.organizationId),
						eq(hrCompensationReview.id, input.reviewId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCompensationReview(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load compensation review",
			);
		}
	},

	async findCompensationReviewByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrCompensationReview)
				.where(
					and(
						eq(hrCompensationReview.organizationId, input.organizationId),
						eq(hrCompensationReview.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapCompensationReview(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find compensation review by idempotency key",
			);
		}
	},

	async createCompensationReviewDraft(record, ports, meta) {
		const existing = await this.findCompensationReviewByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (existing.data.fingerprint === record.createRequestFingerprint) {
				return ok(existing.data);
			}
			return conflict("Idempotency key already used with different data");
		}

		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) return employee;
		if (employee.data === null) {
			return fail(
				"NOT_FOUND",
				"Employee not found or cross-org reference",
				{ code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE },
			);
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) return employment;
		if (employment.data === null) {
			return fail(
				"NOT_FOUND",
				"Employment not found or cross-org reference",
				{ code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE },
			);
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCompensationReviewId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CompensationReviewSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							INSERT INTO hr_compensation_review (
								id, organization_id, employee_id, employment_id, status,
								proposed_base_amount, proposed_currency_code, proposed_grade_id,
								proposed_salary_band_id, recommendation_note, effective_from,
								finalized_at, applied_compensation_id, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							VALUES (
								${brandedId.data}, ${record.organizationId}, ${record.employeeId},
								${record.employmentId}, 'draft', NULL, NULL, NULL, NULL, NULL, NULL,
								NULL, NULL, ${record.createIdempotencyKey}, ${record.createRequestFingerprint},
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
								'human-resources', 'hr_compensation_review', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Unable to create compensation review draft");
			}
			return mapCompensationReviewSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findCompensationReviewByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (replay.data.fingerprint === record.createRequestFingerprint) {
						return ok(replay.data);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(
				error,
				"Failed to create compensation review draft",
			);
		}
	},

	async recordCompensationRecommendation(input, ports, meta) {
		const existing = await this.getCompensationReview({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Compensation review not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		if (!isCompensationReviewDraft(existing.data.status)) {
			return invalidState("Compensation review is not in draft status");
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CompensationReviewSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_compensation_review
							SET proposed_base_amount = ${input.proposedBaseAmount},
								proposed_currency_code = ${input.proposedCurrencyCode},
								proposed_grade_id = ${input.proposedGradeId},
								proposed_salary_band_id = ${input.proposedSalaryBandId},
								effective_from = ${input.effectiveFrom},
								recommendation_note = ${input.recommendationNote},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.reviewId}
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
								'human-resources', 'hr_compensation_review', id, 'UPDATE', '[]'::jsonb
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
					entityLabel: "Compensation review",
				});
			}
			return mapCompensationReviewSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to record compensation recommendation",
			);
		}
	},

	async finalizeCompensationReview(input, ports, meta) {
		const existing = await this.getCompensationReview({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Compensation review not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		if (!isCompensationReviewDraft(existing.data.status)) {
			return invalidState("Compensation review is not in draft status");
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[CompensationReviewSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_compensation_review
							SET status = 'finalized',
								finalized_at = now(),
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.reviewId}
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
								'human-resources', 'hr_compensation_review', id, 'UPDATE', '[]'::jsonb
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
					entityLabel: "Compensation review",
				});
			}
			return mapCompensationReviewSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to finalize compensation review",
			);
		}
	},

	async applyApprovedCompensationResult(input, ports, meta) {
		const review = await this.getCompensationReview({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
		});
		if (!review.ok) return review;
		if (review.data === null) {
			return notFound("Compensation review not found");
		}
		const reviewData = review.data; // Store for type narrowing
		if (!isCompensationReviewFinalized(reviewData.status)) {
			return invalidState("Compensation review is not finalized");
		}
		if (
			!reviewData.proposedBaseAmount ||
			!reviewData.proposedCurrencyCode ||
			!reviewData.effectiveFrom
		) {
			return invalidState(
				"Review must have proposed amount, currency, and effective date",
			);
		}

		const employment = await this.getEmploymentById({
			organizationId: input.organizationId,
			employmentId: reviewData.employmentId,
		});
		if (!employment.ok) return employment;
		if (employment.data === null) {
			return fail(
				"NOT_FOUND",
				"Employment not found or cross-org reference",
				{ code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE },
			);
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesEmployeeCompensationId(id);
		if (!brandedId.ok) return brandedId;
		const auditOldId = randomUUID();
		const auditNewId = randomUUID();
		const eventOldId = randomUUID();
		const eventNewId = randomUUID();
		const payloadOldJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employee_compensation",
			entityId: "TO_BE_DETERMINED",
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});
		const payloadNewJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_employee_compensation",
			entityId: brandedId.data,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<
				[EmployeeCompensationSqlRow[]]
			>((sqlTag) => [
				sqlTag`
						WITH active_comp AS (
							SELECT id, version
							FROM hr_employee_compensation
							WHERE organization_id = ${input.organizationId}
								AND employment_id = ${reviewData.employmentId}
								AND status = 'active'
							FOR UPDATE
						),
						ended_comp AS (
							UPDATE hr_employee_compensation
							SET status = 'ended',
								effective_to = ${reviewData.effectiveFrom},
								version = version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM active_comp
							WHERE hr_employee_compensation.id = active_comp.id
								AND hr_employee_compensation.version = active_comp.version
							RETURNING hr_employee_compensation.id, hr_employee_compensation.organization_id
						),
						audit_ended AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditOldId}, organization_id, ${input.actorUserId}, ${meta.correlationId},
								'human-resources', 'hr_employee_compensation', id, 'UPDATE', '[]'::jsonb
							FROM ended_comp
							RETURNING id
						),
						outbox_ended AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventOldId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								jsonb_set(${payloadOldJson}::jsonb, '{entityId}', to_jsonb(id::text)),
								'pending', 0
							FROM ended_comp
							RETURNING id
						),
						mutated AS (
							INSERT INTO hr_employee_compensation (
								id, organization_id, employee_id, employment_id, grade_id,
								salary_band_id, base_amount, currency_code, effective_from,
								effective_to, reason, status, source_review_id,
								create_idempotency_key, create_request_fingerprint, version,
								created_by, updated_by
							)
							VALUES (
								${brandedId.data}, ${input.organizationId}, ${reviewData.employeeId},
								${reviewData.employmentId}, ${reviewData.proposedGradeId},
								${reviewData.proposedSalaryBandId}, ${reviewData.proposedBaseAmount},
								${reviewData.proposedCurrencyCode}, ${reviewData.effectiveFrom},
								NULL, ${input.reason}, 'active', ${input.reviewId},
								${input.createIdempotencyKey},
								${reviewData.effectiveFrom}::text || ':' || ${reviewData.proposedBaseAmount}::text || ':' || ${reviewData.proposedCurrencyCode}::text,
								1, ${input.actorUserId}, ${input.actorUserId}
							)
							RETURNING *
						),
						audit_new AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditNewId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_employee_compensation', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outbox_new AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventNewId}, organization_id, ${HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, ${input.actorUserId},
								${payloadNewJson}::jsonb, 'pending', 0
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audit_new, outbox_new
					`,
			]);
			const row = rows[0];
			if (!row) {
				return conflict("Unable to apply compensation result");
			}
			return mapEmployeeCompensationSql(row);
		} catch (error) {
			if (
				isCreateIdempotencyUniqueViolation(error) ||
				isPostgresUniqueViolation(error)
			) {
				const replay = await this.findEmployeeCompensationByIdempotencyKey({
					organizationId: input.organizationId,
					idempotencyKey: input.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					return ok(replay.data);
				}
			}
			return mapPersistenceFailure(
				error,
				"Failed to apply compensation result",
			);
		}
	},

	async listCompensationReviewsByEmployee(input) {
		try {
			const allRows = await db
				.select()
				.from(hrCompensationReview)
				.where(
					and(
						eq(hrCompensationReview.organizationId, input.organizationId),
						eq(hrCompensationReview.employeeId, input.employeeId),
					),
				)
				.orderBy(desc(hrCompensationReview.createdAt));
			const reviews: CompensationReview[] = [];
			for (const row of allRows) {
				const mapped = mapCompensationReview(row);
				if (!mapped.ok) return mapped;
				reviews.push(mapped.data);
			}
			const totalCount = reviews.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = reviews.slice(offset, offset + input.pageSize);
			return ok({
				reviews: paginated,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list compensation reviews",
			);
		}
	},

	async getBenefitPlan(input) {
		try {
			const rows = await db
				.select()
				.from(hrBenefitPlan)
				.where(
					and(
						eq(hrBenefitPlan.organizationId, input.organizationId),
						eq(hrBenefitPlan.id, input.planId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapBenefitPlan(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load benefit plan");
		}
	},

	async findBenefitPlanByCode(input) {
		try {
			const rows = await db
				.select()
				.from(hrBenefitPlan)
				.where(
					and(
						eq(hrBenefitPlan.organizationId, input.organizationId),
						eq(hrBenefitPlan.code, input.code),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapBenefitPlan(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find benefit plan by code",
			);
		}
	},

	async createBenefitPlan(record, ports, meta) {
		const existing = await this.findBenefitPlanByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			return conflict("Benefit plan code already exists");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesBenefitPlanId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[BenefitPlanSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							INSERT INTO hr_benefit_plan (
								id, organization_id, code, name, eligibility_note, status,
								version, created_by, updated_by
							)
							VALUES (
								${brandedId.data}, ${record.organizationId}, ${record.code},
								${record.name}, ${record.eligibilityNote}, 'active', 1,
								${record.createdBy}, ${record.createdBy}
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
								'human-resources', 'hr_benefit_plan', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
				],
			);
			const row = rows[0];
			if (!row) {
				return conflict("Unable to create benefit plan");
			}
			return mapBenefitPlanSql(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Benefit plan code already exists");
			}
			return mapPersistenceFailure(error, "Failed to create benefit plan");
		}
	},

	async updateBenefitPlan(input, ports, meta) {
		const existing = await this.getBenefitPlan({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Benefit plan not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[BenefitPlanSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_benefit_plan
							SET name = ${input.name},
								eligibility_note = ${input.eligibilityNote},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.planId}
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
								'human-resources', 'hr_benefit_plan', id, 'UPDATE', '[]'::jsonb
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
					entityLabel: "Benefit plan",
				});
			}
			return mapBenefitPlanSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to update benefit plan");
		}
	},

	async archiveBenefitPlan(input, ports, meta) {
		const existing = await this.getBenefitPlan({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Benefit plan not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();

		try {
			const [rows] = await runNeonHttpTransaction<[BenefitPlanSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_benefit_plan
							SET status = 'archived',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.planId}
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
								'human-resources', 'hr_benefit_plan', id, 'UPDATE', '[]'::jsonb
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
					entityLabel: "Benefit plan",
				});
			}
			return mapBenefitPlanSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to archive benefit plan");
		}
	},

	async listBenefitPlans(input) {
		try {
			const allRows = await db
				.select()
				.from(hrBenefitPlan)
				.where(eq(hrBenefitPlan.organizationId, input.organizationId));
			const plans: BenefitPlan[] = [];
			for (const row of allRows) {
				const mapped = mapBenefitPlan(row);
				if (!mapped.ok) return mapped;
				plans.push(mapped.data);
			}
			plans.sort((a, b) => a.code.localeCompare(b.code));
			const totalCount = plans.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = plans.slice(offset, offset + input.pageSize);
			return ok({
				plans: paginated,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list benefit plans");
		}
	},

	async getBenefitEnrollment(input) {
		try {
			const rows = await db
				.select()
				.from(hrBenefitEnrollment)
				.where(
					and(
						eq(hrBenefitEnrollment.organizationId, input.organizationId),
						eq(hrBenefitEnrollment.id, input.enrollmentId),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapBenefitEnrollment(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load benefit enrollment");
		}
	},

	async findBenefitEnrollmentByIdempotencyKey(input) {
		try {
			const rows = await db
				.select()
				.from(hrBenefitEnrollment)
				.where(
					and(
						eq(hrBenefitEnrollment.organizationId, input.organizationId),
						eq(hrBenefitEnrollment.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const row = rows[0];
			if (!row) return ok(null);
			return mapBenefitEnrollment(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find benefit enrollment by idempotency key",
			);
		}
	},

	async enrolBenefit(record, ports, meta) {
		const existing = await this.findBenefitEnrollmentByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) return existing;
		if (existing.data !== null) {
			if (existing.data.fingerprint === record.createRequestFingerprint) {
				return ok(existing.data);
			}
			return conflict("Idempotency key already used with different data");
		}

		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) return employee;
		if (employee.data === null) {
			return fail(
				"NOT_FOUND",
				"Employee not found or cross-org reference",
				{ code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE },
			);
		}

		const plan = await this.getBenefitPlan({
			organizationId: record.organizationId,
			planId: record.planId,
		});
		if (!plan.ok) return plan;
		if (plan.data === null) {
			return fail(
				"NOT_FOUND",
				"Benefit plan not found or cross-org reference",
				{ code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE },
			);
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesBenefitEnrollmentId(id);
		if (!brandedId.ok) return brandedId;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_benefit_enrollment",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[BenefitEnrollmentSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH active_check AS (
							SELECT 1 AS exists
							FROM hr_benefit_enrollment
							WHERE organization_id = ${record.organizationId}
								AND employee_id = ${record.employeeId}
								AND plan_id = ${record.planId}
								AND status = 'active'
							LIMIT 1
						),
						mutated AS (
							INSERT INTO hr_benefit_enrollment (
								id, organization_id, employee_id, employment_id, plan_id, effective_from,
								effective_to, status, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, ${record.employeeId},
								${record.employmentId}, ${record.planId}, ${record.effectiveFrom}, NULL,
								'active', ${record.createIdempotencyKey}, ${record.createRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							WHERE NOT EXISTS (SELECT 1 FROM active_check)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes
							)
							SELECT
								${auditId}, organization_id, created_by, ${meta.correlationId},
								'human-resources', 'hr_benefit_enrollment', id, 'CREATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT},
								'human-resources', ${meta.correlationId}, created_by,
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
				return conflict(
					"Employee already has an active enrollment for this plan",
				);
			}
			return mapBenefitEnrollmentSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findBenefitEnrollmentByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) return replay;
				if (replay.data !== null) {
					if (replay.data.fingerprint === record.createRequestFingerprint) {
						return ok(replay.data);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(error, "Failed to enrol benefit");
		}
	},

	async endBenefitEnrollment(input, ports, meta) {
		const existing = await this.getBenefitEnrollment({
			organizationId: input.organizationId,
			enrollmentId: input.enrollmentId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Benefit enrollment not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		if (existing.data.status !== "active") {
			return invalidState("Benefit enrollment is not active");
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_benefit_enrollment",
			entityId: input.enrollmentId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[BenefitEnrollmentSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_benefit_enrollment
							SET status = 'ended',
								effective_to = ${input.endsOn},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.enrollmentId}
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
								'human-resources', 'hr_benefit_enrollment', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT},
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
					entityLabel: "Benefit enrollment",
				});
			}
			return mapBenefitEnrollmentSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to end benefit enrollment");
		}
	},

	async cancelBenefitEnrollment(input, ports, meta) {
		const existing = await this.getBenefitEnrollment({
			organizationId: input.organizationId,
			enrollmentId: input.enrollmentId,
		});
		if (!existing.ok) return existing;
		if (existing.data === null) {
			return notFound("Benefit enrollment not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) return versionCheck;
		if (existing.data.status !== "active") {
			return invalidState("Benefit enrollment is not active");
		}

		const nextVersion = input.expectedVersion + 1;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: input.organizationId,
			entityType: "hr_benefit_enrollment",
			entityId: input.enrollmentId,
			actorId: input.actorUserId,
			correlationId: meta.correlationId,
		});

		try {
			const [rows] = await runNeonHttpTransaction<[BenefitEnrollmentSqlRow[]]>(
				(sqlTag) => [
					sqlTag`
						WITH mutated AS (
							UPDATE hr_benefit_enrollment
							SET status = 'cancelled',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.enrollmentId}
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
								'human-resources', 'hr_benefit_enrollment', id, 'UPDATE', '[]'::jsonb
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
							)
							SELECT
								${eventId}, organization_id, ${HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT},
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
					entityLabel: "Benefit enrollment",
				});
			}
			return mapBenefitEnrollmentSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to cancel benefit enrollment",
			);
		}
	},

	async listBenefitEnrollmentsByEmployee(input) {
		try {
			const allRows = await db
				.select()
				.from(hrBenefitEnrollment)
				.where(
					and(
						eq(hrBenefitEnrollment.organizationId, input.organizationId),
						eq(hrBenefitEnrollment.employeeId, input.employeeId),
					),
				)
				.orderBy(desc(hrBenefitEnrollment.effectiveFrom));
			const enrollments: BenefitEnrollment[] = [];
			for (const row of allRows) {
				const mapped = mapBenefitEnrollment(row);
				if (!mapped.ok) return mapped;
				enrollments.push(mapped.data);
			}
			const totalCount = enrollments.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = enrollments.slice(offset, offset + input.pageSize);
			return ok({
				enrollments: paginated,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list benefit enrollments",
			);
		}
	},

	async getApprovedCompensationHandoff(input) {
		const employee = await this.getEmployeeById({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!employee.ok) return employee;
		if (employee.data === null) {
			return fail(
				"NOT_FOUND",
				"Employee not found or cross-org reference",
				{ code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE },
			);
		}

		try {
			const employmentRows = await db
				.select()
				.from(hrEmployment)
				.where(
					and(
						eq(hrEmployment.organizationId, input.organizationId),
						eq(hrEmployment.employeeId, input.employeeId),
						eq(hrEmployment.status, "active"),
					),
				)
				.limit(1);
			const activeEmployment = employmentRows[0] ?? null;

			let activeCompensation: EmployeeCompensation | null = null;
			if (activeEmployment) {
				const compRows = await db
					.select()
					.from(hrEmployeeCompensation)
					.where(
						and(
							eq(hrEmployeeCompensation.organizationId, input.organizationId),
							eq(hrEmployeeCompensation.employmentId, activeEmployment.id),
							eq(hrEmployeeCompensation.status, "active"),
						),
					)
					.limit(1);
				if (compRows[0]) {
					const mapped = mapEmployeeCompensation(compRows[0]);
					if (!mapped.ok) return mapped;
					activeCompensation = mapped.data;
				}
			}

			const enrollmentRows = await db
				.select()
				.from(hrBenefitEnrollment)
				.where(
					and(
						eq(hrBenefitEnrollment.organizationId, input.organizationId),
						eq(hrBenefitEnrollment.employeeId, input.employeeId),
						eq(hrBenefitEnrollment.status, "active"),
					),
				);
			const activeBenefitEnrollments: BenefitEnrollment[] = [];
			for (const row of enrollmentRows) {
				const mapped = mapBenefitEnrollment(row);
				if (!mapped.ok) return mapped;
				activeBenefitEnrollments.push(mapped.data);
			}

			const handoff: ApprovedCompensationHandoff = {
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				activeCompensation,
				activeBenefitEnrollments,
			};

			if (!activeCompensation) {
				return ok(null);
			}

			return ok(handoff);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get approved compensation handoff",
			);
		}
	},
};

export function attachDrizzleCompensation(target: CompensationHost): void {
	Object.assign(target, drizzleCompensationMethods);
}

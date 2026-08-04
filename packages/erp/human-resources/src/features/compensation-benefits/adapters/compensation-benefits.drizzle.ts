import { randomUUID } from "node:crypto";

import {
	audit as afendaAudit,
	type PreparedDerivedEntityAuditInsertValues,
	type PreparedTransactionalAuditInsertValues,
} from "@afenda/audit";
import {
	database as afendaDatabase,
	and,
	desc,
	eq,
	hrBenefitEnrollment,
	hrBenefitPlan,
	hrCompensationGrade,
	hrCompensationGradeProgressionRule,
	hrCompensationProposal,
	hrCompensationReview,
	hrEmployeeCompensation,
	hrSalaryBand,
	or,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";
import {
	HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
} from "@afenda/events/schemas";
import type { HumanResourcesStore } from "../../../composition/store/index";
import type {
	ApprovedCompensationHandoff,
	BenefitEnrollment,
	BenefitPlan,
	CompensationGrade,
	CompensationGradeProgressionRule,
	CompensationProposal,
	CompensationReview,
	EmployeeCompensation,
	SalaryBand,
} from "../../../kernel/contracts";
import type { HumanResourcesMutationMeta } from "../../../kernel/emissions/mutation-meta";
import { planCommandMutationOutboxEventType } from "../../../kernel/emissions/sql-side-effects";
import { assertExpectedVersion } from "../../../kernel/execution/concurrency";
import {
	conflict,
	invalidInput,
	invalidState,
	missAfterOptimisticUpdate,
	notFound,
} from "../../../kernel/execution/domain-guards";
import { HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE } from "../../../kernel/execution/error-codes";
import {
	isCreateIdempotencyUniqueViolation,
	isPostgresUniqueViolation,
	mapPersistenceFailure,
} from "../../../kernel/execution/persistence-errors";
import {
	parseHumanResourcesApplicationId,
	parseHumanResourcesBenefitEnrollmentId,
	parseHumanResourcesBenefitPlanId,
	parseHumanResourcesCompensationGradeId,
	parseHumanResourcesCompensationGradeProgressionRuleId,
	parseHumanResourcesCompensationProposalId,
	parseHumanResourcesCompensationReviewCycleId,
	parseHumanResourcesCompensationReviewId,
	parseHumanResourcesEmployeeCompensationId,
	parseHumanResourcesEmployeeId,
	parseHumanResourcesEmploymentId,
	parseHumanResourcesSalaryBandId,
} from "../../../kernel/identity/brands";
import type { HumanResourcesCommandId } from "../../../kernel/operations/module-ids";
import { previousIsoDate } from "../../../kernel/temporal/effective-dates";
import { selectUniqueEffectiveRangeRecord } from "../../../kernel/temporal/effective-range";
import {
	assertBenefitContributionFacts,
	assertEffectiveRange,
} from "../benefit-guards";
import {
	isEmployeeCompensationAsOfEligible,
	isEmployeeCompensationCancellable,
} from "../employee-compensation-lifecycle";
import { compareMoneyOrder } from "../money";
import {
	assertCompensationProposalAmendable,
	assertCompensationProposalStatusTransition,
} from "../proposal-guards";
import { assertCompensationReviewBudgetForMutation } from "../review-budget-loader";
import {
	assertCanFinalizeCompensationReview,
	assertCanRecordCompensationRecommendation,
	assertReviewCycleOpenForMutation,
} from "../review-guards";
import {
	benefitEnrollmentStatusSchema,
	benefitPlanStatusSchema,
	compensationGradeProgressionRuleStatusSchema,
	compensationGradeStatusSchema,
	compensationProposalStatusSchema,
	compensationReviewStatusSchema,
	employeeCompensationStatusSchema,
	isBenefitEnrollmentActive,
	isBenefitEnrollmentOpen,
	isCompensationGradeActive,
	isCompensationReviewFinalized,
	isSalaryBandActive,
	payFrequencySchema,
	salaryBandStatusSchema,
} from "../status";
import {
	assertDrizzleBenefitEnrollmentPreconditions,
	drizzleAddBenefitEnrollmentDependent,
	drizzleEndBenefitEnrollmentDependent,
	drizzleGetBenefitEnrollmentDependent,
	drizzleGetBenefitPlanEligibility,
	drizzleListBenefitEnrollmentDependentsByEnrollment,
	drizzleSetBenefitPlanEligibility,
	drizzleWaiveBenefit,
	mapBenefitEnrollmentFromDbRow,
	mapBenefitEnrollmentSql,
} from "./benefit-methods-drizzle.drizzle";
import { drizzleCompensationReviewCycleMethods } from "./compensation-review-cycle-drizzle.drizzle";
import {
	drizzleActivateEmployeeCompensation,
	drizzleAmendEmployeeCompensation,
	drizzleApproveEmployeeCompensation,
	drizzleCorrectEmployeeCompensation,
	drizzleScheduleEmployeeCompensationChange,
} from "./employee-compensation-lifecycle-drizzle.drizzle";

const COMPENSATION_BENEFITS_AUDIT_SOURCE =
	"human-resources.compensation-benefits-drizzle";

type CompensationBenefitsAuditEntity =
	| "hr_benefit_enrollment"
	| "hr_benefit_plan"
	| "hr_compensation_grade"
	| "hr_compensation_grade_progression_rule"
	| "hr_compensation_proposal"
	| "hr_compensation_review"
	| "hr_employee_compensation"
	| "hr_salary_band";

interface CompensationBenefitsAuditInput {
	action: "CREATE" | "UPDATE";
	actorUserId: string;
	correlationId: string;
	entity: CompensationBenefitsAuditEntity;
	entityId: string;
	meta: HumanResourcesMutationMeta;
	newValue?: Record<string, unknown> | null;
	oldValue?: Record<string, unknown> | null;
	organizationId: string;
	reasonCode: string;
}

function compensationBenefitsAuditEventContext(input: {
	correlationId: string;
	meta: HumanResourcesMutationMeta;
	reasonCode: string;
}) {
	return {
		version: 1 as const,
		outcome: "SUCCEEDED" as const,
		source: COMPENSATION_BENEFITS_AUDIT_SOURCE,
		causationId:
			input.meta.causationId ??
			input.meta.idempotencyKey ??
			input.correlationId,
		reasonCode: input.reasonCode,
	};
}

function prepareCompensationBenefitsAudit(
	input: CompensationBenefitsAuditInput,
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
		eventContext: compensationBenefitsAuditEventContext(input),
	});
}

function prepareDerivedCompensationBenefitsAudit(input: {
	actorUserId: string;
	correlationId: string;
	meta: HumanResourcesMutationMeta;
	newValue: Record<string, unknown>;
	oldValue: Record<string, unknown>;
	organizationId: string;
	reasonCode: string;
}): Result<PreparedDerivedEntityAuditInsertValues> {
	return afendaAudit.transaction.prepareDerived({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		module: "human-resources",
		entity: "hr_employee_compensation",
		action: "UPDATE",
		oldValue: input.oldValue,
		newValue: input.newValue,
		eventContext: compensationBenefitsAuditEventContext(input),
	});
}

type ReviewBudgetHost = Pick<
	HumanResourcesStore,
	"findActiveEmployeeCompensationByEmployment"
>;

async function assertDrizzleReviewCycleOpen(
	organizationId: string,
	cycleId: CompensationReview["cycleId"],
): Promise<Result<true>> {
	const cycle =
		await drizzleCompensationReviewCycleMethods.getCompensationReviewCycle({
			organizationId,
			cycleId,
		});
	if (!cycle.ok) {
		return cycle;
	}
	if (cycle.data === null) {
		return notFound("Compensation review cycle not found");
	}
	const open = assertReviewCycleOpenForMutation(cycle.data.status);
	if (!open.ok) {
		return open;
	}
	return errorResult.ok(true);
}

async function assertDrizzleReviewBudget(
	host: ReviewBudgetHost,
	organizationId: string,
	review: CompensationReview,
): Promise<Result<true>> {
	return await assertCompensationReviewBudgetForMutation(
		{
			getCycle: () =>
				drizzleCompensationReviewCycleMethods.getCompensationReviewCycle({
					organizationId,
					cycleId: review.cycleId,
				}),
			listCycleReviews: () =>
				drizzleCompensationReviewCycleMethods.listCompensationReviewsByCycle({
					organizationId,
					cycleId: review.cycleId,
				}),
			getActiveBaseAmount: async (employmentId) => {
				const active = await host.findActiveEmployeeCompensationByEmployment({
					organizationId,
					employmentId,
				});
				if (!active.ok) {
					return active;
				}
				return errorResult.ok(active.data?.baseAmount ?? null);
			},
		},
		review,
	);
}

function eventPayloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

function planCompensationDrizzleOutbox(input: {
	commandId: HumanResourcesCommandId;
	meta: HumanResourcesMutationMeta;
	organizationId: string;
	actorUserId: string;
	aggregateId: string;
	entityType: string;
	auditAction: "CREATE" | "UPDATE";
}):
	| {
			eventType: NonNullable<
				ReturnType<typeof planCommandMutationOutboxEventType>
			>;
			payloadJson: string;
	  }
	| undefined {
	const eventType = planCommandMutationOutboxEventType({
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

interface CompensationBenefitsHost {
	getApplicationById: HumanResourcesStore["getApplicationById"];
	getEmployeeById: HumanResourcesStore["getEmployeeById"];
	getEmploymentById: HumanResourcesStore["getEmploymentById"];
}

export type DrizzleCompensationBenefitsMethods = Pick<
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
	| "findSalaryBandByGradeAndCurrencyAsOf"
	| "getCompensationGradeProgressionRule"
	| "createCompensationGradeProgressionRule"
	| "archiveCompensationGradeProgressionRule"
	| "listCompensationGradeProgressionRulesFromGrade"
	| "listEligibleProgressionTargets"
	| "getEmployeeCompensation"
	| "findEmployeeCompensationByIdempotencyKey"
	| "createEmployeeCompensation"
	| "amendEmployeeCompensation"
	| "approveEmployeeCompensation"
	| "scheduleEmployeeCompensationChange"
	| "activateEmployeeCompensation"
	| "correctEmployeeCompensation"
	| "endEmployeeCompensation"
	| "listEmployeeCompensationsByEmployee"
	| "findActiveEmployeeCompensationByEmployment"
	| "findEmployeeCompensationByEmploymentAsOf"
	| "getCompensationReviewCycle"
	| "findCompensationReviewCycleByIdempotencyKey"
	| "createCompensationReviewCycle"
	| "openCompensationReviewCycle"
	| "closeCompensationReviewCycle"
	| "cancelCompensationReviewCycle"
	| "listCompensationReviewCycles"
	| "listCompensationReviewsByCycle"
	| "getCompensationReview"
	| "findCompensationReviewByIdempotencyKey"
	| "createCompensationReviewDraft"
	| "recordCompensationRecommendation"
	| "finalizeCompensationReview"
	| "applyApprovedCompensationResult"
	| "listCompensationReviewsByEmployee"
	| "getCompensationProposal"
	| "createCompensationProposal"
	| "amendCompensationProposal"
	| "approveCompensationProposal"
	| "listCompensationProposals"
	| "getBenefitPlan"
	| "findBenefitPlanByCode"
	| "createBenefitPlan"
	| "updateBenefitPlan"
	| "archiveBenefitPlan"
	| "listBenefitPlans"
	| "getBenefitPlanEligibility"
	| "setBenefitPlanEligibility"
	| "getBenefitEnrollment"
	| "findBenefitEnrollmentByIdempotencyKey"
	| "enrolBenefit"
	| "waiveBenefit"
	| "endBenefitEnrollment"
	| "cancelBenefitEnrollment"
	| "listBenefitEnrollmentsByEmployee"
	| "getBenefitEnrollmentDependent"
	| "listBenefitEnrollmentDependentsByEnrollment"
	| "addBenefitEnrollmentDependent"
	| "endBenefitEnrollmentDependent"
	| "getApprovedCompensationHandoff"
>;

interface CompensationGradeSqlRow {
	code: string;
	created_at: Date;
	created_by: string;
	id: string;
	name: string;
	organization_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface SalaryBandSqlRow {
	created_at: Date;
	created_by: string;
	currency_code: string;
	effective_from: string;
	effective_to: string | null;
	grade_id: string;
	id: string;
	maximum_amount: string;
	midpoint_amount: string;
	minimum_amount: string;
	organization_id: string;
	status: string;
	supersedes_salary_band_id: string | null;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface CompensationGradeProgressionRuleSqlRow {
	created_at: Date;
	created_by: string;
	effective_from: string;
	effective_to: string | null;
	from_grade_id: string;
	id: string;
	min_months_in_grade: number | null;
	organization_id: string;
	status: string;
	to_grade_id: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

export interface EmployeeCompensationSqlRow {
	approved_at: Date | null;
	approved_by: string | null;
	base_amount: string;
	confidential_note: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	currency_code: string;
	effective_from: string;
	effective_to: string | null;
	employee_id: string;
	employment_id: string;
	grade_id: string | null;
	id: string;
	organization_id: string;
	pay_frequency: string;
	reason: string;
	salary_band_id: string | null;
	source_review_id: string | null;
	status: string;
	supersedes_compensation_id: string | null;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface CompensationReviewSqlRow {
	applied_compensation_id: string | null;
	create_idempotency_key: string;
	create_request_fingerprint: string;
	created_at: Date;
	created_by: string;
	cycle_id: string;
	effective_from: string | null;
	employee_id: string;
	employment_id: string;
	finalized_at: Date | null;
	id: string;
	organization_id: string;
	proposed_base_amount: string | null;
	proposed_currency_code: string | null;
	proposed_grade_id: string | null;
	proposed_salary_band_id: string | null;
	recommendation_note: string | null;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface CompensationProposalSqlRow {
	application_id: string;
	confidential_note: string | null;
	created_at: Date;
	created_by: string;
	id: string;
	organization_id: string;
	proposed_base_amount: string | null;
	proposed_currency_code: string | null;
	proposed_grade_id: string | null;
	proposed_salary_band_id: string | null;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

interface BenefitPlanSqlRow {
	code: string;
	created_at: Date;
	created_by: string;
	eligibility_note: string | null;
	id: string;
	name: string;
	organization_id: string;
	status: string;
	updated_at: Date;
	updated_by: string;
	version: number;
}

function mapCompensationGrade(
	row: typeof hrCompensationGrade.$inferSelect,
): Result<CompensationGrade> {
	const id = parseHumanResourcesCompensationGradeId(row.id);
	if (!id.ok) {
		return id;
	}
	const status = compensationGradeStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
	if (!id.ok) {
		return id;
	}
	const gradeId = parseHumanResourcesCompensationGradeId(row.gradeId);
	if (!gradeId.ok) {
		return gradeId;
	}
	const status = salaryBandStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	let supersedesSalaryBandId = null as SalaryBand["supersedesSalaryBandId"];
	if (
		row.supersedesSalaryBandId !== null &&
		row.supersedesSalaryBandId !== undefined
	) {
		const parsed = parseHumanResourcesSalaryBandId(row.supersedesSalaryBandId);
		if (!parsed.ok) {
			return parsed;
		}
		supersedesSalaryBandId = parsed.data;
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		gradeId: gradeId.data,
		currencyCode: row.currencyCode,
		minAmount: row.minimumAmount,
		midAmount: row.midpointAmount,
		maxAmount: row.maximumAmount,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		supersedesSalaryBandId,
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
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	let gradeId = null as EmployeeCompensation["gradeId"];
	if (row.gradeId !== null) {
		const parsed = parseHumanResourcesCompensationGradeId(row.gradeId);
		if (!parsed.ok) {
			return parsed;
		}
		gradeId = parsed.data;
	}
	let salaryBandId = null as EmployeeCompensation["salaryBandId"];
	if (row.salaryBandId !== null) {
		const parsed = parseHumanResourcesSalaryBandId(row.salaryBandId);
		if (!parsed.ok) {
			return parsed;
		}
		salaryBandId = parsed.data;
	}
	let sourceReviewId = null as EmployeeCompensation["sourceReviewId"];
	if (row.sourceReviewId !== null) {
		const parsed = parseHumanResourcesCompensationReviewId(row.sourceReviewId);
		if (!parsed.ok) {
			return parsed;
		}
		sourceReviewId = parsed.data;
	}
	let supersedesCompensationId =
		null as EmployeeCompensation["supersedesCompensationId"];
	if (row.supersedesCompensationId !== null) {
		const parsed = parseHumanResourcesEmployeeCompensationId(
			row.supersedesCompensationId,
		);
		if (!parsed.ok) {
			return parsed;
		}
		supersedesCompensationId = parsed.data;
	}
	const payFrequency = payFrequencySchema.safeParse(row.payFrequency);
	if (!payFrequency.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	const status = employeeCompensationStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		employeeId: employeeId.data,
		employmentId: employmentId.data,
		gradeId,
		salaryBandId,
		baseAmount: row.baseAmount,
		currencyCode: row.currencyCode,
		payFrequency: payFrequency.data,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		reason: row.reason,
		status: status.data,
		confidentialNote: row.confidentialNote,
		supersedesCompensationId,
		approvedAt: row.approvedAt,
		approvedBy: row.approvedBy,
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

export function mapCompensationReviewFromDbRow(
	row: typeof hrCompensationReview.$inferSelect,
): Result<CompensationReview> {
	const id = parseHumanResourcesCompensationReviewId(row.id);
	if (!id.ok) {
		return id;
	}
	const employeeId = parseHumanResourcesEmployeeId(row.employeeId);
	if (!employeeId.ok) {
		return employeeId;
	}
	const employmentId = parseHumanResourcesEmploymentId(row.employmentId);
	if (!employmentId.ok) {
		return employmentId;
	}
	const cycleId = parseHumanResourcesCompensationReviewCycleId(row.cycleId);
	if (!cycleId.ok) {
		return cycleId;
	}
	let proposedGradeId = null as CompensationReview["proposedGradeId"];
	if (row.proposedGradeId !== null) {
		const parsed = parseHumanResourcesCompensationGradeId(row.proposedGradeId);
		if (!parsed.ok) {
			return parsed;
		}
		proposedGradeId = parsed.data;
	}
	let proposedSalaryBandId = null as CompensationReview["proposedSalaryBandId"];
	if (row.proposedSalaryBandId !== null) {
		const parsed = parseHumanResourcesSalaryBandId(row.proposedSalaryBandId);
		if (!parsed.ok) {
			return parsed;
		}
		proposedSalaryBandId = parsed.data;
	}
	let appliedCompensationId =
		null as CompensationReview["appliedCompensationId"];
	if (row.appliedCompensationId !== null) {
		const parsed = parseHumanResourcesEmployeeCompensationId(
			row.appliedCompensationId,
		);
		if (!parsed.ok) {
			return parsed;
		}
		appliedCompensationId = parsed.data;
	}
	const status = compensationReviewStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		cycleId: cycleId.data,
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
	if (!id.ok) {
		return id;
	}
	const status = benefitPlanStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
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
		supersedesSalaryBandId: row.supersedes_salary_band_id,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

function mapCompensationGradeProgressionRule(
	row: typeof hrCompensationGradeProgressionRule.$inferSelect,
): Result<CompensationGradeProgressionRule> {
	const id = parseHumanResourcesCompensationGradeProgressionRuleId(row.id);
	if (!id.ok) {
		return id;
	}
	const fromGradeId = parseHumanResourcesCompensationGradeId(row.fromGradeId);
	if (!fromGradeId.ok) {
		return fromGradeId;
	}
	const toGradeId = parseHumanResourcesCompensationGradeId(row.toGradeId);
	if (!toGradeId.ok) {
		return toGradeId;
	}
	const status = compensationGradeProgressionRuleStatusSchema.safeParse(
		row.status,
	);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		fromGradeId: fromGradeId.data,
		toGradeId: toGradeId.data,
		effectiveFrom: row.effectiveFrom,
		effectiveTo: row.effectiveTo,
		minMonthsInGrade: row.minMonthsInGrade,
		status: status.data,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapCompensationGradeProgressionRuleSql(
	row: CompensationGradeProgressionRuleSqlRow,
): Result<CompensationGradeProgressionRule> {
	return mapCompensationGradeProgressionRule({
		id: row.id,
		organizationId: row.organization_id,
		fromGradeId: row.from_grade_id,
		toGradeId: row.to_grade_id,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		minMonthsInGrade: row.min_months_in_grade,
		status: row.status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	});
}

export function mapEmployeeCompensationSql(
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
		payFrequency: row.pay_frequency,
		effectiveFrom: row.effective_from,
		effectiveTo: row.effective_to,
		reason: row.reason,
		confidentialNote: row.confidential_note,
		supersedesCompensationId: row.supersedes_compensation_id,
		approvedAt: row.approved_at,
		approvedBy: row.approved_by,
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

function mapCompensationProposal(
	row: typeof hrCompensationProposal.$inferSelect,
): Result<CompensationProposal> {
	const id = parseHumanResourcesCompensationProposalId(row.id);
	if (!id.ok) {
		return id;
	}
	const applicationId = parseHumanResourcesApplicationId(row.applicationId);
	if (!applicationId.ok) {
		return applicationId;
	}
	let proposedGradeId = null as CompensationProposal["proposedGradeId"];
	if (row.proposedGradeId !== null) {
		const parsed = parseHumanResourcesCompensationGradeId(row.proposedGradeId);
		if (!parsed.ok) {
			return parsed;
		}
		proposedGradeId = parsed.data;
	}
	let proposedSalaryBandId =
		null as CompensationProposal["proposedSalaryBandId"];
	if (row.proposedSalaryBandId !== null) {
		const parsed = parseHumanResourcesSalaryBandId(row.proposedSalaryBandId);
		if (!parsed.ok) {
			return parsed;
		}
		proposedSalaryBandId = parsed.data;
	}
	const status = compensationProposalStatusSchema.safeParse(row.status);
	if (!status.success) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok({
		id: id.data,
		organizationId: row.organizationId,
		applicationId: applicationId.data,
		status: status.data,
		proposedBaseAmount: row.proposedBaseAmount,
		proposedCurrencyCode: row.proposedCurrencyCode,
		proposedGradeId,
		proposedSalaryBandId,
		confidentialNote: row.confidentialNote,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	});
}

function mapCompensationProposalSql(
	row: CompensationProposalSqlRow,
): Result<CompensationProposal> {
	return mapCompensationProposal({
		id: row.id,
		organizationId: row.organization_id,
		applicationId: row.application_id,
		status: row.status,
		proposedBaseAmount: row.proposed_base_amount,
		proposedCurrencyCode: row.proposed_currency_code,
		proposedGradeId: row.proposed_grade_id,
		proposedSalaryBandId: row.proposed_salary_band_id,
		confidentialNote: row.confidential_note,
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
	return mapCompensationReviewFromDbRow({
		id: row.id,
		organizationId: row.organization_id,
		cycleId: row.cycle_id,
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

export const drizzleCompensationBenefitsMethods: DrizzleCompensationBenefitsMethods &
	ThisType<CompensationBenefitsHost & DrizzleCompensationBenefitsMethods> = {
	...drizzleCompensationReviewCycleMethods,
	async getCompensationGrade(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrCompensationGrade)
				.where(
					and(
						eq(hrCompensationGrade.organizationId, input.organizationId),
						eq(hrCompensationGrade.id, input.gradeId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapCompensationGrade(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load compensation grade");
		}
	},

	async findCompensationGradeByCode(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrCompensationGrade)
				.where(
					and(
						eq(hrCompensationGrade.organizationId, input.organizationId),
						eq(hrCompensationGrade.code, input.code),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapCompensationGrade(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find compensation grade by code",
			);
		}
	},

	async createCompensationGrade(record, _ports, meta) {
		const existing = await this.findCompensationGradeByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return conflict("Compensation grade code already exists");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCompensationGradeId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_compensation_grade",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "COMPENSATION_GRADE_CREATED",
			newValue: { code: record.code, status: "active", version: 1 },
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to create compensation grade");
			}
			return mapCompensationGradeSql(row);
		} catch (error) {
			if (isPostgresUniqueViolation(error)) {
				return conflict("Compensation grade code already exists");
			}
			return mapPersistenceFailure(
				error,
				"Failed to create compensation grade",
			);
		}
	},

	async updateCompensationGrade(input, _ports, meta) {
		const existing = await this.getCompensationGrade({
			organizationId: input.organizationId,
			gradeId: input.gradeId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Compensation grade not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_compensation_grade",
			entityId: input.gradeId,
			action: "UPDATE",
			reasonCode: "COMPENSATION_GRADE_UPDATED",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: {
				status: existing.data.status,
				nameChanged: input.name !== undefined,
				version: nextVersion,
			},
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Compensation grade",
				});
			}
			return mapCompensationGradeSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to update compensation grade",
			);
		}
	},

	async archiveCompensationGrade(input, _ports, meta) {
		const existing = await this.getCompensationGrade({
			organizationId: input.organizationId,
			gradeId: input.gradeId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Compensation grade not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_compensation_grade",
			entityId: input.gradeId,
			action: "UPDATE",
			reasonCode: "COMPENSATION_GRADE_ARCHIVED",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: "archived", version: nextVersion },
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH active_bands AS (
							SELECT 1 AS exists
							FROM hr_salary_band AS salary_band
							WHERE salary_band.organization_id = ${input.organizationId}
								AND salary_band.grade_id = ${input.gradeId}
								AND salary_band.status = 'active'
							LIMIT 1
						),
						mutated AS (
							UPDATE hr_compensation_grade AS compensation_grade
							SET status = 'archived',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE compensation_grade.id = ${input.gradeId}
								AND compensation_grade.organization_id = ${input.organizationId}
								AND compensation_grade.version = ${input.expectedVersion}
								AND NOT EXISTS (SELECT 1 FROM active_bands)
							RETURNING compensation_grade.*
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				const bandRows = await afendaDatabase.client
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
			const allRows = await afendaDatabase.client
				.select()
				.from(hrCompensationGrade)
				.where(and(...conditions));
			const grades: CompensationGrade[] = [];
			for (const row of allRows) {
				const mapped = mapCompensationGrade(row);
				if (!mapped.ok) {
					return mapped;
				}
				grades.push(mapped.data);
			}
			grades.sort((a, b) => a.code.localeCompare(b.code));
			const totalCount = grades.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = grades.slice(offset, offset + input.pageSize);
			return errorResult.ok({
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrSalaryBand)
				.where(
					and(
						eq(hrSalaryBand.organizationId, input.organizationId),
						eq(hrSalaryBand.id, input.salaryBandId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapSalaryBand(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load salary band");
		}
	},

	async createSalaryBand(record, _ports, meta) {
		const grade = await this.getCompensationGrade({
			organizationId: record.organizationId,
			gradeId: record.gradeId,
		});
		if (!grade.ok) {
			return grade;
		}
		if (grade.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
				internalContext: {
					code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				},
			});
		}
		if (!isCompensationGradeActive(grade.data.status)) {
			return invalidState("Grade must be active");
		}

		const moneyCheck = compareMoneyOrder(
			record.minAmount,
			record.midAmount,
			record.maxAmount,
		);
		if (!moneyCheck.ok) {
			return moneyCheck;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesSalaryBandId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_salary_band",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "SALARY_BAND_CREATED",
			newValue: {
				gradeId: record.gradeId,
				currencyCode: record.currencyCode,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				status: "active",
				version: 1,
			},
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH overlapping AS (
							SELECT 1 AS exists
							FROM hr_salary_band
							WHERE organization_id = ${record.organizationId}
								AND grade_id = ${record.gradeId}
								AND currency_code = ${record.currencyCode}
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
								effective_from, effective_to, supersedes_salary_band_id, status, version,
								created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, ${record.gradeId},
								${record.currencyCode}, ${record.minAmount}, ${record.midAmount},
								${record.maxAmount}, ${record.effectiveFrom}, ${record.effectiveTo},
								NULL, 'active', 1, ${record.createdBy}, ${record.createdBy}
							WHERE NOT EXISTS (SELECT 1 FROM overlapping)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict(
					"Overlapping salary band exists for this grade and currency",
				);
			}
			return mapSalaryBandSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to create salary band");
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async supersedeSalaryBand(input, _ports, meta) {
		const grade = await this.getCompensationGrade({
			organizationId: input.organizationId,
			gradeId: input.gradeId,
		});
		if (!grade.ok) {
			return grade;
		}
		if (grade.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
				internalContext: {
					code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				},
			});
		}

		const moneyCheck = compareMoneyOrder(
			input.minAmount,
			input.midAmount,
			input.maxAmount,
		);
		if (!moneyCheck.ok) {
			return moneyCheck;
		}

		let predecessor: SalaryBand | null = null;
		if (input.supersededSalaryBandId) {
			const band = await this.getSalaryBand({
				organizationId: input.organizationId,
				salaryBandId: input.supersededSalaryBandId,
			});
			if (!band.ok) {
				return band;
			}
			if (band.data === null) {
				return notFound(
					"Salary band not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			predecessor = band.data;
		} else {
			try {
				const rows = await afendaDatabase.client
					.select()
					.from(hrSalaryBand)
					.where(
						and(
							eq(hrSalaryBand.organizationId, input.organizationId),
							eq(hrSalaryBand.gradeId, input.gradeId),
							eq(hrSalaryBand.currencyCode, input.currencyCode),
							eq(hrSalaryBand.status, "active"),
						),
					);
				if (rows.length === 0) {
					return notFound("No active salary band to supersede");
				}
				if (rows.length > 1) {
					return conflict(
						"Ambiguous active salary band for grade and currency",
					);
				}
				const [activeRow] = rows;
				if (!activeRow) {
					return notFound("No active salary band to supersede");
				}
				const mapped = mapSalaryBand(activeRow);
				if (!mapped.ok) {
					return mapped;
				}
				predecessor = mapped.data;
			} catch (error) {
				return mapPersistenceFailure(error, "Failed to resolve salary band");
			}
		}

		if (!(predecessor && isSalaryBandActive(predecessor.status))) {
			return invalidState("Only active salary bands can be superseded");
		}
		if (
			predecessor.gradeId !== input.gradeId ||
			predecessor.currencyCode !== input.currencyCode
		) {
			return invalidInput(
				"Predecessor salary band grade or currency does not match input",
			);
		}
		if (input.effectiveFrom <= predecessor.effectiveFrom) {
			return invalidInput(
				"Successor effectiveFrom must be after predecessor effectiveFrom",
			);
		}

		const predecessorEffectiveTo = previousIsoDate(input.effectiveFrom);
		const id = randomUUID();
		const brandedId = parseHumanResourcesSalaryBandId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const nextPredecessorVersion = predecessor.version + 1;
		const preparedPredecessorAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_salary_band",
			entityId: predecessor.id,
			action: "UPDATE",
			reasonCode: "SALARY_BAND_SUPERSEDED",
			oldValue: {
				status: predecessor.status,
				effectiveTo: predecessor.effectiveTo,
				version: predecessor.version,
			},
			newValue: {
				status: "superseded",
				effectiveTo: predecessorEffectiveTo,
				version: nextPredecessorVersion,
			},
		});
		if (!preparedPredecessorAudit.ok) {
			return preparedPredecessorAudit;
		}
		const predecessorAudit = preparedPredecessorAudit.data;
		const preparedSuccessorAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_salary_band",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "SALARY_BAND_SUCCESSOR_CREATED",
			newValue: {
				gradeId: input.gradeId,
				currencyCode: input.currencyCode,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				supersedesSalaryBandId: predecessor.id,
				status: "active",
				version: 1,
			},
		});
		if (!preparedSuccessorAudit.ok) {
			return preparedSuccessorAudit;
		}
		const successorAudit = preparedSuccessorAudit.data;
		const auditPredecessorId = randomUUID();
		const auditSuccessorId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
					WITH superseded AS (
						UPDATE hr_salary_band
						SET status = 'superseded',
							effective_to = ${predecessorEffectiveTo},
							version = ${nextPredecessorVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE organization_id = ${input.organizationId}
							AND id = ${predecessor.id}
							AND status = 'active'
							AND version = ${predecessor.version}
						RETURNING *, 'superseded'::text AS row_kind
					),
					successor AS (
						INSERT INTO hr_salary_band (
							id, organization_id, grade_id, currency_code,
							minimum_amount, midpoint_amount, maximum_amount,
							effective_from, effective_to, supersedes_salary_band_id, status, version,
							created_by, updated_by
						)
						SELECT
							${brandedId.data}, ${input.organizationId}, ${input.gradeId},
							${input.currencyCode}, ${input.minAmount}, ${input.midAmount},
							${input.maxAmount}, ${input.effectiveFrom}, ${input.effectiveTo},
							${predecessor.id}, 'active', 1, ${input.actorUserId}, ${input.actorUserId}
						WHERE EXISTS (SELECT 1 FROM superseded)
						RETURNING *, 'successor'::text AS row_kind
					),
					audit_superseded AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditPredecessorId}, ${predecessorAudit.organizationId},
							${predecessorAudit.actorUserId}, ${predecessorAudit.correlationId},
							${predecessorAudit.module}, ${predecessorAudit.entity},
							${predecessorAudit.entityId}, ${predecessorAudit.action},
							${predecessorAudit.changesJson}::jsonb,
							${predecessorAudit.oldValueJson}::jsonb,
							${predecessorAudit.newValueJson}::jsonb,
							${predecessorAudit.metadataJson}::jsonb,
							${predecessorAudit.ipAddress}, ${predecessorAudit.userAgent}
						FROM superseded
						RETURNING id
					),
					audit_successor AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
						)
						SELECT
							${auditSuccessorId}, ${successorAudit.organizationId},
							${successorAudit.actorUserId}, ${successorAudit.correlationId},
							${successorAudit.module}, ${successorAudit.entity},
							${successorAudit.entityId}, ${successorAudit.action},
							${successorAudit.changesJson}::jsonb,
							${successorAudit.oldValueJson}::jsonb,
							${successorAudit.newValueJson}::jsonb,
							${successorAudit.metadataJson}::jsonb,
							${successorAudit.ipAddress}, ${successorAudit.userAgent}
						FROM successor
						RETURNING id
					)
					SELECT superseded.* FROM superseded, audit_superseded
					UNION ALL
					SELECT successor.* FROM successor, audit_successor
				`,
			]);

			const supersededSql = rows.find(
				(row: SalaryBandSqlRow & { row_kind: string }) =>
					row.row_kind === "superseded",
			);
			const successorSql = rows.find(
				(row: SalaryBandSqlRow & { row_kind: string }) =>
					row.row_kind === "successor",
			);
			if (supersededSql === undefined || successorSql === undefined) {
				return conflict("Unable to supersede salary band");
			}

			const superseded = mapSalaryBandSql(supersededSql);
			if (!superseded.ok) {
				return superseded;
			}
			const successor = mapSalaryBandSql(successorSql);
			if (!successor.ok) {
				return successor;
			}

			return errorResult.ok({
				superseded: superseded.data,
				successor: successor.data,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to supersede salary band");
		}
	},

	async archiveSalaryBand(input, _ports, meta) {
		const existing = await this.getSalaryBand({
			organizationId: input.organizationId,
			salaryBandId: input.salaryBandId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Salary band not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_salary_band",
			entityId: input.salaryBandId,
			action: "UPDATE",
			reasonCode: "SALARY_BAND_ARCHIVED",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: "archived", version: nextVersion },
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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
		if (!grade.ok) {
			return grade;
		}
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
			const allRows = await afendaDatabase.client
				.select()
				.from(hrSalaryBand)
				.where(and(...conditions))
				.orderBy(desc(hrSalaryBand.effectiveFrom));
			const bands: SalaryBand[] = [];
			for (const row of allRows) {
				const mapped = mapSalaryBand(row);
				if (!mapped.ok) {
					return mapped;
				}
				bands.push(mapped.data);
			}
			const totalCount = bands.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = bands.slice(offset, offset + input.pageSize);
			return errorResult.ok({
				bands: paginated,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list salary bands");
		}
	},

	async findSalaryBandByGradeAndCurrencyAsOf(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrSalaryBand)
				.where(
					and(
						eq(hrSalaryBand.organizationId, input.organizationId),
						eq(hrSalaryBand.gradeId, input.gradeId),
						eq(hrSalaryBand.currencyCode, input.currencyCode),
						or(
							eq(hrSalaryBand.status, "active"),
							eq(hrSalaryBand.status, "superseded"),
						),
					),
				);
			const records: SalaryBand[] = [];
			for (const row of rows) {
				const mapped = mapSalaryBand(row);
				if (!mapped.ok) {
					return mapped;
				}
				records.push(mapped.data);
			}
			const selected = selectUniqueEffectiveRangeRecord({
				records,
				asOf: input.asOf,
			});
			return errorResult.ok(selected);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to resolve salary band as of",
			);
		}
	},

	async getCompensationGradeProgressionRule(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrCompensationGradeProgressionRule)
				.where(
					and(
						eq(
							hrCompensationGradeProgressionRule.organizationId,
							input.organizationId,
						),
						eq(hrCompensationGradeProgressionRule.id, input.progressionRuleId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapCompensationGradeProgressionRule(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load progression rule");
		}
	},

	async createCompensationGradeProgressionRule(record, _ports, meta) {
		if (record.fromGradeId === record.toGradeId) {
			return invalidInput("fromGradeId and toGradeId must differ");
		}

		const fromGrade = await this.getCompensationGrade({
			organizationId: record.organizationId,
			gradeId: record.fromGradeId,
		});
		if (!fromGrade.ok) {
			return fromGrade;
		}
		if (fromGrade.data === null) {
			return notFound("From compensation grade not found");
		}
		const toGrade = await this.getCompensationGrade({
			organizationId: record.organizationId,
			gradeId: record.toGradeId,
		});
		if (!toGrade.ok) {
			return toGrade;
		}
		if (toGrade.data === null) {
			return notFound("To compensation grade not found");
		}
		if (
			!(
				isCompensationGradeActive(fromGrade.data.status) &&
				isCompensationGradeActive(toGrade.data.status)
			)
		) {
			return invalidState("Grades must be active");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCompensationGradeProgressionRuleId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_compensation_grade_progression_rule",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "COMPENSATION_PROGRESSION_RULE_CREATED",
			newValue: {
				fromGradeId: record.fromGradeId,
				toGradeId: record.toGradeId,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				minMonthsInGrade: record.minMonthsInGrade,
				status: "active",
				version: 1,
			},
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
					WITH overlapping AS (
						SELECT 1 AS exists
						FROM hr_compensation_grade_progression_rule
						WHERE organization_id = ${record.organizationId}
							AND from_grade_id = ${record.fromGradeId}
							AND to_grade_id = ${record.toGradeId}
							AND status = 'active'
							AND (
								(${record.effectiveFrom}::date <= COALESCE(effective_to::date, '9999-12-31'::date))
								AND (effective_from::date <= COALESCE(${record.effectiveTo}::date, '9999-12-31'::date))
							)
						LIMIT 1
					),
					mutated AS (
						INSERT INTO hr_compensation_grade_progression_rule (
							id, organization_id, from_grade_id, to_grade_id,
							effective_from, effective_to, min_months_in_grade,
							status, version, created_by, updated_by
						)
						SELECT
							${brandedId.data}, ${record.organizationId}, ${record.fromGradeId},
							${record.toGradeId}, ${record.effectiveFrom}, ${record.effectiveTo},
							${record.minMonthsInGrade}, 'active', 1, ${record.createdBy}, ${record.createdBy}
						WHERE NOT EXISTS (SELECT 1 FROM overlapping)
						RETURNING *
					),
					audited AS (
						INSERT INTO platform_audit_log (
							id, organization_id, actor_user_id, correlation_id, module, entity,
							entity_id, action, changes, old_value, new_value, metadata,
						ip_address, user_agent
						)
						SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict(
					"Overlapping progression rule exists for this grade transition",
				);
			}
			return mapCompensationGradeProgressionRuleSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to create progression rule");
		}
	},

	async archiveCompensationGradeProgressionRule(input, _ports, meta) {
		const existing = await this.getCompensationGradeProgressionRule({
			organizationId: input.organizationId,
			progressionRuleId: input.progressionRuleId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Progression rule not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_compensation_grade_progression_rule",
			entityId: input.progressionRuleId,
			action: "UPDATE",
			reasonCode: "COMPENSATION_PROGRESSION_RULE_ARCHIVED",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: "archived", version: nextVersion },
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
					WITH mutated AS (
						UPDATE hr_compensation_grade_progression_rule
						SET status = 'archived',
							version = ${nextVersion},
							updated_by = ${input.actorUserId},
							updated_at = now()
						WHERE id = ${input.progressionRuleId}
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
						SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
						RETURNING id
					)
					SELECT mutated.* FROM mutated, audited
				`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Progression rule",
				});
			}
			return mapCompensationGradeProgressionRuleSql(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to archive progression rule");
		}
	},

	async listCompensationGradeProgressionRulesFromGrade(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrCompensationGradeProgressionRule)
				.where(
					and(
						eq(
							hrCompensationGradeProgressionRule.organizationId,
							input.organizationId,
						),
						eq(
							hrCompensationGradeProgressionRule.fromGradeId,
							input.fromGradeId,
						),
						eq(hrCompensationGradeProgressionRule.status, "active"),
					),
				)
				.orderBy(desc(hrCompensationGradeProgressionRule.effectiveFrom));
			const rules: CompensationGradeProgressionRule[] = [];
			for (const row of rows) {
				const mapped = mapCompensationGradeProgressionRule(row);
				if (!mapped.ok) {
					return mapped;
				}
				if (input.asOf) {
					const selected = selectUniqueEffectiveRangeRecord({
						records: [mapped.data],
						asOf: input.asOf,
					});
					if (selected === null) {
						continue;
					}
				}
				rules.push(mapped.data);
			}
			const totalCount = rules.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = rules.slice(offset, offset + input.pageSize);
			return errorResult.ok({
				rules: paginated,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list progression rules");
		}
	},

	async listEligibleProgressionTargets(input) {
		const listed = await this.listCompensationGradeProgressionRulesFromGrade({
			organizationId: input.organizationId,
			fromGradeId: input.fromGradeId,
			page: 1,
			pageSize: 10_000,
			asOf: input.asOf,
		});
		if (!listed.ok) {
			return listed;
		}
		return errorResult.ok(listed.data.rules);
	},

	async getEmployeeCompensation(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrEmployeeCompensation)
				.where(
					and(
						eq(hrEmployeeCompensation.organizationId, input.organizationId),
						eq(hrEmployeeCompensation.id, input.compensationId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
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
			const rows = await afendaDatabase.client
				.select()
				.from(hrEmployeeCompensation)
				.where(
					and(
						eq(hrEmployeeCompensation.organizationId, input.organizationId),
						eq(
							hrEmployeeCompensation.createIdempotencyKey,
							input.idempotencyKey,
						),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapEmployeeCompensation(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find employee compensation by idempotency key",
			);
		}
	},

	async createEmployeeCompensation(record, _ports, meta) {
		const existing = await this.findEmployeeCompensationByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return errorResult.ok(existing.data);
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) {
			return employment;
		}
		if (employment.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
				internalContext: {
					code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				},
			});
		}
		if (employment.data.employeeId !== record.employeeId) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
				internalContext: {
					code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				},
			});
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesEmployeeCompensationId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_employee_compensation",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "EMPLOYEE_COMPENSATION_CREATED",
			newValue: {
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				gradeId: record.gradeId,
				salaryBandId: record.salaryBandId,
				currencyCode: record.currencyCode,
				payFrequency: record.payFrequency,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				status: "draft",
				version: 1,
			},
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
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
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH employment AS (
							SELECT employment_root.id, employment_root.organization_id, employment_root.employee_id
							FROM hr_employment AS employment_root
							WHERE employment_root.id = ${record.employmentId}
								AND employment_root.organization_id = ${record.organizationId}
						),
						draft_check AS (
							SELECT 1 AS exists
							FROM hr_employee_compensation AS compensation_draft
							WHERE compensation_draft.organization_id = ${record.organizationId}
								AND compensation_draft.employment_id = ${record.employmentId}
								AND compensation_draft.status = 'draft'
							LIMIT 1
						),
						mutated AS (
							INSERT INTO hr_employee_compensation (
								id, organization_id, employee_id, employment_id, grade_id,
								salary_band_id, base_amount, currency_code, pay_frequency,
								effective_from, effective_to, reason, confidential_note,
								supersedes_compensation_id, status, source_review_id,
								create_idempotency_key, create_request_fingerprint, version,
								created_by, updated_by
							)
							SELECT
								${brandedId.data}, employment.organization_id, employment.employee_id,
								employment.id, ${record.gradeId}, ${record.salaryBandId},
								${record.baseAmount}, ${record.currencyCode}, ${record.payFrequency},
								${record.effectiveFrom}, ${record.effectiveTo}, ${record.reason},
								${record.confidentialNote}, ${record.supersedesCompensationId},
								'draft', ${record.sourceReviewId},
								${record.createIdempotencyKey}, ${record.createRequestFingerprint},
								1, ${record.createdBy}, ${record.createdBy}
							FROM employment
							WHERE NOT EXISTS (SELECT 1 FROM draft_check)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
			const [row] = rows;
			if (!row) {
				return conflict(
					"An open draft compensation agreement already exists for this employment",
				);
			}
			return mapEmployeeCompensationSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findEmployeeCompensationByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					return errorResult.ok(replay.data);
				}
			}
			return mapPersistenceFailure(
				error,
				"Failed to create employee compensation",
			);
		}
	},

	async amendEmployeeCompensation(input, ports, meta) {
		return await drizzleAmendEmployeeCompensation(
			this,
			{
				organizationId: input.organizationId,
				compensationId: input.compensationId,
				expectedVersion: input.expectedVersion,
				actorUserId: input.actorUserId,
				...(input.baseAmount === undefined
					? {}
					: { baseAmount: input.baseAmount }),
				...(input.currencyCode === undefined
					? {}
					: { currencyCode: input.currencyCode }),
				...(input.payFrequency === undefined
					? {}
					: { payFrequency: input.payFrequency }),
				...(input.effectiveFrom === undefined
					? {}
					: { effectiveFrom: input.effectiveFrom }),
				...(input.effectiveTo === undefined
					? {}
					: { effectiveTo: input.effectiveTo }),
				...(input.reason === undefined ? {} : { reason: input.reason }),
				...(input.gradeId === undefined ? {} : { gradeId: input.gradeId }),
				...(input.salaryBandId === undefined
					? {}
					: { salaryBandId: input.salaryBandId }),
				...(input.confidentialNote === undefined
					? {}
					: { confidentialNote: input.confidentialNote }),
			},
			ports,
			meta,
		);
	},

	async approveEmployeeCompensation(input, ports, meta) {
		return await drizzleApproveEmployeeCompensation(this, input, ports, meta);
	},

	async scheduleEmployeeCompensationChange(input, ports, meta) {
		return await drizzleScheduleEmployeeCompensationChange(
			this,
			input,
			ports,
			meta,
		);
	},

	async activateEmployeeCompensation(input, ports, meta) {
		return await drizzleActivateEmployeeCompensation(this, input, ports, meta);
	},

	async correctEmployeeCompensation(input, ports, meta) {
		return await drizzleCorrectEmployeeCompensation(this, input, ports, meta);
	},

	async endEmployeeCompensation(input, _ports, meta) {
		const existing = await this.getEmployeeCompensation({
			organizationId: input.organizationId,
			compensationId: input.compensationId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Employee compensation not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (!isEmployeeCompensationCancellable(existing.data.status)) {
			return invalidState("Compensation cannot be ended in its current status");
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_employee_compensation",
			entityId: input.compensationId,
			action: "UPDATE",
			reasonCode: "EMPLOYEE_COMPENSATION_ENDED",
			oldValue: {
				status: existing.data.status,
				effectiveTo: existing.data.effectiveTo,
				version: input.expectedVersion,
			},
			newValue: {
				status: "ended",
				effectiveTo: input.endsOn,
				version: nextVersion,
			},
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
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
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
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
								AND status IN ('draft', 'scheduled', 'active')
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
			const [row] = rows;
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
			const allRows = await afendaDatabase.client
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
				if (!mapped.ok) {
					return mapped;
				}
				compensations.push(mapped.data);
			}
			const totalCount = compensations.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = compensations.slice(offset, offset + input.pageSize);
			return errorResult.ok({
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
			const rows = await afendaDatabase.client
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
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapEmployeeCompensation(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find active employee compensation",
			);
		}
	},

	async findEmployeeCompensationByEmploymentAsOf(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrEmployeeCompensation)
				.where(
					and(
						eq(hrEmployeeCompensation.organizationId, input.organizationId),
						eq(hrEmployeeCompensation.employmentId, input.employmentId),
					),
				);
			const records: EmployeeCompensation[] = [];
			for (const row of rows) {
				const mapped = mapEmployeeCompensation(row);
				if (!mapped.ok) {
					return mapped;
				}
				if (!isEmployeeCompensationAsOfEligible(mapped.data.status)) {
					continue;
				}
				records.push(mapped.data);
			}
			const selected = selectUniqueEffectiveRangeRecord({
				records,
				asOf: input.asOf,
			});
			return errorResult.ok(selected);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find employee compensation effective on date",
			);
		}
	},

	async getCompensationReview(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrCompensationReview)
				.where(
					and(
						eq(hrCompensationReview.organizationId, input.organizationId),
						eq(hrCompensationReview.id, input.reviewId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapCompensationReviewFromDbRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load compensation review");
		}
	},

	async findCompensationReviewByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrCompensationReview)
				.where(
					and(
						eq(hrCompensationReview.organizationId, input.organizationId),
						eq(hrCompensationReview.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapCompensationReviewFromDbRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find compensation review by idempotency key",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async createCompensationReviewDraft(record, _ports, meta) {
		const existing = await this.findCompensationReviewByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (existing.data.fingerprint === record.createRequestFingerprint) {
				return errorResult.ok(existing.data);
			}
			return conflict("Idempotency key already used with different data");
		}

		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) {
			return employee;
		}
		if (employee.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
				internalContext: {
					code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				},
			});
		}

		const employment = await this.getEmploymentById({
			organizationId: record.organizationId,
			employmentId: record.employmentId,
		});
		if (!employment.ok) {
			return employment;
		}
		if (employment.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
				internalContext: {
					code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				},
			});
		}

		const cycleOpen = await assertDrizzleReviewCycleOpen(
			record.organizationId,
			record.cycleId,
		);
		if (!cycleOpen.ok) {
			return cycleOpen;
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCompensationReviewId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_compensation_review",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "COMPENSATION_REVIEW_DRAFT_CREATED",
			newValue: {
				cycleId: record.cycleId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				status: "draft",
				version: 1,
			},
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							INSERT INTO hr_compensation_review (
								id, organization_id, cycle_id, employee_id, employment_id, status,
								proposed_base_amount, proposed_currency_code, proposed_grade_id,
								proposed_salary_band_id, recommendation_note, effective_from,
								finalized_at, applied_compensation_id, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							VALUES (
								${brandedId.data}, ${record.organizationId}, ${record.cycleId},
								${record.employeeId}, ${record.employmentId}, 'draft', NULL, NULL, NULL,
								NULL, NULL, NULL, NULL, NULL, ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy},
								${record.createdBy}
							)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (replay.data.fingerprint === record.createRequestFingerprint) {
						return errorResult.ok(replay.data);
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

	async recordCompensationRecommendation(input, _ports, meta) {
		const existing = await this.getCompensationReview({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Compensation review not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const statusGuard = assertCanRecordCompensationRecommendation(
			existing.data.status,
		);
		if (!statusGuard.ok) {
			return statusGuard;
		}

		const cycleOpen = await assertDrizzleReviewCycleOpen(
			input.organizationId,
			existing.data.cycleId,
		);
		if (!cycleOpen.ok) {
			return cycleOpen;
		}

		const updatedPreview: CompensationReview = {
			...existing.data,
			proposedBaseAmount: input.proposedBaseAmount,
			proposedCurrencyCode: input.proposedCurrencyCode,
			proposedGradeId: input.proposedGradeId,
			proposedSalaryBandId: input.proposedSalaryBandId,
			effectiveFrom: input.effectiveFrom,
			recommendationNote: input.recommendationNote,
			status: "recorded",
		};
		const budgetCheck = await assertDrizzleReviewBudget(
			this,
			input.organizationId,
			updatedPreview,
		);
		if (!budgetCheck.ok) {
			return budgetCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_compensation_review",
			entityId: input.reviewId,
			action: "UPDATE",
			reasonCode: "COMPENSATION_RECOMMENDATION_RECORDED",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: {
				currencyCode: input.proposedCurrencyCode,
				gradeId: input.proposedGradeId,
				salaryBandId: input.proposedSalaryBandId,
				effectiveFrom: input.effectiveFrom,
				status: "recorded",
				version: nextVersion,
			},
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_compensation_review
							SET proposed_base_amount = ${input.proposedBaseAmount},
								proposed_currency_code = ${input.proposedCurrencyCode},
								proposed_grade_id = ${input.proposedGradeId},
								proposed_salary_band_id = ${input.proposedSalaryBandId},
								effective_from = ${input.effectiveFrom},
								recommendation_note = ${input.recommendationNote},
								status = 'recorded',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.reviewId}
								AND organization_id = ${input.organizationId}
								AND version = ${input.expectedVersion}
								AND status IN ('draft', 'recorded')
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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

	async finalizeCompensationReview(input, _ports, meta) {
		const existing = await this.getCompensationReview({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Compensation review not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const finalizeGuard = assertCanFinalizeCompensationReview(existing.data);
		if (!finalizeGuard.ok) {
			return finalizeGuard;
		}

		const cycleOpen = await assertDrizzleReviewCycleOpen(
			input.organizationId,
			existing.data.cycleId,
		);
		if (!cycleOpen.ok) {
			return cycleOpen;
		}

		const budgetCheck = await assertDrizzleReviewBudget(
			this,
			input.organizationId,
			existing.data,
		);
		if (!budgetCheck.ok) {
			return budgetCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_compensation_review",
			entityId: input.reviewId,
			action: "UPDATE",
			reasonCode: "COMPENSATION_REVIEW_FINALIZED",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: "finalized", version: nextVersion },
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
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
								AND status = 'recorded'
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Review validation, three audit facts, idempotency replay, and mutation/outbox staging share one atomic command boundary.
	async applyApprovedCompensationResult(input, _ports, meta) {
		const review = await this.getCompensationReview({
			organizationId: input.organizationId,
			reviewId: input.reviewId,
		});
		if (!review.ok) {
			return review;
		}
		if (review.data === null) {
			return notFound("Compensation review not found");
		}
		const reviewData = review.data; // Store for type narrowing
		if (!isCompensationReviewFinalized(reviewData.status)) {
			return invalidState("Compensation review is not finalized");
		}
		if (
			!(
				reviewData.proposedBaseAmount &&
				reviewData.proposedCurrencyCode &&
				reviewData.effectiveFrom
			)
		) {
			return invalidState(
				"Review must have proposed amount, currency, and effective date",
			);
		}

		const employment = await this.getEmploymentById({
			organizationId: input.organizationId,
			employmentId: reviewData.employmentId,
		});
		if (!employment.ok) {
			return employment;
		}
		if (employment.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
				internalContext: {
					code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				},
			});
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesEmployeeCompensationId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedEndedAudit = prepareDerivedCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			reasonCode: "ACTIVE_COMPENSATION_ENDED_BY_REVIEW",
			oldValue: { status: "active" },
			newValue: {
				status: "ended",
				effectiveTo: reviewData.effectiveFrom,
			},
		});
		if (!preparedEndedAudit.ok) {
			return preparedEndedAudit;
		}
		const endedAudit = preparedEndedAudit.data;
		const preparedNewAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_employee_compensation",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "REVIEW_COMPENSATION_APPLIED",
			newValue: {
				employeeId: reviewData.employeeId,
				employmentId: reviewData.employmentId,
				gradeId: reviewData.proposedGradeId,
				salaryBandId: reviewData.proposedSalaryBandId,
				currencyCode: reviewData.proposedCurrencyCode,
				payFrequency: "monthly",
				effectiveFrom: reviewData.effectiveFrom,
				status: "active",
				sourceReviewId: input.reviewId,
				version: 1,
			},
		});
		if (!preparedNewAudit.ok) {
			return preparedNewAudit;
		}
		const newAudit = preparedNewAudit.data;
		const preparedReviewLinkAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_compensation_review",
			entityId: input.reviewId,
			action: "UPDATE",
			reasonCode: "COMPENSATION_REVIEW_RESULT_LINKED",
			oldValue: {
				status: reviewData.status,
				appliedCompensationId: reviewData.appliedCompensationId,
				version: reviewData.version,
			},
			newValue: {
				status: reviewData.status,
				appliedCompensationId: brandedId.data,
				version: reviewData.version + 1,
			},
		});
		if (!preparedReviewLinkAudit.ok) {
			return preparedReviewLinkAudit;
		}
		const reviewLinkAudit = preparedReviewLinkAudit.data;
		const auditOldId = randomUUID();
		const auditNewId = randomUUID();
		const auditReviewId = randomUUID();
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
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH active_comp AS (
							SELECT active_compensation.id, active_compensation.version
							FROM hr_employee_compensation AS active_compensation
							WHERE active_compensation.organization_id = ${input.organizationId}
								AND active_compensation.employment_id = ${reviewData.employmentId}
								AND active_compensation.status = 'active'
							FOR UPDATE
						),
						ended_comp AS (
							UPDATE hr_employee_compensation AS compensation
							SET status = 'ended',
								effective_to = ${reviewData.effectiveFrom},
								version = compensation.version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM active_comp
							WHERE compensation.id = active_comp.id
								AND compensation.organization_id = ${input.organizationId}
								AND compensation.version = active_comp.version
							RETURNING compensation.id, compensation.organization_id
						),
						audit_ended AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
						SELECT
							${auditOldId}, ${endedAudit.organizationId}, ${endedAudit.actorUserId},
							${endedAudit.correlationId}, ${endedAudit.module}, ${endedAudit.entity},
							id, ${endedAudit.action}, ${endedAudit.changesJson}::jsonb,
							${endedAudit.oldValueJson}::jsonb, ${endedAudit.newValueJson}::jsonb,
							${endedAudit.metadataJson}::jsonb, ${endedAudit.ipAddress},
							${endedAudit.userAgent}
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
						ended_ready AS (
							SELECT count(*) AS ended_count
							FROM ended_comp
						),
						mutated AS (
							INSERT INTO hr_employee_compensation (
								id, organization_id, employee_id, employment_id, grade_id,
								salary_band_id, base_amount, currency_code, pay_frequency,
								effective_from, effective_to, reason, approved_at, approved_by,
								status, source_review_id,
								create_idempotency_key, create_request_fingerprint, version,
								created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${input.organizationId}, ${reviewData.employeeId},
								${reviewData.employmentId}, ${reviewData.proposedGradeId},
								${reviewData.proposedSalaryBandId}, ${reviewData.proposedBaseAmount},
								${reviewData.proposedCurrencyCode}, 'monthly', ${reviewData.effectiveFrom},
								NULL, ${input.reason}, now(), ${input.actorUserId}, 'active', ${input.reviewId},
								${input.createIdempotencyKey},
								${reviewData.effectiveFrom}::text || ':' || ${reviewData.proposedBaseAmount}::text || ':' || ${reviewData.proposedCurrencyCode}::text,
								1, ${input.actorUserId}, ${input.actorUserId}
							FROM ended_ready
							RETURNING *
						),
						audit_new AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
						SELECT
							${auditNewId}, ${newAudit.organizationId}, ${newAudit.actorUserId},
							${newAudit.correlationId}, ${newAudit.module}, ${newAudit.entity},
							${newAudit.entityId}, ${newAudit.action}, ${newAudit.changesJson}::jsonb,
							${newAudit.oldValueJson}::jsonb, ${newAudit.newValueJson}::jsonb,
							${newAudit.metadataJson}::jsonb, ${newAudit.ipAddress}, ${newAudit.userAgent}
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
						),
						review_linked AS (
							UPDATE hr_compensation_review r
							SET applied_compensation_id = m.id,
								version = r.version + 1,
								updated_by = ${input.actorUserId},
								updated_at = now()
							FROM mutated m
							WHERE r.id = ${input.reviewId}
								AND r.organization_id = ${input.organizationId}
								AND r.status = 'finalized'
							RETURNING r.id
						),
						audit_review_linked AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
								ip_address, user_agent
							)
							SELECT
								${auditReviewId}, ${reviewLinkAudit.organizationId},
								${reviewLinkAudit.actorUserId}, ${reviewLinkAudit.correlationId},
								${reviewLinkAudit.module}, ${reviewLinkAudit.entity},
								${reviewLinkAudit.entityId}, ${reviewLinkAudit.action},
								${reviewLinkAudit.changesJson}::jsonb,
								${reviewLinkAudit.oldValueJson}::jsonb,
								${reviewLinkAudit.newValueJson}::jsonb,
								${reviewLinkAudit.metadataJson}::jsonb,
								${reviewLinkAudit.ipAddress}, ${reviewLinkAudit.userAgent}
							FROM review_linked
							RETURNING id
						)
						SELECT mutated.*
						FROM mutated, audit_new, outbox_new, review_linked, audit_review_linked
					`,
			]);
			const [row] = rows;
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
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					return errorResult.ok(replay.data);
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
			const allRows = await afendaDatabase.client
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
				const mapped = mapCompensationReviewFromDbRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				reviews.push(mapped.data);
			}
			const totalCount = reviews.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = reviews.slice(offset, offset + input.pageSize);
			return errorResult.ok({
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

	async getCompensationProposal(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrCompensationProposal)
				.where(
					and(
						eq(hrCompensationProposal.organizationId, input.organizationId),
						eq(hrCompensationProposal.id, input.proposalId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapCompensationProposal(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to load compensation proposal",
			);
		}
	},

	async createCompensationProposal(record, _ports, meta) {
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
		if (application.data.organizationId !== record.organizationId) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
				internalContext: {
					code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				},
			});
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesCompensationProposalId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_compensation_proposal",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "COMPENSATION_PROPOSAL_CREATED",
			newValue: {
				applicationId: record.applicationId,
				currencyCode: record.proposedCurrencyCode,
				gradeId: record.proposedGradeId,
				salaryBandId: record.proposedSalaryBandId,
				status: "draft",
				version: 1,
			},
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							INSERT INTO hr_compensation_proposal (
								id, organization_id, application_id, status,
								proposed_base_amount, proposed_currency_code, proposed_grade_id,
								proposed_salary_band_id, confidential_note, version,
								created_by, updated_by
							)
							VALUES (
								${brandedId.data}, ${record.organizationId}, ${record.applicationId},
								'draft', ${record.proposedBaseAmount}, ${record.proposedCurrencyCode},
								${record.proposedGradeId}, ${record.proposedSalaryBandId},
								${record.confidentialNote}, 1, ${record.createdBy}, ${record.createdBy}
							)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return conflict("Unable to create compensation proposal");
			}
			return mapCompensationProposalSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to create compensation proposal",
			);
		}
	},

	async amendCompensationProposal(input, _ports, meta) {
		const existing = await this.getCompensationProposal({
			organizationId: input.organizationId,
			proposalId: input.proposalId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Compensation proposal not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		const amendable = assertCompensationProposalAmendable(existing.data.status);
		if (!amendable.ok) {
			return amendable;
		}

		const nextProposedBaseAmount =
			input.proposedBaseAmount === undefined
				? existing.data.proposedBaseAmount
				: input.proposedBaseAmount;
		const nextProposedCurrencyCode =
			input.proposedCurrencyCode === undefined
				? existing.data.proposedCurrencyCode
				: input.proposedCurrencyCode;
		const nextProposedGradeId =
			input.proposedGradeId === undefined
				? existing.data.proposedGradeId
				: input.proposedGradeId;
		const nextProposedSalaryBandId =
			input.proposedSalaryBandId === undefined
				? existing.data.proposedSalaryBandId
				: input.proposedSalaryBandId;
		const nextConfidentialNote =
			input.confidentialNote === undefined
				? existing.data.confidentialNote
				: input.confidentialNote;

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_compensation_proposal",
			entityId: input.proposalId,
			action: "UPDATE",
			reasonCode: "COMPENSATION_PROPOSAL_AMENDED",
			oldValue: {
				currencyCode: existing.data.proposedCurrencyCode,
				gradeId: existing.data.proposedGradeId,
				salaryBandId: existing.data.proposedSalaryBandId,
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: {
				currencyCode: nextProposedCurrencyCode,
				gradeId: nextProposedGradeId,
				salaryBandId: nextProposedSalaryBandId,
				status: existing.data.status,
				version: nextVersion,
			},
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_compensation_proposal
							SET proposed_base_amount = ${nextProposedBaseAmount},
								proposed_currency_code = ${nextProposedCurrencyCode},
								proposed_grade_id = ${nextProposedGradeId},
								proposed_salary_band_id = ${nextProposedSalaryBandId},
								confidential_note = ${nextConfidentialNote},
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.proposalId}
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
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
			if (!row) {
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Compensation proposal",
				});
			}
			return mapCompensationProposalSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to amend compensation proposal",
			);
		}
	},

	async approveCompensationProposal(input, _ports, meta) {
		const existing = await this.getCompensationProposal({
			organizationId: input.organizationId,
			proposalId: input.proposalId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Compensation proposal not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (
			!(existing.data.proposedBaseAmount && existing.data.proposedCurrencyCode)
		) {
			return invalidState(
				"Proposal must have proposed base amount and currency before approval",
			);
		}
		const transition = assertCompensationProposalStatusTransition(
			existing.data.status,
			"approved",
		);
		if (!transition.ok) {
			return transition;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_compensation_proposal",
			entityId: input.proposalId,
			action: "UPDATE",
			reasonCode: "COMPENSATION_PROPOSAL_APPROVED",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: "approved", version: nextVersion },
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const plannedOutbox = planCompensationDrizzleOutbox({
			commandId: meta.operationId,
			meta,
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			aggregateId: input.proposalId,
			entityType: "hr_compensation_proposal",
			auditAction: "UPDATE",
		});
		if (plannedOutbox === undefined) {
			return invalidState(
				"Compensation proposal approval requires a domain event",
			);
		}

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH mutated AS (
							UPDATE hr_compensation_proposal
							SET status = 'approved',
								version = ${nextVersion},
								updated_by = ${input.actorUserId},
								updated_at = now()
							WHERE id = ${input.proposalId}
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
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						),
						outboxed AS (
							INSERT INTO platform_domain_event (
								id, organization_id, type, source_module, correlation_id,
								actor_user_id, payload, status, attempts
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
				return missAfterOptimisticUpdate({
					found: true,
					entityLabel: "Compensation proposal",
				});
			}
			return mapCompensationProposalSql(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to approve compensation proposal",
			);
		}
	},

	async listCompensationProposals(input) {
		try {
			const filters = [
				eq(hrCompensationProposal.organizationId, input.organizationId),
			];
			if (input.applicationId !== undefined) {
				filters.push(
					eq(hrCompensationProposal.applicationId, input.applicationId),
				);
			}
			const allRows = await afendaDatabase.client
				.select()
				.from(hrCompensationProposal)
				.where(and(...filters))
				.orderBy(desc(hrCompensationProposal.createdAt));
			let proposals: CompensationProposal[] = [];
			for (const row of allRows) {
				const mapped = mapCompensationProposal(row);
				if (!mapped.ok) {
					return mapped;
				}
				proposals.push(mapped.data);
			}
			const totalCount = proposals.length;
			const offset = (input.page - 1) * input.pageSize;
			proposals = proposals.slice(offset, offset + input.pageSize);
			return errorResult.ok({
				proposals,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to list compensation proposals",
			);
		}
	},

	async getBenefitPlan(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrBenefitPlan)
				.where(
					and(
						eq(hrBenefitPlan.organizationId, input.organizationId),
						eq(hrBenefitPlan.id, input.planId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapBenefitPlan(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load benefit plan");
		}
	},

	async findBenefitPlanByCode(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrBenefitPlan)
				.where(
					and(
						eq(hrBenefitPlan.organizationId, input.organizationId),
						eq(hrBenefitPlan.code, input.code),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapBenefitPlan(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find benefit plan by code",
			);
		}
	},

	async createBenefitPlan(record, _ports, meta) {
		const existing = await this.findBenefitPlanByCode({
			organizationId: record.organizationId,
			code: record.code,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			return conflict("Benefit plan code already exists");
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesBenefitPlanId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_benefit_plan",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "BENEFIT_PLAN_CREATED",
			newValue: { code: record.code, status: "active", version: 1 },
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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

	async updateBenefitPlan(input, _ports, meta) {
		const existing = await this.getBenefitPlan({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Benefit plan not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_benefit_plan",
			entityId: input.planId,
			action: "UPDATE",
			reasonCode: "BENEFIT_PLAN_UPDATED",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: {
				status: existing.data.status,
				nameChanged: input.name !== existing.data.name,
				eligibilityChanged:
					input.eligibilityNote !== existing.data.eligibilityNote,
				version: nextVersion,
			},
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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

	async archiveBenefitPlan(input, _ports, meta) {
		const existing = await this.getBenefitPlan({
			organizationId: input.organizationId,
			planId: input.planId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Benefit plan not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}

		try {
			const openRows = await afendaDatabase.client
				.select({
					id: hrBenefitEnrollment.id,
					status: hrBenefitEnrollment.status,
				})
				.from(hrBenefitEnrollment)
				.where(
					and(
						eq(hrBenefitEnrollment.organizationId, input.organizationId),
						eq(hrBenefitEnrollment.planId, input.planId),
					),
				)
				.limit(1);
			const openEnrollment = openRows.find((row) => {
				const parsed = benefitEnrollmentStatusSchema.safeParse(row.status);
				return parsed.success && isBenefitEnrollmentOpen(parsed.data);
			});
			if (openEnrollment) {
				return conflict(
					"Benefit plan cannot be archived while open enrollments exist",
				);
			}
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to check benefit enrollments",
			);
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_benefit_plan",
			entityId: input.planId,
			action: "UPDATE",
			reasonCode: "BENEFIT_PLAN_ARCHIVED",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: "archived", version: nextVersion },
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
							FROM mutated
							RETURNING id
						)
						SELECT mutated.* FROM mutated, audited
					`,
			]);
			const [row] = rows;
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
			const allRows = await afendaDatabase.client
				.select()
				.from(hrBenefitPlan)
				.where(eq(hrBenefitPlan.organizationId, input.organizationId));
			const plans: BenefitPlan[] = [];
			for (const row of allRows) {
				const mapped = mapBenefitPlan(row);
				if (!mapped.ok) {
					return mapped;
				}
				plans.push(mapped.data);
			}
			plans.sort((a, b) => a.code.localeCompare(b.code));
			const totalCount = plans.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = plans.slice(offset, offset + input.pageSize);
			return errorResult.ok({
				plans: paginated,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list benefit plans");
		}
	},

	async getBenefitPlanEligibility(input) {
		return await drizzleGetBenefitPlanEligibility(input);
	},

	async setBenefitPlanEligibility(input, ports, meta) {
		return await drizzleSetBenefitPlanEligibility(this, input, ports, meta);
	},

	async getBenefitEnrollment(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrBenefitEnrollment)
				.where(
					and(
						eq(hrBenefitEnrollment.organizationId, input.organizationId),
						eq(hrBenefitEnrollment.id, input.enrollmentId),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapBenefitEnrollmentFromDbRow(row);
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to load benefit enrollment");
		}
	},

	async findBenefitEnrollmentByIdempotencyKey(input) {
		try {
			const rows = await afendaDatabase.client
				.select()
				.from(hrBenefitEnrollment)
				.where(
					and(
						eq(hrBenefitEnrollment.organizationId, input.organizationId),
						eq(hrBenefitEnrollment.createIdempotencyKey, input.idempotencyKey),
					),
				)
				.limit(1);
			const [row] = rows;
			if (!row) {
				return errorResult.ok(null);
			}
			return mapBenefitEnrollmentFromDbRow(row);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to find benefit enrollment by idempotency key",
			);
		}
	},

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
	async enrolBenefit(record, _ports, meta) {
		const existing = await this.findBenefitEnrollmentByIdempotencyKey({
			organizationId: record.organizationId,
			idempotencyKey: record.createIdempotencyKey,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data !== null) {
			if (existing.data.fingerprint === record.createRequestFingerprint) {
				return errorResult.ok(existing.data);
			}
			return conflict("Idempotency key already used with different data");
		}

		const contributionCheck = assertBenefitContributionFacts({
			employeeContributionAmount: record.employeeContributionAmount,
			employerContributionAmount: record.employerContributionAmount,
			contributionCurrencyCode: record.contributionCurrencyCode,
			contributionFrequency: record.contributionFrequency,
		});
		if (!contributionCheck.ok) {
			return contributionCheck;
		}

		const preconditions = await assertDrizzleBenefitEnrollmentPreconditions(
			this,
			{
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				planId: record.planId,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
			},
		);
		if (!preconditions.ok) {
			return preconditions;
		}

		const employee = await this.getEmployeeById({
			organizationId: record.organizationId,
			employeeId: record.employeeId,
		});
		if (!employee.ok) {
			return employee;
		}
		if (employee.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
				internalContext: {
					code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				},
			});
		}

		const id = randomUUID();
		const brandedId = parseHumanResourcesBenefitEnrollmentId(id);
		if (!brandedId.ok) {
			return brandedId;
		}
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: record.organizationId,
			actorUserId: record.createdBy,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_benefit_enrollment",
			entityId: brandedId.data,
			action: "CREATE",
			reasonCode: "BENEFIT_ENROLLMENT_CREATED",
			newValue: {
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				planId: record.planId,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				currencyCode: record.contributionCurrencyCode,
				contributionFrequency: record.contributionFrequency,
				status: "active",
				version: 1,
			},
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
		const auditId = randomUUID();
		const eventId = randomUUID();
		const payloadJson = eventPayloadJson({
			organizationId: record.organizationId,
			entityType: "hr_benefit_enrollment",
			entityId: brandedId.data,
			actorId: record.createdBy,
			correlationId: meta.correlationId,
		});
		const contributionFrequency = record.contributionFrequency ?? null;

		try {
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
				sqlTag`
						WITH open_check AS (
							SELECT 1 AS exists
							FROM hr_benefit_enrollment
							WHERE organization_id = ${record.organizationId}
								AND employee_id = ${record.employeeId}
								AND plan_id = ${record.planId}
								AND status IN ('active', 'waived')
							LIMIT 1
						),
						mutated AS (
							INSERT INTO hr_benefit_enrollment (
								id, organization_id, employee_id, employment_id, plan_id, effective_from,
								effective_to, status, employee_contribution_amount,
								employer_contribution_amount, contribution_currency_code,
								contribution_frequency, waiver_reason, create_idempotency_key,
								create_request_fingerprint, version, created_by, updated_by
							)
							SELECT
								${brandedId.data}, ${record.organizationId}, ${record.employeeId},
								${record.employmentId}, ${record.planId}, ${record.effectiveFrom},
								${record.effectiveTo}, 'active', ${record.employeeContributionAmount},
								${record.employerContributionAmount}, ${record.contributionCurrencyCode},
								${contributionFrequency}, NULL, ${record.createIdempotencyKey},
								${record.createRequestFingerprint}, 1, ${record.createdBy}, ${record.createdBy}
							WHERE NOT EXISTS (SELECT 1 FROM open_check)
							RETURNING *
						),
						audited AS (
							INSERT INTO platform_audit_log (
								id, organization_id, actor_user_id, correlation_id, module, entity,
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
			]);
			const [row] = rows;
			if (!row) {
				return conflict(
					"Employee already has an open enrollment for this plan",
				);
			}
			return mapBenefitEnrollmentSql(row);
		} catch (error) {
			if (isCreateIdempotencyUniqueViolation(error)) {
				const replay = await this.findBenefitEnrollmentByIdempotencyKey({
					organizationId: record.organizationId,
					idempotencyKey: record.createIdempotencyKey,
				});
				if (!replay.ok) {
					return replay;
				}
				if (replay.data !== null) {
					if (replay.data.fingerprint === record.createRequestFingerprint) {
						return errorResult.ok(replay.data);
					}
					return conflict("Idempotency key already used with different data");
				}
			}
			return mapPersistenceFailure(error, "Failed to enrol benefit");
		}
	},

	async waiveBenefit(input, ports, meta) {
		return await drizzleWaiveBenefit(this, input, ports, meta);
	},

	async getBenefitEnrollmentDependent(input) {
		return await drizzleGetBenefitEnrollmentDependent(input);
	},

	async listBenefitEnrollmentDependentsByEnrollment(input) {
		return await drizzleListBenefitEnrollmentDependentsByEnrollment(input);
	},

	async addBenefitEnrollmentDependent(input, ports, meta) {
		return await drizzleAddBenefitEnrollmentDependent(this, input, ports, meta);
	},

	async endBenefitEnrollmentDependent(input, ports, meta) {
		return await drizzleEndBenefitEnrollmentDependent(input, ports, meta);
	},

	async endBenefitEnrollment(input, _ports, meta) {
		const existing = await this.getBenefitEnrollment({
			organizationId: input.organizationId,
			enrollmentId: input.enrollmentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Benefit enrollment not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (!isBenefitEnrollmentActive(existing.data.status)) {
			return invalidState("Benefit enrollment is not active");
		}
		const rangeCheck = assertEffectiveRange({
			effectiveFrom: existing.data.effectiveFrom,
			effectiveTo: input.endsOn,
		});
		if (!rangeCheck.ok) {
			return rangeCheck;
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_benefit_enrollment",
			entityId: input.enrollmentId,
			action: "UPDATE",
			reasonCode: "BENEFIT_ENROLLMENT_ENDED",
			oldValue: {
				status: existing.data.status,
				effectiveTo: existing.data.effectiveTo,
				version: input.expectedVersion,
			},
			newValue: {
				status: "ended",
				effectiveTo: input.endsOn,
				version: nextVersion,
			},
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
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
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
			]);
			const [row] = rows;
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

	async cancelBenefitEnrollment(input, _ports, meta) {
		const existing = await this.getBenefitEnrollment({
			organizationId: input.organizationId,
			enrollmentId: input.enrollmentId,
		});
		if (!existing.ok) {
			return existing;
		}
		if (existing.data === null) {
			return notFound("Benefit enrollment not found");
		}
		const versionCheck = assertExpectedVersion(
			existing.data.version,
			input.expectedVersion,
		);
		if (!versionCheck.ok) {
			return versionCheck;
		}
		if (!isBenefitEnrollmentActive(existing.data.status)) {
			return invalidState("Benefit enrollment is not active");
		}

		const nextVersion = input.expectedVersion + 1;
		const preparedCompensationBenefitsAudit = prepareCompensationBenefitsAudit({
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: meta.correlationId,
			meta,
			entity: "hr_benefit_enrollment",
			entityId: input.enrollmentId,
			action: "UPDATE",
			reasonCode: "BENEFIT_ENROLLMENT_CANCELLED",
			oldValue: {
				status: existing.data.status,
				version: input.expectedVersion,
			},
			newValue: { status: "cancelled", version: nextVersion },
		});
		if (!preparedCompensationBenefitsAudit.ok) {
			return preparedCompensationBenefitsAudit;
		}
		const audit = preparedCompensationBenefitsAudit.data;
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
			const [rows] = await afendaDatabase.transaction((sqlTag) => [
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
								entity_id, action, changes, old_value, new_value, metadata,
							ip_address, user_agent
							)
							SELECT
								${auditId}, ${audit.organizationId}, ${audit.actorUserId}, ${audit.correlationId},
								${audit.module}, ${audit.entity}, ${audit.entityId}, ${audit.action},
								${audit.changesJson}::jsonb, ${audit.oldValueJson}::jsonb,
								${audit.newValueJson}::jsonb, ${audit.metadataJson}::jsonb,
								${audit.ipAddress}, ${audit.userAgent}
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
			]);
			const [row] = rows;
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
			const allRows = await afendaDatabase.client
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
				const mapped = mapBenefitEnrollmentFromDbRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				enrollments.push(mapped.data);
			}
			const totalCount = enrollments.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = enrollments.slice(offset, offset + input.pageSize);
			return errorResult.ok({
				enrollments: paginated,
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		} catch (error) {
			return mapPersistenceFailure(error, "Failed to list benefit enrollments");
		}
	},

	async getApprovedCompensationHandoff(input) {
		const employee = await this.getEmployeeById({
			organizationId: input.organizationId,
			employeeId: input.employeeId,
		});
		if (!employee.ok) {
			return employee;
		}
		if (employee.data === null) {
			return errorResult.fail("NOT_FOUND", {
				publicMessage: "The requested resource was not found",
				internalContext: {
					code: HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				},
			});
		}

		try {
			const compRows = await afendaDatabase.client
				.select()
				.from(hrEmployeeCompensation)
				.where(
					and(
						eq(hrEmployeeCompensation.organizationId, input.organizationId),
						eq(hrEmployeeCompensation.employmentId, input.employmentId),
					),
				);
			const effectiveCompRows = compRows.filter(
				(row) =>
					row.status !== "draft" &&
					row.effectiveFrom <= input.effectiveDate &&
					(row.effectiveTo === null || row.effectiveTo >= input.effectiveDate),
			);
			if (effectiveCompRows.length > 1) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}
			let activeCompensation: EmployeeCompensation | null = null;
			if (effectiveCompRows[0]) {
				const mapped = mapEmployeeCompensation(effectiveCompRows[0]);
				if (!mapped.ok) {
					return mapped;
				}
				activeCompensation = mapped.data;
			}

			const enrollmentRows = await afendaDatabase.client
				.select()
				.from(hrBenefitEnrollment)
				.where(
					and(
						eq(hrBenefitEnrollment.organizationId, input.organizationId),
						eq(hrBenefitEnrollment.employeeId, input.employeeId),
						eq(hrBenefitEnrollment.employmentId, input.employmentId),
					),
				);
			const activeBenefitEnrollments: BenefitEnrollment[] = [];
			for (const row of enrollmentRows.filter(
				(enrollment) =>
					enrollment.status !== "cancelled" &&
					enrollment.effectiveFrom <= input.effectiveDate &&
					(enrollment.effectiveTo === null ||
						enrollment.effectiveTo >= input.effectiveDate),
			)) {
				const mapped = mapBenefitEnrollmentFromDbRow(row);
				if (!mapped.ok) {
					return mapped;
				}
				activeBenefitEnrollments.push(mapped.data);
			}

			const handoff: ApprovedCompensationHandoff = {
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				activeCompensation,
				activeBenefitEnrollments,
			};

			if (!activeCompensation) {
				return errorResult.ok(null);
			}

			return errorResult.ok(handoff);
		} catch (error) {
			return mapPersistenceFailure(
				error,
				"Failed to get approved compensation handoff",
			);
		}
	},
};

export function attachDrizzleCompensationBenefits(
	target: CompensationBenefitsHost,
): void {
	Object.assign(target, drizzleCompensationBenefitsMethods);
}

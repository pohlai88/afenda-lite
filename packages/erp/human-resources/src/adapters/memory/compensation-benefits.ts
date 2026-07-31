import { randomUUID } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";
import {
	HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
} from "@afenda/events/schemas";
import {
	type HumanResourcesApplicationId,
	type HumanResourcesBenefitEnrollmentDependentId,
	type HumanResourcesBenefitEnrollmentId,
	type HumanResourcesBenefitPlanId,
	type HumanResourcesCompensationGradeId,
	type HumanResourcesCompensationGradeProgressionRuleId,
	type HumanResourcesCompensationProposalId,
	type HumanResourcesCompensationReviewCycleId,
	type HumanResourcesCompensationReviewId,
	type HumanResourcesEmployeeCompensationId,
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentId,
	type HumanResourcesSalaryBandId,
	parseHumanResourcesBenefitEnrollmentDependentId,
	parseHumanResourcesBenefitEnrollmentId,
	parseHumanResourcesBenefitPlanId,
	parseHumanResourcesCompensationGradeId,
	parseHumanResourcesCompensationGradeProgressionRuleId,
	parseHumanResourcesCompensationProposalId,
	parseHumanResourcesCompensationReviewId,
	parseHumanResourcesEmployeeCompensationId,
	parseHumanResourcesSalaryBandId,
} from "../../brands";
import { appendRegistryGatedOutbox } from "../../emissions/sql-side-effects";
import {
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import { buildCreateAuditFact } from "../../shared/audit-facts";
import {
	assertBenefitContributionFacts,
	assertEffectiveRange,
	isEmployeeEligibleForBenefitPlan,
	tenureDaysOn,
} from "../../shared/benefit-guards";
import {
	compareMoneyOrder,
	rangesOverlap,
} from "../../shared/compensation-money";
import {
	assertCompensationProposalAmendable,
	assertCompensationProposalStatusTransition,
} from "../../shared/compensation-proposal-guards";
import { compensationReviewAuditSnapshot } from "../../shared/compensation-review-audit";
import { assertReviewCycleOpenForMutation } from "../../shared/compensation-review-guards";
import {
	isBenefitEnrollmentActive,
	isBenefitEnrollmentOpen,
	isBenefitPlanActive,
	isCompensationGradeActive,
	isCompensationGradeProgressionRuleActive,
	isCompensationReviewFinalized,
	isEmployeeCompensationActive,
	isSalaryBandActive,
} from "../../shared/compensation-status";
import { assertExpectedVersion } from "../../shared/concurrency";
import {
	conflict,
	invalidInput,
	invalidState,
	notFound,
} from "../../shared/domain-guards";
import { previousIsoDate } from "../../shared/effective-dates";
import { selectUniqueEffectiveRangeRecord } from "../../shared/effective-range";
import type { HumanResourcesMutationMeta } from "../../shared/mutation-meta";
import { runRollbacks } from "../../shared/rollback";
import type { HumanResourcesStore } from "../../store";
import type { IdempotentCompensationReviewCycleRecord } from "../../store/compensation";
import type {
	ApprovedCompensationHandoff,
	BenefitEnrollment,
	BenefitEnrollmentDependent,
	BenefitEnrollmentListPage,
	BenefitPlan,
	BenefitPlanEligibility,
	BenefitPlanListPage,
	CompensationGrade,
	CompensationGradeListPage,
	CompensationGradeProgressionRule,
	CompensationGradeProgressionRuleListPage,
	CompensationProposal,
	CompensationProposalListPage,
	CompensationReview,
	CompensationReviewCycle,
	CompensationReviewListPage,
	EmployeeCompensation,
	EmployeeCompensationListPage,
	SalaryBand,
	SalaryBandListPage,
} from "../../types";
import {
	createMemoryCompensationReviewCycleMethods,
	createMemoryReviewLifecycleDeps,
	memoryApplyReviewCompensationLink,
	memoryFinalizeCompensationReview,
	memoryRecordCompensationRecommendation,
} from "./compensation-review-cycle";
import type { CoreMemoryState } from "./core";
import {
	memoryActivateEmployeeCompensation,
	memoryAmendEmployeeCompensation,
	memoryApproveEmployeeCompensation,
	memoryCorrectEmployeeCompensation,
	memoryCreateEmployeeCompensation,
	memoryEndEmployeeCompensation,
	memoryFindEmployeeCompensationByEmploymentAsOf,
	memoryNewEmployeeCompensationFromReview,
	memoryScheduleEmployeeCompensationChange,
} from "./employee-compensation-lifecycle";
import type { RecruitmentMemoryState } from "./recruitment";
import { idempotencyMapKey } from "./shared";

function benefitEligibilityMapKey(
	organizationId: string,
	planId: HumanResourcesBenefitPlanId,
): string {
	return `${organizationId}:${planId}`;
}

export interface CompensationBenefitsMemoryState {
	benefitEligibility: Map<string, BenefitPlanEligibility>;
	benefitEnrollmentDependents: Map<
		HumanResourcesBenefitEnrollmentDependentId,
		BenefitEnrollmentDependent
	>;
	benefitEnrollments: Map<HumanResourcesBenefitEnrollmentId, BenefitEnrollment>;
	benefitPlans: Map<HumanResourcesBenefitPlanId, BenefitPlan>;
	compensationGradeProgressionRules: Map<
		HumanResourcesCompensationGradeProgressionRuleId,
		CompensationGradeProgressionRule
	>;
	compensationGrades: Map<HumanResourcesCompensationGradeId, CompensationGrade>;
	compensationIdempotencyByKey: Map<string, EmployeeCompensation>;
	compensationProposals: Map<
		HumanResourcesCompensationProposalId,
		CompensationProposal
	>;
	compensationReviewCycles: Map<
		HumanResourcesCompensationReviewCycleId,
		CompensationReviewCycle
	>;
	compensationReviews: Map<
		HumanResourcesCompensationReviewId,
		CompensationReview
	>;
	cycleIdempotencyByKey: Map<string, IdempotentCompensationReviewCycleRecord>;
	employeeCompensations: Map<
		HumanResourcesEmployeeCompensationId,
		EmployeeCompensation
	>;
	enrollmentIdempotencyByKey: Map<string, BenefitEnrollment>;
	reviewIdempotencyByKey: Map<string, CompensationReview>;
	salaryBands: Map<HumanResourcesSalaryBandId, SalaryBand>;
}

export type MemoryCompensationBenefitsMethods = Pick<
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
	| "endBenefitEnrollment"
	| "cancelBenefitEnrollment"
	| "listBenefitEnrollmentsByEmployee"
	| "waiveBenefit"
	| "getBenefitEnrollmentDependent"
	| "listBenefitEnrollmentDependentsByEnrollment"
	| "addBenefitEnrollmentDependent"
	| "endBenefitEnrollmentDependent"
	| "getApprovedCompensationHandoff"
>;

export function createCompensationBenefitsMemoryState(): CompensationBenefitsMemoryState {
	return {
		compensationGrades: new Map(),
		salaryBands: new Map(),
		compensationGradeProgressionRules: new Map(),
		employeeCompensations: new Map(),
		compensationIdempotencyByKey: new Map(),
		compensationReviews: new Map(),
		compensationReviewCycles: new Map(),
		cycleIdempotencyByKey: new Map(),
		compensationProposals: new Map(),
		reviewIdempotencyByKey: new Map(),
		benefitPlans: new Map(),
		benefitEligibility: new Map(),
		benefitEnrollments: new Map(),
		benefitEnrollmentDependents: new Map(),
		enrollmentIdempotencyByKey: new Map(),
	};
}

export function resetCompensationBenefitsMemoryState(
	state: CompensationBenefitsMemoryState,
): void {
	state.compensationGrades.clear();
	state.salaryBands.clear();
	state.employeeCompensations.clear();
	state.compensationIdempotencyByKey.clear();
	state.compensationReviews.clear();
	state.compensationReviewCycles.clear();
	state.cycleIdempotencyByKey.clear();
	state.compensationProposals.clear();
	state.reviewIdempotencyByKey.clear();
	state.benefitPlans.clear();
	state.benefitEligibility.clear();
	state.benefitEnrollments.clear();
	state.benefitEnrollmentDependents.clear();
	state.enrollmentIdempotencyByKey.clear();
}

export function createMemoryCompensationBenefitsMethods(
	state: CompensationBenefitsMemoryState,
	core: CoreMemoryState,
	recruitment: RecruitmentMemoryState,
): MemoryCompensationBenefitsMethods &
	ThisType<MemoryCompensationBenefitsMethods> {
	const reviewCycleMethods = createMemoryCompensationReviewCycleMethods(state);
	const reviewLifecycleDeps = createMemoryReviewLifecycleDeps(state);

	return {
		...reviewCycleMethods,
		async getCompensationGrade(input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
		}): Promise<Result<CompensationGrade | null>> {
			const grade = state.compensationGrades.get(input.gradeId);
			if (!grade || grade.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...grade });
		},

		async findCompensationGradeByCode(input: {
			organizationId: string;
			code: string;
		}): Promise<Result<CompensationGrade | null>> {
			const grade =
				Array.from(state.compensationGrades.values()).find(
					(g) =>
						g.organizationId === input.organizationId && g.code === input.code,
				) ?? null;
			return await errorResult.ok(grade === null ? null : { ...grade });
		},

		async createCompensationGrade(
			record: {
				organizationId: string;
				code: string;
				name: string;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<CompensationGrade>> {
			const existing = Array.from(state.compensationGrades.values()).find(
				(g) =>
					g.organizationId === record.organizationId && g.code === record.code,
			);
			if (existing) {
				return conflict("Compensation grade code already exists");
			}

			const idResult = parseHumanResourcesCompensationGradeId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}
			const id = idResult.data;

			const now = new Date();
			const grade: CompensationGrade = {
				id,
				organizationId: record.organizationId,
				code: record.code,
				name: record.name,
				status: "active",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.compensationGrades.set(id, grade);

			const audit = await ports.audit.record({
				organizationId: grade.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_compensation_grade",
				entityId: grade.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.compensationGrades.delete(id);
				return audit;
			}

			return errorResult.ok({ ...grade });
		},

		async updateCompensationGrade(
			input: {
				organizationId: string;
				gradeId: HumanResourcesCompensationGradeId;
				name?: string | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<CompensationGrade>> {
			const grade = state.compensationGrades.get(input.gradeId);
			if (!grade || grade.organizationId !== input.organizationId) {
				return notFound(
					"Compensation grade not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				grade.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const previous = { ...grade };
			const updated: CompensationGrade = {
				...grade,
				name: input.name ?? grade.name,
				version: grade.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.compensationGrades.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_compensation_grade",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.compensationGrades.set(updated.id, previous);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async archiveCompensationGrade(
			input: {
				organizationId: string;
				gradeId: HumanResourcesCompensationGradeId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<CompensationGrade>> {
			const grade = state.compensationGrades.get(input.gradeId);
			if (!grade || grade.organizationId !== input.organizationId) {
				return notFound(
					"Compensation grade not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				grade.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const activeReferences = Array.from(state.salaryBands.values()).some(
				(band) =>
					band.organizationId === input.organizationId &&
					band.gradeId === input.gradeId &&
					isSalaryBandActive(band.status),
			);
			if (activeReferences) {
				return invalidState(
					"Cannot archive grade while active salary bands reference it",
				);
			}

			const now = new Date();
			const previous = { ...grade };
			const updated: CompensationGrade = {
				...grade,
				status: "archived",
				version: grade.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.compensationGrades.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_compensation_grade",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.compensationGrades.set(updated.id, previous);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async listCompensationGrades(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: string | undefined;
		}): Promise<Result<CompensationGradeListPage>> {
			let grades = Array.from(state.compensationGrades.values()).filter(
				(g) => g.organizationId === input.organizationId,
			);
			if (input.status) {
				grades = grades.filter((g) => g.status === input.status);
			}
			grades.sort((a, b) => a.code.localeCompare(b.code));
			const totalCount = grades.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = grades.slice(offset, offset + input.pageSize);
			return await errorResult.ok({
				grades: paginated.map((g) => ({ ...g })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// Salary Band
		async getSalaryBand(input: {
			organizationId: string;
			salaryBandId: HumanResourcesSalaryBandId;
		}): Promise<Result<SalaryBand | null>> {
			const band = state.salaryBands.get(input.salaryBandId);
			if (!band || band.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...band });
		},

		async createSalaryBand(
			record: {
				organizationId: string;
				gradeId: HumanResourcesCompensationGradeId;
				currencyCode: string;
				minAmount: string;
				midAmount: string;
				maxAmount: string;
				effectiveFrom: string;
				effectiveTo: string | null;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<SalaryBand>> {
			const grade = state.compensationGrades.get(record.gradeId);
			if (!grade || grade.organizationId !== record.organizationId) {
				return notFound(
					"Compensation grade not found or cross-org reference",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (!isCompensationGradeActive(grade.status)) {
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

			const overlapping = Array.from(state.salaryBands.values()).find(
				(bandValue) =>
					bandValue.organizationId === record.organizationId &&
					bandValue.gradeId === record.gradeId &&
					bandValue.currencyCode === record.currencyCode &&
					(bandValue.status === "active" ||
						bandValue.status === "superseded") &&
					rangesOverlap(
						bandValue.effectiveFrom,
						bandValue.effectiveTo,
						record.effectiveFrom,
						record.effectiveTo,
					),
			);
			if (overlapping) {
				return conflict(
					"Overlapping salary band exists for this grade and currency",
				);
			}

			const idResult = parseHumanResourcesSalaryBandId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}
			const id = idResult.data;

			const now = new Date();
			const band: SalaryBand = {
				id,
				organizationId: record.organizationId,
				gradeId: record.gradeId,
				currencyCode: record.currencyCode,
				minAmount: record.minAmount,
				midAmount: record.midAmount,
				maxAmount: record.maxAmount,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				supersedesSalaryBandId: null,
				status: "active",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.salaryBands.set(id, band);

			const audit = await ports.audit.record({
				organizationId: band.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_salary_band",
				entityId: band.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.salaryBands.delete(id);
				return audit;
			}

			return errorResult.ok({ ...band });
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async supersedeSalaryBand(
			input: {
				organizationId: string;
				gradeId: HumanResourcesCompensationGradeId;
				currencyCode: string;
				minAmount: string;
				midAmount: string;
				maxAmount: string;
				effectiveFrom: string;
				effectiveTo: string | null;
				supersededSalaryBandId?: HumanResourcesSalaryBandId | undefined;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<{ superseded: SalaryBand; successor: SalaryBand }>> {
			const grade = state.compensationGrades.get(input.gradeId);
			if (!grade || grade.organizationId !== input.organizationId) {
				return notFound(
					"Compensation grade not found or cross-org reference",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const moneyCheck = compareMoneyOrder(
				input.minAmount,
				input.midAmount,
				input.maxAmount,
			);
			if (!moneyCheck.ok) {
				return moneyCheck;
			}

			let predecessor: SalaryBand | undefined;
			if (input.supersededSalaryBandId) {
				const band = state.salaryBands.get(input.supersededSalaryBandId);
				if (!band || band.organizationId !== input.organizationId) {
					return notFound(
						"Salary band not found",
						HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
					);
				}
				predecessor = band;
			} else {
				const activeBands = Array.from(state.salaryBands.values()).filter(
					(band) =>
						band.organizationId === input.organizationId &&
						band.gradeId === input.gradeId &&
						band.currencyCode === input.currencyCode &&
						isSalaryBandActive(band.status),
				);
				if (activeBands.length === 0) {
					return notFound("No active salary band to supersede");
				}
				if (activeBands.length > 1) {
					return conflict(
						"Ambiguous active salary band for grade and currency",
					);
				}
				[predecessor] = activeBands;
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
			const closedPredecessor: SalaryBand = {
				...predecessor,
				effectiveTo: predecessorEffectiveTo,
				status: "superseded",
			};

			const others = Array.from(state.salaryBands.values()).filter(
				(band) =>
					band.organizationId === input.organizationId &&
					band.gradeId === input.gradeId &&
					band.currencyCode === input.currencyCode &&
					(band.status === "active" || band.status === "superseded") &&
					band.id !== predecessor.id,
			);
			for (const other of others) {
				if (
					rangesOverlap(
						other.effectiveFrom,
						other.effectiveTo,
						input.effectiveFrom,
						input.effectiveTo,
					)
				) {
					return conflict(
						"Overlapping salary band exists for this grade and currency",
					);
				}
			}
			if (
				rangesOverlap(
					closedPredecessor.effectiveFrom,
					closedPredecessor.effectiveTo,
					input.effectiveFrom,
					input.effectiveTo,
				)
			) {
				return conflict(
					"Overlapping salary band exists for this grade and currency",
				);
			}

			const idResult = parseHumanResourcesSalaryBandId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}
			const id = idResult.data;

			const now = new Date();
			const newBand: SalaryBand = {
				id,
				organizationId: input.organizationId,
				gradeId: input.gradeId,
				currencyCode: input.currencyCode,
				minAmount: input.minAmount,
				midAmount: input.midAmount,
				maxAmount: input.maxAmount,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: input.effectiveTo,
				supersedesSalaryBandId: predecessor.id,
				status: "active",
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};

			const previousPredecessor = { ...predecessor };
			const supersededBand: SalaryBand = {
				...predecessor,
				effectiveTo: predecessorEffectiveTo,
				status: "superseded",
				version: predecessor.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};

			state.salaryBands.set(supersededBand.id, supersededBand);
			state.salaryBands.set(id, newBand);

			const rollback: Array<() => void> = [
				() => state.salaryBands.delete(id),
				() => state.salaryBands.set(predecessor.id, previousPredecessor),
			];

			const auditNew = await ports.audit.record({
				organizationId: newBand.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_salary_band",
				entityId: newBand.id,
				action: "CREATE",
				changes: [],
			});
			if (!auditNew.ok) {
				runRollbacks(rollback);
				return auditNew;
			}

			const auditSupersede = await ports.audit.record({
				organizationId: supersededBand.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_salary_band",
				entityId: supersededBand.id,
				action: "UPDATE",
				changes: [],
			});
			if (!auditSupersede.ok) {
				runRollbacks(rollback);
				return auditSupersede;
			}

			return errorResult.ok({
				superseded: { ...supersededBand },
				successor: { ...newBand },
			});
		},

		async archiveSalaryBand(
			input: {
				organizationId: string;
				salaryBandId: HumanResourcesSalaryBandId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<SalaryBand>> {
			const band = state.salaryBands.get(input.salaryBandId);
			if (!band || band.organizationId !== input.organizationId) {
				return notFound(
					"Salary band not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				band.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const previous = { ...band };
			const updated: SalaryBand = {
				...band,
				status: "archived",
				version: band.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.salaryBands.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_salary_band",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.salaryBands.set(updated.id, previous);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async listSalaryBandsByGrade(input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			page: number;
			pageSize: number;
			status?: string | undefined;
		}): Promise<Result<SalaryBandListPage>> {
			const grade = state.compensationGrades.get(input.gradeId);
			if (!grade || grade.organizationId !== input.organizationId) {
				return await notFound(
					"Compensation grade not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			let bands = Array.from(state.salaryBands.values()).filter(
				(b) =>
					b.organizationId === input.organizationId &&
					b.gradeId === input.gradeId,
			);
			if (input.status) {
				bands = bands.filter((b) => b.status === input.status);
			}
			bands.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
			const totalCount = bands.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = bands.slice(offset, offset + input.pageSize);
			return await errorResult.ok({
				bands: paginated.map((b) => ({ ...b })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async findSalaryBandByGradeAndCurrencyAsOf(input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			currencyCode: string;
			asOf: string;
		}): Promise<Result<SalaryBand | null>> {
			const records = Array.from(state.salaryBands.values()).filter(
				(band) =>
					band.organizationId === input.organizationId &&
					band.gradeId === input.gradeId &&
					band.currencyCode === input.currencyCode &&
					(band.status === "active" || band.status === "superseded"),
			);
			const selected = selectUniqueEffectiveRangeRecord({
				records,
				asOf: input.asOf,
			});
			return await errorResult.ok(selected === null ? null : { ...selected });
		},

		async getCompensationGradeProgressionRule(input: {
			organizationId: string;
			progressionRuleId: HumanResourcesCompensationGradeProgressionRuleId;
		}): Promise<Result<CompensationGradeProgressionRule | null>> {
			const rule = state.compensationGradeProgressionRules.get(
				input.progressionRuleId,
			);
			if (!rule || rule.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...rule });
		},

		async createCompensationGradeProgressionRule(
			record: {
				organizationId: string;
				fromGradeId: HumanResourcesCompensationGradeId;
				toGradeId: HumanResourcesCompensationGradeId;
				effectiveFrom: string;
				effectiveTo: string | null;
				minMonthsInGrade: number | null;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<CompensationGradeProgressionRule>> {
			if (record.fromGradeId === record.toGradeId) {
				return invalidInput("fromGradeId and toGradeId must differ");
			}

			const fromGrade = state.compensationGrades.get(record.fromGradeId);
			if (!fromGrade || fromGrade.organizationId !== record.organizationId) {
				return notFound("From compensation grade not found");
			}
			const toGrade = state.compensationGrades.get(record.toGradeId);
			if (!toGrade || toGrade.organizationId !== record.organizationId) {
				return notFound("To compensation grade not found");
			}
			if (
				!(
					isCompensationGradeActive(fromGrade.status) &&
					isCompensationGradeActive(toGrade.status)
				)
			) {
				return invalidState("Grades must be active");
			}

			const overlapping = Array.from(
				state.compensationGradeProgressionRules.values(),
			).some(
				(ruleValue) =>
					ruleValue.organizationId === record.organizationId &&
					ruleValue.fromGradeId === record.fromGradeId &&
					ruleValue.toGradeId === record.toGradeId &&
					isCompensationGradeProgressionRuleActive(ruleValue.status) &&
					rangesOverlap(
						ruleValue.effectiveFrom,
						ruleValue.effectiveTo,
						record.effectiveFrom,
						record.effectiveTo,
					),
			);
			if (overlapping) {
				return conflict(
					"Overlapping progression rule exists for this grade transition",
				);
			}

			const idResult = parseHumanResourcesCompensationGradeProgressionRuleId(
				randomUUID(),
			);
			if (!idResult.ok) {
				return idResult;
			}

			const now = new Date();
			const rule: CompensationGradeProgressionRule = {
				id: idResult.data,
				organizationId: record.organizationId,
				fromGradeId: record.fromGradeId,
				toGradeId: record.toGradeId,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				minMonthsInGrade: record.minMonthsInGrade,
				status: "active",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.compensationGradeProgressionRules.set(rule.id, rule);

			const audit = await ports.audit.record({
				organizationId: rule.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_compensation_grade_progression_rule",
				entityId: rule.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.compensationGradeProgressionRules.delete(rule.id);
				return audit;
			}

			return errorResult.ok({ ...rule });
		},

		async archiveCompensationGradeProgressionRule(
			input: {
				organizationId: string;
				progressionRuleId: HumanResourcesCompensationGradeProgressionRuleId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<CompensationGradeProgressionRule>> {
			const rule = state.compensationGradeProgressionRules.get(
				input.progressionRuleId,
			);
			if (!rule || rule.organizationId !== input.organizationId) {
				return notFound("Progression rule not found");
			}
			const versionCheck = assertExpectedVersion(
				rule.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const previous = { ...rule };
			const updated: CompensationGradeProgressionRule = {
				...rule,
				status: "archived",
				version: rule.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.compensationGradeProgressionRules.set(updated.id, updated);

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_compensation_grade_progression_rule",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				state.compensationGradeProgressionRules.set(updated.id, previous);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async listCompensationGradeProgressionRulesFromGrade(input: {
			organizationId: string;
			fromGradeId: HumanResourcesCompensationGradeId;
			page: number;
			pageSize: number;
			asOf?: string | undefined;
		}): Promise<Result<CompensationGradeProgressionRuleListPage>> {
			let rules = Array.from(
				state.compensationGradeProgressionRules.values(),
			).filter(
				(rule) =>
					rule.organizationId === input.organizationId &&
					rule.fromGradeId === input.fromGradeId &&
					isCompensationGradeProgressionRuleActive(rule.status),
			);
			if (input.asOf) {
				rules = rules.filter((rule) => {
					const selected = selectUniqueEffectiveRangeRecord({
						records: [rule],
						asOf: input.asOf as string,
					});
					return selected !== null;
				});
			}
			rules.sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
			const totalCount = rules.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = rules.slice(offset, offset + input.pageSize);
			return await errorResult.ok({
				rules: paginated.map((rule) => ({ ...rule })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async listEligibleProgressionTargets(input: {
			organizationId: string;
			fromGradeId: HumanResourcesCompensationGradeId;
			asOf: string;
		}): Promise<Result<CompensationGradeProgressionRule[]>> {
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

		// Employee Compensation
		async getEmployeeCompensation(input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
		}): Promise<Result<EmployeeCompensation | null>> {
			const comp = state.employeeCompensations.get(input.compensationId);
			if (!comp || comp.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...comp });
		},

		async findEmployeeCompensationByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<EmployeeCompensation | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const comp = state.compensationIdempotencyByKey.get(key);
			return await errorResult.ok(comp === undefined ? null : { ...comp });
		},

		async createEmployeeCompensation(record, ports, meta) {
			return await memoryCreateEmployeeCompensation(
				state,
				core,
				record,
				ports,
				meta,
			);
		},

		async amendEmployeeCompensation(input, ports, meta) {
			return await memoryAmendEmployeeCompensation(
				state,
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
			return await memoryApproveEmployeeCompensation(state, input, ports, meta);
		},

		async scheduleEmployeeCompensationChange(input, ports, meta) {
			return await memoryScheduleEmployeeCompensationChange(
				state,
				core,
				input,
				ports,
				meta,
			);
		},

		async activateEmployeeCompensation(input, ports, meta) {
			return await memoryActivateEmployeeCompensation(
				state,
				input,
				ports,
				meta,
			);
		},

		async correctEmployeeCompensation(input, ports, meta) {
			return await memoryCorrectEmployeeCompensation(
				state,
				core,
				input,
				ports,
				meta,
			);
		},

		async endEmployeeCompensation(input, ports, meta) {
			return await memoryEndEmployeeCompensation(state, input, ports, meta);
		},

		async listEmployeeCompensationsByEmployee(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			page: number;
			pageSize: number;
		}): Promise<Result<EmployeeCompensationListPage>> {
			const compensations = Array.from(
				state.employeeCompensations.values(),
			).filter(
				(c) =>
					c.organizationId === input.organizationId &&
					c.employeeId === input.employeeId,
			);
			compensations.sort((a, b) =>
				b.effectiveFrom.localeCompare(a.effectiveFrom),
			);
			const totalCount = compensations.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = compensations.slice(offset, offset + input.pageSize);
			return await errorResult.ok({
				compensations: paginated.map((c) => ({ ...c })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async findActiveEmployeeCompensationByEmployment(input: {
			organizationId: string;
			employmentId: HumanResourcesEmploymentId;
		}): Promise<Result<EmployeeCompensation | null>> {
			const comp =
				Array.from(state.employeeCompensations.values()).find(
					(c) =>
						c.organizationId === input.organizationId &&
						c.employmentId === input.employmentId &&
						isEmployeeCompensationActive(c.status),
				) ?? null;
			return await errorResult.ok(comp === null ? null : { ...comp });
		},

		async findEmployeeCompensationByEmploymentAsOf(input) {
			const selected = memoryFindEmployeeCompensationByEmploymentAsOf(
				state,
				input,
			);
			return await errorResult.ok(selected === null ? null : { ...selected });
		},

		// --- Compensation Review ---

		async getCompensationReview(input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
		}): Promise<Result<CompensationReview | null>> {
			const review = state.compensationReviews.get(input.reviewId) ?? null;
			if (review && review.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok(review === null ? null : { ...review });
		},

		async findCompensationReviewByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<CompensationReview | null>> {
			const key = `${input.organizationId}:${input.idempotencyKey}`;
			const review = state.reviewIdempotencyByKey.get(key) ?? null;
			return await errorResult.ok(review === null ? null : { ...review });
		},

		async createCompensationReviewDraft(
			record: {
				organizationId: string;
				cycleId: HumanResourcesCompensationReviewCycleId;
				employeeId: HumanResourcesEmployeeId;
				employmentId: HumanResourcesEmploymentId;
				createIdempotencyKey: string;
				createRequestFingerprint: string;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<CompensationReview>> {
			const key = `${record.organizationId}:${record.createIdempotencyKey}`;
			const existing = state.reviewIdempotencyByKey.get(key);
			if (
				existing &&
				existing.fingerprint === record.createRequestFingerprint
			) {
				return errorResult.ok({ ...existing });
			}
			if (existing) {
				return conflict("Idempotency key already used with different data");
			}

			const employee = core.employees.get(record.employeeId);
			if (!employee || employee.organizationId !== record.organizationId) {
				return notFound(
					"Employee not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const employment = core.employments.get(record.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return notFound(
					"Employment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const cycle = state.compensationReviewCycles.get(record.cycleId);
			if (!cycle || cycle.organizationId !== record.organizationId) {
				return notFound(
					"Compensation review cycle not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const openCycle = assertReviewCycleOpenForMutation(cycle.status);
			if (!openCycle.ok) {
				return openCycle;
			}

			const idResult = parseHumanResourcesCompensationReviewId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}
			const id = idResult.data;

			const now = new Date();
			const review: CompensationReview = {
				id,
				organizationId: record.organizationId,
				cycleId: record.cycleId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				status: "draft",
				proposedBaseAmount: null,
				proposedCurrencyCode: null,
				proposedGradeId: null,
				proposedSalaryBandId: null,
				recommendationNote: null,
				effectiveFrom: null,
				finalizedAt: null,
				appliedCompensationId: null,
				createIdempotencyKey: record.createIdempotencyKey,
				fingerprint: record.createRequestFingerprint,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.compensationReviews.set(id, review);
			state.reviewIdempotencyByKey.set(key, review);

			const audit = await ports.audit.record(
				buildCreateAuditFact({
					context: {
						organizationId: review.organizationId,
						actorUserId: record.createdBy,
						entity: "hr_compensation_review",
						entityId: review.id,
						meta,
					},
					newValue: compensationReviewAuditSnapshot(review),
				}),
			);
			if (!audit.ok) {
				state.compensationReviews.delete(id);
				state.reviewIdempotencyByKey.delete(key);
				return audit;
			}

			return errorResult.ok({ ...review });
		},

		async recordCompensationRecommendation(input, ports, meta) {
			return await memoryRecordCompensationRecommendation(
				state,
				reviewLifecycleDeps,
				input,
				ports,
				meta,
			);
		},

		async finalizeCompensationReview(input, ports, meta) {
			return await memoryFinalizeCompensationReview(
				state,
				reviewLifecycleDeps,
				input,
				ports,
				meta,
			);
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async applyApprovedCompensationResult(
			input: {
				organizationId: string;
				reviewId: HumanResourcesCompensationReviewId;
				reason: string;
				createIdempotencyKey: string;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<EmployeeCompensation>> {
			const review = state.compensationReviews.get(input.reviewId);
			if (!review) {
				return notFound(
					"Compensation review not found",
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				);
			}
			if (review.organizationId !== input.organizationId) {
				return notFound(
					"Compensation review not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (!isCompensationReviewFinalized(review.status)) {
				return invalidState("Compensation review is not finalized");
			}

			if (
				!(
					review.proposedBaseAmount &&
					review.proposedCurrencyCode &&
					review.effectiveFrom
				)
			) {
				return invalidState(
					"Review must have proposed amount, currency, and effective date",
				);
			}

			const employment = core.employments.get(review.employmentId);
			if (!employment || employment.organizationId !== input.organizationId) {
				return notFound(
					"Employment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const activeComp = Array.from(state.employeeCompensations.values()).find(
				(c) =>
					c.organizationId === input.organizationId &&
					c.employmentId === review.employmentId &&
					isEmployeeCompensationActive(c.status),
			);

			const rollback: Array<() => void> = [];

			if (activeComp) {
				const previous = { ...activeComp };
				const ended: EmployeeCompensation = {
					...activeComp,
					status: "ended",
					effectiveTo: review.effectiveFrom,
					version: activeComp.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: new Date(),
				};
				state.employeeCompensations.set(ended.id, ended);
				rollback.push(() =>
					state.employeeCompensations.set(ended.id, previous),
				);

				const audit = await ports.audit.record({
					organizationId: ended.organizationId,
					actorUserId: input.actorUserId,
					correlationId: meta.correlationId,
					entity: "hr_employee_compensation",
					entityId: ended.id,
					action: "UPDATE",
					changes: [],
				});
				if (!audit.ok) {
					runRollbacks(rollback);
					return audit;
				}

				const outbox = await ports.outbox.append({
					organizationId: ended.organizationId,
					actorUserId: input.actorUserId,
					correlationId: meta.correlationId,
					type: HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
					payload: {
						organizationId: ended.organizationId,
						entityType: "hr_employee_compensation",
						entityId: ended.id,
						actorId: input.actorUserId,
						correlationId: meta.correlationId,
					},
				});
				if (!outbox.ok) {
					runRollbacks(rollback);
					return outbox;
				}
			}

			const idResult = parseHumanResourcesEmployeeCompensationId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}
			const id = idResult.data;

			const newComp = memoryNewEmployeeCompensationFromReview({
				organizationId: input.organizationId,
				employeeId: review.employeeId,
				employmentId: review.employmentId,
				gradeId: review.proposedGradeId,
				salaryBandId: review.proposedSalaryBandId,
				baseAmount: review.proposedBaseAmount,
				currencyCode: review.proposedCurrencyCode,
				effectiveFrom: review.effectiveFrom,
				reason: input.reason,
				sourceReviewId: input.reviewId,
				createIdempotencyKey: input.createIdempotencyKey,
				fingerprint: `${review.effectiveFrom}:${review.proposedBaseAmount}:${review.proposedCurrencyCode}`,
				actorUserId: input.actorUserId,
			});
			newComp.id = id;
			state.employeeCompensations.set(id, newComp);
			const key = `${newComp.organizationId}:${newComp.createIdempotencyKey}`;
			state.compensationIdempotencyByKey.set(key, newComp);
			rollback.push(() => {
				state.employeeCompensations.delete(id);
				state.compensationIdempotencyByKey.delete(key);
			});

			const audit = await ports.audit.record({
				organizationId: newComp.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employee_compensation",
				entityId: newComp.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: newComp.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
				payload: {
					organizationId: newComp.organizationId,
					entityType: "hr_employee_compensation",
					entityId: newComp.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			const linked = memoryApplyReviewCompensationLink(
				state,
				input.reviewId,
				id,
				input.actorUserId,
			);
			if (!linked.ok) {
				runRollbacks(rollback);
				return linked;
			}

			return errorResult.ok({ ...newComp });
		},

		async listCompensationReviewsByEmployee(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			page: number;
			pageSize: number;
		}): Promise<Result<CompensationReviewListPage>> {
			const reviews = Array.from(state.compensationReviews.values()).filter(
				(r) =>
					r.organizationId === input.organizationId &&
					r.employeeId === input.employeeId,
			);
			reviews.sort((a, b) => {
				const aDate = a.createdAt.toISOString();
				const bDate = b.createdAt.toISOString();
				return bDate.localeCompare(aDate);
			});
			const totalCount = reviews.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = reviews.slice(offset, offset + input.pageSize);
			return await errorResult.ok({
				reviews: paginated.map((r) => ({ ...r })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// --- Compensation Proposal ---

		async getCompensationProposal(input: {
			organizationId: string;
			proposalId: HumanResourcesCompensationProposalId;
		}): Promise<Result<CompensationProposal | null>> {
			const proposal =
				state.compensationProposals.get(input.proposalId) ?? null;
			if (proposal && proposal.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok(proposal === null ? null : { ...proposal });
		},

		async createCompensationProposal(
			record: {
				organizationId: string;
				applicationId: HumanResourcesApplicationId;
				proposedBaseAmount: string | null;
				proposedCurrencyCode: string | null;
				proposedGradeId: HumanResourcesCompensationGradeId | null;
				proposedSalaryBandId: HumanResourcesSalaryBandId | null;
				confidentialNote: string | null;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<CompensationProposal>> {
			const application = recruitment.applications.get(record.applicationId);
			if (application === undefined) {
				return notFound("Application not found");
			}
			if (application.organizationId !== record.organizationId) {
				return notFound(
					"Application not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const idResult = parseHumanResourcesCompensationProposalId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}
			const id = idResult.data;

			const now = new Date();
			const proposal: CompensationProposal = {
				id,
				organizationId: record.organizationId,
				applicationId: record.applicationId,
				status: "draft",
				proposedBaseAmount: record.proposedBaseAmount,
				proposedCurrencyCode: record.proposedCurrencyCode,
				proposedGradeId: record.proposedGradeId,
				proposedSalaryBandId: record.proposedSalaryBandId,
				confidentialNote: record.confidentialNote,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.compensationProposals.set(id, proposal);

			const audit = await ports.audit.record({
				organizationId: proposal.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_compensation_proposal",
				entityId: proposal.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.compensationProposals.delete(id);
				return audit;
			}

			return errorResult.ok({ ...proposal });
		},

		async amendCompensationProposal(
			input: {
				organizationId: string;
				proposalId: HumanResourcesCompensationProposalId;
				proposedBaseAmount?: string | null | undefined;
				proposedCurrencyCode?: string | null | undefined;
				proposedGradeId?: HumanResourcesCompensationGradeId | null | undefined;
				proposedSalaryBandId?: HumanResourcesSalaryBandId | null | undefined;
				confidentialNote?: string | null | undefined;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<CompensationProposal>> {
			const proposal = state.compensationProposals.get(input.proposalId);
			if (!proposal) {
				return notFound(
					"Compensation proposal not found",
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				);
			}
			if (proposal.organizationId !== input.organizationId) {
				return notFound(
					"Compensation proposal not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				proposal.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const amendable = assertCompensationProposalAmendable(proposal.status);
			if (!amendable.ok) {
				return amendable;
			}

			const now = new Date();
			const previous = { ...proposal };
			const updated: CompensationProposal = {
				...proposal,
				proposedBaseAmount:
					input.proposedBaseAmount === undefined
						? proposal.proposedBaseAmount
						: input.proposedBaseAmount,
				proposedCurrencyCode:
					input.proposedCurrencyCode === undefined
						? proposal.proposedCurrencyCode
						: input.proposedCurrencyCode,
				proposedGradeId:
					input.proposedGradeId === undefined
						? proposal.proposedGradeId
						: input.proposedGradeId,
				proposedSalaryBandId:
					input.proposedSalaryBandId === undefined
						? proposal.proposedSalaryBandId
						: input.proposedSalaryBandId,
				confidentialNote:
					input.confidentialNote === undefined
						? proposal.confidentialNote
						: input.confidentialNote,
				version: proposal.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.compensationProposals.set(updated.id, updated);

			const rollback: Array<() => void> = [
				() => state.compensationProposals.set(updated.id, previous),
			];

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_compensation_proposal",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async approveCompensationProposal(
			input: {
				organizationId: string;
				proposalId: HumanResourcesCompensationProposalId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<CompensationProposal>> {
			const proposal = state.compensationProposals.get(input.proposalId);
			if (!proposal) {
				return notFound(
					"Compensation proposal not found",
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				);
			}
			if (proposal.organizationId !== input.organizationId) {
				return notFound(
					"Compensation proposal not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				proposal.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (!(proposal.proposedBaseAmount && proposal.proposedCurrencyCode)) {
				return invalidState(
					"Proposal must have proposed base amount and currency before approval",
				);
			}
			const transition = assertCompensationProposalStatusTransition(
				proposal.status,
				"approved",
			);
			if (!transition.ok) {
				return transition;
			}

			const now = new Date();
			const previous = { ...proposal };
			const updated: CompensationProposal = {
				...proposal,
				status: "approved",
				version: proposal.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.compensationProposals.set(updated.id, updated);

			const rollback: Array<() => void> = [
				() => state.compensationProposals.set(updated.id, previous),
			];

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_compensation_proposal",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await appendRegistryGatedOutbox(ports, {
				commandId: meta.operationId,
				meta,
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				aggregateId: updated.id,
				eventEntityType: "hr_compensation_proposal",
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return errorResult.ok({ ...updated });
		},

		async listCompensationProposals(input: {
			organizationId: string;
			applicationId?: HumanResourcesApplicationId | undefined;
			page: number;
			pageSize: number;
		}): Promise<Result<CompensationProposalListPage>> {
			let proposals = Array.from(state.compensationProposals.values()).filter(
				(proposal) => proposal.organizationId === input.organizationId,
			);
			if (input.applicationId) {
				proposals = proposals.filter(
					(proposal) => proposal.applicationId === input.applicationId,
				);
			}
			proposals.sort((a, b) => {
				const aDate = a.createdAt.toISOString();
				const bDate = b.createdAt.toISOString();
				return bDate.localeCompare(aDate);
			});
			const totalCount = proposals.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = proposals.slice(offset, offset + input.pageSize);
			return await errorResult.ok({
				proposals: paginated.map((proposal) => ({ ...proposal })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// --- Benefit Plan ---

		async getBenefitPlan(input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
		}): Promise<Result<BenefitPlan | null>> {
			const plan = state.benefitPlans.get(input.planId) ?? null;
			if (plan && plan.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok(plan === null ? null : { ...plan });
		},

		async findBenefitPlanByCode(input: {
			organizationId: string;
			code: string;
		}): Promise<Result<BenefitPlan | null>> {
			const plan =
				Array.from(state.benefitPlans.values()).find(
					(p) =>
						p.organizationId === input.organizationId && p.code === input.code,
				) ?? null;
			return await errorResult.ok(plan === null ? null : { ...plan });
		},

		async createBenefitPlan(
			record: {
				organizationId: string;
				code: string;
				name: string;
				eligibilityNote: string | null;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<BenefitPlan>> {
			const existing = Array.from(state.benefitPlans.values()).find(
				(p) =>
					p.organizationId === record.organizationId && p.code === record.code,
			);
			if (existing) {
				return conflict("Benefit plan code already exists");
			}

			const idResult = parseHumanResourcesBenefitPlanId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}
			const id = idResult.data;
			const now = new Date();
			const plan: BenefitPlan = {
				id,
				organizationId: record.organizationId,
				code: record.code,
				name: record.name,
				eligibilityNote: record.eligibilityNote,
				status: "active",
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.benefitPlans.set(id, plan);

			const audit = await ports.audit.record({
				organizationId: plan.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_benefit_plan",
				entityId: plan.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.benefitPlans.delete(id);
				return audit;
			}

			return errorResult.ok({ ...plan });
		},

		async updateBenefitPlan(
			input: {
				organizationId: string;
				planId: HumanResourcesBenefitPlanId;
				name?: string | undefined;
				eligibilityNote?: string | null | undefined;
				actorUserId: string;
				expectedVersion: number;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<BenefitPlan>> {
			const plan = state.benefitPlans.get(input.planId);
			if (!plan) {
				return notFound("Benefit plan not found");
			}
			if (plan.organizationId !== input.organizationId) {
				return notFound(
					"Benefit plan not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				plan.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const now = new Date();
			const previous = { ...plan };
			const updated: BenefitPlan = {
				...plan,
				name: input.name ?? plan.name,
				eligibilityNote:
					input.eligibilityNote === undefined
						? plan.eligibilityNote
						: input.eligibilityNote,
				version: plan.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.benefitPlans.set(updated.id, updated);

			const rollback: Array<() => void> = [
				() => state.benefitPlans.set(updated.id, previous),
			];

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_benefit_plan",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async archiveBenefitPlan(
			input: {
				organizationId: string;
				planId: HumanResourcesBenefitPlanId;
				actorUserId: string;
				expectedVersion: number;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<BenefitPlan>> {
			const plan = state.benefitPlans.get(input.planId);
			if (!plan) {
				return notFound("Benefit plan not found");
			}
			if (plan.organizationId !== input.organizationId) {
				return notFound(
					"Benefit plan not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				plan.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}

			const openEnrollment = Array.from(state.benefitEnrollments.values()).find(
				(enrollment) =>
					enrollment.organizationId === input.organizationId &&
					enrollment.planId === input.planId &&
					isBenefitEnrollmentOpen(enrollment.status),
			);
			if (openEnrollment) {
				return conflict(
					"Benefit plan cannot be archived while open enrollments exist",
				);
			}

			const now = new Date();
			const previous = { ...plan };
			const updated: BenefitPlan = {
				...plan,
				status: "archived",
				version: plan.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.benefitPlans.set(updated.id, updated);

			const rollback: Array<() => void> = [
				() => state.benefitPlans.set(updated.id, previous),
			];

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_benefit_plan",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		async listBenefitPlans(input: {
			organizationId: string;
			page: number;
			pageSize: number;
		}): Promise<Result<BenefitPlanListPage>> {
			const plans = Array.from(state.benefitPlans.values()).filter(
				(p) => p.organizationId === input.organizationId,
			);
			plans.sort((a, b) => a.code.localeCompare(b.code));
			const totalCount = plans.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = plans.slice(offset, offset + input.pageSize);
			return await errorResult.ok({
				plans: paginated.map((p) => ({ ...p })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async getBenefitPlanEligibility(input: {
			organizationId: string;
			planId: HumanResourcesBenefitPlanId;
		}): Promise<Result<BenefitPlanEligibility | null>> {
			const eligibility =
				state.benefitEligibility.get(
					benefitEligibilityMapKey(input.organizationId, input.planId),
				) ?? null;
			return await errorResult.ok(
				eligibility === null ? null : { ...eligibility },
			);
		},

		async setBenefitPlanEligibility(
			input: {
				organizationId: string;
				planId: HumanResourcesBenefitPlanId;
				minTenureDays: number | null;
				allowedEmploymentStatuses: BenefitPlanEligibility["allowedEmploymentStatuses"];
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<BenefitPlanEligibility>> {
			const plan = state.benefitPlans.get(input.planId);
			if (!plan || plan.organizationId !== input.organizationId) {
				return notFound(
					"Benefit plan not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const key = benefitEligibilityMapKey(input.organizationId, input.planId);
			const existing = state.benefitEligibility.get(key);
			const now = new Date();
			const eligibility: BenefitPlanEligibility = {
				id: existing?.id ?? randomUUID(),
				organizationId: input.organizationId,
				planId: input.planId,
				minTenureDays: input.minTenureDays,
				allowedEmploymentStatuses: input.allowedEmploymentStatuses,
				createdBy: existing?.createdBy ?? input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: existing?.createdAt ?? now,
				updatedAt: now,
			};
			state.benefitEligibility.set(key, eligibility);

			const rollback: Array<() => void> = [
				() => {
					if (existing) {
						state.benefitEligibility.set(key, existing);
					} else {
						state.benefitEligibility.delete(key);
					}
				},
			];

			const audit = await ports.audit.record({
				organizationId: eligibility.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_benefit_eligibility",
				entityId: eligibility.id,
				action: existing ? "UPDATE" : "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok({ ...eligibility });
		},

		// --- Benefit Enrollment ---

		async getBenefitEnrollment(input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
		}): Promise<Result<BenefitEnrollment | null>> {
			const enrollment =
				state.benefitEnrollments.get(input.enrollmentId) ?? null;
			if (enrollment && enrollment.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok(
				enrollment === null ? null : { ...enrollment },
			);
		},

		async findBenefitEnrollmentByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<BenefitEnrollment | null>> {
			const key = `${input.organizationId}:${input.idempotencyKey}`;
			const enrollment = state.enrollmentIdempotencyByKey.get(key) ?? null;
			return await errorResult.ok(
				enrollment === null ? null : { ...enrollment },
			);
		},

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The memory adapter mirrors the ordered production state transition for deterministic contract parity.
		async enrolBenefit(
			record: {
				organizationId: string;
				employeeId: HumanResourcesEmployeeId;
				employmentId: HumanResourcesEmploymentId;
				planId: HumanResourcesBenefitPlanId;
				effectiveFrom: string;
				effectiveTo: string | null;
				employeeContributionAmount: string | null;
				employerContributionAmount: string | null;
				contributionCurrencyCode: string | null;
				contributionFrequency: BenefitEnrollment["contributionFrequency"];
				createIdempotencyKey: string;
				createRequestFingerprint: string;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<BenefitEnrollment>> {
			const key = `${record.organizationId}:${record.createIdempotencyKey}`;
			const existing = state.enrollmentIdempotencyByKey.get(key);
			if (
				existing &&
				existing.fingerprint === record.createRequestFingerprint
			) {
				return errorResult.ok({ ...existing });
			}
			if (existing) {
				return conflict("Idempotency key already used with different data");
			}

			const rangeCheck = assertEffectiveRange({
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
			});
			if (!rangeCheck.ok) {
				return rangeCheck;
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

			const employee = core.employees.get(record.employeeId);
			if (!employee || employee.organizationId !== record.organizationId) {
				return notFound(
					"Employee not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const employment = core.employments.get(record.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return notFound(
					"Employment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (employment.employeeId !== record.employeeId) {
				return invalidInput("Employee does not match employment assignment");
			}

			const plan = state.benefitPlans.get(record.planId);
			if (!plan || plan.organizationId !== record.organizationId) {
				return notFound(
					"Benefit plan not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (!isBenefitPlanActive(plan.status)) {
				return invalidState("Benefit plan is not active");
			}

			const eligibility =
				state.benefitEligibility.get(
					benefitEligibilityMapKey(record.organizationId, record.planId),
				) ?? null;
			if (eligibility !== null) {
				const eligible = isEmployeeEligibleForBenefitPlan({
					eligibility,
					employmentStatus: employment.status,
					tenureDays: tenureDaysOn(employment.startsOn, record.effectiveFrom),
				});
				if (!eligible) {
					return invalidState("Employee is not eligible for this benefit plan");
				}
			}

			const openEnrollment = Array.from(state.benefitEnrollments.values()).find(
				(e) =>
					e.organizationId === record.organizationId &&
					e.employeeId === record.employeeId &&
					e.planId === record.planId &&
					isBenefitEnrollmentOpen(e.status),
			);
			if (openEnrollment) {
				return conflict(
					"Employee already has an open enrollment for this plan",
				);
			}

			const idResult = parseHumanResourcesBenefitEnrollmentId(randomUUID());
			if (!idResult.ok) {
				return idResult;
			}
			const id = idResult.data;
			const now = new Date();
			const enrollment: BenefitEnrollment = {
				id,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				planId: record.planId,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: record.effectiveTo,
				status: "active",
				employeeContributionAmount: record.employeeContributionAmount,
				employerContributionAmount: record.employerContributionAmount,
				contributionCurrencyCode: record.contributionCurrencyCode,
				contributionFrequency: record.contributionFrequency,
				waiverReason: null,
				createIdempotencyKey: record.createIdempotencyKey,
				fingerprint: record.createRequestFingerprint,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.benefitEnrollments.set(id, enrollment);
			state.enrollmentIdempotencyByKey.set(key, enrollment);

			const rollback: Array<() => void> = [
				() => {
					state.benefitEnrollments.delete(id);
					state.enrollmentIdempotencyByKey.delete(key);
				},
			];

			const audit = await ports.audit.record({
				organizationId: enrollment.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_benefit_enrollment",
				entityId: enrollment.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: enrollment.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
				payload: {
					organizationId: enrollment.organizationId,
					entityType: "hr_benefit_enrollment",
					entityId: enrollment.id,
					actorId: record.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return errorResult.ok({ ...enrollment });
		},

		async waiveBenefit(
			input: {
				organizationId: string;
				enrollmentId: HumanResourcesBenefitEnrollmentId;
				waiverReason: string;
				effectiveTo: string | null;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<BenefitEnrollment>> {
			const enrollment = state.benefitEnrollments.get(input.enrollmentId);
			if (!enrollment) {
				return notFound("Benefit enrollment not found");
			}
			if (enrollment.organizationId !== input.organizationId) {
				return notFound(
					"Benefit enrollment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				enrollment.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (!isBenefitEnrollmentActive(enrollment.status)) {
				return invalidState("Only active benefit enrollments can be waived");
			}

			const rangeCheck = assertEffectiveRange({
				effectiveFrom: enrollment.effectiveFrom,
				effectiveTo: input.effectiveTo,
			});
			if (!rangeCheck.ok) {
				return rangeCheck;
			}

			const now = new Date();
			const previous = { ...enrollment };
			const updated: BenefitEnrollment = {
				...enrollment,
				status: "waived",
				waiverReason: input.waiverReason,
				effectiveTo: input.effectiveTo,
				version: enrollment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.benefitEnrollments.set(updated.id, updated);
			const key = `${updated.organizationId}:${updated.createIdempotencyKey}`;
			state.enrollmentIdempotencyByKey.set(key, updated);

			const rollback: Array<() => void> = [
				() => {
					state.benefitEnrollments.set(updated.id, previous);
					state.enrollmentIdempotencyByKey.set(key, previous);
				},
			];

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_benefit_enrollment",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_benefit_enrollment",
					entityId: updated.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return errorResult.ok({ ...updated });
		},

		async endBenefitEnrollment(
			input: {
				organizationId: string;
				enrollmentId: HumanResourcesBenefitEnrollmentId;
				endsOn: string;
				actorUserId: string;
				expectedVersion: number;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<BenefitEnrollment>> {
			const enrollment = state.benefitEnrollments.get(input.enrollmentId);
			if (!enrollment) {
				return notFound("Benefit enrollment not found");
			}
			if (enrollment.organizationId !== input.organizationId) {
				return notFound(
					"Benefit enrollment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				enrollment.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (!isBenefitEnrollmentActive(enrollment.status)) {
				return invalidState("Benefit enrollment is not active");
			}

			const rangeCheck = assertEffectiveRange({
				effectiveFrom: enrollment.effectiveFrom,
				effectiveTo: input.endsOn,
			});
			if (!rangeCheck.ok) {
				return rangeCheck;
			}

			const now = new Date();
			const previous = { ...enrollment };
			const updated: BenefitEnrollment = {
				...enrollment,
				status: "ended",
				effectiveTo: input.endsOn,
				version: enrollment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.benefitEnrollments.set(updated.id, updated);
			const key = `${updated.organizationId}:${updated.createIdempotencyKey}`;
			state.enrollmentIdempotencyByKey.set(key, updated);

			const rollback: Array<() => void> = [
				() => {
					state.benefitEnrollments.set(updated.id, previous);
					state.enrollmentIdempotencyByKey.set(key, previous);
				},
			];

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_benefit_enrollment",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_benefit_enrollment",
					entityId: updated.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return errorResult.ok({ ...updated });
		},

		async cancelBenefitEnrollment(
			input: {
				organizationId: string;
				enrollmentId: HumanResourcesBenefitEnrollmentId;
				actorUserId: string;
				expectedVersion: number;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<BenefitEnrollment>> {
			const enrollment = state.benefitEnrollments.get(input.enrollmentId);
			if (!enrollment) {
				return notFound("Benefit enrollment not found");
			}
			if (enrollment.organizationId !== input.organizationId) {
				return notFound(
					"Benefit enrollment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				enrollment.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (!isBenefitEnrollmentActive(enrollment.status)) {
				return invalidState("Benefit enrollment is not active");
			}

			const now = new Date();
			const previous = { ...enrollment };
			const updated: BenefitEnrollment = {
				...enrollment,
				status: "cancelled",
				version: enrollment.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.benefitEnrollments.set(updated.id, updated);
			const key = `${updated.organizationId}:${updated.createIdempotencyKey}`;
			state.enrollmentIdempotencyByKey.set(key, updated);

			const rollback: Array<() => void> = [
				() => {
					state.benefitEnrollments.set(updated.id, previous);
					state.enrollmentIdempotencyByKey.set(key, previous);
				},
			];

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_benefit_enrollment",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_benefit_enrollment",
					entityId: updated.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				runRollbacks(rollback);
				return outbox;
			}

			return errorResult.ok({ ...updated });
		},

		async listBenefitEnrollmentsByEmployee(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			page: number;
			pageSize: number;
		}): Promise<Result<BenefitEnrollmentListPage>> {
			const enrollments = Array.from(state.benefitEnrollments.values()).filter(
				(e) =>
					e.organizationId === input.organizationId &&
					e.employeeId === input.employeeId,
			);
			enrollments.sort((a, b) =>
				b.effectiveFrom.localeCompare(a.effectiveFrom),
			);
			const totalCount = enrollments.length;
			const offset = (input.page - 1) * input.pageSize;
			const paginated = enrollments.slice(offset, offset + input.pageSize);
			return await errorResult.ok({
				enrollments: paginated.map((e) => ({ ...e })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		async getBenefitEnrollmentDependent(input: {
			organizationId: string;
			dependentId: HumanResourcesBenefitEnrollmentDependentId;
		}): Promise<Result<BenefitEnrollmentDependent | null>> {
			const dependent = state.benefitEnrollmentDependents.get(
				input.dependentId,
			);
			if (!dependent || dependent.organizationId !== input.organizationId) {
				return await errorResult.ok(null);
			}
			return await errorResult.ok({ ...dependent });
		},

		async listBenefitEnrollmentDependentsByEnrollment(input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
		}): Promise<Result<BenefitEnrollmentDependent[]>> {
			const dependents = Array.from(
				state.benefitEnrollmentDependents.values(),
			).filter(
				(dependent) =>
					dependent.organizationId === input.organizationId &&
					dependent.enrollmentId === input.enrollmentId,
			);
			dependents.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
			return await errorResult.ok(
				dependents.map((dependent) => ({ ...dependent })),
			);
		},

		async addBenefitEnrollmentDependent(
			input: {
				organizationId: string;
				enrollmentId: HumanResourcesBenefitEnrollmentId;
				dependentName: string;
				relationship: BenefitEnrollmentDependent["relationship"];
				effectiveFrom: string;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<BenefitEnrollmentDependent>> {
			const enrollment = state.benefitEnrollments.get(input.enrollmentId);
			if (!enrollment || enrollment.organizationId !== input.organizationId) {
				return notFound(
					"Benefit enrollment not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			if (!isBenefitEnrollmentActive(enrollment.status)) {
				return invalidState(
					"Dependents can only be added to active benefit enrollments",
				);
			}

			const rangeCheck = assertEffectiveRange({
				effectiveFrom: input.effectiveFrom,
				effectiveTo: enrollment.effectiveTo,
			});
			if (!rangeCheck.ok) {
				return rangeCheck;
			}
			if (input.effectiveFrom < enrollment.effectiveFrom) {
				return invalidInput(
					"Dependent effective date must be on or after enrollment effective date",
				);
			}

			const idResult = parseHumanResourcesBenefitEnrollmentDependentId(
				randomUUID(),
			);
			if (!idResult.ok) {
				return idResult;
			}
			const now = new Date();
			const dependent: BenefitEnrollmentDependent = {
				id: idResult.data,
				organizationId: input.organizationId,
				enrollmentId: input.enrollmentId,
				dependentName: input.dependentName,
				relationship: input.relationship,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: null,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			state.benefitEnrollmentDependents.set(dependent.id, dependent);

			const rollback: Array<() => void> = [
				() => state.benefitEnrollmentDependents.delete(dependent.id),
			];

			const audit = await ports.audit.record({
				organizationId: dependent.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_benefit_enrollment_dependent",
				entityId: dependent.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok({ ...dependent });
		},

		async endBenefitEnrollmentDependent(
			input: {
				organizationId: string;
				dependentId: HumanResourcesBenefitEnrollmentDependentId;
				endsOn: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: HumanResourcesMutationMeta,
		): Promise<Result<BenefitEnrollmentDependent>> {
			const dependent = state.benefitEnrollmentDependents.get(
				input.dependentId,
			);
			if (!dependent || dependent.organizationId !== input.organizationId) {
				return notFound(
					"Benefit enrollment dependent not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				dependent.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (dependent.effectiveTo !== null) {
				return invalidState("Benefit enrollment dependent is already ended");
			}

			const rangeCheck = assertEffectiveRange({
				effectiveFrom: dependent.effectiveFrom,
				effectiveTo: input.endsOn,
			});
			if (!rangeCheck.ok) {
				return rangeCheck;
			}

			const now = new Date();
			const previous = { ...dependent };
			const updated: BenefitEnrollmentDependent = {
				...dependent,
				effectiveTo: input.endsOn,
				version: dependent.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.benefitEnrollmentDependents.set(updated.id, updated);

			const rollback: Array<() => void> = [
				() => state.benefitEnrollmentDependents.set(updated.id, previous),
			];

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_benefit_enrollment_dependent",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				runRollbacks(rollback);
				return audit;
			}

			return errorResult.ok({ ...updated });
		},

		// --- Handoff ---

		async getApprovedCompensationHandoff(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
		}): Promise<Result<ApprovedCompensationHandoff | null>> {
			const employee = core.employees.get(input.employeeId);
			if (!employee || employee.organizationId !== input.organizationId) {
				return await notFound(
					"Employee not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const activeEmployment = Array.from(core.employments.values()).find(
				(e) =>
					e.organizationId === input.organizationId &&
					e.employeeId === input.employeeId &&
					e.status === "active",
			);

			let activeCompensation: EmployeeCompensation | null = null;
			if (activeEmployment) {
				activeCompensation =
					Array.from(state.employeeCompensations.values()).find(
						(c) =>
							c.organizationId === input.organizationId &&
							c.employmentId === activeEmployment.id &&
							isEmployeeCompensationActive(c.status),
					) ?? null;
			}

			if (!activeCompensation) {
				return await errorResult.ok(null);
			}

			const activeBenefitEnrollments = Array.from(
				state.benefitEnrollments.values(),
			).filter(
				(e) =>
					e.organizationId === input.organizationId &&
					e.employeeId === input.employeeId &&
					isBenefitEnrollmentActive(e.status),
			);

			const handoff: ApprovedCompensationHandoff = {
				organizationId: input.organizationId,
				employeeId: input.employeeId,
				activeCompensation: { ...activeCompensation },
				activeBenefitEnrollments: activeBenefitEnrollments.map((e) => ({
					...e,
				})),
			};

			return await errorResult.ok(handoff);
		},

		// Learning Course methods
	};
}

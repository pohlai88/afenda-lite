import { randomUUID } from "node:crypto";

import { ok, type Result } from "@afenda/errors/result";
import {
	HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
} from "@afenda/events/schemas";

import {
	type HumanResourcesBenefitEnrollmentId,
	type HumanResourcesBenefitPlanId,
	type HumanResourcesCompensationGradeId,
	type HumanResourcesCompensationReviewId,
	type HumanResourcesEmployeeCompensationId,
	type HumanResourcesEmployeeId,
	type HumanResourcesEmploymentId,
	type HumanResourcesSalaryBandId,
	parseHumanResourcesBenefitEnrollmentId,
	parseHumanResourcesBenefitPlanId,
	parseHumanResourcesCompensationGradeId,
	parseHumanResourcesCompensationReviewId,
	parseHumanResourcesEmployeeCompensationId,
	parseHumanResourcesSalaryBandId,
} from "../../brands";
import {
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
} from "../../error-codes";
import type { MutationPorts } from "../../ports";
import {
	compareMoneyOrder,
	rangesOverlap,
} from "../../shared/compensation-money";
import {
	isBenefitEnrollmentActive,
	isCompensationGradeActive,
	isCompensationReviewFinalized,
	isEmployeeCompensationActive,
	isSalaryBandActive,
} from "../../shared/compensation-status";
import { assertExpectedVersion } from "../../shared/concurrency";
import { conflict, invalidState, notFound } from "../../shared/domain-guards";
import type { HumanResourcesStore } from "../../store";
import type {
	ApprovedCompensationHandoff,
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
} from "../../types";
import type { CoreMemoryState } from "./core";
import { idempotencyMapKey } from "./shared";

export type CompensationBenefitsMemoryState = {
	compensationGrades: Map<HumanResourcesCompensationGradeId, CompensationGrade>;
	salaryBands: Map<HumanResourcesSalaryBandId, SalaryBand>;
	employeeCompensations: Map<
		HumanResourcesEmployeeCompensationId,
		EmployeeCompensation
	>;
	compensationIdempotencyByKey: Map<string, EmployeeCompensation>;
	compensationReviews: Map<
		HumanResourcesCompensationReviewId,
		CompensationReview
	>;
	reviewIdempotencyByKey: Map<string, CompensationReview>;
	benefitPlans: Map<HumanResourcesBenefitPlanId, BenefitPlan>;
	benefitEnrollments: Map<HumanResourcesBenefitEnrollmentId, BenefitEnrollment>;
	enrollmentIdempotencyByKey: Map<string, BenefitEnrollment>;
};

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

export function createCompensationBenefitsMemoryState(): CompensationBenefitsMemoryState {
	return {
		compensationGrades: new Map(),
		salaryBands: new Map(),
		employeeCompensations: new Map(),
		compensationIdempotencyByKey: new Map(),
		compensationReviews: new Map(),
		reviewIdempotencyByKey: new Map(),
		benefitPlans: new Map(),
		benefitEnrollments: new Map(),
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
	state.reviewIdempotencyByKey.clear();
	state.benefitPlans.clear();
	state.benefitEnrollments.clear();
	state.enrollmentIdempotencyByKey.clear();
}

export function createMemoryCompensationBenefitsMethods(
	state: CompensationBenefitsMemoryState,
	core: CoreMemoryState,
): MemoryCompensationBenefitsMethods &
	ThisType<MemoryCompensationBenefitsMethods> {
	return {
		async getCompensationGrade(input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
		}): Promise<Result<CompensationGrade | null>> {
			const grade = state.compensationGrades.get(input.gradeId);
			if (!grade || grade.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...grade });
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
			return ok(grade === null ? null : { ...grade });
		},

		async createCompensationGrade(
			record: {
				organizationId: string;
				code: string;
				name: string;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<CompensationGrade>> {
			const existing = Array.from(state.compensationGrades.values()).find(
				(g) =>
					g.organizationId === record.organizationId && g.code === record.code,
			);
			if (existing) {
				return conflict("Compensation grade code already exists");
			}

			const idResult = parseHumanResourcesCompensationGradeId(randomUUID());
			if (!idResult.ok) return idResult;
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

			return ok({ ...grade });
		},

		async updateCompensationGrade(
			input: {
				organizationId: string;
				gradeId: HumanResourcesCompensationGradeId;
				name?: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

		async archiveCompensationGrade(
			input: {
				organizationId: string;
				gradeId: HumanResourcesCompensationGradeId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

		async listCompensationGrades(input: {
			organizationId: string;
			page: number;
			pageSize: number;
			status?: string;
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
			return ok({
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
				return ok(null);
			}
			return ok({ ...band });
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
			meta: { correlationId: string },
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
				(band) =>
					band.organizationId === record.organizationId &&
					band.gradeId === record.gradeId &&
					(band.status === "active" || band.status === "superseded") &&
					rangesOverlap(
						band.effectiveFrom,
						band.effectiveTo,
						record.effectiveFrom,
						record.effectiveTo,
					),
			);
			if (overlapping) {
				return conflict("Overlapping salary band exists for this grade");
			}

			const idResult = parseHumanResourcesSalaryBandId(randomUUID());
			if (!idResult.ok) return idResult;
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

			return ok({ ...band });
		},

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
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<SalaryBand>> {
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

			const overlappingBands = Array.from(state.salaryBands.values()).filter(
				(band) =>
					band.organizationId === input.organizationId &&
					band.gradeId === input.gradeId &&
					(band.status === "active" || band.status === "superseded") &&
					rangesOverlap(
						band.effectiveFrom,
						band.effectiveTo,
						input.effectiveFrom,
						input.effectiveTo,
					),
			);

			const idResult = parseHumanResourcesSalaryBandId(randomUUID());
			if (!idResult.ok) return idResult;
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
				status: "active",
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			state.salaryBands.set(id, newBand);

			const rollback: Array<() => void> = [() => state.salaryBands.delete(id)];

			for (const old of overlappingBands) {
				const prev = { ...old };
				const superseded: SalaryBand = {
					...old,
					status: "superseded",
					version: old.version + 1,
					updatedBy: input.actorUserId,
					updatedAt: now,
				};
				state.salaryBands.set(old.id, superseded);
				rollback.push(() => state.salaryBands.set(old.id, prev));
			}

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
				for (const undo of rollback) undo();
				return auditNew;
			}

			for (const old of overlappingBands) {
				const auditSupersede = await ports.audit.record({
					organizationId: old.organizationId,
					actorUserId: input.actorUserId,
					correlationId: meta.correlationId,
					entity: "hr_salary_band",
					entityId: old.id,
					action: "UPDATE",
					changes: [],
				});
				if (!auditSupersede.ok) {
					for (const undo of rollback) undo();
					return auditSupersede;
				}
			}

			return ok({ ...newBand });
		},

		async archiveSalaryBand(
			input: {
				organizationId: string;
				salaryBandId: HumanResourcesSalaryBandId;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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

			return ok({ ...updated });
		},

		async listSalaryBandsByGrade(input: {
			organizationId: string;
			gradeId: HumanResourcesCompensationGradeId;
			page: number;
			pageSize: number;
			status?: string;
		}): Promise<Result<SalaryBandListPage>> {
			const grade = state.compensationGrades.get(input.gradeId);
			if (!grade || grade.organizationId !== input.organizationId) {
				return notFound(
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
			return ok({
				bands: paginated.map((b) => ({ ...b })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// Employee Compensation
		async getEmployeeCompensation(input: {
			organizationId: string;
			compensationId: HumanResourcesEmployeeCompensationId;
		}): Promise<Result<EmployeeCompensation | null>> {
			const comp = state.employeeCompensations.get(input.compensationId);
			if (!comp || comp.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok({ ...comp });
		},

		async findEmployeeCompensationByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<EmployeeCompensation | null>> {
			const key = idempotencyMapKey(input.organizationId, input.idempotencyKey);
			const comp = state.compensationIdempotencyByKey.get(key);
			return ok(comp === undefined ? null : { ...comp });
		},

		async createEmployeeCompensation(
			record: {
				organizationId: string;
				employeeId: HumanResourcesEmployeeId;
				employmentId: HumanResourcesEmploymentId;
				gradeId: HumanResourcesCompensationGradeId | null;
				salaryBandId: HumanResourcesSalaryBandId | null;
				baseAmount: string;
				currencyCode: string;
				effectiveFrom: string;
				reason: string;
				sourceReviewId: HumanResourcesCompensationReviewId | null;
				createIdempotencyKey: string;
				createRequestFingerprint: string;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<EmployeeCompensation>> {
			const idempKey = idempotencyMapKey(
				record.organizationId,
				record.createIdempotencyKey,
			);
			const existing = state.compensationIdempotencyByKey.get(idempKey);
			if (existing) {
				return ok({ ...existing });
			}

			const employment = core.employments.get(record.employmentId);
			if (!employment || employment.organizationId !== record.organizationId) {
				return notFound(
					"Employment not found or cross-org reference",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const active = Array.from(state.employeeCompensations.values()).find(
				(c) =>
					c.organizationId === record.organizationId &&
					c.employmentId === record.employmentId &&
					isEmployeeCompensationActive(c.status),
			);
			if (active) {
				return conflict(
					"An active compensation agreement already exists for this employment",
				);
			}

			const idResult = parseHumanResourcesEmployeeCompensationId(randomUUID());
			if (!idResult.ok) return idResult;
			const id = idResult.data;

			const now = new Date();
			const compensation: EmployeeCompensation = {
				id,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				gradeId: record.gradeId,
				salaryBandId: record.salaryBandId,
				baseAmount: record.baseAmount,
				currencyCode: record.currencyCode,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: null,
				reason: record.reason,
				status: "active",
				sourceReviewId: record.sourceReviewId,
				createIdempotencyKey: record.createIdempotencyKey,
				fingerprint: record.createRequestFingerprint,
				version: 1,
				createdBy: record.createdBy,
				updatedBy: record.createdBy,
				createdAt: now,
				updatedAt: now,
			};
			state.employeeCompensations.set(id, compensation);
			state.compensationIdempotencyByKey.set(idempKey, compensation);

			const rollback: Array<() => void> = [
				() => state.employeeCompensations.delete(id),
				() => state.compensationIdempotencyByKey.delete(idempKey),
			];

			const audit = await ports.audit.record({
				organizationId: compensation.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_employee_compensation",
				entityId: compensation.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				for (const undo of rollback) undo();
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: compensation.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
				payload: {
					organizationId: compensation.organizationId,
					entityType: "hr_employee_compensation",
					entityId: compensation.id,
					actorId: record.createdBy,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok({ ...compensation });
		},

		async endEmployeeCompensation(
			input: {
				organizationId: string;
				compensationId: HumanResourcesEmployeeCompensationId;
				endsOn: string;
				expectedVersion: number;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<EmployeeCompensation>> {
			const comp = state.employeeCompensations.get(input.compensationId);
			if (!comp || comp.organizationId !== input.organizationId) {
				return notFound(
					"Employee compensation not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}
			const versionCheck = assertExpectedVersion(
				comp.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			if (!isEmployeeCompensationActive(comp.status)) {
				return invalidState("Compensation is not active");
			}

			const now = new Date();
			const previous = { ...comp };
			const updated: EmployeeCompensation = {
				...comp,
				status: "ended",
				effectiveTo: input.endsOn,
				version: comp.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.employeeCompensations.set(updated.id, updated);

			const rollback: Array<() => void> = [
				() => state.employeeCompensations.set(updated.id, previous),
			];

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_employee_compensation",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				for (const undo of rollback) undo();
				return audit;
			}

			const outbox = await ports.outbox.append({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				type: HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
				payload: {
					organizationId: updated.organizationId,
					entityType: "hr_employee_compensation",
					entityId: updated.id,
					actorId: input.actorUserId,
					correlationId: meta.correlationId,
				},
			});
			if (!outbox.ok) {
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok({ ...updated });
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
			return ok({
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
			return ok(comp === null ? null : { ...comp });
		},

		// --- Compensation Review ---

		async getCompensationReview(input: {
			organizationId: string;
			reviewId: HumanResourcesCompensationReviewId;
		}): Promise<Result<CompensationReview | null>> {
			const review = state.compensationReviews.get(input.reviewId) ?? null;
			if (review && review.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok(review === null ? null : { ...review });
		},

		async findCompensationReviewByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<CompensationReview | null>> {
			const key = `${input.organizationId}:${input.idempotencyKey}`;
			const review = state.reviewIdempotencyByKey.get(key) ?? null;
			return ok(review === null ? null : { ...review });
		},

		async createCompensationReviewDraft(
			record: {
				organizationId: string;
				employeeId: HumanResourcesEmployeeId;
				employmentId: HumanResourcesEmploymentId;
				createIdempotencyKey: string;
				createRequestFingerprint: string;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<CompensationReview>> {
			const key = `${record.organizationId}:${record.createIdempotencyKey}`;
			const existing = state.reviewIdempotencyByKey.get(key);
			if (
				existing &&
				existing.fingerprint === record.createRequestFingerprint
			) {
				return ok({ ...existing });
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

			const idResult = parseHumanResourcesCompensationReviewId(randomUUID());
			if (!idResult.ok) return idResult;
			const id = idResult.data;

			const now = new Date();
			const review: CompensationReview = {
				id,
				organizationId: record.organizationId,
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

			const audit = await ports.audit.record({
				organizationId: review.organizationId,
				actorUserId: record.createdBy,
				correlationId: meta.correlationId,
				entity: "hr_compensation_review",
				entityId: review.id,
				action: "CREATE",
				changes: [],
			});
			if (!audit.ok) {
				state.compensationReviews.delete(id);
				state.reviewIdempotencyByKey.delete(key);
				return audit;
			}

			return ok({ ...review });
		},

		async recordCompensationRecommendation(
			input: {
				organizationId: string;
				reviewId: HumanResourcesCompensationReviewId;
				proposedBaseAmount: string;
				proposedCurrencyCode: string;
				proposedGradeId: HumanResourcesCompensationGradeId | null;
				proposedSalaryBandId: HumanResourcesSalaryBandId | null;
				effectiveFrom: string;
				recommendationNote: string | null;
				actorUserId: string;
				expectedVersion: number;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<CompensationReview>> {
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
			const versionCheck = assertExpectedVersion(
				review.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const isCompensationReviewDraft = (status: string) => status === "draft";
			if (!isCompensationReviewDraft(review.status)) {
				return invalidState("Compensation review is not in draft status");
			}

			const now = new Date();
			const previous = { ...review };
			const updated: CompensationReview = {
				...review,
				proposedBaseAmount: input.proposedBaseAmount,
				proposedCurrencyCode: input.proposedCurrencyCode,
				proposedGradeId: input.proposedGradeId,
				proposedSalaryBandId: input.proposedSalaryBandId,
				effectiveFrom: input.effectiveFrom,
				recommendationNote: input.recommendationNote,
				version: review.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.compensationReviews.set(updated.id, updated);
			const key = `${updated.organizationId}:${updated.createIdempotencyKey}`;
			state.reviewIdempotencyByKey.set(key, updated);

			const rollback: Array<() => void> = [
				() => {
					state.compensationReviews.set(updated.id, previous);
					state.reviewIdempotencyByKey.set(key, previous);
				},
			];

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_compensation_review",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				for (const undo of rollback) undo();
				return audit;
			}

			return ok({ ...updated });
		},

		async finalizeCompensationReview(
			input: {
				organizationId: string;
				reviewId: HumanResourcesCompensationReviewId;
				actorUserId: string;
				expectedVersion: number;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<CompensationReview>> {
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
			const versionCheck = assertExpectedVersion(
				review.version,
				input.expectedVersion,
			);
			if (!versionCheck.ok) {
				return versionCheck;
			}
			const isCompensationReviewDraft = (status: string) => status === "draft";
			if (!isCompensationReviewDraft(review.status)) {
				return invalidState("Compensation review is not in draft status");
			}

			const now = new Date();
			const previous = { ...review };
			const updated: CompensationReview = {
				...review,
				status: "finalized",
				finalizedAt: now,
				version: review.version + 1,
				updatedBy: input.actorUserId,
				updatedAt: now,
			};
			state.compensationReviews.set(updated.id, updated);
			const key = `${updated.organizationId}:${updated.createIdempotencyKey}`;
			state.reviewIdempotencyByKey.set(key, updated);

			const rollback: Array<() => void> = [
				() => {
					state.compensationReviews.set(updated.id, previous);
					state.reviewIdempotencyByKey.set(key, previous);
				},
			];

			const audit = await ports.audit.record({
				organizationId: updated.organizationId,
				actorUserId: input.actorUserId,
				correlationId: meta.correlationId,
				entity: "hr_compensation_review",
				entityId: updated.id,
				action: "UPDATE",
				changes: [],
			});
			if (!audit.ok) {
				for (const undo of rollback) undo();
				return audit;
			}

			return ok({ ...updated });
		},

		async applyApprovedCompensationResult(
			input: {
				organizationId: string;
				reviewId: HumanResourcesCompensationReviewId;
				reason: string;
				createIdempotencyKey: string;
				actorUserId: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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
				!review.proposedBaseAmount ||
				!review.proposedCurrencyCode ||
				!review.effectiveFrom
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
					for (const undo of rollback) undo();
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
					for (const undo of rollback) undo();
					return outbox;
				}
			}

			const idResult = parseHumanResourcesEmployeeCompensationId(randomUUID());
			if (!idResult.ok) return idResult;
			const id = idResult.data;

			const now = new Date();
			const newComp: EmployeeCompensation = {
				id,
				organizationId: input.organizationId,
				employeeId: review.employeeId,
				employmentId: review.employmentId,
				gradeId: review.proposedGradeId,
				salaryBandId: review.proposedSalaryBandId,
				baseAmount: review.proposedBaseAmount,
				currencyCode: review.proposedCurrencyCode,
				effectiveFrom: review.effectiveFrom,
				effectiveTo: null,
				reason: input.reason,
				sourceReviewId: input.reviewId,
				status: "active",
				createIdempotencyKey: input.createIdempotencyKey,
				fingerprint: `${review.effectiveFrom}:${review.proposedBaseAmount}:${review.proposedCurrencyCode}`,
				version: 1,
				createdBy: input.actorUserId,
				updatedBy: input.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
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
				for (const undo of rollback) undo();
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
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok({ ...newComp });
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
			return ok({
				reviews: paginated.map((r) => ({ ...r })),
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
				return ok(null);
			}
			return ok(plan === null ? null : { ...plan });
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
			return ok(plan === null ? null : { ...plan });
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
			meta: { correlationId: string },
		): Promise<Result<BenefitPlan>> {
			const existing = Array.from(state.benefitPlans.values()).find(
				(p) =>
					p.organizationId === record.organizationId && p.code === record.code,
			);
			if (existing) {
				return conflict("Benefit plan code already exists");
			}

			const idResult = parseHumanResourcesBenefitPlanId(randomUUID());
			if (!idResult.ok) return idResult;
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

			return ok({ ...plan });
		},

		async updateBenefitPlan(
			input: {
				organizationId: string;
				planId: HumanResourcesBenefitPlanId;
				name?: string;
				eligibilityNote?: string | null;
				actorUserId: string;
				expectedVersion: number;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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
					input.eligibilityNote !== undefined
						? input.eligibilityNote
						: plan.eligibilityNote,
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
				for (const undo of rollback) undo();
				return audit;
			}

			return ok({ ...updated });
		},

		async archiveBenefitPlan(
			input: {
				organizationId: string;
				planId: HumanResourcesBenefitPlanId;
				actorUserId: string;
				expectedVersion: number;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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
				for (const undo of rollback) undo();
				return audit;
			}

			return ok({ ...updated });
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
			return ok({
				plans: paginated.map((p) => ({ ...p })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// --- Benefit Enrollment ---

		async getBenefitEnrollment(input: {
			organizationId: string;
			enrollmentId: HumanResourcesBenefitEnrollmentId;
		}): Promise<Result<BenefitEnrollment | null>> {
			const enrollment =
				state.benefitEnrollments.get(input.enrollmentId) ?? null;
			if (enrollment && enrollment.organizationId !== input.organizationId) {
				return ok(null);
			}
			return ok(enrollment === null ? null : { ...enrollment });
		},

		async findBenefitEnrollmentByIdempotencyKey(input: {
			organizationId: string;
			idempotencyKey: string;
		}): Promise<Result<BenefitEnrollment | null>> {
			const key = `${input.organizationId}:${input.idempotencyKey}`;
			const enrollment = state.enrollmentIdempotencyByKey.get(key) ?? null;
			return ok(enrollment === null ? null : { ...enrollment });
		},

		async enrolBenefit(
			record: {
				organizationId: string;
				employeeId: HumanResourcesEmployeeId;
				employmentId: HumanResourcesEmploymentId;
				planId: HumanResourcesBenefitPlanId;
				effectiveFrom: string;
				createIdempotencyKey: string;
				createRequestFingerprint: string;
				createdBy: string;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
		): Promise<Result<BenefitEnrollment>> {
			const key = `${record.organizationId}:${record.createIdempotencyKey}`;
			const existing = state.enrollmentIdempotencyByKey.get(key);
			if (
				existing &&
				existing.fingerprint === record.createRequestFingerprint
			) {
				return ok({ ...existing });
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

			const plan = state.benefitPlans.get(record.planId);
			if (!plan || plan.organizationId !== record.organizationId) {
				return notFound(
					"Benefit plan not found",
					HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
				);
			}

			const activeEnrollment = Array.from(
				state.benefitEnrollments.values(),
			).find(
				(e) =>
					e.organizationId === record.organizationId &&
					e.employeeId === record.employeeId &&
					e.planId === record.planId &&
					isBenefitEnrollmentActive(e.status),
			);
			if (activeEnrollment) {
				return conflict(
					"Employee already has an active enrollment for this plan",
				);
			}

			const idResult = parseHumanResourcesBenefitEnrollmentId(randomUUID());
			if (!idResult.ok) return idResult;
			const id = idResult.data;
			const now = new Date();
			const enrollment: BenefitEnrollment = {
				id,
				organizationId: record.organizationId,
				employeeId: record.employeeId,
				employmentId: record.employmentId,
				planId: record.planId,
				effectiveFrom: record.effectiveFrom,
				effectiveTo: null,
				status: "active",
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
				for (const undo of rollback) undo();
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
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok({ ...enrollment });
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
			meta: { correlationId: string },
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
				for (const undo of rollback) undo();
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
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok({ ...updated });
		},

		async cancelBenefitEnrollment(
			input: {
				organizationId: string;
				enrollmentId: HumanResourcesBenefitEnrollmentId;
				actorUserId: string;
				expectedVersion: number;
			},
			ports: MutationPorts,
			meta: { correlationId: string },
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
				for (const undo of rollback) undo();
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
				for (const undo of rollback) undo();
				return outbox;
			}

			return ok({ ...updated });
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
			return ok({
				enrollments: paginated.map((e) => ({ ...e })),
				totalCount,
				page: input.page,
				pageSize: input.pageSize,
			});
		},

		// --- Handoff ---

		async getApprovedCompensationHandoff(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
		}): Promise<Result<ApprovedCompensationHandoff | null>> {
			const employee = core.employees.get(input.employeeId);
			if (!employee || employee.organizationId !== input.organizationId) {
				return notFound(
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
				return ok(null);
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

			return ok(handoff);
		},

		// Learning Course methods
	};
}

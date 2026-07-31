import {
	and,
	count,
	db,
	eq,
	hrAttendanceSession,
	hrCandidateApplication,
	hrEmployeeCertification,
	hrEmployeeCompensation,
	hrEmployment,
	hrHeadcountPlan,
	hrHeadcountPlanLine,
	hrLearningAssignment,
	hrLearningCompletion,
	hrLeaveRequest,
	hrOvertimeRequest,
	hrPerformanceCycle,
	hrPerformanceGoal,
	hrPerformanceReview,
	hrPolicyAcknowledgement,
	hrPosition,
	hrSuccessionCandidate,
	hrSuccessionPlan,
	hrWorkAssignment,
	inArray,
	ne,
} from "@afenda/db";
import { errorResult, type Result } from "@afenda/errors";

import type {
	HumanResourcesReadModelFact,
	HumanResourcesReportingFactKind,
	HumanResourcesReportingFactPage,
	HumanResourcesReportingSourcePort,
	OvertimeReportingFact,
} from "../../reporting";
import {
	countActiveReportingGoals,
	deriveLearningDates,
	deriveWorkforceActuals,
	selectLatestSuccessionReadiness,
} from "../../reporting";
import { mapPersistenceFailure } from "../../shared/persistence-errors";
import { annualizeCompensation } from "../memory/reporting";

function dateOnly(value: Date): string {
	return value.toISOString().slice(0, 10);
}

function pagination(input: { page: number; pageSize: number }) {
	return { limit: input.pageSize, offset: (input.page - 1) * input.pageSize };
}

function totalOf(rows: readonly { total: number }[]): number {
	return rows[0]?.total ?? 0;
}

function overtimeStatus(
	status: string,
): Result<OvertimeReportingFact["status"]> {
	if (
		status === "requested" ||
		status === "approved" ||
		status === "worked" ||
		status === "verified" ||
		status === "rejected" ||
		status === "cancelled"
	) {
		return errorResult.ok(status);
	}
	return errorResult.fail("INTERNAL_ERROR");
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The adapter keeps idempotency, CAS, persistence, and event staging in one atomic transaction boundary.
async function loadFacts(input: {
	organizationId: string;
	kind: HumanResourcesReportingFactKind;
	page: number;
	pageSize: number;
}): Promise<Result<{ facts: HumanResourcesReadModelFact[]; total: number }>> {
	const { limit, offset } = pagination(input);
	switch (input.kind) {
		case "employment": {
			const [rows, totals] = await Promise.all([
				db
					.select()
					.from(hrEmployment)
					.where(eq(hrEmployment.organizationId, input.organizationId))
					.orderBy(hrEmployment.id)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(hrEmployment)
					.where(eq(hrEmployment.organizationId, input.organizationId)),
			]);
			return errorResult.ok({
				facts: rows.map((row) => ({
					id: row.id,
					kind: "employment" as const,
					organizationId: row.organizationId,
					employeeId: row.employeeId,
					startedOn: row.startsOn,
					endedOn: row.endsOn,
					fullTimeEquivalent: "1.0000",
				})),
				total: totalOf(totals),
			});
		}
		case "recruitment": {
			const [rows, totals] = await Promise.all([
				db
					.select()
					.from(hrCandidateApplication)
					.where(
						eq(hrCandidateApplication.organizationId, input.organizationId),
					)
					.orderBy(hrCandidateApplication.id)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(hrCandidateApplication)
					.where(
						eq(hrCandidateApplication.organizationId, input.organizationId),
					),
			]);
			return errorResult.ok({
				facts: rows.map((row) => ({
					id: row.id,
					kind: "recruitment" as const,
					organizationId: row.organizationId,
					requisitionId: row.requisitionId,
					applicationId: row.id,
					stage:
						row.status === "accepted"
							? ("hired" as const)
							: ("application_received" as const),
					occurredOn: dateOnly(row.updatedAt),
				})),
				total: totalOf(totals),
			});
		}
		case "leave": {
			const [rows, totals] = await Promise.all([
				db
					.select()
					.from(hrLeaveRequest)
					.where(eq(hrLeaveRequest.organizationId, input.organizationId))
					.orderBy(hrLeaveRequest.id)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(hrLeaveRequest)
					.where(eq(hrLeaveRequest.organizationId, input.organizationId)),
			]);
			return errorResult.ok({
				facts: rows.map((row) => ({
					id: row.id,
					kind: "leave" as const,
					organizationId: row.organizationId,
					requestId: row.id,
					status: (() => {
						if (row.status === "approved") {
							return "approved" as const;
						}
						if (row.status === "rejected") {
							return "rejected" as const;
						}
						if (row.status === "cancelled" || row.status === "withdrawn") {
							return "cancelled" as const;
						}
						return "requested" as const;
					})(),
					quantityMinutes: Math.trunc(
						Number(row.requestedQuantity) * (row.unit === "hours" ? 60 : 480),
					),
					occurredOn: dateOnly(row.updatedAt),
				})),
				total: totalOf(totals),
			});
		}
		case "attendance": {
			const [rows, totals] = await Promise.all([
				db
					.select()
					.from(hrAttendanceSession)
					.where(eq(hrAttendanceSession.organizationId, input.organizationId))
					.orderBy(hrAttendanceSession.id)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(hrAttendanceSession)
					.where(eq(hrAttendanceSession.organizationId, input.organizationId)),
			]);
			return errorResult.ok({
				facts: rows.map((row) => ({
					id: row.id,
					kind: "attendance" as const,
					organizationId: row.organizationId,
					employeeId: row.employeeId,
					workDate: row.localWorkDate,
					scheduledMinutes: row.grossMinutes,
					workedMinutes: row.workedMinutes,
					exceptionCount: row.requiresReview ? 1 : 0,
				})),
				total: totalOf(totals),
			});
		}
		case "overtime": {
			const [rows, totals] = await Promise.all([
				db
					.select()
					.from(hrOvertimeRequest)
					.where(eq(hrOvertimeRequest.organizationId, input.organizationId))
					.orderBy(hrOvertimeRequest.id)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(hrOvertimeRequest)
					.where(eq(hrOvertimeRequest.organizationId, input.organizationId)),
			]);
			const facts: OvertimeReportingFact[] = [];
			for (const row of rows) {
				const status = overtimeStatus(row.status);
				if (!status.ok) {
					return status;
				}
				facts.push({
					id: row.id,
					kind: "overtime",
					organizationId: row.organizationId,
					employeeId: row.employeeId,
					workDate: dateOnly(row.requestedStartsAt),
					status: status.data,
					requestedMinutes: row.requestedMinutes,
					approvedMinutes: row.approvedMaximumMinutes ?? 0,
					workedMinutes: row.actualMinutes ?? 0,
					payrollApprovedMinutes: row.payrollApprovedMinutes ?? 0,
				});
			}
			return errorResult.ok({ facts, total: totalOf(totals) });
		}
		case "compensation": {
			const [rows, totals] = await Promise.all([
				db
					.select()
					.from(hrEmployeeCompensation)
					.where(
						eq(hrEmployeeCompensation.organizationId, input.organizationId),
					)
					.orderBy(hrEmployeeCompensation.id)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(hrEmployeeCompensation)
					.where(
						eq(hrEmployeeCompensation.organizationId, input.organizationId),
					),
			]);
			const facts: HumanResourcesReadModelFact[] = [];
			for (const row of rows) {
				const amount = annualizeCompensation(row.baseAmount, row.payFrequency);
				if (!amount.ok) {
					return amount;
				}
				facts.push({
					id: row.id,
					kind: "compensation",
					organizationId: row.organizationId,
					employeeId: row.employeeId,
					effectiveFrom: row.effectiveFrom,
					effectiveTo: row.effectiveTo,
					currencyCode: row.currencyCode,
					annualizedAmount: amount.data,
				});
			}
			return errorResult.ok({ facts, total: totalOf(totals) });
		}
		case "compliance": {
			const [rows, totals] = await Promise.all([
				db
					.select()
					.from(hrPolicyAcknowledgement)
					.where(
						eq(hrPolicyAcknowledgement.organizationId, input.organizationId),
					)
					.orderBy(hrPolicyAcknowledgement.id)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(hrPolicyAcknowledgement)
					.where(
						eq(hrPolicyAcknowledgement.organizationId, input.organizationId),
					),
			]);
			return errorResult.ok({
				facts: rows.map((row) => ({
					id: row.id,
					kind: "compliance" as const,
					organizationId: row.organizationId,
					employeeId: row.employeeId,
					assessedOn: dateOnly(row.updatedAt),
					status:
						row.requirementStatus === "outstanding"
							? ("at_risk" as const)
							: ("compliant" as const),
					outstandingRequirementCount:
						row.requirementStatus === "outstanding" ? 1 : 0,
				})),
				total: totalOf(totals),
			});
		}
		case "learning": {
			const [rows, totals] = await Promise.all([
				db
					.select()
					.from(hrLearningAssignment)
					.where(eq(hrLearningAssignment.organizationId, input.organizationId))
					.orderBy(hrLearningAssignment.id)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(hrLearningAssignment)
					.where(eq(hrLearningAssignment.organizationId, input.organizationId)),
			]);
			const assignmentIds = rows.map((row) => row.id);
			const completions =
				assignmentIds.length === 0
					? []
					: await db
							.select()
							.from(hrLearningCompletion)
							.where(
								and(
									eq(hrLearningCompletion.organizationId, input.organizationId),
									inArray(hrLearningCompletion.assignmentId, assignmentIds),
								),
							);
			const completionIds = completions.map((row) => row.id);
			const certifications =
				completionIds.length === 0
					? []
					: await db
							.select()
							.from(hrEmployeeCertification)
							.where(
								and(
									eq(
										hrEmployeeCertification.organizationId,
										input.organizationId,
									),
									inArray(hrEmployeeCertification.completionId, completionIds),
								),
							);
			return errorResult.ok({
				facts: rows.map((row) => {
					const dates = deriveLearningDates({
						assignmentId: row.id,
						completions,
						certifications,
					});
					return {
						id: row.id,
						kind: "learning" as const,
						organizationId: row.organizationId,
						employeeId: row.employeeId,
						assignedOn: dateOnly(row.assignedAt),
						dueOn: row.dueOn,
						...dates,
					};
				}),
				total: totalOf(totals),
			});
		}
		case "performance": {
			const [rows, totals] = await Promise.all([
				db
					.select({ review: hrPerformanceReview, cycle: hrPerformanceCycle })
					.from(hrPerformanceReview)
					.innerJoin(
						hrPerformanceCycle,
						and(
							eq(hrPerformanceCycle.id, hrPerformanceReview.cycleId),
							eq(hrPerformanceCycle.organizationId, input.organizationId),
						),
					)
					.where(eq(hrPerformanceReview.organizationId, input.organizationId))
					.orderBy(hrPerformanceReview.id)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(hrPerformanceReview)
					.where(eq(hrPerformanceReview.organizationId, input.organizationId)),
			]);
			const employeeIds = [
				...new Set(rows.map(({ review }) => review.employeeId)),
			];
			const activeGoals =
				employeeIds.length === 0
					? []
					: await db
							.select({
								employeeId: hrPerformanceGoal.employeeId,
								status: hrPerformanceGoal.status,
							})
							.from(hrPerformanceGoal)
							.where(
								and(
									eq(hrPerformanceGoal.organizationId, input.organizationId),
									eq(hrPerformanceGoal.status, "active"),
									inArray(hrPerformanceGoal.employeeId, employeeIds),
								),
							);
			return errorResult.ok({
				facts: rows.map(({ review, cycle }) => ({
					id: review.id,
					kind: "performance" as const,
					organizationId: review.organizationId,
					employeeId: review.employeeId,
					reviewPeriodEnd: cycle.periodEnd,
					status:
						review.status === "finalized" || review.status === "acknowledged"
							? ("completed" as const)
							: ("in_progress" as const),
					rating: review.overallRating,
					activeGoalCount: countActiveReportingGoals(
						review.employeeId,
						activeGoals,
					),
				})),
				total: totalOf(totals),
			});
		}
		case "succession": {
			const [rows, totals] = await Promise.all([
				db
					.select()
					.from(hrSuccessionPlan)
					.where(eq(hrSuccessionPlan.organizationId, input.organizationId))
					.orderBy(hrSuccessionPlan.id)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(hrSuccessionPlan)
					.where(eq(hrSuccessionPlan.organizationId, input.organizationId)),
			]);
			const planIds = rows.map((row) => row.id);
			const candidates =
				planIds.length === 0
					? []
					: await db
							.select()
							.from(hrSuccessionCandidate)
							.where(
								and(
									eq(
										hrSuccessionCandidate.organizationId,
										input.organizationId,
									),
									inArray(hrSuccessionCandidate.successionPlanId, planIds),
									ne(hrSuccessionCandidate.status, "removed"),
								),
							);
			return errorResult.ok({
				facts: rows.map((row) => {
					const candidate = selectLatestSuccessionReadiness(
						candidates.filter(
							(candidateValue) => candidateValue.successionPlanId === row.id,
						),
					);
					return {
						id: row.id,
						kind: "succession" as const,
						organizationId: row.organizationId,
						positionId: row.positionId,
						assessedOn:
							candidate?.readinessEffectiveOn ?? dateOnly(row.updatedAt),
						isCriticalRole: true,
						hasActivePlan: row.status === "active",
						readiness: (() => {
							if (candidate?.readiness === "emerging") {
								return "developing" as const;
							}
							if (
								candidate?.readiness === "ready_now" ||
								candidate?.readiness === "ready_soon" ||
								candidate?.readiness === "not_ready"
							) {
								return candidate.readiness;
							}
							return null;
						})(),
					};
				}),
				total: totalOf(totals),
			});
		}
		case "workforce_plan": {
			const [rows, totals] = await Promise.all([
				db
					.select({ line: hrHeadcountPlanLine, plan: hrHeadcountPlan })
					.from(hrHeadcountPlanLine)
					.innerJoin(
						hrHeadcountPlan,
						and(
							eq(hrHeadcountPlan.id, hrHeadcountPlanLine.planId),
							eq(hrHeadcountPlan.organizationId, input.organizationId),
						),
					)
					.where(eq(hrHeadcountPlanLine.organizationId, input.organizationId))
					.orderBy(hrHeadcountPlanLine.id)
					.limit(limit)
					.offset(offset),
				db
					.select({ total: count() })
					.from(hrHeadcountPlanLine)
					.where(eq(hrHeadcountPlanLine.organizationId, input.organizationId)),
			]);
			const assignments = await db
				.select({
					assignment: hrWorkAssignment,
					employment: hrEmployment,
					position: hrPosition,
				})
				.from(hrWorkAssignment)
				.innerJoin(
					hrEmployment,
					and(
						eq(hrEmployment.id, hrWorkAssignment.employmentId),
						eq(hrEmployment.organizationId, input.organizationId),
					),
				)
				.innerJoin(
					hrPosition,
					and(
						eq(hrPosition.id, hrWorkAssignment.positionId),
						eq(hrPosition.organizationId, input.organizationId),
					),
				)
				.where(eq(hrWorkAssignment.organizationId, input.organizationId));
			return errorResult.ok({
				facts: rows.map(({ line, plan }) => {
					const actuals = deriveWorkforceActuals({
						asOf: plan.periodEnd,
						line,
						assignments: assignments.map(
							({ assignment, employment, position }) => ({
								employeeId: assignment.employeeId,
								positionId: assignment.positionId,
								departmentId: position.departmentId,
								assignmentStartsOn: assignment.startsOn,
								assignmentEndsOn: assignment.endsOn,
								employmentStartsOn: employment.startsOn,
								employmentEndsOn: employment.endsOn,
							}),
						),
					});
					return {
						id: line.id,
						kind: "workforce_plan" as const,
						organizationId: line.organizationId,
						planLineId: line.id,
						asOf: plan.periodEnd,
						plannedHeadcount: line.plannedHeadcount,
						actualHeadcount: actuals.actualHeadcount,
						plannedFullTimeEquivalent: line.plannedFte,
						actualFullTimeEquivalent: actuals.actualFullTimeEquivalent,
					};
				}),
				total: totalOf(totals),
			});
		}
		default:
			return errorResult.fail("INTERNAL_ERROR");
	}
}

export function createDrizzleHumanResourcesReportingSource(): HumanResourcesReportingSourcePort {
	return {
		async listFacts(input): Promise<Result<HumanResourcesReportingFactPage>> {
			try {
				const loaded = await loadFacts(input);
				if (!loaded.ok) {
					return loaded;
				}
				if (
					loaded.data.facts.some(
						(fact) => fact.organizationId !== input.organizationId,
					)
				) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				return errorResult.ok({
					entries: loaded.data.facts,
					total: loaded.data.total,
					page: input.page,
					pageSize: input.pageSize,
				});
			} catch (error) {
				return mapPersistenceFailure(
					error,
					"Human Resources reporting query failed",
				);
			}
		},
	};
}

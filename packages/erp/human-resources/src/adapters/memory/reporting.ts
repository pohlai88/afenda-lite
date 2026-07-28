import { fail, ok, type Result } from "@afenda/errors/result";
import type {
	HumanResourcesReadModelFact,
	HumanResourcesReportingFactKind,
	HumanResourcesReportingFactPage,
	HumanResourcesReportingSourcePort,
} from "../../reporting";
import { parseExactDecimal } from "../../shared/exact-decimal";
import type { SuccessionCandidate } from "../../types";
import type { MemoryHumanResourcesStore } from "./store";

const STANDARD_DAY_MINUTES = 480;

function isoDate(value: Date): string {
	return value.toISOString().slice(0, 10);
}

export function annualizeCompensation(
	amount: string,
	frequency: string,
): Result<string> {
	const parsed = parseExactDecimal(amount);
	if (parsed === null)
		return fail("VALIDATION_ERROR", "Compensation amount is invalid");
	const factor =
		frequency === "weekly"
			? 52n
			: frequency === "biweekly"
				? 26n
				: frequency === "semimonthly"
					? 24n
					: frequency === "monthly"
						? 12n
						: 1n;
	const coefficient = parsed.coefficient * factor;
	const negative = coefficient < 0n;
	const magnitude = negative ? -coefficient : coefficient;
	if (parsed.scale === 0) return ok(`${negative ? "-" : ""}${magnitude}`);
	const digits = magnitude.toString().padStart(parsed.scale + 1, "0");
	const integer = digits.slice(0, -parsed.scale);
	const fraction = digits.slice(-parsed.scale).replace(/0+$/, "");
	return ok(
		`${negative ? "-" : ""}${integer}${fraction.length > 0 ? `.${fraction}` : ""}`,
	);
}

function leaveStatus(
	status: string,
): "requested" | "approved" | "rejected" | "cancelled" {
	if (status === "approved") return "approved";
	if (status === "rejected") return "rejected";
	if (status === "withdrawn" || status === "cancelled") return "cancelled";
	return "requested";
}

function factsForKind(
	store: MemoryHumanResourcesStore,
	organizationId: string,
	kind: HumanResourcesReportingFactKind,
): Result<HumanResourcesReadModelFact[]> {
	const state = store.state;
	switch (kind) {
		case "employment":
			return ok(
				[...state.core.employments.values()]
					.filter((row) => row.organizationId === organizationId)
					.map((row) => ({
						id: row.id,
						kind,
						organizationId,
						employeeId: row.employeeId,
						startedOn: row.startsOn,
						endedOn: row.endsOn,
						fullTimeEquivalent: "1.0000",
					})),
			);
		case "recruitment": {
			const facts: HumanResourcesReadModelFact[] = [];
			for (const row of state.recruitment.requisitions.values()) {
				if (row.organizationId !== organizationId || row.status !== "open")
					continue;
				facts.push({
					id: `requisition-opened:${row.id}`,
					kind,
					organizationId,
					requisitionId: row.id,
					applicationId: null,
					stage: "requisition_opened",
					occurredOn: isoDate(row.createdAt),
				});
			}
			for (const row of state.recruitment.applications.values()) {
				if (row.organizationId !== organizationId) continue;
				facts.push({
					id: `application-received:${row.id}`,
					kind,
					organizationId,
					requisitionId: row.requisitionId,
					applicationId: row.id,
					stage: "application_received",
					occurredOn: isoDate(row.createdAt),
				});
				if (row.status === "accepted") {
					facts.push({
						id: `hired:${row.id}`,
						kind,
						organizationId,
						requisitionId: row.requisitionId,
						applicationId: row.id,
						stage: "hired",
						occurredOn: isoDate(row.updatedAt),
					});
				}
			}
			for (const row of state.recruitment.offers.values()) {
				if (row.organizationId !== organizationId || row.status !== "accepted")
					continue;
				const application = state.recruitment.applications.get(
					row.applicationId,
				);
				if (
					application === undefined ||
					application.organizationId !== organizationId
				)
					continue;
				facts.push({
					id: `offer-accepted:${row.id}`,
					kind,
					organizationId,
					requisitionId: application.requisitionId,
					applicationId: row.applicationId,
					stage: "offer_accepted",
					occurredOn: isoDate(row.respondedAt ?? row.updatedAt),
				});
			}
			return ok(facts);
		}
		case "leave": {
			const facts: HumanResourcesReadModelFact[] = [];
			for (const row of state.leave.leaveRequests.values()) {
				if (row.organizationId !== organizationId) continue;
				const parsed = parseExactDecimal(row.requestedQuantity);
				if (parsed === null)
					return fail("VALIDATION_ERROR", "Leave quantity is invalid");
				const scaleFactor = 10n ** BigInt(parsed.scale);
				const minuteFactor = BigInt(
					row.unit === "hours" ? 60 : STANDARD_DAY_MINUTES,
				);
				const minutes = Number(
					(parsed.coefficient * minuteFactor) / scaleFactor,
				);
				facts.push({
					id: row.id,
					kind,
					organizationId,
					requestId: row.id,
					status: leaveStatus(row.status),
					quantityMinutes: minutes,
					occurredOn: isoDate(row.updatedAt),
				});
			}
			return ok(facts);
		}
		case "attendance": {
			const exceptionCountBySession = new Map<string, number>();
			for (const exception of state.time.attendanceExceptions.values()) {
				if (
					exception.organizationId !== organizationId ||
					exception.sessionId === null
				)
					continue;
				exceptionCountBySession.set(
					exception.sessionId,
					(exceptionCountBySession.get(exception.sessionId) ?? 0) + 1,
				);
			}
			return ok(
				[...state.time.attendanceSessions.values()]
					.filter((row) => row.organizationId === organizationId)
					.map((row) => ({
						id: row.id,
						kind,
						organizationId,
						employeeId: row.employeeId,
						workDate: row.localWorkDate,
						scheduledMinutes: row.grossMinutes,
						workedMinutes: row.workedMinutes,
						exceptionCount: exceptionCountBySession.get(row.id) ?? 0,
					})),
			);
		}
		case "overtime":
			return ok(
				[...state.time.overtimeRequests.values()]
					.filter((row) => row.organizationId === organizationId)
					.map((row) => ({
						id: row.id,
						kind,
						organizationId,
						employeeId: row.employeeId,
						workDate: isoDate(row.requestedStartsAt),
						status: row.status,
						requestedMinutes: row.requestedMinutes,
						approvedMinutes: row.approvedMaximumMinutes ?? 0,
						workedMinutes: row.actualMinutes ?? 0,
						payrollApprovedMinutes: row.payrollApprovedMinutes ?? 0,
					})),
			);
		case "compensation": {
			const facts: HumanResourcesReadModelFact[] = [];
			for (const row of state.compensationBenefits.employeeCompensations.values()) {
				if (row.organizationId !== organizationId) continue;
				const annualized = annualizeCompensation(
					row.baseAmount,
					row.payFrequency,
				);
				if (!annualized.ok) return annualized;
				facts.push({
					id: row.id,
					kind,
					organizationId,
					employeeId: row.employeeId,
					effectiveFrom: row.effectiveFrom,
					effectiveTo: row.effectiveTo,
					currencyCode: row.currencyCode,
					annualizedAmount: annualized.data,
				});
			}
			return ok(facts);
		}
		case "compliance": {
			const employeeIds = new Set<string>();
			for (const row of state.compliance.employeeDocuments.values()) {
				if (row.organizationId === organizationId)
					employeeIds.add(row.employeeId);
			}
			for (const row of state.compliance.workEligibilities.values()) {
				if (row.organizationId === organizationId)
					employeeIds.add(row.employeeId);
			}
			for (const row of state.compliance.policyAcknowledgements.values()) {
				if (row.organizationId === organizationId)
					employeeIds.add(row.employeeId);
			}
			return ok(
				[...employeeIds].map((employeeId) => {
					const documents = [
						...state.compliance.employeeDocuments.values(),
					].filter(
						(row) =>
							row.organizationId === organizationId &&
							row.employeeId === employeeId,
					);
					const eligibilities = [
						...state.compliance.workEligibilities.values(),
					].filter(
						(row) =>
							row.organizationId === organizationId &&
							row.employeeId === employeeId,
					);
					const acknowledgements = [
						...state.compliance.policyAcknowledgements.values(),
					].filter(
						(row) =>
							row.organizationId === organizationId &&
							row.employeeId === employeeId,
					);
					const outstanding =
						documents.filter((row) => row.verificationStatus !== "verified")
							.length +
						eligibilities.filter((row) => row.status !== "active").length +
						acknowledgements.filter(
							(row) => row.requirementStatus === "outstanding",
						).length;
					const nonCompliant =
						documents.some((row) =>
							["rejected", "revoked", "expired"].includes(
								row.verificationStatus,
							),
						) ||
						eligibilities.some((row) =>
							["suspended", "expired", "closed"].includes(row.status),
						);
					const latest = [
						...documents,
						...eligibilities,
						...acknowledgements,
					].reduce(
						(max, row) => (row.updatedAt > max ? row.updatedAt : max),
						new Date(0),
					);
					return {
						id: `compliance:${employeeId}`,
						kind,
						organizationId,
						employeeId,
						assessedOn: isoDate(latest),
						status: nonCompliant
							? "non_compliant"
							: outstanding > 0
								? "at_risk"
								: "compliant",
						outstandingRequirementCount: outstanding,
					};
				}),
			);
		}
		case "learning": {
			const completionByAssignment = new Map(
				[...state.learning.completions.values()].map((row) => [
					row.assignmentId,
					row,
				]),
			);
			const certificationByCompletion = new Map(
				[...state.learning.certifications.values()].map((row) => [
					row.completionId,
					row,
				]),
			);
			return ok(
				[...state.learning.learningAssignments.values()]
					.filter((row) => row.organizationId === organizationId)
					.map((row) => {
						const completion = completionByAssignment.get(row.id);
						const certification =
							completion === undefined
								? undefined
								: certificationByCompletion.get(completion.id);
						return {
							id: row.id,
							kind,
							organizationId,
							employeeId: row.employeeId,
							assignedOn: isoDate(row.assignedAt),
							dueOn: row.dueOn,
							completedOn:
								completion === undefined
									? null
									: isoDate(completion.completedAt),
							certificationExpiresOn: certification?.expiresOn ?? null,
						};
					}),
			);
		}
		case "performance": {
			const goalsByEmployee = new Map<string, number>();
			for (const goal of state.performance.goals.values()) {
				if (
					goal.organizationId !== organizationId ||
					["completed", "cancelled"].includes(goal.status)
				)
					continue;
				goalsByEmployee.set(
					goal.employeeId,
					(goalsByEmployee.get(goal.employeeId) ?? 0) + 1,
				);
			}
			return ok(
				[...state.performance.reviews.values()]
					.filter((row) => row.organizationId === organizationId)
					.flatMap((row) => {
						const cycle = state.performance.cycles.get(row.cycleId);
						if (cycle === undefined || cycle.organizationId !== organizationId)
							return [];
						return [
							{
								id: row.id,
								kind,
								organizationId,
								employeeId: row.employeeId,
								reviewPeriodEnd: cycle.periodEnd,
								status:
									row.status === "finalized" || row.status === "acknowledged"
										? ("completed" as const)
										: ("in_progress" as const),
								rating: row.overallRating,
								activeGoalCount: goalsByEmployee.get(row.employeeId) ?? 0,
							},
						];
					}),
			);
		}
		case "succession": {
			const candidatesByPlan = new Map<string, SuccessionCandidate[]>();
			for (const candidate of state.talent.successionCandidates.values()) {
				if (
					candidate.organizationId !== organizationId ||
					candidate.status === "removed"
				)
					continue;
				const entries = candidatesByPlan.get(candidate.successionPlanId) ?? [];
				entries.push(candidate);
				candidatesByPlan.set(candidate.successionPlanId, entries);
			}
			return ok(
				[...state.talent.successionPlans.values()]
					.filter((row) => row.organizationId === organizationId)
					.map((row) => {
						const candidates = candidatesByPlan.get(row.id) ?? [];
						const selected = candidates.reduce<SuccessionCandidate | undefined>(
							(latest, candidate) =>
								latest === undefined ||
								latest.readinessEffectiveOn < candidate.readinessEffectiveOn
									? candidate
									: latest,
							undefined,
						);
						return {
							id: row.id,
							kind,
							organizationId,
							positionId: row.positionId,
							assessedOn:
								selected?.readinessEffectiveOn ?? isoDate(row.updatedAt),
							isCriticalRole: true,
							hasActivePlan: row.status === "active",
							readiness:
								selected?.readiness === "emerging"
									? "developing"
									: (selected?.readiness ?? null),
						};
					}),
			);
		}
		case "workforce_plan": {
			const facts: HumanResourcesReadModelFact[] = [];
			for (const line of state.workforcePlanning.headcountPlanLines.values()) {
				if (line.organizationId !== organizationId) continue;
				const plan = state.workforcePlanning.headcountPlans.get(line.planId);
				if (plan === undefined || plan.organizationId !== organizationId)
					continue;
				const actuals = [...state.core.assignments.values()].filter(
					(row) =>
						row.organizationId === organizationId &&
						(line.positionId === null || row.positionId === line.positionId) &&
						(line.departmentId === null ||
							row.organizationDimensions?.cost_centre.id === line.departmentId),
				);
				facts.push({
					id: line.id,
					kind,
					organizationId,
					planLineId: line.id,
					asOf: plan.periodEnd,
					plannedHeadcount: line.plannedHeadcount,
					actualHeadcount: new Set(actuals.map((row) => row.employeeId)).size,
					plannedFullTimeEquivalent: line.plannedFte,
					actualFullTimeEquivalent: `${actuals.length}.0000`,
				});
			}
			return ok(facts);
		}
	}
}

export function createMemoryHumanResourcesReportingSource(
	store: MemoryHumanResourcesStore,
): HumanResourcesReportingSourcePort {
	return {
		async listFacts(input): Promise<Result<HumanResourcesReportingFactPage>> {
			const facts = factsForKind(store, input.organizationId, input.kind);
			if (!facts.ok) return facts;
			const ordered = [...facts.data].sort((left, right) =>
				left.id.localeCompare(right.id),
			);
			const offset = (input.page - 1) * input.pageSize;
			return ok({
				entries: ordered.slice(offset, offset + input.pageSize),
				total: ordered.length,
				page: input.page,
				pageSize: input.pageSize,
			});
		},
	};
}

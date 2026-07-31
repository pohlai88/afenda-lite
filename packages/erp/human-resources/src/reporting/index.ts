import { errorResult, type Result } from "@afenda/errors";
import { z } from "zod";

import {
	addReportingDecimals,
	averageInteger,
	averageReportingDecimals,
	loadReconciledReportingFacts,
	ratioPercent,
	subtractReportingDecimals,
} from "./reconcile";
import {
	HUMAN_RESOURCES_REPORTING_FACT_KINDS,
	type HumanResourcesReadModelFact,
	type HumanResourcesReportingSnapshot,
	type HumanResourcesReportingSourcePort,
} from "./types";

export * from "./reconcile";
export * from "./source-derivations";
export type * from "./types";
export { HUMAN_RESOURCES_REPORTING_FACT_KINDS } from "./types";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const reportingSnapshotInputSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		asOf: isoDateSchema,
		periodStart: isoDateSchema,
		periodEnd: isoDateSchema,
	})
	.strict();

function inPeriod(date: string, start: string, end: string): boolean {
	return date >= start && date <= end;
}

function effectiveOn(start: string, end: string | null, asOf: string): boolean {
	return start <= asOf && (end === null || end >= asOf);
}

function sumNumbers(values: readonly number[]): number {
	return values.reduce((total, value) => total + value, 0);
}

function sumDecimals(values: readonly string[]): Result<string> {
	let total = "0";
	for (const value of values) {
		const next = addReportingDecimals(total, value);
		if (!next.ok) {
			return next;
		}
		total = next.data;
	}
	return errorResult.ok(total);
}

function factsOfKind<Kind extends HumanResourcesReadModelFact["kind"]>(
	facts: readonly HumanResourcesReadModelFact[],
	kind: Kind,
): Extract<HumanResourcesReadModelFact, { kind: Kind }>[] {
	return facts.filter(
		(fact): fact is Extract<HumanResourcesReadModelFact, { kind: Kind }> =>
			fact.kind === kind,
	);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Projection assembly keeps every validated metric calculation visible in one auditable flow.
export async function buildHumanResourcesReportingSnapshot(
	rawInput: unknown,
	source: HumanResourcesReportingSourcePort,
): Promise<Result<HumanResourcesReportingSnapshot>> {
	const parsed = reportingSnapshotInputSchema.safeParse(rawInput);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
			internalContext: {
				fieldErrors: parsed.error.flatten().fieldErrors,
			},
		});
	}
	const input = parsed.data;
	if (input.periodStart > input.periodEnd || input.periodEnd > input.asOf) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}

	const loaded = await Promise.all(
		HUMAN_RESOURCES_REPORTING_FACT_KINDS.map((kind) =>
			loadReconciledReportingFacts({
				organizationId: input.organizationId,
				kind,
				source,
			}),
		),
	);
	const failed = loaded.find((result) => !result.ok);
	if (failed !== undefined && !failed.ok) {
		return failed;
	}
	const facts = loaded.flatMap((result) => (result.ok ? result.data : []));

	const employment = factsOfKind(facts, "employment");
	const activeEmployment = employment.filter((fact) =>
		effectiveOn(fact.startedOn, fact.endedOn, input.asOf),
	);
	const activeEmployeeIds = new Set(
		activeEmployment.map((fact) => fact.employeeId),
	);
	const headcountFte = sumDecimals(
		activeEmployment.map((fact) => fact.fullTimeEquivalent),
	);
	if (!headcountFte.ok) {
		return headcountFte;
	}
	const openingHeadcount = new Set(
		employment
			.filter((fact) =>
				effectiveOn(fact.startedOn, fact.endedOn, input.periodStart),
			)
			.map((fact) => fact.employeeId),
	).size;
	const closingHeadcount = new Set(
		employment
			.filter((fact) =>
				effectiveOn(fact.startedOn, fact.endedOn, input.periodEnd),
			)
			.map((fact) => fact.employeeId),
	).size;
	const terminations = new Set(
		employment
			.filter(
				(fact) =>
					fact.endedOn !== null &&
					inPeriod(fact.endedOn, input.periodStart, input.periodEnd),
			)
			.map((fact) => fact.employeeId),
	).size;
	const averageHeadcount = averageInteger(openingHeadcount, closingHeadcount);
	const averageHeadcountDenominator = openingHeadcount + closingHeadcount;

	const recruitment = factsOfKind(facts, "recruitment").filter((fact) =>
		inPeriod(fact.occurredOn, input.periodStart, input.periodEnd),
	);
	const leave = factsOfKind(facts, "leave").filter((fact) =>
		inPeriod(fact.occurredOn, input.periodStart, input.periodEnd),
	);
	const attendance = factsOfKind(facts, "attendance").filter((fact) =>
		inPeriod(fact.workDate, input.periodStart, input.periodEnd),
	);
	const overtime = factsOfKind(facts, "overtime").filter((fact) =>
		inPeriod(fact.workDate, input.periodStart, input.periodEnd),
	);
	const compensation = factsOfKind(facts, "compensation").filter((fact) =>
		effectiveOn(fact.effectiveFrom, fact.effectiveTo, input.asOf),
	);
	const annualizedByCurrency: Record<string, string> = {};
	for (const fact of compensation) {
		const next = addReportingDecimals(
			annualizedByCurrency[fact.currencyCode] ?? "0",
			fact.annualizedAmount,
		);
		if (!next.ok) {
			return next;
		}
		annualizedByCurrency[fact.currencyCode] = next.data;
	}
	const compliance = factsOfKind(facts, "compliance").filter(
		(fact) => fact.assessedOn <= input.asOf,
	);
	const latestCompliance = new Map<string, (typeof compliance)[number]>();
	for (const fact of compliance) {
		const current = latestCompliance.get(fact.employeeId);
		if (current === undefined || current.assessedOn < fact.assessedOn) {
			latestCompliance.set(fact.employeeId, fact);
		}
	}
	const complianceFacts = [...latestCompliance.values()];
	const learning = factsOfKind(facts, "learning").filter(
		(fact) => fact.assignedOn <= input.asOf,
	);
	const performance = factsOfKind(facts, "performance").filter((fact) =>
		inPeriod(fact.reviewPeriodEnd, input.periodStart, input.periodEnd),
	);
	const ratings = performance.flatMap((fact) =>
		fact.rating === null ? [] : [fact.rating],
	);
	const averageRating = averageReportingDecimals(ratings);
	if (!averageRating.ok) {
		return averageRating;
	}
	const succession = factsOfKind(facts, "succession").filter(
		(fact) => fact.assessedOn <= input.asOf,
	);
	const latestSuccession = new Map<string, (typeof succession)[number]>();
	for (const fact of succession) {
		const current = latestSuccession.get(fact.positionId);
		if (current === undefined || current.assessedOn < fact.assessedOn) {
			latestSuccession.set(fact.positionId, fact);
		}
	}
	const successionFacts = [...latestSuccession.values()];
	const criticalRoles = successionFacts.filter((fact) => fact.isCriticalRole);
	const workforcePlan = factsOfKind(facts, "workforce_plan").filter(
		(fact) => fact.asOf === input.asOf,
	);
	const plannedFte = sumDecimals(
		workforcePlan.map((fact) => fact.plannedFullTimeEquivalent),
	);
	if (!plannedFte.ok) {
		return plannedFte;
	}
	const actualFte = sumDecimals(
		workforcePlan.map((fact) => fact.actualFullTimeEquivalent),
	);
	if (!actualFte.ok) {
		return actualFte;
	}
	const varianceFte = subtractReportingDecimals(
		plannedFte.data,
		actualFte.data,
	);
	if (!varianceFte.ok) {
		return varianceFte;
	}

	const scheduledMinutes = sumNumbers(
		attendance.map((fact) => fact.scheduledMinutes),
	);
	const workedMinutes = sumNumbers(
		attendance.map((fact) => fact.workedMinutes),
	);
	const plannedHeadcount = sumNumbers(
		workforcePlan.map((fact) => fact.plannedHeadcount),
	);
	const actualHeadcount = sumNumbers(
		workforcePlan.map((fact) => fact.actualHeadcount),
	);

	return errorResult.ok({
		meta: {
			organizationId: input.organizationId,
			asOf: input.asOf,
			periodStart: input.periodStart,
			periodEnd: input.periodEnd,
			sourceFactCount: facts.length,
			projectionVersion: 1,
		},
		workforceHeadcount: {
			headcount: activeEmployeeIds.size,
			fullTimeEquivalent: headcountFte.data,
		},
		turnover: {
			openingHeadcount,
			closingHeadcount,
			terminations,
			averageHeadcount,
			turnoverRatePercent:
				averageHeadcountDenominator === 0
					? "0.0000"
					: ratioPercent(terminations * 2, averageHeadcountDenominator),
		},
		hiring: {
			requisitionsOpened: recruitment.filter(
				(fact) => fact.stage === "requisition_opened",
			).length,
			applicationsReceived: recruitment.filter(
				(fact) => fact.stage === "application_received",
			).length,
			offersAccepted: recruitment.filter(
				(fact) => fact.stage === "offer_accepted",
			).length,
			hires: recruitment.filter((fact) => fact.stage === "hired").length,
		},
		leave: {
			requested: leave.filter((fact) => fact.status === "requested").length,
			approved: leave.filter((fact) => fact.status === "approved").length,
			rejected: leave.filter((fact) => fact.status === "rejected").length,
			cancelled: leave.filter((fact) => fact.status === "cancelled").length,
			approvedMinutes: sumNumbers(
				leave
					.filter((fact) => fact.status === "approved")
					.map((fact) => fact.quantityMinutes),
			),
		},
		attendance: {
			scheduledMinutes,
			workedMinutes,
			exceptionCount: sumNumbers(attendance.map((fact) => fact.exceptionCount)),
			attendanceRatePercent: ratioPercent(workedMinutes, scheduledMinutes),
		},
		overtime: {
			requestedMinutes: sumNumbers(
				overtime.map((fact) => fact.requestedMinutes),
			),
			approvedMinutes: sumNumbers(overtime.map((fact) => fact.approvedMinutes)),
			workedMinutes: sumNumbers(overtime.map((fact) => fact.workedMinutes)),
			payrollApprovedMinutes: sumNumbers(
				overtime.map((fact) => fact.payrollApprovedMinutes),
			),
		},
		compensation: {
			activeEmployees: new Set(compensation.map((fact) => fact.employeeId))
				.size,
			annualizedByCurrency,
		},
		compliance: {
			compliant: complianceFacts.filter((fact) => fact.status === "compliant")
				.length,
			atRisk: complianceFacts.filter((fact) => fact.status === "at_risk")
				.length,
			nonCompliant: complianceFacts.filter(
				(fact) => fact.status === "non_compliant",
			).length,
			outstandingRequirements: sumNumbers(
				complianceFacts.map((fact) => fact.outstandingRequirementCount),
			),
		},
		learning: {
			assigned: learning.length,
			completed: learning.filter((fact) => fact.completedOn !== null).length,
			overdue: learning.filter(
				(fact) =>
					fact.completedOn === null &&
					fact.dueOn !== null &&
					fact.dueOn < input.asOf,
			).length,
			certificationsExpiring: learning.filter(
				(fact) =>
					fact.certificationExpiresOn !== null &&
					inPeriod(fact.certificationExpiresOn, input.asOf, input.periodEnd),
			).length,
		},
		performance: {
			participants: new Set(performance.map((fact) => fact.employeeId)).size,
			completedReviews: performance.filter(
				(fact) => fact.status === "completed",
			).length,
			activeGoals: sumNumbers(performance.map((fact) => fact.activeGoalCount)),
			averageRating: averageRating.data,
		},
		succession: {
			criticalRoles: criticalRoles.length,
			rolesWithActivePlan: criticalRoles.filter((fact) => fact.hasActivePlan)
				.length,
			readyNowCandidates: criticalRoles.filter(
				(fact) => fact.readiness === "ready_now",
			).length,
			coverageRatePercent: ratioPercent(
				criticalRoles.filter((fact) => fact.hasActivePlan).length,
				criticalRoles.length,
			),
		},
		workforcePlanVariance: {
			plannedHeadcount,
			actualHeadcount,
			varianceHeadcount: plannedHeadcount - actualHeadcount,
			plannedFullTimeEquivalent: plannedFte.data,
			actualFullTimeEquivalent: actualFte.data,
			varianceFullTimeEquivalent: varianceFte.data,
		},
	});
}

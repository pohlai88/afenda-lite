import type { Session } from "@afenda/auth";
import { errorWire } from "@afenda/errors";
import {
	getEmployeeProfile,
	getHeadcountAvailability,
	getTalentProfileByEmployee,
	getWorkforcePlanVariance,
	listAttendanceExceptions,
	listEmployeeGoals,
	listHeadcountPlans,
	listPendingApprovalLeaveRequests,
	listProbationReviewsByEmployment,
	listReviewsPendingManagerAction,
	listSuccessionCandidates,
	listSuccessionPlans,
	listTimesheets,
} from "@afenda/human-resources";

import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import { sessionHasPermission } from "@/modules/identity/domain/session-permission";

import { resolveManagerScope } from "./manager-scope";
import {
	isManagerScopedPlanningKey,
	type ManagerCapabilities,
	type ManagerStaffingGapRow,
	type ManagerTeamMember,
	type ManagerWorkspaceData,
} from "./manager-workspace-model";

const MANAGER_PAGE_SIZE = 100;

function contextInput(session: Session, correlationId: string) {
	return {
		organizationId: session.orgId,
		actorUserId: session.userId,
		correlationId,
	};
}

function displayNameByEmployee(
	team: readonly ManagerTeamMember[],
	employeeId: string,
): string {
	return (
		team.find((member) => member.employeeId === employeeId)?.displayName ??
		"Team member"
	);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The loader preserves partial-failure handling across independent manager queues.
export async function loadManagerWorkspace(
	session: Session,
	page: number,
): Promise<ManagerWorkspaceData> {
	const correlationId = crypto.randomUUID();
	const asOf = new Date().toISOString().slice(0, 10);
	const options = createHumanResourcesCommandOptions();
	const errors: string[] = [];
	const scopeResult = await resolveManagerScope(session, asOf);
	if (!scopeResult.ok) {
		throw errorWire.deserialize(errorWire.serialize(scopeResult));
	}
	const scope = scopeResult.data;

	const [
		canLeave,
		canTimesheets,
		canAttendance,
		canProbation,
		canPerformance,
		canTalent,
		canSuccession,
		canStaffing,
	] = await Promise.all([
		sessionHasPermission(session, "human-resources.leave-request.approve-team"),
		sessionHasPermission(session, "human-resources.time.timesheet.approve"),
		sessionHasPermission(session, "human-resources.time.exception.resolve"),
		sessionHasPermission(session, "human-resources.employment.manage"),
		sessionHasPermission(session, "human-resources.performance.manager.manage"),
		sessionHasPermission(session, "human-resources.talent.admin"),
		sessionHasPermission(session, "human-resources.succession.admin"),
		sessionHasPermission(session, "human-resources.workforce-plan.read"),
	]);
	const capabilities: ManagerCapabilities = {
		leave: canLeave,
		timesheets: canTimesheets,
		attendance: canAttendance,
		probation: canProbation,
		performance: canPerformance,
		talent: canTalent,
		succession: canSuccession,
		staffing: canStaffing,
	};

	const profileResults = await Promise.all(
		scope.employeeIds.map((employeeId) =>
			getEmployeeProfile(
				{
					...contextInput(session, correlationId),
					employeeId,
					actorEmployeeId: scope.managerEmployeeId,
					asOf,
				},
				options,
			),
		),
	);
	const profiles = profileResults.flatMap((result) => {
		if (result.ok) {
			return [result.data];
		}
		errors.push("Some team member context could not be loaded.");
		return [];
	});
	const team: ManagerTeamMember[] = profiles.map((profile) => {
		const orgContext = profile.organizationEntry?.orgContext ?? null;
		const planningScopeKeys = [
			orgContext?.positionId,
			orgContext?.departmentId,
			orgContext?.locationKey,
			orgContext?.legalEntityKey,
			orgContext?.businessUnitKey,
			orgContext?.costCentreKey,
			orgContext?.projectKey,
		].filter((value): value is string => value !== null && value !== undefined);
		return {
			employeeId: profile.employeeId,
			employeeNumber: profile.employeeNumber,
			displayName:
				profile.preferredName ?? profile.personDisplayName ?? profile.legalName,
			employmentId: profile.employmentId,
			employmentStatus: profile.employmentStatus,
			positionId: orgContext?.positionId ?? null,
			departmentId: orgContext?.departmentId ?? null,
			locationKey: orgContext?.locationKey ?? null,
			businessUnitKey: orgContext?.businessUnitKey ?? null,
			planningScopeKeys: [...new Set(planningScopeKeys)],
		};
	});
	const teamEmployeeIds = new Set(team.map((member) => member.employeeId));

	const leaveResult = canLeave
		? await listPendingApprovalLeaveRequests(
				{
					...contextInput(session, correlationId),
					page,
					pageSize: MANAGER_PAGE_SIZE,
				},
				options,
			)
		: null;
	if (leaveResult !== null && !leaveResult.ok) {
		errors.push("Pending leave decisions could not be loaded.");
	}
	const leave =
		leaveResult?.ok === true
			? leaveResult.data.requests
					.filter((request) => teamEmployeeIds.has(request.employeeId))
					.map((request) => ({
						id: request.id,
						employeeId: request.employeeId,
						displayName: displayNameByEmployee(team, request.employeeId),
						startDate: request.startDate,
						endDate: request.endDate,
						requestedQuantity: request.requestedQuantity,
						unit: request.unit,
						status: request.status,
						version: request.version,
					}))
			: [];

	const timesheetResult = canTimesheets
		? await listTimesheets(
				{
					...contextInput(session, correlationId),
					status: "submitted",
					page: 1,
					pageSize: MANAGER_PAGE_SIZE,
				},
				options,
			)
		: null;
	if (timesheetResult !== null && !timesheetResult.ok) {
		errors.push("Submitted timesheets could not be loaded.");
	}
	const timesheets =
		timesheetResult?.ok === true
			? timesheetResult.data
					.filter((timesheet) => teamEmployeeIds.has(timesheet.employeeId))
					.map((timesheet) => ({
						id: timesheet.id,
						employeeId: timesheet.employeeId,
						displayName: displayNameByEmployee(team, timesheet.employeeId),
						periodStart: timesheet.periodStart,
						periodEnd: timesheet.periodEnd,
						totalRecordedMinutes: timesheet.totalRecordedMinutes,
						completedApprovalSteps: timesheet.completedApprovalSteps,
						requiredApprovalSteps: timesheet.requiredApprovalSteps.length,
						status: timesheet.status,
						version: timesheet.version,
					}))
			: [];

	const attendanceResult = canAttendance
		? await listAttendanceExceptions(
				{
					...contextInput(session, correlationId),
					page: 1,
					pageSize: MANAGER_PAGE_SIZE,
				},
				options,
			)
		: null;
	if (attendanceResult !== null && !attendanceResult.ok) {
		errors.push("Attendance exceptions could not be loaded.");
	}
	const attendance =
		attendanceResult?.ok === true
			? attendanceResult.data
					.filter(
						(exception) =>
							teamEmployeeIds.has(exception.employeeId) &&
							["open", "in_review"].includes(exception.reviewStatus),
					)
					.map((exception) => ({
						id: exception.id,
						employeeId: exception.employeeId,
						displayName: displayNameByEmployee(team, exception.employeeId),
						exceptionType: exception.exceptionType,
						severity: exception.severity,
						reviewStatus: exception.reviewStatus,
						remarks: exception.remarks,
						version: exception.version,
					}))
			: [];

	const probationResults = canProbation
		? await Promise.all(
				team.flatMap((member) =>
					member.employmentId === null
						? []
						: [
								listProbationReviewsByEmployment(
									{
										...contextInput(session, correlationId),
										employmentId: member.employmentId,
									},
									options,
								),
							],
				),
			)
		: [];
	const probation = probationResults.flatMap((result) => {
		if (!result.ok) {
			errors.push("Some probation reviews could not be loaded.");
			return [];
		}
		return result.data
			.filter(
				(review) => review.status === "open" || review.outcome === "passed",
			)
			.map((review) => ({
				id: review.id,
				employeeId: review.employeeId,
				employmentId: review.employmentId,
				displayName: displayNameByEmployee(team, review.employeeId),
				startsOn: review.startsOn,
				endsOn: review.endsOn,
				status: review.status,
				outcome: review.outcome,
				version: review.version,
			}));
	});

	const performanceReviewResult = canPerformance
		? await listReviewsPendingManagerAction(
				{
					...contextInput(session, correlationId),
					managerEmployeeId: scope.managerEmployeeId,
					page: 1,
					pageSize: MANAGER_PAGE_SIZE,
				},
				options,
			)
		: null;
	if (performanceReviewResult !== null && !performanceReviewResult.ok) {
		errors.push("Performance review decisions could not be loaded.");
	}
	const performanceReviews =
		performanceReviewResult?.ok === true
			? performanceReviewResult.data.reviews
					.filter((review) => teamEmployeeIds.has(review.employeeId))
					.map((review) => ({
						id: review.id,
						employeeId: review.employeeId,
						displayName: displayNameByEmployee(team, review.employeeId),
						status: review.status,
						overallRating: review.overallRating,
						version: review.version,
					}))
			: [];

	const goalResults = canPerformance
		? await Promise.all(
				team.map((member) =>
					listEmployeeGoals(
						{
							...contextInput(session, correlationId),
							employeeId: member.employeeId,
							status: "submitted",
							page: 1,
							pageSize: MANAGER_PAGE_SIZE,
						},
						options,
					),
				),
			)
		: [];
	const goals = goalResults.flatMap((result) => {
		if (!result.ok) {
			errors.push("Some submitted goals could not be loaded.");
			return [];
		}
		return result.data.goals.map((goal) => ({
			id: goal.id,
			employeeId: goal.employeeId,
			displayName: displayNameByEmployee(team, goal.employeeId),
			title: goal.title,
			periodEnd: goal.periodEnd,
			status: goal.status,
			version: goal.version,
		}));
	});

	const talentResults = canTalent
		? await Promise.all(
				team.map((member) =>
					getTalentProfileByEmployee(
						{
							...contextInput(session, correlationId),
							employeeId: member.employeeId,
							includeSensitive: true,
						},
						options,
					),
				),
			)
		: [];
	const talent = talentResults.flatMap((result) => {
		if (!result.ok) {
			errors.push("Some talent profiles could not be loaded.");
			return [];
		}
		if (result.data === null) {
			return [];
		}
		return [
			{
				id: result.data.id,
				employeeId: result.data.employeeId,
				displayName: displayNameByEmployee(team, result.data.employeeId),
				classification: result.data.currentClassification,
				status: result.data.status,
				version: result.data.version,
			},
		];
	});

	const positionIds = [
		...new Set(
			team.flatMap((member) =>
				member.positionId === null ? [] : [member.positionId],
			),
		),
	];
	const successionPlanResults = canSuccession
		? await Promise.all(
				positionIds.map((positionId) =>
					listSuccessionPlans(
						{
							...contextInput(session, correlationId),
							positionId,
							status: "active",
							page: 1,
							pageSize: MANAGER_PAGE_SIZE,
						},
						options,
					),
				),
			)
		: [];
	const successionPlans = successionPlanResults.flatMap((result) => {
		if (result.ok) {
			return result.data.successionPlans;
		}
		errors.push("Some succession plans could not be loaded.");
		return [];
	});
	const successionCandidateResults = await Promise.all(
		successionPlans.map(async (plan) => ({
			plan,
			result: await listSuccessionCandidates(
				{
					...contextInput(session, correlationId),
					successionPlanId: plan.id,
					page: 1,
					pageSize: MANAGER_PAGE_SIZE,
				},
				options,
			),
		})),
	);
	const succession = successionCandidateResults.flatMap(({ plan, result }) => {
		if (!result.ok) {
			errors.push("Some succession candidates could not be loaded.");
			return [];
		}
		return result.data.candidates.flatMap((candidate) => {
			if (
				candidate.employeeId === null ||
				!teamEmployeeIds.has(candidate.employeeId) ||
				candidate.status === "removed"
			) {
				return [];
			}
			return [
				{
					id: candidate.id,
					employeeId: candidate.employeeId,
					displayName: displayNameByEmployee(team, candidate.employeeId),
					planId: plan.id,
					planTitle: plan.title,
					readiness: candidate.readiness,
					readinessEffectiveOn: candidate.readinessEffectiveOn,
					status: candidate.status,
					version: candidate.version,
				},
			];
		});
	});

	const headcountPlansResult = canStaffing
		? await listHeadcountPlans(
				{
					...contextInput(session, correlationId),
					status: "approved",
					page: 1,
					pageSize: MANAGER_PAGE_SIZE,
				},
				options,
			)
		: null;
	if (headcountPlansResult !== null && !headcountPlansResult.ok) {
		errors.push("Workforce plans could not be loaded.");
	}
	const scopedPlans =
		headcountPlansResult?.ok === true
			? headcountPlansResult.data.plans.filter((plan) =>
					isManagerScopedPlanningKey(plan.planningScopeKey, team),
				)
			: [];
	const varianceResults = await Promise.all(
		scopedPlans.map(async (plan) => ({
			plan,
			result: await getWorkforcePlanVariance(
				{
					...contextInput(session, correlationId),
					planId: plan.id,
					asOf,
				},
				options,
			),
		})),
	);
	const staffingGaps: ManagerStaffingGapRow[] = [];
	for (const { plan, result } of varianceResults) {
		if (!result.ok) {
			errors.push("Some workforce-plan variance could not be loaded.");
			continue;
		}
		const gaps = result.data.lines.filter(
			(line) => line.varianceHeadcount < 0 || line.availableHeadcount > 0,
		);
		// biome-ignore lint/performance/noAwaitInLoops: Each bounded plan batch resolves concurrently, while plans preserve display and error order.
		const availabilityResults = await Promise.all(
			gaps.map((line) =>
				getHeadcountAvailability(
					{
						...contextInput(session, correlationId),
						planLineId: line.planLineId,
					},
					options,
				),
			),
		);
		for (const [index, gap] of gaps.entries()) {
			const availability = availabilityResults[index];
			if (availability === undefined || !availability.ok) {
				errors.push("Some headcount availability could not be loaded.");
				continue;
			}
			const lineAvailability = availability.data.lines.find(
				(line) => line.planLineId === gap.planLineId,
			);
			staffingGaps.push({
				planId: plan.id,
				planTitle: plan.title,
				planningScopeKey: plan.planningScopeKey,
				planLineId: gap.planLineId,
				actualHeadcount: gap.actualHeadcount,
				plannedHeadcount: gap.plannedHeadcount,
				varianceHeadcount: gap.varianceHeadcount,
				availableHeadcount:
					lineAvailability?.availableHeadcount ?? gap.availableHeadcount,
				varianceFte: gap.varianceFte,
				availableFte: lineAvailability?.availableFte ?? gap.availableFte,
			});
		}
	}

	return {
		asOf,
		managerEmployeeId: scope.managerEmployeeId,
		capabilities,
		team,
		leave,
		timesheets,
		attendance,
		probation,
		performanceReviews,
		goals,
		talent,
		succession,
		staffingGaps,
		errors: [...new Set(errors)],
	};
}

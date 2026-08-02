import {
	HUMAN_RESOURCES_PERMISSION_HEADCOUNT_RESERVE,
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_APPROVE,
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_PREPARE,
	HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ,
} from "../../kernel/authorization/permissions";
import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../../kernel/operations/define-registry";

const WORKFORCE_PLANNING_OWNER = "workforce-planning" as const;
const WORKFORCE_PLANNING_POLICY = "hr.workforce-planning" as const;

const PLAN_PREPARE_COMMAND = {
	authorizationPolicy: WORKFORCE_PLANNING_POLICY,
	kind: "command",
	owner: WORKFORCE_PLANNING_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_PREPARE,
} as const;

const PLAN_APPROVE_COMMAND = {
	...PLAN_PREPARE_COMMAND,
	permission: HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_APPROVE,
} as const;

const HEADCOUNT_RESERVE_COMMAND = {
	...PLAN_PREPARE_COMMAND,
	permission: HUMAN_RESOURCES_PERMISSION_HEADCOUNT_RESERVE,
} as const;

const PLAN_READ_QUERY = {
	authorizationPolicy: WORKFORCE_PLANNING_POLICY,
	kind: "query",
	owner: WORKFORCE_PLANNING_OWNER,
	permission: HUMAN_RESOURCES_PERMISSION_WORKFORCE_PLAN_READ,
} as const;

export const HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createHeadcountPlan: {
			...PLAN_PREPARE_COMMAND,
			id: "human-resources.headcount-plan.create",
			publicName: "createHeadcountPlan",
		},
		updateHeadcountPlan: {
			...PLAN_PREPARE_COMMAND,
			id: "human-resources.headcount-plan.update",
			publicName: "updateHeadcountPlan",
		},
		addHeadcountPlanLine: {
			...PLAN_PREPARE_COMMAND,
			id: "human-resources.headcount-plan-line.add",
			publicName: "addHeadcountPlanLine",
		},
		updateHeadcountPlanLine: {
			...PLAN_PREPARE_COMMAND,
			id: "human-resources.headcount-plan-line.update",
			publicName: "updateHeadcountPlanLine",
		},
		removeHeadcountPlanLine: {
			...PLAN_PREPARE_COMMAND,
			id: "human-resources.headcount-plan-line.remove",
			publicName: "removeHeadcountPlanLine",
		},
		submitHeadcountPlan: {
			...PLAN_PREPARE_COMMAND,
			id: "human-resources.headcount-plan.submit",
			publicName: "submitHeadcountPlan",
		},
		approveHeadcountPlan: {
			...PLAN_APPROVE_COMMAND,
			id: "human-resources.headcount-plan.approve",
			publicName: "approveHeadcountPlan",
		},
		rejectHeadcountPlan: {
			...PLAN_APPROVE_COMMAND,
			id: "human-resources.headcount-plan.reject",
			publicName: "rejectHeadcountPlan",
		},
		supersedeHeadcountPlan: {
			...PLAN_APPROVE_COMMAND,
			id: "human-resources.headcount-plan.supersede",
			publicName: "supersedeHeadcountPlan",
		},
		closeHeadcountPlan: {
			...PLAN_APPROVE_COMMAND,
			id: "human-resources.headcount-plan.close",
			publicName: "closeHeadcountPlan",
		},
		reserveHeadcount: {
			...HEADCOUNT_RESERVE_COMMAND,
			id: "human-resources.headcount.reserve",
			publicName: "reserveHeadcount",
		},
		releaseHeadcountReservation: {
			...HEADCOUNT_RESERVE_COMMAND,
			id: "human-resources.headcount-reservation.release",
			publicName: "releaseHeadcountReservation",
		},
		consumeHeadcountReservation: {
			...HEADCOUNT_RESERVE_COMMAND,
			id: "human-resources.headcount-reservation.consume",
			publicName: "consumeHeadcountReservation",
		},
	});

export const HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES =
	defineHumanResourcesOperationRegistry({
		getHeadcountPlanById: {
			...PLAN_READ_QUERY,
			id: "human-resources.headcount-plan.get",
			publicName: "getHeadcountPlanById",
		},
		listHeadcountPlans: {
			...PLAN_READ_QUERY,
			id: "human-resources.headcount-plan.list",
			publicName: "listHeadcountPlans",
		},
		getApprovedHeadcountPlan: {
			...PLAN_READ_QUERY,
			id: "human-resources.headcount-plan.approved-get",
			publicName: "getApprovedHeadcountPlan",
		},
		getHeadcountAvailability: {
			...PLAN_READ_QUERY,
			id: "human-resources.headcount.availability.get",
			publicName: "getHeadcountAvailability",
		},
		listHeadcountReservations: {
			...PLAN_READ_QUERY,
			id: "human-resources.headcount-reservation.list",
			publicName: "listHeadcountReservations",
		},
		getRecruitmentHeadcountHandoff: {
			sensitivity: null,
			...PLAN_READ_QUERY,
			authorizationPolicy: "hr.recruitment",
			id: "human-resources.recruitment.headcount-handoff.get",
			publicName: "getRecruitmentHeadcountHandoff",
		},
		getWorkforcePlanVariance: {
			...PLAN_READ_QUERY,
			id: "human-resources.workforce-plan.variance.get",
			publicName: "getWorkforcePlanVariance",
		},
	});

export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CREATE =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.createHeadcountPlan.id;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_UPDATE =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.updateHeadcountPlan.id;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_ADD =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.addHeadcountPlanLine.id;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_UPDATE =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.updateHeadcountPlanLine.id;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_REMOVE =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.removeHeadcountPlanLine.id;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUBMIT =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.submitHeadcountPlan.id;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_APPROVE =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.approveHeadcountPlan.id;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_REJECT =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.rejectHeadcountPlan.id;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_SUPERSEDE =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.supersedeHeadcountPlan.id;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_CLOSE =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.closeHeadcountPlan.id;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.reserveHeadcount.id;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_RELEASE =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.releaseHeadcountReservation.id;
export const HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_CONSUME =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS.consumeHeadcountReservation.id;

export const HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_GET =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES.getHeadcountPlanById.id;
export const HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_LIST =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES.listHeadcountPlans.id;
export const HUMAN_RESOURCES_QUERY_HEADCOUNT_PLAN_APPROVED_GET =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES.getApprovedHeadcountPlan.id;
export const HUMAN_RESOURCES_QUERY_HEADCOUNT_AVAILABILITY_GET =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES.getHeadcountAvailability.id;
export const HUMAN_RESOURCES_QUERY_HEADCOUNT_RESERVATION_LIST =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES.listHeadcountReservations.id;
export const HUMAN_RESOURCES_QUERY_RECRUITMENT_HEADCOUNT_HANDOFF_GET =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES.getRecruitmentHeadcountHandoff.id;
export const HUMAN_RESOURCES_QUERY_WORKFORCE_PLAN_VARIANCE_GET =
	HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES.getWorkforcePlanVariance.id;

export const HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS =
	projectHumanResourcesOperationIds(
		HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS,
	);
export const HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES);
export const HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(
		HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS,
	);
export const HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(
		HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES,
	);

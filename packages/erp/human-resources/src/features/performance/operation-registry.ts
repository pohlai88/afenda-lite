import {
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ,
	HUMAN_RESOURCES_PERMISSION_PERFORMANCE_REVIEW_REOPEN,
	type HumanResourcesPermission,
} from "../../kernel/authorization/permissions";
import {
	defineHumanResourcesOperationRegistry,
	projectHumanResourcesAuthorization,
	projectHumanResourcesOperationIds,
} from "../../kernel/operations/define-registry";

const OWNER = "performance-talent" as const;
const POLICY = "hr.performance" as const;

function definition(
	kind: "command" | "query",
	permission: HumanResourcesPermission,
) {
	return { authorizationPolicy: POLICY, kind, owner: OWNER, permission };
}

export const HUMAN_RESOURCES_PERFORMANCE_COMMANDS =
	defineHumanResourcesOperationRegistry({
		createPerformanceCycle: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.create",
			publicName: "createPerformanceCycle",
		},
		updatePerformanceCycle: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.update",
			publicName: "updatePerformanceCycle",
		},
		openPerformanceCycle: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.open",
			publicName: "openPerformanceCycle",
		},
		closePerformanceCycle: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.close",
			publicName: "closePerformanceCycle",
		},
		cancelPerformanceCycle: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.cancel",
			publicName: "cancelPerformanceCycle",
		},
		publishPerformanceCycle: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.publish",
			publicName: "publishPerformanceCycle",
		},
		setPerformanceCycleReviewPeriods: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.set-review-periods",
			publicName: "setPerformanceCycleReviewPeriods",
		},
		setPerformanceCycleEligibility: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.set-eligibility",
			publicName: "setPerformanceCycleEligibility",
		},
		enrollEligibleCycleParticipants: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.enroll-eligible",
			publicName: "enrollEligibleCycleParticipants",
		},
		addCycleParticipant: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.add-participant",
			publicName: "addCycleParticipant",
		},
		removeCycleParticipant: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.remove-participant",
			publicName: "removeCycleParticipant",
		},
		createPerformanceGoal: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
			),
			id: "human-resources.performance-goal.create",
			publicName: "createPerformanceGoal",
		},
		updatePerformanceGoal: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
			),
			id: "human-resources.performance-goal.update",
			publicName: "updatePerformanceGoal",
		},
		submitPerformanceGoal: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
			),
			id: "human-resources.performance-goal.submit",
			publicName: "submitPerformanceGoal",
		},
		approvePerformanceGoal: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			),
			id: "human-resources.performance-goal.approve",
			publicName: "approvePerformanceGoal",
		},
		rejectPerformanceGoal: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			),
			id: "human-resources.performance-goal.reject",
			publicName: "rejectPerformanceGoal",
		},
		recordGoalProgress: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
			),
			id: "human-resources.performance-goal.record-progress",
			publicName: "recordGoalProgress",
		},
		closePerformanceGoal: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			),
			id: "human-resources.performance-goal.close",
			publicName: "closePerformanceGoal",
		},
		cancelPerformanceGoal: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_GOAL_OWN_MANAGE,
			),
			id: "human-resources.performance-goal.cancel",
			publicName: "cancelPerformanceGoal",
		},
		activatePerformanceGoal: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			),
			id: "human-resources.performance-goal.activate",
			publicName: "activatePerformanceGoal",
		},
		alignPerformanceGoal: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			),
			id: "human-resources.performance-goal.align",
			publicName: "alignPerformanceGoal",
		},
		startPerformanceReview: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			),
			id: "human-resources.performance-review.start",
			publicName: "startPerformanceReview",
		},
		submitSelfAssessment: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ),
			id: "human-resources.performance-review.submit-self-assessment",
			publicName: "submitSelfAssessment",
		},
		submitManagerAssessment: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			),
			id: "human-resources.performance-review.submit-manager-assessment",
			publicName: "submitManagerAssessment",
		},
		returnPerformanceReviewForCorrection: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			),
			id: "human-resources.performance-review.return-for-correction",
			publicName: "returnPerformanceReviewForCorrection",
		},
		acknowledgePerformanceReview: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ),
			id: "human-resources.performance-review.acknowledge",
			publicName: "acknowledgePerformanceReview",
		},
		finalizePerformanceReview: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			),
			id: "human-resources.performance-review.finalize",
			publicName: "finalizePerformanceReview",
		},
		reopenPerformanceReview: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_REVIEW_REOPEN,
			),
			id: "human-resources.performance-review.reopen",
			publicName: "reopenPerformanceReview",
		},
		addDelegatedReviewer: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			),
			id: "human-resources.performance-review.add-delegated-reviewer",
			publicName: "addDelegatedReviewer",
		},
		submitDelegatedAssessment: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			),
			id: "human-resources.performance-review.submit-delegated-assessment",
			publicName: "submitDelegatedAssessment",
		},
		calibratePerformanceReview: {
			...definition("command", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-review.calibrate",
			publicName: "calibratePerformanceReview",
		},
		createImprovementPlan: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
			),
			id: "human-resources.improvement-plan.create",
			publicName: "createImprovementPlan",
		},
		openImprovementPlan: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
			),
			id: "human-resources.improvement-plan.open",
			publicName: "openImprovementPlan",
		},
		acknowledgeImprovementPlan: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
			),
			id: "human-resources.improvement-plan.acknowledge",
			publicName: "acknowledgeImprovementPlan",
		},
		recordImprovementCheckpoint: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
			),
			id: "human-resources.improvement-plan.record-checkpoint",
			publicName: "recordImprovementCheckpoint",
		},
		amendImprovementPlan: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
			),
			id: "human-resources.improvement-plan.amend",
			publicName: "amendImprovementPlan",
		},
		completeImprovementPlan: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
			),
			id: "human-resources.improvement-plan.complete",
			publicName: "completeImprovementPlan",
		},
		closeImprovementPlanUnsuccessful: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
			),
			id: "human-resources.improvement-plan.close-unsuccessful",
			publicName: "closeImprovementPlanUnsuccessful",
		},
		cancelImprovementPlan: {
			...definition(
				"command",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
			),
			id: "human-resources.improvement-plan.cancel",
			publicName: "cancelImprovementPlan",
		},
	});

export const HUMAN_RESOURCES_PERFORMANCE_QUERIES =
	defineHumanResourcesOperationRegistry({
		getPerformanceCycleById: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.get",
			publicName: "getPerformanceCycleById",
		},
		listPerformanceCycles: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.list",
			publicName: "listPerformanceCycles",
		},
		listCycleParticipants: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.list-participants",
			publicName: "listCycleParticipants",
		},
		listPerformanceCycleReviewPeriods: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.list-review-periods",
			publicName: "listPerformanceCycleReviewPeriods",
		},
		getPerformanceCycleEligibility: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGE),
			id: "human-resources.performance-cycle.get-eligibility",
			publicName: "getPerformanceCycleEligibility",
		},
		getPerformanceGoalById: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ),
			id: "human-resources.performance-goal.get",
			publicName: "getPerformanceGoalById",
		},
		listEmployeeGoals: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ),
			id: "human-resources.performance-goal.list-by-employee",
			publicName: "listEmployeeGoals",
		},
		listGoalProgress: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ),
			id: "human-resources.performance-goal.list-progress",
			publicName: "listGoalProgress",
		},
		getPerformanceReviewById: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ),
			id: "human-resources.performance-review.get",
			publicName: "getPerformanceReviewById",
		},
		listEmployeePerformanceReviews: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ),
			id: "human-resources.performance-review.list-by-employee",
			publicName: "listEmployeePerformanceReviews",
		},
		listReviewsPendingManagerAction: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_MANAGER_MANAGE,
			),
			id: "human-resources.performance-review.list-pending-manager-action",
			publicName: "listReviewsPendingManagerAction",
		},
		getImprovementPlanById: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
			),
			id: "human-resources.improvement-plan.get",
			publicName: "getImprovementPlanById",
		},
		listActiveImprovementPlans: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
			),
			id: "human-resources.improvement-plan.list-active",
			publicName: "listActiveImprovementPlans",
		},
		listImprovementPlanCheckpoints: {
			...definition(
				"query",
				HUMAN_RESOURCES_PERMISSION_PERFORMANCE_IMPROVEMENT_PLAN_MANAGE,
			),
			id: "human-resources.improvement-plan.list-checkpoints",
			publicName: "listImprovementPlanCheckpoints",
		},
		getEmployeePerformanceHistory: {
			...definition("query", HUMAN_RESOURCES_PERMISSION_PERFORMANCE_OWN_READ),
			id: "human-resources.employee-performance-history.get",
			publicName: "getEmployeePerformanceHistory",
		},
	});

export const HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_PERFORMANCE_COMMANDS);
export const HUMAN_RESOURCES_PERFORMANCE_QUERY_IDS =
	projectHumanResourcesOperationIds(HUMAN_RESOURCES_PERFORMANCE_QUERIES);
export const HUMAN_RESOURCES_PERFORMANCE_COMMAND_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_PERFORMANCE_COMMANDS);
export const HUMAN_RESOURCES_PERFORMANCE_QUERY_AUTHORIZATION =
	projectHumanResourcesAuthorization(HUMAN_RESOURCES_PERFORMANCE_QUERIES);

export const {
	createPerformanceCycle: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CREATE,
	},
	updatePerformanceCycle: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_UPDATE,
	},
	openPerformanceCycle: { id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_OPEN },
	closePerformanceCycle: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CLOSE,
	},
	cancelPerformanceCycle: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CANCEL,
	},
	publishPerformanceCycle: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_PUBLISH,
	},
	setPerformanceCycleReviewPeriods: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_REVIEW_PERIODS,
	},
	setPerformanceCycleEligibility: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_ELIGIBILITY,
	},
	enrollEligibleCycleParticipants: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ENROLL_ELIGIBLE,
	},
	addCycleParticipant: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ADD_PARTICIPANT,
	},
	removeCycleParticipant: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_REMOVE_PARTICIPANT,
	},
	createPerformanceGoal: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CREATE,
	},
	updatePerformanceGoal: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_UPDATE,
	},
	submitPerformanceGoal: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_SUBMIT,
	},
	approvePerformanceGoal: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_APPROVE,
	},
	rejectPerformanceGoal: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_REJECT,
	},
	recordGoalProgress: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_RECORD_PROGRESS,
	},
	closePerformanceGoal: { id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CLOSE },
	cancelPerformanceGoal: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_CANCEL,
	},
	activatePerformanceGoal: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ACTIVATE,
	},
	alignPerformanceGoal: { id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_GOAL_ALIGN },
	startPerformanceReview: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_START,
	},
	submitSelfAssessment: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_SELF_ASSESSMENT,
	},
	submitManagerAssessment: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_MANAGER_ASSESSMENT,
	},
	returnPerformanceReviewForCorrection: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_RETURN_FOR_CORRECTION,
	},
	acknowledgePerformanceReview: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_ACKNOWLEDGE,
	},
	finalizePerformanceReview: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_FINALIZE,
	},
	reopenPerformanceReview: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_REOPEN,
	},
	addDelegatedReviewer: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_ADD_DELEGATED_REVIEWER,
	},
	submitDelegatedAssessment: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_SUBMIT_DELEGATED_ASSESSMENT,
	},
	calibratePerformanceReview: {
		id: HUMAN_RESOURCES_COMMAND_PERFORMANCE_REVIEW_CALIBRATE,
	},
	createImprovementPlan: {
		id: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CREATE,
	},
	openImprovementPlan: { id: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_OPEN },
	acknowledgeImprovementPlan: {
		id: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_ACKNOWLEDGE,
	},
	recordImprovementCheckpoint: {
		id: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_RECORD_CHECKPOINT,
	},
	amendImprovementPlan: { id: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_AMEND },
	completeImprovementPlan: {
		id: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_COMPLETE,
	},
	closeImprovementPlanUnsuccessful: {
		id: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CLOSE_UNSUCCESSFUL,
	},
	cancelImprovementPlan: {
		id: HUMAN_RESOURCES_COMMAND_IMPROVEMENT_PLAN_CANCEL,
	},
} = HUMAN_RESOURCES_PERFORMANCE_COMMANDS;

export const {
	getPerformanceCycleById: { id: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_GET },
	listPerformanceCycles: { id: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST },
	listCycleParticipants: {
		id: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST_PARTICIPANTS,
	},
	listPerformanceCycleReviewPeriods: {
		id: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST_REVIEW_PERIODS,
	},
	getPerformanceCycleEligibility: {
		id: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_GET_ELIGIBILITY,
	},
	getPerformanceGoalById: { id: HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_GET },
	listEmployeeGoals: {
		id: HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_LIST_BY_EMPLOYEE,
	},
	listGoalProgress: {
		id: HUMAN_RESOURCES_QUERY_PERFORMANCE_GOAL_LIST_PROGRESS,
	},
	getPerformanceReviewById: {
		id: HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_GET,
	},
	listEmployeePerformanceReviews: {
		id: HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_LIST_BY_EMPLOYEE,
	},
	listReviewsPendingManagerAction: {
		id: HUMAN_RESOURCES_QUERY_PERFORMANCE_REVIEW_LIST_PENDING_MANAGER_ACTION,
	},
	getImprovementPlanById: { id: HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_GET },
	listActiveImprovementPlans: {
		id: HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_LIST_ACTIVE,
	},
	listImprovementPlanCheckpoints: {
		id: HUMAN_RESOURCES_QUERY_IMPROVEMENT_PLAN_LIST_CHECKPOINTS,
	},
	getEmployeePerformanceHistory: {
		id: HUMAN_RESOURCES_QUERY_EMPLOYEE_PERFORMANCE_HISTORY_GET,
	},
} = HUMAN_RESOURCES_PERFORMANCE_QUERIES;

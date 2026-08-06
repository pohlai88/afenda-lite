import { errorResult, type Result } from "@afenda/errors";
import type { ApprovedPayrollHandoff } from "@afenda/events/schemas";
import { z } from "zod";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import { resolveAssignmentContext } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import {
	humanResourcesEmployeeIdSchema,
	humanResourcesLeaveRequestIdSchema,
	humanResourcesTimesheetIdSchema,
} from "../../kernel/identity/brands";
import { HUMAN_RESOURCES_QUERY_APPROVED_PAYROLL_HANDOFF_GET } from "../../kernel/operations/module-ids";
import {
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "../../kernel/validation/common";
import { addLeaveQuantity } from "../leave/balance";
import {
	isStatutorySubjectRestricted,
	statutorySubjectRestrictedFailure,
} from "../statutory-profile/privacy";
import { resolveEmploymentStatusAsOf } from "../workforce-records/employment/employment-history";
import { mapApprovedPayrollHandoff } from "./map-approved-payroll-handoff";
import { runPayrollHandoffCapabilityQuery } from "./run-operation";
import type { HumanResourcesPayrollHandoffStore } from "./store";

export const assembleApprovedPayrollHandoffInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			effectiveDate: isoDateSchema,
			timesheetId: humanResourcesTimesheetIdSchema.optional(),
			leaveRequestIds: z
				.array(humanResourcesLeaveRequestIdSchema)
				.max(50)
				.optional(),
			periodStart: isoDateSchema.optional(),
			periodEnd: isoDateSchema.optional(),
		})
		.strict()
		.superRefine((value, ctx) => {
			if (
				(value.periodStart === undefined) !==
				(value.periodEnd === undefined)
			) {
				ctx.addIssue({
					code: "custom",
					message: "periodStart and periodEnd must be supplied together",
					path: ["periodStart"],
				});
			}
			if (
				value.periodStart !== undefined &&
				value.periodEnd !== undefined &&
				value.periodStart > value.periodEnd
			) {
				ctx.addIssue({
					code: "custom",
					message: "periodStart must be on or before periodEnd",
					path: ["periodStart"],
				});
			}
		});

export type AssembleApprovedPayrollHandoffInput = z.infer<
	typeof assembleApprovedPayrollHandoffInputSchema
>;

type PayrollHandoffDiscoveryStore = Pick<
	HumanResourcesPayrollHandoffStore,
	| "findTimesheetForEmployeePeriod"
	| "getApprovedLeaveHandoff"
	| "getApprovedTimeHandoff"
	| "listLeaveRequests"
>;

type PayrollEmploymentContextStore = Pick<
	HumanResourcesPayrollHandoffStore,
	| "findEmploymentByEmployeeAsOf"
	| "listEmploymentStatusHistory"
	| "getApprovedCompensationHandoff"
>;

type PayrollStatutoryFactStore = Pick<
	HumanResourcesPayrollHandoffStore,
	"getStatutoryProfileAsOf" | "listPriorEmployerYtd"
>;

type PayrollLeaveBalanceStore = Pick<
	HumanResourcesPayrollHandoffStore,
	"getLeaveBalance" | "getLeavePolicyById" | "listLeaveEntitlements"
>;

async function resolveApprovedLeaveHandoffs(input: {
	data: AssembleApprovedPayrollHandoffInput;
	store: PayrollHandoffDiscoveryStore;
}): Promise<Result<import("../../kernel/contracts").ApprovedLeaveHandoff[]>> {
	const { data, store } = input;
	let requestIds = data.leaveRequestIds ?? [];
	if (
		data.leaveRequestIds === undefined &&
		data.periodStart !== undefined &&
		data.periodEnd !== undefined
	) {
		const { periodStart, periodEnd } = data;
		const approvedRequests = await store.listLeaveRequests({
			organizationId: data.organizationId,
			employeeId: data.employeeId,
			overlapStart: periodStart,
			overlapEnd: periodEnd,
			status: "approved",
			page: 1,
			pageSize: 100,
		});
		if (!approvedRequests.ok) {
			return approvedRequests;
		}
		if (approvedRequests.data.totalCount > 50) {
			return errorResult.fail("CONFLICT", {
				publicMessage:
					"Approved leave volume exceeds the bounded payroll handoff",
			});
		}
		requestIds = approvedRequests.data.requests
			.filter(
				(request) =>
					request.startDate <= periodEnd && request.endDate >= periodStart,
			)
			.map((request) => request.id);
	}

	const results = await Promise.all(
		requestIds.map((requestId) =>
			store.getApprovedLeaveHandoff({
				organizationId: data.organizationId,
				requestId,
				correlationId: data.correlationId,
			}),
		),
	);
	const handoffs: import("../../kernel/contracts").ApprovedLeaveHandoff[] = [];
	for (const handoff of results) {
		if (!handoff.ok) {
			return handoff;
		}
		if (handoff.data !== null) {
			handoffs.push(handoff.data);
		}
	}
	return errorResult.ok(handoffs);
}

async function resolveApprovedTimeHandoff(input: {
	data: AssembleApprovedPayrollHandoffInput;
	store: PayrollHandoffDiscoveryStore;
}): Promise<
	Result<import("../../kernel/contracts").ApprovedTimeHandoff | null>
> {
	const { data, store } = input;
	let { timesheetId } = data;
	if (
		timesheetId === undefined &&
		data.periodStart !== undefined &&
		data.periodEnd !== undefined
	) {
		const timesheet = await store.findTimesheetForEmployeePeriod({
			organizationId: data.organizationId,
			employeeId: data.employeeId,
			periodStart: data.periodStart,
			periodEnd: data.periodEnd,
		});
		if (!timesheet.ok) {
			return timesheet;
		}
		timesheetId = timesheet.data?.id;
	}
	if (timesheetId === undefined) {
		return errorResult.ok(null);
	}
	return store.getApprovedTimeHandoff({
		organizationId: data.organizationId,
		timesheetId,
	});
}

async function resolvePayrollEmploymentContext(input: {
	data: AssembleApprovedPayrollHandoffInput;
	store: PayrollEmploymentContextStore;
}): Promise<
	Result<{
		compensation: import("../../kernel/contracts").ApprovedCompensationHandoff;
		employmentId: import("../../kernel/identity/brands").HumanResourcesEmploymentId;
		status: import("../workforce-records/employment/employment-status").EmploymentStatus;
	} | null>
> {
	const { data, store } = input;
	const employment = await store.findEmploymentByEmployeeAsOf({
		organizationId: data.organizationId,
		employeeId: data.employeeId,
		asOf: data.effectiveDate,
	});
	if (!employment.ok) {
		return employment;
	}
	if (employment.data === null) {
		return errorResult.ok(null);
	}
	const employmentId = employment.data.id;
	const statusHistory = await store.listEmploymentStatusHistory({
		organizationId: data.organizationId,
		employmentId,
	});
	if (!statusHistory.ok) {
		return statusHistory;
	}
	const statusAsOf = resolveEmploymentStatusAsOf({
		history: statusHistory.data,
		asOf: data.effectiveDate,
	});
	if (statusAsOf === null) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Employment status history is incomplete",
		});
	}
	const compensation = await store.getApprovedCompensationHandoff({
		organizationId: data.organizationId,
		employeeId: data.employeeId,
		employmentId,
		effectiveDate: data.effectiveDate,
	});
	if (!compensation.ok) {
		return compensation;
	}
	if (compensation.data === null) {
		return errorResult.ok(null);
	}
	return errorResult.ok({
		compensation: compensation.data,
		employmentId,
		status: statusAsOf.status,
	});
}

/**
 * Tax year of the handoff.
 *
 * Attribution is by `effectiveDate` — the compensation/termination effective
 * date the caller pins — not by `periodStart`. `periodStart`/`periodEnd` only
 * bound *which* approved leave and time facts are discovered; they never move
 * the statutory year, so a period that straddles a year boundary still reports
 * prior-employer figures for the year the handoff itself takes effect in.
 */
function taxYearFromDate(value: string): number {
	return Number(value.slice(0, 4));
}

async function resolveStatutoryHandoffFacts(input: {
	data: AssembleApprovedPayrollHandoffInput;
	options: HumanResourcesCommandOptions;
	store: PayrollStatutoryFactStore;
}): Promise<
	Result<{
		priorEmployerYtd: import("../../kernel/contracts").PriorEmployerYtd[];
		statutoryProfile: import("../../kernel/contracts").StatutoryProfile | null;
	}>
> {
	const { data, store } = input;
	const restricted = await isStatutorySubjectRestricted(
		{
			actorUserId: data.actorUserId,
			correlationId: data.correlationId,
			employeeId: data.employeeId,
			organizationId: data.organizationId,
		},
		input.options,
	);
	if (!restricted.ok) {
		return restricted;
	}
	if (restricted.data) {
		return statutorySubjectRestrictedFailure();
	}
	const profile = await store.getStatutoryProfileAsOf({
		asOf: data.effectiveDate,
		employeeId: data.employeeId,
		organizationId: data.organizationId,
	});
	if (!profile.ok) {
		return profile;
	}
	const priorEmployerYtd = await store.listPriorEmployerYtd({
		employeeId: data.employeeId,
		organizationId: data.organizationId,
		taxYear: taxYearFromDate(data.effectiveDate),
	});
	if (!priorEmployerYtd.ok) {
		return priorEmployerYtd;
	}
	return errorResult.ok({
		priorEmployerYtd: priorEmployerYtd.data,
		statutoryProfile: profile.data,
	});
}

async function resolveLeaveBalanceAtTermination(input: {
	data: AssembleApprovedPayrollHandoffInput;
	employmentId: import("../../kernel/identity/brands").HumanResourcesEmploymentId;
	employmentStatus: import("../workforce-records/employment/employment-status").EmploymentStatus;
	store: PayrollLeaveBalanceStore;
}): Promise<
	Result<
		import("@afenda/events/schemas").ApprovedPayrollHandoff["leaveBalanceAtTermination"]
	>
> {
	const { data, employmentId, employmentStatus, store } = input;
	if (employmentStatus !== "notice" && employmentStatus !== "terminated") {
		return errorResult.ok(null);
	}

	const entitlements = await store.listLeaveEntitlements({
		employeeId: data.employeeId,
		employmentId,
		organizationId: data.organizationId,
		page: 1,
		pageSize: 100,
	});
	if (!entitlements.ok) {
		return entitlements;
	}
	if (entitlements.data.totalCount > 100) {
		return errorResult.fail("CONFLICT", {
			publicMessage:
				"Leave entitlement volume exceeds the bounded payroll handoff",
		});
	}

	const covering = entitlements.data.entitlements.filter(
		(entitlement) =>
			entitlement.status === "active" &&
			entitlement.periodStart <= data.effectiveDate &&
			entitlement.periodEnd >= data.effectiveDate,
	);
	const balances = await Promise.all(
		covering.map(async (entitlement) => {
			const [policy, balance] = await Promise.all([
				store.getLeavePolicyById({
					organizationId: data.organizationId,
					policyId: entitlement.policyId,
				}),
				store.getLeaveBalance({
					entitlementId: entitlement.id,
					organizationId: data.organizationId,
				}),
			]);
			return { balance, policy };
		}),
	);

	let days = "0";
	for (const entry of balances) {
		if (!entry.policy.ok) {
			return entry.policy;
		}
		if (!entry.balance.ok) {
			return entry.balance;
		}
		if (entry.policy.data === null || !entry.policy.data.paid) {
			continue;
		}
		if (entry.balance.data === null) {
			continue;
		}
		if (
			entry.balance.data.unit === "hours" &&
			entry.balance.data.balance !== "0"
		) {
			return errorResult.fail("CONFLICT", {
				publicMessage:
					"Hour-unit paid leave cannot be converted to termination leave days",
			});
		}
		if (entry.balance.data.unit === "days") {
			days = addLeaveQuantity(days, entry.balance.data.balance);
		}
	}

	return errorResult.ok({
		asOf: data.effectiveDate,
		days,
	});
}

export function assembleApprovedPayrollHandoff(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ApprovedPayrollHandoff | null>> {
	return runPayrollHandoffCapabilityQuery(input, options, {
		storeMethods: [
			"getApprovedCompensationHandoff",
			"findAssignmentByEmploymentAsOf",
			"findEmploymentByEmployeeAsOf",
			"listEmploymentStatusHistory",
			"getApprovedLeaveHandoff",
			"getApprovedTimeHandoff",
			"findTimesheetForEmployeePeriod",
			"listLeaveRequests",
			"getStatutoryProfileAsOf",
			"listPriorEmployerYtd",
			"listLeaveEntitlements",
			"getLeavePolicyById",
			"getLeaveBalance",
		],
		schema: assembleApprovedPayrollHandoffInputSchema,
		invalidMessage: "Invalid approved payroll handoff assembly input",
		query: HUMAN_RESOURCES_QUERY_APPROVED_PAYROLL_HANDOFF_GET,
		execute: async (
			data,
			{ options: resolvedOptions, store },
		): Promise<Result<ApprovedPayrollHandoff | null>> => {
			const employment = await resolvePayrollEmploymentContext({ data, store });
			if (!employment.ok) {
				return employment;
			}
			if (employment.data === null) {
				return errorResult.ok(null);
			}
			const { employmentId } = employment.data;

			const assignment = await store.findAssignmentByEmploymentAsOf({
				organizationId: data.organizationId,
				employmentId,
				asOf: data.effectiveDate,
			});
			if (!assignment.ok) {
				return assignment;
			}
			if (assignment.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const leaveHandoffs = await resolveApprovedLeaveHandoffs({ data, store });
			if (!leaveHandoffs.ok) {
				return leaveHandoffs;
			}
			const timeHandoff = await resolveApprovedTimeHandoff({ data, store });
			if (!timeHandoff.ok) {
				return timeHandoff;
			}
			const statutoryFacts = await resolveStatutoryHandoffFacts({
				data,
				options: resolvedOptions,
				store,
			});
			if (!statutoryFacts.ok) {
				return statutoryFacts;
			}
			const leaveBalanceAtTermination = await resolveLeaveBalanceAtTermination({
				data,
				employmentId,
				employmentStatus: employment.data.status,
				store,
			});
			if (!leaveBalanceAtTermination.ok) {
				return leaveBalanceAtTermination;
			}

			const assignmentContextPort = resolveAssignmentContext(options);
			const contextResult = await assignmentContextPort.resolveAsOf({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId,
				asOf: data.effectiveDate,
			});
			if (!contextResult.ok) {
				return contextResult;
			}
			const assignmentContext = contextResult.data;

			return mapApprovedPayrollHandoff({
				compensationHandoff: employment.data.compensation,
				employmentStatus: employment.data.status,
				leaveBalanceAtTermination: leaveBalanceAtTermination.data,
				leaveHandoffs: leaveHandoffs.data,
				priorEmployerYtd: statutoryFacts.data.priorEmployerYtd,
				statutoryProfile: statutoryFacts.data.statutoryProfile,
				timeHandoff: timeHandoff.data,
				assignment: assignment.data,
				assignmentContext,
				effectiveDate: data.effectiveDate,
				correlationId: data.correlationId,
			});
		},
	});
}

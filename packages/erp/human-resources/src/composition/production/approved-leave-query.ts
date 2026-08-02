import { errorResult, type Result } from "@afenda/errors";
import { resolveWorkCalendarCivilDay } from "../../features/time/calendar-resolution";
import type {
	ApprovedLeaveFact,
	ApprovedLeaveQueryPort,
} from "../../features/time/handoff/ports";
import { segmentMinutesFromQuantity } from "../../features/time/timesheet-generation";
import type {
	ResolvedWorkCalendarContext,
	WorkCalendarLookupPort,
} from "../../features/time/work-calendar";
import type { LeaveRequest } from "../../kernel/contracts";
import type { HumanResourcesEmployeeId } from "../../kernel/identity/brands";
import type { HumanResourcesStore } from "../store/index";

const DEFAULT_DAY_MINUTES = 480;
const PAGE_SIZE = 100;

type LeaveStoreSlice = Pick<
	HumanResourcesStore,
	"listLeaveRequests" | "listLeaveRequestSegments" | "getLeavePolicyById"
>;

async function resolveSegmentCalendar(input: {
	lookup: WorkCalendarLookupPort | undefined;
	defaultTimezone: string;
	organizationId: string;
	employeeId: string;
	employmentId: string;
	workDate: string;
}): Promise<Result<{ timezone: string; standardDayMinutes: number }>> {
	if (input.lookup === undefined) {
		return errorResult.ok({
			timezone: input.defaultTimezone,
			standardDayMinutes: DEFAULT_DAY_MINUTES,
		});
	}
	const context = await input.lookup.resolveCalendarContext({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		employmentId: input.employmentId,
		fromDate: input.workDate,
		toDate: input.workDate,
	});
	if (!context.ok) {
		return context;
	}
	return errorResult.ok({
		timezone: context.data.timezone,
		standardDayMinutes: dayMinutesFromContext(context.data, input.workDate),
	});
}

function dayMinutesFromContext(
	context: ResolvedWorkCalendarContext,
	workDate: string,
): number {
	const resolution = resolveWorkCalendarCivilDay(context, workDate);
	if (resolution.expectedMinutes !== null && resolution.expectedMinutes > 0) {
		return resolution.expectedMinutes;
	}
	const fromStandard = Math.round(context.standardHoursPerDay * 60);
	return fromStandard > 0 ? fromStandard : DEFAULT_DAY_MINUTES;
}

async function collectApprovedLeaveFactsForRequest(input: {
	request: LeaveRequest;
	periodStart: string;
	periodEnd: string;
	organizationId: string;
	store: LeaveStoreSlice;
	lookup: WorkCalendarLookupPort | undefined;
	defaultTimezone: string;
}): Promise<Result<readonly ApprovedLeaveFact[]>> {
	const { request } = input;
	if (
		request.endDate < input.periodStart ||
		request.startDate > input.periodEnd
	) {
		return errorResult.ok([]);
	}

	const policy = await input.store.getLeavePolicyById({
		organizationId: input.organizationId,
		policyId: request.policyId,
	});
	if (!policy.ok || policy.data === null) {
		return policy.ok ? errorResult.ok([]) : policy;
	}

	const segments = await input.store.listLeaveRequestSegments({
		organizationId: input.organizationId,
		requestId: request.id,
	});
	if (!segments.ok) {
		return segments;
	}

	const facts: ApprovedLeaveFact[] = [];
	for (const segment of segments.data) {
		if (
			segment.segmentDate < input.periodStart ||
			segment.segmentDate > input.periodEnd
		) {
			continue;
		}

		// biome-ignore lint/performance/noAwaitInLoops: calendar resolution is ordered and fail-fast.
		const segmentCalendar = await resolveSegmentCalendar({
			lookup: input.lookup,
			defaultTimezone: input.defaultTimezone,
			organizationId: input.organizationId,
			employeeId: request.employeeId,
			employmentId: request.employmentId,
			workDate: segment.segmentDate,
		});
		if (!segmentCalendar.ok) {
			return segmentCalendar;
		}
		const { timezone, standardDayMinutes } = segmentCalendar.data;
		const approvedMinutes = segmentMinutesFromQuantity({
			unit: request.unit,
			quantity: segment.quantity,
			dayPortion: segment.dayPortion,
			standardDayMinutes,
		});
		if (approvedMinutes <= 0) {
			continue;
		}

		facts.push({
			requestId: request.id,
			segmentId: segment.id,
			employeeId: request.employeeId,
			employmentId: request.employmentId,
			workDate: segment.segmentDate,
			timezone,
			paid: policy.data.paid,
			approvedMinutes,
			dayPortion: segment.dayPortion,
		});
	}

	return errorResult.ok(facts);
}

/**
 * Read-only approved-leave query for Time. Never approves leave or mutates balances.
 */
export function createProductionApprovedLeaveQuery(deps: {
	store: LeaveStoreSlice;
	lookup?: WorkCalendarLookupPort | undefined;
	/** IANA timezone stamped on leave timesheet entries when calendar timezone is unavailable. */
	defaultTimezone?: string | undefined;
}): ApprovedLeaveQueryPort {
	const { store, lookup } = deps;
	const defaultTimezone = deps.defaultTimezone ?? "UTC";

	return {
		async listApprovedLeaveForEmployeePeriod(input: {
			organizationId: string;
			employeeId: HumanResourcesEmployeeId;
			periodStart: string;
			periodEnd: string;
		}): Promise<Result<readonly ApprovedLeaveFact[]>> {
			const facts: ApprovedLeaveFact[] = [];
			let page = 1;
			let totalCount = Number.POSITIVE_INFINITY;

			while ((page - 1) * PAGE_SIZE < totalCount) {
				// biome-ignore lint/performance/noAwaitInLoops: pagination must remain serial and fail-fast.
				const listed = await store.listLeaveRequests({
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					status: "approved",
					page,
					pageSize: PAGE_SIZE,
				});
				if (!listed.ok) {
					return listed;
				}
				const { requests, totalCount: listedTotalCount } = listed.data;
				totalCount = listedTotalCount;

				for (const request of requests) {
					// biome-ignore lint/performance/noAwaitInLoops: shared store traversal is ordered and fail-fast.
					const requestFacts = await collectApprovedLeaveFactsForRequest({
						request,
						periodStart: input.periodStart,
						periodEnd: input.periodEnd,
						organizationId: input.organizationId,
						store,
						lookup,
						defaultTimezone,
					});
					if (!requestFacts.ok) {
						return requestFacts;
					}
					facts.push(...requestFacts.data);
				}

				if (requests.length === 0) {
					break;
				}
				page += 1;
			}

			facts.sort((a, b) => {
				const byDate = a.workDate.localeCompare(b.workDate);
				if (byDate !== 0) {
					return byDate;
				}
				return a.segmentId.localeCompare(b.segmentId);
			});
			return errorResult.ok(facts);
		},
	};
}

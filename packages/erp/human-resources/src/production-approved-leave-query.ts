import { ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "./brands";
import type { HumanResourcesStore } from "./store";
import { resolveWorkCalendarCivilDay } from "./time/calendar-resolution";
import type {
	ApprovedLeaveFact,
	ApprovedLeaveQueryPort,
} from "./time/handoff/ports";
import { segmentMinutesFromQuantity } from "./time/timesheet-generation";
import type {
	ResolvedWorkCalendarContext,
	WorkCalendarLookupPort,
} from "./time/work-calendar";

const DEFAULT_DAY_MINUTES = 480;
const PAGE_SIZE = 100;

type LeaveStoreSlice = Pick<
	HumanResourcesStore,
	"listLeaveRequests" | "listLeaveRequestSegments" | "getLeavePolicyById"
>;

async function resolveStandardDayMinutes(input: {
	lookup: WorkCalendarLookupPort | undefined;
	organizationId: string;
	employeeId: string;
	employmentId: string;
	workDate: string;
}): Promise<number> {
	if (input.lookup === undefined) {
		return DEFAULT_DAY_MINUTES;
	}
	const context = await input.lookup.resolveCalendarContext({
		organizationId: input.organizationId,
		employeeId: input.employeeId,
		employmentId: input.employmentId,
		fromDate: input.workDate,
		toDate: input.workDate,
	});
	if (!context.ok) {
		return DEFAULT_DAY_MINUTES;
	}
	return dayMinutesFromContext(context.data, input.workDate);
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

/**
 * Read-only approved-leave query for Time. Never approves leave or mutates balances.
 */
export function createProductionApprovedLeaveQuery(deps: {
	store: LeaveStoreSlice;
	lookup?: WorkCalendarLookupPort;
	/** IANA timezone stamped on leave timesheet entries when calendar timezone is unavailable. */
	defaultTimezone?: string;
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
				const listed = await store.listLeaveRequests({
					organizationId: input.organizationId,
					employeeId: input.employeeId,
					status: "approved",
					page,
					pageSize: PAGE_SIZE,
				});
				if (!listed.ok) return listed;
				totalCount = listed.data.totalCount;

				for (const request of listed.data.requests) {
					if (
						request.endDate < input.periodStart ||
						request.startDate > input.periodEnd
					) {
						continue;
					}

					const policy = await store.getLeavePolicyById({
						organizationId: input.organizationId,
						policyId: request.policyId,
					});
					if (!policy.ok) return policy;
					if (policy.data === null) continue;

					const segments = await store.listLeaveRequestSegments({
						organizationId: input.organizationId,
						requestId: request.id,
					});
					if (!segments.ok) return segments;

					let timezone = defaultTimezone;
					if (lookup !== undefined) {
						const context = await lookup.resolveCalendarContext({
							organizationId: input.organizationId,
							employeeId: request.employeeId,
							employmentId: request.employmentId,
							fromDate: input.periodStart,
							toDate: input.periodEnd,
						});
						if (context.ok) {
							timezone = context.data.timezone;
						}
					}

					for (const segment of segments.data) {
						if (
							segment.segmentDate < input.periodStart ||
							segment.segmentDate > input.periodEnd
						) {
							continue;
						}
						const standardDayMinutes = await resolveStandardDayMinutes({
							lookup,
							organizationId: input.organizationId,
							employeeId: request.employeeId,
							employmentId: request.employmentId,
							workDate: segment.segmentDate,
						});
						const approvedMinutes = segmentMinutesFromQuantity({
							unit: request.unit,
							quantity: segment.quantity,
							dayPortion: segment.dayPortion,
							standardDayMinutes,
						});
						if (approvedMinutes <= 0) continue;

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
				}

				if (listed.data.requests.length === 0) {
					break;
				}
				page += 1;
			}

			facts.sort((a, b) => {
				const byDate = a.workDate.localeCompare(b.workDate);
				if (byDate !== 0) return byDate;
				return a.segmentId.localeCompare(b.segmentId);
			});
			return ok(facts);
		},
	};
}

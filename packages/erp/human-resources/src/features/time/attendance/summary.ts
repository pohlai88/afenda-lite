import type { Result } from "@afenda/errors";
import type { DailyAttendanceSummary } from "../../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../../kernel/execution/command-options";
import { HUMAN_RESOURCES_QUERY_ATTENDANCE_DAILY_SUMMARY_GET } from "../../../kernel/operations/module-ids";
import { runTimeCapabilityQuery } from "../run-operation";
import { getDailyAttendanceSummaryInputSchema } from "../schema";

export async function getDailyAttendanceSummary(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<DailyAttendanceSummary>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: getDailyAttendanceSummaryInputSchema,
		invalidMessage: "Invalid daily attendance summary input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_DAILY_SUMMARY_GET,
		storeMethods: ["getDailyAttendanceSummary"],
		execute: async (data, { store }) =>
			store.getDailyAttendanceSummary({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				localWorkDate: data.localWorkDate,
				timezone: data.timezone,
			}),
	});
}

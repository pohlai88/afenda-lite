import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../../command-options";
import { HUMAN_RESOURCES_QUERY_ATTENDANCE_DAILY_SUMMARY_GET } from "../../module-ids";
import { getDailyAttendanceSummaryInputSchema } from "../../schemas/time";
import { runTimeQuery } from "../../shared/time-command";
import type { DailyAttendanceSummary } from "../../types";

export async function getDailyAttendanceSummary(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<DailyAttendanceSummary>> {
	return runTimeQuery(input, options, {
		schema: getDailyAttendanceSummaryInputSchema,
		invalidMessage: "Invalid daily attendance summary input",
		query: HUMAN_RESOURCES_QUERY_ATTENDANCE_DAILY_SUMMARY_GET,
		execute: async (data, { store }) =>
			store.getDailyAttendanceSummary({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				localWorkDate: data.localWorkDate,
				timezone: data.timezone,
			}),
	});
}

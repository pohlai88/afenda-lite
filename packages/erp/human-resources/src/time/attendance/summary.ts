import type { Result } from "@afenda/errors";

import type { HumanResourcesCommandOptions } from "../../command-options";
import { HUMAN_RESOURCES_QUERY_ATTENDANCE_DAILY_SUMMARY_GET } from "../../module-ids";
import { getDailyAttendanceSummaryInputSchema } from "../../schemas/time";
import type { DailyAttendanceSummary } from "../../types";
import { runTimeCapabilityQuery } from "../run-operation";

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

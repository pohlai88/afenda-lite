import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../../command-options";
import { HUMAN_RESOURCES_QUERY_APPROVED_TIME_HANDOFF_GET } from "../../module-ids";
import { getApprovedTimeHandoffInputSchema } from "../../schemas/time";
import { runTimeQuery } from "../../shared/time-command";
import type { ApprovedTimeHandoff } from "../../types";

export async function getApprovedTimeHandoff(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ApprovedTimeHandoff | null>> {
	return runTimeQuery(input, options, {
		schema: getApprovedTimeHandoffInputSchema,
		invalidMessage: "Invalid approved time handoff get input",
		query: HUMAN_RESOURCES_QUERY_APPROVED_TIME_HANDOFF_GET,
		execute: async (data, { store }) =>
			store.getApprovedTimeHandoff({
				organizationId: data.organizationId,
				timesheetId: data.timesheetId,
			}),
	});
}

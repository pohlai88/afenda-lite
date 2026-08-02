import type { Result } from "@afenda/errors";

import type { HumanResourcesCommandOptions } from "../../command-options";
import { HUMAN_RESOURCES_QUERY_APPROVED_TIME_HANDOFF_GET } from "../../module-ids";
import { getApprovedTimeHandoffInputSchema } from "../../schemas/time";
import type { ApprovedTimeHandoff } from "../../types";
import { runTimeCapabilityQuery } from "../run-operation";

export async function getApprovedTimeHandoff(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ApprovedTimeHandoff | null>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: getApprovedTimeHandoffInputSchema,
		invalidMessage: "Invalid approved time handoff get input",
		query: HUMAN_RESOURCES_QUERY_APPROVED_TIME_HANDOFF_GET,
		storeMethods: ["getApprovedTimeHandoff"],
		execute: async (data, { store }) =>
			store.getApprovedTimeHandoff({
				organizationId: data.organizationId,
				timesheetId: data.timesheetId,
			}),
	});
}

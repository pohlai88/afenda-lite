import type { Result } from "@afenda/errors";
import type { ApprovedTimeHandoff } from "../../../kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../../kernel/execution/command-options";
import { HUMAN_RESOURCES_QUERY_APPROVED_TIME_HANDOFF_GET } from "../../../kernel/operations/module-ids";
import { runTimeCapabilityQuery } from "../run-operation";
import { getApprovedTimeHandoffInputSchema } from "../schema";

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

import type { HumanResourcesCommandOptions } from "../../src/command-options";
import {
	createMemoryDocumentReferencePort,
	createMemoryWorkCalendar,
	createStoreApprovedLeaveQuery,
} from "../../src/testing";

/** Explicit test adapters — production must never fall back to these. */
export function createTestHumanResourcesCommandOptions(
	base: Partial<HumanResourcesCommandOptions> = {},
): HumanResourcesCommandOptions {
	const workCalendar = base.workCalendar ?? createMemoryWorkCalendar();
	const approvedLeave =
		base.approvedLeave ??
		(base.store !== undefined
			? createStoreApprovedLeaveQuery({ store: base.store })
			: undefined);

	return {
		workCalendar,
		documentReference: createMemoryDocumentReferencePort(),
		...base,
		approvedLeave: base.approvedLeave ?? approvedLeave,
	};
}

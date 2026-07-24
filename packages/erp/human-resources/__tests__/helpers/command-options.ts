import type { HumanResourcesCommandOptions } from "../../src/command-options";
import {
	createMemoryDocumentReferencePort,
	createMemoryOrganizationDimensionDirectory,
	createMemoryWorkCalendar,
	createStoreApprovedLeaveQuery,
} from "../../src/testing";

export const TEST_ORGANIZATION_DIMENSION_KEYS = {
	legalEntityKey: "LE-TEST",
	businessUnitKey: "BU-TEST",
	locationKey: "LOC-TEST",
	costCentreKey: "CC-TEST",
	projectKey: "PRJ-TEST",
} as const;

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
		organizationDimensions:
			base.organizationDimensions ??
			createMemoryOrganizationDimensionDirectory(),
		...base,
		approvedLeave: base.approvedLeave ?? approvedLeave,
	};
}

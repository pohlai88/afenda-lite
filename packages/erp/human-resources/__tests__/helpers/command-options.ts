import type { HumanResourcesCommandOptions } from "../../src/command-options";
import {
	createMemoryDocumentReferencePort,
	createMemoryOrganizationDimensionDirectory,
	createMemoryWorkCalendar,
	createStoreApprovedLeaveQuery,
} from "../../src/testing";
import { createStoreAssignmentContextQuery } from "../../src/time/store-assignment-context-query";

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
		(base.store === undefined
			? undefined
			: createStoreApprovedLeaveQuery({ store: base.store }));
	const assignmentContext =
		base.assignmentContext ??
		(base.store === undefined
			? undefined
			: createStoreAssignmentContextQuery({ store: base.store }));

	return {
		workCalendar,
		documentReference: createMemoryDocumentReferencePort(),
		organizationDimensions:
			base.organizationDimensions ??
			createMemoryOrganizationDimensionDirectory(),
		...base,
		approvedLeave: base.approvedLeave ?? approvedLeave,
		assignmentContext: base.assignmentContext ?? assignmentContext,
	};
}

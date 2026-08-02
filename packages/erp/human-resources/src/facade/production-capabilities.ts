import type { Result } from "@afenda/errors";
import {
	createDrizzleAssignmentContextQuery,
	createDrizzleBulkCheckpointPort,
	createDrizzleHumanResourcesBulkJobStore,
	createDrizzleHumanResourcesReportingSource,
	createDrizzleHumanResourcesStore,
	createDrizzlePayrollDeliveryStore,
	createDrizzleReliabilityStore,
	createDrizzleWorkCalendarLookup,
} from "../composition/adapters/drizzle/index";
import { resolveHumanResourcesStore } from "../composition/store/resolve-store";
import type { HumanResourcesPrivacySubjectRecord } from "../features/privacy/contract";
import { listHumanResourcesSubjectInventoryRecords as listSubjectInventoryInternal } from "../features/privacy/subject-data-collector";
import type { HumanResourcesIdentityResolverPort } from "../features/workforce-records/identity-resolution/identity-resolver";
import type { HumanResourcesEmployeeId } from "../kernel/identity/brands";
import type { HumanResourcesBulkExportDataCapability } from "./contracts";

/** Production projections hide persistence-adapter selection from consumers. */
export const createHumanResourcesBulkCheckpointCapability =
	createDrizzleBulkCheckpointPort;
export const createHumanResourcesBulkJobCapability =
	createDrizzleHumanResourcesBulkJobStore;
export function createHumanResourcesBulkExportDataCapability(): HumanResourcesBulkExportDataCapability {
	return createDrizzleHumanResourcesStore();
}
export const createHumanResourcesPayrollDeliveryCapability =
	createDrizzlePayrollDeliveryStore;
export const createHumanResourcesReliabilityCapability =
	createDrizzleReliabilityStore;
export const createHumanResourcesReportingSourceCapability =
	createDrizzleHumanResourcesReportingSource;
export function createHumanResourcesWorkCalendarLookupCapability() {
	return createDrizzleWorkCalendarLookup({
		store: resolveHumanResourcesStore(),
		assignmentContext: createDrizzleAssignmentContextQuery(),
	});
}

export function createHumanResourcesIdentityResolverCapability(): HumanResourcesIdentityResolverPort {
	const store = resolveHumanResourcesStore();
	return {
		resolveEmployeeForActor: (input) =>
			store.getUserEmployeeMapping({
				organizationId: input.organizationId,
				userId: input.actorUserId,
				...(input.asOf === undefined ? {} : { asOf: input.asOf }),
			}),
		resolveManagerEmployeesForActor: (input) =>
			store.getManagerEmployeesForUser({
				organizationId: input.organizationId,
				userId: input.actorUserId,
				...(input.asOf === undefined ? {} : { asOf: input.asOf }),
			}),
	};
}

export function listHumanResourcesSubjectInventoryRecords(input: {
	organizationId: string;
	subjectEmployeeId: HumanResourcesEmployeeId;
}): Promise<Result<readonly HumanResourcesPrivacySubjectRecord[]>> {
	return listSubjectInventoryInternal({
		...input,
		store: resolveHumanResourcesStore(),
	});
}

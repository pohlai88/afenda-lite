import type { Result } from "@afenda/errors";
import {
	createDrizzleBulkCheckpointPort,
	createDrizzleHumanResourcesBulkJobStore,
	createDrizzleHumanResourcesReportingSource,
	createDrizzleHumanResourcesStore,
	createDrizzlePayrollDeliveryStore,
	createDrizzleReliabilityStore,
	createDrizzleWorkCalendarLookup,
} from "./adapters/drizzle";
import type { HumanResourcesEmployeeId } from "./brands";
import type { HumanResourcesIdentityResolverPort } from "./identity-resolver";
import type { HumanResourcesPrivacySubjectRecord } from "./privacy";
import { listHumanResourcesSubjectInventoryRecords as listSubjectInventoryInternal } from "./privacy/subject-data-collector";
import type { HumanResourcesBulkExportDataCapability } from "./public-contracts";
import { resolveHumanResourcesStore } from "./resolve-store";

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
export const createHumanResourcesWorkCalendarLookupCapability =
	createDrizzleWorkCalendarLookup;

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

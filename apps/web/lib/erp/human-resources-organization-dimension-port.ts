import type {
	HumanResourcesOrganizationDimensions,
	OrganizationDimensionDirectoryPort,
} from "@afenda/human-resources";
import { resolveOrganizationDimensionsAsOf } from "@afenda/master-data";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";

/**
 * Application composition boundary: HR supplies tenant/date/key intent while
 * master data remains the sole owner and reader of governed dimensions.
 */
export function createHumanResourcesOrganizationDimensionPort(): OrganizationDimensionDirectoryPort {
	return {
		async resolveRequiredAsOf(input) {
			const result = await resolveOrganizationDimensionsAsOf(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					asOf: input.asOf,
					keys: input.keys,
				},
				{ authorization: createMasterDataAuthorizationPort() },
			);
			if (!result.ok) return result;
			const data: HumanResourcesOrganizationDimensions = result.data;
			return { ok: true, data };
		},
	};
}

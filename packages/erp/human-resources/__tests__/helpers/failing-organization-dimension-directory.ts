import { errorResult } from "@afenda/errors";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../src/error-codes";
import type { OrganizationDimensionDirectoryPort } from "../../src/ports";

/** Test double — rejects every dimension resolve (negative path for create/transfer). */
export function createFailingOrganizationDimensionDirectory(): OrganizationDimensionDirectoryPort {
	return {
		async resolveRequiredAsOf() {
			return await errorResult.fail("NOT_FOUND", {
				publicMessage: "Organization dimension not found for as-of date",
				internalContext: humanResourcesErrorDetails(
					HUMAN_RESOURCES_ERROR_NOT_FOUND,
				),
			});
		},
	};
}

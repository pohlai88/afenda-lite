import { fail } from "@afenda/errors/result";

import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../src/error-codes";
import type { OrganizationDimensionDirectoryPort } from "../../src/ports";

/** Test double — rejects every dimension resolve (negative path for create/transfer). */
export function createFailingOrganizationDimensionDirectory(): OrganizationDimensionDirectoryPort {
	return {
		async resolveRequiredAsOf() {
			return fail(
				"NOT_FOUND",
				"Organization dimension not found for as-of date",
				humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
			);
		},
	};
}

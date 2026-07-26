import { fail, ok, type Result } from "@afenda/errors/result";

import { corporateAdministrationErrorDetails } from "./error-codes";
import type { OrganizationId, UserId } from "./kernel/brands";
import type {
	CorporateAdministrationCommandId,
	CorporateAdministrationQueryId,
} from "./module-ids";
import type { CorporateAdministrationPermission } from "./permissions";

export type CorporateAdministrationAuthorizationContext = {
	can(input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		permission: CorporateAdministrationPermission;
	}): Promise<boolean>;
};

export const CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS =
	{} as const satisfies Record<
		CorporateAdministrationCommandId,
		CorporateAdministrationPermission
	>;

export const CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS =
	{} as const satisfies Record<
		CorporateAdministrationQueryId,
		CorporateAdministrationPermission
	>;

export async function requireCorporateAdministrationPermission(
	authorization: CorporateAdministrationAuthorizationContext | undefined,
	input: {
		organizationId: OrganizationId;
		actorUserId: UserId;
		permission: CorporateAdministrationPermission;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return fail(
			"FORBIDDEN",
			"Corporate Administration authorization is required",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_FORBIDDEN",
				{ permission: input.permission },
			),
		);
	}
	if (!(await authorization.can(input))) {
		return fail(
			"FORBIDDEN",
			"Missing required Corporate Administration permission",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_FORBIDDEN",
				{ permission: input.permission },
			),
		);
	}
	return ok(undefined);
}

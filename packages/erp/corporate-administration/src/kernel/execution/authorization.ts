import { errorResult, type Result } from "@afenda/errors";

export type CorporateAdministrationPermission =
	| "corporate_administration.establishment.read"
	| "corporate_administration.establishment.manage";

export interface CorporateAdministrationAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: CorporateAdministrationPermission;
	}) => Promise<boolean>;
}

export async function requireCorporateAdministrationPermission(
	authorization: CorporateAdministrationAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: CorporateAdministrationPermission;
	},
): Promise<Result<void>> {
	if (authorization === undefined) {
		return errorResult.fail("UNAUTHORIZED");
	}
	if (!(await authorization.can(input))) {
		return errorResult.fail("FORBIDDEN");
	}
	return errorResult.ok(undefined);
}

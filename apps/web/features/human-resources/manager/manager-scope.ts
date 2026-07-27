import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesEmployeeId } from "@afenda/human-resources/brands";

import { createHumanResourcesIdentityResolverPort } from "@/lib/erp/human-resources-identity-resolver-port";

export type ManagerScope = {
	managerEmployeeId: HumanResourcesEmployeeId;
	employeeIds: HumanResourcesEmployeeId[];
	asOf: string;
};

type ManagerSession = {
	orgId: string;
	userId: string;
};

export async function resolveManagerScope(
	session: ManagerSession,
	asOf = new Date().toISOString().slice(0, 10),
): Promise<Result<ManagerScope>> {
	const resolver = createHumanResourcesIdentityResolverPort();
	const [identity, directReports] = await Promise.all([
		resolver.resolveEmployeeForActor({
			organizationId: session.orgId,
			actorUserId: session.userId,
			asOf,
		}),
		resolver.resolveManagerEmployeesForActor({
			organizationId: session.orgId,
			actorUserId: session.userId,
			asOf,
		}),
	]);

	if (!identity.ok) return identity;
	if (!directReports.ok) return directReports;
	if (identity.data === null) {
		return fail(
			"FORBIDDEN",
			"Your account is not linked to an active employee record.",
		);
	}

	return ok({
		managerEmployeeId: identity.data.employeeId,
		employeeIds: [...new Set(directReports.data)],
		asOf,
	});
}

export function isEmployeeInManagerScope(
	scope: ManagerScope,
	employeeId: string,
): boolean {
	return scope.employeeIds.some((scopedId) => scopedId === employeeId);
}

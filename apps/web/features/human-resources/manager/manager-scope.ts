import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesEmployeeId } from "@afenda/human-resources";

import { createHumanResourcesIdentityResolverPort } from "@/lib/erp/human-resources-identity-resolver-port";

export interface ManagerScope {
	asOf: string;
	employeeIds: HumanResourcesEmployeeId[];
	managerEmployeeId: HumanResourcesEmployeeId;
}

interface ManagerSession {
	orgId: string;
	userId: string;
}

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

	if (!identity.ok) {
		return identity;
	}
	if (!directReports.ok) {
		return directReports;
	}
	if (identity.data === null) {
		return errorResult.fail("FORBIDDEN");
	}

	return errorResult.ok({
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

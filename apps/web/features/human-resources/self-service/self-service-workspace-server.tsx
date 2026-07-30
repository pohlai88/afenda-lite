import { getSession } from "@afenda/auth";

import { forbidPermissionAccess } from "@/features/auth/require-permission";
import type { HrDisplayPreferences } from "@/features/human-resources/display-preferences";
import { createHumanResourcesIdentityResolverPort } from "@/lib/erp/human-resources-identity-resolver-port";

import { loadSelfServiceSnapshot } from "./load-self-service";
import {
	hasSelfServiceCapability,
	resolveSelfServicePermissions,
} from "./self-service-permissions";
import { SelfServiceWorkspace } from "./self-service-workspace";

export async function SelfServiceWorkspaceServer({
	page,
	preferences,
}: {
	page: number;
	preferences: HrDisplayPreferences;
}) {
	const session = await getSession();
	const permissions = await resolveSelfServicePermissions(session);
	if (!hasSelfServiceCapability(permissions)) {
		forbidPermissionAccess();
	}

	const identity =
		await createHumanResourcesIdentityResolverPort().resolveEmployeeForActor({
			organizationId: session.orgId,
			actorUserId: session.userId,
		});
	if (!identity.ok || identity.data === null) {
		forbidPermissionAccess();
	}

	const snapshot = await loadSelfServiceSnapshot({
		organizationId: session.orgId,
		actorUserId: session.userId,
		employeeId: identity.data.employeeId,
		page,
	});

	return (
		<SelfServiceWorkspace
			permissions={permissions}
			preferences={preferences}
			snapshot={snapshot}
		/>
	);
}

/**
 * # Authorization
 *
 * Governance permissions deliberately distinguish workflow stages:
 *
 * - read and creation
 * - submission and review
 * - approval or rejection
 * - application
 * - cancellation and retry
 *
 * Approval authority and application authority must remain independently
 * enforceable, even when a consuming application presents them through a
 * broader role or permission group.
 */
import { errorResult, type Result } from "@afenda/errors";

import {
	governanceAuthorizationUnavailable,
	governancePermissionRequired,
} from "./governance-errors";
import type { GovernancePermission } from "./permissions";

export interface GovernanceAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: GovernancePermission;
	}) => Promise<boolean>;
}

export async function requireGovernancePermission(
	authorization: GovernanceAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: GovernancePermission;
	},
): Promise<Result<true>> {
	if (authorization === undefined) {
		return governanceAuthorizationUnavailable({
			requiredPermission: input.permission,
		});
	}
	const allowed = await authorization.can(input);
	if (!allowed) {
		return governancePermissionRequired({
			requiredPermission: input.permission,
		});
	}
	return errorResult.ok(true);
}

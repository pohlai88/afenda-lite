import { errorResult, type Result } from "@afenda/errors";

import { fulfillmentModuleManifest } from "./module.manifest";
import type { FulfillmentCommandId, FulfillmentQueryId } from "./module-ids";
import type { FULFILLMENT_PERMISSION_CODES } from "./permissions";

export type FulfillmentPermission =
	(typeof FULFILLMENT_PERMISSION_CODES)[number];
export interface FulfillmentAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: FulfillmentPermission;
	}) => Promise<boolean>;
}

async function requirePermission(
	authorization: FulfillmentAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: FulfillmentPermission;
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

export function requireFulfillmentCommandPermission(
	authorization: FulfillmentAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: FulfillmentCommandId;
	},
): Promise<Result<void>> {
	return requirePermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: fulfillmentModuleManifest.authorization.commands[input.command],
	});
}

export function requireFulfillmentQueryPermission(
	authorization: FulfillmentAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: FulfillmentQueryId;
	},
): Promise<Result<void>> {
	return requirePermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission: fulfillmentModuleManifest.authorization.queries[input.query],
	});
}

import { fail, ok, type Result } from "@afenda/errors/result";

import { fulfillmentModuleManifest } from "./module.manifest";
import type { FulfillmentCommandId, FulfillmentQueryId } from "./module-ids";
import type { FULFILLMENT_PERMISSION_CODES } from "./permissions";

export type FulfillmentPermission =
	(typeof FULFILLMENT_PERMISSION_CODES)[number];
export type FulfillmentAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: FulfillmentPermission;
	}): Promise<boolean>;
};

async function requirePermission(
	authorization: FulfillmentAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: FulfillmentPermission;
	},
): Promise<Result<void>> {
	if (authorization === undefined) {
		return fail("UNAUTHORIZED", "Fulfillment authorization port is required", {
			permission: input.permission,
		});
	}
	if (!(await authorization.can(input))) {
		return fail("FORBIDDEN", "Missing required fulfillment permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
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

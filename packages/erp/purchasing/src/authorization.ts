import { errorResult, type Result } from "@afenda/errors";
import { purchasingModuleManifest } from "./composition/module.manifest";
import type { PurchasingCommandId, PurchasingQueryId } from "./module-ids";
import type { PURCHASING_PERMISSION_CODES } from "./permissions";

export type PurchasingPermission = (typeof PURCHASING_PERMISSION_CODES)[number];

export interface PurchasingAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: PurchasingPermission;
	}) => Promise<boolean>;
}

export function requirePurchasingCommandPermission(
	authorization: PurchasingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: PurchasingCommandId;
	},
): Promise<Result<void>> {
	const permission =
		purchasingModuleManifest.authorization.commands[input.command];
	return requirePurchasingPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export function requirePurchasingQueryPermission(
	authorization: PurchasingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: PurchasingQueryId;
	},
): Promise<Result<void>> {
	const permission =
		purchasingModuleManifest.authorization.queries[input.query];
	return requirePurchasingPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

async function requirePurchasingPermission(
	authorization: PurchasingAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: PurchasingPermission;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return errorResult.fail("UNAUTHORIZED");
	}
	const allowed = await authorization.can(input);
	if (!allowed) {
		return errorResult.fail("FORBIDDEN");
	}
	return errorResult.ok(undefined);
}

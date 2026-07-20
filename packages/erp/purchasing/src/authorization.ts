import { fail, ok, type Result } from "@afenda/errors/result";
import { purchasingModuleManifest } from "./module.manifest";
import type { PurchasingCommandId, PurchasingQueryId } from "./module-ids";
import type { PURCHASING_PERMISSION_CODES } from "./permissions";

export type PurchasingPermission = (typeof PURCHASING_PERMISSION_CODES)[number];

export type PurchasingAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: PurchasingPermission;
	}): Promise<boolean>;
};

export async function requirePurchasingCommandPermission(
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

export async function requirePurchasingQueryPermission(
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
		return fail("UNAUTHORIZED", "Purchasing authorization port is required", {
			permission: input.permission,
		});
	}
	const allowed = await authorization.can(input);
	if (!allowed) {
		return fail("FORBIDDEN", "Missing required purchasing permission", {
			permission: input.permission,
		});
	}
	return ok(undefined);
}

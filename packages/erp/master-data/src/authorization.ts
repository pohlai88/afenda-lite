import { fail, ok, type Result } from "@afenda/errors/result";
import { masterDataModuleManifest } from "./module.manifest";
import type { MasterCommandId, MasterQueryId } from "./module-ids";
import {
	type MASTER_DATA_PERMISSION_CODES,
	MASTER_DATA_PERMISSION_PARTY_CONTACT_READ,
	MASTER_DATA_PERMISSION_PARTY_CONTACT_SENSITIVE_READ,
	MASTER_DATA_PERMISSION_TAX_REGISTRATION_READ,
	MASTER_DATA_PERMISSION_TAX_REGISTRATION_SENSITIVE_READ,
} from "./permissions";

export type MasterPermission = (typeof MASTER_DATA_PERMISSION_CODES)[number];

export type MasterAuthorizationPort = {
	can(input: {
		organizationId: string;
		actorUserId: string;
		permission: MasterPermission;
	}): Promise<boolean>;
};

export async function requireMasterCommandPermission(
	authorization: MasterAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: MasterCommandId;
	},
): Promise<Result<void>> {
	const permission =
		masterDataModuleManifest.authorization.commands[input.command];
	return requireMasterPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export async function requireMasterQueryPermission(
	authorization: MasterAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		query: MasterQueryId;
	},
): Promise<Result<void>> {
	const permission =
		masterDataModuleManifest.authorization.queries[input.query];
	return requireMasterPermission(authorization, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

async function requireMasterPermission(
	authorization: MasterAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: MasterPermission;
	},
): Promise<Result<void>> {
	if (!authorization) {
		return fail("UNAUTHORIZED", "Master-data authorization port is required", {
			permission: input.permission,
		});
	}
	const allowed = await authorization.can(input);
	if (allowed) return ok(undefined);

	const strongerPermissions = strongerReadPermissionsFor(input.permission);
	for (const permission of strongerPermissions) {
		const allowedByStrongerGrant = await authorization.can({
			...input,
			permission,
		});
		if (allowedByStrongerGrant) return ok(undefined);
	}

	return fail("FORBIDDEN", "Missing required master-data permission", {
		permission: input.permission,
	});
}

function strongerReadPermissionsFor(
	permission: MasterPermission,
): readonly MasterPermission[] {
	switch (permission) {
		case MASTER_DATA_PERMISSION_TAX_REGISTRATION_READ:
			return [MASTER_DATA_PERMISSION_TAX_REGISTRATION_SENSITIVE_READ];
		case MASTER_DATA_PERMISSION_PARTY_CONTACT_READ:
			return [MASTER_DATA_PERMISSION_PARTY_CONTACT_SENSITIVE_READ];
		default:
			return [];
	}
}

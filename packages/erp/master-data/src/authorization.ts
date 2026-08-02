import { errorResult, type Result } from "@afenda/errors";
import { masterDataModuleManifest } from "./composition/module.manifest";
import type { MasterCommandId, MasterQueryId } from "./module-ids";
import {
	type MASTER_DATA_PERMISSION_CODES,
	MASTER_DATA_PERMISSION_PARTY_CONTACT_READ,
	MASTER_DATA_PERMISSION_PARTY_CONTACT_SENSITIVE_READ,
	MASTER_DATA_PERMISSION_TAX_REGISTRATION_READ,
	MASTER_DATA_PERMISSION_TAX_REGISTRATION_SENSITIVE_READ,
} from "./permissions";
import { runSequentiallyUntil } from "./resolve-async";

export type MasterPermission = (typeof MASTER_DATA_PERMISSION_CODES)[number];

export interface MasterAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: MasterPermission;
	}) => Promise<boolean>;
}

export function requireMasterCommandPermission(
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

export function requireMasterQueryPermission(
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
		return errorResult.fail("UNAUTHORIZED");
	}
	const allowed = await authorization.can(input);
	if (allowed) {
		return errorResult.ok(undefined);
	}

	const strongerPermissions = strongerReadPermissionsFor(input.permission);
	const allowedByStrongerGrant = await runSequentiallyUntil(
		strongerPermissions,
		async (permission) =>
			(await authorization.can({ ...input, permission })) ? true : undefined,
	);
	if (allowedByStrongerGrant === true) {
		return errorResult.ok(undefined);
	}

	return errorResult.fail("FORBIDDEN");
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

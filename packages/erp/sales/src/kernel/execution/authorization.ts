import { errorResult, type Result } from "@afenda/errors";
import type { SalesCommandId, SalesQueryId } from "../operations/module-ids";
import {
	SALES_COMMAND_AUTHORIZATION,
	SALES_QUERY_AUTHORIZATION,
} from "../operations/registry";
import type { SalesPermission } from "./permissions";

export {
	SALES_COMMAND_AUTHORIZATION as SALES_COMMAND_PERMISSION,
	SALES_QUERY_AUTHORIZATION as SALES_QUERY_PERMISSION,
} from "../operations/registry";

export interface SalesAuthorizationPort {
	can: (input: {
		organizationId: string;
		actorUserId: string;
		permission: SalesPermission;
	}) => Promise<boolean>;
}

async function requirePermission(
	port: SalesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		permission: SalesPermission;
	},
): Promise<Result<void>> {
	if (!port) {
		return errorResult.fail("UNAUTHORIZED");
	}
	return (await port.can(input))
		? errorResult.ok(undefined)
		: errorResult.fail("FORBIDDEN");
}

export function requireSalesCommandPermission(
	port: SalesAuthorizationPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		command: SalesCommandId;
	},
): Promise<Result<void>> {
	const permission = SALES_COMMAND_AUTHORIZATION[input.command];
	if (permission === undefined) {
		return Promise.resolve(errorResult.fail("UNAUTHORIZED"));
	}
	return requirePermission(port, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

export function requireSalesQueryPermission(
	port: SalesAuthorizationPort | undefined,
	input: { organizationId: string; actorUserId: string; query: SalesQueryId },
): Promise<Result<void>> {
	const permission = SALES_QUERY_AUTHORIZATION[input.query];
	if (permission === undefined) {
		return Promise.resolve(errorResult.fail("UNAUTHORIZED"));
	}
	return requirePermission(port, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		permission,
	});
}

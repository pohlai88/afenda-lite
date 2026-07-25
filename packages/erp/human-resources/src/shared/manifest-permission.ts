import { humanResourcesModuleManifest } from "../module.manifest";
import type {
	HumanResourcesCommandId,
	HumanResourcesQueryId,
} from "../module-ids";
import type { HumanResourcesPermission } from "../permissions";
import type {
	HumanResourcesOperationId,
	HumanResourcesOperationKind,
} from "./authorization-types";

function isCommandId(
	operationId: HumanResourcesOperationId,
	operationKind: HumanResourcesOperationKind,
): operationId is HumanResourcesCommandId {
	return operationKind === "command";
}

function isQueryId(
	operationId: HumanResourcesOperationId,
	operationKind: HumanResourcesOperationKind,
): operationId is HumanResourcesQueryId {
	return operationKind === "query";
}

export function resolveManifestOperationPermission(
	operationId: HumanResourcesOperationId,
	operationKind: HumanResourcesOperationKind,
): HumanResourcesPermission | undefined {
	if (isCommandId(operationId, operationKind)) {
		return humanResourcesModuleManifest.authorization.commands[operationId];
	}
	if (isQueryId(operationId, operationKind)) {
		return humanResourcesModuleManifest.authorization.queries[operationId];
	}
	return undefined;
}

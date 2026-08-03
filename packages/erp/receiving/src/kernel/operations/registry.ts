import {
	RECEIVING_RECEIPT_COMMANDS,
	RECEIVING_RECEIPT_QUERIES,
} from "../../features/receipts/operation-registry";
import {
	composeReceivingOperationRegistries,
	projectReceivingAuthorization,
	projectReceivingOperationIds,
} from "./define-registry";

/** Canonical composed Receiving operation definitions (feature order). */
export const RECEIVING_COMMAND_DEFINITIONS =
	composeReceivingOperationRegistries(RECEIVING_RECEIPT_COMMANDS);

export const RECEIVING_QUERY_DEFINITIONS = composeReceivingOperationRegistries(
	RECEIVING_RECEIPT_QUERIES,
);

export const RECEIVING_REGISTRY_COMMAND_IDS = projectReceivingOperationIds(
	RECEIVING_COMMAND_DEFINITIONS,
);
export const RECEIVING_REGISTRY_QUERY_IDS = projectReceivingOperationIds(
	RECEIVING_QUERY_DEFINITIONS,
);
export const RECEIVING_COMMAND_AUTHORIZATION = projectReceivingAuthorization(
	RECEIVING_COMMAND_DEFINITIONS,
);
export const RECEIVING_QUERY_AUTHORIZATION = projectReceivingAuthorization(
	RECEIVING_QUERY_DEFINITIONS,
);

import {
	PURCHASING_ORDER_COMMANDS,
	PURCHASING_ORDER_QUERIES,
} from "../../features/orders/operation-registry";
import {
	composePurchasingOperationRegistries,
	projectPurchasingAuthorization,
	projectPurchasingOperationIds,
} from "./define-registry";

/** Canonical composed Purchasing operation definitions (feature order). */
export const PURCHASING_COMMAND_DEFINITIONS =
	composePurchasingOperationRegistries(PURCHASING_ORDER_COMMANDS);

export const PURCHASING_QUERY_DEFINITIONS =
	composePurchasingOperationRegistries(PURCHASING_ORDER_QUERIES);

export const PURCHASING_REGISTRY_COMMAND_IDS = projectPurchasingOperationIds(
	PURCHASING_COMMAND_DEFINITIONS,
);
export const PURCHASING_REGISTRY_QUERY_IDS = projectPurchasingOperationIds(
	PURCHASING_QUERY_DEFINITIONS,
);
export const PURCHASING_COMMAND_AUTHORIZATION = projectPurchasingAuthorization(
	PURCHASING_COMMAND_DEFINITIONS,
);
export const PURCHASING_QUERY_AUTHORIZATION = projectPurchasingAuthorization(
	PURCHASING_QUERY_DEFINITIONS,
);

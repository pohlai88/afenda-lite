import {
	FULFILLMENT_DELIVERY_COMMANDS,
	FULFILLMENT_DELIVERY_QUERIES,
} from "../../features/deliveries/operation-registry";
import {
	composeFulfillmentOperationRegistries,
	projectFulfillmentAuthorization,
	projectFulfillmentOperationIds,
} from "./define-registry";

/** Canonical composed Fulfillment operation definitions (feature order). */
export const FULFILLMENT_COMMAND_DEFINITIONS =
	composeFulfillmentOperationRegistries(FULFILLMENT_DELIVERY_COMMANDS);

export const FULFILLMENT_QUERY_DEFINITIONS =
	composeFulfillmentOperationRegistries(FULFILLMENT_DELIVERY_QUERIES);

export const FULFILLMENT_REGISTRY_COMMAND_IDS = projectFulfillmentOperationIds(
	FULFILLMENT_COMMAND_DEFINITIONS,
);
export const FULFILLMENT_REGISTRY_QUERY_IDS = projectFulfillmentOperationIds(
	FULFILLMENT_QUERY_DEFINITIONS,
);
export const FULFILLMENT_COMMAND_AUTHORIZATION =
	projectFulfillmentAuthorization(FULFILLMENT_COMMAND_DEFINITIONS);
export const FULFILLMENT_QUERY_AUTHORIZATION = projectFulfillmentAuthorization(
	FULFILLMENT_QUERY_DEFINITIONS,
);

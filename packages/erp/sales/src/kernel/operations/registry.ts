import { SALES_HOLD_COMMANDS } from "../../features/approvals-and-holds/operation-registry";
import {
	SALES_PRICING_COMMANDS,
	SALES_PRICING_QUERIES,
} from "../../features/commercial-pricing/operation-registry";
import {
	SALES_ORDER_EXECUTION_COMMANDS,
	SALES_ORDER_LIFECYCLE_COMMANDS,
	SALES_ORDER_QUERIES,
} from "../../features/order-management/operation-registry";
import {
	SALES_QUOTATION_COMMANDS,
	SALES_QUOTATION_QUERIES,
} from "../../features/quotation-management/operation-registry";
import {
	SALES_RETURN_COMMANDS,
	SALES_RETURN_QUERIES,
} from "../../features/return-authorizations/operation-registry";
import {
	composeSalesOperationRegistries,
	projectSalesAuthorization,
	projectSalesOperationIds,
} from "./define-registry";

/**
 * Canonical composed Sales operation definitions. The composition order
 * reproduces the historical module-ids sequence byte-for-byte so the
 * generated register projections stay stable.
 */
export const SALES_COMMAND_DEFINITIONS = composeSalesOperationRegistries(
	SALES_PRICING_COMMANDS,
	SALES_QUOTATION_COMMANDS,
	SALES_ORDER_LIFECYCLE_COMMANDS,
	SALES_HOLD_COMMANDS,
	SALES_ORDER_EXECUTION_COMMANDS,
	SALES_RETURN_COMMANDS,
);

export const SALES_QUERY_DEFINITIONS = composeSalesOperationRegistries(
	SALES_PRICING_QUERIES,
	SALES_QUOTATION_QUERIES,
	SALES_ORDER_QUERIES,
	SALES_RETURN_QUERIES,
);

export const SALES_REGISTRY_COMMAND_IDS = projectSalesOperationIds(
	SALES_COMMAND_DEFINITIONS,
);
export const SALES_REGISTRY_QUERY_IDS = projectSalesOperationIds(
	SALES_QUERY_DEFINITIONS,
);
export const SALES_COMMAND_AUTHORIZATION = projectSalesAuthorization(
	SALES_COMMAND_DEFINITIONS,
);
export const SALES_QUERY_AUTHORIZATION = projectSalesAuthorization(
	SALES_QUERY_DEFINITIONS,
);

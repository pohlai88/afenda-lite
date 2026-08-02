import {
	PAYMENTS_INSTRUCTION_COMMANDS,
	PAYMENTS_INSTRUCTION_QUERIES,
} from "../../features/application-instructions/operation-registry";
import {
	PAYMENTS_ACCOUNT_COMMANDS,
	PAYMENTS_ACCOUNT_QUERIES,
} from "../../features/payment-accounts/operation-registry";
import {
	PAYMENTS_LIFECYCLE_COMMANDS,
	PAYMENTS_LIFECYCLE_QUERIES,
} from "../../features/payment-lifecycle/operation-registry";
import {
	composePaymentsOperationRegistries,
	projectPaymentsAuthorization,
	projectPaymentsOperationIds,
} from "./define-registry";

/** Canonical composed Payments operation definitions (feature order). */
export const PAYMENTS_COMMAND_DEFINITIONS = composePaymentsOperationRegistries(
	PAYMENTS_ACCOUNT_COMMANDS,
	PAYMENTS_LIFECYCLE_COMMANDS,
	PAYMENTS_INSTRUCTION_COMMANDS,
);

export const PAYMENTS_QUERY_DEFINITIONS = composePaymentsOperationRegistries(
	PAYMENTS_ACCOUNT_QUERIES,
	PAYMENTS_LIFECYCLE_QUERIES,
	PAYMENTS_INSTRUCTION_QUERIES,
);

export const PAYMENTS_COMMAND_IDS = projectPaymentsOperationIds(
	PAYMENTS_COMMAND_DEFINITIONS,
);
export const PAYMENTS_QUERY_IDS = projectPaymentsOperationIds(
	PAYMENTS_QUERY_DEFINITIONS,
);
export const PAYMENTS_COMMAND_AUTHORIZATION = projectPaymentsAuthorization(
	PAYMENTS_COMMAND_DEFINITIONS,
);
export const PAYMENTS_QUERY_AUTHORIZATION = projectPaymentsAuthorization(
	PAYMENTS_QUERY_DEFINITIONS,
);

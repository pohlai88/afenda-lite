import { PAYABLES_ALLOCATION_COMMANDS } from "../../features/allocations/operation-registry";
import { PAYABLES_CREDIT_NOTE_COMMANDS } from "../../features/credit-notes/operation-registry";
import {
	PAYABLES_INVOICE_COMMANDS,
	PAYABLES_INVOICE_QUERIES,
} from "../../features/invoice-lifecycle/operation-registry";
import { PAYABLES_BALANCE_QUERIES } from "../../features/supplier-balance/operation-registry";
import {
	composePayablesOperationRegistries,
	projectPayablesAuthorization,
	projectPayablesOperationIds,
} from "./define-registry";

/** Canonical composed Payables operation definitions (feature order). */
export const PAYABLES_COMMAND_DEFINITIONS = composePayablesOperationRegistries(
	PAYABLES_INVOICE_COMMANDS,
	PAYABLES_CREDIT_NOTE_COMMANDS,
	PAYABLES_ALLOCATION_COMMANDS,
);

export const PAYABLES_QUERY_DEFINITIONS = composePayablesOperationRegistries(
	PAYABLES_INVOICE_QUERIES,
	PAYABLES_BALANCE_QUERIES,
);

export const PAYABLES_COMMAND_IDS = projectPayablesOperationIds(
	PAYABLES_COMMAND_DEFINITIONS,
);
export const PAYABLES_QUERY_IDS = projectPayablesOperationIds(
	PAYABLES_QUERY_DEFINITIONS,
);
export const PAYABLES_COMMAND_AUTHORIZATION = projectPayablesAuthorization(
	PAYABLES_COMMAND_DEFINITIONS,
);
export const PAYABLES_QUERY_AUTHORIZATION = projectPayablesAuthorization(
	PAYABLES_QUERY_DEFINITIONS,
);

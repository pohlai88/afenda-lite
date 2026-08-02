import {
	RECEIVABLES_INVOICE_COMMANDS,
	RECEIVABLES_INVOICE_QUERIES,
} from "../../features/invoices/operation-registry";
import {
	composeReceivablesOperationRegistries,
	projectReceivablesAuthorization,
	projectReceivablesOperationIds,
} from "./define-registry";

/** Canonical composed Receivables operation definitions (feature order). */
export const RECEIVABLES_COMMAND_DEFINITIONS =
	composeReceivablesOperationRegistries(RECEIVABLES_INVOICE_COMMANDS);

export const RECEIVABLES_QUERY_DEFINITIONS =
	composeReceivablesOperationRegistries(RECEIVABLES_INVOICE_QUERIES);

export const RECEIVABLES_REGISTRY_COMMAND_IDS = projectReceivablesOperationIds(
	RECEIVABLES_COMMAND_DEFINITIONS,
);
export const RECEIVABLES_REGISTRY_QUERY_IDS = projectReceivablesOperationIds(
	RECEIVABLES_QUERY_DEFINITIONS,
);
export const RECEIVABLES_COMMAND_AUTHORIZATION =
	projectReceivablesAuthorization(RECEIVABLES_COMMAND_DEFINITIONS);
export const RECEIVABLES_QUERY_AUTHORIZATION = projectReceivablesAuthorization(
	RECEIVABLES_QUERY_DEFINITIONS,
);

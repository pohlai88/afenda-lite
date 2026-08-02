import {
	ACCOUNTING_JOURNAL_COMMANDS,
	ACCOUNTING_JOURNAL_QUERIES,
} from "../../features/journals/operation-registry";
import {
	ACCOUNTING_LEDGER_MASTER_COMMANDS,
	ACCOUNTING_LEDGER_MASTER_QUERIES,
} from "../../features/ledger-master/operation-registry";
import { ACCOUNTING_PERIOD_COMMANDS } from "../../features/periods/operation-registry";
import {
	ACCOUNTING_SOURCE_POSTING_COMMANDS,
	ACCOUNTING_SOURCE_POSTING_QUERIES,
} from "../../features/source-posting/operation-registry";
import {
	composeAccountingOperationRegistries,
	projectAccountingAuthorization,
	projectAccountingOperationIds,
} from "./define-registry";

/** Canonical composed Accounting operation definitions (feature order). */
export const ACCOUNTING_COMMAND_DEFINITIONS =
	composeAccountingOperationRegistries(
		ACCOUNTING_JOURNAL_COMMANDS,
		ACCOUNTING_PERIOD_COMMANDS,
		ACCOUNTING_LEDGER_MASTER_COMMANDS,
		ACCOUNTING_SOURCE_POSTING_COMMANDS,
	);

export const ACCOUNTING_QUERY_DEFINITIONS =
	composeAccountingOperationRegistries(
		ACCOUNTING_JOURNAL_QUERIES,
		ACCOUNTING_LEDGER_MASTER_QUERIES,
		ACCOUNTING_SOURCE_POSTING_QUERIES,
	);

export const ACCOUNTING_COMMAND_IDS = projectAccountingOperationIds(
	ACCOUNTING_COMMAND_DEFINITIONS,
);
export const ACCOUNTING_QUERY_IDS = projectAccountingOperationIds(
	ACCOUNTING_QUERY_DEFINITIONS,
);
export const ACCOUNTING_COMMAND_AUTHORIZATION = projectAccountingAuthorization(
	ACCOUNTING_COMMAND_DEFINITIONS,
);
export const ACCOUNTING_QUERY_AUTHORIZATION = projectAccountingAuthorization(
	ACCOUNTING_QUERY_DEFINITIONS,
);

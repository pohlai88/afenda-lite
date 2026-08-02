import { defineAccountingOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "ledger-master" as const;

export const ACCOUNTING_LEDGER_MASTER_COMMANDS =
	defineAccountingOperationRegistry({
		createChartOfAccounts: {
			id: "accounting.chart.create",
			kind: "command",
			owner: OWNER,
			permission: "accounting.account.manage",
			publicName: "createChartOfAccounts",
		},
		createLedgerAccount: {
			id: "accounting.ledger_account.create",
			kind: "command",
			owner: OWNER,
			permission: "accounting.account.manage",
			publicName: "createLedgerAccount",
		},
		updateLedgerAccount: {
			id: "accounting.ledger_account.update",
			kind: "command",
			owner: OWNER,
			permission: "accounting.account.manage",
			publicName: "updateLedgerAccount",
		},
		deactivateLedgerAccount: {
			id: "accounting.ledger_account.deactivate",
			kind: "command",
			owner: OWNER,
			permission: "accounting.account.manage",
			publicName: "deactivateLedgerAccount",
		},
		mapAccountRole: {
			id: "accounting.account_role.map",
			kind: "command",
			owner: OWNER,
			permission: "accounting.account.manage",
			publicName: "mapAccountRole",
		},
	});

export const ACCOUNTING_LEDGER_MASTER_QUERIES =
	defineAccountingOperationRegistry({
		listLedgerAccounts: {
			id: "accounting.ledger_account.list",
			kind: "query",
			owner: OWNER,
			permission: "accounting.account.read",
			publicName: "listLedgerAccounts",
		},
	});

import { defineAccountingOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "periods" as const;

export const ACCOUNTING_PERIOD_COMMANDS = defineAccountingOperationRegistry({
	openAccountingPeriod: {
		id: "accounting.period.open",
		kind: "command",
		owner: OWNER,
		permission: "accounting.period.open",
		publicName: "openAccountingPeriod",
	},
	softCloseAccountingPeriod: {
		id: "accounting.period.soft_close",
		kind: "command",
		owner: OWNER,
		permission: "accounting.period.soft_close",
		publicName: "softCloseAccountingPeriod",
	},
	closeAccountingPeriod: {
		id: "accounting.period.close",
		kind: "command",
		owner: OWNER,
		permission: "accounting.period.close",
		publicName: "closeAccountingPeriod",
	},
	reopenAccountingPeriod: {
		id: "accounting.period.reopen",
		kind: "command",
		owner: OWNER,
		permission: "accounting.period.reopen",
		publicName: "reopenAccountingPeriod",
	},
});

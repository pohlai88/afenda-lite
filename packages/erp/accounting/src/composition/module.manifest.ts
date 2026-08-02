import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	ACCOUNTING_JOURNAL_POSTED_EVENT,
	ACCOUNTING_JOURNAL_REVERSED_EVENT,
} from "@afenda/events/schemas";

import {
	ACCOUNTING_AGGREGATES,
	ACCOUNTING_MUTATION_TABLES,
} from "../kernel/emissions/mutation-tables";
import {
	ACCOUNTING_COMMAND_AUTHORIZATION,
	ACCOUNTING_COMMAND_IDS,
	ACCOUNTING_QUERY_AUTHORIZATION,
	ACCOUNTING_QUERY_IDS,
} from "../kernel/operations/registry";

export const accountingModuleManifest = {
	id: "accounting",
	category: "commercial/finance",
	packageName: "@afenda/accounting",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [...ACCOUNTING_AGGREGATES],
		commandNamespace: "accounting",
		commands: [...ACCOUNTING_COMMAND_IDS],
		queryNamespace: "accounting",
		queries: [...ACCOUNTING_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [...ACCOUNTING_MUTATION_TABLES],
	},
	events: {
		namespace: "accounting",
		emits: [ACCOUNTING_JOURNAL_POSTED_EVENT, ACCOUNTING_JOURNAL_REVERSED_EVENT],
		consumes: [],
	},
	permissions: {
		namespace: "accounting",
		codes: [
			"accounting.journal.read",
			"accounting.journal.create",
			"accounting.journal.update",
			"accounting.journal.post",
			"accounting.journal.reverse",
			"accounting.trial_balance.read",
			"accounting.ledger.read",
			"accounting.period.read",
			"accounting.period.open",
			"accounting.period.soft_close",
			"accounting.period.close",
			"accounting.period.reopen",
			"accounting.account.read",
			"accounting.account.manage",
			"accounting.posting_rule.manage",
			"accounting.exception.read",
			"accounting.exception.manage",
		],
	},
	authorization: {
		commands: ACCOUNTING_COMMAND_AUTHORIZATION,
		queries: ACCOUNTING_QUERY_AUTHORIZATION,
	},
	moduleDependencies: {
		required: [],
	},
	optionalIntegratesWith: [
		{ moduleId: "sales", style: "events" },
		{ moduleId: "purchasing", style: "events" },
		{ moduleId: "inventory", style: "events" },
		{ moduleId: "receivables", style: "events" },
		{ moduleId: "payables", style: "events" },
		{ moduleId: "payments", style: "events" },
	],
} as const satisfies AfendaModuleManifest;

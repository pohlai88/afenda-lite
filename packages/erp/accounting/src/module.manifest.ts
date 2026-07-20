import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	ACCOUNTING_JOURNAL_POSTED_EVENT,
	ACCOUNTING_JOURNAL_REVERSED_EVENT,
} from "@afenda/events/schemas";

export const accountingModuleManifest = {
	id: "accounting",
	category: "commercial/finance",
	packageName: "@afenda/accounting",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: ["journal", "accounting_period"],
		commandNamespace: "accounting",
		commands: [
			"accounting.journal.create",
			"accounting.journal.line.add",
			"accounting.journal.post",
			"accounting.journal.reverse",
			"accounting.period.open",
			"accounting.period.close",
		],
		queryNamespace: "accounting",
		queries: [
			"accounting.journal.get",
			"accounting.journal.list",
			"accounting.trial-balance.get",
		],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [
			"journal",
			"journal_line",
			"ledger_posting",
			"accounting_period",
		],
	},
	events: {
		namespace: "accounting",
		emits: [ACCOUNTING_JOURNAL_POSTED_EVENT, ACCOUNTING_JOURNAL_REVERSED_EVENT],
		consumes: [],
	},
	permissions: {
		namespace: "accounting",
		codes: ["accounting.read", "accounting.manage"],
	},
	authorization: {
		commands: {
			"accounting.journal.create": "accounting.manage",
			"accounting.journal.line.add": "accounting.manage",
			"accounting.journal.post": "accounting.manage",
			"accounting.journal.reverse": "accounting.manage",
			"accounting.period.open": "accounting.manage",
			"accounting.period.close": "accounting.manage",
		},
		queries: {
			"accounting.journal.get": "accounting.read",
			"accounting.journal.list": "accounting.read",
			"accounting.trial-balance.get": "accounting.read",
		},
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

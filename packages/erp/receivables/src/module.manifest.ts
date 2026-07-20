import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	RECEIVABLES_ALLOCATION_POSTED_EVENT,
	RECEIVABLES_CREDIT_NOTE_POSTED_EVENT,
	RECEIVABLES_INVOICE_POSTED_EVENT,
} from "@afenda/events/schemas";

export const receivablesModuleManifest = {
	id: "receivables",
	category: "commercial",
	packageName: "@afenda/receivables",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [
			"sales_invoice",
			"customer_allocation",
			"customer_balance_projection",
		],
		commandNamespace: "receivables",
		commands: [
			"receivables.invoice.create",
			"receivables.invoice.line.add",
			"receivables.invoice.post",
			"receivables.credit_note.issue",
			"receivables.allocation.create",
			"receivables.invoice.cancel",
		],
		queryNamespace: "receivables",
		queries: [
			"receivables.invoice.get",
			"receivables.invoice.list",
			"receivables.balance.get",
		],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [
			"sales_invoice",
			"sales_invoice_line",
			"sales_credit_note",
			"customer_allocation",
			"customer_balance_projection",
		],
	},
	events: {
		namespace: "receivables",
		emits: [
			RECEIVABLES_INVOICE_POSTED_EVENT,
			RECEIVABLES_CREDIT_NOTE_POSTED_EVENT,
			RECEIVABLES_ALLOCATION_POSTED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "receivables",
		codes: ["receivables.read", "receivables.manage"],
	},
	authorization: {
		commands: {
			"receivables.invoice.create": "receivables.manage",
			"receivables.invoice.line.add": "receivables.manage",
			"receivables.invoice.post": "receivables.manage",
			"receivables.credit_note.issue": "receivables.manage",
			"receivables.allocation.create": "receivables.manage",
			"receivables.invoice.cancel": "receivables.manage",
		},
		queries: {
			"receivables.invoice.get": "receivables.read",
			"receivables.invoice.list": "receivables.read",
			"receivables.balance.get": "receivables.read",
		},
	},
	moduleDependencies: {
		required: ["master-data"],
	},
	optionalIntegratesWith: [],
} as const satisfies AfendaModuleManifest;

import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	PAYABLES_ALLOCATION_POSTED_EVENT,
	PAYABLES_CREDIT_NOTE_POSTED_EVENT,
	PAYABLES_INVOICE_CREATED_EVENT,
	PAYABLES_INVOICE_MATCHED_EVENT,
	PAYABLES_INVOICE_POSTED_EVENT,
} from "@afenda/events/schemas";

export const payablesModuleManifest = {
	id: "payables",
	category: "commercial",
	packageName: "@afenda/payables",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [
			"supplier_invoice",
			"supplier_allocation",
			"supplier_balance_projection",
			"three_way_match_result",
		],
		commandNamespace: "payables",
		commands: [
			"payables.invoice.create",
			"payables.invoice.line.add",
			"payables.invoice.match",
			"payables.invoice.post",
			"payables.credit_note.issue",
			"payables.allocation.create",
			"payables.invoice.cancel",
		],
		queryNamespace: "payables",
		queries: [
			"payables.invoice.get",
			"payables.invoice.list",
			"payables.balance.get",
		],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [
			"supplier_invoice",
			"supplier_invoice_line",
			"supplier_credit_note",
			"supplier_allocation",
			"supplier_balance_projection",
			"three_way_match_result",
		],
	},
	events: {
		namespace: "payables",
		emits: [
			PAYABLES_INVOICE_CREATED_EVENT,
			PAYABLES_INVOICE_MATCHED_EVENT,
			PAYABLES_INVOICE_POSTED_EVENT,
			PAYABLES_CREDIT_NOTE_POSTED_EVENT,
			PAYABLES_ALLOCATION_POSTED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "payables",
		codes: ["payables.read", "payables.manage"],
	},
	authorization: {
		commands: {
			"payables.invoice.create": "payables.manage",
			"payables.invoice.line.add": "payables.manage",
			"payables.invoice.match": "payables.manage",
			"payables.invoice.post": "payables.manage",
			"payables.credit_note.issue": "payables.manage",
			"payables.allocation.create": "payables.manage",
			"payables.invoice.cancel": "payables.manage",
		},
		queries: {
			"payables.invoice.get": "payables.read",
			"payables.invoice.list": "payables.read",
			"payables.balance.get": "payables.read",
		},
	},
	moduleDependencies: {
		required: ["master-data"],
	},
	optionalIntegratesWith: [
		{ moduleId: "purchasing", style: "events" },
		{ moduleId: "receiving", style: "events" },
	],
} as const satisfies AfendaModuleManifest;

import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	RECEIVABLES_ALLOCATION_POSTED_EVENT,
	RECEIVABLES_ALLOCATION_REVERSED_EVENT,
	RECEIVABLES_CREDIT_NOTE_POSTED_EVENT,
	RECEIVABLES_INVOICE_CANCELLED_EVENT,
	RECEIVABLES_INVOICE_CLOSED_EVENT,
	RECEIVABLES_INVOICE_CREATED_EVENT,
	RECEIVABLES_INVOICE_POSTED_EVENT,
} from "@afenda/events/schemas";

import { RECEIVABLES_PERMISSION_CODES } from "./permissions";

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
			"sales_credit_note",
			"customer_allocation",
			"customer_balance_projection",
		],
		commandNamespace: "receivables",
		commands: [
			"receivables.invoice.create",
			"receivables.invoice.line.add",
			"receivables.invoice.post",
			"receivables.credit_note.issue",
			"receivables.receipt.apply",
			"receivables.receipt_application.reverse",
			"receivables.invoice.cancel",
			"receivables.invoice.close",
		],
		queryNamespace: "receivables",
		queries: [
			"receivables.invoice.get",
			"receivables.invoice.list",
			"receivables.balance.get",
			"receivables.aging.get",
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
			RECEIVABLES_INVOICE_CREATED_EVENT,
			RECEIVABLES_INVOICE_POSTED_EVENT,
			RECEIVABLES_INVOICE_CANCELLED_EVENT,
			RECEIVABLES_INVOICE_CLOSED_EVENT,
			RECEIVABLES_CREDIT_NOTE_POSTED_EVENT,
			RECEIVABLES_ALLOCATION_POSTED_EVENT,
			RECEIVABLES_ALLOCATION_REVERSED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "receivables",
		codes: [...RECEIVABLES_PERMISSION_CODES],
	},
	authorization: {
		commands: {
			"receivables.invoice.create": "receivables.invoice.create",
			"receivables.invoice.line.add": "receivables.invoice.update",
			"receivables.invoice.post": "receivables.invoice.post",
			"receivables.credit_note.issue": "receivables.credit_note.issue",
			"receivables.receipt.apply": "receivables.receipt.apply",
			"receivables.receipt_application.reverse":
				"receivables.receipt_application.reverse",
			"receivables.invoice.cancel": "receivables.invoice.cancel",
			"receivables.invoice.close": "receivables.invoice.close",
		},
		queries: {
			"receivables.invoice.get": "receivables.invoice.read",
			"receivables.invoice.list": "receivables.invoice.read",
			"receivables.balance.get": "receivables.balance.read",
			"receivables.aging.get": "receivables.aging.read",
		},
	},
	moduleDependencies: {
		required: ["master-data"],
	},
	optionalIntegratesWith: [
		{ moduleId: "sales", style: "ports" },
		{ moduleId: "fulfillment", style: "ports" },
		{ moduleId: "payments", style: "events" },
		{ moduleId: "accounting", style: "events" },
	],
} as const satisfies AfendaModuleManifest;

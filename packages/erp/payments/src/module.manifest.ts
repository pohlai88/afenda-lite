import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	PAYMENTS_PAYMENT_CREATED_EVENT,
	PAYMENTS_PAYMENT_POSTED_EVENT,
	PAYMENTS_PAYMENT_REVERSED_EVENT,
	PAYMENTS_REFUND_POSTED_EVENT,
} from "@afenda/events/schemas";

export const paymentsModuleManifest = {
	id: "payments",
	category: "commercial",
	packageName: "@afenda/payments",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: ["payment", "payment_allocation", "payment_reversal"],
		commandNamespace: "payments",
		commands: [
			"payments.payment.create",
			"payments.allocation.add",
			"payments.payment.post",
			"payments.payment.reverse",
			"payments.refund.post",
		],
		queryNamespace: "payments",
		queries: ["payments.payment.get", "payments.payment.list"],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: ["payment", "payment_allocation", "payment_reversal"],
	},
	events: {
		namespace: "payments",
		emits: [
			PAYMENTS_PAYMENT_CREATED_EVENT,
			PAYMENTS_PAYMENT_POSTED_EVENT,
			PAYMENTS_PAYMENT_REVERSED_EVENT,
			PAYMENTS_REFUND_POSTED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "payments",
		codes: ["payments.read", "payments.manage"],
	},
	authorization: {
		commands: {
			"payments.payment.create": "payments.manage",
			"payments.allocation.add": "payments.manage",
			"payments.payment.post": "payments.manage",
			"payments.payment.reverse": "payments.manage",
			"payments.refund.post": "payments.manage",
		},
		queries: {
			"payments.payment.get": "payments.read",
			"payments.payment.list": "payments.read",
		},
	},
	moduleDependencies: {
		required: [],
	},
	optionalIntegratesWith: [
		{ moduleId: "receivables", style: "events" },
		{ moduleId: "payables", style: "events" },
		{ moduleId: "accounting", style: "events" },
	],
} as const satisfies AfendaModuleManifest;

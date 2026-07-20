import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	PAYMENTS_APPLICATION_INSTRUCTION_APPLIED_EVENT,
	PAYMENTS_APPLICATION_INSTRUCTION_CREATED_EVENT,
	PAYMENTS_APPLICATION_INSTRUCTION_REJECTED_EVENT,
	PAYMENTS_PAYMENT_CREATED_EVENT,
	PAYMENTS_PAYMENT_POSTED_EVENT,
	PAYMENTS_PAYMENT_REVERSED_EVENT,
	PAYMENTS_REFUND_POSTED_EVENT,
	PAYMENTS_TRANSFER_POSTED_EVENT,
} from "@afenda/events/schemas";

import { PAYMENTS_PERMISSION_CODES } from "./permissions";

export const paymentsModuleManifest = {
	id: "payments",
	category: "commercial",
	packageName: "@afenda/payments",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [
			"payment_account",
			"payment",
			"payment_allocation",
			"payment_reversal",
		],
		commandNamespace: "payments",
		commands: [
			"payments.account.create",
			"payments.payment.create",
			"payments.application_instruction.add",
			"payments.payment.post",
			"payments.payment.reverse",
			"payments.transfer.create_and_post",
			"payments.refund.post",
			"payments.application_instruction.mark_applied",
			"payments.application_instruction.mark_rejected",
		],
		queryNamespace: "payments",
		queries: [
			"payments.account.list",
			"payments.payment.get",
			"payments.payment.list",
			"payments.availability.get",
		],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [
			"payment_account",
			"payment",
			"payment_allocation",
			"payment_reversal",
		],
	},
	events: {
		namespace: "payments",
		emits: [
			PAYMENTS_PAYMENT_CREATED_EVENT,
			PAYMENTS_PAYMENT_POSTED_EVENT,
			PAYMENTS_PAYMENT_REVERSED_EVENT,
			PAYMENTS_REFUND_POSTED_EVENT,
			PAYMENTS_APPLICATION_INSTRUCTION_CREATED_EVENT,
			PAYMENTS_APPLICATION_INSTRUCTION_APPLIED_EVENT,
			PAYMENTS_APPLICATION_INSTRUCTION_REJECTED_EVENT,
			PAYMENTS_TRANSFER_POSTED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "payments",
		codes: [...PAYMENTS_PERMISSION_CODES],
	},
	authorization: {
		commands: {
			"payments.account.create": "payments.account.manage",
			"payments.payment.create": "payments.payment.create",
			"payments.application_instruction.add":
				"payments.application_instruction.manage",
			"payments.payment.post": "payments.payment.post",
			"payments.payment.reverse": "payments.payment.reverse",
			"payments.transfer.create_and_post": "payments.transfer.post",
			"payments.refund.post": "payments.refund.post",
			"payments.application_instruction.mark_applied":
				"payments.application_instruction.manage",
			"payments.application_instruction.mark_rejected":
				"payments.application_instruction.manage",
		},
		queries: {
			"payments.account.list": "payments.account.read",
			"payments.payment.get": "payments.payment.read",
			"payments.payment.list": "payments.payment.read",
			"payments.availability.get": "payments.availability.read",
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

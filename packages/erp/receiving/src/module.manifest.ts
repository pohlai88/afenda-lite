import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	RECEIVING_DISCREPANCY_RECORDED_EVENT,
	RECEIVING_RECEIPT_CREATED_EVENT,
	RECEIVING_RECEIPT_LINE_ADDED_EVENT,
	RECEIVING_RECEIPT_POSTED_EVENT,
} from "@afenda/events/schemas";

import {
	RECEIVING_COMMAND_CANCEL,
	RECEIVING_COMMAND_CREATE,
	RECEIVING_COMMAND_DISCREPANCY_RECORD,
	RECEIVING_COMMAND_IDS,
	RECEIVING_COMMAND_LINE_ADD,
	RECEIVING_COMMAND_POST,
	RECEIVING_QUERY_GET,
	RECEIVING_QUERY_IDS,
	RECEIVING_QUERY_LIST,
} from "./module-ids";
import {
	RECEIVING_PERMISSION_CODES,
	RECEIVING_PERMISSION_MANAGE,
	RECEIVING_PERMISSION_READ,
} from "./permissions";

export const receivingModuleManifest = {
	id: "receiving",
	category: "supply-chain",
	packageName: "@afenda/receiving",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: ["goods_receipt"],
		commandNamespace: "receiving.receipt",
		commands: [...RECEIVING_COMMAND_IDS],
		queryNamespace: "receiving.receipt",
		queries: [...RECEIVING_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [
			"goods_receipt",
			"goods_receipt_line",
			"receiving_discrepancy",
		],
	},
	events: {
		namespace: "receiving",
		emits: [
			RECEIVING_RECEIPT_CREATED_EVENT,
			RECEIVING_RECEIPT_LINE_ADDED_EVENT,
			RECEIVING_RECEIPT_POSTED_EVENT,
			RECEIVING_DISCREPANCY_RECORDED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "receiving",
		codes: [...RECEIVING_PERMISSION_CODES],
	},
	authorization: {
		commands: {
			[RECEIVING_COMMAND_CREATE]: RECEIVING_PERMISSION_MANAGE,
			[RECEIVING_COMMAND_LINE_ADD]: RECEIVING_PERMISSION_MANAGE,
			[RECEIVING_COMMAND_POST]: RECEIVING_PERMISSION_MANAGE,
			[RECEIVING_COMMAND_CANCEL]: RECEIVING_PERMISSION_MANAGE,
			[RECEIVING_COMMAND_DISCREPANCY_RECORD]: RECEIVING_PERMISSION_MANAGE,
		},
		queries: {
			[RECEIVING_QUERY_GET]: RECEIVING_PERMISSION_READ,
			[RECEIVING_QUERY_LIST]: RECEIVING_PERMISSION_READ,
		},
	},
	moduleDependencies: { required: ["master-data"] },
	optionalIntegratesWith: [
		{ moduleId: "purchasing", style: "events" },
		{ moduleId: "inventory", style: "events" },
	],
} as const satisfies AfendaModuleManifest;

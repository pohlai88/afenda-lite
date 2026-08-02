import type { AfendaModuleManifest } from "@afenda/db/module-manifest";
import {
	FULFILLMENT_DELIVERY_CANCELLED_EVENT,
	FULFILLMENT_DELIVERY_CLOSED_EVENT,
	FULFILLMENT_DELIVERY_COMPLETED_EVENT,
	FULFILLMENT_DELIVERY_CREATED_EVENT,
	FULFILLMENT_DELIVERY_POSTED_EVENT,
	FULFILLMENT_PACK_CONFIRMED_EVENT,
	FULFILLMENT_PICK_CONFIRMED_EVENT,
	FULFILLMENT_POD_RECORDED_EVENT,
} from "@afenda/events/schemas";

import {
	FULFILLMENT_AGGREGATES,
	FULFILLMENT_MUTATION_TABLES,
} from "../kernel/emissions/mutation-tables";
import { FULFILLMENT_PERMISSION_CODES } from "../kernel/execution/permissions";
import {
	FULFILLMENT_COMMAND_AUTHORIZATION,
	FULFILLMENT_QUERY_AUTHORIZATION,
	FULFILLMENT_REGISTRY_COMMAND_IDS,
	FULFILLMENT_REGISTRY_QUERY_IDS,
} from "../kernel/operations/registry";

export const fulfillmentModuleManifest = {
	id: "fulfillment",
	category: "supply-chain",
	packageName: "@afenda/fulfillment",
	band: "R1-F",
	lifecycle: "active",
	activationMode: "organization_toggle",
	owns: {
		aggregates: [...FULFILLMENT_AGGREGATES],
		commandNamespace: "fulfillment.delivery",
		commands: [...FULFILLMENT_REGISTRY_COMMAND_IDS],
		queryNamespace: "fulfillment.delivery",
		queries: [...FULFILLMENT_REGISTRY_QUERY_IDS],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [...FULFILLMENT_MUTATION_TABLES],
	},
	events: {
		namespace: "fulfillment",
		emits: [
			FULFILLMENT_DELIVERY_CREATED_EVENT,
			FULFILLMENT_PICK_CONFIRMED_EVENT,
			FULFILLMENT_PACK_CONFIRMED_EVENT,
			FULFILLMENT_DELIVERY_POSTED_EVENT,
			FULFILLMENT_DELIVERY_COMPLETED_EVENT,
			FULFILLMENT_DELIVERY_CANCELLED_EVENT,
			FULFILLMENT_POD_RECORDED_EVENT,
			FULFILLMENT_DELIVERY_CLOSED_EVENT,
		],
		consumes: [],
	},
	permissions: {
		namespace: "fulfillment",
		codes: [...FULFILLMENT_PERMISSION_CODES],
	},
	authorization: {
		commands: FULFILLMENT_COMMAND_AUTHORIZATION,
		queries: FULFILLMENT_QUERY_AUTHORIZATION,
	},
	moduleDependencies: { required: ["master-data", "inventory"] },
	optionalIntegratesWith: [{ moduleId: "sales", style: "ports" }],
} as const satisfies AfendaModuleManifest;

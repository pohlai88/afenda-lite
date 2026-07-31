import type { z } from "zod";

import { AllEventSchemas, type AllEventType } from "./schemas/index";
import type { EventSourceModule } from "./types";

const SOURCE_BY_PREFIX = Object.freeze({
	accounting: "accounting",
	"corporate-administration": "corporate-administration",
	corporate_administration: "corporate-administration",
	fulfillment: "fulfillment",
	"human-resources": "human-resources",
	human_resources: "human-resources",
	identity: "identity",
	inventory: "inventory",
	"master-data": "master_data",
	master_data: "master_data",
	payables: "payables",
	payments: "payments",
	payroll: "payroll",
	platform: "platform",
	purchasing: "purchasing",
	receivables: "receivables",
	receiving: "receiving",
	sales: "sales",
} satisfies Record<string, EventSourceModule>);

export const EVENT_LIFECYCLE_POLICY = Object.freeze({
	claimLeaseMs: 60_000,
	defaultClaimLimit: 50,
	maxAttempts: 10,
	maxClaimLimit: 200,
	statuses: Object.freeze([
		"pending",
		"processing",
		"processed",
		"failed",
	] as const),
});

function sourceModuleForType(type: string): EventSourceModule | undefined {
	const separator = type.indexOf(".");
	const prefix = separator < 0 ? type : type.slice(0, separator);
	return SOURCE_BY_PREFIX[prefix as keyof typeof SOURCE_BY_PREFIX];
}

type EventDefinition = Readonly<{
	schema: z.ZodType;
	sourceModule: EventSourceModule;
}>;

function buildRegistry(): Readonly<Record<string, EventDefinition>> {
	const definitions = Object.entries(AllEventSchemas).map(([type, schema]) => {
		const sourceModule = sourceModuleForType(type);
		if (sourceModule === undefined) {
			throw new Error(`Event type has no canonical source module: ${type}`);
		}
		return [type, Object.freeze({ schema, sourceModule })] as const;
	});
	return Object.freeze(Object.fromEntries(definitions));
}

/** Canonical event type, payload schema, and source-module owner. */
export const EVENT_REGISTRY = buildRegistry();

export function isRegisteredEventType(type: string): type is AllEventType {
	return Object.hasOwn(EVENT_REGISTRY, type);
}

export function eventDefinition(type: AllEventType): EventDefinition {
	const definition = EVENT_REGISTRY[type];
	if (definition === undefined) {
		throw new Error(`Missing canonical event definition: ${type}`);
	}
	return definition;
}

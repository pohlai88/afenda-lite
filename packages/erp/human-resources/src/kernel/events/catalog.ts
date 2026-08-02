import type { HumanResourcesEventType } from "@afenda/events";
import { HumanResourcesEventSchemas } from "@afenda/events/schemas";

import {
	buildEventTypeDomainMap,
	CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES,
	type ClassifiedHumanResourcesDomainEventType,
	parseHumanResourcesEventVersion,
} from "./classified-event-types";
import { documentedNoConsumerReason } from "./documented-no-consumer-reasons";
import type { EventCatalogEntry } from "./types";

const eventTypeDomainMap = buildEventTypeDomainMap();

function buildCatalogEntry(
	eventType: ClassifiedHumanResourcesDomainEventType,
): EventCatalogEntry {
	const domain = eventTypeDomainMap.get(eventType);
	if (!domain) {
		throw new Error(
			`Classified domain event "${eventType}" has no registry domain mapping.`,
		);
	}
	const schema = HumanResourcesEventSchemas[eventType];
	if (!schema) {
		throw new Error(
			`Classified domain event "${eventType}" has no Zod schema in @afenda/events.`,
		);
	}
	return {
		eventType,
		version: parseHumanResourcesEventVersion(eventType),
		ownerPackage: "@afenda/human-resources",
		schema,
		consumers: [],
		projection: {
			mode: "documented_no_consumer",
			reason: documentedNoConsumerReason(domain),
		},
	};
}

function buildHumanResourcesEventCatalog(): Record<
	ClassifiedHumanResourcesDomainEventType,
	EventCatalogEntry
> {
	const catalog = {} as Record<
		ClassifiedHumanResourcesDomainEventType,
		EventCatalogEntry
	>;
	for (const eventType of CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES) {
		catalog[eventType] = buildCatalogEntry(eventType);
	}
	return catalog;
}

/** Canonical package-owned projection over the shared event schemas. */
export const HUMAN_RESOURCES_EVENT_CATALOG =
	buildHumanResourcesEventCatalog() satisfies Record<
		ClassifiedHumanResourcesDomainEventType,
		EventCatalogEntry
	>;

export type HumanResourcesEventCatalog = typeof HUMAN_RESOURCES_EVENT_CATALOG;

export function isClassifiedHumanResourcesDomainEventType(
	eventType: HumanResourcesEventType,
): eventType is ClassifiedHumanResourcesDomainEventType {
	return eventType in HUMAN_RESOURCES_EVENT_CATALOG;
}

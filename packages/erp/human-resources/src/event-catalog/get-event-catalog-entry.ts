import type { HumanResourcesEventType } from "@afenda/events";

import {
	HUMAN_RESOURCES_EVENT_CATALOG,
	isClassifiedHumanResourcesDomainEventType,
} from "./catalog";
import type { EventCatalogEntry } from "./types";

export function getEventCatalogEntry(
	eventType: HumanResourcesEventType,
): EventCatalogEntry {
	if (!isClassifiedHumanResourcesDomainEventType(eventType)) {
		throw new Error(
			`Human Resources event type "${eventType}" is not in the classified event catalog.`,
		);
	}
	return HUMAN_RESOURCES_EVENT_CATALOG[eventType];
}

export function tryGetEventCatalogEntry(
	eventType: HumanResourcesEventType,
): EventCatalogEntry | undefined {
	if (!isClassifiedHumanResourcesDomainEventType(eventType)) {
		return undefined;
	}
	return HUMAN_RESOURCES_EVENT_CATALOG[eventType];
}

export {
	HUMAN_RESOURCES_EVENT_CATALOG,
	type HumanResourcesEventCatalog,
	isClassifiedHumanResourcesDomainEventType,
} from "./catalog";
export {
	buildEventTypeDomainMap,
	CLASSIFIED_HUMAN_RESOURCES_DOMAIN_EVENT_TYPES,
	type ClassifiedHumanResourcesDomainEventType,
	listDomainEventTypesFromRegistry,
	parseHumanResourcesEventVersion,
} from "./classified-event-types";
export { documentedNoConsumerReason } from "./documented-no-consumer-reasons";
export {
	getEventCatalogEntry,
	tryGetEventCatalogEntry,
} from "./get-event-catalog-entry";
export type {
	EventCatalogEntry,
	EventCatalogProjection,
	HumanResourcesEventCatalogOwnerPackage,
} from "./types";
export {
	type HumanResourcesEventCatalogIssue,
	validateHumanResourcesEventCatalog,
} from "./validate-catalog";

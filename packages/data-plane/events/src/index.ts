import "server-only";

export {
	type CreateEventDispatcherOptions,
	createEventDispatcher,
	type EventDispatcher,
	type EventDispatchSummary,
} from "./dispatcher";
export {
	createDrizzleEventStore,
	DrizzleEventStore,
} from "./drizzle-store";
export { generateCausationId, generateCorrelationId } from "./ids";
export {
	type CreateEventPublisherOptions,
	createEventPublisher,
	type EventPublisher,
} from "./publisher";
export {
	purgeProcessedDomainEvents,
	queryDomainEvents,
} from "./query";
export {
	AllEventSchemas,
	type AllEventType,
	DEFAULT_DISPATCH_LIMIT,
	DEFAULT_EVENT_PAGE,
	DEFAULT_EVENT_PAGE_SIZE,
	domainEventSchema,
	type EventPage,
	eventDispatchOptionsSchema,
	eventPageSchema,
	eventPurgeOptionsSchema,
	eventQueryOptionsSchema,
	eventSourceModuleSchema,
	eventStatusSchema,
	IdentityEventSchemas,
	type IdentityEventType,
	type IdentityOrgRoleAssignedPayload,
	identityOrgRoleAssignedPayloadSchema,
	isKnownEventType,
	MAX_DISPATCH_LIMIT,
	MAX_EVENT_PAGE_SIZE,
	type MasterDataEntityPayload,
	MasterDataEventSchemas,
	type MasterDataEventType,
	masterDataEntityPayloadSchema,
	type ParsedDomainEvent,
	type ParsedEventDispatchOptions,
	type ParsedEventPurgeOptions,
	type ParsedEventQueryOptions,
	PlatformEventSchemas,
	type PlatformEventType,
	type PlatformOrganizationDeletedPayload,
	type PublishEventCommand,
	platformOrganizationDeletedPayloadSchema,
	publishEventCommandSchema,
	SalesEventSchemas,
	type SalesEventType,
	type SalesOrderLinePayload,
	type SalesOrderPayload,
	salesOrderPayloadSchema,
} from "./schemas";
export type { EventStore } from "./store";
export {
	type DomainEvent,
	type DomainEventClaimOptions,
	type DomainEventHandler,
	type DomainEventHandlerMap,
	type DomainEventMarkFailedInput,
	type DomainEventMarkProcessedInput,
	type DomainEventPurgeOptions,
	type DomainEventQueryFilter,
	type DomainEventQueryOptions,
	type DomainEventWriteInput,
	EVENT_SOURCE_MODULES,
	EVENT_STATUSES,
	type EventSourceModule,
	type EventStatus,
} from "./types";

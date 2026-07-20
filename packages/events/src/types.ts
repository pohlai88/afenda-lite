/**
 * Org-scoped domain-event outbox vocabulary (living modules only).
 */

export const EVENT_SOURCE_MODULES = [
	"platform",
	"identity",
	"master_data",
	"sales",
] as const;

export type EventSourceModule = (typeof EVENT_SOURCE_MODULES)[number];

export const EVENT_STATUSES = ["pending", "processed", "failed"] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export type DomainEvent<T = unknown> = {
	id: string;
	type: string;
	sourceModule: EventSourceModule;
	occurredAt: Date;
	correlationId: string;
	causationId: string | null;
	organizationId: string;
	actorUserId: string;
	payload: T;
	metadata: Record<string, unknown> | null;
	status: EventStatus;
	attempts: number;
	lastError: string | null;
	processedAt: Date | null;
};

export type DomainEventWriteInput = {
	organizationId: string;
	type: string;
	sourceModule: EventSourceModule;
	correlationId: string;
	causationId?: string | null;
	actorUserId: string;
	payload: Record<string, unknown>;
	metadata?: Record<string, unknown> | null;
	createdAt?: Date;
};

export type DomainEventQueryFilter = {
	organizationId: string;
	type?: string;
	status?: EventStatus;
	correlationId?: string;
	from?: Date;
	to?: Date;
};

export type DomainEventQueryOptions = DomainEventQueryFilter & {
	page: number;
	pageSize: number;
};

export type DomainEventClaimOptions = {
	organizationId?: string;
	limit: number;
};

export type DomainEventMarkProcessedInput = {
	id: string;
	organizationId: string;
	processedAt?: Date;
};

export type DomainEventMarkFailedInput = {
	id: string;
	organizationId: string;
	lastError: string;
};

export type DomainEventPurgeOptions = {
	organizationId: string;
	olderThan: Date;
};

export type DomainEventHandler = (event: DomainEvent) => Promise<void> | void;

export type DomainEventHandlerMap = Record<string, DomainEventHandler>;

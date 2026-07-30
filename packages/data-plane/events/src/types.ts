/**
 * Org-scoped domain-event outbox vocabulary (living modules only).
 */

export const EVENT_SOURCE_MODULES = [
	"platform",
	"identity",
	"master_data",
	"sales",
	"purchasing",
	"payables",
	"payments",
	"accounting",
	"inventory",
	"receiving",
	"fulfillment",
	"receivables",
	"human-resources",
	"payroll",
	"corporate-administration",
] as const;

export type EventSourceModule = (typeof EVENT_SOURCE_MODULES)[number];

export const EVENT_STATUSES = ["pending", "processed", "failed"] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export interface DomainEvent<T = unknown> {
	actorUserId: string;
	attempts: number;
	causationId: string | null;
	correlationId: string;
	deduplicationKey?: string | null | undefined;
	id: string;
	lastError: string | null;
	metadata: Record<string, unknown> | null;
	occurredAt: Date;
	organizationId: string;
	payload: T;
	processedAt: Date | null;
	sourceModule: EventSourceModule;
	status: EventStatus;
	type: string;
}

export interface DomainEventWriteInput {
	actorUserId: string;
	causationId?: string | null;
	correlationId: string;
	createdAt?: Date;
	deduplicationKey?: string | null;
	metadata?: Record<string, unknown> | null;
	organizationId: string;
	payload: Record<string, unknown>;
	sourceModule: EventSourceModule;
	type: string;
}

export interface DomainEventQueryFilter {
	correlationId?: string | undefined;
	from?: Date | undefined;
	id?: string | undefined;
	organizationId: string;
	sourceModule?: EventSourceModule | undefined;
	status?: EventStatus | undefined;
	to?: Date | undefined;
	type?: string | undefined;
}

export type DomainEventQueryOptions = DomainEventQueryFilter & {
	page: number;
	pageSize: number;
};

export interface DomainEventClaimOptions {
	limit: number;
	organizationId?: string | undefined;
}

export interface DomainEventMarkProcessedInput {
	id: string;
	organizationId: string;
	processedAt?: Date;
}

export interface DomainEventMarkFailedInput {
	id: string;
	lastError: string;
	organizationId: string;
}

export interface DomainEventRequeueInput {
	fromStatus: "failed" | "processed";
	id: string;
	organizationId: string;
}

export interface DomainEventPurgeOptions {
	olderThan: Date;
	organizationId: string;
}

export type DomainEventHandler = (event: DomainEvent) => Promise<void> | void;

export type DomainEventHandlerMap = Record<string, DomainEventHandler>;

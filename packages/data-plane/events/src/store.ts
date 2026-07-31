import type { Result } from "@afenda/errors";

import type {
	ClaimedDomainEvent,
	DomainEvent,
	DomainEventClaimOptions,
	DomainEventMarkFailedInput,
	DomainEventMarkProcessedInput,
	DomainEventPurgeOptions,
	DomainEventQueryOptions,
	DomainEventRequeueInput,
	DomainEventWriteInput,
} from "./types";

/**
 * Persistence port for domain-event outbox. Production adapter: DrizzleEventStore.
 */
export interface EventStore {
	append: (entry: DomainEventWriteInput) => Promise<Result<DomainEvent>>;
	claimPending: (
		options: DomainEventClaimOptions,
	) => Promise<Result<ClaimedDomainEvent[]>>;
	count: (options: DomainEventQueryOptions) => Promise<Result<number>>;
	markFailed: (
		input: DomainEventMarkFailedInput,
	) => Promise<Result<DomainEvent | null>>;
	markProcessed: (
		input: DomainEventMarkProcessedInput,
	) => Promise<Result<DomainEvent | null>>;
	purgeProcessed: (options: DomainEventPurgeOptions) => Promise<Result<number>>;
	query: (options: DomainEventQueryOptions) => Promise<Result<DomainEvent[]>>;
	requeue: (
		input: DomainEventRequeueInput,
	) => Promise<Result<DomainEvent | null>>;
}

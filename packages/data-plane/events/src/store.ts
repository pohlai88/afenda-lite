import type { Result } from "@afenda/errors/result";

import type {
	DomainEvent,
	DomainEventClaimOptions,
	DomainEventMarkFailedInput,
	DomainEventMarkProcessedInput,
	DomainEventPurgeOptions,
	DomainEventQueryOptions,
	DomainEventWriteInput,
} from "./types";

/**
 * Persistence port for domain-event outbox. Production adapter: DrizzleEventStore.
 */
export type EventStore = {
	append(entry: DomainEventWriteInput): Promise<Result<DomainEvent>>;
	query(options: DomainEventQueryOptions): Promise<Result<DomainEvent[]>>;
	count(options: DomainEventQueryOptions): Promise<Result<number>>;
	claimPending(
		options: DomainEventClaimOptions,
	): Promise<Result<DomainEvent[]>>;
	markProcessed(
		input: DomainEventMarkProcessedInput,
	): Promise<Result<DomainEvent | null>>;
	markFailed(
		input: DomainEventMarkFailedInput,
	): Promise<Result<DomainEvent | null>>;
	purgeProcessed(options: DomainEventPurgeOptions): Promise<Result<number>>;
};

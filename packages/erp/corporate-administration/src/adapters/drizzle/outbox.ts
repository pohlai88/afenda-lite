import { fail, ok, type Result } from "@afenda/errors/result";

import {
	type CorporateAdministrationPendingEvent,
	createCorporateAdministrationDomainEventEnvelope,
} from "../../domain-events";
import { corporateAdministrationErrorDetails } from "../../error-codes";
import type { CorporateAdministrationOutboxPort } from "../../ports";
import { translateCorporateAdministrationInfrastructureError } from "./errors";

export type CorporateAdministrationPendingOutboxEvent = Readonly<{
	organizationId: string;
	type: string;
	sourceModule: "corporate-administration";
	deduplicationKey: string;
	correlationId: string;
	causationId?: string;
	actorUserId: string;
	payload: unknown;
	metadata: Readonly<Record<string, unknown>>;
}>;

export type CorporateAdministrationPendingEventAppender = Readonly<{
	append(
		events: readonly CorporateAdministrationPendingOutboxEvent[],
	): Promise<Result<void>>;
	createStatement(
		event: CorporateAdministrationPendingOutboxEvent,
	): (database: unknown) => unknown;
}>;

export type CorporateAdministrationDrizzleOutboxDependencies = Readonly<{
	appender: CorporateAdministrationPendingEventAppender;
}>;

export function createDrizzleCorporateAdministrationOutboxPort(
	dependencies: CorporateAdministrationDrizzleOutboxDependencies,
): CorporateAdministrationOutboxPort {
	return new DrizzleCorporateAdministrationOutboxPort(dependencies);
}

export class DrizzleCorporateAdministrationOutboxPort
	implements CorporateAdministrationOutboxPort
{
	readonly #appender: CorporateAdministrationPendingEventAppender;

	constructor(dependencies: CorporateAdministrationDrizzleOutboxDependencies) {
		this.#appender = dependencies.appender;
	}

	async append(
		events: readonly CorporateAdministrationPendingEvent[],
		options?: Parameters<CorporateAdministrationOutboxPort["append"]>[1],
	): Promise<Result<void>> {
		if (events.length === 0) return ok(undefined);
		const validatedEvents = events.map((event) =>
			createCorporateAdministrationDomainEventEnvelope(event),
		);
		const pendingEvents = validatedEvents.map(toPendingOutboxEvent);

		if (options?.transaction !== undefined) {
			for (const event of pendingEvents) {
				options.transaction.enqueue(this.#appender.createStatement(event));
			}
			return ok(undefined);
		}

		try {
			const appended = await this.#appender.append(pendingEvents);
			if (appended.ok) return ok(undefined);
			if (appended.code !== "SERVICE_UNAVAILABLE") {
				return fail(
					"INTERNAL_ERROR",
					"Unexpected Corporate Administration outbox persistence failure.",
				);
			}
			return outboxUnavailable();
		} catch (error) {
			const translated =
				translateCorporateAdministrationInfrastructureError(error);
			if (translated !== undefined) return translated;
			throw error;
		}
	}
}

function outboxUnavailable(): Result<never> {
	return fail(
		"SERVICE_UNAVAILABLE",
		"Corporate Administration outbox is unavailable.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_EXTERNAL_DEPENDENCY_UNAVAILABLE",
			{ field: "outbox" },
		),
	);
}

function toPendingOutboxEvent(
	event: CorporateAdministrationPendingEvent,
): CorporateAdministrationPendingOutboxEvent {
	return {
		organizationId: event.organizationId,
		type: event.eventType,
		sourceModule: "corporate-administration",
		deduplicationKey: event.eventId,
		correlationId: event.correlationId,
		...(event.causationId === undefined
			? {}
			: { causationId: event.causationId }),
		actorUserId: event.actorUserId,
		payload: event.payload,
		metadata: {
			eventId: event.eventId,
			aggregateType: event.aggregateType,
			aggregateId: event.aggregateId,
			aggregateVersion: event.aggregateVersion,
			occurredAt: event.occurredAt,
		},
	};
}

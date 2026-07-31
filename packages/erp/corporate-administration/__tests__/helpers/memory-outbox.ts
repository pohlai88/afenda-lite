// biome-ignore-all lint/suspicious/useAwait: The deterministic helper implements the asynchronous outbox port.
import type {
	CorporateAdministrationOutboxPort,
	CorporateAdministrationPendingEvent,
} from "@afenda/corporate-administration";
import { createCorporateAdministrationDomainEventEnvelope } from "@afenda/corporate-administration";
import { errorResult, type Result } from "@afenda/errors";

export function createMemoryCorporateAdministrationOutboxPort(input?: {
	onAppend?: (events: readonly CorporateAdministrationPendingEvent[]) => void;
}): CorporateAdministrationOutboxPort {
	return Object.freeze({
		async append(
			events: readonly CorporateAdministrationPendingEvent[],
		): Promise<Result<void>> {
			const validatedEvents = events.map((event) =>
				createCorporateAdministrationDomainEventEnvelope(event),
			);
			input?.onAppend?.(validatedEvents);
			return errorResult.ok(undefined);
		},
	});
}

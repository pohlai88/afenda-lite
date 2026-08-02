import {
	type ClockPort,
	type CorporateAdministrationObservabilityPort,
	type CorporateAdministrationOperationObservation,
	type CorporateAdministrationRuntimePorts,
	createCorporateAdministrationRuntime,
} from "@afenda/corporate-administration";
import {
	type CorporateAdministrationAuditWriter,
	type CorporateAdministrationDrizzleDatabase,
	type CorporateAdministrationNeonTransactionExecutor,
	createDrizzleCorporateAdministrationAuditFactPort,
	createDrizzleCorporateAdministrationIdempotencyPort,
	createDrizzleCorporateAdministrationOutboxPort,
	createDrizzleCorporateAdministrationTransactionPort,
} from "@afenda/corporate-administration/adapters/drizzle";
import {
	events,
	type PendingDomainEventTransactionExecutor,
} from "@afenda/events";
import { logger } from "@afenda/logger";

const corporateAdministrationObservability = {
	recordOperation(observation) {
		const projection = projectOperationObservation(observation);
		logger.event({
			level: projection.level,
			event: `corporate_administration.${observation.kind}.${observation.operationId}.${observation.outcome}`,
			correlationId: observation.correlationId,
			module: "corporate-administration",
			code: projection.code,
		});
	},
} satisfies CorporateAdministrationObservabilityPort;

function projectOperationObservation(
	observation: CorporateAdministrationOperationObservation,
): Readonly<{ level: "info" | "warn" | "error"; code: string }> {
	switch (observation.outcome) {
		case "success":
			return { level: "info", code: "OK" };
		case "failure":
			return { level: "warn", code: observation.errorCode };
		case "exception":
			return { level: "error", code: "UNHANDLED_EXCEPTION" };
		default: {
			const exhaustive: never = observation;
			return exhaustive;
		}
	}
}

export type CorporateAdministrationAppRuntimeDependencies = Readonly<{
	clock: ClockPort;
	database: CorporateAdministrationDrizzleDatabase;
	auditStore: CorporateAdministrationAuditWriter;
	executeTransaction: CorporateAdministrationNeonTransactionExecutor;
	executeOutboxTransaction: PendingDomainEventTransactionExecutor;
	createReservationToken: () => string;
	createAuditId: () => string;
}>;

/**
 * Application composition root for Corporate Administration runtime ports.
 *
 * Adapter construction stays here. The package validates the resulting shape
 * through its single `createCorporateAdministrationRuntime` facade.
 */
export function createCorporateAdministrationAppRuntime(
	dependencies: CorporateAdministrationAppRuntimeDependencies,
): CorporateAdministrationRuntimePorts {
	return createCorporateAdministrationRuntime({
		clock: dependencies.clock,
		transaction: createDrizzleCorporateAdministrationTransactionPort({
			execute: dependencies.executeTransaction,
		}),
		idempotency: createDrizzleCorporateAdministrationIdempotencyPort({
			database: dependencies.database,
			createReservationToken: dependencies.createReservationToken,
			now: () => dependencies.clock.now(),
		}),
		audit: createDrizzleCorporateAdministrationAuditFactPort({
			store: dependencies.auditStore,
			createAuditId: dependencies.createAuditId,
		}),
		outbox: createDrizzleCorporateAdministrationOutboxPort({
			appender: events.outbox.createAppender({
				executeTransaction: dependencies.executeOutboxTransaction,
			}),
		}),
		observability: corporateAdministrationObservability,
	});
}

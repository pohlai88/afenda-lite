import {
	type ClockPort,
	type CorporateAdministrationRuntimePorts,
	createCorporateAdministrationProductionRuntime,
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
 * Adapter construction stays here. The package only validates the resulting
 * shape via `createCorporateAdministrationProductionRuntime`.
 */
export function createCorporateAdministrationAppRuntime(
	dependencies: CorporateAdministrationAppRuntimeDependencies,
): CorporateAdministrationRuntimePorts {
	return createCorporateAdministrationProductionRuntime({
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
	});
}

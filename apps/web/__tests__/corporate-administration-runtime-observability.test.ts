import { audit as afendaAudit } from "@afenda/audit";
import {
	canonicalDateSchema,
	correlationIdSchema,
} from "@afenda/corporate-administration";
import { database as afendaDatabase } from "@afenda/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

const log = vi.hoisted(() => ({ event: vi.fn() }));

vi.mock("@afenda/logger", () => ({
	logger: {
		event: log.event,
		redactFieldValue: (_name: string, value: string) => value,
	},
}));

import { createCorporateAdministrationAppRuntime } from "@/lib/erp/corporate-administration-runtime";

const correlationId = correlationIdSchema.parse("corr-ca-observability");

describe("Corporate Administration production observability", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([
		{
			outcome: "success" as const,
			expectedLevel: "info",
			expectedCode: "OK",
		},
		{
			outcome: "failure" as const,
			errorCode: "CONFLICT" as const,
			expectedLevel: "warn",
			expectedCode: "CONFLICT",
		},
		{
			outcome: "exception" as const,
			expectedLevel: "error",
			expectedCode: "UNHANDLED_EXCEPTION",
		},
	])("projects $outcome through the structured logger", (scenario) => {
		const runtime = createRuntime();
		const shared = {
			operationId: "registerLegalCompanyDraft" as const,
			kind: "command" as const,
			owner: "company" as const,
			observabilityClass: "corporate_administration_operation" as const,
			correlationId,
		};
		runtime.observability.recordOperation(
			scenario.outcome === "failure"
				? {
						...shared,
						outcome: scenario.outcome,
						errorCode: scenario.errorCode,
					}
				: { ...shared, outcome: scenario.outcome },
		);

		expect(log.event).toHaveBeenCalledWith({
			level: scenario.expectedLevel,
			event: `corporate_administration.command.registerLegalCompanyDraft.${scenario.outcome}`,
			correlationId,
			module: "corporate-administration",
			code: scenario.expectedCode,
		});
		const serialized = JSON.stringify(log.event.mock.calls);
		expect(serialized).not.toContain("organizationId");
		expect(serialized).not.toContain("actorUserId");
		expect(serialized).not.toContain("stack");
	});

	it("projects query observations through the same structured logger facade", () => {
		const runtime = createRuntime();
		runtime.observability.recordOperation({
			operationId: "getLegalCompany",
			kind: "query",
			owner: "company",
			observabilityClass: "corporate_administration_operation",
			correlationId,
			outcome: "success",
		});

		expect(log.event).toHaveBeenCalledWith({
			level: "info",
			event: "corporate_administration.query.getLegalCompany.success",
			correlationId,
			module: "corporate-administration",
			code: "OK",
		});
	});
});

function createRuntime() {
	return createCorporateAdministrationAppRuntime({
		clock: {
			now: () => new Date("2026-08-02T00:00:00.000Z"),
			today: () => canonicalDateSchema.parse("2026-08-02"),
		},
		database: afendaDatabase.client,
		auditStore: afendaAudit.store.drizzle(),
		executeTransaction: (buildQueries) =>
			afendaDatabase.transaction(buildQueries),
		executeOutboxTransaction: (buildQueries) =>
			afendaDatabase.transaction(buildQueries),
		createReservationToken: () => "reservation-ca-observability",
		createAuditId: () => "audit-ca-observability",
	});
}

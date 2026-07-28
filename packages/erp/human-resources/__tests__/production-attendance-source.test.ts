import { describe, expect, it, vi } from "vitest";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import {
	createMemoryHrObservabilityRecorder,
	type HrObservabilityPorts,
} from "../src/observability";
import { HUMAN_RESOURCES_PERMISSION_CODES } from "../src/permissions";
import { createProductionAttendanceSource } from "../src/production-attendance-source";
import {
	createMemoryHumanResourcesStore,
	createStoreAssignmentContextQuery,
} from "../src/testing";
import {
	bindAttendanceConnectorCursor,
	resolveAttendanceConnectorPullCursor,
} from "../src/time/attendance/connector-cursor";
import { importAttendanceEvents } from "../src/time/attendance/import";
import type {
	AttendanceConnectorPullPort,
	AttendanceSourceEvent,
} from "../src/time/handoff/ports";
import { createTestHumanResourcesCommandOptions } from "./helpers/command-options";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";

const EMPLOYEE_ID = "00000000-0000-4000-8000-000000000001";
const ORG_A = "org-attendance-a";
const ORG_B = "org-attendance-b";

function validEvent(
	overrides: Partial<AttendanceSourceEvent> = {},
): AttendanceSourceEvent {
	return {
		employeeId: EMPLOYEE_ID,
		eventType: "clock_in",
		occurredAt: "2026-07-24T01:00:00.000Z",
		sourceTimezone: "Asia/Kuala_Lumpur",
		localWorkDate: "2026-07-24",
		sourceReference: "row-1",
		...overrides,
	};
}

function createPull(
	impl: AttendanceConnectorPullPort["pull"],
): AttendanceConnectorPullPort {
	return { pull: impl };
}

describe("createProductionAttendanceSource", () => {
	it("remains fail-closed when pull transport is not configured", async () => {
		const source = createProductionAttendanceSource();
		const fetched = await source.fetchEvents({
			organizationId: ORG_A,
		});
		expect(fetched.ok).toBe(false);
		if (fetched.ok) return;
		expect(fetched.code).toBe("CONFLICT");

		const preview = await source.previewEvents({
			organizationId: ORG_A,
		});
		expect(preview.ok).toBe(false);
	});

	it("rejects cross-organization cursors", async () => {
		const source = createProductionAttendanceSource({
			pull: createPull(async () => ({
				ok: true,
				data: { events: [validEvent()] },
			})),
		});
		const foreignCursor = bindAttendanceConnectorCursor({
			organizationId: ORG_A,
			nextToken: "page-2",
		});
		expect(foreignCursor).toBeDefined();

		const fetched = await source.fetchEvents({
			organizationId: ORG_B,
			cursor: foreignCursor,
		});
		expect(fetched.ok).toBe(false);
		if (fetched.ok) return;
		expect(fetched.code).toBe("CONFLICT");
	});

	it("returns org-bound nextCursor and passes decoded token to pull", async () => {
		const pull = vi.fn(
			async (input: { organizationId: string; cursor?: string }) => {
				if (input.cursor === undefined) {
					return {
						ok: true as const,
						data: {
							events: [validEvent({ sourceReference: "page-1" })],
							nextCursor: "page-2",
						},
					};
				}
				if (input.cursor === "page-2") {
					return {
						ok: true as const,
						data: {
							events: [validEvent({ sourceReference: "page-2-row" })],
						},
					};
				}
				return {
					ok: false as const,
					code: "CONFLICT" as const,
					message: "unexpected cursor",
				};
			},
		);

		const source = createProductionAttendanceSource({
			pull: createPull(pull),
		});

		const first = await source.fetchEvents({ organizationId: ORG_A });
		expect(first.ok).toBe(true);
		if (!first.ok) return;
		expect(first.data.events).toHaveLength(1);
		expect(first.data.nextCursor).toBeDefined();

		const second = await source.fetchEvents({
			organizationId: ORG_A,
			cursor: first.data.nextCursor,
		});
		expect(second.ok).toBe(true);
		if (!second.ok) return;
		expect(second.data.events[0]?.sourceReference).toBe("page-2-row");
		expect(pull).toHaveBeenCalledWith({
			organizationId: ORG_A,
			cursor: "page-2",
		});
	});

	it("returns identical sourceReferences for the same org and cursor", async () => {
		const events = [
			validEvent({ sourceReference: "stable-1" }),
			validEvent({
				sourceReference: "stable-2",
				eventType: "clock_out",
				occurredAt: "2026-07-24T09:00:00.000Z",
			}),
		];
		const pull = createPull(async () => ({
			ok: true,
			data: { events },
		}));
		const source = createProductionAttendanceSource({ pull });

		const first = await source.fetchEvents({ organizationId: ORG_A });
		const second = await source.fetchEvents({ organizationId: ORG_A });
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) return;

		expect(first.data.events.map((row) => row.sourceReference)).toEqual(
			second.data.events.map((row) => row.sourceReference),
		);
	});

	it("previewEvents captures row acceptance, rejection, and stable reconciliation key", async () => {
		const source = createProductionAttendanceSource({
			pull: createPull(async () => ({
				ok: true,
				data: {
					events: [
						validEvent({ sourceReference: "good-1" }),
						validEvent({
							sourceReference: "bad-tz",
							sourceTimezone: "Invalid/Timezone",
						}),
						validEvent({ sourceReference: "good-1" }),
					],
					nextCursor: "preview-next",
				},
			})),
		});

		const first = await source.previewEvents({ organizationId: ORG_A });
		const second = await source.previewEvents({ organizationId: ORG_A });
		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		if (!first.ok || !second.ok) return;

		expect(first.data.mode).toBe("preview");
		expect(first.data.totals).toEqual({ accepted: 1, rejected: 2 });
		expect(first.data.reconciliationKey).toBe(second.data.reconciliationKey);
		expect(first.data.nextCursor).toBeDefined();
	});

	it("allocates sourceSequence when omitted and preserves explicit values", async () => {
		const source = createProductionAttendanceSource({
			pull: createPull(async () => ({
				ok: true,
				data: {
					events: [
						validEvent({ sourceReference: "seq-a" }),
						validEvent({
							sourceReference: "seq-b",
							sourceSequence: 5,
							eventType: "clock_out",
							occurredAt: "2026-07-24T09:00:00.000Z",
						}),
					],
				},
			})),
		});

		const fetched = await source.fetchEvents({ organizationId: ORG_A });
		expect(fetched.ok).toBe(true);
		if (!fetched.ok) return;
		expect(fetched.data.events.map((row) => row.sourceSequence)).toEqual([
			0, 5,
		]);
	});

	it("captures invalid rows without failing the whole batch fetch", async () => {
		const source = createProductionAttendanceSource({
			pull: createPull(async () => ({
				ok: true,
				data: {
					events: [
						validEvent({ sourceReference: "accepted-row" }),
						validEvent({
							sourceReference: "rejected-row",
							sourceTimezone: "Invalid/Timezone",
						}),
					],
				},
			})),
		});

		const fetched = await source.fetchEvents({ organizationId: ORG_A });
		expect(fetched.ok).toBe(true);
		if (!fetched.ok) return;
		expect(fetched.data.events).toHaveLength(1);
		expect(fetched.data.rejectedRows).toHaveLength(1);
		expect(fetched.data.rejectedRows?.[0]?.errorCode).toBe("INVALID_TIMEZONE");
	});

	it("retries transient pull failures before succeeding", async () => {
		let attempts = 0;
		const source = createProductionAttendanceSource({
			pull: createPull(async () => {
				attempts += 1;
				if (attempts < 3) {
					return {
						ok: false as const,
						code: "SERVICE_UNAVAILABLE" as const,
						message: "temporary outage",
					};
				}
				return {
					ok: true as const,
					data: { events: [validEvent({ sourceReference: "after-retry" })] },
				};
			}),
			retry: { maxAttempts: 3, backoffMs: 0 },
		});

		const fetched = await source.fetchEvents({ organizationId: ORG_A });
		expect(fetched.ok).toBe(true);
		if (!fetched.ok) return;
		expect(attempts).toBe(3);
		expect(fetched.data.events[0]?.sourceReference).toBe("after-retry");
	});

	it("fails closed after retry exhaustion", async () => {
		const recorder = createMemoryHrObservabilityRecorder();
		const observability: HrObservabilityPorts = {
			recorder,
			clock: { now: () => new Date("2026-07-28T00:00:00.000Z") },
		};
		const source = createProductionAttendanceSource({
			pull: createPull(async () => ({
				ok: false as const,
				code: "SERVICE_UNAVAILABLE" as const,
				message: "still down",
			})),
			retry: { maxAttempts: 2, backoffMs: 0 },
			observability,
		});

		const fetched = await source.fetchEvents({ organizationId: ORG_A });
		expect(fetched.ok).toBe(false);
		if (fetched.ok) return;
		expect(fetched.code).toBe("SERVICE_UNAVAILABLE");
		expect(recorder.metrics).toContainEqual({
			name: "hr.connector.health",
			kind: "gauge",
			value: 0,
			labels: { connector: "attendance" },
		});
		expect(recorder.events).toContainEqual({
			name: "hr.connector.unhealthy",
			severity: "error",
			observedAt: new Date("2026-07-28T00:00:00.000Z"),
			attributes: { connector: "attendance", health: "unavailable" },
		});
	});

	it("builds batch and preview from a single validation pass", async () => {
		const source = createProductionAttendanceSource({
			pull: createPull(async () => ({
				ok: true,
				data: {
					events: [
						validEvent({ sourceReference: "shared-good" }),
						validEvent({
							sourceReference: "shared-bad",
							sourceTimezone: "Invalid/Timezone",
						}),
					],
				},
			})),
		});

		const fetched = await source.fetchEvents({ organizationId: ORG_A });
		const preview = await source.previewEvents({ organizationId: ORG_A });
		expect(fetched.ok).toBe(true);
		expect(preview.ok).toBe(true);
		if (!fetched.ok || !preview.ok) return;

		expect(fetched.data.events).toHaveLength(1);
		expect(preview.data.totals).toEqual({ accepted: 1, rejected: 1 });
		expect(preview.data.reconciliationKey).toHaveLength(64);
	});
});

describe("createHttpAttendanceConnectorPull", () => {
	it("maps HTTP JSON payloads into connector pull results", async () => {
		const { createHttpAttendanceConnectorPull } = await import(
			"../src/time/attendance/http-connector-pull"
		);
		const fetchImpl = vi.fn(async () => ({
			ok: true,
			status: 200,
			json: async () => ({
				events: [validEvent({ sourceReference: "http-row" })],
				nextCursor: "http-next",
			}),
		})) as unknown as typeof fetch;

		const pull = createHttpAttendanceConnectorPull({
			baseUrl: "https://attendance.example.com",
			fetchImpl,
		});
		const pulled = await pull.pull({ organizationId: ORG_A });
		expect(pulled.ok).toBe(true);
		if (!pulled.ok) return;
		expect(pulled.data.events[0]?.sourceReference).toBe("http-row");
		expect(pulled.data.nextCursor).toBe("http-next");
	});

	it("rejects invalid HTTP payloads after Zod validation", async () => {
		const { createHttpAttendanceConnectorPull } = await import(
			"../src/time/attendance/http-connector-pull"
		);
		const fetchImpl = vi.fn(async () => ({
			ok: true,
			status: 200,
			json: async () => ({ events: [{ sourceReference: "missing-fields" }] }),
		})) as unknown as typeof fetch;

		const pull = createHttpAttendanceConnectorPull({
			baseUrl: "https://attendance.example.com",
			fetchImpl,
		});
		const pulled = await pull.pull({ organizationId: ORG_A });
		expect(pulled.ok).toBe(false);
		if (pulled.ok) return;
		expect(pulled.code).toBe("VALIDATION_ERROR");
	});
});

describe("resolveAttendanceConnectorPullCursor", () => {
	it("rejects malformed cursors", () => {
		const resolved = resolveAttendanceConnectorPullCursor({
			organizationId: ORG_A,
			cursor: "not-valid-base64url",
		});
		expect(resolved.ok).toBe(false);
		if (resolved.ok) return;
		expect(resolved.code).toBe("VALIDATION_ERROR");
	});

	it("decodes org-bound tokens for pull transport", () => {
		const cursor = bindAttendanceConnectorCursor({
			organizationId: ORG_A,
			nextToken: "page-3",
		});
		expect(cursor).toBeDefined();

		const resolved = resolveAttendanceConnectorPullCursor({
			organizationId: ORG_A,
			cursor,
		});
		expect(resolved.ok).toBe(true);
		if (!resolved.ok) return;
		expect(resolved.data.pullCursor).toBe("page-3");
	});
});

describe("production attendance source import integration", () => {
	it("imports events fetched from the production connector through importAttendanceEvents", async () => {
		const store = createMemoryHumanResourcesStore();
		const ports = createMemoryMutationPorts();
		const ready = createTestHumanResourcesCommandOptions({
			store,
			ports,
			authorization: createGrantingHumanResourcesAuthorization([
				...HUMAN_RESOURCES_PERMISSION_CODES,
			]),
			assignmentContext: createStoreAssignmentContextQuery({ store }),
		});

		const employee = await createEmployee(
			{
				organizationId: ORG_A,
				actorUserId: "actor-connector",
				correlationId: "corr-connector-emp",
				idempotencyKey: "idem-connector-emp",
				employeeNumber: "E-CONN-1",
				legalName: "Connector Worker",
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG_A,
				actorUserId: "actor-connector",
				correlationId: "corr-connector-employ",
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const attendanceSource = createProductionAttendanceSource({
			pull: createPull(async () => ({
				ok: true,
				data: {
					events: [
						validEvent({
							employeeId: employee.data.id,
							sourceReference: "connector-invalid-0",
							sourceTimezone: "Not/A_Timezone",
						}),
						validEvent({
							employeeId: employee.data.id,
							sourceReference: "connector-row-1",
							occurredAt: "2025-07-13T01:00:00.000Z",
							localWorkDate: "2025-07-13",
							sourceSequence: 2,
						}),
					],
					nextCursor: "connector-next",
				},
			})),
		});

		const imported = await importAttendanceEvents(
			{
				organizationId: ORG_A,
				actorUserId: "actor-connector",
				correlationId: "corr-connector-import",
				idempotencyKey: "idem-connector-import",
				batchId: "batch-connector-1",
				sourceKey: "device-connector",
			},
			{ ...ready, attendanceSource },
		);
		expect(imported.ok).toBe(true);
		if (!imported.ok) return;
		expect(imported.data.status).toBe("partial");
		expect(imported.data.totals).toEqual({
			accepted: 1,
			skipped: 0,
			rejected: 1,
		});
		expect(imported.data.accepted[0]?.rowIndex).toBe(1);
		expect(imported.data.rejected).toEqual([
			{
				rowIndex: 0,
				sourceReference: "connector-invalid-0",
				errorCode: "INVALID_TIMEZONE",
				errorMessage: "Source timezone is not a valid IANA timezone",
			},
		]);
		expect(imported.data.nextCursor).toBe(
			bindAttendanceConnectorCursor({
				organizationId: ORG_A,
				nextToken: "connector-next",
			}),
		);

		const replayed = await importAttendanceEvents(
			{
				organizationId: ORG_A,
				actorUserId: "actor-connector",
				correlationId: "corr-connector-import-replay",
				idempotencyKey: "idem-connector-import",
				batchId: "batch-connector-1",
				sourceKey: "device-connector",
			},
			{ ...ready, attendanceSource },
		);
		expect(replayed).toEqual(imported);
	});

	it("returns a failed import outcome when every connector row is rejected", async () => {
		const store = createMemoryHumanResourcesStore();
		const ports = createMemoryMutationPorts();
		const ready = createTestHumanResourcesCommandOptions({
			store,
			ports,
			authorization: createGrantingHumanResourcesAuthorization([
				...HUMAN_RESOURCES_PERMISSION_CODES,
			]),
			assignmentContext: createStoreAssignmentContextQuery({ store }),
		});
		const attendanceSource = createProductionAttendanceSource({
			pull: createPull(async () => ({
				ok: true,
				data: {
					events: [
						validEvent({
							sourceReference: "connector-invalid-only",
							sourceTimezone: "Not/A_Timezone",
						}),
					],
				},
			})),
		});

		const imported = await importAttendanceEvents(
			{
				organizationId: ORG_A,
				actorUserId: "actor-connector",
				correlationId: "corr-connector-rejected",
				idempotencyKey: "idem-connector-rejected",
				batchId: "batch-connector-rejected",
				sourceKey: "device-connector",
			},
			{ ...ready, attendanceSource },
		);

		expect(imported.ok).toBe(true);
		if (!imported.ok) return;
		expect(imported.data.status).toBe("failed");
		expect(imported.data.accepted).toEqual([]);
		expect(imported.data.totals).toEqual({
			accepted: 0,
			skipped: 0,
			rejected: 1,
		});
		expect(imported.data.rejected[0]).toMatchObject({
			rowIndex: 0,
			sourceReference: "connector-invalid-only",
			errorCode: "INVALID_TIMEZONE",
		});
	});
});

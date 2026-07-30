import {
	type ChannelListener,
	subscribe,
	unsubscribe,
} from "node:diagnostics_channel";

import { describe, expect, it } from "vitest";
import {
	countByAction,
	exportAuditLogDetailed,
	purgeOldEntries,
	queryAuditLog,
	queryAuditLogCursor,
} from "../src/query";
import { createAuditRecorder } from "../src/recorder";
import {
	AUDIT_TELEMETRY_CHANNEL,
	type AuditTelemetryEvent,
	auditTelemetryEventSchema,
} from "../src/telemetry";
import { buildTransactionalAuditInsert } from "../src/transaction-write";
import { MemoryAuditStore } from "./helpers/memory-audit-store";

function captureAuditTelemetry(): {
	events: AuditTelemetryEvent[];
	stop: () => void;
} {
	const events: AuditTelemetryEvent[] = [];
	const listener: ChannelListener = (message) => {
		const parsed = auditTelemetryEventSchema.safeParse(message);
		if (parsed.success) {
			events.push(parsed.data);
		}
	};
	subscribe(AUDIT_TELEMETRY_CHANNEL, listener);
	return {
		events,
		stop: () => unsubscribe(AUDIT_TELEMETRY_CHANNEL, listener),
	};
}

describe("@afenda/audit telemetry", () => {
	it("emits bounded payload-free outcomes for every kernel operation", async () => {
		const capture = captureAuditTelemetry();
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });
		const sensitiveMarker = "must-never-reach-telemetry";

		try {
			await recorder.record({
				organizationId: "org-sensitive",
				actorUserId: "user-sensitive",
				correlationId: "correlation-sensitive",
				module: "identity",
				entity: "member",
				entityId: "member-sensitive",
				action: "CREATE",
				metadata: { note: sensitiveMarker },
			});
			await recorder.record({ organizationId: "" });
			await queryAuditLog({ organizationId: "org-sensitive" }, store);
			await queryAuditLogCursor({ organizationId: "org-sensitive" }, store);
			await countByAction(
				{ organizationId: "org-sensitive", action: "CREATE" },
				store,
			);
			await exportAuditLogDetailed(
				{ organizationId: "org-sensitive", format: "json" },
				store,
			);
			await purgeOldEntries(
				{
					organizationId: "org-sensitive",
					olderThan: new Date("2100-01-01T00:00:00.000Z"),
				},
				store,
			);
			buildTransactionalAuditInsert({
				input: { organizationId: "" },
				sql: (strings, ...values) => ({ strings, values }),
			});
		} finally {
			capture.stop();
		}

		expect(capture.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ operation: "record", outcome: "succeeded" }),
				expect.objectContaining({
					operation: "record",
					outcome: "rejected",
					errorCode: "BAD_REQUEST",
				}),
				expect.objectContaining({ operation: "query", rowCount: 1 }),
				expect.objectContaining({ operation: "cursor_query", rowCount: 1 }),
				expect.objectContaining({ operation: "count", rowCount: 1 }),
				expect.objectContaining({
					operation: "export",
					rowCount: 1,
					truncated: false,
				}),
				expect.objectContaining({ operation: "purge", rowCount: 1 }),
				expect.objectContaining({
					operation: "transaction_build",
					outcome: "rejected",
				}),
			]),
		);
		for (const event of capture.events) {
			expect(event.durationMs).toBeGreaterThanOrEqual(0);
			expect(auditTelemetryEventSchema.safeParse(event).success).toBe(true);
		}
		const serialized = JSON.stringify(capture.events);
		for (const forbidden of [
			"org-sensitive",
			"user-sensitive",
			"correlation-sensitive",
			"member-sensitive",
			sensitiveMarker,
		]) {
			expect(serialized).not.toContain(forbidden);
		}
	});

	it("reports unexpected recorder failures before preserving rejection semantics", async () => {
		const capture = captureAuditTelemetry();
		const store = new MemoryAuditStore();
		store.write = () => {
			throw new Error("unexpected persistence failure");
		};

		try {
			await expect(
				createAuditRecorder({ store }).record({
					organizationId: "org-1",
					actorUserId: "user-1",
					correlationId: "corr-1",
					module: "identity",
					entity: "member",
					entityId: "member-1",
					action: "UPDATE",
				}),
			).rejects.toThrow("unexpected persistence failure");
		} finally {
			capture.stop();
		}

		expect(capture.events).toContainEqual(
			expect.objectContaining({
				operation: "record",
				outcome: "failed",
				errorCode: "UNEXPECTED_ERROR",
			}),
		);
	});
});

import { describe, expect, it } from "vitest";

import { MAX_AUDIT_JSON_STRING_LENGTH } from "../src/json-policy";
import { mapAuditLogRow } from "../src/map-row";

const baseRow = {
	id: "11111111-1111-1111-1111-111111111111",
	organizationId: "org-1",
	actorUserId: "user-1",
	correlationId: "corr-1",
	module: "identity",
	entity: "member",
	entityId: "m1",
	action: "CREATE",
	changes: [] as unknown[],
	oldValue: null,
	newValue: { name: "Ada" },
	metadata: null,
	ipAddress: null,
	userAgent: null,
	createdAt: new Date("2026-07-20T00:00:00.000Z"),
};

describe("@afenda/audit mapAuditLogRow", () => {
	it("maps a valid row", () => {
		const mapped = mapAuditLogRow(baseRow);
		expect(mapped.ok).toBe(true);
		if (mapped.ok) {
			expect(mapped.data.action).toBe("CREATE");
			expect(mapped.data.newValue).toEqual({ name: "Ada" });
			expect(mapped.data.eventContext).toBeNull();
		}
	});

	it("extracts a V1 envelope while preserving caller metadata", () => {
		const mapped = mapAuditLogRow({
			...baseRow,
			metadata: {
				channel: "operator",
				_afenda_event_context: {
					version: 1,
					outcome: "FAILED",
					source: "identity-policy",
					occurredAt: "2026-07-19T23:59:59.000Z",
					causationId: "command-1",
					reasonCode: "POLICY_FAILURE",
				},
			},
		});

		expect(mapped.ok).toBe(true);
		if (mapped.ok) {
			expect(mapped.data.metadata).toEqual({ channel: "operator" });
			expect(mapped.data.eventContext?.occurredAt).toEqual(
				new Date("2026-07-19T23:59:59.000Z"),
			);
			expect(mapped.data.eventContext?.outcome).toBe("FAILED");
		}
	});

	it("fails closed on an incompatible persisted envelope", () => {
		const mapped = mapAuditLogRow({
			...baseRow,
			metadata: {
				_afenda_event_context: {
					version: 2,
					outcome: "SUCCEEDED",
					source: "identity",
					occurredAt: null,
					causationId: null,
					reasonCode: null,
				},
			},
		});

		expect(mapped).toEqual({
			ok: false,
			reason: "invalid_event_context",
		});
	});

	it("fails closed on unknown action", () => {
		const mapped = mapAuditLogRow({ ...baseRow, action: "HACK" });
		expect(mapped).toEqual({ ok: false, reason: "invalid_action" });
	});

	it("fails closed on invalid changes payload", () => {
		const mapped = mapAuditLogRow({
			...baseRow,
			changes: [{ field: 1, oldValue: null, newValue: null }],
		});
		expect(mapped).toEqual({ ok: false, reason: "invalid_changes" });
	});

	it("fails closed on non-object snapshots", () => {
		const mapped = mapAuditLogRow({ ...baseRow, newValue: ["not", "object"] });
		expect(mapped).toEqual({ ok: false, reason: "invalid_snapshot" });
	});

	it("fails closed on invalid persisted scalar and JSON bounds", () => {
		const invalidIdentifier = mapAuditLogRow({ ...baseRow, module: "" });
		const oversizedSnapshot = mapAuditLogRow({
			...baseRow,
			newValue: { value: "x".repeat(MAX_AUDIT_JSON_STRING_LENGTH + 1) },
		});

		expect(invalidIdentifier).toEqual({
			ok: false,
			reason: "invalid_entry",
		});
		expect(oversizedSnapshot).toEqual({
			ok: false,
			reason: "invalid_entry",
		});
	});
});

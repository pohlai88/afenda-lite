import { describe, expect, it } from "vitest";

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
		}
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
});

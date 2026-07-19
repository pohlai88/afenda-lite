import { describe, expect, it } from "vitest";

import { mapDomainEventRow } from "../src/map-row";

describe("@afenda/events map-row", () => {
	it("maps a valid outbox row", () => {
		const mapped = mapDomainEventRow({
			id: "evt-1",
			organizationId: "org-1",
			type: "identity.org_role.assigned",
			sourceModule: "identity",
			correlationId: "corr-1",
			causationId: null,
			actorUserId: "user-1",
			payload: {
				roleId: "role-1",
				assignmentId: "assign-1",
				recipientUserId: "user-2",
				reactivated: false,
			},
			metadata: null,
			status: "pending",
			attempts: 0,
			lastError: null,
			processedAt: null,
			createdAt: new Date("2026-07-20T00:00:00.000Z"),
		});

		expect(mapped.ok).toBe(true);
		if (mapped.ok) {
			expect(mapped.data.id).toBe("evt-1");
			expect(mapped.data.occurredAt.toISOString()).toBe(
				"2026-07-20T00:00:00.000Z",
			);
		}
	});

	it("rejects non-object payload", () => {
		const mapped = mapDomainEventRow({
			id: "evt-1",
			organizationId: "org-1",
			type: "identity.org_role.assigned",
			sourceModule: "identity",
			correlationId: "corr-1",
			causationId: null,
			actorUserId: "user-1",
			payload: ["not", "object"],
			metadata: null,
			status: "pending",
			attempts: 0,
			lastError: null,
			processedAt: null,
			createdAt: new Date(),
		});

		expect(mapped).toEqual({ ok: false, reason: "invalid_payload" });
	});
});

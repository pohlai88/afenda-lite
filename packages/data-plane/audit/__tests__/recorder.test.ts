import { describe, expect, it } from "vitest";

import { createAuditRecorder } from "../src/recorder";
import { assertOk, MemoryAuditStore } from "./helpers/memory-audit-store";

describe("@afenda/audit recorder", () => {
	it("rejects missing organizationId and correlationId", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });

		const missingOrg = await recorder.record({
			actorUserId: "user-1",
			correlationId: "corr-1",
			module: "identity",
			entity: "role",
			entityId: "r1",
			action: "UPDATE",
		});
		expect(missingOrg.ok).toBe(false);
		if (!missingOrg.ok) {
			expect(missingOrg.code).toBe("BAD_REQUEST");
		}

		const missingCorr = await recorder.record({
			organizationId: "org-1",
			actorUserId: "user-1",
			module: "identity",
			entity: "role",
			entityId: "r1",
			action: "UPDATE",
		});
		expect(missingCorr.ok).toBe(false);
		if (!missingCorr.ok) {
			expect(missingCorr.code).toBe("BAD_REQUEST");
		}
		expect(store.all()).toHaveLength(0);
	});

	it("masks sensitive snapshots and writes Change[]", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });

		const entry = assertOk(
			await recorder.record({
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
				module: "identity",
				entity: "member",
				entityId: "m1",
				action: "UPDATE",
				oldValue: { name: "Ada", password: "old" },
				newValue: { name: "Ada Lovelace", password: "new" },
				metadata: { token: "abc" },
			}),
		);

		expect(entry.oldValue).toEqual({ name: "Ada", password: "***" });
		expect(entry.newValue).toEqual({
			name: "Ada Lovelace",
			password: "***",
		});
		expect(entry.metadata).toEqual({ token: "***" });
		expect(entry.changes).toEqual([
			{ field: "name", oldValue: "Ada", newValue: "Ada Lovelace" },
			{ field: "password", oldValue: "***", newValue: "***" },
		]);
	});

	it("masks secrets on CREATE wildcard changes", async () => {
		const store = new MemoryAuditStore();
		const recorder = createAuditRecorder({ store });

		const entry = assertOk(
			await recorder.record({
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-2",
				module: "identity",
				entity: "member",
				entityId: "m2",
				action: "CREATE",
				newValue: { name: "Ada", password: "plain" },
			}),
		);

		expect(entry.changes).toEqual([
			{
				field: "*",
				oldValue: null,
				newValue: { name: "Ada", password: "***" },
			},
		]);
		expect(entry.newValue).toEqual({ name: "Ada", password: "***" });
	});
});

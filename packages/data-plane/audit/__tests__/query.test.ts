import { describe, expect, it } from "vitest";

import {
	countByAction,
	exportAuditLog,
	getEntityHistory,
	getUserActivity,
	purgeOldEntries,
	queryAuditLog,
} from "../src/query";
import { assertOk, MemoryAuditStore } from "./helpers/memory-audit-store";

async function seed(store: MemoryAuditStore) {
	assertOk(
		await store.write({
			organizationId: "org-1",
			actorUserId: "user-a",
			correlationId: "c1",
			module: "identity",
			entity: "role",
			entityId: "role-1",
			action: "CREATE",
			changes: [{ field: "name", oldValue: null, newValue: "Admin" }],
			createdAt: new Date("2026-07-01T00:00:00.000Z"),
		}),
	);
	assertOk(
		await store.write({
			organizationId: "org-1",
			actorUserId: "user-b",
			correlationId: "c2",
			module: "identity",
			entity: "role",
			entityId: "role-1",
			action: "UPDATE",
			changes: [{ field: "name", oldValue: "Admin", newValue: "Owner" }],
			createdAt: new Date("2026-07-02T00:00:00.000Z"),
		}),
	);
	assertOk(
		await store.write({
			organizationId: "org-2",
			actorUserId: "user-a",
			correlationId: "c3",
			module: "identity",
			entity: "role",
			entityId: "role-1",
			action: "CREATE",
			changes: [],
			createdAt: new Date("2026-07-03T00:00:00.000Z"),
		}),
	);
}

describe("@afenda/audit query helpers", () => {
	it("scopes entity history by org + entity + entityId", async () => {
		const store = new MemoryAuditStore();
		await seed(store);

		const page = assertOk(
			await getEntityHistory(
				{
					organizationId: "org-1",
					entity: "role",
					entityId: "role-1",
				},
				store,
			),
		);

		expect(page.total).toBe(2);
		expect(page.entries).toHaveLength(2);
		expect(page.entries.every((e) => e.organizationId === "org-1")).toBe(true);
		expect(page.entries[0]?.action).toBe("UPDATE");
	});

	it("lists user activity and counts by action", async () => {
		const store = new MemoryAuditStore();
		await seed(store);

		const activity = assertOk(
			await getUserActivity(
				{ organizationId: "org-1", actorUserId: "user-a" },
				store,
			),
		);
		expect(activity.total).toBe(1);

		const createCount = assertOk(
			await countByAction({ organizationId: "org-1", action: "CREATE" }, store),
		);
		expect(createCount).toBe(1);
	});

	it("rejects empty organizationId on query", async () => {
		const store = new MemoryAuditStore();
		const result = await queryAuditLog({ organizationId: "  " }, store);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
	});

	it("exports json and purges only the target org older rows", async () => {
		const store = new MemoryAuditStore();
		await seed(store);

		const exported = assertOk(
			await exportAuditLog({ organizationId: "org-1", format: "json" }, store),
		);
		const parsed: unknown = JSON.parse(exported);
		expect(Array.isArray(parsed)).toBe(true);
		if (Array.isArray(parsed)) {
			expect(parsed).toHaveLength(2);
		}

		const purged = assertOk(
			await purgeOldEntries(
				{
					organizationId: "org-1",
					olderThan: new Date("2026-07-02T00:00:00.000Z"),
				},
				store,
			),
		);
		expect(purged).toBe(1);

		const remainingOrg1 = assertOk(
			await queryAuditLog({ organizationId: "org-1" }, store),
		);
		expect(remainingOrg1.total).toBe(1);

		const remainingOrg2 = assertOk(
			await queryAuditLog({ organizationId: "org-2" }, store),
		);
		expect(remainingOrg2.total).toBe(1);
	});
});

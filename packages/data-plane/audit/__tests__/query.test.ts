import { ok } from "@afenda/errors/result";
import { describe, expect, it, vi } from "vitest";

import {
	countByAction,
	exportAuditLog,
	exportAuditLogDetailed,
	getEntityHistory,
	getUserActivity,
	purgeOldEntries,
	queryAuditLog,
	queryAuditLogCursor,
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

	it("rejects unknown filters instead of broadening the query", async () => {
		const store = new MemoryAuditStore();
		const query = vi.spyOn(store, "query");
		const count = vi.spyOn(store, "count");
		const result = await queryAuditLog(
			{ organizationId: "org-1", actorId: "misspelled-user-filter" },
			store,
		);

		expect(result).toMatchObject({ ok: false, code: "BAD_REQUEST" });
		expect(query).not.toHaveBeenCalled();
		expect(count).not.toHaveBeenCalled();
	});

	it("rejects non-canonical retention timestamps before purging", async () => {
		const store = new MemoryAuditStore();
		const purge = vi.spyOn(store, "purge");
		const result = await purgeOldEntries(
			{ organizationId: "org-1", olderThan: "July 1, 2026" },
			store,
		);

		expect(result).toMatchObject({ ok: false, code: "BAD_REQUEST" });
		expect(purge).not.toHaveBeenCalled();
	});

	it("paginates with an opaque cursor without duplicates", async () => {
		const store = new MemoryAuditStore();
		await seed(store);

		const first = assertOk(
			await queryAuditLogCursor(
				{ organizationId: "org-1", pageSize: 1 },
				store,
			),
		);
		expect(first.entries).toHaveLength(1);
		expect(first.nextCursor).not.toBeNull();

		const second = assertOk(
			await queryAuditLogCursor(
				{
					organizationId: "org-1",
					pageSize: 1,
					cursor: first.nextCursor,
				},
				store,
			),
		);
		expect(second.entries).toHaveLength(1);
		expect(second.nextCursor).toBeNull();
		expect(second.entries[0]?.id).not.toBe(first.entries[0]?.id);
	});

	it("rejects malformed cursors before querying the store", async () => {
		const store = new MemoryAuditStore();
		const result = await queryAuditLogCursor(
			{ organizationId: "org-1", cursor: "not-a-valid-cursor" },
			store,
		);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
	});

	it("keeps synchronous store failures on the promise boundary", async () => {
		const store = new MemoryAuditStore();
		store.count = () => {
			throw new Error("synchronous count failure");
		};

		const pending = countByAction(
			{ organizationId: "org-1", action: "CREATE" },
			store,
		);

		expect(pending).toBeInstanceOf(Promise);
		await expect(pending).rejects.toThrow("synchronous count failure");
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

	it("reports bounded export truncation and an opaque continuation", async () => {
		const store = new MemoryAuditStore();
		await seed(store);
		const [template] = store.all();
		if (template === undefined) {
			throw new Error("expected seeded audit entry");
		}
		const rows = Array.from({ length: 10_001 }, (_, index) => ({
			...template,
			id: index.toString().padStart(36, "0"),
		}));
		const queryCursor = vi
			.fn()
			.mockResolvedValueOnce(ok(rows))
			.mockResolvedValueOnce(ok([]));
		store.queryCursor = queryCursor;

		const exported = assertOk(
			await exportAuditLogDetailed(
				{ organizationId: "org-1", format: "json" },
				store,
			),
		);

		expect(exported.rowCount).toBe(10_000);
		expect(exported.truncated).toBe(true);
		expect(exported.nextCursor).not.toBeNull();
		const content: unknown = JSON.parse(exported.content);
		expect(Array.isArray(content) ? content.length : -1).toBe(10_000);

		const continued = assertOk(
			await exportAuditLogDetailed(
				{
					organizationId: "org-1",
					format: "json",
					cursor: exported.nextCursor,
				},
				store,
			),
		);
		expect(continued.rowCount).toBe(0);
		expect(queryCursor.mock.calls[1]?.[0].cursor).toEqual({
			createdAt: template.createdAt,
			id: rows[9999]?.id,
		});
	});
});

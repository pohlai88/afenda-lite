import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const select = vi.fn();
const insert = vi.fn();
const del = vi.fn();

vi.mock("@afenda/db", async () => {
	const actual =
		await vi.importActual<typeof import("@afenda/db")>("@afenda/db");
	return {
		...actual,
		db: {
			select: (...args: unknown[]) => select(...args),
			insert: (...args: unknown[]) => insert(...args),
			delete: (...args: unknown[]) => del(...args),
		},
	};
});

const sampleRow = {
	id: "11111111-1111-1111-1111-111111111111",
	organizationId: "org-1",
	actorUserId: "user-1",
	correlationId: "corr-1",
	module: "identity",
	entity: "member",
	entityId: "m1",
	action: "UPDATE",
	changes: [{ field: "name", oldValue: "a", newValue: "b" }],
	oldValue: { name: "a" },
	newValue: { name: "b" },
	metadata: null,
	ipAddress: null,
	userAgent: null,
	createdAt: new Date("2026-07-20T00:00:00.000Z"),
};

describe("@afenda/audit DrizzleAuditStore", () => {
	beforeEach(() => {
		select.mockReset();
		insert.mockReset();
		del.mockReset();
		vi.resetModules();
	});

	it("writes and maps a returned row", async () => {
		const returning = vi.fn().mockResolvedValue([sampleRow]);
		const values = vi.fn().mockReturnValue({ returning });
		insert.mockReturnValue({ values });

		const { createDrizzleAuditStore } = await import("../src/drizzle-store");
		const store = createDrizzleAuditStore();
		const result = await store.write({
			organizationId: "org-1",
			actorUserId: "user-1",
			correlationId: "corr-1",
			module: "identity",
			entity: "member",
			entityId: "m1",
			action: "UPDATE",
			changes: [{ field: "name", oldValue: "a", newValue: "b" }],
			oldValue: { name: "a" },
			newValue: { name: "b" },
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.id).toBe(sampleRow.id);
			expect(result.data.action).toBe("UPDATE");
			expect(result.data.organizationId).toBe("org-1");
		}
		expect(values).toHaveBeenCalled();
	});

	it("queries with pagination chain", async () => {
		const offset = vi.fn().mockResolvedValue([sampleRow]);
		const limit = vi.fn().mockReturnValue({ offset });
		const orderBy = vi.fn().mockReturnValue({ limit });
		const where = vi.fn().mockReturnValue({ orderBy });
		select.mockReturnValue({
			from: () => ({ where }),
		});

		const { createDrizzleAuditStore } = await import("../src/drizzle-store");
		const store = createDrizzleAuditStore();
		const result = await store.query({
			organizationId: "org-1",
			page: 1,
			pageSize: 50,
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toHaveLength(1);
			expect(result.data[0]?.entityId).toBe("m1");
		}
		expect(limit).toHaveBeenCalledWith(50);
		expect(offset).toHaveBeenCalledWith(0);
	});

	it("counts with org filter", async () => {
		const where = vi.fn().mockResolvedValue([{ value: 3 }]);
		select.mockReturnValue({
			from: () => ({ where }),
		});

		const { createDrizzleAuditStore } = await import("../src/drizzle-store");
		const store = createDrizzleAuditStore();
		const result = await store.count({ organizationId: "org-1" });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toBe(3);
		}
	});

	it("purges returning deleted ids", async () => {
		const returning = vi
			.fn()
			.mockResolvedValue([{ id: sampleRow.id }, { id: "other" }]);
		const where = vi.fn().mockReturnValue({ returning });
		del.mockReturnValue({ where });

		const { createDrizzleAuditStore } = await import("../src/drizzle-store");
		const store = createDrizzleAuditStore();
		const result = await store.purge({
			organizationId: "org-1",
			olderThan: new Date("2026-01-01T00:00:00.000Z"),
		});

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toBe(2);
		}
	});

	it("fails closed when a queried row has an invalid action", async () => {
		const offset = vi
			.fn()
			.mockResolvedValue([{ ...sampleRow, action: "NOT_AN_ACTION" }]);
		const limit = vi.fn().mockReturnValue({ offset });
		const orderBy = vi.fn().mockReturnValue({ limit });
		const where = vi.fn().mockReturnValue({ orderBy });
		select.mockReturnValue({
			from: () => ({ where }),
		});

		const { createDrizzleAuditStore } = await import("../src/drizzle-store");
		const store = createDrizzleAuditStore();
		const result = await store.query({
			organizationId: "org-1",
			page: 1,
			pageSize: 50,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("INTERNAL_ERROR");
			expect(result.message).toMatch(/invalid_action/);
		}
	});
});

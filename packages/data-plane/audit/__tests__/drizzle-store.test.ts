import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const select = vi.fn();
const insert = vi.fn();
const del = vi.fn();
let createDrizzleAuditStore: typeof import("../src/drizzle-store").createDrizzleAuditStore;

vi.mock("@afenda/db", () => {
	const platformAuditLog = {
		id: "id",
		organizationId: "organizationId",
		actorUserId: "actorUserId",
		correlationId: "correlationId",
		module: "module",
		entity: "entity",
		entityId: "entityId",
		action: "action",
		createdAt: "createdAt",
	};
	return {
		and: (...predicates: unknown[]) => ({ kind: "and", predicates }),
		count: () => ({ kind: "count" }),
		desc: (column: unknown) => ({ kind: "desc", column }),
		eq: (column: unknown, value: unknown) => ({ kind: "eq", column, value }),
		gte: (column: unknown, value: unknown) => ({ kind: "gte", column, value }),
		lt: (column: unknown, value: unknown) => ({ kind: "lt", column, value }),
		lte: (column: unknown, value: unknown) => ({ kind: "lte", column, value }),
		or: (...predicates: unknown[]) => ({ kind: "or", predicates }),
		platformAuditLog,
		database: {
			client: {
				select: (...args: unknown[]) => select(...args),
				insert: (...args: unknown[]) => insert(...args),
				delete: (...args: unknown[]) => del(...args),
			},
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
	metadata: {
		_afenda_event_context: {
			version: 1,
			outcome: "SUCCEEDED",
			source: "identity",
			occurredAt: null,
			causationId: null,
			reasonCode: null,
		},
	},
	ipAddress: null,
	userAgent: null,
	createdAt: new Date("2026-07-20T00:00:00.000Z"),
};

describe("@afenda/audit DrizzleAuditStore", () => {
	beforeAll(async () => {
		({ createDrizzleAuditStore } = await import("../src/drizzle-store"));
	});

	beforeEach(() => {
		select.mockReset();
		insert.mockReset();
		del.mockReset();
	});

	it("writes and maps a returned row", async () => {
		const returning = vi.fn().mockResolvedValue([sampleRow]);
		const values = vi.fn().mockReturnValue({ returning });
		insert.mockReturnValue({ values });

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
			expect(result.data.eventContext?.source).toBe("identity");
		}
		expect(values).toHaveBeenCalled();
		expect(values.mock.calls[0]?.[0]).not.toHaveProperty("createdAt");
		expect(values.mock.calls[0]?.[0]).toMatchObject({
			metadata: {
				_afenda_event_context: {
					version: 1,
					outcome: "SUCCEEDED",
					source: "identity",
				},
			},
		});
	});

	it("rejects invalid direct store writes before reaching the database", async () => {
		const values = vi.fn();
		insert.mockReturnValue({ values });

		const store = createDrizzleAuditStore();
		const result = await Reflect.apply(store.write, store, [
			{
				organizationId: "org-1",
				actorUserId: "user-1",
				correlationId: "corr-1",
				module: "identity",
				entity: "member",
				entityId: "m1",
				action: "UPDATE",
				changes: [],
				metadata: { callback: () => "not-json" },
			},
		]);

		expect(result).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
		expect(values).not.toHaveBeenCalled();
	});

	it("queries with pagination chain", async () => {
		const offset = vi.fn().mockResolvedValue([sampleRow]);
		const limit = vi.fn().mockReturnValue({ offset });
		const orderBy = vi.fn().mockReturnValue({ limit });
		const where = vi.fn().mockReturnValue({ orderBy });
		select.mockReturnValue({
			from: () => ({ where }),
		});

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
		expect(orderBy).toHaveBeenCalledTimes(1);
		expect(orderBy.mock.calls[0]).toHaveLength(2);
	});

	it("counts with org filter", async () => {
		const where = vi.fn().mockResolvedValue([{ value: 3 }]);
		select.mockReturnValue({
			from: () => ({ where }),
		});

		const store = createDrizzleAuditStore();
		const result = await store.count({ organizationId: "org-1" });

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data).toBe(3);
		}
	});

	it("queries one extra row for cursor continuation", async () => {
		const limit = vi.fn().mockResolvedValue([sampleRow]);
		const orderBy = vi.fn().mockReturnValue({ limit });
		const where = vi.fn().mockReturnValue({ orderBy });
		select.mockReturnValue({
			from: () => ({ where }),
		});

		const store = createDrizzleAuditStore();
		const result = await store.queryCursor({
			organizationId: "org-1",
			pageSize: 25,
			cursor: {
				createdAt: new Date("2026-07-21T00:00:00.000Z"),
				id: "22222222-2222-2222-2222-222222222222",
			},
		});

		expect(result.ok).toBe(true);
		expect(limit).toHaveBeenCalledWith(26);
		expect(orderBy.mock.calls[0]).toHaveLength(2);
	});

	it("purges returning deleted ids", async () => {
		const returning = vi
			.fn()
			.mockResolvedValue([{ id: sampleRow.id }, { id: "other" }]);
		const where = vi.fn().mockReturnValue({ returning });
		del.mockReturnValue({ where });

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

		const store = createDrizzleAuditStore();
		const result = await store.query({
			organizationId: "org-1",
			page: 1,
			pageSize: 50,
		});

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("INTERNAL_ERROR");
		}
	});
});

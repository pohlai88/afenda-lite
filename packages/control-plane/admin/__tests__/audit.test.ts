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
	action: "role.assign",
	actorUserId: "user-1",
	organizationId: "org-1",
	targetType: "user",
	targetId: "user-2",
	roleId: "22222222-2222-2222-2222-222222222222",
	permissionCode: null,
	oldValue: null,
	newValue: { role: "admin" },
	reason: null,
	correlationId: "corr-1",
	ipAddress: null,
	userAgent: null,
	createdAt: new Date("2026-07-20T00:00:00.000Z"),
};

function mockSelectSequence(options: {
	total: number;
	rows: (typeof sampleRow)[];
}) {
	const offset = vi.fn().mockResolvedValue(options.rows);
	const limit = vi.fn().mockReturnValue({ offset });
	const orderBy = vi.fn().mockReturnValue({ limit });
	const whereRows = vi.fn().mockReturnValue({ orderBy });
	const whereCount = vi.fn().mockResolvedValue([{ value: options.total }]);

	let call = 0;
	select.mockImplementation(() => {
		call += 1;
		if (call === 1) {
			return {
				from: () => ({
					where: whereCount,
				}),
			};
		}
		return {
			from: () => ({
				where: whereRows,
			}),
		};
	});

	return { whereCount, whereRows, orderBy, limit, offset };
}

describe("@afenda/admin rbac audit", () => {
	beforeEach(() => {
		select.mockReset();
		insert.mockReset();
		del.mockReset();
		vi.resetModules();
	});

	it("rejects empty orgId", async () => {
		const { listRbacAudit } = await import("../src/audit");
		const result = await listRbacAudit({ orgId: "  " });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
		expect(select).not.toHaveBeenCalled();
	});

	it("rejects from after to", async () => {
		const { listRbacAudit } = await import("../src/audit");
		const result = await listRbacAudit({
			orgId: "org-1",
			from: "2026-07-20T12:00:00.000Z",
			to: "2026-07-20T00:00:00.000Z",
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
		expect(select).not.toHaveBeenCalled();
	});

	it("rejects pageSize above max", async () => {
		const { listRbacAudit } = await import("../src/audit");
		const result = await listRbacAudit({
			orgId: "org-1",
			pageSize: 101,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
		expect(select).not.toHaveBeenCalled();
	});

	it("returns a page envelope with total and defaults", async () => {
		const { limit, offset } = mockSelectSequence({
			total: 1,
			rows: [sampleRow],
		});
		const { listRbacAudit } = await import("../src/audit");
		const result = await listRbacAudit({ orgId: "org-1" });
		expect(result).toEqual({
			ok: true,
			data: {
				rows: [sampleRow],
				total: 1,
				page: 1,
				pageSize: 50,
			},
		});
		expect(limit).toHaveBeenCalledWith(50);
		expect(offset).toHaveBeenCalledWith(0);
		expect(select).toHaveBeenCalledTimes(2);
	});

	it("applies page offset and pageSize", async () => {
		const { limit, offset } = mockSelectSequence({
			total: 120,
			rows: [sampleRow],
		});
		const { listRbacAudit } = await import("../src/audit");
		const result = await listRbacAudit({
			orgId: "org-1",
			page: 3,
			pageSize: 20,
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.page).toBe(3);
			expect(result.data.pageSize).toBe(20);
			expect(result.data.total).toBe(120);
		}
		expect(limit).toHaveBeenCalledWith(20);
		expect(offset).toHaveBeenCalledWith(40);
	});

	it("maps query failures to Result ok:false", async () => {
		select.mockImplementation(() => {
			throw new Error("db down");
		});
		const { listRbacAudit } = await import("../src/audit");
		await expect(listRbacAudit({ orgId: "org-1" })).resolves.toEqual({
			ok: false,
			code: "INTERNAL_ERROR",
			message: "Failed to list RBAC audit rows",
		});
	});

	it("recordRbacAudit rejects missing correlationId", async () => {
		const { recordRbacAudit } = await import("../src/audit");
		const result = await recordRbacAudit({
			orgId: "org-1",
			action: "member.invite",
			actorUserId: "user-1",
			correlationId: "  ",
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
		expect(insert).not.toHaveBeenCalled();
	});

	it("recordRbacAudit inserts with explicit organization_id", async () => {
		const returning = vi.fn().mockResolvedValue([sampleRow]);
		const values = vi.fn().mockReturnValue({ returning });
		insert.mockReturnValue({ values });

		const { MEMBER_INVITE_AUDIT_ACTION } = await import("../src/schemas/audit");
		const { recordRbacAudit } = await import("../src/audit");
		const result = await recordRbacAudit({
			orgId: "org-1",
			action: MEMBER_INVITE_AUDIT_ACTION,
			actorUserId: "user-1",
			correlationId: "corr-1",
			targetType: "membership",
			targetId: "invitee@example.com",
			newValue: { email: "invitee@example.com", role: "client" },
		});

		expect(result).toEqual({ ok: true, data: sampleRow });
		expect(values).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: "org-1",
				actorUserId: "user-1",
				action: MEMBER_INVITE_AUDIT_ACTION,
				correlationId: "corr-1",
			}),
		);
	});

	it("recordRbacAudit persists optional ipAddress and userAgent", async () => {
		const withAttribution = {
			...sampleRow,
			ipAddress: "203.0.113.10",
			userAgent: "AfendaTest/1.0",
		};
		const returning = vi.fn().mockResolvedValue([withAttribution]);
		const values = vi.fn().mockReturnValue({ returning });
		insert.mockReturnValue({ values });

		const { recordRbacAudit } = await import("../src/audit");
		const result = await recordRbacAudit({
			orgId: "org-1",
			action: "member.invite",
			actorUserId: "user-1",
			correlationId: "corr-1",
			ipAddress: "203.0.113.10",
			userAgent: "AfendaTest/1.0",
		});

		expect(result).toEqual({ ok: true, data: withAttribution });
		expect(values).toHaveBeenCalledWith(
			expect.objectContaining({
				ipAddress: "203.0.113.10",
				userAgent: "AfendaTest/1.0",
			}),
		);
	});

	it("recordRbacAudit rejects oversized ipAddress", async () => {
		const { MAX_RBAC_AUDIT_IP_ADDRESS_LENGTH, recordRbacAudit } = await import(
			"../src/audit-entry"
		);
		const result = await recordRbacAudit({
			orgId: "org-1",
			action: "member.invite",
			actorUserId: "user-1",
			correlationId: "corr-1",
			ipAddress: "x".repeat(MAX_RBAC_AUDIT_IP_ADDRESS_LENGTH + 1),
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
		expect(insert).not.toHaveBeenCalled();
	});

	it("deleteRbacAuditRow returns null when no row matches", async () => {
		const returning = vi.fn().mockResolvedValue([]);
		const where = vi.fn().mockReturnValue({ returning });
		del.mockReturnValue({ where });

		const { deleteRbacAuditRow } = await import("../src/audit");
		const result = await deleteRbacAuditRow({
			id: sampleRow.id,
			orgId: "org-other",
		});
		expect(result).toEqual({ ok: true, data: null });
	});
});

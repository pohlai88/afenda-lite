import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const select = vi.fn();
const transaction = vi.fn();

vi.mock("@afenda/db", () => ({
	and: vi.fn(() => ({ kind: "and" })),
	database: {
		client: { select: (...args: unknown[]) => select(...args) },
		transaction: (...args: unknown[]) => transaction(...args),
	},
	eq: vi.fn(() => ({ kind: "eq" })),
	isNull: vi.fn(() => ({ kind: "isNull" })),
	platformRole: {
		active: "active",
		id: "id",
		isSystemTemplate: "is_system_template",
		organizationId: "organization_id",
	},
	platformRoleAssignment: {
		active: "active",
		id: "id",
		organizationId: "organization_id",
		roleId: "role_id",
		scopeId: "scope_id",
		scopeType: "scope_type",
		userId: "user_id",
	},
}));

function selectResult(rows: unknown[]) {
	return {
		from: () => ({
			where: () => ({ limit: vi.fn().mockResolvedValue(rows) }),
		}),
	};
}

describe("admin audited role transactions", () => {
	beforeEach(() => {
		select.mockReset();
		transaction.mockReset();
		vi.resetModules();
	});

	it("rejects malformed commands before persistence", async () => {
		const { assignRoleWithAudit, revokeRoleWithAudit } = await import(
			"../src/role-assignment"
		);
		await expect(assignRoleWithAudit({})).resolves.toMatchObject({
			ok: false,
			code: "VALIDATION_ERROR",
		});
		await expect(revokeRoleWithAudit({})).resolves.toMatchObject({
			ok: false,
			code: "VALIDATION_ERROR",
		});
		expect(select).not.toHaveBeenCalled();
		expect(transaction).not.toHaveBeenCalled();
	});

	it("builds assignment mutation and RBAC audit in one transaction statement", async () => {
		select
			.mockReturnValueOnce(selectResult([{ id: "role-1" }]))
			.mockReturnValueOnce(selectResult([]));
		transaction.mockImplementation((build) => {
			const sql = (strings: TemplateStringsArray, ...values: unknown[]) => ({
				text: strings.join("?"),
				values,
			});
			const [query] = build(sql);
			expect(query.text).toContain("INSERT INTO platform_role_assignment");
			expect(query.text).toContain("INSERT INTO platform_rbac_audit");
			return [
				[
					{
						active: true,
						audit_id: "audit-1",
						created_at: new Date("2026-08-01T00:00:00.000Z"),
						granted_by: "operator-1",
						id: "assignment-1",
						organization_id: "org-1",
						role_id: "role-1",
						scope_id: "org-1",
						scope_type: "organization",
						updated_at: new Date("2026-08-01T00:00:00.000Z"),
						user_id: "user-1",
					},
				],
			];
		});

		const { assignRoleWithAudit } = await import("../src/role-assignment");
		const result = await assignRoleWithAudit({
			actorUserId: "operator-1",
			correlationId: "correlation-1",
			grantedBy: "operator-1",
			orgId: "org-1",
			roleId: "role-1",
			userId: "user-1",
		});

		expect(result).toMatchObject({ ok: true, auditId: "audit-1" });
		expect(transaction).toHaveBeenCalledTimes(1);
	});
});

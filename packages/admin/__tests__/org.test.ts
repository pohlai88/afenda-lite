import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const listMemberOrganizations = vi.fn();
const createNeonOrganization = vi.fn();
const deleteNeonOrganization = vi.fn();
const persistActiveOrganization = vi.fn();
const inviteOrgMember = vi.fn();
const select = vi.fn();

vi.mock("@afenda/auth", () => ({
	listMemberOrganizations: (...args: unknown[]) =>
		listMemberOrganizations(...args),
	createOrganization: (...args: unknown[]) => createNeonOrganization(...args),
	deleteOrganization: (...args: unknown[]) => deleteNeonOrganization(...args),
	persistActiveOrganization: (...args: unknown[]) =>
		persistActiveOrganization(...args),
	inviteOrgMember: (...args: unknown[]) => inviteOrgMember(...args),
}));

vi.mock("@afenda/db", async () => {
	const actual =
		await vi.importActual<typeof import("@afenda/db")>("@afenda/db");
	return {
		...actual,
		db: {
			select: (...args: unknown[]) => select(...args),
		},
	};
});

const createdOrg = {
	id: "org-new",
	slug: "acme",
	name: "Acme",
} as const;

function mockLastActivityRows(
	rows: Array<{ organizationId: string; lastActivityAt: Date | null }>,
) {
	const groupBy = vi.fn().mockResolvedValue(rows);
	const where = vi.fn().mockReturnValue({ groupBy });
	const from = vi.fn().mockReturnValue({ where });
	select.mockReturnValue({ from });
	return { from, where, groupBy };
}

describe("@afenda/admin org services", () => {
	beforeEach(() => {
		listMemberOrganizations.mockReset();
		createNeonOrganization.mockReset();
		deleteNeonOrganization.mockReset();
		persistActiveOrganization.mockReset();
		inviteOrgMember.mockReset();
		select.mockReset();
		vi.resetModules();
	});

	it("listOrganizations returns summaries with lastActivityAt from audit", async () => {
		const lastAt = new Date("2026-07-19T12:00:00.000Z");
		listMemberOrganizations.mockResolvedValue([
			{ id: "org-1", slug: "one" },
			{ id: "org-2", slug: "two" },
		]);
		mockLastActivityRows([
			{ organizationId: "org-1", lastActivityAt: lastAt },
			{ organizationId: "org-2", lastActivityAt: null },
		]);

		const { listOrganizations } = await import("../src/org");
		await expect(listOrganizations()).resolves.toEqual({
			ok: true,
			data: [
				{ id: "org-1", slug: "one", lastActivityAt: lastAt },
				{ id: "org-2", slug: "two", lastActivityAt: null },
			],
		});
		expect(select).toHaveBeenCalled();
	});

	it("listOrganizations maps Neon failures to ok:false", async () => {
		listMemberOrganizations.mockRejectedValue(
			new Error("@afenda/auth: list denied"),
		);
		const { listOrganizations } = await import("../src/org");
		await expect(listOrganizations()).resolves.toEqual({
			ok: false,
			code: "UNAUTHORIZED",
			message: "Not authorized for organization console",
		});
		expect(select).not.toHaveBeenCalled();
	});

	it("createOrganization rejects invalid slug before Neon", async () => {
		const { createOrganization } = await import("../src/org");
		const result = await createOrganization({
			name: "Acme",
			slug: "Bad Slug",
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
		expect(createNeonOrganization).not.toHaveBeenCalled();
	});

	it("createOrganization returns created org on Neon success", async () => {
		createNeonOrganization.mockResolvedValue(createdOrg);
		const { createOrganization } = await import("../src/org");
		await expect(
			createOrganization({ name: "Acme", slug: "acme" }),
		).resolves.toEqual({
			ok: true,
			data: createdOrg,
		});
	});

	it("createOrganization maps conflict-shaped Neon errors", async () => {
		createNeonOrganization.mockRejectedValue(
			new Error("@afenda/auth: slug taken"),
		);
		const { createOrganization } = await import("../src/org");
		await expect(
			createOrganization({ name: "Acme", slug: "acme" }),
		).resolves.toEqual({
			ok: false,
			code: "CONFLICT",
			message: "Organization already exists",
		});
	});

	it("deleteOrganization rejects empty orgId before Neon", async () => {
		const { deleteOrganization } = await import("../src/org");
		const result = await deleteOrganization({ orgId: "  " });
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
		expect(deleteNeonOrganization).not.toHaveBeenCalled();
	});

	it("deleteOrganization returns orgId on Neon success", async () => {
		deleteNeonOrganization.mockResolvedValue(undefined);
		const { deleteOrganization } = await import("../src/org");
		await expect(deleteOrganization({ orgId: "org-1" })).resolves.toEqual({
			ok: true,
			data: { orgId: "org-1" },
		});
		expect(deleteNeonOrganization).toHaveBeenCalledWith("org-1");
	});

	it("deleteOrganization maps membership refusal to FORBIDDEN", async () => {
		deleteNeonOrganization.mockRejectedValue(
			new Error(
				"@afenda/auth: deleteOrganization refuses organization outside session memberships",
			),
		);
		const { deleteOrganization } = await import("../src/org");
		await expect(deleteOrganization({ orgId: "org-1" })).resolves.toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Organization is not in the session memberships",
		});
	});

	describe("provisionOrganization", () => {
		it("rejects invalid input before Neon", async () => {
			const { provisionOrganization } = await import("../src/org");
			const result = await provisionOrganization({
				name: "Acme",
				slug: "Bad",
				adminEmail: "not-an-email",
				adminRole: "admin",
			});
			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.code).toBe("BAD_REQUEST");
			}
			expect(createNeonOrganization).not.toHaveBeenCalled();
			expect(persistActiveOrganization).not.toHaveBeenCalled();
			expect(inviteOrgMember).not.toHaveBeenCalled();
		});

		it("runs create → setActive → invite and returns organization + invitationId", async () => {
			const callOrder: string[] = [];
			createNeonOrganization.mockImplementation(async () => {
				callOrder.push("create");
				return createdOrg;
			});
			persistActiveOrganization.mockImplementation(async () => {
				callOrder.push("setActive");
			});
			inviteOrgMember.mockImplementation(async () => {
				callOrder.push("invite");
				return { data: null, invitationId: "inv-1" };
			});

			const { provisionOrganization } = await import("../src/org");
			const result = await provisionOrganization({
				name: "Acme",
				slug: "acme",
				adminEmail: " Admin@Example.com ",
				adminRole: "admin",
			});

			expect(result).toEqual({
				ok: true,
				data: {
					organization: createdOrg,
					invitationId: "inv-1",
				},
			});
			expect(callOrder).toEqual(["create", "setActive", "invite"]);
			expect(inviteOrgMember).toHaveBeenCalledWith({
				email: "admin@example.com",
				orgId: "org-new",
				role: "admin",
			});
		});

		it("does not invite when active-org persist fails (session-safe)", async () => {
			createNeonOrganization.mockResolvedValue(createdOrg);
			persistActiveOrganization.mockRejectedValue(
				new Error(
					"@afenda/auth: failed to persist active organization on session",
				),
			);

			const { provisionOrganization } = await import("../src/org");
			const { PROVISION_ORG_CREATED_SET_ACTIVE_FAILED } = await import(
				"../src/schemas/org"
			);
			const result = await provisionOrganization({
				name: "Acme",
				slug: "acme",
				adminEmail: "admin@example.com",
				adminRole: "admin",
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.code).toBe("INTERNAL_ERROR");
				expect(result.message).toContain("set active then retry invite");
				expect(result.details).toEqual({
					disposition: PROVISION_ORG_CREATED_SET_ACTIVE_FAILED,
					organization: createdOrg,
				});
			}
			expect(inviteOrgMember).not.toHaveBeenCalled();
		});

		it("returns org + disposition when invite fails after create+setActive", async () => {
			createNeonOrganization.mockResolvedValue(createdOrg);
			persistActiveOrganization.mockResolvedValue(undefined);
			inviteOrgMember.mockRejectedValue(
				new Error("@afenda/auth: organization invite failed (500)"),
			);

			const { provisionOrganization } = await import("../src/org");
			const { PROVISION_ORG_CREATED_INVITE_FAILED } = await import(
				"../src/schemas/org"
			);
			const result = await provisionOrganization({
				name: "Acme",
				slug: "acme",
				adminEmail: "admin@example.com",
				adminRole: "admin",
			});

			expect(result.ok).toBe(false);
			if (!result.ok) {
				expect(result.code).toBe("INTERNAL_ERROR");
				expect(result.message).toBe(
					"Organization created; invite failed — retry invite",
				);
				expect(result.details).toEqual({
					disposition: PROVISION_ORG_CREATED_INVITE_FAILED,
					organization: createdOrg,
				});
			}
			expect(persistActiveOrganization).toHaveBeenCalledWith("org-new");
			expect(inviteOrgMember).toHaveBeenCalledTimes(1);
		});
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const listOrgMembers = vi.fn();
const select = vi.fn();

vi.mock("@afenda/auth", () => ({
	listOrgMembers: (...args: unknown[]) => listOrgMembers(...args),
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

function mockCountSequence(values: number[]) {
	let call = 0;
	select.mockImplementation(() => {
		const value = values[call] ?? 0;
		call += 1;
		const where = vi.fn().mockResolvedValue([{ value }]);
		const from = vi.fn().mockReturnValue({ where });
		return { from };
	});
}

describe("@afenda/admin usage metrics", () => {
	beforeEach(() => {
		listOrgMembers.mockReset();
		select.mockReset();
		vi.resetModules();
	});

	it("usagePeriodUtcBounds is half-open UTC month", async () => {
		const { usagePeriodUtcBounds } = await import("../src/usage");
		expect(usagePeriodUtcBounds("2026-07")).toEqual({
			start: new Date("2026-07-01T00:00:00.000Z"),
			end: new Date("2026-08-01T00:00:00.000Z"),
		});
	});

	it("rejects invalid period before querying", async () => {
		const { getOrganizationUsageMetrics } = await import("../src/usage");
		const result = await getOrganizationUsageMetrics({
			orgId: "org-1",
			period: "2026-13",
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.code).toBe("BAD_REQUEST");
		}
		expect(listOrgMembers).not.toHaveBeenCalled();
		expect(select).not.toHaveBeenCalled();
	});

	it("returns live member + audit + assignment counts", async () => {
		listOrgMembers.mockResolvedValue([
			{ userId: "u1", email: "a@example.com", role: "admin" },
			{ userId: "u2", email: "b@example.com", role: "client" },
		]);
		mockCountSequence([7, 3]);

		const { getOrganizationUsageMetrics } = await import("../src/usage");
		await expect(
			getOrganizationUsageMetrics({ orgId: "org-1", period: "2026-07" }),
		).resolves.toEqual({
			ok: true,
			data: {
				orgId: "org-1",
				period: "2026-07",
				metrics: {
					activeMembers: { current: 2, band: "quiet" },
					rbacAuditEvents: { current: 7, band: "quiet" },
					activeRoleAssignments: { current: 3, band: "quiet" },
				},
				alerts: [],
			},
		});
		expect(listOrgMembers).toHaveBeenCalledWith("org-1");
		expect(select).toHaveBeenCalledTimes(2);
	});

	it("maps active-org mismatch to FORBIDDEN", async () => {
		listOrgMembers.mockRejectedValue(
			new Error(
				"@afenda/auth: listOrgMembers refuses organization other than the active session org",
			),
		);
		const { getOrganizationUsageMetrics } = await import("../src/usage");
		await expect(
			getOrganizationUsageMetrics({ orgId: "org-other", period: "2026-07" }),
		).resolves.toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Usage metrics require the active session organization",
		});
	});
});

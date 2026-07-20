/**
 * Org-console usage Action — session orgId stamp + @afenda/admin/usage.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const operatorSession = {
	userId: "user-usage-operator",
	orgId: "org-active-session",
	role: "operator" as const,
	email: "operator@example.com",
};

const authMocks = vi.hoisted(() => ({
	requireRole: vi.fn(),
}));

const usageMocks = vi.hoisted(() => ({
	getOrganizationUsageMetrics: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	requireRole: authMocks.requireRole,
}));

vi.mock("@afenda/admin/usage", async () => {
	const { z } = await import("zod");
	return {
		getOrganizationUsageMetrics: usageMocks.getOrganizationUsageMetrics,
		usagePeriodSchema: z
			.string()
			.trim()
			.regex(/^\d{4}-(0[1-9]|1[0-2])$/, "period must be YYYY-MM"),
	};
});

import { getOrganizationUsageAction } from "../app/actions/get-organization-usage";

describe("getOrganizationUsageAction", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(operatorSession);
	});

	it("returns VALIDATION_ERROR for invalid period", async () => {
		const formData = new FormData();
		formData.set("period", "2026-13");

		const result = await getOrganizationUsageAction(null, formData);

		expect(result?.ok).toBe(false);
		if (result?.ok === false) {
			expect(result.code).toBe("VALIDATION_ERROR");
		}
		expect(usageMocks.getOrganizationUsageMetrics).not.toHaveBeenCalled();
	});

	it("stamps orgId from session (never client FormData)", async () => {
		usageMocks.getOrganizationUsageMetrics.mockResolvedValue({
			ok: true,
			data: {
				orgId: "org-active-session",
				period: "2026-07",
				metrics: {
					activeMembers: { current: 3, band: "quiet" },
					rbacAuditEvents: { current: 12, band: "quiet" },
					activeRoleAssignments: { current: 5, band: "active" },
				},
				alerts: [],
			},
		});

		const formData = new FormData();
		formData.set("period", "2026-07");
		formData.set("orgId", "org-spoofed");

		const result = await getOrganizationUsageAction(null, formData);

		expect(result).toEqual({
			ok: true,
			data: {
				orgId: "org-active-session",
				period: "2026-07",
				metrics: {
					activeMembers: { current: 3, band: "quiet" },
					rbacAuditEvents: { current: 12, band: "quiet" },
					activeRoleAssignments: { current: 5, band: "active" },
				},
				alerts: [],
			},
		});
		expect(usageMocks.getOrganizationUsageMetrics).toHaveBeenCalledWith({
			orgId: "org-active-session",
			period: "2026-07",
		});
	});

	it("passes package FORBIDDEN through honestly", async () => {
		usageMocks.getOrganizationUsageMetrics.mockResolvedValue({
			ok: false,
			code: "FORBIDDEN",
			message: "Usage metrics require the active session organization",
		});

		const formData = new FormData();
		formData.set("period", "2026-07");

		const result = await getOrganizationUsageAction(null, formData);

		expect(result?.ok).toBe(false);
		if (result?.ok === false) {
			expect(result.code).toBe("FORBIDDEN");
			expect(result.message).toContain("active session organization");
		}
	});

	it("imports usage from @afenda/admin/usage subpath", async () => {
		const { readFileSync } = await import("node:fs");
		const path = await import("node:path");
		const { fileURLToPath } = await import("node:url");
		const webRoot = path.join(
			path.dirname(fileURLToPath(import.meta.url)),
			"..",
		);
		const source = readFileSync(
			path.join(webRoot, "app/actions/get-organization-usage.ts"),
			"utf8",
		);
		expect(source).toContain('from "@afenda/admin/usage"');
		expect(source).not.toMatch(/from ["']@afenda\/admin["']/);
	});
});

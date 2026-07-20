import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const redirectMock = vi.fn((url: string) => {
	throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
	redirect: (url: string) => redirectMock(url),
}));

vi.mock("../src/session", () => ({
	getSession: () => getSessionMock(),
}));

describe("requireRole (I1.4)", () => {
	beforeEach(() => {
		vi.resetModules();
		getSessionMock.mockReset();
		redirectMock.mockClear();
	});

	it("returns the session when the role satisfies the shell gate", async () => {
		getSessionMock.mockResolvedValue({
			userId: "user-1",
			orgId: "org-1",
			role: "operator",
		});
		const { requireRole } = await import("../src/rbac");
		const session = await requireRole("operator");
		expect(session).toEqual({
			userId: "user-1",
			orgId: "org-1",
			role: "operator",
		});
		expect(redirectMock).not.toHaveBeenCalled();
	});

	it("lets admin satisfy the operator shell", async () => {
		getSessionMock.mockResolvedValue({
			userId: "user-1",
			orgId: "org-1",
			role: "admin",
		});
		const { requireRole } = await import("../src/rbac");
		await expect(requireRole("operator")).resolves.toMatchObject({
			role: "admin",
		});
		expect(redirectMock).not.toHaveBeenCalled();
	});

	it("redirects wrong role to AUTH_FORBIDDEN_PATH", async () => {
		getSessionMock.mockResolvedValue({
			userId: "user-1",
			orgId: "org-1",
			role: "client",
		});
		const { requireRole } = await import("../src/rbac");
		const { AUTH_FORBIDDEN_PATH } = await import("../src/auth-paths");
		await expect(requireRole("operator")).rejects.toThrow(
			`NEXT_REDIRECT:${AUTH_FORBIDDEN_PATH}`,
		);
		expect(redirectMock).toHaveBeenCalledWith(AUTH_FORBIDDEN_PATH);
	});

	it("keeps client shell exclusive (operator cannot enter)", async () => {
		getSessionMock.mockResolvedValue({
			userId: "user-1",
			orgId: "org-1",
			role: "operator",
		});
		const { requireRole } = await import("../src/rbac");
		const { AUTH_FORBIDDEN_PATH } = await import("../src/auth-paths");
		await expect(requireRole("client")).rejects.toThrow(
			`NEXT_REDIRECT:${AUTH_FORBIDDEN_PATH}`,
		);
		expect(redirectMock).toHaveBeenCalledWith(AUTH_FORBIDDEN_PATH);
	});

	it("rejects operator for admin-only gates", async () => {
		getSessionMock.mockResolvedValue({
			userId: "user-1",
			orgId: "org-1",
			role: "operator",
		});
		const { requireRole } = await import("../src/rbac");
		const { AUTH_FORBIDDEN_PATH } = await import("../src/auth-paths");
		await expect(requireRole("admin")).rejects.toThrow(
			`NEXT_REDIRECT:${AUTH_FORBIDDEN_PATH}`,
		);
		expect(redirectMock).toHaveBeenCalledWith(AUTH_FORBIDDEN_PATH);
	});
});

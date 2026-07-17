/**
 * I4 / A11 — dependency throw maps to safe INTERNAL_ERROR ActionResult.
 * Test doubles only; no product shims.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
	userId: "user-i4-a11",
	orgId: "org-i4-a11",
	role: "client" as const,
	email: "client-i4-a11@example.com",
};

const authMocks = vi.hoisted(() => ({
	getApiSession: vi.fn(),
	requireRole: vi.fn(),
}));

const declarationMocks = vi.hoisted(() => ({
	isClientOnboardingComplete: vi.fn(),
	submitClientDeclaration: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	getApiSession: authMocks.getApiSession,
	requireRole: authMocks.requireRole,
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

vi.mock("@/modules/identity/domain/has-permission", () => ({
	hasPermission: vi.fn(async () => true),
}));

vi.mock("@/modules/declarations/domain/declaration-draft", () => ({
	isClientOnboardingComplete: declarationMocks.isClientOnboardingComplete,
}));

vi.mock("@/modules/declarations/domain/submit-client-declaration", () => ({
	submitClientDeclaration: declarationMocks.submitClientDeclaration,
}));

import { submitClientDeclarationAction } from "../app/actions/submit-client-declaration";

describe("submitClientDeclarationAction dependency failure (I4 A11)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(session);
		authMocks.getApiSession.mockResolvedValue(session);
		declarationMocks.isClientOnboardingComplete.mockResolvedValue(true);
	});

	it("maps domain throw to INTERNAL_ERROR without leaking exception text", async () => {
		declarationMocks.submitClientDeclaration.mockRejectedValue(
			new Error("connection timed out postgres://secret:hunter2@db/neondb"),
		);

		const formData = new FormData();
		formData.set("assignmentId", "09ec6b05-9e7d-4de4-99e0-046c216fd4d1");

		const result = await submitClientDeclarationAction(null, formData);

		expect(result).toEqual({
			ok: false,
			code: "INTERNAL_ERROR",
			message:
				"Declaration could not be submitted. Try again or contact an admin.",
		});
		expect(JSON.stringify(result)).not.toContain("hunter2");
		expect(JSON.stringify(result)).not.toContain("postgres://");
		expect(JSON.stringify(result)).not.toContain("timed out");
	});
});

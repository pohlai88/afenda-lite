/**
 * Draft RH unexpected domain failures → INTERNAL_ERROR + correlation (Action parity).
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
	userId: "user-draft-rh",
	orgId: "org-draft-rh",
	role: "client" as const,
	email: "client@example.com",
};

const authMocks = vi.hoisted(() => ({
	getApiSession: vi.fn(),
	roleSatisfies: vi.fn(),
}));

const declarationMocks = vi.hoisted(() => ({
	getClientDeclarationDraft: vi.fn(),
	isClientOnboardingComplete: vi.fn(),
	saveClientDeclarationDraft: vi.fn(),
}));

const logMocks = vi.hoisted(() => ({
	logProductEvent: vi.fn(),
}));

vi.mock("@afenda/auth", () => ({
	getApiSession: authMocks.getApiSession,
	roleSatisfies: authMocks.roleSatisfies,
}));

vi.mock("@/modules/identity/domain/has-permission", () => ({
	hasPermission: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/modules/declarations/domain/declaration-draft", () => ({
	getClientDeclarationDraft: declarationMocks.getClientDeclarationDraft,
	isClientOnboardingComplete: declarationMocks.isClientOnboardingComplete,
	saveClientDeclarationDraft: declarationMocks.saveClientDeclarationDraft,
}));

vi.mock("@/modules/platform/observability/product-log", () => ({
	logProductEvent: logMocks.logProductEvent,
}));

import {
	handleGetClientDeclarationDraft,
	handleWriteClientDeclarationDraft,
} from "../modules/declarations/api/client-declaration-draft-route";

const ASSIGNMENT_ID = "09ec6b05-9e7d-4de4-99e0-046c216fd4d1";

describe("@afenda/web declaration-draft Route Handler INTERNAL_ERROR", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.getApiSession.mockResolvedValue(session);
		authMocks.roleSatisfies.mockReturnValue(true);
		declarationMocks.isClientOnboardingComplete.mockResolvedValue(true);
	});

	it("GET maps domain throw to INTERNAL_ERROR with correlationId", async () => {
		declarationMocks.getClientDeclarationDraft.mockRejectedValue(
			new Error("db down"),
		);

		const request = new NextRequest(
			`http://localhost/api/client/declaration-draft?assignmentId=${ASSIGNMENT_ID}`,
		);
		const response = await handleGetClientDeclarationDraft(request);
		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.error.code).toBe("INTERNAL_ERROR");
		expect(body.error.details).toEqual(
			expect.objectContaining({
				correlationId: expect.stringMatching(
					/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
				),
			}),
		);
		expect(logMocks.logProductEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "route.internal_error",
				code: "INTERNAL_ERROR",
				path: "handleGetClientDeclarationDraft",
			}),
		);
	});

	it("PUT maps domain throw to INTERNAL_ERROR with correlationId", async () => {
		declarationMocks.saveClientDeclarationDraft.mockRejectedValue(
			new Error("db down"),
		);

		const request = new NextRequest(
			"http://localhost/api/client/declaration-draft",
			{
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					assignmentId: ASSIGNMENT_ID,
					stepIndex: 0,
					answers: { [ASSIGNMENT_ID]: "yes" },
				}),
			},
		);
		const response = await handleWriteClientDeclarationDraft(request);
		expect(response.status).toBe(500);
		const body = await response.json();
		expect(body.error.code).toBe("INTERNAL_ERROR");
		expect(body.error.details).toEqual(
			expect.objectContaining({
				correlationId: expect.any(String),
			}),
		);
		expect(logMocks.logProductEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				event: "route.internal_error",
				path: "handleWriteClientDeclarationDraft",
			}),
		);
	});
});

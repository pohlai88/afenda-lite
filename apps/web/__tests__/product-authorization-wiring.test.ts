import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
	userId: "user-n11",
	orgId: "org-n11",
	role: "client" as const,
	email: "client@example.com",
};

const authMocks = vi.hoisted(() => ({
	getApiSession: vi.fn(),
	requireRole: vi.fn(),
	roleSatisfies: vi.fn(),
}));

const declarationMocks = vi.hoisted(() => ({
	getClientDeclarationDraft: vi.fn(),
	isClientOnboardingComplete: vi.fn(),
	saveClientDeclarationDraft: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
	redirect: vi.fn((path: string) => {
		throw new Error(`NEXT_REDIRECT:${path}`);
	}),
}));

vi.mock("@afenda/auth", () => ({
	AUTH_FORBIDDEN_PATH: "/403",
	getApiSession: authMocks.getApiSession,
	requireRole: authMocks.requireRole,
	roleSatisfies: authMocks.roleSatisfies,
}));

vi.mock("next/cache", () => ({
	revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: navigationMocks.redirect,
}));

vi.mock("@/modules/identity/domain/has-permission", () => ({
	hasPermission: vi.fn(),
}));

vi.mock("@/modules/declarations/domain/declaration-draft", () => ({
	getClientDeclarationDraft: declarationMocks.getClientDeclarationDraft,
	isClientOnboardingComplete: declarationMocks.isClientOnboardingComplete,
	saveClientDeclarationDraft: declarationMocks.saveClientDeclarationDraft,
}));

import {
	loadDeclarationDraftAction,
	saveDeclarationDraftAction,
} from "../app/actions/declaration-draft";
import { forbidUnlessPermission } from "../app/actions/permission-gate";
import { requirePermission } from "../features/auth/require-permission";
import {
	handleGetClientDeclarationDraft,
	handleWriteClientDeclarationDraft,
} from "../modules/declarations/api/client-declaration-draft-route";
import { hasPermission } from "../modules/identity/domain/has-permission";
import {
	PERMISSION_DENIED_MESSAGE,
	sessionHasPermission,
} from "../modules/identity/domain/session-permission";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const hasPermissionMock = vi.mocked(hasPermission);

function source(relativePath: string): string {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("N11 product authorization wiring", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authMocks.requireRole.mockResolvedValue(session);
		authMocks.getApiSession.mockResolvedValue(session);
		authMocks.roleSatisfies.mockReturnValue(true);
		declarationMocks.isClientOnboardingComplete.mockResolvedValue(true);
	});

	it("binds permission evaluation to the authenticated organization and user", async () => {
		hasPermissionMock.mockResolvedValue(true);

		await expect(
			sessionHasPermission(session, "declarations.read"),
		).resolves.toBe(true);
		expect(hasPermissionMock).toHaveBeenCalledWith({
			orgId: "org-n11",
			userId: "user-n11",
			code: "declarations.read",
			bootstrapRole: "client",
		});
	});

	it("returns the shared FORBIDDEN action shape when a code is unassigned", async () => {
		hasPermissionMock.mockResolvedValue(false);

		await expect(
			forbidUnlessPermission(session, "declarations.manage"),
		).resolves.toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: PERMISSION_DENIED_MESSAGE["declarations.manage"],
		});
	});

	it("allows the shared action gate only when the code is granted", async () => {
		hasPermissionMock.mockResolvedValue(true);
		await expect(
			forbidUnlessPermission(session, "declarations.manage"),
		).resolves.toBeNull();
	});

	it("redirects denied RSC reads through the governed forbidden path", async () => {
		hasPermissionMock.mockResolvedValue(false);

		await expect(requirePermission(session, "fft.access")).rejects.toThrow(
			"NEXT_REDIRECT:/403",
		);
		expect(navigationMocks.redirect).toHaveBeenCalledWith("/403");
	});

	it("denies declaration draft load and save before tenant domain access", async () => {
		hasPermissionMock.mockResolvedValue(false);

		const loadResult = await loadDeclarationDraftAction(
			"09ec6b05-9e7d-4de4-99e0-046c216fd4d1",
		);
		const formData = new FormData();
		formData.set("assignmentId", "09ec6b05-9e7d-4de4-99e0-046c216fd4d1");
		formData.set("surveyId", "bfc535bd-54f4-4607-9a59-279150339e89");
		formData.set("answer", "yes");
		formData.set("stepIndex", "0");
		const saveResult = await saveDeclarationDraftAction(null, formData);

		expect(loadResult).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(saveResult).toMatchObject({ ok: false, code: "FORBIDDEN" });
		expect(declarationMocks.isClientOnboardingComplete).not.toHaveBeenCalled();
		expect(declarationMocks.getClientDeclarationDraft).not.toHaveBeenCalled();
		expect(declarationMocks.saveClientDeclarationDraft).not.toHaveBeenCalled();
		expect(hasPermissionMock).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ code: "declarations.read" }),
		);
		expect(hasPermissionMock).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ code: "declarations.manage" }),
		);
	});

	it("allows declaration draft load and save after permission and onboarding", async () => {
		hasPermissionMock.mockResolvedValue(true);
		declarationMocks.getClientDeclarationDraft.mockResolvedValue({
			assignmentId: "09ec6b05-9e7d-4de4-99e0-046c216fd4d1",
			answers: {},
			stepIndex: 0,
			savedAt: null,
		});
		declarationMocks.saveClientDeclarationDraft.mockResolvedValue({
			savedAt: "2026-07-17T00:00:00.000Z",
		});

		const loadResult = await loadDeclarationDraftAction(
			"09ec6b05-9e7d-4de4-99e0-046c216fd4d1",
		);
		const formData = new FormData();
		formData.set("assignmentId", "09ec6b05-9e7d-4de4-99e0-046c216fd4d1");
		formData.set("surveyId", "bfc535bd-54f4-4607-9a59-279150339e89");
		formData.set("answer", "yes");
		formData.set("stepIndex", "0");
		const saveResult = await saveDeclarationDraftAction(null, formData);

		expect(loadResult.ok).toBe(true);
		expect(saveResult.ok).toBe(true);
		expect(declarationMocks.getClientDeclarationDraft).toHaveBeenCalledWith(
			expect.objectContaining({ orgId: "org-n11" }),
		);
		expect(declarationMocks.saveClientDeclarationDraft).toHaveBeenCalledWith(
			expect.objectContaining({ orgId: "org-n11" }),
		);
	});

	it("returns HTTP 403 for denied declaration draft read and write ports", async () => {
		hasPermissionMock.mockResolvedValue(false);
		const readRequest = new NextRequest(
			"http://localhost/api/client/declaration-draft?assignmentId=09ec6b05-9e7d-4de4-99e0-046c216fd4d1",
		);
		const writeRequest = new NextRequest(
			"http://localhost/api/client/declaration-draft",
			{ method: "PUT", body: "{}" },
		);

		const readResponse = await handleGetClientDeclarationDraft(readRequest);
		const writeResponse = await handleWriteClientDeclarationDraft(writeRequest);

		expect(readResponse.status).toBe(403);
		expect(writeResponse.status).toBe(403);
		expect(hasPermissionMock).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ code: "declarations.read" }),
		);
		expect(hasPermissionMock).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ code: "declarations.manage" }),
		);
		expect(declarationMocks.isClientOnboardingComplete).not.toHaveBeenCalled();
	});

	it("pins every living product port to its ARCH-023 v1 code", () => {
		const expectedCodesByPort = {
			"app/actions/assign-org-role.ts": ["org.roles.manage"],
			"app/actions/revoke-org-role.ts": ["org.roles.manage"],
			"app/actions/invite-org-member.ts": ["clients.invite"],
			"app/actions/declaration-draft.ts": [
				"declarations.read",
				"declarations.manage",
			],
			"features/org-admin/org-admin-shell.tsx": [
				"org.roles.manage",
				"clients.invite",
			],
			"features/fft/fft-events-shell.tsx": ["fft.access"],
			"features/declarations/declarations-shell.tsx": [
				"declarations.read",
				"declarations.manage",
			],
			"modules/declarations/api/client-declaration-draft-route.ts": [
				"declarations.read",
				"declarations.manage",
			],
		} as const;

		for (const [relativePath, codes] of Object.entries(expectedCodesByPort)) {
			const portSource = source(relativePath);
			for (const code of codes) {
				expect(portSource, `${relativePath} must enforce ${code}`).toContain(
					code,
				);
			}
		}
	});

	it("keeps RSC denial and existing mutations on the shared gates", () => {
		expect(source("features/fft/fft-events-shell.tsx")).toContain(
			"requirePermission",
		);
		expect(source("features/declarations/declarations-shell.tsx")).toContain(
			"forbidPermissionAccess",
		);
		expect(source("features/org-admin/org-admin-shell.tsx")).toContain(
			"forbidPermissionAccess",
		);
		for (const relativePath of [
			"app/actions/assign-org-role.ts",
			"app/actions/revoke-org-role.ts",
			"app/actions/invite-org-member.ts",
			"app/actions/declaration-draft.ts",
		]) {
			expect(source(relativePath)).toContain("forbidUnlessPermission");
		}
	});
});

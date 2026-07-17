/**
 * N18 — FFT Phase-2A permitted vertical (freeze read shell).
 * Platform `fft.access` entry + hard-org `listEvents`; no 2B–2D.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

const session = {
	userId: "user-n18",
	orgId: "org-n18",
	role: "operator" as const,
	email: "operator@example.com",
};

const navigationMocks = vi.hoisted(() => ({
	redirect: vi.fn((redirectPath: string) => {
		throw new Error(`NEXT_REDIRECT:${redirectPath}`);
	}),
}));

vi.mock("@afenda/auth", () => ({
	AUTH_FORBIDDEN_PATH: "/403",
}));

vi.mock("next/navigation", () => ({
	redirect: navigationMocks.redirect,
}));

vi.mock("@/modules/identity/domain/has-permission", () => ({
	hasPermission: vi.fn(),
}));

import { requireFftAccess } from "../modules/fft/auth/require-fft-access";
import { listEvents } from "../modules/fft/domain/list-events";
import { hasPermission } from "../modules/identity/domain/has-permission";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const hasPermissionMock = vi.mocked(hasPermission);

function source(relativePath: string): string {
	return readFileSync(path.join(webRoot, relativePath), "utf8");
}

describe("N18 FFT permitted vertical (Phase 2A freeze)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("requireFftAccess denies without fft.access via AUTH_FORBIDDEN_PATH", async () => {
		hasPermissionMock.mockResolvedValue(false);

		await expect(requireFftAccess(session)).rejects.toThrow("NEXT_REDIRECT:/403");
		expect(navigationMocks.redirect).toHaveBeenCalledWith("/403");
		expect(hasPermissionMock).toHaveBeenCalledWith(
			expect.objectContaining({
				orgId: session.orgId,
				userId: session.userId,
				code: "fft.access",
			}),
		);
	});

	it("requireFftAccess allows when fft.access is granted", async () => {
		hasPermissionMock.mockResolvedValue(true);

		await expect(requireFftAccess(session)).resolves.toBeUndefined();
		expect(navigationMocks.redirect).not.toHaveBeenCalled();
	});

	it("listEvents rejects empty orgId via withOrg fail-closed", async () => {
		await expect(listEvents("")).rejects.toThrow(/non-empty orgId/);
	});

	it("wires layout + shell to requireFftAccess and keeps features SQL-free", () => {
		expect(existsSync(path.join(webRoot, "app/(operator)/fft/layout.tsx"))).toBe(
			true,
		);
		expect(source("app/(operator)/fft/layout.tsx")).toContain("requireFftAccess");
		expect(source("features/fft/fft-events-shell.tsx")).toContain(
			"requireFftAccess",
		);
		expect(source("features/fft/fft-events-shell.tsx")).toContain("listEvents");
		expect(source("features/fft/fft-events-shell.tsx")).not.toMatch(
			/(?:from|import)\s*['"]@afenda\/db/,
		);
		expect(source("modules/fft/auth/require-fft-access.ts")).toContain(
			'"fft.access"',
		);
		expect(source("modules/fft/domain/list-events.ts")).toContain("withOrg");
	});

	it("keeps cross-org FFT listEvents isolation in the tenancy suite", () => {
		const tenancy = source("__tests__/tenancy-isolation.test.ts");
		expect(tenancy).toContain("FFT listEvents");
		expect(tenancy).toContain("listEvents(orgB)");
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const headersMock = vi.fn();

vi.mock("next/headers", () => ({
	headers: () => headersMock(),
}));

vi.mock("@afenda/env", () => ({
	env: {
		APP_URL: "https://afenda-lite.vercel.app",
	},
}));

describe("resolveAuthUiOrigin", () => {
	beforeEach(() => {
		vi.resetModules();
		headersMock.mockReset();
	});

	it("prefers the live request host over APP_URL", async () => {
		headersMock.mockResolvedValue({
			get: (name: string) => {
				if (name === "x-forwarded-host") {
					return "localhost:3000";
				}
				if (name === "x-forwarded-proto") {
					return "http";
				}
				return null;
			},
		});

		const { resolveAuthUiOrigin } = await import("./auth-ui-origin");
		await expect(resolveAuthUiOrigin()).resolves.toBe("http://localhost:3000");
	});

	it("falls back to APP_URL when host headers are absent", async () => {
		headersMock.mockResolvedValue({
			get: () => null,
		});

		const { resolveAuthUiOrigin } = await import("./auth-ui-origin");
		await expect(resolveAuthUiOrigin()).resolves.toBe(
			"https://afenda-lite.vercel.app",
		);
	});
});

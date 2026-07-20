import { afterEach, describe, expect, it, vi } from "vitest";

const envMocks = vi.hoisted(() => ({
	isVercelRuntimeNow: vi.fn(() => false),
	env: {
		SHARED_ADMIN_EMAIL: undefined as string | undefined,
		SHARED_ADMIN_PASSWORD: undefined as string | undefined,
		PREVIEW_CLIENT_EMAIL: undefined as string | undefined,
		PREVIEW_CLIENT_PASSWORD: undefined as string | undefined,
	},
}));

vi.mock("@afenda/env", () => ({
	env: envMocks.env,
	isVercelRuntimeNow: () => envMocks.isVercelRuntimeNow(),
}));

describe("local-dev-login runtime gate", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
		envMocks.isVercelRuntimeNow.mockReturnValue(false);
		envMocks.env.SHARED_ADMIN_EMAIL = undefined;
		envMocks.env.SHARED_ADMIN_PASSWORD = undefined;
		envMocks.env.PREVIEW_CLIENT_EMAIL = undefined;
		envMocks.env.PREVIEW_CLIENT_PASSWORD = undefined;
		vi.resetModules();
	});

	it("is closed outside development", async () => {
		vi.stubEnv("NODE_ENV", "production");
		const { isLocalDevLoginRuntime, hasAnyLocalDevLogin } = await import(
			"../lib/local-dev-login"
		);
		expect(isLocalDevLoginRuntime()).toBe(false);
		expect(hasAnyLocalDevLogin()).toBe(false);
	});

	it("is closed on Vercel even in development", async () => {
		vi.stubEnv("NODE_ENV", "development");
		envMocks.isVercelRuntimeNow.mockReturnValue(true);
		envMocks.env.SHARED_ADMIN_EMAIL = "ops@example.com";
		envMocks.env.SHARED_ADMIN_PASSWORD = "secret";
		const { isLocalDevLoginRuntime, hasAnyLocalDevLogin } = await import(
			"../lib/local-dev-login"
		);
		expect(isLocalDevLoginRuntime()).toBe(false);
		expect(hasAnyLocalDevLogin()).toBe(false);
	});

	it("reports operator/client when local fixtures are set", async () => {
		vi.stubEnv("NODE_ENV", "development");
		envMocks.env.SHARED_ADMIN_EMAIL = "ops@example.com";
		envMocks.env.SHARED_ADMIN_PASSWORD = "secret";
		envMocks.env.PREVIEW_CLIENT_EMAIL = "client@example.com";
		envMocks.env.PREVIEW_CLIENT_PASSWORD = "secret";
		const { getLocalDevLoginAvailability, hasAnyLocalDevLogin } = await import(
			"../lib/local-dev-login"
		);
		expect(getLocalDevLoginAvailability()).toEqual({
			operator: true,
			client: true,
		});
		expect(hasAnyLocalDevLogin()).toBe(true);
	});
});

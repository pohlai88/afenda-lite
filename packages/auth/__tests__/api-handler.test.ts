import { beforeEach, describe, expect, it, vi } from "vitest";

const getHandlerMock = vi.fn();
const handlerGet = vi.fn();
const handlerPost = vi.fn();

vi.mock("@neondatabase/auth/next/server", () => ({
	createNeonAuth: () => ({
		getSession: vi.fn(),
		handler: () => getHandlerMock(),
		organization: {
			getActiveMemberRole: vi.fn(),
		},
		middleware: vi.fn(),
	}),
}));

vi.mock("@afenda/env", () => ({
	env: {
		NEON_AUTH_BASE_URL: "https://auth.example.test",
		NEON_AUTH_COOKIE_SECRET: "x".repeat(32),
		DATABASE_URL: "postgresql://u:p@ep-x-pooler.example/db?sslmode=require",
		APP_URL: "https://afenda-lite.vercel.app",
	},
}));

describe("createAuthApiHandlers (N5 BFF)", () => {
	beforeEach(() => {
		vi.resetModules();
		getHandlerMock.mockReset();
		handlerGet.mockReset();
		handlerPost.mockReset();
		getHandlerMock.mockReturnValue({
			GET: handlerGet,
			POST: handlerPost,
		});
	});

	it("returns GET and POST from getNeonAuth().handler()", async () => {
		const { createAuthApiHandlers } = await import("../src/api-handler");
		const handlers = createAuthApiHandlers();
		expect(getHandlerMock).toHaveBeenCalledTimes(1);
		expect(handlers.GET).toBe(handlerGet);
		expect(handlers.POST).toBe(handlerPost);
	});
});

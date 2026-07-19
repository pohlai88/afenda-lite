import { beforeEach, describe, expect, it, vi } from "vitest";

const rateLimitMocks = vi.hoisted(() => ({
	checkRateLimit: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
	signInWithEmail: vi.fn(),
	signOutSession: vi.fn(),
	sanitizeCallbackUrl: vi.fn((value: string) => value),
}));

const logMocks = vi.hoisted(() => ({
	logProductEvent: vi.fn(),
}));

vi.mock("@afenda/rate-limit", async () => {
	const actual =
		await vi.importActual<typeof import("@afenda/rate-limit")>(
			"@afenda/rate-limit",
		);
	return {
		...actual,
		checkRateLimit: rateLimitMocks.checkRateLimit,
	};
});

vi.mock("@afenda/auth", () => ({
	AUTH_LOGIN_PATH: "/auth/login",
	POST_LOGIN_CALLBACK_PARAM: "callbackUrl",
	sanitizeCallbackUrl: authMocks.sanitizeCallbackUrl,
	signInWithEmail: authMocks.signInWithEmail,
	signOutSession: authMocks.signOutSession,
}));

vi.mock("@/modules/platform/observability/product-log", () => ({
	logProductEvent: logMocks.logProductEvent,
}));

vi.mock("@/modules/platform/domain/request-attribution", () => ({
	readRequestAttribution: vi.fn(async () => ({
		ipAddress: "203.0.113.50",
		userAgent: "vitest",
	})),
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn(() => {
		throw new Error("NEXT_REDIRECT");
	}),
}));

import { signInAction } from "../app/actions/auth-credentials";

describe("signInAction rate limit", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		rateLimitMocks.checkRateLimit.mockResolvedValue({ ok: true });
	});

	it("returns ActionResult RATE_LIMITED with retryAfter and logs correlation", async () => {
		rateLimitMocks.checkRateLimit.mockResolvedValue({
			ok: false,
			reason: "rate_limited",
			retryAfterSeconds: 17,
		});

		const formData = new FormData();
		formData.set("email", "client@example.com");
		formData.set("password", "correct-horse-battery");

		const result = await signInAction(null, formData);

		expect(rateLimitMocks.checkRateLimit).toHaveBeenCalledWith({
			bucket: "auth_sign_in",
			key: "203.0.113.50:client@example.com",
		});
		expect(authMocks.signInWithEmail).not.toHaveBeenCalled();
		expect(result).toEqual({
			ok: false,
			code: "RATE_LIMITED",
			message: "Too many requests. Try again later.",
			details: { retryAfter: 17 },
		});
		expect(logMocks.logProductEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				level: "warn",
				event: "auth_sign_in.rate_limited",
				code: "RATE_LIMITED",
				path: "/auth/login",
				correlationId: expect.stringMatching(
					/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
				),
			}),
		);
	});

	it("rate-limits before schema validation (malformed email still consumes budget)", async () => {
		rateLimitMocks.checkRateLimit.mockResolvedValue({
			ok: false,
			reason: "rate_limited",
			retryAfterSeconds: 12,
		});

		const formData = new FormData();
		formData.set("email", "not-an-email");
		formData.set("password", "x");

		const result = await signInAction(null, formData);

		expect(rateLimitMocks.checkRateLimit).toHaveBeenCalledWith({
			bucket: "auth_sign_in",
			key: "203.0.113.50:not-an-email",
		});
		expect(result).toEqual({
			ok: false,
			code: "RATE_LIMITED",
			message: "Too many requests. Try again later.",
			details: { retryAfter: 12 },
		});
	});

	it("uses _invalid sentinel when email is missing", async () => {
		rateLimitMocks.checkRateLimit.mockResolvedValue({ ok: true });

		const formData = new FormData();
		formData.set("password", "x");

		await signInAction(null, formData);

		expect(rateLimitMocks.checkRateLimit).toHaveBeenCalledWith({
			bucket: "auth_sign_in",
			key: "203.0.113.50:_invalid",
		});
	});
});

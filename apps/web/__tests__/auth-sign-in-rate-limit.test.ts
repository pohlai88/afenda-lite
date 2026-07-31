import { rateLimitTesting } from "@afenda/rate-limit/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rateLimitMocks = vi.hoisted(() => ({
	check: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
	signInWithEmail: vi.fn(),
	signOutSession: vi.fn(),
	sanitizeCallbackUrl: vi.fn((value: string) => value),
}));

const logMocks = vi.hoisted(() => ({
	event: vi.fn(),
}));

vi.mock("@afenda/rate-limit", async () => {
	const actual =
		await vi.importActual<typeof import("@afenda/rate-limit")>(
			"@afenda/rate-limit",
		);
	return {
		...actual,
		rateLimit: { ...actual.rateLimit, check: rateLimitMocks.check },
	};
});

vi.mock("@afenda/auth", () => ({
	authServer: {
		paths: {
			login: "/auth/login",
			postLogin: {
				callbackParameter: "callbackUrl",
				sanitizeCallback: authMocks.sanitizeCallbackUrl,
			},
		},
		credentials: {
			signInWithEmail: authMocks.signInWithEmail,
			signOut: authMocks.signOutSession,
		},
	},
}));

vi.mock("@afenda/logger", () => ({
	logger: { event: logMocks.event },
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
		rateLimitMocks.check.mockResolvedValue(
			rateLimitTesting.decision.allowed({
				limit: 5,
				remaining: 4,
				resetEpochMs: Date.now() + 60_000,
			}),
		);
	});

	it("returns ActionResult RATE_LIMITED with retryAfter and logs correlation", async () => {
		rateLimitMocks.check.mockResolvedValue(
			rateLimitTesting.decision.rateLimited({
				retryAfterSeconds: 17,
				quota: { limit: 5, remaining: 0, resetEpochMs: Date.now() + 17_000 },
			}),
		);

		const formData = new FormData();
		formData.set("email", "client@example.com");
		formData.set("password", "correct-horse-battery");

		const result = await signInAction(null, formData);

		expect(rateLimitMocks.check).toHaveBeenCalledWith({
			bucket: "auth_sign_in",
			identity: {
				kind: "credentials",
				ipAddress: "203.0.113.50",
				email: "client@example.com",
			},
		});
		expect(authMocks.signInWithEmail).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			ok: false,
			code: "RATE_LIMITED",
			details: { retryAfterSeconds: 17 },
		});
		expect(logMocks.event).toHaveBeenCalledWith(
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
		rateLimitMocks.check.mockResolvedValue(
			rateLimitTesting.decision.rateLimited({
				retryAfterSeconds: 12,
				quota: { limit: 5, remaining: 0, resetEpochMs: Date.now() + 12_000 },
			}),
		);

		const formData = new FormData();
		formData.set("email", "not-an-email");
		formData.set("password", "x");

		const result = await signInAction(null, formData);

		expect(rateLimitMocks.check).toHaveBeenCalledWith({
			bucket: "auth_sign_in",
			identity: {
				kind: "credentials",
				ipAddress: "203.0.113.50",
				email: "not-an-email",
			},
		});
		expect(result).toMatchObject({
			ok: false,
			code: "RATE_LIMITED",
			details: { retryAfterSeconds: 12 },
		});
	});

	it("uses _invalid sentinel when email is missing", async () => {
		rateLimitMocks.check.mockResolvedValue(
			rateLimitTesting.decision.allowed({
				limit: 5,
				remaining: 4,
				resetEpochMs: Date.now() + 60_000,
			}),
		);

		const formData = new FormData();
		formData.set("password", "x");

		await signInAction(null, formData);

		expect(rateLimitMocks.check).toHaveBeenCalledWith({
			bucket: "auth_sign_in",
			identity: {
				kind: "credentials",
				ipAddress: "203.0.113.50",
				email: undefined,
			},
		});
	});
});

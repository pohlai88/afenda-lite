import { describe, expect, it } from "vitest";

import {
	authPlainTextFailure,
	failFromInviteHttpStatus,
	failFromNeonOrgProbe,
} from "../src/auth-failure";

describe("auth-failure taxonomy", () => {
	it("classifies Neon org probes without leaking probe text", () => {
		expect(failFromNeonOrgProbe({ message: "slug taken" }, "fallback")).toEqual(
			{
				code: "CONFLICT",
				message: "Organization already exists",
				ok: false,
			},
		);
		expect(failFromNeonOrgProbe({ message: "not owner" }, "fallback")).toEqual({
			code: "FORBIDDEN",
			message: "Not authorized for this organization action",
			ok: false,
		});
		expect(failFromNeonOrgProbe({ message: "boom" }, "safe fallback")).toEqual({
			code: "INTERNAL_ERROR",
			message: "safe fallback",
			ok: false,
		});
	});

	it("fails closed when Neon probe getters throw", () => {
		const hostile = Object.defineProperty({}, "message", {
			get() {
				throw new Error("unsafe message getter");
			},
		});

		expect(() => failFromNeonOrgProbe(hostile, "safe fallback")).not.toThrow();
		expect(failFromNeonOrgProbe(hostile, "safe fallback")).toEqual({
			code: "INTERNAL_ERROR",
			message: "safe fallback",
			ok: false,
		});
	});

	it("maps invite HTTP status to closed codes", () => {
		expect(failFromInviteHttpStatus(403)).toEqual({
			code: "FORBIDDEN",
			message: "Invitation is not permitted for this session",
			ok: false,
		});
		expect(failFromInviteHttpStatus(503).code).toBe("SERVICE_UNAVAILABLE");
		expect(failFromInviteHttpStatus(418).code).toBe("INTERNAL_ERROR");
	});

	it("authPlainTextFailure uses ErrorCode HTTP status map", () => {
		const response = authPlainTextFailure("FORBIDDEN", "no org");
		expect(response.status).toBe(403);
	});
});

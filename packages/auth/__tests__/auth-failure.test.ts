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
				ok: false,
				code: "CONFLICT",
				message: "Organization already exists",
			},
		);
		expect(
			failFromNeonOrgProbe({ message: "not owner" }, "fallback"),
		).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Not authorized for this organization action",
		});
		expect(failFromNeonOrgProbe({ message: "boom" }, "safe fallback")).toEqual(
			{
				ok: false,
				code: "INTERNAL_ERROR",
				message: "safe fallback",
			},
		);
	});

	it("maps invite HTTP status to closed codes", () => {
		expect(failFromInviteHttpStatus(403)).toEqual({
			ok: false,
			code: "FORBIDDEN",
			message: "Invitation is not permitted for this session",
		});
		expect(failFromInviteHttpStatus(503).code).toBe("SERVICE_UNAVAILABLE");
		expect(failFromInviteHttpStatus(418).code).toBe("INTERNAL_ERROR");
	});

	it("authPlainTextFailure uses ErrorCode HTTP status map", () => {
		const response = authPlainTextFailure("FORBIDDEN", "no org");
		expect(response.status).toBe(403);
	});
});

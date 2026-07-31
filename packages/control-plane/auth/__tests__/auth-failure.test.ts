import { errorResult } from "@afenda/errors";
import { describe, expect, it } from "vitest";

import {
	authPlainTextFailure,
	failFromInviteHttpStatus,
	failFromNeonOrgProbe,
} from "../src/auth-failure";

describe("auth-failure taxonomy", () => {
	it("classifies Neon org probes without leaking probe text", () => {
		expect(failFromNeonOrgProbe({ message: "slug taken" }, "fallback")).toEqual(
			errorResult.fail("CONFLICT", {
				publicMessage: "Organization already exists",
			}),
		);
		expect(failFromNeonOrgProbe({ message: "not owner" }, "fallback")).toEqual(
			errorResult.fail("FORBIDDEN"),
		);
		expect(failFromNeonOrgProbe({ message: "boom" }, "safe fallback")).toEqual(
			errorResult.fail("INTERNAL_ERROR"),
		);
	});

	it("fails closed when Neon probe getters throw", () => {
		const hostile = Object.defineProperty({}, "message", {
			get() {
				throw new Error("unsafe message getter");
			},
		});

		expect(() => failFromNeonOrgProbe(hostile, "safe fallback")).not.toThrow();
		expect(failFromNeonOrgProbe(hostile, "safe fallback")).toEqual(
			errorResult.fail("INTERNAL_ERROR"),
		);
	});

	it("maps invite HTTP status to closed codes", () => {
		expect(failFromInviteHttpStatus(403)).toEqual(
			errorResult.fail("FORBIDDEN"),
		);
		expect(failFromInviteHttpStatus(503).code).toBe("SERVICE_UNAVAILABLE");
		expect(failFromInviteHttpStatus(418).code).toBe("INTERNAL_ERROR");
	});

	it("authPlainTextFailure uses ErrorCode HTTP status map", () => {
		const response = authPlainTextFailure(errorResult.fail("FORBIDDEN"));
		expect(response.status).toBe(403);
	});
});

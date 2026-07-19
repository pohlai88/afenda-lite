import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
	type ActionResult,
	actionFail,
	actionFieldMessage,
	actionOk,
} from "../modules/platform/schemas/action-result";
import {
	API_ERROR_HTTP_STATUS,
	apiData,
	apiErrorBody,
	apiErrorBodySchema,
	asApiErrorCode,
	healthJson,
	isApiErrorCode,
} from "../modules/platform/schemas/api-error";
import { signInSchema } from "../modules/identity/schemas/auth";
import { emailSchema, parseSchema } from "../modules/platform/schemas/common";

describe("ActionResult + error brands (I2.1)", () => {
	it("discriminates success and failure via ok", () => {
		const ok = actionOk({ email: "a@b.co" });
		const fail = actionFail("FORBIDDEN", "Not allowed.");

		expect(ok.ok).toBe(true);
		expect(fail.ok).toBe(false);
		expect(ok.data.email).toBe("a@b.co");
		expect(fail.code).toBe("FORBIDDEN");
	});

	it("keeps ActionResult serializable for Server Actions", () => {
		const result: ActionResult<{ id: string }> = actionFail(
			"VALIDATION_ERROR",
			"Invalid input.",
			{ fieldErrors: { email: ["Required"] } },
		);

		expect(JSON.parse(JSON.stringify(result))).toEqual(result);
	});

	it("reads the first field error from ActionResult details", () => {
		const fail = actionFail("VALIDATION_ERROR", "Invalid input.", {
			fieldErrors: { email: ["Required", "Too short"], role: ["Invalid"] },
		});
		expect(actionFieldMessage(fail, "email")).toBe("Required");
		expect(actionFieldMessage(fail, "role")).toBe("Invalid");
		expect(actionFieldMessage(fail, "missing")).toBeUndefined();
		expect(actionFieldMessage(null, "email")).toBeUndefined();
		expect(actionFieldMessage(actionOk({ id: "1" }), "email")).toBeUndefined();
	});

	it("maps shared ApiErrorCode brands to HTTP status", () => {
		expect(API_ERROR_HTTP_STATUS.UNAUTHORIZED).toBe(401);
		expect(API_ERROR_HTTP_STATUS.VALIDATION_ERROR).toBe(422);
		expect(isApiErrorCode("NOT_FOUND")).toBe(true);
		expect(isApiErrorCode("TEAPOT")).toBe(false);
		expect(asApiErrorCode("CONFLICT")).toBe("CONFLICT");
	});

	it("builds bare APIErrorBody and { data } success envelopes", () => {
		const body = apiErrorBody("BAD_REQUEST", "Malformed JSON.");
		expect(apiErrorBodySchema.parse(body)).toEqual(body);
		expect(apiData({ status: "alive" })).toEqual({
			data: { status: "alive" },
		});
		expect(healthJson({ status: "alive" })).toEqual({
			data: { status: "alive" },
		});
	});

	it("parseSchema returns validation details without throwing", () => {
		const schema = z.object({ email: emailSchema });
		const failed = parseSchema(schema, { email: "not-an-email" });
		expect(failed.success).toBe(false);
		if (!failed.success) {
			expect(failed.error).toBe("Invalid input.");
			expect(failed.details.fieldErrors.email?.length).toBeGreaterThan(0);
		}

		const ok = parseSchema(schema, { email: "  Client@Example.COM " });
		expect(ok).toEqual({
			success: true,
			data: { email: "client@example.com" },
		});
	});

	it("parseSchema accepts Path A signInSchema at the Action boundary", () => {
		const failed = parseSchema(signInSchema, {
			email: "bad",
			password: "",
		});
		expect(failed.success).toBe(false);

		const ok = parseSchema(signInSchema, {
			email: "  Operator@Example.COM ",
			password: "secret",
			callback: "/admin",
		});
		expect(ok).toEqual({
			success: true,
			data: {
				email: "operator@example.com",
				password: "secret",
				callback: "/admin",
			},
		});
	});
});

import {
	type Result as ActionResult,
	errorProject,
	errorResult,
} from "@afenda/errors";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { signInSchema } from "../modules/identity/schemas/auth";
import { actionFieldMessage } from "../modules/platform/schemas/action-result";
import {
	apiData,
	apiErrorBodySchema,
	apiErrorCodeSchema,
	healthJson,
} from "../modules/platform/schemas/api-error";
import { emailSchema, parseSchema } from "../modules/platform/schemas/common";

describe("ActionResult + shared error codes (I2.1)", () => {
	it("discriminates success and failure via ok", () => {
		const ok = errorResult.ok({ email: "a@b.co" });
		const fail = errorResult.fail("FORBIDDEN");

		expect(ok.ok).toBe(true);
		expect(fail.ok).toBe(false);
		expect(ok.data.email).toBe("a@b.co");
		expect(fail.code).toBe("FORBIDDEN");
	});

	it("keeps ActionResult serializable for Server Actions", () => {
		const result: ActionResult<{ id: string }> = errorResult.fail(
			"VALIDATION_ERROR",
			{ publicMessage: "Invalid input." },
		);

		expect(JSON.parse(JSON.stringify(result))).toEqual(result);
	});

	it("reads the first field error from ActionResult details", () => {
		const fail = errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Invalid input.",
			fieldErrors: {
				email: ["Required"],
				role: ["Invalid"],
			},
		});
		expect(actionFieldMessage(fail, "email")).toBe("Required");
		expect(actionFieldMessage(fail, "role")).toBe("Invalid");
		expect(actionFieldMessage(fail, "missing")).toBeUndefined();
		expect(actionFieldMessage(null, "email")).toBeUndefined();
		expect(
			actionFieldMessage(errorResult.ok({ id: "1" }), "email"),
		).toBeUndefined();
	});

	it("derives shared HTTP status through the canonical projector", () => {
		expect(errorProject.http(errorResult.fail("UNAUTHORIZED")).status).toBe(
			401,
		);
		expect(
			errorProject.http(
				errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Invalid input.",
				}),
			).status,
		).toBe(422);
		expect(errorProject.http(errorResult.fail("RATE_LIMITED")).status).toBe(
			429,
		);
		expect(
			errorProject.http(errorResult.fail("SERVICE_UNAVAILABLE")).status,
		).toBe(503);
		expect(apiErrorCodeSchema.safeParse("NOT_FOUND").success).toBe(true);
		expect(apiErrorCodeSchema.safeParse("TEAPOT").success).toBe(false);
	});

	it("builds bare APIErrorBody and { data } success envelopes", () => {
		const { body } = errorProject.http(
			errorResult.fail("BAD_REQUEST", {
				publicMessage: "Malformed JSON.",
			}),
		);
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

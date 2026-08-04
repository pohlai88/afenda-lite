import {
	CORPORATE_ADMINISTRATION_MODULE_ID,
	canonicalDecimalSchema,
	normalizedCodeSchema,
	organizationIdSchema,
	parseCorporateAdministrationInput,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("Corporate Administration safe input parsing", () => {
	const inputSchema = z
		.object({
			organizationId: organizationIdSchema,
			code: z.string().trim().toUpperCase().pipe(normalizedCodeSchema),
			amount: z.string().default("0").pipe(canonicalDecimalSchema),
		})
		.strict();
	it("preserves schema transforms, defaults, and brands", () => {
		const result = parseCorporateAdministrationInput(inputSchema, {
			organizationId: " org_1 ",
			code: " ca-01 ",
		});
		expect(result).toEqual({
			ok: true,
			data: {
				organizationId: "org_1",
				code: "CA-01",
				amount: "0",
			},
		});
	});
	it("omits undefined object fields from parsed optional command input", () => {
		const optionalSchema = z
			.object({
				required: z.string(),
				optional: z.string().optional(),
				nested: z.object({
					present: z.string(),
					absent: z.string().optional(),
				}),
				lines: z.array(
					z.object({
						code: z.string(),
						note: z.string().optional(),
					}),
				),
			})
			.strict();
		const result = parseCorporateAdministrationInput(optionalSchema, {
			required: "kept",
			optional: undefined,
			nested: {
				present: "kept",
				absent: undefined,
			},
			lines: [
				{
					code: "line-1",
					note: undefined,
				},
			],
		});
		expect(result).toEqual({
			ok: true,
			data: {
				required: "kept",
				nested: { present: "kept" },
				lines: [{ code: "line-1" }],
			},
		});
	});
	it("returns governed validation failures without submitted values or Zod details", () => {
		const submittedSecret = "raw secret value";
		const result = parseCorporateAdministrationInput(inputSchema, {
			organizationId: "org_1",
			code: submittedSecret,
			unexpected: submittedSecret,
		});
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.code).toBe("VALIDATION_ERROR");
		expect(JSON.stringify(result)).not.toContain(submittedSecret);
		expect(JSON.stringify(result)).not.toContain("issues");
	});
	it("normalizes array paths and omits malformed field paths", () => {
		const nestedSchema = z.object({
			officers: z.array(z.object({ partyId: organizationIdSchema })),
		});
		const nested = parseCorporateAdministrationInput(nestedSchema, {
			officers: [{ partyId: "" }],
		});
		expect(nested).toMatchObject({
			ok: false,
		});
		const malformedPathSchema = z.string().superRefine((_value, context) => {
			context.addIssue({
				code: "custom",
				message: "invalid",
				path: ["unsafe field"],
			});
		});
		const malformed = parseCorporateAdministrationInput(
			malformedPathSchema,
			"value",
		);
		expect(malformed).toEqual({
			ok: false,
			code: "VALIDATION_ERROR",
			message: "Corporate Administration input is invalid",
			messageKey: "errors.validationError",
		});
	});
	it("does not throw for ordinary invalid input but propagates unexpected transform failures", () => {
		expect(() =>
			parseCorporateAdministrationInput(inputSchema, {
				organizationId: null,
				code: 42,
			}),
		).not.toThrow();
		const transformFailure = new Error(
			`${CORPORATE_ADMINISTRATION_MODULE_ID} transform failed`,
		);
		const throwingSchema = z.string().transform(() => {
			throw transformFailure;
		});
		expect(() =>
			parseCorporateAdministrationInput(throwingSchema, "value"),
		).toThrow(transformFailure);
	});
});

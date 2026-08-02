import {
	type CorporateAdministrationCommandId,
	createCorporateAdministrationCommandFingerprint,
	decimalInputSchema,
	normalizedCodeSchema,
	organizationIdSchema,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("Corporate Administration command identity", () => {
	const commandSchema = z
		.object({
			code: z.string().trim().toUpperCase().pipe(normalizedCodeSchema),
			amount: decimalInputSchema,
			lines: z.array(z.number().int()),
			nested: z.object({ left: z.number(), right: z.number() }),
		})
		.strict();
	function fingerprint(
		input: unknown,
		organizationId = "org_1",
		operationId: CorporateAdministrationCommandId = "registerLegalCompanyDraft",
	) {
		const result = createCorporateAdministrationCommandFingerprint({
			schema: commandSchema,
			organizationId: organizationIdSchema.parse(organizationId),
			operationId,
			input,
		});
		if (!result.ok) {
			throw new Error("expected valid test command input");
		}
		return result.data;
	}
	it("binds normalized organization, command identity, and parsed input", () => {
		const first = fingerprint({
			code: " ca-01 ",
			amount: "10.50",
			lines: [1, 2],
			nested: { left: 1, right: 2 },
		});
		const reordered = fingerprint({
			nested: { right: 2, left: 1 },
			lines: [1, 2],
			amount: "10.50",
			code: "CA-01",
		});
		expect(first.fingerprint).toBe(reordered.fingerprint);
		expect(first.envelope).toEqual({
			namespace: "corporate-administration",
			organizationId: "org_1",
			commandId: "corporate-administration.legal-company.register-draft",
			input: {
				code: "CA-01",
				amount: "10.5",
				lines: [1, 2],
				nested: { left: 1, right: 2 },
			},
		});
	});
	it("changes for array order, organization, or command identity", () => {
		const base = {
			code: "CA-01",
			amount: "10.50",
			lines: [1, 2],
			nested: { left: 1, right: 2 },
		};
		expect(fingerprint(base).fingerprint).not.toBe(
			fingerprint({ ...base, lines: [2, 1] }).fingerprint,
		);
		expect(fingerprint(base).fingerprint).not.toBe(
			fingerprint(base, "org_2").fingerprint,
		);
		expect(fingerprint(base).fingerprint).not.toBe(
			fingerprint(base, "org_1", "updateLegalCompanyProfile").fingerprint,
		);
	});
	it("excludes delivery metadata from the fingerprint envelope", () => {
		const result = fingerprint({
			code: "CA-01",
			amount: "10.50",
			lines: [],
			nested: { left: 1, right: 2 },
		});
		expect(Object.keys(result.envelope).sort()).toEqual([
			"commandId",
			"input",
			"namespace",
			"organizationId",
		]);
		expect(JSON.stringify(result.envelope)).not.toMatch(
			/correlation|causation|request|actor|authorization|clock/i,
		);
	});
	it("fingerprints optional object fields by omission instead of undefined", () => {
		const optionalSchema = z
			.object({
				code: z.string().trim().toUpperCase().pipe(normalizedCodeSchema),
				reason: z.string().optional(),
				nested: z.object({
					label: z.string(),
					note: z.string().optional(),
				}),
			})
			.strict();
		const omitted = createCorporateAdministrationCommandFingerprint({
			schema: optionalSchema,
			organizationId: organizationIdSchema.parse("org_1"),
			operationId: "registerLegalCompanyDraft",
			input: {
				code: "ca-01",
				nested: { label: "kept" },
			},
		});
		const explicitUndefined = createCorporateAdministrationCommandFingerprint({
			schema: optionalSchema,
			organizationId: organizationIdSchema.parse("org_1"),
			operationId: "registerLegalCompanyDraft",
			input: {
				code: "ca-01",
				reason: undefined,
				nested: { label: "kept", note: undefined },
			},
		});
		expect(omitted.ok).toBe(true);
		expect(explicitUndefined.ok).toBe(true);
		if (!(omitted.ok && explicitUndefined.ok)) {
			return;
		}
		expect(explicitUndefined.data.envelope.input).toEqual({
			code: "CA-01",
			nested: { label: "kept" },
		});
		expect(explicitUndefined.data.fingerprint).toBe(omitted.data.fingerprint);
	});
	it("returns validation failures before fingerprinting and never throws on non-canonical output", () => {
		const invalid = createCorporateAdministrationCommandFingerprint({
			schema: commandSchema,
			organizationId: organizationIdSchema.parse("org_1"),
			operationId: "registerLegalCompanyDraft",
			input: { raw: "unparsed" },
		});
		expect(invalid).toMatchObject({
			ok: false,
			code: "VALIDATION_ERROR",
		});
		const unsupportedSchema = z.string().transform(() => new Date());
		const nonCanonical = createCorporateAdministrationCommandFingerprint({
			schema: unsupportedSchema,
			organizationId: organizationIdSchema.parse("org_1"),
			operationId: "registerLegalCompanyDraft",
			input: "2026-01-01T00:00:00.000Z",
		});
		expect(nonCanonical).toMatchObject({
			ok: false,
			code: "VALIDATION_ERROR",
		});
	});
	it("derives the durable command identity from the registered operation", () => {
		const result = fingerprint({
			code: "CA-01",
			amount: "10.50",
			lines: [],
			nested: { left: 1, right: 2 },
		});
		expect(result.envelope.commandId).toBe(
			"corporate-administration.legal-company.register-draft",
		);
	});
});

/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */
import { describe, expect, it } from "vitest";
import {
	CORRELATION_ID_PATTERN,
	ERROR_LIMITS,
	isValidMessageKey,
	MESSAGE_KEY_PATTERN,
	OPERATION_PATTERN,
} from "../../src/contract/bounds";
import {
	defineError,
	type ErrorDefinition,
} from "../../src/contract/define-error";
import type {
	NoPublicDetailsInput,
	PublicDetailsContract,
} from "../../src/contract/details";
import { assertErrorRegistry } from "../../src/contract/invariants";
import {
	CANONICAL_ERROR_CODES,
	ERROR_REGISTRY,
} from "../../src/contract/registry";
import { errorResult } from "../../src/index";
import { createPublicErrorData } from "../../src/internal/public-error-data";
import {
	normalizeCorrelationId,
	normalizeOperation,
	normalizePublicFieldErrors,
	normalizePublicMessage,
	utf8ByteLength,
} from "../../src/security/normalize";

describe("Lane 1 canonical registry", () => {
	it("defines the complete ordered ten-code vocabulary", () => {
		expect(CANONICAL_ERROR_CODES).toEqual([
			"BAD_REQUEST",
			"UNAUTHORIZED",
			"FORBIDDEN",
			"NOT_FOUND",
			"CONFLICT",
			"CONCURRENCY_CONFLICT",
			"VALIDATION_ERROR",
			"RATE_LIMITED",
			"INTERNAL_ERROR",
			"SERVICE_UNAVAILABLE",
		]);
		expect(Object.isFrozen(CANONICAL_ERROR_CODES)).toBe(true);
		expect(Object.isFrozen(ERROR_REGISTRY)).toBe(true);
	});

	it("keeps every semantic definition complete and immutable", () => {
		for (const code of CANONICAL_ERROR_CODES) {
			const definition = ERROR_REGISTRY[code];
			expect(definition.code).toBe(code);
			expect(Object.isFrozen(definition)).toBe(true);
			expect(Object.isFrozen(definition.details)).toBe(true);
			expect(Object.isFrozen(definition.details.openApi)).toBe(true);
			expect(Object.isFrozen(definition.openApi)).toBe(true);
			expect(Object.isFrozen(definition.openApi.headers)).toBe(true);
			expect(Object.isFrozen(definition.details.publicKeys)).toBe(true);
			if (definition.details.openApi.schema !== null) {
				expect(Object.isFrozen(definition.details.openApi.schema)).toBe(true);
			}
			for (const header of Object.values(definition.openApi.headers)) {
				expect(Object.isFrozen(header)).toBe(true);
				expect(Object.isFrozen(header.schema)).toBe(true);
			}
			expect(MESSAGE_KEY_PATTERN.test(definition.public.messageKey)).toBe(true);
			expect(definition.public.messageKey.length).toBeLessThanOrEqual(
				ERROR_LIMITS.messageKeyCharacters,
			);
		}
	});

	it("clones mutable details metadata before freezing registry semantics", () => {
		const mutablePublicKeys: string[] = [];
		const mutableOpenApi: {
			schema: { maxLength: number; type: "string" } | null;
		} = { schema: { maxLength: 20, type: "string" } };
		const mutableDetails: PublicDetailsContract<
			"none",
			undefined,
			NoPublicDetailsInput,
			null
		> = {
			kind: "none",
			normalize: () => undefined,
			openApi: mutableOpenApi,
			publicKeys: mutablePublicKeys,
			staticFieldMessageProperty: null,
		};
		const mutableHeaderSchema = {
			maximum: 20,
			minimum: 1,
			type: "integer" as const,
		};
		const mutableHeaders = {
			"Retry-After": {
				description: "A mutable test header",
				schema: mutableHeaderSchema,
			},
		};
		const candidate: ErrorDefinition<
			"BAD_REQUEST",
			"errors.badRequest",
			typeof mutableDetails,
			"sanitized-override"
		> = {
			...ERROR_REGISTRY.BAD_REQUEST,
			details: mutableDetails,
			openApi: {
				description: "A mutable test response",
				headers: mutableHeaders,
			},
		};
		const frozen = defineError(candidate);

		mutablePublicKeys.push("mutated");
		if (mutableOpenApi.schema !== null) {
			mutableOpenApi.schema.maxLength = 30;
		}
		mutableHeaderSchema.maximum = 30;
		mutableHeaders["Retry-After"].description = "Mutated header";

		expect(frozen.details).not.toBe(mutableDetails);
		expect(frozen.details.publicKeys).toEqual([]);
		expect(frozen.details.openApi.schema).toEqual({
			maxLength: 20,
			type: "string",
		});
		expect(frozen.openApi.headers["Retry-After"]?.description).toBe(
			"A mutable test header",
		);
		expect(frozen.openApi.headers["Retry-After"]?.schema).toEqual({
			maximum: 20,
			minimum: 1,
			type: "integer",
		});
		expect(Object.isFrozen(frozen.details)).toBe(true);
		expect(Object.isFrozen(frozen.details.publicKeys)).toBe(true);
		expect(Object.isFrozen(frozen.details.openApi)).toBe(true);
		expect(Object.isFrozen(frozen.openApi)).toBe(true);
		expect(Object.isFrozen(frozen.openApi.headers)).toBe(true);
		expect(Object.isFrozen(frozen.openApi.headers["Retry-After"])).toBe(true);
		expect(Object.isFrozen(frozen.openApi.headers["Retry-After"]?.schema)).toBe(
			true,
		);
	});

	it("freezes the complete ten-code public and transport policy table", () => {
		expect(
			Object.fromEntries(
				CANONICAL_ERROR_CODES.map((code) => {
					const definition = ERROR_REGISTRY[code];
					return [
						code,
						{
							details: definition.details.kind,
							messageKey: definition.public.messageKey,
							messagePolicy: definition.public.messagePolicy,
							retryAfter: definition.retry.retryAfter,
							retryable: definition.retry.retryable,
							status: definition.http.status,
						},
					];
				}),
			),
		).toEqual({
			BAD_REQUEST: {
				details: "none",
				messageKey: "errors.badRequest",
				messagePolicy: "sanitized-override",
				retryAfter: "never",
				retryable: false,
				status: 400,
			},
			UNAUTHORIZED: {
				details: "none",
				messageKey: "errors.unauthorized",
				messagePolicy: "fixed",
				retryAfter: "never",
				retryable: false,
				status: 401,
			},
			FORBIDDEN: {
				details: "none",
				messageKey: "errors.forbidden",
				messagePolicy: "fixed",
				retryAfter: "never",
				retryable: false,
				status: 403,
			},
			NOT_FOUND: {
				details: "none",
				messageKey: "errors.notFound",
				messagePolicy: "sanitized-override",
				retryAfter: "never",
				retryable: false,
				status: 404,
			},
			CONFLICT: {
				details: "none",
				messageKey: "errors.conflict",
				messagePolicy: "sanitized-override",
				retryAfter: "never",
				retryable: false,
				status: 409,
			},
			CONCURRENCY_CONFLICT: {
				details: "none",
				messageKey: "errors.concurrencyConflict",
				messagePolicy: "fixed",
				retryAfter: "never",
				retryable: true,
				status: 409,
			},
			VALIDATION_ERROR: {
				details: "field-errors",
				messageKey: "errors.validationError",
				messagePolicy: "sanitized-override",
				retryAfter: "never",
				retryable: false,
				status: 422,
			},
			RATE_LIMITED: {
				details: "retry-after",
				messageKey: "errors.rateLimited",
				messagePolicy: "fixed",
				retryAfter: "details.retryAfterSeconds",
				retryable: true,
				status: 429,
			},
			INTERNAL_ERROR: {
				details: "correlation",
				messageKey: "errors.internalError",
				messagePolicy: "fixed",
				retryAfter: "never",
				retryable: false,
				status: 500,
			},
			SERVICE_UNAVAILABLE: {
				details: "none",
				messageKey: "errors.serviceUnavailable",
				messagePolicy: "fixed",
				retryAfter: "never",
				retryable: true,
				status: 503,
			},
		});
	});

	it("distinguishes business conflict from retryable concurrency conflict", () => {
		expect(ERROR_REGISTRY.CONFLICT.http.status).toBe(409);
		expect(ERROR_REGISTRY.CONFLICT.retry.retryable).toBe(false);
		expect(ERROR_REGISTRY.CONCURRENCY_CONFLICT.http.status).toBe(409);
		expect(ERROR_REGISTRY.CONCURRENCY_CONFLICT.retry.retryable).toBe(true);
	});

	it("rejects alias collisions, canonical aliases, and ledger drift", () => {
		const duplicateAliasRegistry = {
			...ERROR_REGISTRY,
			FORBIDDEN: {
				...ERROR_REGISTRY.FORBIDDEN,
				aliases: ["LEGACY_DENIED"],
			},
			UNAUTHORIZED: {
				...ERROR_REGISTRY.UNAUTHORIZED,
				aliases: ["LEGACY_DENIED"],
			},
		};
		expect(() =>
			assertErrorRegistry(
				duplicateAliasRegistry,
				CANONICAL_ERROR_CODES,
				{ LEGACY_DENIED: "FORBIDDEN" },
				[],
			),
		).toThrow("alias LEGACY_DENIED has multiple meanings");

		const canonicalAliasRegistry = {
			...ERROR_REGISTRY,
			FORBIDDEN: {
				...ERROR_REGISTRY.FORBIDDEN,
				aliases: ["BAD_REQUEST"],
			},
		};
		expect(() =>
			assertErrorRegistry(
				canonicalAliasRegistry,
				CANONICAL_ERROR_CODES,
				{ BAD_REQUEST: "FORBIDDEN" },
				[],
			),
		).toThrow("alias BAD_REQUEST is also canonical");

		const reservedAliasRegistry = {
			...ERROR_REGISTRY,
			INTERNAL_ERROR: {
				...ERROR_REGISTRY.INTERNAL_ERROR,
				aliases: ["INTERNAL"],
			},
		};
		expect(() =>
			assertErrorRegistry(reservedAliasRegistry, CANONICAL_ERROR_CODES, {}, [
				"INTERNAL",
			]),
		).toThrow("definition aliases and the historical ledger differ");
	});

	it("rejects registry defaults that could leak sensitive source text", () => {
		const unsafeDefaultRegistry = {
			...ERROR_REGISTRY,
			BAD_REQUEST: {
				...ERROR_REGISTRY.BAD_REQUEST,
				public: {
					...ERROR_REGISTRY.BAD_REQUEST.public,
					defaultMessage: "SELECT password FROM users",
				},
			},
		};

		expect(() =>
			assertErrorRegistry(unsafeDefaultRegistry, CANONICAL_ERROR_CODES, {}, [
				"INTERNAL",
			]),
		).toThrow("BAD_REQUEST has an invalid default public message");
	});

	it("rejects incoherent retry detail and canonical timing policy", () => {
		const incoherentRetryRegistry = {
			...ERROR_REGISTRY,
			RATE_LIMITED: {
				...ERROR_REGISTRY.RATE_LIMITED,
				retry: {
					...ERROR_REGISTRY.RATE_LIMITED.retry,
					retryAfter: ERROR_REGISTRY.SERVICE_UNAVAILABLE.retry.retryAfter,
				},
			},
		};

		expect(() =>
			assertErrorRegistry(incoherentRetryRegistry, CANONICAL_ERROR_CODES, {}, [
				"INTERNAL",
			]),
		).toThrow("retry details without a coherent retry timing policy");
	});

	it("rejects incomplete and out-of-domain runtime definition metadata", () => {
		const assertRuntimeCandidate = (registry: unknown) =>
			Reflect.apply(assertErrorRegistry, undefined, [
				registry,
				CANONICAL_ERROR_CODES,
				{},
				["INTERNAL"],
			]);
		const withBadRequest = (definition: unknown) => ({
			...ERROR_REGISTRY,
			BAD_REQUEST: definition,
		});

		expect(() =>
			assertRuntimeCandidate(
				withBadRequest({
					...ERROR_REGISTRY.BAD_REQUEST,
					operations: undefined,
				}),
			),
		).toThrow("BAD_REQUEST has an invalid operations policy");
		expect(() =>
			assertRuntimeCandidate(
				withBadRequest({
					...ERROR_REGISTRY.BAD_REQUEST,
					public: {
						...ERROR_REGISTRY.BAD_REQUEST.public,
						messagePolicy: "caller-owned",
					},
				}),
			),
		).toThrow("BAD_REQUEST has an invalid public message policy");
		expect(() =>
			assertRuntimeCandidate(
				withBadRequest({
					...ERROR_REGISTRY.BAD_REQUEST,
					lifecycle: {
						...ERROR_REGISTRY.BAD_REQUEST.lifecycle,
						introduced: "2026-13",
					},
				}),
			),
		).toThrow("BAD_REQUEST has an invalid introduction month");
		expect(() =>
			assertRuntimeCandidate(
				withBadRequest({
					...ERROR_REGISTRY.BAD_REQUEST,
					details: {
						...ERROR_REGISTRY.BAD_REQUEST.details,
						staticFieldMessageProperty: "unownedField",
					},
				}),
			),
		).toThrow("BAD_REQUEST has an invalid static field-message policy");
		expect(() =>
			assertRuntimeCandidate(
				withBadRequest({
					...ERROR_REGISTRY.BAD_REQUEST,
					openApi: {
						description: "Invalid headers",
						headers: {
							"Retry-After": {
								description: "First",
								schema: { type: "integer" },
							},
							"retry-after": {
								description: "Second",
								schema: { type: "integer" },
							},
						},
					},
				}),
			),
		).toThrow("BAD_REQUEST has an invalid or duplicate OpenAPI header");
		expect(() =>
			assertRuntimeCandidate(
				withBadRequest({
					...ERROR_REGISTRY.BAD_REQUEST,
					details: {
						...ERROR_REGISTRY.BAD_REQUEST.details,
						openApi: {
							...ERROR_REGISTRY.BAD_REQUEST.details.openApi,
							schema: { type: "string" },
						},
					},
				}),
			),
		).toThrow("BAD_REQUEST has a schema for absent public details");
		expect(() =>
			assertRuntimeCandidate(
				withBadRequest({
					...ERROR_REGISTRY.BAD_REQUEST,
					openApi: {
						...ERROR_REGISTRY.BAD_REQUEST.openApi,
						headers: ERROR_REGISTRY.RATE_LIMITED.openApi.headers,
					},
				}),
			),
		).toThrow(
			"BAD_REQUEST exposes Retry-After without canonical timing details",
		);
		expect(() =>
			assertRuntimeCandidate({
				...ERROR_REGISTRY,
				RATE_LIMITED: {
					...ERROR_REGISTRY.RATE_LIMITED,
					openApi: {
						...ERROR_REGISTRY.RATE_LIMITED.openApi,
						headers: {},
					},
				},
			}),
		).toThrow("RATE_LIMITED has canonical retry timing without Retry-After");
		expect(() =>
			assertRuntimeCandidate({
				...ERROR_REGISTRY,
				RATE_LIMITED: {
					...ERROR_REGISTRY.RATE_LIMITED,
					openApi: {
						...ERROR_REGISTRY.RATE_LIMITED.openApi,
						headers: {
							"Retry-After": {
								...ERROR_REGISTRY.RATE_LIMITED.openApi.headers["Retry-After"],
								schema: { maximum: 10, minimum: 1, type: "integer" },
							},
						},
					},
				},
			}),
		).toThrow(
			"RATE_LIMITED Retry-After bounds differ from canonical retry timing",
		);
		expect(() =>
			assertRuntimeCandidate(
				withBadRequest({
					...ERROR_REGISTRY.BAD_REQUEST,
					openApi: {
						description: "Invalid header name",
						headers: {
							"Invalid Header": {
								description: "Invalid",
								schema: { type: "string" },
							},
						},
					},
				}),
			),
		).toThrow("BAD_REQUEST has an invalid or duplicate OpenAPI header");
		expect(() =>
			assertRuntimeCandidate({
				...ERROR_REGISTRY,
				RATE_LIMITED: {
					...ERROR_REGISTRY.RATE_LIMITED,
					details: {
						...ERROR_REGISTRY.RATE_LIMITED.details,
						openApi: {
							schema: {
								additionalProperties: false,
								properties: {},
								secretVendorField: "must not project",
								type: "object",
							},
						},
					},
				},
			}),
		).toThrow("RATE_LIMITED.details has unsupported metadata fields");
	});
});

describe("Lane 1 errorResult", () => {
	it("creates immutable success and canonical failure outcomes", () => {
		const success = errorResult.ok({ id: "invoice-1" });
		const failure = errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested invoice could not be found",
		});

		expect(success).toEqual({ data: { id: "invoice-1" }, ok: true });
		expect(Object.isFrozen(success)).toBe(true);
		expect(failure).toEqual({
			code: "NOT_FOUND",
			message: "The requested invoice could not be found",
			messageKey: "errors.notFound",
			ok: false,
		});
		expect(Object.isFrozen(failure)).toBe(true);
	});

	it("keeps trusted in-process context outside the public Result and wire shape", () => {
		const internalContext = {
			domainCode: "human_resources.authorization_denied",
			secret: "private-diagnostic",
		};
		const failure = errorResult.fail("FORBIDDEN", { internalContext });

		expect(errorResult.context(failure)).toBe(internalContext);
		expect(Object.keys(failure)).toEqual([
			"ok",
			"code",
			"message",
			"messageKey",
		]);
		expect(JSON.stringify(failure)).not.toContain("private-diagnostic");

		const existing = errorResult.fail("INTERNAL_ERROR");
		expect(errorResult.withContext(existing, internalContext)).toBe(existing);
		expect(errorResult.context(existing)).toBe(internalContext);
		expect(JSON.stringify(existing)).not.toContain("private-diagnostic");
	});

	it("uses registry wording for every fixed-message code", () => {
		expect(errorResult.fail("UNAUTHORIZED").message).toBe(
			"Authentication is required",
		);
		expect(errorResult.fail("FORBIDDEN").message).toBe(
			"The operation is not permitted",
		);
		expect(errorResult.fail("CONCURRENCY_CONFLICT").message).toBe(
			"The operation could not be completed because the resource changed",
		);
		expect(errorResult.fail("INTERNAL_ERROR").message).toBe(
			"An unexpected error occurred",
		);
		expect(errorResult.fail("SERVICE_UNAVAILABLE").message).toBe(
			"A required service is temporarily unavailable.",
		);
	});

	it("ignores runtime wording for fixed policies at the internal boundary", () => {
		expect(
			createPublicErrorData("INTERNAL_ERROR", {
				publicMessage: "DATABASE_URL=postgres://admin:secret@host/db",
			}),
		).toEqual({
			code: "INTERNAL_ERROR",
			message: "An unexpected error occurred",
			messageKey: "errors.internalError",
		});
	});

	it("normalizes and deeply freezes code-owned public details", () => {
		const failure = errorResult.fail("VALIDATION_ERROR", {
			fieldErrors: {
				email: ["  Enter a valid email address  ", undefined],
				name: ["Name\u0000is required"],
			},
			publicMessage: "Review the highlighted fields",
		});

		expect(failure.details).toEqual({
			fieldErrors: {
				email: ["Enter a valid email address"],
				name: ["Name is required"],
			},
		});
		expect(Object.isFrozen(failure.details)).toBe(true);
		expect(Object.isFrozen(failure.details?.fieldErrors)).toBe(true);
		expect(Object.isFrozen(failure.details?.fieldErrors.email)).toBe(true);
	});

	it("uses a single normalized correlation source for direct internal results", () => {
		expect(
			errorResult.fail("INTERNAL_ERROR", {
				correlationId: "  trace/provider-123  ",
			}),
		).toEqual({
			code: "INTERNAL_ERROR",
			details: { correlationId: "trace/provider-123" },
			message: "An unexpected error occurred",
			messageKey: "errors.internalError",
			ok: false,
		});
		expect(
			errorResult.fail("INTERNAL_ERROR", { correlationId: "invalid value" }),
		).not.toHaveProperty("details");
	});

	it("requires the strict bounded retry constructor", () => {
		expect(errorResult.retryAfterSeconds(1)).toBe(1);
		expect(errorResult.retryAfterSeconds(86_400)).toBe(86_400);
		for (const value of [
			0,
			86_401,
			1.5,
			Number.NaN,
			Number.POSITIVE_INFINITY,
		]) {
			expect(() => errorResult.retryAfterSeconds(value)).toThrow(RangeError);
		}
		expect(
			errorResult.fail("RATE_LIMITED", {
				retryAfterSeconds: errorResult.retryAfterSeconds(45),
			}),
		).toMatchObject({ details: { retryAfterSeconds: 45 } });
	});
});

describe("Lane 1 public bounds", () => {
	it("freezes exact patterns and field limits", () => {
		expect(ERROR_LIMITS).toEqual({
			correlationIdCharacters: 128,
			fieldCount: 50,
			fieldInputKeys: 200,
			fieldInputMessagesPerField: 100,
			fieldMessageCharacters: 300,
			fieldMessagesPerField: 10,
			fieldNameCharacters: 100,
			messageKeyCharacters: 120,
			operationCharacters: 120,
			publicDetailsBytes: 16_384,
			publicMessageBytes: 2000,
			publicMessageCharacters: 500,
			retryAfterSecondsMaximum: 86_400,
			retryAfterSecondsMinimum: 1,
			textInputCodeUnitsPerCharacter: 4,
			wireBytes: 32_768,
			wireDepth: 6,
			wireKeys: 64,
		});
		expect(MESSAGE_KEY_PATTERN.test("errors.validationError")).toBe(true);
		expect(OPERATION_PATTERN.test("invoice.create")).toBe(true);
		expect(CORRELATION_ID_PATTERN.test("trace/provider-123")).toBe(true);
		expect(CORRELATION_ID_PATTERN.test("trace=provider")).toBe(false);
		expect(isValidMessageKey(`errors.${"a".repeat(113)}`)).toBe(true);
		expect(isValidMessageKey(`errors.${"a".repeat(114)}`)).toBe(false);
	});

	it("bounds public wording by code points and UTF-8 bytes", () => {
		const normalized = normalizePublicMessage(
			"😀".repeat(500),
			"Safe fallback",
		);
		expect(Array.from(normalized)).toHaveLength(500);
		expect(utf8ByteLength(normalized)).toBe(2000);
		expect(normalizePublicMessage("😀".repeat(501), "Safe fallback")).toBe(
			"Safe fallback",
		);
		expect(normalizePublicMessage("x".repeat(2001), "Safe fallback")).toBe(
			"Safe fallback",
		);
		expect(normalizePublicMessage(`${" ".repeat(1996)}Safe`, "Fallback")).toBe(
			"Safe",
		);
		expect(normalizePublicMessage(`${" ".repeat(1997)}Safe`, "Fallback")).toBe(
			"Fallback",
		);
		expect(
			normalizePublicMessage(
				"password=secret",
				"The request could not be processed",
			),
		).toBe("The request could not be processed");
		expect(
			normalizePublicMessage(
				"SELECT password FROM users",
				"The request could not be processed",
			),
		).toBe("The request could not be processed");
		expect(normalizePublicMessage("Select a valid country", "Fallback")).toBe(
			"Select a valid country",
		);
		expect(normalizePublicMessage("Update this field", "Fallback")).toBe(
			"Update this field",
		);
		expect(
			normalizePublicMessage(
				'duplicate key value violates unique constraint "invoice_number"',
				"Safe conflict",
			),
		).toBe("Safe conflict");
	});

	it("accepts exact field and aggregate boundaries and closes one past them", () => {
		const fieldAtLimit = `f${"x".repeat(99)}`;
		const fieldPastLimit = `f${"x".repeat(100)}`;
		const messageAtLimit = "x".repeat(300);
		const messagePastLimit = "x".repeat(301);

		expect(
			normalizePublicFieldErrors({ [fieldAtLimit]: [messageAtLimit] }),
		).toEqual({ [fieldAtLimit]: [messageAtLimit] });
		expect(
			Object.keys(
				normalizePublicFieldErrors({ [fieldPastLimit]: [messagePastLimit] }) ??
					{},
			),
		).toEqual([fieldAtLimit]);
		expect(
			normalizePublicFieldErrors({ field: [messagePastLimit] })?.field?.[0],
		).toBe(messageAtLimit);

		const aggregateBase = Object.fromEntries(
			Array.from({ length: 5 }, (_, index) => [
				`field${index}`,
				Array.from({ length: 10 }, () => messageAtLimit),
			]),
		);
		const exactlyBounded = normalizePublicFieldErrors({
			...aggregateBase,
			field5: [messageAtLimit, messageAtLimit, messageAtLimit, "x".repeat(239)],
		});
		expect(
			utf8ByteLength(JSON.stringify({ fieldErrors: exactlyBounded })),
		).toBe(ERROR_LIMITS.publicDetailsBytes);

		const oneBytePast = normalizePublicFieldErrors({
			...aggregateBase,
			field5: [messageAtLimit, messageAtLimit, messageAtLimit, "x".repeat(240)],
		});
		expect(oneBytePast).not.toHaveProperty("field5");
		expect(
			utf8ByteLength(JSON.stringify({ fieldErrors: oneBytePast })),
		).toBeLessThanOrEqual(ERROR_LIMITS.publicDetailsBytes);
	});

	it("bounds hostile field-error work before value traversal", () => {
		const maximumInputKeys = Object.fromEntries(
			Array.from({ length: 200 }, (_, index) => [`field${index}`, ["Invalid"]]),
		);
		expect(
			Object.keys(normalizePublicFieldErrors(maximumInputKeys) ?? {}),
		).toHaveLength(ERROR_LIMITS.fieldCount);
		const tooManyKeys = Object.fromEntries(
			Array.from({ length: 201 }, (_, index) => [`field${index}`, ["Invalid"]]),
		);
		expect(normalizePublicFieldErrors(tooManyKeys)).toBeUndefined();

		let oversizedKeyReads = 0;
		const oversizedKeyInput = Object.defineProperty(
			{ valid: ["Valid"] },
			"x".repeat(401),
			{
				enumerable: true,
				get() {
					oversizedKeyReads += 1;
					return ["Must not be read"];
				},
			},
		);
		expect(normalizePublicFieldErrors(oversizedKeyInput)).toBeUndefined();
		expect(oversizedKeyReads).toBe(0);

		const outsideReadWindow: string[] = Array.from({ length: 101 });
		outsideReadWindow[100] = "Outside bounded input window";
		expect(
			normalizePublicFieldErrors({ field: outsideReadWindow }),
		).toBeUndefined();

		const insideReadWindow: string[] = Array.from({ length: 100 });
		insideReadWindow[99] = "Inside bounded input window";
		expect(normalizePublicFieldErrors({ field: insideReadWindow })).toEqual({
			field: ["Inside bounded input window"],
		});
		expect(
			normalizePublicFieldErrors({
				[`${" ".repeat(399)}f`]: [`${" ".repeat(1199)}x`],
			}),
		).toEqual({ f: ["x"] });
		expect(
			normalizePublicFieldErrors({
				[`${" ".repeat(400)}f`]: ["x"],
			}),
		).toBeUndefined();
		expect(
			normalizePublicFieldErrors({ field: [`${" ".repeat(1200)}x`] }),
		).toBeUndefined();
	});

	it("rejects sensitive public field names before reading their values", () => {
		for (const fieldName of [
			"password=supersecret",
			"postgres://user:pass@host/db",
			"SELECT password FROM users",
		]) {
			let reads = 0;
			const input = Object.defineProperty({}, fieldName, {
				enumerable: true,
				get() {
					reads += 1;
					return ["Invalid"];
				},
			});
			expect(normalizePublicFieldErrors(input)).toBeUndefined();
			expect(reads).toBe(0);
		}
	});

	it("bounds, sorts, sanitizes, and freezes field errors", () => {
		const input: Record<string, readonly string[]> = {};
		for (let field = 54; field >= 0; field -= 1) {
			input[`field${field.toString().padStart(2, "0")}`] = Array.from(
				{ length: 12 },
				() => "Invalid",
			);
		}
		const normalized = normalizePublicFieldErrors(input);
		const keys = Object.keys(normalized ?? {});
		expect(keys).toHaveLength(50);
		expect(keys).toEqual([...keys].sort());
		expect(normalized?.[keys[0] ?? ""]).toHaveLength(10);
		expect(
			normalizePublicFieldErrors({ field: ["x".repeat(350)] })?.field?.[0],
		).toHaveLength(300);

		const aggregateBounded = normalizePublicFieldErrors(
			Object.fromEntries(
				Array.from({ length: 50 }, (_, index) => [
					`large${index}`,
					Array.from({ length: 10 }, () => "x".repeat(300)),
				]),
			),
		);
		expect(
			utf8ByteLength(JSON.stringify({ fieldErrors: aggregateBounded })),
		).toBeLessThanOrEqual(ERROR_LIMITS.publicDetailsBytes);
		expect(Object.isFrozen(normalized)).toBe(true);
	});

	it("rejects prototype-shaped field names before downstream copying", () => {
		const input = Object.defineProperties(
			{ email: ["Enter a valid email address"] },
			{
				["__proto__"]: {
					enumerable: true,
					value: ["Invalid prototype"],
				},
				constructor: {
					enumerable: true,
					value: ["Invalid constructor"],
				},
				prototype: {
					enumerable: true,
					value: ["Invalid prototype field"],
				},
			},
		);
		const normalized = normalizePublicFieldErrors(input);
		// biome-ignore lint/style/useObjectSpread: Object.assign's legacy __proto__ setter is the downstream behavior under test.
		const copied = Object.assign({}, normalized);

		expect(normalized).toEqual({ email: ["Enter a valid email address"] });
		expect(Object.hasOwn(copied, "__proto__")).toBe(false);
		expect(Object.hasOwn(copied, "constructor")).toBe(false);
		expect(Object.hasOwn(copied, "prototype")).toBe(false);
		expect(Object.getPrototypeOf(copied)).toBe(Object.prototype);
	});

	it("fails closed for revoked proxies and throwing field-message accessors", () => {
		const revokedRecord = Proxy.revocable({}, {});
		revokedRecord.revoke();
		expect(() => normalizePublicFieldErrors(revokedRecord.proxy)).not.toThrow();
		expect(normalizePublicFieldErrors(revokedRecord.proxy)).toBeUndefined();

		const messages = ["ignored", "Valid message"];
		Object.defineProperty(messages, "0", {
			get() {
				throw new Error("hostile getter");
			},
		});
		expect(() => normalizePublicFieldErrors({ field: messages })).not.toThrow();
		expect(normalizePublicFieldErrors({ field: messages })).toEqual({
			field: ["Valid message"],
		});

		const revokedArray = Proxy.revocable([], {});
		revokedArray.revoke();
		expect(() =>
			normalizePublicFieldErrors({ field: revokedArray.proxy }),
		).not.toThrow();
	});

	it("normalizes private operation labels and external correlation IDs", () => {
		expect(normalizeOperation(`${" ".repeat(479)}a`)).toBe("a");
		expect(normalizeOperation(`${" ".repeat(480)}a`)).toBe("unknown");
		expect(normalizeOperation("a".repeat(120))).toBe("a".repeat(120));
		expect(normalizeOperation("a".repeat(121))).toBe("unknown");
		expect(normalizeOperation("  invoice.create  ")).toBe("invoice.create");
		expect(normalizeOperation("invoice create")).toBe("unknown");
		expect(normalizeOperation(`a${"x".repeat(120)}`)).toBe("unknown");
		expect(normalizeCorrelationId("  trace/provider-123  ")).toBe(
			"trace/provider-123",
		);
		expect(normalizeCorrelationId("trace provider")).toBeUndefined();
		expect(normalizeCorrelationId(`${" ".repeat(511)}x`)).toBe("x");
		expect(normalizeCorrelationId(`${" ".repeat(512)}x`)).toBeUndefined();
		expect(normalizeCorrelationId("x".repeat(128))).toBe("x".repeat(128));
		expect(normalizeCorrelationId("x".repeat(129))).toBeUndefined();
	});
});

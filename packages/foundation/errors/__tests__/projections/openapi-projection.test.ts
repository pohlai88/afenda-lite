/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { describe, expect, it } from "vitest";

import { errorOpenApi } from "../../src/capabilities/openapi";
import type {
	ErrorOpenApiObjectSchema,
	ErrorOpenApiSchema,
	ErrorOpenApiStringSchema,
} from "../../src/contract/openapi-metadata";
import {
	CANONICAL_ERROR_CODES,
	ERROR_REGISTRY,
} from "../../src/contract/registry";
import {
	type ErrorOpenApiProjectionDefinition,
	projectErrorOpenApiResponsesFromRegistry,
} from "../../src/openapi/responses";
import type {
	ErrorOpenApiBodySchema,
	OpenApiErrorResponse,
} from "../../src/openapi/types";

const JSON_MEDIA_TYPE = "application/json";

function objectSchema(
	schema: ErrorOpenApiBodySchema,
): ErrorOpenApiObjectSchema {
	if ("oneOf" in schema || schema.type !== "object") {
		throw new TypeError("Expected an object schema fixture.");
	}
	return schema;
}

function errorObjectSchema(
	response: OpenApiErrorResponse,
): ErrorOpenApiObjectSchema {
	const wrapper = objectSchema(response.content[JSON_MEDIA_TYPE].schema);
	const { error } = wrapper.properties;
	if (error?.type !== "object") {
		throw new TypeError("Expected a wrapped error schema fixture.");
	}
	return error;
}

function stringSchema(
	schema: ErrorOpenApiSchema | undefined,
): ErrorOpenApiStringSchema {
	if (schema?.type !== "string") {
		throw new TypeError("Expected a string schema fixture.");
	}
	return schema;
}

function codeForVariant(schema: ErrorOpenApiBodySchema): string | undefined {
	const wrapper = objectSchema(schema);
	const { error } = wrapper.properties;
	if (error?.type !== "object") {
		return;
	}
	return stringSchema(error.properties.code).enum?.[0];
}

function isDeepFrozen(value: unknown, seen = new WeakSet<object>()): boolean {
	if (typeof value !== "object" || value === null || seen.has(value)) {
		return true;
	}
	seen.add(value);
	return (
		Object.isFrozen(value) &&
		Object.values(value).every((nested) => isDeepFrozen(nested, seen))
	);
}

function syntheticDefinition(input: {
	code: string;
	detailsSchema?: ErrorOpenApiSchema | null;
	header?: Readonly<{
		description: string;
		name: string;
		schema: ErrorOpenApiSchema;
	}>;
	status?: number;
}): ErrorOpenApiProjectionDefinition {
	return {
		code: input.code,
		details: { openApi: { schema: input.detailsSchema ?? null } },
		http: { status: input.status ?? 499 },
		openApi: {
			description: "Synthetic contract outcome",
			headers:
				input.header === undefined
					? {}
					: {
							[input.header.name]: {
								description: input.header.description,
								schema: input.header.schema,
							},
						},
		},
		public: {
			defaultMessage: "Synthetic failure",
			messageKey: "errors.synthetic",
			messagePolicy: "fixed",
		},
	};
}

function nestedObjectSchema(depth: number): ErrorOpenApiSchema {
	let schema: ErrorOpenApiSchema = { type: "string" };
	for (let level = 1; level < depth; level += 1) {
		schema = {
			type: "object",
			additionalProperties: false,
			properties: { nested: schema },
			required: ["nested"],
		};
	}
	return schema;
}

describe("errorOpenApi.responses", () => {
	it("projects the registry-owned status and code schema for all ten codes", () => {
		for (const code of CANONICAL_ERROR_CODES) {
			const responses = errorOpenApi.responses([code]);
			const values = Object.values(responses);
			expect(Object.keys(responses)).toEqual([
				String(ERROR_REGISTRY[code].http.status),
			]);
			expect(values).toHaveLength(1);
			const [response] = values;
			if (response === undefined) {
				throw new TypeError("Expected one canonical response projection.");
			}
			expect(codeForVariant(response.content[JSON_MEDIA_TYPE].schema)).toBe(
				code,
			);
		}
	});

	it("deduplicates codes and emits deterministic canonical oneOf variants", () => {
		const responses = errorOpenApi.responses([
			"CONCURRENCY_CONFLICT",
			"CONFLICT",
			"CONFLICT",
		] as const);
		const canonicalInputResponses = errorOpenApi.responses([
			"CONFLICT",
			"CONCURRENCY_CONFLICT",
		] as const);

		expect(Object.keys(responses)).toEqual(["409"]);
		expect(responses).toEqual(canonicalInputResponses);
		const { 409: conflictResponse } = responses;
		const { schema } = conflictResponse.content[JSON_MEDIA_TYPE];
		if (!("oneOf" in schema)) {
			throw new TypeError("Expected duplicate-status oneOf projection.");
		}
		expect(schema.oneOf.map(codeForVariant)).toEqual([
			"CONFLICT",
			"CONCURRENCY_CONFLICT",
		]);
		expect(conflictResponse.description).toBe(
			`${ERROR_REGISTRY.CONFLICT.openApi.description}; ${ERROR_REGISTRY.CONCURRENCY_CONFLICT.openApi.description}`,
		);
		expect(isDeepFrozen(responses)).toBe(true);
	});

	it("emits unique statuses in ascending order independent of caller order", () => {
		const responses = errorOpenApi.responses([
			"SERVICE_UNAVAILABLE",
			"RATE_LIMITED",
			"UNAUTHORIZED",
			"BAD_REQUEST",
			"RATE_LIMITED",
		] as const);

		expect(Object.keys(responses)).toEqual(["400", "401", "429", "503"]);
	});

	it("preserves the error wrapper and derives message policy per code", () => {
		const { 400: overrideResponse } = errorOpenApi.responses([
			"BAD_REQUEST",
		] as const);
		const { 403: fixedResponse } = errorOpenApi.responses([
			"FORBIDDEN",
		] as const);
		const overrideError = errorObjectSchema(overrideResponse);
		const fixedError = errorObjectSchema(fixedResponse);

		expect(overrideError.required).toEqual(["code", "message", "messageKey"]);
		expect(overrideError.properties).not.toHaveProperty("details");
		expect(stringSchema(overrideError.properties.message)).toEqual({
			type: "string",
			maxLength: 500,
			minLength: 1,
		});
		expect(stringSchema(fixedError.properties.message)).toEqual({
			type: "string",
			enum: [ERROR_REGISTRY.FORBIDDEN.public.defaultMessage],
		});
		expect(stringSchema(fixedError.properties.messageKey).enum).toEqual([
			"errors.forbidden",
		]);
	});

	it("copies exact registry-owned details schemas without widening", () => {
		const validation = errorObjectSchema(
			errorOpenApi.responses(["VALIDATION_ERROR"] as const)[422],
		);
		const rateLimited = errorObjectSchema(
			errorOpenApi.responses(["RATE_LIMITED"] as const)[429],
		);
		const internal = errorObjectSchema(
			errorOpenApi.responses(["INTERNAL_ERROR"] as const)[500],
		);

		expect(validation.properties.details).toEqual(
			ERROR_REGISTRY.VALIDATION_ERROR.details.openApi.schema,
		);
		expect(rateLimited.properties.details).toEqual(
			ERROR_REGISTRY.RATE_LIMITED.details.openApi.schema,
		);
		expect(internal.properties.details).toEqual(
			ERROR_REGISTRY.INTERNAL_ERROR.details.openApi.schema,
		);
	});

	it("projects registry-owned response headers", () => {
		const { 429: response } = errorOpenApi.responses(["RATE_LIMITED"] as const);

		expect(response.headers).toEqual(
			ERROR_REGISTRY.RATE_LIMITED.openApi.headers,
		);
		expect(isDeepFrozen(response.headers)).toBe(true);
	});

	it("keeps the accepted metadata depth closed under response wrapping", () => {
		const registry = {
			DEEP: syntheticDefinition({
				code: "DEEP",
				detailsSchema: nestedObjectSchema(8),
			}),
		};
		const responses = projectErrorOpenApiResponsesFromRegistry(
			registry,
			["DEEP"],
			["DEEP"],
		);

		expect(Object.keys(responses)).toEqual(["499"]);
		expect(isDeepFrozen(responses)).toBe(true);
	});

	it("merges compatible header names case-insensitively in canonical order", () => {
		const sharedSchema = {
			type: "integer",
			minimum: 1,
		} satisfies ErrorOpenApiSchema;
		const registry = {
			FIRST: syntheticDefinition({
				code: "FIRST",
				header: {
					description: "Retry window",
					name: "Retry-After",
					schema: sharedSchema,
				},
			}),
			SECOND: syntheticDefinition({
				code: "SECOND",
				header: {
					description: "Retry window",
					name: "retry-after",
					schema: { minimum: 1, type: "integer" },
				},
			}),
			THIRD: syntheticDefinition({ code: "THIRD" }),
		};

		const responses = projectErrorOpenApiResponsesFromRegistry(
			registry,
			["FIRST", "SECOND", "THIRD"],
			["THIRD", "SECOND", "FIRST", "FIRST"],
		);

		expect(Object.keys(responses[499]?.headers ?? {})).toEqual(["Retry-After"]);
		expect(responses[499]?.headers?.["Retry-After"]).toEqual({
			description: "Retry window",
			schema: { minimum: 1, type: "integer" },
		});
		expect(isDeepFrozen(responses)).toBe(true);
	});

	it("fails header conflicts with one fixed non-leaking error", () => {
		const registry = {
			FIRST: syntheticDefinition({
				code: "FIRST",
				header: {
					description: "Public description",
					name: "X-Private-Provider-Token",
					schema: { type: "string" },
				},
			}),
			SECOND: syntheticDefinition({
				code: "SECOND",
				header: {
					description: "Public description",
					name: "x-private-provider-token",
					schema: { type: "integer" },
				},
			}),
		};

		expect(() =>
			projectErrorOpenApiResponsesFromRegistry(
				registry,
				["FIRST", "SECOND"],
				["FIRST", "SECOND"],
			),
		).toThrowError(
			new TypeError("Conflicting error OpenAPI response header metadata."),
		);
		try {
			projectErrorOpenApiResponsesFromRegistry(
				registry,
				["FIRST", "SECOND"],
				["FIRST", "SECOND"],
			);
		} catch (error) {
			expect(error).toBeInstanceOf(TypeError);
			const message = error instanceof Error ? error.message : "";
			expect(message).not.toMatch(/provider|token/iu);
		}

		const schemaConflictRegistry = {
			FIRST: syntheticDefinition({
				code: "FIRST",
				header: {
					description: "Shared header",
					name: "X-Window",
					schema: { minimum: 1, type: "integer" },
				},
			}),
			SECOND: syntheticDefinition({
				code: "SECOND",
				header: {
					description: "Shared header",
					name: "x-window",
					schema: { type: "string" },
				},
			}),
		};
		expect(() =>
			projectErrorOpenApiResponsesFromRegistry(
				schemaConflictRegistry,
				["FIRST", "SECOND"],
				["FIRST", "SECOND"],
			),
		).toThrowError(
			new TypeError("Conflicting error OpenAPI response header metadata."),
		);
	});

	it("rejects invalid runtime codes with a fixed error", () => {
		const invalidCodes = ["BAD_REQUEST", "PRIVATE_VENDOR_FAILURE"];
		const notAnArray = {};

		expect(() =>
			Reflect.apply(errorOpenApi.responses, undefined, [invalidCodes]),
		).toThrowError(
			new TypeError("OpenAPI responses require canonical error codes."),
		);
		expect(() =>
			Reflect.apply(errorOpenApi.responses, undefined, [notAnArray]),
		).toThrowError(
			new TypeError("OpenAPI responses require canonical error codes."),
		);
		expect(Object.keys(errorOpenApi)).toEqual(["responses"]);
		expect(Object.isFrozen(errorOpenApi)).toBe(true);
	});
});

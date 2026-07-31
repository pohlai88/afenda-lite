/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { ERROR_LIMITS } from "./bounds";

export type ErrorOpenApiStringSchema = Readonly<{
	type: "string";
	description?: string;
	enum?: readonly string[];
	maxLength?: number;
	minLength?: number;
	pattern?: string;
}>;

export type ErrorOpenApiIntegerSchema = Readonly<{
	type: "integer";
	description?: string;
	maximum?: number;
	minimum?: number;
}>;

export type ErrorOpenApiArraySchema = Readonly<{
	type: "array";
	items: ErrorOpenApiSchema;
	description?: string;
	maxItems?: number;
	minItems?: number;
}>;

export type ErrorOpenApiObjectSchema = Readonly<{
	type: "object";
	additionalProperties: false | ErrorOpenApiSchema;
	properties: Readonly<Record<string, ErrorOpenApiSchema>>;
	description?: string;
	maxProperties?: number;
	minProperties?: number;
	required?: readonly string[];
}>;

export type ErrorOpenApiSchema =
	| ErrorOpenApiArraySchema
	| ErrorOpenApiIntegerSchema
	| ErrorOpenApiObjectSchema
	| ErrorOpenApiStringSchema;

export type ErrorOpenApiHeader = Readonly<{
	description: string;
	schema: ErrorOpenApiSchema;
}>;

export type ErrorOpenApiPolicy = Readonly<{
	description: string;
	headers: Readonly<Record<string, ErrorOpenApiHeader>>;
}>;

/** Sole schema/description source for registry-owned Retry-After projection. */
export const ERROR_RETRY_AFTER_HEADER: ErrorOpenApiHeader = Object.freeze({
	description: "Seconds to wait before retrying the request",
	schema: Object.freeze({
		type: "integer",
		maximum: ERROR_LIMITS.retryAfterSecondsMaximum,
		minimum: ERROR_LIMITS.retryAfterSecondsMinimum,
	}),
});

const MAXIMUM_SCHEMA_DEPTH = 8;

function freezeSchemaRecord(
	properties: Readonly<Record<string, ErrorOpenApiSchema>>,
	seen: WeakSet<object>,
	depth: number,
): Readonly<Record<string, ErrorOpenApiSchema>> {
	return Object.freeze(
		Object.fromEntries(
			Object.entries(properties).map(([name, schema]) => [
				name,
				freezeSchema(schema, seen, depth),
			]),
		),
	);
}

function freezeAdditionalProperties(
	additionalProperties: false | ErrorOpenApiSchema,
	seen: WeakSet<object>,
	depth: number,
): false | ErrorOpenApiSchema {
	return additionalProperties === false
		? false
		: freezeSchema(additionalProperties, seen, depth);
}

function freezeSchema(
	schema: ErrorOpenApiSchema,
	seen: WeakSet<object>,
	depth: number,
): ErrorOpenApiSchema {
	if (depth > MAXIMUM_SCHEMA_DEPTH || seen.has(schema)) {
		throw new TypeError("Invalid recursive error OpenAPI schema metadata.");
	}
	seen.add(schema);
	try {
		switch (schema.type) {
			case "array":
				return Object.freeze({
					...schema,
					items: freezeSchema(schema.items, seen, depth + 1),
				});
			case "integer":
				return Object.freeze({ ...schema });
			case "object": {
				const { required, ...schemaWithoutRequired } = schema;
				const frozenObject = {
					...schemaWithoutRequired,
					additionalProperties: freezeAdditionalProperties(
						schema.additionalProperties,
						seen,
						depth + 1,
					),
					properties: freezeSchemaRecord(schema.properties, seen, depth + 1),
				};
				return Object.freeze(
					required === undefined
						? frozenObject
						: { ...frozenObject, required: Object.freeze([...required]) },
				);
			}
			case "string": {
				const { enum: values, ...schemaWithoutEnum } = schema;
				return Object.freeze(
					values === undefined
						? schemaWithoutEnum
						: { ...schemaWithoutEnum, enum: Object.freeze([...values]) },
				);
			}
			default:
				throw new TypeError("Unsupported error OpenAPI schema metadata.");
		}
	} finally {
		seen.delete(schema);
	}
}

export function freezeErrorOpenApiSchema(
	schema: ErrorOpenApiSchema,
): ErrorOpenApiSchema {
	return freezeSchema(schema, new WeakSet<object>(), 1);
}

export function freezeErrorOpenApiHeaders(
	headers: Readonly<Record<string, ErrorOpenApiHeader>>,
): Readonly<Record<string, ErrorOpenApiHeader>> {
	return Object.freeze(
		Object.fromEntries(
			Object.entries(headers).map(([name, header]) => [
				name,
				Object.freeze({
					...header,
					description: header.description,
					schema: freezeErrorOpenApiSchema(header.schema),
				}),
			]),
		),
	);
}

export function freezeErrorOpenApiPolicy(
	policy: ErrorOpenApiPolicy,
): ErrorOpenApiPolicy {
	return Object.freeze({
		...policy,
		description: policy.description,
		headers: freezeErrorOpenApiHeaders(policy.headers),
	});
}

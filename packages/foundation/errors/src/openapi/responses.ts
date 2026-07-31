/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { ERROR_LIMITS } from "../contract/bounds";
import type { PublicMessagePolicy } from "../contract/define-error";
import {
	type ErrorOpenApiHeader,
	type ErrorOpenApiSchema,
	freezeErrorOpenApiSchema,
} from "../contract/openapi-metadata";
import { CANONICAL_ERROR_CODES, ERROR_REGISTRY } from "../contract/registry";
import type { CanonicalErrorCode } from "../public-types";
import type {
	ErrorOpenApiBodySchema,
	ErrorOpenApiResponseHeader,
	OpenApiCodeTuple,
	OpenApiErrorResponse,
	OpenApiResponsesProjection,
} from "./types";

const INVALID_CODES_ERROR_MESSAGE =
	"OpenAPI responses require canonical error codes.";
const HEADER_CONFLICT_ERROR_MESSAGE =
	"Conflicting error OpenAPI response header metadata.";

export type ErrorOpenApiProjectionDefinition = Readonly<{
	code: string;
	details: Readonly<{
		openApi: Readonly<{ schema: ErrorOpenApiSchema | null }>;
	}>;
	http: Readonly<{ status: number }>;
	openApi: Readonly<{
		description: string;
		headers: Readonly<Record<string, ErrorOpenApiHeader>>;
	}>;
	public: Readonly<{
		defaultMessage: string;
		messageKey: `errors.${string}`;
		messagePolicy: PublicMessagePolicy;
	}>;
}>;

export type ErrorOpenApiProjectionRegistry = Readonly<
	Record<string, ErrorOpenApiProjectionDefinition>
>;

type SelectedDefinition = Readonly<{
	definition: ErrorOpenApiProjectionDefinition;
	order: number;
}>;

function invalidCodes(): never {
	throw new TypeError(INVALID_CODES_ERROR_MESSAGE);
}

function selectedDefinitions(
	registry: ErrorOpenApiProjectionRegistry,
	canonicalOrder: readonly string[],
	input: unknown,
): readonly SelectedDefinition[] {
	try {
		if (!Array.isArray(input)) {
			return invalidCodes();
		}
		const selectedCodes = new Set<string>();
		for (let index = 0; index < input.length; index += 1) {
			const code = Reflect.get(input, index);
			if (
				typeof code !== "string" ||
				!Object.hasOwn(registry, code) ||
				registry[code]?.code !== code
			) {
				return invalidCodes();
			}
			selectedCodes.add(code);
		}

		const ordered = canonicalOrder.flatMap((code, order) => {
			const definition = registry[code];
			return selectedCodes.has(code) && definition !== undefined
				? [Object.freeze({ definition, order })]
				: [];
		});
		if (ordered.length !== selectedCodes.size) {
			return invalidCodes();
		}
		return Object.freeze(ordered);
	} catch {
		return invalidCodes();
	}
}

function optionalScalarEqual(
	left: string | number | undefined,
	right: string | number | undefined,
): boolean {
	return left === right;
}

function arraysEqual(
	left: readonly string[] | undefined,
	right: readonly string[] | undefined,
): boolean {
	if (left === undefined || right === undefined) {
		return left === right;
	}
	return (
		left.length === right.length &&
		left.every((value, index) => value === right[index])
	);
}

function schemaRecordsEqual(
	left: Readonly<Record<string, ErrorOpenApiSchema>>,
	right: Readonly<Record<string, ErrorOpenApiSchema>>,
): boolean {
	const leftKeys = Object.keys(left).sort();
	const rightKeys = Object.keys(right).sort();
	return (
		arraysEqual(leftKeys, rightKeys) &&
		leftKeys.every((key) => {
			const leftSchema = left[key];
			const rightSchema = right[key];
			return (
				leftSchema !== undefined &&
				rightSchema !== undefined &&
				schemasEqual(leftSchema, rightSchema)
			);
		})
	);
}

function additionalPropertiesEqual(
	left: false | ErrorOpenApiSchema,
	right: false | ErrorOpenApiSchema,
): boolean {
	if (left === false || right === false) {
		return left === right;
	}
	return schemasEqual(left, right);
}

function schemasEqual(
	left: ErrorOpenApiSchema,
	right: ErrorOpenApiSchema,
): boolean {
	if (left.type !== right.type || left.description !== right.description) {
		return false;
	}
	switch (left.type) {
		case "array":
			return (
				right.type === "array" &&
				optionalScalarEqual(left.maxItems, right.maxItems) &&
				optionalScalarEqual(left.minItems, right.minItems) &&
				schemasEqual(left.items, right.items)
			);
		case "integer":
			return (
				right.type === "integer" &&
				optionalScalarEqual(left.maximum, right.maximum) &&
				optionalScalarEqual(left.minimum, right.minimum)
			);
		case "object":
			return (
				right.type === "object" &&
				additionalPropertiesEqual(
					left.additionalProperties,
					right.additionalProperties,
				) &&
				optionalScalarEqual(left.maxProperties, right.maxProperties) &&
				optionalScalarEqual(left.minProperties, right.minProperties) &&
				arraysEqual(left.required, right.required) &&
				schemaRecordsEqual(left.properties, right.properties)
			);
		case "string":
			return (
				right.type === "string" &&
				arraysEqual(left.enum, right.enum) &&
				optionalScalarEqual(left.maxLength, right.maxLength) &&
				optionalScalarEqual(left.minLength, right.minLength) &&
				optionalScalarEqual(left.pattern, right.pattern)
			);
		default:
			return false;
	}
}

function headersCompatible(
	left: ErrorOpenApiHeader,
	right: ErrorOpenApiHeader,
): boolean {
	return (
		left.description === right.description &&
		schemasEqual(left.schema, right.schema)
	);
}

function freezeResponseHeader(
	header: ErrorOpenApiHeader,
): ErrorOpenApiResponseHeader {
	return Object.freeze({
		description: header.description,
		schema: freezeErrorOpenApiSchema(header.schema),
	});
}

function mergedHeaders(
	definitions: readonly SelectedDefinition[],
): Readonly<Record<string, ErrorOpenApiResponseHeader>> | undefined {
	const byLowercaseName = new Map<
		string,
		Readonly<{
			canonicalName: string;
			metadata: ErrorOpenApiHeader;
			projection: ErrorOpenApiResponseHeader;
		}>
	>();

	for (const { definition } of definitions) {
		for (const [name, metadata] of Object.entries(definition.openApi.headers)) {
			const lowercaseName = name.toLowerCase();
			const existing = byLowercaseName.get(lowercaseName);
			if (existing !== undefined) {
				if (!headersCompatible(existing.metadata, metadata)) {
					throw new TypeError(HEADER_CONFLICT_ERROR_MESSAGE);
				}
				continue;
			}
			byLowercaseName.set(
				lowercaseName,
				Object.freeze({
					canonicalName: name,
					metadata,
					projection: freezeResponseHeader(metadata),
				}),
			);
		}
	}

	if (byLowercaseName.size === 0) {
		return;
	}
	return Object.freeze(
		Object.fromEntries(
			[...byLowercaseName.values()].map(({ canonicalName, projection }) => [
				canonicalName,
				projection,
			]),
		),
	);
}

function messageSchema(
	definition: ErrorOpenApiProjectionDefinition,
): ErrorOpenApiSchema {
	return definition.public.messagePolicy === "fixed"
		? freezeErrorOpenApiSchema({
				type: "string",
				enum: [definition.public.defaultMessage],
			})
		: freezeErrorOpenApiSchema({
				type: "string",
				maxLength: ERROR_LIMITS.publicMessageCharacters,
				minLength: 1,
			});
}

function composedObjectSchema(
	properties: Readonly<Record<string, ErrorOpenApiSchema>>,
	required: readonly string[],
): ErrorOpenApiSchema {
	return Object.freeze({
		type: "object",
		additionalProperties: false,
		properties: Object.freeze({ ...properties }),
		required: Object.freeze([...required]),
	});
}

function publicErrorSchema(
	definition: ErrorOpenApiProjectionDefinition,
): ErrorOpenApiSchema {
	const detailsSchema = definition.details.openApi.schema;
	const properties: Record<string, ErrorOpenApiSchema> = {
		code: freezeErrorOpenApiSchema({
			type: "string",
			enum: [definition.code],
		}),
		message: messageSchema(definition),
		messageKey: freezeErrorOpenApiSchema({
			type: "string",
			enum: [definition.public.messageKey],
		}),
	};
	if (detailsSchema !== null) {
		properties.details = freezeErrorOpenApiSchema(detailsSchema);
	}
	return composedObjectSchema(properties, ["code", "message", "messageKey"]);
}

function wrappedErrorSchema(
	definition: ErrorOpenApiProjectionDefinition,
): ErrorOpenApiSchema {
	return composedObjectSchema({ error: publicErrorSchema(definition) }, [
		"error",
	]);
}

function responseBodySchema(
	definitions: readonly SelectedDefinition[],
): ErrorOpenApiBodySchema {
	const variants = Object.freeze(
		definitions.map(({ definition }) => wrappedErrorSchema(definition)),
	);
	const [onlyVariant] = variants;
	return variants.length === 1 && onlyVariant !== undefined
		? onlyVariant
		: Object.freeze({ oneOf: variants });
}

function responseDescription(
	definitions: readonly SelectedDefinition[],
): string {
	return definitions
		.map(({ definition }) => definition.openApi.description)
		.join("; ");
}

function responseForDefinitions(
	definitions: readonly SelectedDefinition[],
): OpenApiErrorResponse {
	const headers = mergedHeaders(definitions);
	const response = {
		content: Object.freeze({
			"application/json": Object.freeze({
				schema: responseBodySchema(definitions),
			}),
		}),
		description: responseDescription(definitions),
		...(headers === undefined ? {} : { headers }),
	};
	return Object.freeze(response);
}

/** Internal seam used by contract tests to prove header merge conflict policy. */
export function projectErrorOpenApiResponsesFromRegistry(
	registry: ErrorOpenApiProjectionRegistry,
	canonicalOrder: readonly string[],
	input: unknown,
): Readonly<Record<number, OpenApiErrorResponse>> {
	const selected = selectedDefinitions(registry, canonicalOrder, input);
	const groups = new Map<number, SelectedDefinition[]>();
	for (const item of selected) {
		const { definition } = item;
		const { status } = definition.http;
		const group = groups.get(status);
		if (group === undefined) {
			groups.set(status, [item]);
		} else {
			group.push(item);
		}
	}

	return Object.freeze(
		Object.fromEntries(
			[...groups.entries()]
				.sort(([left], [right]) => left - right)
				.map(([status, definitions]) => [
					status,
					responseForDefinitions(definitions),
				]),
		),
	);
}

export function projectErrorOpenApiResponses<
	const Codes extends readonly CanonicalErrorCode[],
>(codes: Codes & OpenApiCodeTuple<Codes>): OpenApiResponsesProjection<Codes> {
	return projectErrorOpenApiResponsesFromRegistry(
		ERROR_REGISTRY,
		CANONICAL_ERROR_CODES,
		codes,
	) as OpenApiResponsesProjection<Codes>;
}

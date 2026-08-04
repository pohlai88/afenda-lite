/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import { isValidDefaultPublicMessage } from "../security/normalize";
import { ERROR_LIMITS, isValidMessageKey } from "./bounds";
import type { ErrorDefinition, PublicMessagePolicy } from "./define-error";
import type { PublicDetailsContract } from "./details";
import type { ErrorOpenApiSchema } from "./openapi-metadata";

type RegistryDefinition = ErrorDefinition<
	string,
	`errors.${string}`,
	PublicDetailsContract<string, unknown, unknown, string | null>,
	PublicMessagePolicy
>;

const ERROR_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/u;
const LIFECYCLE_MONTH_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])$/u;
const ERROR_CATEGORIES = new Set([
	"authentication",
	"authorization",
	"availability",
	"concurrency",
	"internal",
	"request",
	"resource",
]);
const DETAILS_KINDS = new Set([
	"correlation",
	"field-errors",
	"none",
	"retry-after",
]);
const MESSAGE_POLICIES = new Set(["fixed", "sanitized-override"]);
const RETRY_AFTER_POLICIES = new Set(["details.retryAfterSeconds", "never"]);
const SEVERITIES = new Set(["error", "info", "warning"]);
const HTTP_HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;

function invariant(condition: boolean, message: string): asserts condition {
	if (!condition) {
		throw new Error(`Invalid @afenda/errors registry: ${message}`);
	}
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactOwnKeys(
	owner: string,
	value: Readonly<Record<string, unknown>>,
	allowedKeys: readonly string[],
): void {
	const allowed = new Set<PropertyKey>(allowedKeys);
	invariant(
		Reflect.ownKeys(value).every((key) => allowed.has(key)),
		`${owner} has unsupported metadata fields`,
	);
}

function isOptionalNonEmptyString(value: unknown): boolean {
	return (
		value === undefined ||
		(typeof value === "string" && value.trim().length > 0)
	);
}

function isOptionalNonNegativeInteger(value: unknown): boolean {
	return (
		value === undefined ||
		(typeof value === "number" && Number.isInteger(value) && value >= 0)
	);
}

type OpenApiSchemaRecord = Readonly<Record<string, unknown>>;

function assertOrderedBounds(
	owner: string,
	minimum: unknown,
	maximum: unknown,
	kind: string,
): void {
	invariant(
		isOptionalNonNegativeInteger(minimum) &&
			isOptionalNonNegativeInteger(maximum),
		`${owner} has invalid OpenAPI ${kind} bounds`,
	);
	if (typeof minimum === "number" && typeof maximum === "number") {
		invariant(
			minimum <= maximum,
			`${owner} has inverted OpenAPI ${kind} bounds`,
		);
	}
}

function assertStringSchema(owner: string, schema: OpenApiSchemaRecord): void {
	assertExactOwnKeys(owner, schema, [
		"description",
		"enum",
		"maxLength",
		"minLength",
		"pattern",
		"type",
	]);
	assertOrderedBounds(owner, schema.minLength, schema.maxLength, "string");
	invariant(
		schema.pattern === undefined || typeof schema.pattern === "string",
		`${owner} has an invalid OpenAPI string pattern`,
	);
	invariant(
		schema.enum === undefined ||
			(Array.isArray(schema.enum) &&
				schema.enum.length > 0 &&
				schema.enum.every((value) => typeof value === "string") &&
				new Set(schema.enum).size === schema.enum.length),
		`${owner} has an invalid OpenAPI string enum`,
	);
}

function assertIntegerSchema(owner: string, schema: OpenApiSchemaRecord): void {
	assertExactOwnKeys(owner, schema, [
		"description",
		"maximum",
		"minimum",
		"type",
	]);
	const { maximum, minimum } = schema;
	invariant(
		(minimum === undefined ||
			(typeof minimum === "number" && Number.isInteger(minimum))) &&
			(maximum === undefined ||
				(typeof maximum === "number" && Number.isInteger(maximum))),
		`${owner} has invalid OpenAPI integer bounds`,
	);
	if (typeof minimum === "number" && typeof maximum === "number") {
		invariant(
			minimum <= maximum,
			`${owner} has inverted OpenAPI integer bounds`,
		);
	}
}

function assertArraySchema(
	owner: string,
	schema: OpenApiSchemaRecord,
	ancestors: WeakSet<object>,
): void {
	assertExactOwnKeys(owner, schema, [
		"description",
		"items",
		"maxItems",
		"minItems",
		"type",
	]);
	assertOrderedBounds(owner, schema.minItems, schema.maxItems, "array");
	assertOpenApiSchema(`${owner}.items`, schema.items, ancestors);
}

function assertObjectSchema(
	owner: string,
	schema: OpenApiSchemaRecord,
	ancestors: WeakSet<object>,
): void {
	assertExactOwnKeys(owner, schema, [
		"additionalProperties",
		"description",
		"maxProperties",
		"minProperties",
		"properties",
		"required",
		"type",
	]);
	const { properties } = schema;
	invariant(
		isRecord(properties),
		`${owner} has invalid OpenAPI object properties`,
	);
	assertOrderedBounds(
		owner,
		schema.minProperties,
		schema.maxProperties,
		"object",
	);
	for (const [name, propertySchema] of Object.entries(properties)) {
		invariant(name.length > 0, `${owner} has an empty OpenAPI property name`);
		assertOpenApiSchema(`${owner}.${name}`, propertySchema, ancestors);
	}
	invariant(
		schema.required === undefined ||
			(Array.isArray(schema.required) &&
				schema.required.every(
					(name) => typeof name === "string" && Object.hasOwn(properties, name),
				) &&
				new Set(schema.required).size === schema.required.length),
		`${owner} has invalid OpenAPI required properties`,
	);
	if (schema.additionalProperties !== false) {
		assertOpenApiSchema(
			`${owner}.additionalProperties`,
			schema.additionalProperties,
			ancestors,
		);
	}
}

function assertOpenApiSchema(
	owner: string,
	schema: unknown,
	ancestors = new WeakSet<object>(),
): asserts schema is ErrorOpenApiSchema {
	invariant(isRecord(schema), `${owner} has an invalid OpenAPI schema`);
	invariant(!ancestors.has(schema), `${owner} has a recursive OpenAPI schema`);
	ancestors.add(schema);
	try {
		invariant(
			isOptionalNonEmptyString(schema.description),
			`${owner} has an invalid OpenAPI schema description`,
		);
		if (schema.type === "string") {
			assertStringSchema(owner, schema);
			return;
		}
		if (schema.type === "integer") {
			assertIntegerSchema(owner, schema);
			return;
		}
		if (schema.type === "array") {
			assertArraySchema(owner, schema, ancestors);
			return;
		}
		if (schema.type === "object") {
			assertObjectSchema(owner, schema, ancestors);
			return;
		}
		invariant(false, `${owner} has an unsupported OpenAPI schema type`);
	} finally {
		ancestors.delete(schema);
	}
}

function assertOpenApiPolicy(
	key: string,
	openApi: unknown,
): asserts openApi is Readonly<Record<string, unknown>> {
	invariant(isRecord(openApi), `${key} has no OpenAPI policy`);
	assertExactOwnKeys(`${key}.openApi`, openApi, ["description", "headers"]);
	invariant(
		typeof openApi.description === "string" &&
			openApi.description.trim().length > 0,
		`${key} has an invalid OpenAPI description`,
	);
	invariant(isRecord(openApi.headers), `${key} has invalid OpenAPI headers`);
	const normalizedHeaderNames = new Set<string>();
	for (const [headerName, header] of Object.entries(openApi.headers)) {
		invariant(
			headerName.trim().length > 0 &&
				headerName.trim() === headerName &&
				HTTP_HEADER_NAME_PATTERN.test(headerName) &&
				!normalizedHeaderNames.has(headerName.toLowerCase()),
			`${key} has an invalid or duplicate OpenAPI header`,
		);
		normalizedHeaderNames.add(headerName.toLowerCase());
		invariant(isRecord(header), `${key}.${headerName} has invalid header data`);
		assertExactOwnKeys(`${key}.${headerName}`, header, [
			"description",
			"schema",
		]);
		invariant(
			typeof header.description === "string" &&
				header.description.trim().length > 0,
			`${key}.${headerName} has an invalid header description`,
		);
		assertOpenApiSchema(`${key}.${headerName}`, header.schema);
	}
}

function assertRetryAfterHeaderPolicy(
	key: string,
	openApi: Readonly<Record<string, unknown>>,
	retryAfter: unknown,
): void {
	const { headers } = openApi;
	invariant(isRecord(headers), `${key} has invalid OpenAPI headers`);
	const retryAfterEntry = Object.entries(headers).find(
		([name]) => name.toLowerCase() === "retry-after",
	);
	if (retryAfter !== "details.retryAfterSeconds") {
		invariant(
			retryAfterEntry === undefined,
			`${key} exposes Retry-After without canonical timing details`,
		);
		return;
	}
	invariant(
		retryAfterEntry !== undefined,
		`${key} has canonical retry timing without Retry-After`,
	);
	const [, header] = retryAfterEntry;
	invariant(isRecord(header), `${key} has invalid Retry-After metadata`);
	const { schema } = header;
	invariant(
		isRecord(schema) &&
			schema.type === "integer" &&
			schema.minimum === ERROR_LIMITS.retryAfterSecondsMinimum &&
			schema.maximum === ERROR_LIMITS.retryAfterSecondsMaximum,
		`${key} Retry-After bounds differ from canonical retry timing`,
	);
}

function assertDefinition(
	key: string,
	definition: unknown,
): asserts definition is RegistryDefinition {
	invariant(isRecord(definition), `${key} is not a definition object`);
	const {
		aliases,
		category,
		code,
		details,
		http,
		lifecycle,
		openApi,
		operations,
		public: publicPolicy,
		retry,
	} = definition;
	invariant(
		Array.isArray(aliases) &&
			aliases.every((alias) => typeof alias === "string"),
		`${key} has invalid aliases`,
	);
	invariant(
		typeof category === "string" && ERROR_CATEGORIES.has(category),
		`${key} has an invalid category`,
	);
	invariant(code === key, `${key} must declare code ${key}`);
	invariant(
		ERROR_NAME_PATTERN.test(key),
		`${key} is not a canonical code name`,
	);
	invariant(isRecord(publicPolicy), `${key} has no public policy`);
	const { defaultMessage, messageKey, messagePolicy } = publicPolicy;
	invariant(
		typeof messagePolicy === "string" && MESSAGE_POLICIES.has(messagePolicy),
		`${key} has an invalid public message policy`,
	);
	invariant(isValidMessageKey(messageKey), `${key} has an invalid messageKey`);
	invariant(
		isValidDefaultPublicMessage(defaultMessage),
		`${key} has an invalid default public message`,
	);
	invariant(isRecord(http), `${key} has no HTTP policy`);
	const { status } = http;
	invariant(
		typeof status === "number" &&
			Number.isInteger(status) &&
			status >= 400 &&
			status <= 599,
		`${key} has an invalid HTTP status`,
	);
	invariant(isRecord(lifecycle), `${key} has no lifecycle policy`);
	const {
		introduced,
		replacedBy,
		retired,
		status: lifecycleStatus,
	} = lifecycle;
	invariant(
		typeof introduced === "string" && LIFECYCLE_MONTH_PATTERN.test(introduced),
		`${key} has an invalid introduction month`,
	);
	invariant(
		lifecycleStatus === "active" && retired === null && replacedBy === null,
		`${key} has an inconsistent active lifecycle`,
	);
	assertOpenApiPolicy(key, openApi);
	invariant(isRecord(operations), `${key} has an invalid operations policy`);
	invariant(
		typeof operations.operational === "boolean" &&
			typeof operations.severity === "string" &&
			SEVERITIES.has(operations.severity),
		`${key} has an invalid operations policy`,
	);
	invariant(isRecord(retry), `${key} has no retry policy`);
	const { retryAfter, retryable } = retry;
	invariant(
		typeof retryable === "boolean" &&
			typeof retryAfter === "string" &&
			RETRY_AFTER_POLICIES.has(retryAfter),
		`${key} has an invalid retry policy`,
	);
	invariant(isRecord(details), `${key} has no details policy`);
	const {
		kind: detailsKind,
		normalize,
		openApi: detailsOpenApi,
		publicKeys,
		staticFieldMessageProperty,
	} = details;
	invariant(isRecord(detailsOpenApi), `${key} has no details OpenAPI policy`);
	assertExactOwnKeys(`${key}.details.openApi`, detailsOpenApi, ["schema"]);
	invariant(
		typeof detailsKind === "string" &&
			DETAILS_KINDS.has(detailsKind) &&
			typeof normalize === "function" &&
			Array.isArray(publicKeys) &&
			publicKeys.every((publicKey) => typeof publicKey === "string"),
		`${key} has an invalid details policy`,
	);
	if (detailsKind === "none") {
		invariant(
			detailsOpenApi.schema === null,
			`${key} has a schema for absent public details`,
		);
	} else {
		assertOpenApiSchema(`${key}.details`, detailsOpenApi.schema);
	}
	invariant(
		new Set(publicKeys).size === publicKeys.length,
		`${key} repeats a public details key`,
	);
	invariant(
		staticFieldMessageProperty === null ||
			(typeof staticFieldMessageProperty === "string" &&
				publicKeys.includes(staticFieldMessageProperty)),
		`${key} has an invalid static field-message policy`,
	);
	if (retryAfter === "details.retryAfterSeconds") {
		invariant(
			detailsKind === "retry-after" && retryable,
			`${key} has an incoherent retry timing policy`,
		);
	}
	if (detailsKind === "retry-after") {
		invariant(
			retryAfter === "details.retryAfterSeconds" && retryable,
			`${key} has retry details without a coherent retry timing policy`,
		);
	}
	assertRetryAfterHeaderPolicy(key, openApi, retryAfter);
}

/** Validates completeness, code/key parity, aliases, lifecycle, and uniqueness. */
export function assertErrorRegistry(
	registry: unknown,
	expectedCodes: readonly string[],
	historicalAliases: Readonly<Record<string, string>>,
	reservedHistoricalNames: readonly string[],
): void {
	invariant(isRecord(registry), "registry is not an object");
	const keys = Object.keys(registry);
	invariant(
		keys.length === expectedCodes.length,
		`expected ${expectedCodes.length} canonical definitions, received ${keys.length}`,
	);
	const expected = new Set(expectedCodes);
	for (const code of expectedCodes) {
		invariant(
			Object.hasOwn(registry, code),
			`missing canonical definition ${code}`,
		);
	}
	const definitions: RegistryDefinition[] = [];
	for (const key of keys) {
		invariant(expected.has(key), `unexpected canonical definition ${key}`);
		const definition = registry[key];
		invariant(definition !== undefined, `definition ${key} is unreadable`);
		assertDefinition(key, definition);
		definitions.push(definition);
	}

	const canonical = new Set(keys);
	const messageKeys = new Set<string>();
	const aliases = new Map<string, string>();
	for (const definition of definitions) {
		invariant(
			!messageKeys.has(definition.public.messageKey),
			`duplicate messageKey ${definition.public.messageKey}`,
		);
		messageKeys.add(definition.public.messageKey);
		for (const alias of definition.aliases) {
			invariant(ERROR_NAME_PATTERN.test(alias), `invalid alias ${alias}`);
			invariant(!canonical.has(alias), `alias ${alias} is also canonical`);
			invariant(!aliases.has(alias), `alias ${alias} has multiple meanings`);
			aliases.set(alias, definition.code);
		}
	}

	for (const [alias, code] of Object.entries(historicalAliases)) {
		invariant(aliases.get(alias) === code, `alias ledger drift for ${alias}`);
	}
	invariant(
		aliases.size === Object.keys(historicalAliases).length,
		"definition aliases and the historical ledger differ",
	);

	for (const reservedName of reservedHistoricalNames) {
		invariant(
			!canonical.has(reservedName),
			`reserved historical name ${reservedName} is canonical`,
		);
		const aliasMeaning = aliases.get(reservedName);
		if (aliasMeaning !== undefined) {
			invariant(
				historicalAliases[reservedName] === aliasMeaning,
				`reserved alias ${reservedName} is absent from the ledger`,
			);
		}
	}
}

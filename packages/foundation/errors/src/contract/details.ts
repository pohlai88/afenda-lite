/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { readProperty } from "../internal/object";
import {
	normalizeCorrelationId,
	normalizePublicFieldErrors,
	normalizeRetryAfterSeconds,
} from "../security/normalize";
import { CORRELATION_ID_PATTERN, ERROR_LIMITS } from "./bounds";
import {
	type ErrorOpenApiSchema,
	freezeErrorOpenApiSchema,
} from "./openapi-metadata";

declare const retryAfterSecondsBrand: unique symbol;

/** Integer seconds validated within the canonical 1..86,400 range. */
export type RetryAfterSeconds = number & {
	readonly [retryAfterSecondsBrand]: "RetryAfterSeconds";
};

export type PublicFieldErrors = Readonly<Record<string, readonly string[]>>;

/** Undefined entries are accepted at construction and removed canonically. */
export type PublicFieldErrorsInput = Readonly<
	Record<string, readonly (string | undefined)[] | undefined>
>;

export type NoPublicDetailsInput = Readonly<Record<never, never>>;

export type ValidationDetailsInput = Readonly<{
	fieldErrors?: PublicFieldErrorsInput;
}>;

export type RateLimitDetailsInput = Readonly<{
	retryAfterSeconds?: RetryAfterSeconds;
}>;

export type InternalDetailsInput = Readonly<{
	correlationId?: string;
}>;

export type PublicDetailsContract<
	Kind extends string,
	Output,
	Input,
	StaticFieldMessageProperty extends string | null = string | null,
> = Readonly<{
	kind: Kind;
	normalize: (input: unknown) => Output;
	openApi: Readonly<{
		schema: ErrorOpenApiSchema | null;
	}>;
	publicKeys: readonly string[];
	staticFieldMessageProperty: StaticFieldMessageProperty;
	/** Type-only construction input carried by the descriptor. */
	readonly __input?: Input;
}>;

export type PublicDetailsOutputOf<Contract> =
	Contract extends PublicDetailsContract<
		string,
		infer Output,
		unknown,
		string | null
	>
		? Output
		: never;

export type PublicDetailsInputOf<Contract> =
	Contract extends PublicDetailsContract<
		string,
		unknown,
		infer Input,
		string | null
	>
		? Input
		: never;

export function noPublicDetails(): PublicDetailsContract<
	"none",
	undefined,
	NoPublicDetailsInput,
	null
> {
	return Object.freeze({
		kind: "none",
		normalize: () => undefined,
		openApi: Object.freeze({
			schema: null,
		}),
		publicKeys: Object.freeze([]),
		staticFieldMessageProperty: null,
	});
}

export function validationDetails(): PublicDetailsContract<
	"field-errors",
	Readonly<{ fieldErrors: PublicFieldErrors }> | undefined,
	ValidationDetailsInput,
	"fieldErrors"
> {
	return Object.freeze({
		kind: "field-errors",
		normalize: (input: unknown) => {
			const fieldErrors = normalizePublicFieldErrors(
				readProperty(input, "fieldErrors"),
			);
			return fieldErrors === undefined
				? undefined
				: Object.freeze({ fieldErrors });
		},
		openApi: Object.freeze({
			schema: freezeErrorOpenApiSchema({
				type: "object",
				additionalProperties: false,
				properties: {
					fieldErrors: {
						type: "object",
						additionalProperties: {
							type: "array",
							items: {
								type: "string",
								maxLength: ERROR_LIMITS.fieldMessageCharacters,
								minLength: 1,
							},
							maxItems: ERROR_LIMITS.fieldMessagesPerField,
							minItems: 1,
						},
						maxProperties: ERROR_LIMITS.fieldCount,
						minProperties: 1,
						properties: {},
					},
				},
				required: ["fieldErrors"],
			}),
		}),
		publicKeys: Object.freeze(["fieldErrors"]),
		staticFieldMessageProperty: "fieldErrors",
	});
}

export function rateLimitDetails(): PublicDetailsContract<
	"retry-after",
	Readonly<{ retryAfterSeconds: RetryAfterSeconds }> | undefined,
	RateLimitDetailsInput,
	null
> {
	return Object.freeze({
		kind: "retry-after",
		normalize: (input: unknown) => {
			const retryAfter = normalizeRetryAfterSeconds(
				readProperty(input, "retryAfterSeconds"),
			);
			return retryAfter === undefined
				? undefined
				: Object.freeze({ retryAfterSeconds: retryAfter });
		},
		openApi: Object.freeze({
			schema: freezeErrorOpenApiSchema({
				type: "object",
				additionalProperties: false,
				properties: {
					retryAfterSeconds: {
						type: "integer",
						maximum: ERROR_LIMITS.retryAfterSecondsMaximum,
						minimum: ERROR_LIMITS.retryAfterSecondsMinimum,
					},
				},
				required: ["retryAfterSeconds"],
			}),
		}),
		publicKeys: Object.freeze(["retryAfterSeconds"]),
		staticFieldMessageProperty: null,
	});
}

export function internalDetails(): PublicDetailsContract<
	"correlation",
	Readonly<{ correlationId: string }> | undefined,
	InternalDetailsInput,
	null
> {
	return Object.freeze({
		kind: "correlation",
		normalize: (input: unknown) => {
			const correlationId = normalizeCorrelationId(
				readProperty(input, "correlationId"),
			);
			return correlationId === undefined
				? undefined
				: Object.freeze({ correlationId });
		},
		openApi: Object.freeze({
			schema: freezeErrorOpenApiSchema({
				type: "object",
				additionalProperties: false,
				properties: {
					correlationId: {
						type: "string",
						maxLength: ERROR_LIMITS.correlationIdCharacters,
						minLength: 1,
						pattern: CORRELATION_ID_PATTERN.source,
					},
				},
				required: ["correlationId"],
			}),
		}),
		publicKeys: Object.freeze(["correlationId"]),
		staticFieldMessageProperty: null,
	});
}

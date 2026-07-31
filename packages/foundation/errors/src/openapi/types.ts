/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import type { ErrorOpenApiSchema } from "../contract/openapi-metadata";
import type { ERROR_REGISTRY } from "../contract/registry";
import type {
	CanonicalErrorCode,
	SingleCanonicalErrorCode,
} from "../public-types";

type Registry = typeof ERROR_REGISTRY;

export type ErrorOpenApiOneOfSchema = Readonly<{
	oneOf: readonly ErrorOpenApiBodySchema[];
}>;

export type ErrorOpenApiBodySchema =
	| ErrorOpenApiOneOfSchema
	| ErrorOpenApiSchema;

export type ErrorOpenApiResponseHeader = Readonly<{
	description: string;
	schema: ErrorOpenApiSchema;
}>;

export type OpenApiErrorResponse = Readonly<{
	content: Readonly<{
		"application/json": Readonly<{
			schema: ErrorOpenApiBodySchema;
		}>;
	}>;
	description: string;
	headers?: Readonly<Record<string, ErrorOpenApiResponseHeader>>;
}>;

export type ErrorOpenApiHttpStatus<Code extends CanonicalErrorCode> =
	Code extends CanonicalErrorCode ? Registry[Code]["http"]["status"] : never;

/** A finite tuple whose every slot is one authored canonical literal. */
export type OpenApiCodeTuple<Codes extends readonly CanonicalErrorCode[]> =
	number extends Codes["length"]
		? never
		: Readonly<{
				[Index in keyof Codes]: Codes[Index] extends CanonicalErrorCode
					? SingleCanonicalErrorCode<Codes[Index]>
					: never;
			}>;

/** Numeric status keys remain exact for every const-authored code selection. */
export type OpenApiResponsesProjection<
	Codes extends readonly CanonicalErrorCode[],
> = number extends Codes["length"]
	? never
	: Codes extends OpenApiCodeTuple<Codes>
		? Readonly<{
				[Status in ErrorOpenApiHttpStatus<Codes[number]>]: OpenApiErrorResponse;
			}>
		: never;

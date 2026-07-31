/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import { type CanonicalErrorCode, errorOpenApi } from "../../../src/index";

// @ts-expect-error Endpoint declarations accept canonical codes only.
errorOpenApi.responses(["TEAPOT"] as const);

const badRequestOnly = errorOpenApi.responses(["BAD_REQUEST"] as const);

// @ts-expect-error Exact projections expose only selected HTTP statuses.
export const { 401: impossibleStatus } = badRequestOnly;

// @ts-expect-error Response projections are immutable.
badRequestOnly[400] = {} as never;

declare const runtimeCodes: string[];

// @ts-expect-error Widened arbitrary strings are not canonical outcome declarations.
errorOpenApi.responses(runtimeCodes);

declare const widenedCanonicalCodes: readonly CanonicalErrorCode[];

// @ts-expect-error Exact status keys require a const-authored code tuple.
errorOpenApi.responses(widenedCanonicalCodes);

declare const dynamicCanonicalCode: CanonicalErrorCode;

// @ts-expect-error Every tuple slot must be one authored canonical literal.
errorOpenApi.responses([dynamicCanonicalCode] as const);

// @ts-expect-error The capability facade intentionally exposes only responses.
export const rejectedRegister = errorOpenApi.register;

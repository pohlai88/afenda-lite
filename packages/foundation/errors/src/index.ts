/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

export { errorIngress } from "./capabilities/ingress";
export { errorOpenApi } from "./capabilities/openapi";
export { errorProject } from "./capabilities/project";
export { errorResult } from "./capabilities/result";
export { errorWire } from "./capabilities/wire";
export type {
	PublicFieldErrors,
	RetryAfterSeconds,
} from "./contract/details";
export type { Failure } from "./failure/types";
export type { OpenApiResponsesProjection } from "./openapi/types";
export type {
	CanonicalErrorCode,
	FailureContext,
	FailureInput,
	MessageKeyFor,
	PublicErrorData,
	Result,
	ResultFailure,
	ResultFailureInput,
	ResultSuccess,
	RetryDisposition,
} from "./public-types";
export type { SerializedFailureEnvelope } from "./wire/types";

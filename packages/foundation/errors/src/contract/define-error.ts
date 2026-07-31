/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */

import type { PublicDetailsContract } from "./details";
import {
	type ErrorOpenApiPolicy,
	freezeErrorOpenApiPolicy,
	freezeErrorOpenApiSchema,
} from "./openapi-metadata";

export type ErrorRetryAfterPolicy = "details.retryAfterSeconds" | "never";

type AnyPublicDetailsContract = PublicDetailsContract<
	string,
	unknown,
	unknown,
	string | null
>;

type AnyRetryPolicy = Readonly<{
	retryAfter: ErrorRetryAfterPolicy;
	retryable: boolean;
}>;

function freezeDetailsContract<const Details extends AnyPublicDetailsContract>(
	details: Details,
): Details;
function freezeDetailsContract(
	details: AnyPublicDetailsContract,
): AnyPublicDetailsContract {
	return Object.freeze({
		...details,
		openApi: Object.freeze({
			...details.openApi,
			schema:
				details.openApi.schema === null
					? null
					: freezeErrorOpenApiSchema(details.openApi.schema),
		}),
		publicKeys: Object.freeze([...details.publicKeys]),
	});
}

function freezeRetryPolicy<const Retry extends AnyRetryPolicy>(
	retry: Retry,
): Retry;
function freezeRetryPolicy(retry: AnyRetryPolicy): AnyRetryPolicy {
	return Object.freeze({ ...retry });
}

export type ErrorCategory =
	| "authentication"
	| "authorization"
	| "availability"
	| "concurrency"
	| "internal"
	| "request"
	| "resource";

export type PublicMessagePolicy = "fixed" | "sanitized-override";

export type ErrorSeverity = "info" | "warning" | "error";

export type ErrorLifecycle = Readonly<{
	introduced: `${number}-${number}`;
	replacedBy: null;
	retired: null;
	status: "active";
}>;

export type ErrorDefinition<
	Code extends string,
	MessageKey extends `errors.${string}`,
	Details extends PublicDetailsContract<
		string,
		unknown,
		unknown,
		string | null
	>,
	MessagePolicy extends PublicMessagePolicy = PublicMessagePolicy,
	Retryable extends boolean = boolean,
	RetryAfter extends ErrorRetryAfterPolicy = ErrorRetryAfterPolicy,
	HttpStatus extends number = number,
> = Readonly<{
	aliases: readonly string[];
	category: ErrorCategory;
	code: Code;
	details: Details;
	http: Readonly<{
		status: HttpStatus;
	}>;
	lifecycle: ErrorLifecycle;
	openApi: ErrorOpenApiPolicy;
	operations: Readonly<{
		operational: boolean;
		severity: ErrorSeverity;
	}>;
	public: Readonly<{
		defaultMessage: string;
		messageKey: MessageKey;
		messagePolicy: MessagePolicy;
	}>;
	retry: Readonly<{
		retryAfter: RetryAfter;
		retryable: Retryable;
	}> &
		(RetryAfter extends "details.retryAfterSeconds"
			? Readonly<{ retryable: true }>
			: unknown) &
		(Retryable extends false ? Readonly<{ retryAfter: "never" }> : unknown);
}>;

/**
 * Requires every semantic field at declaration time and freezes the complete
 * runtime definition. There are no optional policy fields to drift.
 */
export function defineError<
	const Code extends string,
	const MessageKey extends `errors.${string}`,
	const Details extends PublicDetailsContract<
		string,
		unknown,
		unknown,
		string | null
	>,
	const MessagePolicy extends PublicMessagePolicy,
	const Retryable extends boolean,
	const RetryAfter extends ErrorRetryAfterPolicy,
	const HttpStatus extends number,
>(
	definition: ErrorDefinition<
		Code,
		MessageKey,
		Details,
		MessagePolicy,
		Retryable,
		RetryAfter,
		HttpStatus
	>,
): ErrorDefinition<
	Code,
	MessageKey,
	Details,
	MessagePolicy,
	Retryable,
	RetryAfter,
	HttpStatus
> {
	return Object.freeze({
		...definition,
		aliases: Object.freeze([...definition.aliases]),
		details: freezeDetailsContract(definition.details),
		http: Object.freeze({ ...definition.http }),
		lifecycle: Object.freeze({ ...definition.lifecycle }),
		openApi: freezeErrorOpenApiPolicy(definition.openApi),
		operations: Object.freeze({ ...definition.operations }),
		public: Object.freeze({ ...definition.public }),
		retry: freezeRetryPolicy(definition.retry),
	});
}

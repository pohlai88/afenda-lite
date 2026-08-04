/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Sealed: root capabilities only; obey docs/CONTRACT.md and package gates.
 */

import type {
	PublicDetailsInputOf,
	PublicDetailsOutputOf,
	RetryAfterSeconds,
} from "./contract/details";
import type { ERROR_REGISTRY } from "./contract/registry";

type Registry = typeof ERROR_REGISTRY;

declare const retryDispositionBrand: unique symbol;

export type CanonicalErrorCode = keyof Registry;

type DefinitionFor<Code extends CanonicalErrorCode> = Registry[Code];

export type MessageKeyFor<Code extends CanonicalErrorCode> =
	DefinitionFor<Code>["public"]["messageKey"];

export type MessagePolicyFor<Code extends CanonicalErrorCode> =
	DefinitionFor<Code>["public"]["messagePolicy"];

type RetryableErrorCode = {
	[Code in CanonicalErrorCode]: DefinitionFor<Code>["retry"]["retryable"] extends true
		? Code
		: never;
}[CanonicalErrorCode];

type RetryAfterErrorCode = {
	[Code in CanonicalErrorCode]: DefinitionFor<Code>["retry"]["retryAfter"] extends "details.retryAfterSeconds"
		? Code
		: never;
}[CanonicalErrorCode];

type RetryableDispositionFor<Code extends RetryableErrorCode> =
	Code extends RetryAfterErrorCode
		? Readonly<{
				retryable: true;
				retryAfterSeconds?: RetryAfterSeconds;
			}>
		: Readonly<{ retryable: true }>;

type RetryDispositionBrand<Code extends CanonicalErrorCode> = Readonly<{
	readonly [retryDispositionBrand]: Code;
}>;

/** Opaque registry-derived scheduling decision; consumers cannot manufacture it. */
export type RetryDisposition<
	Code extends CanonicalErrorCode = CanonicalErrorCode,
> = Code extends RetryableErrorCode
	? RetryableDispositionFor<Code> & RetryDispositionBrand<Code>
	: Readonly<{ retryable: false }> & RetryDispositionBrand<Code>;

export type PublicMessageOverrideCode = {
	[Code in CanonicalErrorCode]: MessagePolicyFor<Code> extends "sanitized-override"
		? Code
		: never;
}[CanonicalErrorCode];

export type PublicDetailsFor<Code extends CanonicalErrorCode> =
	PublicDetailsOutputOf<DefinitionFor<Code>["details"]>;

export type DetailsInputFor<Code extends CanonicalErrorCode> =
	PublicDetailsInputOf<DefinitionFor<Code>["details"]>;

export type PublicDetailsByCode = Readonly<{
	[Code in CanonicalErrorCode]: PublicDetailsFor<Code>;
}>;

export type PublicMessageInputFor<Code extends CanonicalErrorCode> =
	MessagePolicyFor<Code> extends "sanitized-override"
		? Readonly<{ publicMessage: string }> & object
		: never;

type PublicMessagePropertyFor<Code extends CanonicalErrorCode> =
	MessagePolicyFor<Code> extends "sanitized-override"
		? Readonly<{ publicMessage: string }>
		: Readonly<{ publicMessage?: never }>;

type Simplify<Value extends object> = Readonly<{
	[Key in keyof Value]: Value[Key];
}> &
	object;

type RawResultFailureInput<Code extends CanonicalErrorCode> = Simplify<
	DetailsInputFor<Code> &
		PublicMessagePropertyFor<Code> &
		Readonly<{ internalContext?: unknown }>
>;

type RequireAtLeastOneAuthoredProperty<
	Shape extends object,
	Key extends keyof Shape = AuthoredInputKey<Shape>,
> = Key extends keyof Shape
	? Simplify<Omit<Shape, Key> & Required<Pick<Shape, Key>>>
	: never;

/** Direct public Result construction carries no operation or diagnostics. */
export type ResultFailureInput<Code extends CanonicalErrorCode> =
	Code extends PublicMessageOverrideCode
		? RawResultFailureInput<Code>
		: [AuthoredInputKey<RawResultFailureInput<Code>>] extends [never]
			? never
			: RequireAtLeastOneAuthoredProperty<RawResultFailureInput<Code>>;

/** The sole caller-owned context accepted by opaque Failure construction. */
export type FailureContext = Readonly<{
	correlationId?: string;
	operation: string;
}>;

type FailureDetailsInputFor<Code extends CanonicalErrorCode> =
	Code extends "INTERNAL_ERROR"
		? Omit<DetailsInputFor<Code>, "correlationId">
		: DetailsInputFor<Code>;

/** No public path accepts source exceptions or unrestricted diagnostics. */
export type FailureInput<Code extends CanonicalErrorCode> =
	Code extends CanonicalErrorCode
		? Simplify<
				FailureContext &
					FailureDetailsInputFor<Code> &
					PublicMessagePropertyFor<Code>
			>
		: never;

/** Rejects primitives, arrays, callables, and properties outside the shape. */
export type ExactInput<Shape extends object, Input> = Input extends object
	? Input extends readonly unknown[]
		? never
		: Input extends (...arguments_: never[]) => unknown
			? never
			: Input extends Shape
				? Exclude<keyof Input, keyof Shape> extends never
					? Input
					: never
				: never
	: never;

type IsAuthoredStringLiteral<Message extends string> = string extends Message
	? false
	: true;

type RejectDynamicPublicMessage<Code extends CanonicalErrorCode, Input> =
	MessagePolicyFor<Code> extends "sanitized-override"
		? Input extends Readonly<{ publicMessage: infer Message extends string }>
			? IsAuthoredStringLiteral<Message> extends true
				? Input
				: never
			: never
		: Input;

type IsAuthoredFieldMessage<Message> = Message extends undefined
	? true
	: Message extends string
		? string extends Message
			? false
			: true
		: false;

type AreAuthoredFieldMessages<Messages> = [Messages] extends [never]
	? true
	: Messages extends readonly (infer Message)[]
		? false extends IsAuthoredFieldMessage<Message>
			? false
			: true
		: false;

type AreAuthoredFieldErrors<Fields> = Fields extends object
	? string extends keyof Fields
		? false
		: number extends keyof Fields
			? false
			: false extends {
						[Field in keyof Fields]-?: AreAuthoredFieldMessages<
							Exclude<Fields[Field], undefined>
						>;
					}[keyof Fields]
				? false
				: true
	: false;

type StaticFieldMessagePropertyFor<Code extends CanonicalErrorCode> =
	DefinitionFor<Code>["details"]["staticFieldMessageProperty"];

type RejectDynamicFieldErrorMessages<Code extends CanonicalErrorCode, Input> =
	StaticFieldMessagePropertyFor<Code> extends infer Property extends string
		? Input extends object
			? Property extends keyof Input
				? Input extends Readonly<Partial<Record<Property, infer Fields>>>
					? [Exclude<Fields, undefined>] extends [never]
						? Input
						: AreAuthoredFieldErrors<Exclude<Fields, undefined>> extends true
							? Input
							: never
					: never
				: Input
			: never
		: Input;

/**
 * Use with a `const Input` generic in capability overloads. Literal text and
 * authored constants pass; widened runtime strings reduce to `never`. The AST
 * contract gate additionally rejects interpolation, concatenation, property
 * reads, calls, and identifiers that do not resolve to static source text.
 */
export type CheckedResultFailureInput<
	Code extends CanonicalErrorCode,
	Input,
> = RejectDynamicPublicMessage<
	Code,
	RejectDynamicFieldErrorMessages<
		Code,
		ExactInput<ResultFailureInput<Code>, Input>
	>
>;

export type CheckedFailureInput<
	Code extends CanonicalErrorCode,
	Input,
> = RejectDynamicPublicMessage<
	Code,
	RejectDynamicFieldErrorMessages<Code, ExactInput<FailureInput<Code>, Input>>
>;

type AuthoredInputKey<Shape extends object> = {
	[Key in keyof Shape]-?: [Exclude<Shape[Key], undefined>] extends [never]
		? never
		: Key;
}[keyof Shape];

export type OptionalResultFailureInputCode = Exclude<
	{
		[Code in CanonicalErrorCode]: [ResultFailureInput<Code>] extends [never]
			? never
			: Code;
	}[CanonicalErrorCode],
	PublicMessageOverrideCode
>;

export type EmptyResultFailureInputCode = Exclude<
	CanonicalErrorCode,
	PublicMessageOverrideCode | OptionalResultFailureInputCode
>;

type IsUnion<Value, Whole = Value> = Value extends unknown
	? [Whole] extends [Value]
		? false
		: true
	: never;

/** Construction requires one narrowed code so its input contract is exact. */
export type SingleCanonicalErrorCode<Code extends CanonicalErrorCode> =
	true extends IsUnion<Code> ? never : Code;

export type ResultFailArguments<
	Code extends CanonicalErrorCode,
	Input,
> = Code extends PublicMessageOverrideCode
	? [input: Input & CheckedResultFailureInput<Code, NoInfer<Input>>]
	: Code extends OptionalResultFailureInputCode
		? [] | [input: Input & CheckedResultFailureInput<Code, NoInfer<Input>>]
		: [];

export type PublicDetailsPropertyForValue<Value> = [
	Exclude<Value, undefined>,
] extends [never]
	? Readonly<{ details?: never }>
	: undefined extends Value
		? Readonly<{ details?: Exclude<Value, undefined> }>
		: Readonly<{ details: Value }>;

type PublicDetailsProperty<Code extends CanonicalErrorCode> =
	PublicDetailsPropertyForValue<PublicDetailsFor<Code>>;

type PublicErrorDataFor<Code extends CanonicalErrorCode> = Simplify<
	Readonly<{
		code: Code;
		message: string;
		messageKey: MessageKeyFor<Code>;
	}> &
		PublicDetailsProperty<Code>
>;

/** Shared public payload consumed identically by Result, HTTP, and wire lanes. */
export type PublicErrorData<
	Code extends CanonicalErrorCode = CanonicalErrorCode,
> = Code extends CanonicalErrorCode ? PublicErrorDataFor<Code> : never;

export type ResultSuccess<Data> = Readonly<{
	data: Data;
	ok: true;
}>;

export type ResultFailure<
	Code extends CanonicalErrorCode = CanonicalErrorCode,
> = Code extends CanonicalErrorCode
	? Simplify<PublicErrorDataFor<Code> & Readonly<{ ok: false }>>
	: never;

export type Result<Data, Code extends CanonicalErrorCode = CanonicalErrorCode> =
	| ResultSuccess<Data>
	| ResultFailure<Code>;

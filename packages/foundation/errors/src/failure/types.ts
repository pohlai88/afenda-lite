/**
 * @afenda/errors
 * Contract: afenda.errors/v1
 * Protected: changes require local pre-edit token and compatibility checks.
 */
import type { CanonicalErrorCode, PublicErrorData } from "../public-types";

declare const failureBrand: unique symbol;

/** Opaque in-process identity. Its semantic record is held in a private WeakMap. */
export type Failure<C extends CanonicalErrorCode = CanonicalErrorCode> =
	Readonly<{
		[failureBrand]: C;
	}>;

export type NormalizedFailureContext = Readonly<{
	operation: string;
	correlationId?: string;
}>;

export type InternalDiagnosticMetadata = Readonly<{
	source: "postgres";
	sqlState: string;
}>;

export type InternalFailureRecord<
	C extends CanonicalErrorCode = CanonicalErrorCode,
> = Readonly<{
	code: C;
	context: NormalizedFailureContext;
	createdAt: number;
	privateDiagnostics?: InternalDiagnosticMetadata;
	publicData: PublicErrorData<C>;
}>;

import { fail, type ResultFailure } from "@afenda/errors/result";

import {
	CA_ERROR_CODE_CONFLICT,
	CA_ERROR_COMPANY_NOT_FOUND,
	CA_ERROR_DIMENSION_ALREADY_BOUND,
	CA_ERROR_EFFECTIVE_RANGE_OVERLAP,
	CA_ERROR_IDEMPOTENCY_CONFLICT,
	CA_ERROR_IDENTIFIER_CONFLICT,
	CA_ERROR_TRANSACTION_FAILED,
	CA_ERROR_VERSION_CONFLICT,
	CA_IDEMPOTENCY_FINGERPRINT_CONFLICT_MESSAGE,
	caErrorDetails,
} from "../error-codes";

export const CORPORATE_ADMINISTRATION_STORE_ERROR_CODES = {
	notFound: CA_ERROR_COMPANY_NOT_FOUND,
	versionConflict: CA_ERROR_VERSION_CONFLICT,
	codeConflict: CA_ERROR_CODE_CONFLICT,
	dimensionConflict: CA_ERROR_DIMENSION_ALREADY_BOUND,
	identifierConflict: CA_ERROR_IDENTIFIER_CONFLICT,
	effectiveRangeOverlap: CA_ERROR_EFFECTIVE_RANGE_OVERLAP,
	idempotencyConflict: CA_ERROR_IDEMPOTENCY_CONFLICT,
	transactionFailed: CA_ERROR_TRANSACTION_FAILED,
} as const;

export type CorporateAdministrationStoreErrorCode =
	(typeof CORPORATE_ADMINISTRATION_STORE_ERROR_CODES)[keyof typeof CORPORATE_ADMINISTRATION_STORE_ERROR_CODES];

export class CorporateAdministrationStoreError extends Error {
	readonly code: CorporateAdministrationStoreErrorCode;
	readonly causeValue: unknown;

	constructor(input: {
		code: CorporateAdministrationStoreErrorCode;
		message: string;
		cause?: unknown;
	}) {
		super(input.message, {
			cause: input.cause,
		});

		this.name = "CorporateAdministrationStoreError";
		this.code = input.code;
		this.causeValue = input.cause;
	}
}

export class CorporateAdministrationVersionConflictError extends CorporateAdministrationStoreError {
	readonly organizationId: string;
	readonly aggregateId: string;
	readonly expectedVersion: number;

	constructor(input: {
		organizationId: string;
		aggregateId: string;
		expectedVersion: number;
	}) {
		super({
			code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.versionConflict,
			message:
				`Expected version ${input.expectedVersion} for ` +
				`aggregate ${input.aggregateId}, but the record changed.`,
		});

		this.name = "CorporateAdministrationVersionConflictError";

		this.organizationId = input.organizationId;
		this.aggregateId = input.aggregateId;
		this.expectedVersion = input.expectedVersion;
	}
}

export class CorporateAdministrationIdempotencyConflictError extends CorporateAdministrationStoreError {
	readonly organizationId: string;
	readonly idempotencyKey: string;

	constructor(input: {
		organizationId: string;
		idempotencyKey: string;
	}) {
		super({
			code: CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.idempotencyConflict,
			message: CA_IDEMPOTENCY_FINGERPRINT_CONFLICT_MESSAGE,
		});

		this.name = "CorporateAdministrationIdempotencyConflictError";

		this.organizationId = input.organizationId;
		this.idempotencyKey = input.idempotencyKey;
	}
}

export function isCorporateAdministrationStoreError(
	value: unknown,
): value is CorporateAdministrationStoreError {
	return value instanceof CorporateAdministrationStoreError;
}

function platformCodeForStoreError(
	code: CorporateAdministrationStoreErrorCode,
): "CONFLICT" | "NOT_FOUND" | "INTERNAL_ERROR" {
	if (code === CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.notFound) {
		return "NOT_FOUND";
	}
	if (code === CORPORATE_ADMINISTRATION_STORE_ERROR_CODES.transactionFailed) {
		return "INTERNAL_ERROR";
	}
	return "CONFLICT";
}

export function mapCorporateAdministrationStoreError(
	error: CorporateAdministrationStoreError,
): ResultFailure {
	const platformCode = platformCodeForStoreError(error.code);
	const extra: Record<string, unknown> = {};

	if (error instanceof CorporateAdministrationVersionConflictError) {
		extra.organizationId = error.organizationId;
		extra.aggregateId = error.aggregateId;
		extra.expectedVersion = error.expectedVersion;
	}

	if (error instanceof CorporateAdministrationIdempotencyConflictError) {
		extra.organizationId = error.organizationId;
		extra.idempotencyKey = error.idempotencyKey;
	}

	if (error.causeValue !== undefined) {
		extra.cause = error.causeValue;
	}

	return fail(platformCode, error.message, caErrorDetails(error.code, extra));
}

export async function catchCorporateAdministrationStoreError<T>(
	operation: () => Promise<T>,
): Promise<T | ResultFailure> {
	try {
		return await operation();
	} catch (error) {
		if (isCorporateAdministrationStoreError(error)) {
			return mapCorporateAdministrationStoreError(error);
		}
		throw error;
	}
}

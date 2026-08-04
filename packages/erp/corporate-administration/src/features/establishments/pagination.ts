import type { Result } from "@afenda/errors";
import { z } from "zod";
import {
	legalEstablishmentIdSchema,
	premiseIdSchema,
} from "../../kernel/brands";
import {
	decodeCorporateAdministrationCursor,
	encodeCorporateAdministrationCursor,
} from "../../kernel/internal/pagination-cursor";
import type { OpaqueCursor } from "../../kernel/pagination";
import { legalEstablishmentTypeSchema, premiseTypeSchema } from "./schemas";
import type {
	ListLegalEstablishmentsAsOfStoreInput,
	ListPremisesAsOfStoreInput,
} from "./store";

const legalEstablishmentCursorKeySchema = z.tuple([
	legalEstablishmentTypeSchema,
	z.string().regex(/^[A-Z]{2}$/),
	z.string().min(1),
	legalEstablishmentIdSchema,
]);

const premiseCursorKeySchema = z.tuple([
	premiseTypeSchema,
	z.string().min(1),
	premiseIdSchema,
]);

export type LegalEstablishmentCursorKey = z.infer<
	typeof legalEstablishmentCursorKeySchema
>;
export type PremiseCursorKey = z.infer<typeof premiseCursorKeySchema>;

export function legalEstablishmentCursorScope(
	input: ListLegalEstablishmentsAsOfStoreInput,
) {
	return {
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		asOf: input.asOf,
		knownAt: input.knownAt ?? null,
		status: input.status ?? null,
	} as const;
}

export function premiseCursorScope(input: ListPremisesAsOfStoreInput) {
	return {
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		legalEstablishmentId: input.legalEstablishmentId ?? null,
		premiseType: input.premiseType ?? null,
		asOf: input.asOf,
		knownAt: input.knownAt ?? null,
	} as const;
}

export function encodeLegalEstablishmentCursor(
	scope: ReturnType<typeof legalEstablishmentCursorScope>,
	key: LegalEstablishmentCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor(
		"legal_establishments_as_of",
		scope,
		key,
	);
}

export function decodeLegalEstablishmentCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof legalEstablishmentCursorScope>,
): Result<LegalEstablishmentCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"legal_establishments_as_of",
		scope,
		legalEstablishmentCursorKeySchema,
	);
}

export function encodePremiseCursor(
	scope: ReturnType<typeof premiseCursorScope>,
	key: PremiseCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor("premises_as_of", scope, key);
}

export function decodePremiseCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof premiseCursorScope>,
): Result<PremiseCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"premises_as_of",
		scope,
		premiseCursorKeySchema,
	);
}

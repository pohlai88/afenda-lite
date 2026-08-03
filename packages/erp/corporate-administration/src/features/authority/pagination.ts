import type { Result } from "@afenda/errors";
import { z } from "zod";
import { authorityMandateIdSchema } from "../../kernel/brands";
import { canonicalDateSchema } from "../../kernel/dates";
import {
	decodeCorporateAdministrationCursor,
	encodeCorporateAdministrationCursor,
} from "../../kernel/internal/pagination-cursor";
import type { OpaqueCursor } from "../../kernel/pagination";
import type { AuthorityMandatesAsOfQuery } from "./store";

const authorityMandateCursorKeySchema = z.tuple([
	canonicalDateSchema,
	authorityMandateIdSchema,
]);

export type AuthorityMandateCursorKey = z.infer<
	typeof authorityMandateCursorKeySchema
>;

export function encodeAuthorityMandateCursor(
	scope: ReturnType<typeof authorityMandateCursorScope>,
	key: AuthorityMandateCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor(
		"authority_mandates_as_of",
		scope,
		key,
	);
}

export function decodeAuthorityMandateCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof authorityMandateCursorScope>,
): Result<AuthorityMandateCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"authority_mandates_as_of",
		scope,
		authorityMandateCursorKeySchema,
	);
}

export function authorityMandateCursorScope(input: AuthorityMandatesAsOfQuery) {
	return {
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		asOf: input.asOf,
		mandateType: input.mandateType ?? null,
		holderPartyId: input.holderPartyId ?? null,
	} as const;
}

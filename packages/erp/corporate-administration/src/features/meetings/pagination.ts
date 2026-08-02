import type { Result } from "@afenda/errors";
import { z } from "zod";
import { governanceMeetingIdSchema } from "../../kernel/brands";
import { canonicalInstantSchema } from "../../kernel/dates";
import {
	decodeCorporateAdministrationCursor,
	encodeCorporateAdministrationCursor,
} from "../../kernel/internal/pagination-cursor";
import type { OpaqueCursor } from "../../kernel/pagination";
import type { GovernanceMeetingsQuery } from "./store";

const governanceMeetingCursorKeySchema = z.tuple([
	canonicalInstantSchema,
	governanceMeetingIdSchema,
]);

export type GovernanceMeetingCursorKey = z.infer<
	typeof governanceMeetingCursorKeySchema
>;

export function governanceMeetingCursorScope(input: GovernanceMeetingsQuery) {
	return {
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		governanceBodyId: input.governanceBodyId ?? null,
		status: input.status ?? null,
	} as const;
}

export function encodeGovernanceMeetingCursor(
	scope: ReturnType<typeof governanceMeetingCursorScope>,
	key: GovernanceMeetingCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor("governance_meetings", scope, key);
}

export function decodeGovernanceMeetingCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof governanceMeetingCursorScope>,
): Result<GovernanceMeetingCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"governance_meetings",
		scope,
		governanceMeetingCursorKeySchema,
	);
}

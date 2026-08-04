import type { Result } from "@afenda/errors";
import { z } from "zod";
import {
	officerAppointmentIdSchema,
	officerConflictDisclosureIdSchema,
	officerDeclarationIdSchema,
	officerDisqualificationIdSchema,
} from "../../kernel/brands";
import {
	canonicalDateSchema,
	canonicalInstantSchema,
} from "../../kernel/dates";
import {
	decodeCorporateAdministrationCursor,
	encodeCorporateAdministrationCursor,
} from "../../kernel/internal/pagination-cursor";
import type { OpaqueCursor } from "../../kernel/pagination";
import type {
	ActiveOfficerDisqualificationsQuery,
	ConflictsForMatterQuery,
	ExpiringOfficerDeclarationsQuery,
} from "./compliance-store";

const expiringDeclarationCursorKeySchema = z.tuple([
	canonicalDateSchema,
	officerDeclarationIdSchema,
]);

export type ExpiringDeclarationCursorKey = z.infer<
	typeof expiringDeclarationCursorKeySchema
>;

export function encodeExpiringDeclarationCursor(
	scope: ReturnType<typeof expiringDeclarationCursorScope>,
	key: ExpiringDeclarationCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor(
		"expiring_officer_declarations",
		scope,
		key,
	);
}

export function decodeExpiringDeclarationCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof expiringDeclarationCursorScope>,
): Result<ExpiringDeclarationCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"expiring_officer_declarations",
		scope,
		expiringDeclarationCursorKeySchema,
	);
}

export function expiringDeclarationCursorScope(
	input: ExpiringOfficerDeclarationsQuery,
) {
	return {
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		asOf: input.asOf,
		windowDays: input.windowDays,
		declarationType: input.declarationType ?? null,
	} as const;
}

const activeDisqualificationCursorKeySchema = z.tuple([
	officerAppointmentIdSchema,
	canonicalDateSchema,
	officerDisqualificationIdSchema,
]);

export type ActiveDisqualificationCursorKey = z.infer<
	typeof activeDisqualificationCursorKeySchema
>;

export function encodeActiveDisqualificationCursor(
	scope: ReturnType<typeof activeDisqualificationCursorScope>,
	key: ActiveDisqualificationCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor(
		"active_officer_disqualifications",
		scope,
		key,
	);
}

export function decodeActiveDisqualificationCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof activeDisqualificationCursorScope>,
): Result<ActiveDisqualificationCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"active_officer_disqualifications",
		scope,
		activeDisqualificationCursorKeySchema,
	);
}

export function activeDisqualificationCursorScope(
	input: ActiveOfficerDisqualificationsQuery,
) {
	return {
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		asOf: input.asOf,
		officerAppointmentId: input.officerAppointmentId ?? null,
	} as const;
}

const conflictForMatterCursorKeySchema = z.tuple([
	canonicalInstantSchema,
	officerConflictDisclosureIdSchema,
]);

export type ConflictForMatterCursorKey = z.infer<
	typeof conflictForMatterCursorKeySchema
>;

export function encodeConflictForMatterCursor(
	scope: ReturnType<typeof conflictForMatterCursorScope>,
	key: ConflictForMatterCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor(
		"conflicts_for_matter",
		scope,
		key,
	);
}

export function decodeConflictForMatterCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof conflictForMatterCursorScope>,
): Result<ConflictForMatterCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"conflicts_for_matter",
		scope,
		conflictForMatterCursorKeySchema,
	);
}

export function conflictForMatterCursorScope(input: ConflictsForMatterQuery) {
	return {
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		matterType: input.matterType,
		matterId: input.matterId,
		includeCleared: input.includeCleared === true,
	} as const;
}

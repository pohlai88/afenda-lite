import type { Result } from "@afenda/errors";
import { z } from "zod";
import {
	officerAppointmentIdSchema,
	statutoryOfficeIdSchema,
} from "../../kernel/brands";
import { canonicalDateSchema } from "../../kernel/dates";
import {
	decodeCorporateAdministrationCursor,
	encodeCorporateAdministrationCursor,
} from "../../kernel/internal/pagination-cursor";
import type { OpaqueCursor } from "../../kernel/pagination";
import type { OfficersAsOfQuery, RequiredStatutoryOfficesQuery } from "./store";

const statutoryOfficeCursorKeySchema = z.tuple([
	z.string().regex(/^[A-Z]{2}$/),
	z.string().min(1),
	statutoryOfficeIdSchema,
]);

export type StatutoryOfficeCursorKey = z.infer<
	typeof statutoryOfficeCursorKeySchema
>;

export function encodeStatutoryOfficeCursor(
	scope: ReturnType<typeof statutoryOfficeCursorScope>,
	key: StatutoryOfficeCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor(
		"required_statutory_offices",
		scope,
		key,
	);
}

export function decodeStatutoryOfficeCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof statutoryOfficeCursorScope>,
): Result<StatutoryOfficeCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"required_statutory_offices",
		scope,
		statutoryOfficeCursorKeySchema,
	);
}

export function statutoryOfficeCursorScope(
	input: RequiredStatutoryOfficesQuery,
) {
	return {
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		asOf: input.asOf,
		jurisdictionCode: input.jurisdictionCode ?? null,
		includeOptional: input.includeOptional ?? false,
	} as const;
}

const officerAppointmentCursorKeySchema = z.tuple([
	statutoryOfficeIdSchema,
	canonicalDateSchema,
	officerAppointmentIdSchema,
]);

export type OfficerAppointmentCursorKey = z.infer<
	typeof officerAppointmentCursorKeySchema
>;

export function encodeOfficerAppointmentCursor(
	scope: ReturnType<typeof officerAppointmentCursorScope>,
	key: OfficerAppointmentCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor(
		"officer_appointments_as_of",
		scope,
		key,
	);
}

export function decodeOfficerAppointmentCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof officerAppointmentCursorScope>,
): Result<OfficerAppointmentCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"officer_appointments_as_of",
		scope,
		officerAppointmentCursorKeySchema,
	);
}

export function officerAppointmentCursorScope(input: OfficersAsOfQuery) {
	return {
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		asOf: input.asOf,
		statutoryOfficeId: input.statutoryOfficeId ?? null,
		officerPartyId: input.officerPartyId ?? null,
	} as const;
}

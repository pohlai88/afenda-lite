import { z } from "zod";

export {
	CA_COMPANY_NAME_TYPE_VALUES,
	CA_LEGAL_COMPANY_STATUS_VALUES,
	caCompanyIdentifierIdSchema,
	caCompanyNameIdSchema,
	caLegalCompanyIdSchema,
} from "@afenda/corporate-administration";

/** Empty form fields → `undefined` (optional master-data UUID). */
export const optionalFormUuidSchema = z.preprocess(
	(value) => (value === "" || value === null ? undefined : value),
	z.uuid().optional(),
);

/** Empty form fields → `null` (nullable master-data UUID). */
export const nullableFormUuidSchema = z.preprocess(
	(value) => (value === "" || value === null ? null : value),
	z.uuid().nullable().optional(),
);

/** Maps a form ISO date to the package UTC instant wire shape. */
export function caEffectiveAtFromFormDate(date: string): string {
	return `${date}T00:00:00.000Z`;
}

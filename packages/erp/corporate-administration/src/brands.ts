import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";

import { caErrorDetails } from "./error-codes";

const CA_ERROR_PERSISTENCE_FAILURE =
	"corporate-administration.persistence.invalid_identifier" as const;

export const caLegalCompanyIdSchema = z
	.string()
	.uuid()
	.brand<"CaLegalCompanyId">();
export type CaLegalCompanyId = z.infer<typeof caLegalCompanyIdSchema>;

export const caCompanyNameIdSchema = z
	.string()
	.uuid()
	.brand<"CaCompanyNameId">();
export type CaCompanyNameId = z.infer<typeof caCompanyNameIdSchema>;

export const caCompanyIdentifierIdSchema = z
	.string()
	.uuid()
	.brand<"CaCompanyIdentifierId">();
export type CaCompanyIdentifierId = z.infer<typeof caCompanyIdentifierIdSchema>;

export function parseCaLegalCompanyId(id: string): Result<CaLegalCompanyId> {
	const parsed = caLegalCompanyIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid legal company identifier",
			caErrorDetails(CA_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseCaCompanyNameId(id: string): Result<CaCompanyNameId> {
	const parsed = caCompanyNameIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid company name identifier",
			caErrorDetails(CA_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

export function parseCaCompanyIdentifierId(
	id: string,
): Result<CaCompanyIdentifierId> {
	const parsed = caCompanyIdentifierIdSchema.safeParse(id);
	if (!parsed.success) {
		return fail(
			"INTERNAL_ERROR",
			"Invalid company identifier id",
			caErrorDetails(CA_ERROR_PERSISTENCE_FAILURE),
		);
	}
	return ok(parsed.data);
}

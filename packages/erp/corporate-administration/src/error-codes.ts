export const CA_ERROR_CODE_CONFLICT =
	"corporate-administration.company.code_conflict" as const;
export const CA_ERROR_COMPANY_NOT_FOUND =
	"corporate-administration.company.not_found" as const;
export const CA_ERROR_VERSION_CONFLICT =
	"corporate-administration.company.version_conflict" as const;
export const CA_ERROR_INVALID_STATUS =
	"corporate-administration.company.invalid_transition" as const;
export const CA_ERROR_ACTIVATION_INCOMPLETE =
	"corporate-administration.company.activation_incomplete" as const;
export const CA_ERROR_LEGAL_ENTITY_INVALID =
	"corporate-administration.company.dimension_not_effective" as const;
export const CA_ERROR_PARTY_INVALID =
	"corporate-administration.company.party_kind_invalid" as const;
export const CA_ERROR_IDENTIFIER_TAX_TYPE =
	"corporate-administration.tax_identifier.foreign_owner" as const;
export const CA_ERROR_IDEMPOTENCY_CONFLICT =
	"corporate-administration.idempotency.conflict" as const;
export const CA_ERROR_NAME_OVERLAP =
	"corporate-administration.company_name.range_overlap" as const;
export const CA_ERROR_SHARE_TRANSACTION_UNBALANCED =
	"corporate-administration.share.transaction_unbalanced" as const;
export const CA_ERROR_SHARE_INSUFFICIENT_HOLDING =
	"corporate-administration.share.insufficient_holding" as const;
export const CA_ERROR_SHARE_CLASS_CLOSED =
	"corporate-administration.share.class_closed" as const;
export const CA_ERROR_SHARE_CERTIFICATE_CONFLICT =
	"corporate-administration.share.certificate_conflict" as const;
export const CA_ERROR_EFFECTIVE_RANGE_OVERLAP =
	"corporate-administration.effective_range.overlap" as const;

export function caErrorDetails(
	reason: string,
	extra?: Record<string, unknown>,
) {
	return { reason, ...extra };
}

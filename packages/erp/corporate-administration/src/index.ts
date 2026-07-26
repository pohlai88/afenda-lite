import "server-only";

export type { CorporateAdministrationAuthorizationContext } from "./authorization";
export {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	requireCorporateAdministrationPermission,
} from "./authorization";
export type {
	CorporateAdministrationClockedQueryOptions,
	CorporateAdministrationCommandOptions,
	CorporateAdministrationPaginatedQueryOptions,
	CorporateAdministrationQueryOptions,
} from "./command-options";
export type {
	CorporateAdministrationErrorCode,
	CorporateAdministrationFailureDetails,
	CorporateAdministrationFailureMetadata,
} from "./error-codes";
export {
	CORPORATE_ADMINISTRATION_ERROR_CODES,
	CORPORATE_ADMINISTRATION_RESULT_CODE_BY_REASON,
	corporateAdministrationErrorDetails,
	corporateAdministrationResultCode,
} from "./error-codes";
export type { CorporateAdministrationEventType } from "./event-types";
export {
	corporateAdministrationEventTypeSchema,
	createCorporateAdministrationEventType,
} from "./event-types";
export type {
	ApprovalDecisionId,
	ApprovalRequestId,
	CausationId,
	CommandFingerprint,
	CorrelationId,
	DocumentObjectRef,
	IdempotencyKey,
	LegalCompanyId,
	LegalEstablishmentId,
	OrganizationId,
	UserId,
} from "./kernel/brands";
export {
	approvalDecisionIdSchema,
	approvalRequestIdSchema,
	causationIdSchema,
	commandFingerprintSchema,
	correlationIdSchema,
	documentObjectRefSchema,
	idempotencyKeySchema,
	legalCompanyIdSchema,
	legalEstablishmentIdSchema,
	organizationIdSchema,
	userIdSchema,
} from "./kernel/brands";
export type { CanonicalDate } from "./kernel/dates";
export {
	canonicalDateSchema,
	compareCanonicalDates,
	isCanonicalDate,
} from "./kernel/dates";
export type { CanonicalDecimal } from "./kernel/decimals";
export {
	canonicalDecimalSchema,
	decimalInputSchema,
	normalizeDecimalString,
} from "./kernel/decimals";
export type { EffectiveRange } from "./kernel/effective-range";
export {
	effectiveRangeSchema,
	effectiveRangesOverlap,
	isDateInEffectiveRange,
} from "./kernel/effective-range";
export type { CanonicalJsonValue } from "./kernel/fingerprint";
export {
	canonicalJsonStringify,
	createCanonicalFingerprint,
} from "./kernel/fingerprint";
export type {
	NormalizedCode,
	NormalizedCodeValue,
} from "./kernel/normalization";
export {
	MAX_CORPORATE_ADMINISTRATION_CODE_LENGTH,
	normalizeCorporateAdministrationCode,
	normalizedCodeSchema,
} from "./kernel/normalization";
export type {
	CursorPage,
	CursorPagination,
	OpaqueCursor,
} from "./kernel/pagination";
export {
	cursorPaginationSchema,
	DEFAULT_CURSOR_PAGE_SIZE,
	MAX_CURSOR_PAGE_SIZE,
	opaqueCursorSchema,
} from "./kernel/pagination";
export type {
	CorporateAdministrationCommandId,
	CorporateAdministrationQueryId,
} from "./module-ids";
export {
	CORPORATE_ADMINISTRATION_COMMAND_IDS,
	CORPORATE_ADMINISTRATION_QUERY_IDS,
} from "./module-ids";
export type { CorporateAdministrationPermission } from "./permissions";
export { CORPORATE_ADMINISTRATION_PERMISSION_CODES } from "./permissions";
export type {
	AccountingReferencePort,
	ApprovalDecisionPort,
	ApprovalDecisionReference,
	ClockPort,
	ComplianceRulePackReference,
	ComplianceRuleSourcePort,
	CountryReference,
	CurrencyReference,
	DocumentObjectPort,
	DocumentObjectReference,
	FilingSafeIdentityValue,
	LanguageReference,
	PartyReference,
	PartyReferencePort,
	PartyRoleReference,
	PaymentsReferencePort,
	ProtectedIdentityField,
	ProtectedIdentityPort,
	ReferenceDataPort,
	ReminderDispatchPort,
	SearchProjectionDocument,
	SearchProjectionPort,
	SignatureEnvelopePort,
	SignatureEnvelopeReference,
	TaxRegistrationReadPort,
	TaxRegistrationReference,
	TimeZoneReference,
} from "./ports";
export { PROTECTED_IDENTITY_FIELDS } from "./ports";

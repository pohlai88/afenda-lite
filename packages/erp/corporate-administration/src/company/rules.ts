import { fail, ok, type Result } from "@afenda/errors/result";

import { corporateAdministrationErrorDetails } from "../error-codes";
import type { CanonicalDate, CanonicalInstant } from "../kernel/dates";
import { compareCanonicalDates } from "../kernel/dates";
import {
	type EffectiveRange,
	effectiveRangesOverlap,
	isDateInEffectiveRange,
} from "../kernel/effective-range";
import type {
	CompanyActivity,
	CompanyActivityClassification,
	CompanyActivityType,
	CompanyFinancialYear,
	CompanyIdentifier,
	CompanyIdentifierType,
	CompanyJurisdictionProfile,
	CompanyLegalForm,
	CompanyName,
	CompanyNameType,
	LegalCompanyStatus,
} from "./types";

const COMPANY_CODE_SEPARATORS_PATTERN = /[\s_-]+/g;
const NORMALIZED_NAME_SEPARATOR_PATTERN = /\s+/g;
const COMPANY_NAME_TYPES = [
	"legal",
	"former",
	"translated",
	"trading",
] as const;
const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(?:-[A-Z]{2})?$/;
const TAX_IDENTIFIER_TYPES = new Set([
	"tax",
	"vat",
	"gst",
	"sales_tax",
	"service_tax",
	"income_tax",
	"withholding_tax",
	"tax_registration",
]);
const TAX_IDENTIFIER_TYPE_PATTERN =
	/(?:^|[_\W])(tax|vat|gst|sst|tin)(?:$|[_\W])/i;
const PRESENTATION_IDENTIFIER_SEPARATOR_PATTERN = /[\s._-]+/g;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const AUTHORITY_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DAYS_IN_COMMON_YEAR_MONTH = [
	31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
] as const;

export type CompanyIdentifierUniquenessScope =
	| "global_authority"
	| "tenant_authority"
	| "company_authority";

export type CompanyIdentifierClassification = Readonly<{
	identifierType: CompanyIdentifierType;
	uniquenessScope: CompanyIdentifierUniquenessScope;
	caseSensitive: boolean;
	presentationSeparatorsOnly: boolean;
}>;

export type NormalizeCompanyIdentifierInput = Readonly<{
	displayValue: string;
	identifierType: CompanyIdentifierType | string;
	authorityCode?: string;
	caseSensitive?: boolean;
	removePresentationSeparators?: boolean;
}>;

export type NormalizedCompanyIdentifier = Readonly<{
	displayValue: string;
	normalizedValue: string;
}>;

export type JurisdictionEntityTypeRule = Readonly<{
	jurisdictionCountryCode: string;
	entityTypes: readonly string[];
	active: boolean;
}>;

export type LegalFormCompatibilityRule = Readonly<{
	jurisdictionCode: string;
	legalFormCodes: readonly string[];
	entityTypeCodes: readonly string[];
	active: boolean;
}>;

export function normalizeLegalCompanyCode(companyCode: string): string {
	return companyCode
		.trim()
		.toUpperCase()
		.replace(COMPANY_CODE_SEPARATORS_PATTERN, "-");
}

export function normalizeCompanyName(displayName: string): string {
	const normalized = displayName
		.trim()
		.normalize("NFC")
		.replace(NORMALIZED_NAME_SEPARATOR_PATTERN, " ")
		.toLocaleLowerCase("und");

	if (normalized.length === 0) {
		throw new RangeError("Company name must not be empty");
	}

	return normalized;
}

export function validateCompanyNameType(
	nameType: string,
): Result<CompanyNameType> {
	if (COMPANY_NAME_TYPES.includes(nameType as CompanyNameType)) {
		return ok(nameType as CompanyNameType);
	}
	return fail(
		"VALIDATION_ERROR",
		"Corporate Administration company name type is invalid.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
			{ field: "nameType" },
		),
	);
}

export function validateCompanyNameLanguage(
	languageCode: string,
): Result<string> {
	const trimmed = languageCode.trim();
	if (LANGUAGE_CODE_PATTERN.test(trimmed)) {
		return ok(trimmed);
	}
	return fail(
		"VALIDATION_ERROR",
		"Corporate Administration company name language is invalid.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
			{ field: "languageCode" },
		),
	);
}

export function normalizeCompanyIdentifierValue(
	identifierValue: string,
): string {
	return normalizeCompanyIdentifier({
		displayValue: identifierValue,
		identifierType: "other_non_tax_identifier",
	}).normalizedValue;
}

export function normalizeCompanyIdentifier(
	input: NormalizeCompanyIdentifierInput,
): NormalizedCompanyIdentifier {
	const classification = classifyIdentifierType(input.identifierType);
	const displayValue = input.displayValue.trim().normalize("NFC");
	const removePresentationSeparators =
		input.removePresentationSeparators ??
		classification.presentationSeparatorsOnly;
	const caseSensitive = input.caseSensitive ?? classification.caseSensitive;
	const normalized = (
		removePresentationSeparators
			? displayValue.replace(PRESENTATION_IDENTIFIER_SEPARATOR_PATTERN, "")
			: displayValue
	).normalize("NFC");
	const normalizedValue = caseSensitive ? normalized : normalized.toUpperCase();
	if (normalized.length === 0) {
		throw new RangeError("Company identifier must not be empty");
	}
	return {
		displayValue,
		normalizedValue,
	};
}

export function classifyIdentifierType(
	identifierType: CompanyIdentifierType | string,
): CompanyIdentifierClassification {
	const uniquenessScope: CompanyIdentifierUniquenessScope =
		identifierType === "legal_entity_identifier"
			? "global_authority"
			: identifierType === "registry_number" ||
					identifierType === "company_registration" ||
					identifierType === "business_registration"
				? "tenant_authority"
				: "company_authority";
	return {
		identifierType: identifierType as CompanyIdentifierType,
		uniquenessScope,
		caseSensitive: false,
		presentationSeparatorsOnly: true,
	};
}

export function isTaxIdentifierType(identifierType: string): boolean {
	return (
		TAX_IDENTIFIER_TYPES.has(identifierType) ||
		TAX_IDENTIFIER_TYPE_PATTERN.test(identifierType)
	);
}

export function assertNonTaxCompanyIdentifierType(
	identifierType: CompanyIdentifierType | string,
): Result<void> {
	if (isTaxIdentifierType(identifierType)) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration does not own tax identifiers. Use Master Data tax registration.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{
					field: "identifierType",
					owner: "@afenda/master-data",
					surface: "md_tax_registration",
				},
			),
		);
	}
	return ok(undefined);
}

export function validateIdentifierAuthority(
	authorityCode: string,
): Result<string> {
	const trimmed = authorityCode.trim();
	if (AUTHORITY_CODE_PATTERN.test(trimmed)) return ok(trimmed);
	return fail(
		"VALIDATION_ERROR",
		"Corporate Administration identifier authority is invalid.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
			{ field: "authorityCode" },
		),
	);
}

export function validateIdentifierJurisdiction(
	jurisdictionCode: string,
): Result<string> {
	const trimmed = jurisdictionCode.trim();
	if (COUNTRY_CODE_PATTERN.test(trimmed)) return ok(trimmed);
	return fail(
		"VALIDATION_ERROR",
		"Corporate Administration identifier jurisdiction is invalid.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
			{ field: "jurisdictionCode" },
		),
	);
}

export function validateCompanyIdentifierEffectiveRange(input: {
	candidate: EffectiveRange;
	identifierType: CompanyIdentifierType;
	jurisdictionCode: string;
	issuingAuthorityCode: string;
	normalizedIdentifierValue: string;
	existing: readonly CompanyIdentifier[];
	ignoreCompanyIdentifierId?: string | undefined;
}): Result<void> {
	return validateIdentifierEffectiveRange({
		candidate: input.candidate,
		identifierType: input.identifierType,
		jurisdictionCode: input.jurisdictionCode,
		authorityCode: input.issuingAuthorityCode,
		normalizedValue: input.normalizedIdentifierValue,
		existing: input.existing,
		ignoreCompanyIdentifierId: input.ignoreCompanyIdentifierId,
		uniquenessScope: classifyIdentifierType(input.identifierType)
			.uniquenessScope,
	});
}

export function validateIdentifierEffectiveRange(input: {
	candidate: EffectiveRange;
	identifierType: CompanyIdentifierType;
	jurisdictionCode: string;
	authorityCode: string;
	normalizedValue: string;
	existing: readonly CompanyIdentifier[];
	ignoreCompanyIdentifierId?: string | undefined;
	uniquenessScope?: CompanyIdentifierUniquenessScope | undefined;
	legalCompanyId?: string | undefined;
}): Result<void> {
	const chronology = assertEffectivePeriodChronology(input.candidate);
	if (!chronology.ok) return chronology;
	const uniquenessScope =
		input.uniquenessScope ??
		classifyIdentifierType(input.identifierType).uniquenessScope;
	const overlap = input.existing.find(
		(identifier) =>
			identifier.id !== input.ignoreCompanyIdentifierId &&
			identifier.status === "active" &&
			identifier.identifierType === input.identifierType &&
			identifier.jurisdictionCode === input.jurisdictionCode &&
			identifier.issuingAuthorityCode === input.authorityCode &&
			identifier.normalizedIdentifierValue === input.normalizedValue &&
			identifierMatchesUniquenessScope({
				identifier,
				legalCompanyId: input.legalCompanyId,
				uniquenessScope,
			}) &&
			effectiveRangesOverlap(
				companyIdentifierEffectiveRange(identifier),
				input.candidate,
			),
	);
	if (overlap === undefined) return ok(undefined);
	return fail(
		"CONFLICT",
		"Corporate Administration company identifier overlaps an existing identifier in the same jurisdiction and authority.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			{ field: "effectivePeriod" },
		),
	);
}

export function validateIdentifierSupersession(input: {
	identifier: CompanyIdentifier | null;
	expectedVersion: number;
}): Result<CompanyIdentifier> {
	if (input.identifier === null) {
		return fail(
			"NOT_FOUND",
			"Corporate Administration company identifier was not found.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_NOT_FOUND",
				{ entityType: "companyIdentifier" },
			),
		);
	}
	if (input.identifier.status !== "active") {
		return fail(
			"CONFLICT",
			"Corporate Administration company identifier is not active.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_INVALID_TRANSITION",
				{ field: "companyIdentifierId" },
			),
		);
	}
	if (input.identifier.version !== input.expectedVersion) {
		return fail(
			"CONFLICT",
			"Corporate Administration company identifier version is stale.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_STALE_VERSION",
				{
					expectedVersion: input.expectedVersion,
					actualVersion: input.identifier.version,
				},
			),
		);
	}
	return ok(input.identifier);
}

export function validateCompanyFinancialYearStart(input: {
	month: number;
	day: number;
}): Result<void> {
	return validateFinancialYearEnd({
		month: input.month,
		day: input.day,
		allowFebruary29: true,
	});
}

export function validateFinancialYearEnd(input: {
	month: number;
	day: number;
	allowFebruary29?: boolean;
}): Result<void> {
	if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration financial-year month is invalid.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
				{ field: "yearEndMonth" },
			),
		);
	}
	const daysInMonth = DAYS_IN_COMMON_YEAR_MONTH[input.month - 1] ?? 0;
	if (
		!Number.isInteger(input.day) ||
		input.day < 1 ||
		input.day >
			daysInMonth + (input.month === 2 && input.allowFebruary29 ? 1 : 0)
	) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration financial-year day is invalid.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
				{ field: "yearEndDay" },
			),
		);
	}
	if (input.month === 2 && input.day === 29 && !input.allowFebruary29) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration financial-year February 29 policy is invalid.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
				{ field: "yearEndDay" },
			),
		);
	}
	return ok(undefined);
}

export function validateFinancialYearChronology(input: {
	candidate: EffectiveRange;
	existing: readonly CompanyFinancialYear[];
	ignoreCompanyFinancialYearId?: string;
}): Result<void> {
	const chronology = assertEffectivePeriodChronology(input.candidate);
	if (!chronology.ok) return chronology;
	const overlap = input.existing.find(
		(financialYear) =>
			financialYear.id !== input.ignoreCompanyFinancialYearId &&
			effectiveRangesOverlap(
				companyFinancialYearEffectiveRange(financialYear),
				input.candidate,
			),
	);
	if (overlap === undefined) return ok(undefined);
	return fail(
		"CONFLICT",
		"Corporate Administration financial-year definition overlaps an existing definition.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			{ field: "effectivePeriod" },
		),
	);
}

export function validateFinancialYearSupersession(input: {
	financialYear: CompanyFinancialYear | null;
	expectedVersion: number;
}): Result<CompanyFinancialYear> {
	if (input.financialYear === null) {
		return fail(
			"NOT_FOUND",
			"Corporate Administration financial year was not found.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_NOT_FOUND",
				{ entityType: "companyFinancialYear" },
			),
		);
	}
	if (input.financialYear.version !== input.expectedVersion) {
		return fail(
			"CONFLICT",
			"Corporate Administration financial year version is stale.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_STALE_VERSION",
				{
					expectedVersion: input.expectedVersion,
					actualVersion: input.financialYear.version,
				},
			),
		);
	}
	return ok(input.financialYear);
}

export function resolveFinancialYearAsOf(input: {
	financialYears: readonly CompanyFinancialYear[];
	asOf: CanonicalDate;
	knownAt?: CanonicalInstant | undefined;
}): CompanyFinancialYear | null {
	const knownAt =
		input.knownAt === undefined ? undefined : new Date(input.knownAt);
	const matches = input.financialYears
		.filter(
			(financialYear) =>
				isDateInEffectiveRange(
					input.asOf,
					companyFinancialYearEffectiveRange(financialYear),
				) &&
				(knownAt === undefined || financialYear.recordedAt <= knownAt),
		)
		.sort(compareFinancialYearResolutionOrder);
	return matches.at(0) ?? null;
}

export function validateCompanyActivityClassification(
	classification: string,
): Result<CompanyActivityClassification> {
	if (
		classification === "registered_object" ||
		classification === "regulated" ||
		classification === "operational"
	) {
		return ok(classification);
	}
	return fail(
		"VALIDATION_ERROR",
		"Corporate Administration activity classification is invalid.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_VALIDATION_FAILED",
			{ field: "classification" },
		),
	);
}

export function validateActivityEffectiveRange(input: {
	candidate: EffectiveRange;
	existing: readonly CompanyActivity[];
	activityType?: CompanyActivityType;
	activityCode?: string;
	jurisdictionCode?: string | null;
	ignoreCompanyActivityId?: string;
}): Result<void> {
	const chronology = assertEffectivePeriodChronology(input.candidate);
	if (!chronology.ok) return chronology;
	const overlap = input.existing.find(
		(activity) =>
			activity.id !== input.ignoreCompanyActivityId &&
			activity.status === "active" &&
			(input.activityType === undefined ||
				activity.classification === input.activityType) &&
			(input.activityCode === undefined ||
				activity.activityCode === input.activityCode) &&
			(input.jurisdictionCode === undefined ||
				activity.jurisdictionCode === input.jurisdictionCode) &&
			effectiveRangesOverlap(
				companyActivityEffectiveRange(activity),
				input.candidate,
			),
	);
	if (overlap === undefined) return ok(undefined);
	return fail(
		"CONFLICT",
		"Corporate Administration company activity overlaps an existing activity.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			{ field: "effectivePeriod" },
		),
	);
}

export function validateActivityAuthority(input: {
	activityType: CompanyActivityType | string;
	classificationSystem: string;
	activityCode: string;
	jurisdictionCode?: string | null;
	regulatorCode?: string | null;
}): Result<void> {
	const classification = validateCompanyActivityClassification(
		input.activityType,
	);
	if (!classification.ok) return classification;
	if (input.classificationSystem.trim().length === 0) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration activity classification system is invalid.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "classificationSystem" },
			),
		);
	}
	if (input.activityCode.trim().length === 0) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration activity code is invalid.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "activityCode" },
			),
		);
	}
	if (
		classification.data === "regulated" &&
		(input.regulatorCode === undefined ||
			input.regulatorCode === null ||
			input.regulatorCode.trim().length === 0)
	) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration regulated activity requires a regulator.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "regulatorCode" },
			),
		);
	}
	if (
		input.jurisdictionCode !== undefined &&
		input.jurisdictionCode !== null &&
		!COUNTRY_CODE_PATTERN.test(input.jurisdictionCode)
	) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration activity jurisdiction is invalid.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "jurisdictionCode" },
			),
		);
	}
	return ok(undefined);
}

export function resolveActivitiesAsOf(input: {
	activities: readonly CompanyActivity[];
	asOf: CanonicalDate;
	activityType?: CompanyActivityType;
	jurisdictionCode?: string | null;
	knownAt?: CanonicalInstant | undefined;
}): readonly CompanyActivity[] {
	const knownAt =
		input.knownAt === undefined ? undefined : new Date(input.knownAt);
	return input.activities
		.filter(
			(activity) =>
				(input.activityType === undefined ||
					activity.classification === input.activityType) &&
				(input.jurisdictionCode === undefined ||
					activity.jurisdictionCode === input.jurisdictionCode) &&
				companyActivityMatchesAsOf({ activity, asOf: input.asOf }) &&
				(knownAt === undefined || activity.recordedAt <= knownAt),
		)
		.sort(compareActivityResolutionOrder);
}

const LEGAL_COMPANY_STATUS_TRANSITIONS = {
	draft: ["active", "archived"],
	active: [
		"suspended",
		"struck_off",
		"in_liquidation",
		"dissolved",
		"archived",
	],
	suspended: [
		"active",
		"struck_off",
		"in_liquidation",
		"dissolved",
		"archived",
	],
	struck_off: ["restored", "dissolved", "archived"],
	in_liquidation: ["dissolved", "restored"],
	dissolved: ["restored", "archived"],
	restored: ["active", "suspended", "in_liquidation", "dissolved", "archived"],
	archived: [],
} as const satisfies Readonly<
	Record<LegalCompanyStatus, readonly LegalCompanyStatus[]>
>;

export function validateLegalCompanyStatusTransition(
	input: Readonly<{
		from: LegalCompanyStatus;
		to: LegalCompanyStatus;
	}>,
): Result<void> {
	if (input.from === input.to) {
		return fail(
			"CONFLICT",
			"Corporate Administration legal company status is already current.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_INVALID_TRANSITION",
				{ field: "status" },
			),
		);
	}
	const allowedTransitions = LEGAL_COMPANY_STATUS_TRANSITIONS[
		input.from
	] as readonly LegalCompanyStatus[];
	if (!allowedTransitions.includes(input.to)) {
		return fail(
			"CONFLICT",
			"Corporate Administration legal company status transition is invalid.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_INVALID_TRANSITION",
				{ field: "status" },
			),
		);
	}
	return ok(undefined);
}

export function legalCompanyStatusRequiresApproval(
	status: LegalCompanyStatus,
): boolean {
	return (
		status === "struck_off" ||
		status === "in_liquidation" ||
		status === "dissolved" ||
		status === "restored" ||
		status === "archived"
	);
}

export function companyIdentifierMatchesAsOf(input: {
	identifier: CompanyIdentifier;
	asOf: CanonicalDate;
}): boolean {
	return isDateInEffectiveRange(
		input.asOf,
		companyIdentifierEffectiveRange(input.identifier),
	);
}

export function companyActivityMatchesAsOf(input: {
	activity: CompanyActivity;
	asOf: CanonicalDate;
}): boolean {
	return isDateInEffectiveRange(
		input.asOf,
		companyActivityEffectiveRange(input.activity),
	);
}

export function assertJurisdictionEntityTypeCompatible(input: {
	jurisdictionCountryCode: string;
	entityType: string;
	rules: readonly JurisdictionEntityTypeRule[];
}): Result<void> {
	const rule = input.rules.find(
		(candidate) =>
			candidate.jurisdictionCountryCode === input.jurisdictionCountryCode,
	);
	if (rule === undefined) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration jurisdiction is not configured.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "jurisdictionCountryCode" },
			),
		);
	}
	if (!rule.active) {
		return fail(
			"CONFLICT",
			"Corporate Administration jurisdiction is inactive.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
				{ field: "jurisdictionCountryCode" },
			),
		);
	}
	if (!rule.entityTypes.includes(input.entityType)) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration entity type is not valid for the jurisdiction.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "entityType" },
			),
		);
	}
	return ok(undefined);
}

export function assertEffectivePeriodChronology(
	range: EffectiveRange,
): Result<void> {
	if (range.to !== null && compareCanonicalDates(range.from, range.to) >= 0) {
		return fail(
			"CONFLICT",
			"Corporate Administration effective period is chronologically invalid.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_CHRONOLOGY_INVALID",
				{ field: "effectiveRange" },
			),
		);
	}
	return ok(undefined);
}

export function validateCompanyNameEffectiveRange(input: {
	candidate: EffectiveRange;
	nameType: CompanyName["nameType"];
	languageCode: string;
	normalizedName: string;
	existing: readonly CompanyName[];
	ignoreCompanyNameId?: string;
}): Result<void> {
	const chronology = assertEffectivePeriodChronology(input.candidate);
	if (!chronology.ok) return chronology;

	const duplicate = input.existing.find(
		(name) =>
			name.id !== input.ignoreCompanyNameId &&
			name.status === "active" &&
			name.nameType === input.nameType &&
			name.languageCode === input.languageCode &&
			name.normalizedName === input.normalizedName &&
			effectiveRangesOverlap(companyNameEffectiveRange(name), input.candidate),
	);
	if (duplicate !== undefined) {
		return fail(
			"CONFLICT",
			"Corporate Administration company name duplicates an effective name for the same type and language.",
			corporateAdministrationErrorDetails("CORPORATE_ADMINISTRATION_CONFLICT", {
				field: "normalizedName",
			}),
		);
	}

	const overlap = input.existing.find(
		(name) =>
			name.id !== input.ignoreCompanyNameId &&
			name.status === "active" &&
			name.nameType === input.nameType &&
			name.languageCode === input.languageCode &&
			effectiveRangesOverlap(companyNameEffectiveRange(name), input.candidate),
	);
	if (overlap === undefined) {
		return ok(undefined);
	}
	return fail(
		"CONFLICT",
		"Corporate Administration company name overlaps an existing name for the same type and language.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			{ field: "effectivePeriod" },
		),
	);
}

export function validateLegalFormEffectiveRange(input: {
	candidate: EffectiveRange;
	existing: readonly CompanyLegalForm[];
	ignoreLegalFormId?: string;
}): Result<void> {
	const chronology = assertEffectivePeriodChronology(input.candidate);
	if (!chronology.ok) return chronology;

	const overlap = input.existing.find(
		(legalForm) =>
			legalForm.id !== input.ignoreLegalFormId &&
			legalForm.status === "active" &&
			effectiveRangesOverlap(
				legalFormEffectiveRange(legalForm),
				input.candidate,
			),
	);
	if (overlap === undefined) {
		return ok(undefined);
	}
	return fail(
		"CONFLICT",
		"Corporate Administration legal form overlaps an existing legal form.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			{ field: "effectivePeriod" },
		),
	);
}

export function validateLegalFormCompatibility(input: {
	jurisdictionCode: string;
	legalFormCode: string;
	entityTypeCode: string;
	rules: readonly LegalFormCompatibilityRule[];
}): Result<void> {
	const rule = input.rules.find(
		(candidate) => candidate.jurisdictionCode === input.jurisdictionCode,
	);
	if (rule === undefined) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration legal-form jurisdiction is not configured.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "jurisdictionCode" },
			),
		);
	}
	if (!rule.active) {
		return fail(
			"CONFLICT",
			"Corporate Administration legal-form jurisdiction is inactive.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INACTIVE",
				{ field: "jurisdictionCode" },
			),
		);
	}
	if (!rule.legalFormCodes.includes(input.legalFormCode)) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration legal form is not valid for the jurisdiction.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "legalFormCode" },
			),
		);
	}
	if (!rule.entityTypeCodes.includes(input.entityTypeCode)) {
		return fail(
			"VALIDATION_ERROR",
			"Corporate Administration entity type is not valid for the legal form.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_REFERENCE_INVALID",
				{ field: "entityTypeCode" },
			),
		);
	}
	return ok(undefined);
}

export function assertNoJurisdictionProfileOverlap(input: {
	candidate: EffectiveRange;
	existing: readonly CompanyJurisdictionProfile[];
	ignoreProfileId?: string;
}): Result<void> {
	const overlap = input.existing.find(
		(profile) =>
			profile.jurisdictionProfileId !== input.ignoreProfileId &&
			profile.supersededAt === null &&
			effectiveRangesOverlap(profile.effectiveRange, input.candidate),
	);
	if (overlap === undefined) {
		return ok(undefined);
	}
	return fail(
		"CONFLICT",
		"Corporate Administration jurisdiction profile overlaps an existing profile.",
		corporateAdministrationErrorDetails(
			"CORPORATE_ADMINISTRATION_EFFECTIVE_RANGE_OVERLAP",
			{ field: "effectiveRange" },
		),
	);
}

export function assertNoCompanyNameOverlap(input: {
	candidate: EffectiveRange;
	nameType: CompanyName["nameType"];
	languageCode: string;
	existing: readonly CompanyName[];
	ignoreCompanyNameId?: string;
}): Result<void> {
	return validateCompanyNameEffectiveRange({
		...input,
		normalizedName: "",
	});
}

export function assertNoLegalFormOverlap(input: {
	candidate: EffectiveRange;
	existing: readonly CompanyLegalForm[];
	ignoreLegalFormId?: string;
}): Result<void> {
	return validateLegalFormEffectiveRange(input);
}

export function assertSupersessionEligible(input: {
	profile: CompanyJurisdictionProfile | null;
	expectedVersion: number;
}): Result<CompanyJurisdictionProfile> {
	if (input.profile === null) {
		return fail(
			"NOT_FOUND",
			"Corporate Administration jurisdiction profile was not found.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_NOT_FOUND",
				{ entityType: "companyJurisdictionProfile" },
			),
		);
	}
	if (input.profile.supersededAt !== null) {
		return fail(
			"CONFLICT",
			"Corporate Administration jurisdiction profile is already superseded.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_INVALID_TRANSITION",
				{ field: "jurisdictionProfileId" },
			),
		);
	}
	if (input.profile.version !== input.expectedVersion) {
		return fail(
			"CONFLICT",
			"Corporate Administration jurisdiction profile version is stale.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_STALE_VERSION",
				{
					expectedVersion: input.expectedVersion,
					actualVersion: input.profile.version,
				},
			),
		);
	}
	return ok(input.profile);
}

export function assertCompanyNameSupersessionEligible(input: {
	name: CompanyName | null;
	expectedVersion: number;
}): Result<CompanyName> {
	if (input.name === null) {
		return fail(
			"NOT_FOUND",
			"Corporate Administration company name was not found.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_NOT_FOUND",
				{ entityType: "companyName" },
			),
		);
	}
	if (input.name.status !== "active") {
		return fail(
			"CONFLICT",
			"Corporate Administration company name is not active.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_INVALID_TRANSITION",
				{ field: "companyNameId" },
			),
		);
	}
	if (input.name.version !== input.expectedVersion) {
		return fail(
			"CONFLICT",
			"Corporate Administration company name version is stale.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_STALE_VERSION",
				{
					expectedVersion: input.expectedVersion,
					actualVersion: input.name.version,
				},
			),
		);
	}
	return ok(input.name);
}

export function validateCompanyNameSupersession(input: {
	name: CompanyName | null;
	expectedVersion: number;
}): Result<CompanyName> {
	return assertCompanyNameSupersessionEligible(input);
}

export function assertCompanyNameRetirementEligible(input: {
	name: CompanyName | null;
	expectedVersion: number;
}): Result<CompanyName> {
	return assertCompanyNameSupersessionEligible(input);
}

export function assertLegalFormSupersessionEligible(input: {
	legalForm: CompanyLegalForm | null;
	expectedVersion: number;
}): Result<CompanyLegalForm> {
	if (input.legalForm === null) {
		return fail(
			"NOT_FOUND",
			"Corporate Administration legal form was not found.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_NOT_FOUND",
				{ entityType: "companyLegalForm" },
			),
		);
	}
	if (input.legalForm.status !== "active") {
		return fail(
			"CONFLICT",
			"Corporate Administration legal form is not active.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_INVALID_TRANSITION",
				{ field: "companyLegalFormHistoryId" },
			),
		);
	}
	if (input.legalForm.version !== input.expectedVersion) {
		return fail(
			"CONFLICT",
			"Corporate Administration legal form version is stale.",
			corporateAdministrationErrorDetails(
				"CORPORATE_ADMINISTRATION_STALE_VERSION",
				{
					expectedVersion: input.expectedVersion,
					actualVersion: input.legalForm.version,
				},
			),
		);
	}
	return ok(input.legalForm);
}

export function validateLegalFormSupersession(input: {
	legalForm: CompanyLegalForm | null;
	expectedVersion: number;
}): Result<CompanyLegalForm> {
	return assertLegalFormSupersessionEligible(input);
}

export function isFutureDatedProfile(input: {
	profile: CompanyJurisdictionProfile;
	today: CanonicalDate;
}): boolean {
	return (
		compareCanonicalDates(input.profile.effectiveRange.from, input.today) > 0
	);
}

export function isRetroactiveCorrection(input: {
	effectiveRange: EffectiveRange;
	today: CanonicalDate;
}): boolean {
	return compareCanonicalDates(input.effectiveRange.from, input.today) < 0;
}

export function matchesAsOf(input: {
	profile: CompanyJurisdictionProfile;
	asOf: CanonicalDate;
}): boolean {
	return isDateInEffectiveRange(input.asOf, input.profile.effectiveRange);
}

export function companyNameMatchesAsOf(input: {
	name: CompanyName;
	asOf: CanonicalDate;
}): boolean {
	return isDateInEffectiveRange(
		input.asOf,
		companyNameEffectiveRange(input.name),
	);
}

export function resolveCompanyNameAsOf(input: {
	names: readonly CompanyName[];
	nameType: CompanyName["nameType"];
	languageCode: string;
	asOf: CanonicalDate;
	knownAt?: CanonicalInstant | undefined;
}): CompanyName | null {
	const matches = input.names
		.filter(
			(name) =>
				name.nameType === input.nameType &&
				name.languageCode === input.languageCode &&
				companyNameMatchesAsOf({ name, asOf: input.asOf }) &&
				isCompanyNameVisibleAtKnownTime({
					name,
					knownAt: input.knownAt,
				}),
		)
		.sort(compareCompanyNameResolutionOrder);

	return matches.at(0) ?? null;
}

export function legalFormMatchesAsOf(input: {
	legalForm: CompanyLegalForm;
	asOf: CanonicalDate;
}): boolean {
	return isDateInEffectiveRange(
		input.asOf,
		legalFormEffectiveRange(input.legalForm),
	);
}

export function resolveCompanyLegalFormAsOf(input: {
	legalForms: readonly CompanyLegalForm[];
	asOf: CanonicalDate;
	knownAt?: CanonicalInstant | undefined;
}): CompanyLegalForm | null {
	const matches = input.legalForms
		.filter(
			(legalForm) =>
				legalFormMatchesAsOf({ legalForm, asOf: input.asOf }) &&
				isLegalFormVisibleAtKnownTime({
					legalForm,
					knownAt: input.knownAt,
				}),
		)
		.sort(compareLegalFormResolutionOrder);

	return matches.at(0) ?? null;
}

export function isVisibleAtKnownTime(input: {
	profile: CompanyJurisdictionProfile;
	knownAt?: CanonicalInstant | undefined;
}): boolean {
	if (input.knownAt === undefined) {
		return input.profile.supersededAt === null;
	}
	return (
		input.profile.recordedAt <= input.knownAt &&
		(input.profile.supersededAt === null ||
			input.knownAt < input.profile.supersededAt)
	);
}

export function isCompanyNameVisibleAtKnownTime(input: {
	name: CompanyName;
	knownAt?: CanonicalInstant | undefined;
}): boolean {
	if (input.knownAt === undefined) {
		return input.name.status === "active";
	}
	const knownAt = new Date(input.knownAt);
	return (
		input.name.recordedAt <= knownAt &&
		(input.name.supersededAt === null || knownAt < input.name.supersededAt) &&
		(input.name.retiredAt === null || knownAt < input.name.retiredAt)
	);
}

export function isLegalFormVisibleAtKnownTime(input: {
	legalForm: CompanyLegalForm;
	knownAt?: CanonicalInstant | undefined;
}): boolean {
	if (input.knownAt === undefined) {
		return input.legalForm.status === "active";
	}
	const knownAt = new Date(input.knownAt);
	return (
		input.legalForm.recordedAt <= knownAt &&
		(input.legalForm.supersededAt === null ||
			knownAt < input.legalForm.supersededAt)
	);
}

function companyNameEffectiveRange(name: CompanyName): EffectiveRange {
	return {
		from: name.effectiveFrom,
		to: name.effectiveTo,
	};
}

function legalFormEffectiveRange(legalForm: CompanyLegalForm): EffectiveRange {
	return {
		from: legalForm.effectiveFrom,
		to: legalForm.effectiveTo,
	};
}

function companyIdentifierEffectiveRange(
	identifier: CompanyIdentifier,
): EffectiveRange {
	return {
		from: identifier.effectiveFrom,
		to: identifier.effectiveTo,
	};
}

function companyFinancialYearEffectiveRange(
	financialYear: CompanyFinancialYear,
): EffectiveRange {
	return {
		from: financialYear.effectiveFrom,
		to: financialYear.effectiveTo,
	};
}

function companyActivityEffectiveRange(
	activity: CompanyActivity,
): EffectiveRange {
	return {
		from: activity.effectiveFrom,
		to: activity.effectiveTo,
	};
}

function identifierMatchesUniquenessScope(input: {
	identifier: CompanyIdentifier;
	legalCompanyId?: string | undefined;
	uniquenessScope: CompanyIdentifierUniquenessScope;
}): boolean {
	if (input.uniquenessScope === "company_authority") {
		return input.identifier.legalCompanyId === input.legalCompanyId;
	}
	return true;
}

function compareCompanyNameResolutionOrder(
	left: CompanyName,
	right: CompanyName,
): number {
	const effectiveOrder = compareCanonicalDates(
		right.effectiveFrom,
		left.effectiveFrom,
	);
	if (effectiveOrder !== 0) return effectiveOrder;
	return right.recordedAt.getTime() - left.recordedAt.getTime();
}

function compareFinancialYearResolutionOrder(
	left: CompanyFinancialYear,
	right: CompanyFinancialYear,
): number {
	const effectiveOrder = compareCanonicalDates(
		right.effectiveFrom,
		left.effectiveFrom,
	);
	if (effectiveOrder !== 0) return effectiveOrder;
	return right.recordedAt.getTime() - left.recordedAt.getTime();
}

function compareActivityResolutionOrder(
	left: CompanyActivity,
	right: CompanyActivity,
): number {
	const classOrder =
		activityClassificationRank(left.classification) -
		activityClassificationRank(right.classification);
	if (classOrder !== 0) return classOrder;
	const effectiveOrder = compareCanonicalDates(
		right.effectiveFrom,
		left.effectiveFrom,
	);
	if (effectiveOrder !== 0) return effectiveOrder;
	return right.recordedAt.getTime() - left.recordedAt.getTime();
}

function activityClassificationRank(
	classification: CompanyActivityClassification,
): number {
	if (classification === "registered_object") return 0;
	if (classification === "regulated") return 1;
	return 2;
}

function compareLegalFormResolutionOrder(
	left: CompanyLegalForm,
	right: CompanyLegalForm,
): number {
	const effectiveOrder = compareCanonicalDates(
		right.effectiveFrom,
		left.effectiveFrom,
	);
	if (effectiveOrder !== 0) return effectiveOrder;
	return right.recordedAt.getTime() - left.recordedAt.getTime();
}

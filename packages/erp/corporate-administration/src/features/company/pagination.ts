import type { Result } from "@afenda/errors";
import { z } from "zod";
import {
	companyActivityIdSchema,
	companyIdentifierIdSchema,
	companyNameIdSchema,
	legalCompanyIdSchema,
} from "../../kernel/brands";
import {
	canonicalDateSchema,
	canonicalInstantSchema,
	toCanonicalInstant,
} from "../../kernel/dates";
import {
	decodeCorporateAdministrationCursor,
	encodeCorporateAdministrationCursor,
} from "../../kernel/internal/pagination-cursor";
import type { OpaqueCursor } from "../../kernel/pagination";
import {
	companyActivityClassificationSchema,
	companyIdentifierAuthoritySchema,
	companyIdentifierTypeSchema,
	companyNameTypeSchema,
} from "./schemas";
import type {
	CompaniesByStatusQuery,
	CompanyActivitiesAsOfQuery,
	CompanyIdentifierListQuery,
	CompanyNameListQuery,
	LegalCompanyTimelineStoreInput,
	ListLegalCompaniesStoreInput,
} from "./store";
import type { LegalCompanyTimelineEntry } from "./types";

const legalCompanyCursorKeySchema = z.tuple([
	z.string().min(1),
	legalCompanyIdSchema,
]);
const companyNameCursorKeySchema = z.tuple([
	companyNameTypeSchema,
	z.string().min(1),
	canonicalDateSchema,
	canonicalInstantSchema,
	companyNameIdSchema,
]);
const companyIdentifierCursorKeySchema = z.tuple([
	companyIdentifierTypeSchema,
	z.string().regex(/^[A-Z]{2}$/),
	companyIdentifierAuthoritySchema,
	canonicalDateSchema,
	canonicalInstantSchema,
	companyIdentifierIdSchema,
]);
const companyActivityCursorKeySchema = z.tuple([
	companyActivityClassificationSchema,
	z.string().min(1),
	canonicalDateSchema,
	companyActivityIdSchema,
]);
export const LEGAL_COMPANY_TIMELINE_KIND_ORDER = [
	"profile",
	"jurisdiction_profile",
	"company_status",
] as const;
const legalCompanyTimelineKindSchema = z.enum(
	LEGAL_COMPANY_TIMELINE_KIND_ORDER,
);
const legalCompanyTimelineCursorKeySchema = z.tuple([
	canonicalInstantSchema,
	legalCompanyTimelineKindSchema,
	z.string().min(1),
]);

export type LegalCompanyCursorKey = z.infer<typeof legalCompanyCursorKeySchema>;
export type CompanyNameCursorKey = z.infer<typeof companyNameCursorKeySchema>;
export type CompanyIdentifierCursorKey = z.infer<
	typeof companyIdentifierCursorKeySchema
>;
export type CompanyActivityCursorKey = z.infer<
	typeof companyActivityCursorKeySchema
>;
export type LegalCompanyTimelineCursorKey = z.infer<
	typeof legalCompanyTimelineCursorKeySchema
>;

export function encodeLegalCompanyCursor(
	scope: ReturnType<typeof legalCompanyCursorScope>,
	key: LegalCompanyCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor("legal_companies", scope, key);
}

export function decodeLegalCompanyCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof legalCompanyCursorScope>,
): Result<LegalCompanyCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"legal_companies",
		scope,
		legalCompanyCursorKeySchema,
	);
}

export function encodeCompaniesByStatusCursor(
	scope: ReturnType<typeof companiesByStatusCursorScope>,
	key: LegalCompanyCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor("companies_by_status", scope, key);
}

export function decodeCompaniesByStatusCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof companiesByStatusCursorScope>,
): Result<LegalCompanyCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"companies_by_status",
		scope,
		legalCompanyCursorKeySchema,
	);
}

export function encodeCompanyNameCursor(
	scope: ReturnType<typeof companyNameCursorScope>,
	key: CompanyNameCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor("company_names", scope, key);
}

export function decodeCompanyNameCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof companyNameCursorScope>,
): Result<CompanyNameCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"company_names",
		scope,
		companyNameCursorKeySchema,
	);
}

export function encodeCompanyIdentifierCursor(
	scope: ReturnType<typeof companyIdentifierCursorScope>,
	key: CompanyIdentifierCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor("company_identifiers", scope, key);
}

export function decodeCompanyIdentifierCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof companyIdentifierCursorScope>,
): Result<CompanyIdentifierCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"company_identifiers",
		scope,
		companyIdentifierCursorKeySchema,
	);
}

export function encodeCompanyActivityCursor(
	scope: ReturnType<typeof companyActivityCursorScope>,
	key: CompanyActivityCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor(
		"company_activities_as_of",
		scope,
		key,
	);
}

export function decodeCompanyActivityCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof companyActivityCursorScope>,
): Result<CompanyActivityCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"company_activities_as_of",
		scope,
		companyActivityCursorKeySchema,
	);
}

export function encodeLegalCompanyTimelineCursor(
	scope: ReturnType<typeof legalCompanyTimelineCursorScope>,
	key: LegalCompanyTimelineCursorKey,
): OpaqueCursor {
	return encodeCorporateAdministrationCursor(
		"legal_company_timeline",
		scope,
		key,
	);
}

export function decodeLegalCompanyTimelineCursor(
	cursor: OpaqueCursor | undefined,
	scope: ReturnType<typeof legalCompanyTimelineCursorScope>,
): Result<LegalCompanyTimelineCursorKey | null> {
	return decodeCorporateAdministrationCursor(
		cursor,
		"legal_company_timeline",
		scope,
		legalCompanyTimelineCursorKeySchema,
	);
}

export function legalCompanyCursorScope(input: ListLegalCompaniesStoreInput) {
	return {
		organizationId: input.organizationId,
		asOf: input.asOf ?? null,
		knownAt: input.knownAt ?? null,
	} as const;
}

export function companiesByStatusCursorScope(query: CompaniesByStatusQuery) {
	return {
		organizationId: query.organizationId,
		status: query.status,
		asOf: query.asOf ?? null,
		knownAt: query.knownAt ?? null,
	} as const;
}

export function companyNameCursorScope(query: CompanyNameListQuery) {
	return {
		organizationId: query.organizationId,
		legalCompanyId: query.legalCompanyId,
		nameType: query.nameType ?? null,
		languageCode: query.languageCode ?? null,
		activeAt: query.activeAt ?? null,
		includeFormer: query.includeFormer ?? false,
		knownAt: query.knownAt ?? null,
		ordering:
			query.ordering ??
			"name_type_language_effective_from_desc_recorded_at_desc_id",
	} as const;
}

export function companyIdentifierCursorScope(
	query: CompanyIdentifierListQuery,
) {
	return {
		organizationId: query.organizationId,
		legalCompanyId: query.legalCompanyId,
		identifierType: query.identifierType ?? null,
		jurisdictionCode: query.jurisdictionCode ?? null,
		issuingAuthorityCode: query.issuingAuthorityCode ?? null,
		activeAt: query.activeAt ?? null,
		includeRetired: query.includeRetired ?? false,
		knownAt: query.knownAt ?? null,
	} as const;
}

export function companyActivityCursorScope(query: CompanyActivitiesAsOfQuery) {
	return {
		organizationId: query.organizationId,
		legalCompanyId: query.legalCompanyId,
		asOf: query.asOf,
		classification: query.classification ?? null,
		classificationSystem: query.classificationSystem ?? null,
		jurisdictionCode: query.jurisdictionCode ?? null,
		regulatorCode: query.regulatorCode ?? null,
		primaryOnly: query.primaryOnly ?? false,
		knownAt: query.knownAt ?? null,
	} as const;
}

export function legalCompanyTimelineCursorScope(
	input: LegalCompanyTimelineStoreInput,
) {
	return {
		organizationId: input.organizationId,
		legalCompanyId: input.legalCompanyId,
		knownAt: input.knownAt ?? null,
	} as const;
}

export function legalCompanyTimelineKindRank(
	kind: LegalCompanyTimelineCursorKey[1],
): number {
	return LEGAL_COMPANY_TIMELINE_KIND_ORDER.indexOf(kind);
}

export function legalCompanyTimelineCursorKey(
	entry: LegalCompanyTimelineEntry,
): LegalCompanyTimelineCursorKey {
	return [
		toCanonicalInstant(new Date(entry.recordedAt)),
		entry.kind,
		legalCompanyTimelineEntryId(entry),
	];
}

export function compareLegalCompanyTimelineEntries(
	left: LegalCompanyTimelineEntry,
	right: LegalCompanyTimelineEntry,
): number {
	return compareLegalCompanyTimelineCursorKeys(
		legalCompanyTimelineCursorKey(left),
		legalCompanyTimelineCursorKey(right),
	);
}

export function compareLegalCompanyTimelineEntryToCursor(
	entry: LegalCompanyTimelineEntry,
	cursor: LegalCompanyTimelineCursorKey,
): number {
	return compareLegalCompanyTimelineCursorKeys(
		legalCompanyTimelineCursorKey(entry),
		cursor,
	);
}

function compareLegalCompanyTimelineCursorKeys(
	left: LegalCompanyTimelineCursorKey,
	right: LegalCompanyTimelineCursorKey,
): number {
	return (
		left[0].localeCompare(right[0]) ||
		legalCompanyTimelineKindRank(left[1]) -
			legalCompanyTimelineKindRank(right[1]) ||
		left[2].localeCompare(right[2])
	);
}

function legalCompanyTimelineEntryId(entry: LegalCompanyTimelineEntry): string {
	if ("jurisdictionProfileId" in entry) {
		return entry.jurisdictionProfileId;
	}
	if ("id" in entry) {
		return entry.id;
	}
	return entry.legalCompanyId;
}

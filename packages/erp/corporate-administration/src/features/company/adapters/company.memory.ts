// biome-ignore-all lint/suspicious/useAwait: The deterministic memory adapter implements asynchronous corporate administration ports.
// biome-ignore-all lint/suspicious/noShadow: Domain-local callback names mirror the company records they inspect.
import { randomUUID } from "node:crypto";
import { errorResult, type Result } from "@afenda/errors";
import {
	companyActivityIdSchema,
	companyFinancialYearIdSchema,
	companyIdentifierIdSchema,
	companyLegalFormHistoryIdSchema,
	companyNameIdSchema,
	legalCompanyIdSchema,
} from "../../../kernel/brands";
import {
	canonicalDateSchema,
	canonicalInstantSchema,
	toCanonicalInstant,
} from "../../../kernel/dates";
import {
	type CompanyActivityCursorKey,
	type CompanyIdentifierCursorKey,
	type CompanyNameCursorKey,
	companiesByStatusCursorScope,
	companyActivityCursorScope,
	companyIdentifierCursorScope,
	companyNameCursorScope,
	compareLegalCompanyTimelineEntries,
	compareLegalCompanyTimelineEntryToCursor,
	decodeCompaniesByStatusCursor,
	decodeCompanyActivityCursor,
	decodeCompanyIdentifierCursor,
	decodeCompanyNameCursor,
	decodeLegalCompanyCursor,
	decodeLegalCompanyTimelineCursor,
	encodeCompaniesByStatusCursor,
	encodeCompanyActivityCursor,
	encodeCompanyIdentifierCursor,
	encodeCompanyNameCursor,
	encodeLegalCompanyCursor,
	encodeLegalCompanyTimelineCursor,
	type LegalCompanyCursorKey,
	legalCompanyCursorScope,
	legalCompanyTimelineCursorKey,
	legalCompanyTimelineCursorScope,
} from "../pagination";
import {
	isVisibleAtKnownTime,
	matchesAsOf,
	validateActivityEffectiveRange,
	validateFinancialYearChronology,
	validateIdentifierEffectiveRange,
} from "../rules";
import type {
	CompaniesByStatusQuery,
	CompanyActivitiesAsOfQuery,
	CompanyActivityOverlapQuery,
	CompanyActivityStore,
	CompanyFinancialYearOverlapQuery,
	CompanyFinancialYearStore,
	CompanyIdentifierListQuery,
	CompanyIdentifierStore,
	CompanyLegalFormAsOfQuery,
	CompanyLegalFormStore,
	CompanyNameListPage,
	CompanyNameListQuery,
	CompanyNameStore,
	LegalCompanyStore,
} from "../store";
import type {
	CompanyActivity,
	CompanyActivityListItem,
	CompanyActivityListPage,
	CompanyFinancialYear,
	CompanyIdentifier,
	CompanyIdentifierListItem,
	CompanyIdentifierListPage,
	CompanyJurisdictionProfile,
	CompanyLegalFormHistory,
	CompanyName,
	CompanyNameListItem,
	CompanyStatusHistory,
	LegalCompany,
	LegalCompanyListPage,
	LegalCompanyTimelineEntry,
	LegalCompanyTimelinePage,
} from "../types";

function cloneCompany(company: LegalCompany): LegalCompany {
	return structuredClone(company);
}

function cloneProfile(
	profile: CompanyJurisdictionProfile,
): CompanyJurisdictionProfile {
	return structuredClone(profile);
}

function cloneCompanyName(name: CompanyName): CompanyName {
	return structuredClone(name);
}

function cloneLegalForm(
	form: CompanyLegalFormHistory,
): CompanyLegalFormHistory {
	return structuredClone(form);
}

function cloneIdentifier(identifier: CompanyIdentifier): CompanyIdentifier {
	return structuredClone(identifier);
}

function cloneFinancialYear(
	financialYear: CompanyFinancialYear,
): CompanyFinancialYear {
	return structuredClone(financialYear);
}

function cloneActivity(activity: CompanyActivity): CompanyActivity {
	return structuredClone(activity);
}

function cloneStatusHistory(
	status: CompanyStatusHistory,
): CompanyStatusHistory {
	return structuredClone(status);
}

type MemoryCorporateAdministrationLegalCompanyStore = LegalCompanyStore &
	CompanyNameStore &
	CompanyLegalFormStore &
	CompanyIdentifierStore &
	CompanyFinancialYearStore &
	CompanyActivityStore;

export function createMemoryCorporateAdministrationLegalCompanyStore(): MemoryCorporateAdministrationLegalCompanyStore {
	const companies = new Map<string, LegalCompany>();
	const jurisdictionProfiles = new Map<string, CompanyJurisdictionProfile>();
	const companyNames = new Map<string, CompanyName>();
	const legalForms = new Map<string, CompanyLegalFormHistory>();
	const identifiers = new Map<string, CompanyIdentifier>();
	const financialYears = new Map<string, CompanyFinancialYear>();
	const activities = new Map<string, CompanyActivity>();
	const statusHistory = new Map<string, CompanyStatusHistory>();

	function key(organizationId: string, legalCompanyId: string): string {
		return `${organizationId}:${legalCompanyId}`;
	}

	function codeKey(
		organizationId: string,
		normalizedCompanyCode: string,
	): string {
		return `${organizationId}:${normalizedCompanyCode}`;
	}

	const store: MemoryCorporateAdministrationLegalCompanyStore = {
		async getLegalCompany(input) {
			const company = cloneNullable(
				companies.get(key(input.organizationId, input.legalCompanyId)),
			);
			if (company === null) {
				return errorResult.ok(null);
			}
			return errorResult.ok({
				...company,
				currentJurisdictionProfile: findCurrentProfile({
					organizationId: input.organizationId,
					legalCompanyId: input.legalCompanyId,
				}),
			});
		},
		async listLegalCompanies(input): Promise<Result<LegalCompanyListPage>> {
			const cursorScope = legalCompanyCursorScope(input);
			const decodedCursor = decodeLegalCompanyCursor(
				input.pagination.cursor,
				cursorScope,
			);
			if (!decodedCursor.ok) {
				return decodedCursor;
			}
			const ordered = Array.from(companies.values())
				.filter((company) => company.organizationId === input.organizationId)
				.filter(
					(company) =>
						input.asOf === undefined ||
						companyStatusMatchesAsOf({
							organizationId: input.organizationId,
							legalCompanyId: company.legalCompanyId,
							status: company.state,
							asOf: input.asOf,
							knownAt: input.knownAt,
						}),
				)
				.sort(
					(left, right) =>
						left.normalizedCompanyCode.localeCompare(
							right.normalizedCompanyCode,
						) || left.legalCompanyId.localeCompare(right.legalCompanyId),
				)
				.filter(
					(company) =>
						decodedCursor.data === null ||
						compareLegalCompanyCursor(company, decodedCursor.data) > 0,
				)
				.slice(0, input.pagination.limit + 1);
			const pageRows = ordered.slice(0, input.pagination.limit);
			const items = pageRows.map((company) => ({
				organizationId: company.organizationId,
				legalCompanyId: company.legalCompanyId,
				companyCode: company.companyCode,
				normalizedCompanyCode: company.normalizedCompanyCode,
				masterDataPartyId: company.masterDataPartyId,
				homeJurisdictionCountryCode: company.homeJurisdictionCountryCode,
				state: company.state,
				profile: company.profile,
				version: company.version,
				jurisdictionCountryCode: company.homeJurisdictionCountryCode,
				entityType: "draft_legal_company",
			}));
			const last = pageRows.at(-1);
			return errorResult.ok({
				items,
				nextCursor:
					ordered.length > input.pagination.limit && last !== undefined
						? encodeLegalCompanyCursor(cursorScope, [
								last.normalizedCompanyCode,
								last.legalCompanyId,
							])
						: null,
			});
		},
		async registerLegalCompanyDraft(input) {
			const duplicate = Array.from(companies.values()).find(
				(company) =>
					codeKey(company.organizationId, company.normalizedCompanyCode) ===
					codeKey(input.organizationId, input.normalizedCompanyCode),
			);
			if (duplicate !== undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Corporate Administration legal company code already exists.",
				});
			}
			const legalCompanyId = legalCompanyIdSchema.parse(randomUUID());
			const company: LegalCompany = {
				organizationId: input.organizationId,
				legalCompanyId,
				companyCode: input.companyCode,
				normalizedCompanyCode: input.normalizedCompanyCode,
				masterDataPartyId: input.masterDataPartyId,
				homeJurisdictionCountryCode: input.homeJurisdictionCountryCode,
				state: "draft",
				profile: {
					displayName: input.displayName,
					sourceReference: input.sourceReference,
				},
				currentJurisdictionProfile: null,
				createdByUserId: input.createdByUserId,
				updatedByUserId: input.createdByUserId,
				createdAt: input.createdAt,
				updatedAt: input.createdAt,
				version: 1,
			};
			companies.set(
				key(input.organizationId, legalCompanyId),
				cloneCompany(company),
			);
			return errorResult.ok(company);
		},
		async updateLegalCompanyProfile(input) {
			const existing = companies.get(
				key(input.organizationId, input.legalCompanyId),
			);
			if (existing === undefined) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage:
						"Corporate Administration legal company was not found.",
				});
			}
			if (existing.version !== input.expectedVersion) {
				return errorResult.fail("CONFLICT", {
					publicMessage:
						"Corporate Administration legal company version is stale.",
				});
			}
			const updated: LegalCompany = {
				...existing,
				profile: input.profile,
				updatedByUserId: input.actorUserId,
				version: input.expectedVersion + 1,
			};
			companies.set(key(input.organizationId, input.legalCompanyId), updated);
			return errorResult.ok(cloneCompany(updated));
		},
		async insertJurisdictionProfile(input) {
			const jurisdictionProfileId = randomUUID();
			const profile: CompanyJurisdictionProfile = {
				jurisdictionProfileId,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				jurisdictionCountryCode: input.jurisdictionCountryCode,
				entityType: input.entityType,
				effectiveRange: input.effectiveRange,
				recordedAt: input.recordedAt,
				recordedByUserId: input.recordedByUserId,
				sourceReference: input.sourceReference,
				supersededAt: null,
				supersededByProfileId: null,
				version: 1,
			};
			jurisdictionProfiles.set(jurisdictionProfileId, cloneProfile(profile));
			const company = companies.get(
				key(input.organizationId, input.legalCompanyId),
			);
			if (company !== undefined) {
				companies.set(key(input.organizationId, input.legalCompanyId), {
					...company,
					version: input.expectedCompanyVersion + 1,
					updatedByUserId: input.recordedByUserId,
					updatedAt: input.recordedAt,
				});
			}
			return errorResult.ok(profile);
		},
		async supersedeJurisdictionProfile(input) {
			const superseded = jurisdictionProfiles.get(input.jurisdictionProfileId);
			if (superseded === undefined) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage:
						"Corporate Administration jurisdiction profile was not found.",
				});
			}
			const replacementId = randomUUID();
			const replacement: CompanyJurisdictionProfile = {
				jurisdictionProfileId: replacementId,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				jurisdictionCountryCode: input.replacement.jurisdictionCountryCode,
				entityType: input.replacement.entityType,
				effectiveRange: input.replacement.effectiveRange,
				recordedAt: input.replacement.recordedAt,
				recordedByUserId: input.recordedByUserId,
				sourceReference: input.replacement.sourceReference,
				supersededAt: null,
				supersededByProfileId: null,
				version: 1,
			};
			jurisdictionProfiles.set(input.jurisdictionProfileId, {
				...superseded,
				supersededAt: input.replacement.recordedAt,
				supersededByProfileId: replacementId,
				version: input.expectedProfileVersion + 1,
			});
			jurisdictionProfiles.set(replacementId, cloneProfile(replacement));
			return errorResult.ok(replacement);
		},
		async findJurisdictionProfileAsOf(input) {
			return errorResult.ok(findCurrentProfile(input));
		},
		async listJurisdictionProfiles(input) {
			return errorResult.ok(listProfiles(input).map(cloneProfile));
		},
		async hasOverlappingJurisdictionProfile(input) {
			return errorResult.ok(
				listProfiles(input).some(
					(profile) =>
						profile.jurisdictionProfileId !==
							input.ignoreJurisdictionProfileId &&
						profile.supersededAt === null &&
						profile.effectiveRange.from <
							(input.effectiveRange.to ?? "9999-12-31") &&
						input.effectiveRange.from <
							(profile.effectiveRange.to ?? "9999-12-31"),
				),
			);
		},
		async insertCompanyName(input) {
			return addCompanyNameRecord(input);
		},
		async addCompanyName(input) {
			return addCompanyNameRecord(input);
		},
		async findCompanyNameById(organizationId, companyNameId) {
			const name = companyNames.get(companyNameId);
			if (name === undefined || name.organizationId !== organizationId) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneCompanyName(name));
		},
		async getCompanyName(input) {
			const name = companyNames.get(input.companyNameId);
			if (
				name === undefined ||
				name.organizationId !== input.organizationId ||
				name.legalCompanyId !== input.legalCompanyId ||
				!isKnownAt(name, input.knownAt)
			) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneCompanyName(name));
		},
		async listCompanyNames(query) {
			const cursorScope = companyNameCursorScope(query);
			const decodedCursor = decodeCompanyNameCursor(query.cursor, cursorScope);
			if (!decodedCursor.ok) {
				return decodedCursor;
			}
			const pageSize = query.pageSize ?? 50;
			const ordered = listCompanyNameRecords(query)
				.filter(
					(name) => query.includeFormer === true || name.status !== "retired",
				)
				.filter((name) => isKnownAt(name, query.knownAt))
				.filter(
					(name) =>
						query.activeAt === undefined ||
						isEffectiveOn(
							{
								from: name.effectiveFrom,
								to: name.effectiveTo,
							},
							query.activeAt,
						),
				)
				.sort(compareCompanyNames)
				.filter(
					(name) =>
						decodedCursor.data === null ||
						compareCompanyNameCursor(name, decodedCursor.data) > 0,
				)
				.slice(0, pageSize + 1);
			const pageRows = ordered.slice(0, pageSize);
			const items: CompanyNameListItem[] = pageRows.map((name) => ({
				id: name.id,
				legalCompanyId: name.legalCompanyId,
				nameType: name.nameType,
				languageCode: name.languageCode,
				displayName: name.displayName,
				normalizedName: name.normalizedName,
				effectiveFrom: name.effectiveFrom,
				effectiveTo: name.effectiveTo,
				status: name.status,
			}));
			const last = pageRows.at(-1);
			return errorResult.ok({
				items,
				nextCursor:
					ordered.length > pageSize && last !== undefined
						? encodeCompanyNameCursor(cursorScope, companyNameCursorKey(last))
						: null,
			} satisfies CompanyNameListPage);
		},
		async findCompanyNameAsOf(query) {
			const name =
				listCompanyNameRecords(query)
					.filter((candidate) => candidate.status === "active")
					.filter((candidate) => isKnownAt(candidate, query.knownAt))
					.filter((candidate) =>
						isEffectiveOn(
							{
								from: candidate.effectiveFrom,
								to: candidate.effectiveTo,
							},
							query.asOf,
						),
					)
					.sort((left, right) => {
						const recorded =
							right.recordedAt.getTime() - left.recordedAt.getTime();
						return recorded === 0 ? left.id.localeCompare(right.id) : recorded;
					})[0] ?? null;
			return errorResult.ok(name === null ? null : cloneCompanyName(name));
		},
		async findOverlappingCompanyName(query) {
			const name =
				listCompanyNameRecords(query)
					.filter(
						(candidate) =>
							query.ignoreCompanyNameId === undefined ||
							candidate.id !== query.ignoreCompanyNameId,
					)
					.filter(
						(candidate) =>
							query.normalizedName === undefined ||
							candidate.normalizedName === query.normalizedName,
					)
					.filter(
						(candidate) =>
							query.statuses === undefined ||
							query.statuses.includes(candidate.status),
					)
					.filter((candidate) =>
						overlaps(
							{ from: candidate.effectiveFrom, to: candidate.effectiveTo },
							query.effectivePeriod,
						),
					)
					.sort((left, right) => {
						const recorded =
							right.recordedAt.getTime() - left.recordedAt.getTime();
						return recorded === 0 ? left.id.localeCompare(right.id) : recorded;
					})[0] ?? null;
			return errorResult.ok(name === null ? null : cloneCompanyName(name));
		},
		async hasOverlappingCompanyName(input) {
			const overlap = await this.findOverlappingCompanyName(input);
			return overlap.ok ? errorResult.ok(overlap.data !== null) : overlap;
		},
		async supersedeCompanyName(input) {
			const predecessor = companyNames.get(input.companyNameId);
			if (
				predecessor === undefined ||
				predecessor.organizationId !== input.organizationId ||
				predecessor.legalCompanyId !== input.legalCompanyId
			) {
				return notFound("companyName");
			}
			if (predecessor.version !== input.expectedNameVersion) {
				return stale(input.expectedNameVersion, predecessor.version);
			}
			const replacementId = companyNameIdSchema.parse(randomUUID());
			const replacement: CompanyName = {
				id: replacementId,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				nameType: input.replacement.nameType,
				languageCode: input.replacement.languageCode,
				displayName: input.replacement.displayName,
				normalizedName: input.replacement.normalizedName,
				effectiveFrom: input.replacement.effectivePeriod.from,
				effectiveTo: input.replacement.effectivePeriod.to,
				recordedAt: new Date(input.replacement.recordedAt),
				recordedBy: input.recordedByUserId,
				sourceDocumentId: input.replacement.sourceDocumentId,
				correctionReason: input.replacement.correctionReason,
				status: "active",
				supersedesId: input.companyNameId,
				supersededAt: null,
				retiredAt: null,
				version: 1,
			};
			companyNames.set(input.companyNameId, {
				...predecessor,
				status: "superseded",
				supersededAt: new Date(input.replacement.recordedAt),
				version: input.expectedNameVersion + 1,
			});
			companyNames.set(replacementId, cloneCompanyName(replacement));
			return errorResult.ok(cloneCompanyName(replacement));
		},
		async retireCompanyName(input) {
			const name = companyNames.get(input.companyNameId);
			if (
				name === undefined ||
				name.organizationId !== input.organizationId ||
				name.legalCompanyId !== input.legalCompanyId
			) {
				return notFound("companyName");
			}
			if (name.version !== input.expectedNameVersion) {
				return stale(input.expectedNameVersion, name.version);
			}
			const retired: CompanyName = {
				...name,
				status: "retired",
				retiredAt: new Date(input.retiredAt),
				correctionReason: input.retirementReason,
				version: input.expectedNameVersion + 1,
			};
			companyNames.set(input.companyNameId, cloneCompanyName(retired));
			return errorResult.ok(cloneCompanyName(retired));
		},
		async lockCompanyNameScope() {
			return errorResult.ok(undefined);
		},
		async insertCompanyLegalForm(input) {
			return setCompanyLegalFormRecord(input);
		},
		async setCompanyLegalForm(input) {
			return setCompanyLegalFormRecord(input);
		},
		async getCompanyLegalForm(input) {
			const form = legalForms.get(input.companyLegalFormHistoryId);
			if (
				form === undefined ||
				form.organizationId !== input.organizationId ||
				form.legalCompanyId !== input.legalCompanyId ||
				!isKnownAt(form, input.knownAt)
			) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneLegalForm(form));
		},
		async listCompanyLegalForms(input) {
			return errorResult.ok(
				listLegalFormRecords(input)
					.filter((form) => isKnownAt(form, input.knownAt))
					.sort(compareLegalForms)
					.map(cloneLegalForm),
			);
		},
		async findCompanyLegalFormAsOf(query) {
			const form =
				listLegalFormRecords(query)
					.filter((candidate) => candidate.status === "active")
					.filter(
						(candidate) =>
							query.jurisdictionCode === undefined ||
							candidate.jurisdictionCode === query.jurisdictionCode,
					)
					.filter((candidate) => isKnownAt(candidate, query.knownAt))
					.filter((candidate) =>
						isEffectiveOn(
							{
								from: candidate.effectiveFrom,
								to: candidate.effectiveTo,
							},
							query.asOf,
						),
					)
					.sort((left, right) => {
						const recorded =
							right.recordedAt.getTime() - left.recordedAt.getTime();
						return recorded === 0 ? left.id.localeCompare(right.id) : recorded;
					})[0] ?? null;
			return errorResult.ok(form === null ? null : cloneLegalForm(form));
		},
		async findOverlappingCompanyLegalForm(query) {
			const form =
				listLegalFormRecords(query)
					.filter(
						(candidate) =>
							query.ignoreCompanyLegalFormId === undefined ||
							candidate.id !== query.ignoreCompanyLegalFormId,
					)
					.filter(
						(candidate) =>
							query.statuses === undefined ||
							query.statuses.includes(candidate.status),
					)
					.filter((candidate) =>
						overlaps(
							{ from: candidate.effectiveFrom, to: candidate.effectiveTo },
							query.effectivePeriod,
						),
					)
					.sort((left, right) => {
						const recorded =
							right.recordedAt.getTime() - left.recordedAt.getTime();
						return recorded === 0 ? left.id.localeCompare(right.id) : recorded;
					})[0] ?? null;
			return errorResult.ok(form === null ? null : cloneLegalForm(form));
		},
		async hasOverlappingCompanyLegalForm(input) {
			const overlap = await this.findOverlappingCompanyLegalForm(input);
			return overlap.ok ? errorResult.ok(overlap.data !== null) : overlap;
		},
		async supersedeCompanyLegalForm(input) {
			const predecessor = legalForms.get(input.companyLegalFormHistoryId);
			if (
				predecessor === undefined ||
				predecessor.organizationId !== input.organizationId ||
				predecessor.legalCompanyId !== input.legalCompanyId
			) {
				return notFound("companyLegalForm");
			}
			if (predecessor.version !== input.expectedLegalFormVersion) {
				return stale(input.expectedLegalFormVersion, predecessor.version);
			}
			const replacementId = companyLegalFormHistoryIdSchema.parse(randomUUID());
			const replacement: CompanyLegalFormHistory = {
				id: replacementId,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				jurisdictionCode: input.replacement.jurisdictionCode,
				legalFormCode: input.replacement.legalFormCode,
				entityTypeCode: input.replacement.entityTypeCode,
				effectiveFrom: input.replacement.effectivePeriod.from,
				effectiveTo: input.replacement.effectivePeriod.to,
				recordedAt: new Date(input.replacement.recordedAt),
				recordedBy: input.recordedByUserId,
				sourceDocumentId: input.replacement.sourceDocumentId,
				correctionReason: input.replacement.correctionReason,
				status: "active",
				supersedesId: input.companyLegalFormHistoryId,
				supersededAt: null,
				version: 1,
			};
			legalForms.set(input.companyLegalFormHistoryId, {
				...predecessor,
				status: "superseded",
				supersededAt: new Date(input.replacement.recordedAt),
				version: input.expectedLegalFormVersion + 1,
			});
			legalForms.set(replacementId, cloneLegalForm(replacement));
			return errorResult.ok(cloneLegalForm(replacement));
		},
		async lockCompanyLegalFormScope() {
			return errorResult.ok(undefined);
		},
		async registerCompanyIdentifier(input) {
			const overlap = validateIdentifierEffectiveRange({
				candidate: input.effectivePeriod,
				identifierType: input.identifierType,
				jurisdictionCode: input.jurisdictionCode,
				authorityCode: input.issuingAuthorityCode,
				normalizedValue: input.normalizedIdentifierValue,
				existing: listIdentifierRecords(input),
				legalCompanyId: input.legalCompanyId,
			});
			if (!overlap.ok) {
				return overlap;
			}
			const id = companyIdentifierIdSchema.parse(randomUUID());
			const identifier = makeIdentifierRecord(id, input);
			identifiers.set(id, cloneIdentifier(identifier));
			touchCompany({
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				actorUserId: input.recordedByUserId,
				updatedAt: input.recordedAt,
				expectedVersion: input.expectedCompanyVersion,
			});
			return errorResult.ok(cloneIdentifier(identifier));
		},
		async supersedeCompanyIdentifier(input) {
			const predecessor = identifiers.get(input.companyIdentifierId);
			if (
				predecessor === undefined ||
				predecessor.organizationId !== input.organizationId ||
				predecessor.legalCompanyId !== input.legalCompanyId
			) {
				return notFound("companyIdentifier");
			}
			if (predecessor.version !== input.expectedIdentifierVersion) {
				return stale(input.expectedIdentifierVersion, predecessor.version);
			}
			if (predecessor.status !== "active") {
				return invalidTransition("companyIdentifierId");
			}
			const overlap = validateIdentifierEffectiveRange({
				candidate: input.replacement.effectivePeriod,
				identifierType: input.replacement.identifierType,
				jurisdictionCode: input.replacement.jurisdictionCode,
				authorityCode: input.replacement.issuingAuthorityCode,
				normalizedValue: input.replacement.normalizedIdentifierValue,
				existing: listIdentifierRecords(input),
				ignoreCompanyIdentifierId: input.companyIdentifierId,
				legalCompanyId: input.legalCompanyId,
			});
			if (!overlap.ok) {
				return overlap;
			}
			const replacementId = companyIdentifierIdSchema.parse(randomUUID());
			const replacement = makeIdentifierReplacementRecord(replacementId, input);
			identifiers.set(input.companyIdentifierId, {
				...predecessor,
				status: "superseded",
				supersededAt: new Date(input.replacement.recordedAt),
				version: input.expectedIdentifierVersion + 1,
			});
			identifiers.set(replacementId, cloneIdentifier(replacement));
			return errorResult.ok(cloneIdentifier(replacement));
		},
		async retireCompanyIdentifier(input) {
			const identifier = identifiers.get(input.companyIdentifierId);
			if (
				identifier === undefined ||
				identifier.organizationId !== input.organizationId ||
				identifier.legalCompanyId !== input.legalCompanyId
			) {
				return notFound("companyIdentifier");
			}
			if (identifier.version !== input.expectedIdentifierVersion) {
				return stale(input.expectedIdentifierVersion, identifier.version);
			}
			if (identifier.status !== "active") {
				return invalidTransition("companyIdentifierId");
			}
			const retiredAtDate = input.retiredAt.slice(0, 10);
			if (retiredAtDate < identifier.effectiveFrom) {
				return validationFailed("retiredAt");
			}
			const retired: CompanyIdentifier = {
				...identifier,
				status: "retired",
				retiredAt: new Date(input.retiredAt),
				version: input.expectedIdentifierVersion + 1,
			};
			identifiers.set(input.companyIdentifierId, cloneIdentifier(retired));
			return errorResult.ok(cloneIdentifier(retired));
		},
		async getCompanyIdentifier(input) {
			const identifier = identifiers.get(input.companyIdentifierId);
			if (
				identifier === undefined ||
				identifier.organizationId !== input.organizationId ||
				identifier.legalCompanyId !== input.legalCompanyId ||
				!isKnownAt(identifier, input.knownAt)
			) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneIdentifier(identifier));
		},
		async listCompanyIdentifiers(query) {
			const cursorScope = companyIdentifierCursorScope(query);
			const decodedCursor = decodeCompanyIdentifierCursor(
				query.cursor,
				cursorScope,
			);
			if (!decodedCursor.ok) {
				return decodedCursor;
			}
			const pageSize = query.pageSize ?? 50;
			const ordered = listIdentifierRecords(query)
				.filter(
					(identifier) =>
						query.includeRetired === true || identifier.status !== "retired",
				)
				.filter(
					(identifier) =>
						query.activeAt === undefined ||
						isEffectiveOn(
							{
								from: identifier.effectiveFrom,
								to: identifier.effectiveTo,
							},
							query.activeAt,
						),
				)
				.filter((identifier) => isKnownAt(identifier, query.knownAt))
				.sort(compareIdentifiers)
				.filter(
					(identifier) =>
						decodedCursor.data === null ||
						compareCompanyIdentifierCursor(identifier, decodedCursor.data) > 0,
				)
				.slice(0, pageSize + 1);
			const pageRows = ordered.slice(0, pageSize);
			const items: CompanyIdentifierListItem[] =
				pageRows.map(toIdentifierListItem);
			const last = pageRows.at(-1);
			return errorResult.ok({
				items,
				nextCursor:
					ordered.length > pageSize && last !== undefined
						? encodeCompanyIdentifierCursor(
								cursorScope,
								companyIdentifierCursorKey(last),
							)
						: null,
			} satisfies CompanyIdentifierListPage);
		},
		async findCompanyIdentifierAsOf(query) {
			const identifier =
				listIdentifierRecords(query)
					.filter((candidate) => candidate.status === "active")
					.filter(
						(candidate) =>
							query.jurisdictionCode === undefined ||
							candidate.jurisdictionCode === query.jurisdictionCode,
					)
					.filter(
						(candidate) =>
							query.issuingAuthorityCode === undefined ||
							candidate.issuingAuthorityCode === query.issuingAuthorityCode,
					)
					.filter((candidate) => isKnownAt(candidate, query.knownAt))
					.filter((candidate) =>
						isEffectiveOn(
							{ from: candidate.effectiveFrom, to: candidate.effectiveTo },
							query.asOf,
						),
					)
					.sort((left, right) => {
						const recorded =
							right.recordedAt.getTime() - left.recordedAt.getTime();
						return recorded === 0 ? left.id.localeCompare(right.id) : recorded;
					})[0] ?? null;
			return errorResult.ok(
				identifier === null ? null : cloneIdentifier(identifier),
			);
		},
		async findOverlappingCompanyIdentifier(query) {
			const identifier =
				listIdentifierRecords(query)
					.filter(
						(candidate) =>
							query.ignoreCompanyIdentifierId === undefined ||
							candidate.id !== query.ignoreCompanyIdentifierId,
					)
					.filter(
						(candidate) =>
							query.statuses === undefined ||
							query.statuses.includes(candidate.status),
					)
					.filter(
						(candidate) =>
							candidate.identifierType === query.identifierType &&
							candidate.jurisdictionCode === query.jurisdictionCode &&
							candidate.issuingAuthorityCode === query.issuingAuthorityCode &&
							candidate.normalizedIdentifierValue ===
								query.normalizedIdentifierValue,
					)
					.filter((candidate) =>
						overlaps(
							{ from: candidate.effectiveFrom, to: candidate.effectiveTo },
							query.effectivePeriod,
						),
					)
					.sort((left, right) => {
						const recorded =
							right.recordedAt.getTime() - left.recordedAt.getTime();
						return recorded === 0 ? left.id.localeCompare(right.id) : recorded;
					})[0] ?? null;
			return errorResult.ok(
				identifier === null ? null : cloneIdentifier(identifier),
			);
		},
		async lockCompanyIdentifierScope() {
			return errorResult.ok(undefined);
		},
		async setCompanyFinancialYear(input) {
			const overlap = validateFinancialYearChronology({
				candidate: input.effectivePeriod,
				existing: listFinancialYearRecords(input),
			});
			if (!overlap.ok) {
				return overlap;
			}
			const id = companyFinancialYearIdSchema.parse(randomUUID());
			const financialYear = makeFinancialYearRecord(id, input);
			financialYears.set(id, cloneFinancialYear(financialYear));
			touchCompany({
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				actorUserId: input.recordedByUserId,
				updatedAt: input.recordedAt,
				expectedVersion: input.expectedCompanyVersion,
			});
			return errorResult.ok(cloneFinancialYear(financialYear));
		},
		async findCompanyFinancialYearAsOf(query) {
			const financialYear =
				listFinancialYearRecords(query)
					.filter((candidate) => isKnownAt(candidate, query.knownAt))
					.filter((candidate) =>
						isEffectiveOn(
							{ from: candidate.effectiveFrom, to: candidate.effectiveTo },
							query.asOf,
						),
					)
					.sort((left, right) => {
						const recorded =
							right.recordedAt.getTime() - left.recordedAt.getTime();
						return recorded === 0 ? left.id.localeCompare(right.id) : recorded;
					})[0] ?? null;
			return errorResult.ok(
				financialYear === null ? null : cloneFinancialYear(financialYear),
			);
		},
		async findOverlappingCompanyFinancialYear(query) {
			const financialYear =
				listFinancialYearRecords(query)
					.filter(
						(candidate) =>
							query.ignoreCompanyFinancialYearId === undefined ||
							candidate.id !== query.ignoreCompanyFinancialYearId,
					)
					.filter((candidate) =>
						overlaps(
							{ from: candidate.effectiveFrom, to: candidate.effectiveTo },
							query.effectivePeriod,
						),
					)
					.sort((left, right) => {
						const recorded =
							right.recordedAt.getTime() - left.recordedAt.getTime();
						return recorded === 0 ? left.id.localeCompare(right.id) : recorded;
					})[0] ?? null;
			return errorResult.ok(
				financialYear === null ? null : cloneFinancialYear(financialYear),
			);
		},
		async lockCompanyFinancialYearScope() {
			return errorResult.ok(undefined);
		},
		async registerCompanyActivity(input) {
			const overlap = validateActivityEffectiveRange({
				candidate: input.effectivePeriod,
				existing: listActivityRecords(input),
				activityType: input.classification,
				activityCode: input.activityCode,
				jurisdictionCode: input.jurisdictionCode,
			});
			if (!overlap.ok) {
				return overlap;
			}
			const id = companyActivityIdSchema.parse(randomUUID());
			const activity = makeActivityRecord(id, input);
			activities.set(id, cloneActivity(activity));
			touchCompany({
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				actorUserId: input.recordedByUserId,
				updatedAt: input.recordedAt,
				expectedVersion: input.expectedCompanyVersion,
			});
			return errorResult.ok(cloneActivity(activity));
		},
		async endCompanyActivity(input) {
			const activity = activities.get(input.companyActivityId);
			if (
				activity === undefined ||
				activity.organizationId !== input.organizationId ||
				activity.legalCompanyId !== input.legalCompanyId
			) {
				return notFound("companyActivity");
			}
			if (activity.version !== input.expectedActivityVersion) {
				return stale(input.expectedActivityVersion, activity.version);
			}
			if (activity.status !== "active") {
				return invalidTransition("companyActivityId");
			}
			if (input.endedAt < activity.effectiveFrom) {
				return validationFailed("endedAt");
			}
			const ended: CompanyActivity = {
				...activity,
				status: "ended",
				effectiveTo: input.endedAt,
				version: input.expectedActivityVersion + 1,
			};
			activities.set(input.companyActivityId, cloneActivity(ended));
			return errorResult.ok(cloneActivity(ended));
		},
		async getCompanyActivity(input) {
			const activity = activities.get(input.companyActivityId);
			if (
				activity === undefined ||
				activity.organizationId !== input.organizationId ||
				activity.legalCompanyId !== input.legalCompanyId ||
				!isKnownAt(activity, input.knownAt)
			) {
				return errorResult.ok(null);
			}
			return errorResult.ok(cloneActivity(activity));
		},
		async listCompanyActivitiesAsOf(query) {
			const cursorScope = companyActivityCursorScope(query);
			const decodedCursor = decodeCompanyActivityCursor(
				query.cursor,
				cursorScope,
			);
			if (!decodedCursor.ok) {
				return decodedCursor;
			}
			const pageSize = query.pageSize ?? 50;
			const ordered = listActivityRecords(query)
				.filter(
					(activity) =>
						query.classification === undefined ||
						activity.classification === query.classification,
				)
				.filter(
					(activity) =>
						query.jurisdictionCode === undefined ||
						activity.jurisdictionCode === query.jurisdictionCode,
				)
				.filter(
					(activity) =>
						query.regulatorCode === undefined ||
						activity.regulatorCode === query.regulatorCode,
				)
				.filter(
					() =>
						query.classificationSystem === undefined ||
						query.classificationSystem === "registered_activity",
				)
				.filter(() => query.primaryOnly !== true)
				.filter((activity) => isKnownAt(activity, query.knownAt))
				.filter((activity) =>
					isEffectiveOn(
						{ from: activity.effectiveFrom, to: activity.effectiveTo },
						query.asOf,
					),
				)
				.sort(compareActivities)
				.filter(
					(activity) =>
						decodedCursor.data === null ||
						compareCompanyActivityCursor(activity, decodedCursor.data) > 0,
				)
				.slice(0, pageSize + 1);
			const pageRows = ordered.slice(0, pageSize);
			const last = pageRows.at(-1);
			return errorResult.ok({
				items: pageRows.map(toCompanyActivityListItem),
				nextCursor:
					ordered.length > pageSize && last !== undefined
						? encodeCompanyActivityCursor(
								cursorScope,
								companyActivityCursorKey(last),
							)
						: null,
			} satisfies CompanyActivityListPage);
		},
		async findOverlappingCompanyActivity(query: CompanyActivityOverlapQuery) {
			const activity =
				listActivityRecords(query)
					.filter((candidate) => candidate.status === "active")
					.filter(
						(candidate) =>
							candidate.classification === query.classification &&
							candidate.activityCode === query.activityCode &&
							candidate.jurisdictionCode === query.jurisdictionCode,
					)
					.filter((candidate) =>
						overlaps(
							{
								from: candidate.effectiveFrom,
								to: candidate.effectiveTo,
							},
							query.effectivePeriod,
						),
					)
					.sort(compareActivities)[0] ?? null;
			return errorResult.ok(activity === null ? null : cloneActivity(activity));
		},
		async lockLegalCompany(input) {
			const company = cloneNullable(
				companies.get(key(input.organizationId, input.legalCompanyId)),
			);
			if (company === null) {
				return errorResult.ok(null);
			}
			return errorResult.ok({
				...company,
				currentJurisdictionProfile: findCurrentProfile({
					organizationId: input.organizationId,
					legalCompanyId: input.legalCompanyId,
				}),
			});
		},
		async changeLegalCompanyStatus(input) {
			const company = companies.get(
				key(input.organizationId, input.legalCompanyId),
			);
			if (company === undefined) {
				return notFound("legalCompany");
			}
			if (company.version !== input.expectedCompanyVersion) {
				return stale(input.expectedCompanyVersion, company.version);
			}
			for (const status of listStatusRecords(input)) {
				if (status.effectiveTo === null) {
					statusHistory.set(status.id, {
						...status,
						effectiveTo: input.effectiveFrom,
					});
				}
			}
			const id = randomUUID();
			const version = input.expectedCompanyVersion + 1;
			const record: CompanyStatusHistory = {
				id,
				organizationId: input.organizationId,
				legalCompanyId: input.legalCompanyId,
				status: input.status,
				effectiveFrom: input.effectiveFrom,
				effectiveTo: null,
				recordedAt: new Date(input.recordedAt),
				recordedBy: input.recordedByUserId,
				reason: input.reason,
				sourceDocumentId: input.sourceDocumentId,
				version,
			};
			statusHistory.set(id, cloneStatusHistory(record));
			companies.set(key(input.organizationId, input.legalCompanyId), {
				...company,
				state: input.status,
				version,
				updatedByUserId: input.recordedByUserId,
				updatedAt: input.recordedAt,
			});
			return errorResult.ok(cloneStatusHistory(record));
		},
		async findCompanyStatusAsOf(query) {
			const status =
				listStatusRecords(query)
					.filter((candidate) => isKnownAt(candidate, query.knownAt))
					.filter((candidate) =>
						isEffectiveOn(
							{ from: candidate.effectiveFrom, to: candidate.effectiveTo },
							query.asOf,
						),
					)
					.sort(
						(left, right) =>
							right.recordedAt.getTime() - left.recordedAt.getTime() ||
							right.version - left.version ||
							left.id.localeCompare(right.id),
					)[0] ?? null;
			return errorResult.ok(
				status === null ? null : cloneStatusHistory(status),
			);
		},
		async listCompaniesByStatus(query) {
			const cursorScope = companiesByStatusCursorScope(query);
			const cursor = decodeCompaniesByStatusCursor(
				query.pagination.cursor,
				cursorScope,
			);
			if (!cursor.ok) {
				return cursor;
			}
			const ordered = Array.from(companies.values())
				.filter((company) => company.organizationId === query.organizationId)
				.filter((company) =>
					companyStatusMatchesAsOf({
						organizationId: query.organizationId,
						legalCompanyId: company.legalCompanyId,
						status: query.status,
						asOf: query.asOf,
						knownAt: query.knownAt,
					}),
				)
				.sort(
					(left, right) =>
						left.normalizedCompanyCode.localeCompare(
							right.normalizedCompanyCode,
						) || left.legalCompanyId.localeCompare(right.legalCompanyId),
				)
				.filter(
					(company) =>
						cursor.data === null ||
						compareLegalCompanyCursor(company, cursor.data) > 0,
				)
				.slice(0, query.pagination.limit + 1);
			const pageRows = ordered.slice(0, query.pagination.limit);
			const items = pageRows.map((company) => ({
				organizationId: company.organizationId,
				legalCompanyId: company.legalCompanyId,
				companyCode: company.companyCode,
				normalizedCompanyCode: company.normalizedCompanyCode,
				masterDataPartyId: company.masterDataPartyId,
				homeJurisdictionCountryCode: company.homeJurisdictionCountryCode,
				state: company.state,
				profile: company.profile,
				version: company.version,
				jurisdictionCountryCode: company.homeJurisdictionCountryCode,
				entityType: "draft_legal_company",
			}));
			const last = pageRows.at(-1);
			return errorResult.ok({
				items,
				nextCursor:
					ordered.length > query.pagination.limit && last !== undefined
						? encodeCompaniesByStatusCursor(cursorScope, [
								last.normalizedCompanyCode,
								last.legalCompanyId,
							])
						: null,
			});
		},
		async getLegalCompanyTimeline(input) {
			const cursorScope = legalCompanyTimelineCursorScope(input);
			const cursor = decodeLegalCompanyTimelineCursor(
				input.cursor,
				cursorScope,
			);
			if (!cursor.ok) {
				return cursor;
			}
			const company = companies.get(
				key(input.organizationId, input.legalCompanyId),
			);
			const entries: LegalCompanyTimelineEntry[] = [];
			if (
				company !== undefined &&
				(input.knownAt === undefined || company.updatedAt <= input.knownAt)
			) {
				entries.push({
					kind: "profile",
					legalCompanyId: company.legalCompanyId,
					recordedAt: company.updatedAt,
					version: company.version,
					profile: company.profile,
				});
			}
			for (const profile of listProfiles(input)) {
				if (isVisibleAtKnownTime({ profile, knownAt: input.knownAt })) {
					entries.push({
						...cloneProfile(profile),
						kind: "jurisdiction_profile",
					});
				}
			}
			for (const status of listStatusRecords(input)) {
				if (isKnownAt(status, input.knownAt)) {
					entries.push({
						...cloneStatusHistory(status),
						kind: "company_status",
					});
				}
			}
			const pageSize = input.pageSize ?? 50;
			const ordered = entries
				.sort(compareLegalCompanyTimelineEntries)
				.filter(
					(entry) =>
						cursor.data === null ||
						compareLegalCompanyTimelineEntryToCursor(entry, cursor.data) > 0,
				)
				.slice(0, pageSize + 1);
			const pageRows = ordered.slice(0, pageSize);
			const last = pageRows.at(-1);
			return errorResult.ok({
				items: pageRows,
				nextCursor:
					ordered.length > pageSize && last !== undefined
						? encodeLegalCompanyTimelineCursor(
								cursorScope,
								legalCompanyTimelineCursorKey(last),
							)
						: null,
			} satisfies LegalCompanyTimelinePage);
		},
	};
	return store;

	function listProfiles(input: {
		organizationId: string;
		legalCompanyId: string;
	}): CompanyJurisdictionProfile[] {
		return Array.from(jurisdictionProfiles.values()).filter(
			(profile) =>
				profile.organizationId === input.organizationId &&
				profile.legalCompanyId === input.legalCompanyId,
		);
	}

	function findCurrentProfile(input: {
		organizationId: string;
		legalCompanyId: string;
		asOf?: string | undefined;
		knownAt?: string | undefined;
	}): CompanyJurisdictionProfile | null {
		const asOf = canonicalDateSchema.parse(input.asOf ?? "9999-12-31");
		const knownAt =
			input.knownAt === undefined
				? undefined
				: canonicalInstantSchema.parse(input.knownAt);
		const match =
			listProfiles(input)
				.filter(
					(profile) =>
						matchesAsOf({ profile, asOf }) &&
						isVisibleAtKnownTime({ profile, knownAt }),
				)
				.sort((left, right) =>
					right.recordedAt.localeCompare(left.recordedAt),
				)[0] ?? null;
		return match === null ? null : cloneProfile(match);
	}

	function listCompanyNameRecords(
		input: Pick<CompanyNameListQuery, "organizationId" | "legalCompanyId"> & {
			nameType?: CompanyName["nameType"] | undefined;
			languageCode?: string | undefined;
		},
	): CompanyName[] {
		return Array.from(companyNames.values()).filter(
			(name) =>
				name.organizationId === input.organizationId &&
				name.legalCompanyId === input.legalCompanyId &&
				(input.nameType === undefined || name.nameType === input.nameType) &&
				(input.languageCode === undefined ||
					name.languageCode === input.languageCode),
		);
	}

	function listLegalFormRecords(
		input: Pick<CompanyLegalFormAsOfQuery, "organizationId" | "legalCompanyId">,
	): CompanyLegalFormHistory[] {
		return Array.from(legalForms.values()).filter(
			(form) =>
				form.organizationId === input.organizationId &&
				form.legalCompanyId === input.legalCompanyId,
		);
	}

	function listIdentifierRecords(
		input: Pick<
			CompanyIdentifierListQuery,
			"organizationId" | "legalCompanyId"
		> &
			Partial<
				Pick<
					CompanyIdentifierListQuery,
					"identifierType" | "jurisdictionCode" | "issuingAuthorityCode"
				>
			>,
	): CompanyIdentifier[] {
		return Array.from(identifiers.values()).filter(
			(identifier) =>
				identifier.organizationId === input.organizationId &&
				identifier.legalCompanyId === input.legalCompanyId &&
				(input.identifierType === undefined ||
					identifier.identifierType === input.identifierType) &&
				(input.jurisdictionCode === undefined ||
					identifier.jurisdictionCode === input.jurisdictionCode) &&
				(input.issuingAuthorityCode === undefined ||
					identifier.issuingAuthorityCode === input.issuingAuthorityCode),
		);
	}

	function listFinancialYearRecords(
		input: Pick<
			CompanyFinancialYearOverlapQuery,
			"organizationId" | "legalCompanyId"
		>,
	): CompanyFinancialYear[] {
		return Array.from(financialYears.values()).filter(
			(financialYear) =>
				financialYear.organizationId === input.organizationId &&
				financialYear.legalCompanyId === input.legalCompanyId,
		);
	}

	function listActivityRecords(
		input: Pick<
			CompanyActivitiesAsOfQuery,
			"organizationId" | "legalCompanyId"
		>,
	): CompanyActivity[] {
		return Array.from(activities.values()).filter(
			(activity) =>
				activity.organizationId === input.organizationId &&
				activity.legalCompanyId === input.legalCompanyId,
		);
	}

	function listStatusRecords(input: {
		organizationId: string;
		legalCompanyId: string;
	}): CompanyStatusHistory[] {
		return Array.from(statusHistory.values()).filter(
			(status) =>
				status.organizationId === input.organizationId &&
				status.legalCompanyId === input.legalCompanyId,
		);
	}

	function companyStatusMatchesAsOf(
		input: Pick<CompaniesByStatusQuery, "organizationId" | "status"> & {
			legalCompanyId: string;
			asOf?: string | undefined;
			knownAt?: string | undefined;
		},
	): boolean {
		if (input.asOf === undefined) {
			const company = companies.get(
				key(input.organizationId, input.legalCompanyId),
			);
			return company?.state === input.status;
		}
		return listStatusRecords(input).some(
			(status) =>
				status.status === input.status &&
				isKnownAt(status, input.knownAt) &&
				isEffectiveOn(
					{ from: status.effectiveFrom, to: status.effectiveTo },
					input.asOf ?? "9999-12-31",
				),
		);
	}

	function makeIdentifierRecord(
		id: CompanyIdentifier["id"],
		input: Parameters<CompanyIdentifierStore["registerCompanyIdentifier"]>[0],
	): CompanyIdentifier {
		return {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			identifierType: input.identifierType,
			jurisdictionCode: input.jurisdictionCode,
			issuingAuthorityCode: input.issuingAuthorityCode,
			identifierValue: input.identifierValue,
			normalizedIdentifierValue: input.normalizedIdentifierValue,
			effectiveFrom: input.effectivePeriod.from,
			effectiveTo: input.effectivePeriod.to,
			recordedAt: new Date(input.recordedAt),
			recordedBy: input.recordedByUserId,
			sourceDocumentId: input.sourceDocumentId,
			correctionReason: input.correctionReason ?? null,
			status: "active",
			supersedesId: null,
			supersededAt: null,
			retiredAt: null,
			version: 1,
		};
	}

	function makeIdentifierReplacementRecord(
		id: CompanyIdentifier["id"],
		input: Parameters<CompanyIdentifierStore["supersedeCompanyIdentifier"]>[0],
	): CompanyIdentifier {
		return {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			identifierType: input.replacement.identifierType,
			jurisdictionCode: input.replacement.jurisdictionCode,
			issuingAuthorityCode: input.replacement.issuingAuthorityCode,
			identifierValue: input.replacement.identifierValue,
			normalizedIdentifierValue: input.replacement.normalizedIdentifierValue,
			effectiveFrom: input.replacement.effectivePeriod.from,
			effectiveTo: input.replacement.effectivePeriod.to,
			recordedAt: new Date(input.replacement.recordedAt),
			recordedBy: input.recordedByUserId,
			sourceDocumentId: input.replacement.sourceDocumentId,
			correctionReason: input.replacement.correctionReason,
			status: "active",
			supersedesId: input.companyIdentifierId,
			supersededAt: null,
			retiredAt: null,
			version: 1,
		};
	}

	function makeFinancialYearRecord(
		id: CompanyFinancialYear["id"],
		input: Parameters<CompanyFinancialYearStore["setCompanyFinancialYear"]>[0],
	): CompanyFinancialYear {
		return {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			fiscalYearStartMonth: input.fiscalYearStartMonth,
			fiscalYearStartDay: input.fiscalYearStartDay,
			reportingCurrencyCode: input.reportingCurrencyCode,
			effectiveFrom: input.effectivePeriod.from,
			effectiveTo: input.effectivePeriod.to,
			recordedAt: new Date(input.recordedAt),
			recordedBy: input.recordedByUserId,
			sourceDocumentId: input.sourceDocumentId,
			correctionReason: input.correctionReason ?? null,
			status: "active",
			version: 1,
		};
	}

	function makeActivityRecord(
		id: CompanyActivity["id"],
		input: Parameters<CompanyActivityStore["registerCompanyActivity"]>[0],
	): CompanyActivity {
		return {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			activityCode: input.activityCode,
			classification: input.classification,
			jurisdictionCode: input.jurisdictionCode,
			regulatorCode: input.regulatorCode,
			description: input.description,
			effectiveFrom: input.effectivePeriod.from,
			effectiveTo: input.effectivePeriod.to,
			recordedAt: new Date(input.recordedAt),
			recordedBy: input.recordedByUserId,
			sourceDocumentId: input.sourceDocumentId,
			status: "active",
			version: 1,
		};
	}

	function touchCompany(input: {
		organizationId: string;
		legalCompanyId: string;
		actorUserId: LegalCompany["updatedByUserId"];
		updatedAt: LegalCompany["updatedAt"];
		expectedVersion: number;
	}): void {
		const company = companies.get(
			key(input.organizationId, input.legalCompanyId),
		);
		if (company === undefined) {
			return;
		}
		companies.set(key(input.organizationId, input.legalCompanyId), {
			...company,
			version: input.expectedVersion + 1,
			updatedByUserId: input.actorUserId,
			updatedAt: input.updatedAt,
		});
	}

	function addCompanyNameRecord(
		input: Parameters<CompanyNameStore["addCompanyName"]>[0],
	): Promise<Result<CompanyName>> {
		const id = companyNameIdSchema.parse(randomUUID());
		const name: CompanyName = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			nameType: input.nameType,
			languageCode: input.languageCode,
			displayName: input.displayName,
			normalizedName: input.normalizedName,
			effectiveFrom: input.effectivePeriod.from,
			effectiveTo: input.effectivePeriod.to,
			recordedAt: new Date(input.recordedAt),
			recordedBy: input.recordedByUserId,
			sourceDocumentId: input.sourceDocumentId,
			correctionReason: input.correctionReason ?? null,
			status: "active",
			supersedesId: null,
			supersededAt: null,
			retiredAt: null,
			version: 1,
		};
		companyNames.set(id, cloneCompanyName(name));
		touchCompany({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			actorUserId: input.recordedByUserId,
			updatedAt: input.recordedAt,
			expectedVersion: input.expectedCompanyVersion,
		});
		return Promise.resolve(errorResult.ok(cloneCompanyName(name)));
	}

	function setCompanyLegalFormRecord(
		input: Parameters<CompanyLegalFormStore["setCompanyLegalForm"]>[0],
	): Promise<Result<CompanyLegalFormHistory>> {
		const id = companyLegalFormHistoryIdSchema.parse(randomUUID());
		const form: CompanyLegalFormHistory = {
			id,
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			jurisdictionCode: input.jurisdictionCode,
			legalFormCode: input.legalFormCode,
			entityTypeCode: input.entityTypeCode,
			effectiveFrom: input.effectivePeriod.from,
			effectiveTo: input.effectivePeriod.to,
			recordedAt: new Date(input.recordedAt),
			recordedBy: input.recordedByUserId,
			sourceDocumentId: input.sourceDocumentId,
			correctionReason: input.correctionReason ?? null,
			status: "active",
			supersedesId: null,
			supersededAt: null,
			version: 1,
		};
		legalForms.set(id, cloneLegalForm(form));
		touchCompany({
			organizationId: input.organizationId,
			legalCompanyId: input.legalCompanyId,
			actorUserId: input.recordedByUserId,
			updatedAt: input.recordedAt,
			expectedVersion: input.expectedCompanyVersion,
		});
		return Promise.resolve(errorResult.ok(cloneLegalForm(form)));
	}
}

function cloneNullable(company: LegalCompany | undefined): LegalCompany | null {
	return company === undefined ? null : cloneCompany(company);
}

function notFound(_entityType: string): Result<never> {
	return errorResult.fail("NOT_FOUND", {
		publicMessage: "Corporate Administration record was not found.",
	});
}

function stale(
	_expectedVersion: number,
	_actualVersion: number,
): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration record version is stale.",
	});
}

function invalidTransition(_field: string): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage: "Corporate Administration record transition is invalid.",
	});
}

function validationFailed(_field: string): Result<never> {
	return errorResult.fail("VALIDATION_ERROR", {
		publicMessage: "Corporate Administration record validation failed.",
	});
}

function isKnownAt(
	record: Readonly<{ recordedAt: Date }>,
	knownAt: string | undefined,
): boolean {
	return knownAt === undefined || record.recordedAt <= new Date(knownAt);
}

function isEffectiveOn(
	range: Readonly<{ from: string; to: string | null }>,
	asOf: string,
): boolean {
	return range.from <= asOf && asOf < (range.to ?? "9999-12-31");
}

function overlaps(
	left: Readonly<{ from: string; to: string | null }>,
	right: Readonly<{ from: string; to: string | null }>,
): boolean {
	return (
		left.from < (right.to ?? "9999-12-31") &&
		right.from < (left.to ?? "9999-12-31")
	);
}

function compareCompanyNames(left: CompanyName, right: CompanyName): number {
	return (
		left.nameType.localeCompare(right.nameType) ||
		left.languageCode.localeCompare(right.languageCode) ||
		right.effectiveFrom.localeCompare(left.effectiveFrom) ||
		right.recordedAt.getTime() - left.recordedAt.getTime() ||
		left.id.localeCompare(right.id)
	);
}

function companyNameCursorKey(name: CompanyName): CompanyNameCursorKey {
	return [
		name.nameType,
		name.languageCode,
		name.effectiveFrom,
		toCanonicalInstant(name.recordedAt),
		name.id,
	];
}

function compareCompanyNameCursor(
	name: CompanyName,
	cursor: CompanyNameCursorKey,
): number {
	return (
		name.nameType.localeCompare(cursor[0]) ||
		name.languageCode.localeCompare(cursor[1]) ||
		cursor[2].localeCompare(name.effectiveFrom) ||
		new Date(cursor[3]).getTime() - name.recordedAt.getTime() ||
		name.id.localeCompare(cursor[4])
	);
}

function compareLegalForms(
	left: CompanyLegalFormHistory,
	right: CompanyLegalFormHistory,
): number {
	return (
		right.effectiveFrom.localeCompare(left.effectiveFrom) ||
		right.recordedAt.getTime() - left.recordedAt.getTime() ||
		left.id.localeCompare(right.id)
	);
}

function compareIdentifiers(
	left: CompanyIdentifier,
	right: CompanyIdentifier,
): number {
	return (
		left.identifierType.localeCompare(right.identifierType) ||
		left.jurisdictionCode.localeCompare(right.jurisdictionCode) ||
		left.issuingAuthorityCode.localeCompare(right.issuingAuthorityCode) ||
		right.effectiveFrom.localeCompare(left.effectiveFrom) ||
		right.recordedAt.getTime() - left.recordedAt.getTime() ||
		left.id.localeCompare(right.id)
	);
}

function companyIdentifierCursorKey(
	identifier: CompanyIdentifier,
): CompanyIdentifierCursorKey {
	return [
		identifier.identifierType,
		identifier.jurisdictionCode,
		identifier.issuingAuthorityCode,
		identifier.effectiveFrom,
		toCanonicalInstant(identifier.recordedAt),
		identifier.id,
	];
}

function compareCompanyIdentifierCursor(
	identifier: CompanyIdentifier,
	cursor: CompanyIdentifierCursorKey,
): number {
	return (
		identifier.identifierType.localeCompare(cursor[0]) ||
		identifier.jurisdictionCode.localeCompare(cursor[1]) ||
		identifier.issuingAuthorityCode.localeCompare(cursor[2]) ||
		cursor[3].localeCompare(identifier.effectiveFrom) ||
		new Date(cursor[4]).getTime() - identifier.recordedAt.getTime() ||
		identifier.id.localeCompare(cursor[5])
	);
}

function compareLegalCompanyCursor(
	company: LegalCompany,
	cursor: LegalCompanyCursorKey,
): number {
	return (
		company.normalizedCompanyCode.localeCompare(cursor[0]) ||
		company.legalCompanyId.localeCompare(cursor[1])
	);
}

function compareActivities(
	left: CompanyActivity,
	right: CompanyActivity,
): number {
	return (
		left.classification.localeCompare(right.classification) ||
		left.activityCode.localeCompare(right.activityCode) ||
		left.effectiveFrom.localeCompare(right.effectiveFrom) ||
		left.id.localeCompare(right.id)
	);
}

function companyActivityCursorKey(
	activity: CompanyActivity,
): CompanyActivityCursorKey {
	return [
		activity.classification,
		activity.activityCode,
		activity.effectiveFrom,
		activity.id,
	];
}

function compareCompanyActivityCursor(
	activity: CompanyActivity,
	cursor: CompanyActivityCursorKey,
): number {
	return (
		activity.classification.localeCompare(cursor[0]) ||
		activity.activityCode.localeCompare(cursor[1]) ||
		activity.effectiveFrom.localeCompare(cursor[2]) ||
		activity.id.localeCompare(cursor[3])
	);
}

function toCompanyActivityListItem(
	activity: CompanyActivity,
): CompanyActivityListItem {
	return {
		id: activity.id,
		legalCompanyId: activity.legalCompanyId,
		activityCode: activity.activityCode,
		classification: activity.classification,
		jurisdictionCode: activity.jurisdictionCode,
		regulatorCode: activity.regulatorCode,
		description: activity.description,
		effectiveFrom: activity.effectiveFrom,
		effectiveTo: activity.effectiveTo,
		status: activity.status,
		version: activity.version,
	};
}

function toIdentifierListItem(
	identifier: CompanyIdentifier,
): CompanyIdentifierListItem {
	return {
		id: identifier.id,
		legalCompanyId: identifier.legalCompanyId,
		identifierType: identifier.identifierType,
		jurisdictionCode: identifier.jurisdictionCode,
		issuingAuthorityCode: identifier.issuingAuthorityCode,
		identifierValue: identifier.identifierValue,
		normalizedIdentifierValue: identifier.normalizedIdentifierValue,
		effectiveFrom: identifier.effectiveFrom,
		effectiveTo: identifier.effectiveTo,
		recordedAt: identifier.recordedAt,
		status: identifier.status,
	};
}

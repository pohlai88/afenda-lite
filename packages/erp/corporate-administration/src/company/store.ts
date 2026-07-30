import type { Result } from "@afenda/errors/result";
import type {
	CorporateAdministrationCommandOptions,
	CorporateAdministrationPaginatedQueryOptions,
	CorporateAdministrationQueryOptions,
} from "../command-options";
import type { EstablishmentStore } from "../establishments/store";
import type {
	CompanyActivityId,
	CompanyFinancialYearId,
	CompanyIdentifierId,
	CompanyLegalFormHistoryId,
	CompanyNameId,
	LegalCompanyId,
	OrganizationId,
} from "../kernel/brands";
import type { CanonicalDate, CanonicalInstant } from "../kernel/dates";
import type { EffectiveRange } from "../kernel/effective-range";
import type { CursorPagination, OpaqueCursor } from "../kernel/pagination";
import type {
	CompatibilityResolution,
	CorporateAdministrationTransactionContext,
	CurrencyReferenceResolution,
	DocumentObjectPort,
	LegalFormReferenceResolution,
	PartyReference,
	PartyReferencePort,
	ReferenceDataPort,
	ReferenceResolution,
} from "../ports";
import type {
	JurisdictionEntityTypeRule,
	LegalFormCompatibilityRule,
} from "./rules";
import type {
	CompanyActivity,
	CompanyActivityClassification,
	CompanyFinancialYear,
	CompanyIdentifier,
	CompanyIdentifierListPage,
	CompanyIdentifierStatus,
	CompanyIdentifierType,
	CompanyJurisdictionProfile,
	CompanyLegalForm,
	CompanyLegalFormHistory,
	CompanyLegalFormStatus,
	CompanyName,
	CompanyNameListItem,
	CompanyNameStatus,
	CompanyNameType,
	CompanyStatusHistory,
	LegalCompany,
	LegalCompanyListPage,
	LegalCompanyProfile,
	LegalCompanyStatus,
	LegalCompanyTimelineEntry,
} from "./types";

export type CompanyNameCreateRecord = AddCompanyNameStoreInput;

export type CompanyNameSupersessionRecord = SupersedeCompanyNameStoreInput;

export type CompanyNameRetirementRecord = RetireCompanyNameStoreInput;

export type CompanyNameListQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	nameType?: CompanyNameType | undefined;
	languageCode?: string | undefined;
	activeAt?: CanonicalDate | undefined;
	includeFormer?: boolean | undefined;
	cursor?: OpaqueCursor | undefined;
	pageSize?: number | undefined;
	knownAt?: CanonicalInstant | undefined;
	ordering?:
		| "name_type_language_effective_from_desc_recorded_at_desc_id"
		| undefined;
}>;

export type CompanyNameListPage = Readonly<{
	items: readonly CompanyNameListItem[];
	nextCursor: OpaqueCursor | null;
}>;

export type CompanyNameAsOfQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	nameType: CompanyNameType;
	languageCode: string;
	asOf: CanonicalDate;
	knownAt?: CanonicalInstant | undefined;
}>;

export type CompanyNameOverlapQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	nameType: CompanyNameType;
	languageCode: string;
	normalizedName?: string;
	effectivePeriod: EffectiveRange;
	ignoreCompanyNameId?: CompanyNameId;
	statuses?: readonly CompanyNameStatus[];
}>;

export type CompanyLegalFormCreateRecord = SetCompanyLegalFormStoreInput;

export type CompanyLegalFormSupersessionRecord =
	SupersedeCompanyLegalFormStoreInput;

export type CompanyLegalFormAsOfQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	jurisdictionCode?: string | undefined;
	asOf: CanonicalDate;
	knownAt?: CanonicalInstant | undefined;
}>;

export type CompanyLegalFormOverlapQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	effectivePeriod: EffectiveRange;
	ignoreCompanyLegalFormId?: CompanyLegalFormHistoryId;
	statuses?: readonly CompanyLegalFormStatus[];
}>;

export type CompanyIdentifierListQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	identifierType?: CompanyIdentifierType | undefined;
	jurisdictionCode?: string | undefined;
	issuingAuthorityCode?: string | undefined;
	activeAt?: CanonicalDate | undefined;
	includeRetired?: boolean | undefined;
	cursor?: OpaqueCursor | undefined;
	pageSize?: number | undefined;
	knownAt?: CanonicalInstant | undefined;
}>;

export type CompanyIdentifierAsOfQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	identifierType: CompanyIdentifierType;
	jurisdictionCode?: string | undefined;
	issuingAuthorityCode?: string | undefined;
	asOf: CanonicalDate;
	knownAt?: CanonicalInstant | undefined;
}>;

export type CompanyIdentifierOverlapQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	identifierType: CompanyIdentifierType;
	jurisdictionCode: string;
	issuingAuthorityCode: string;
	normalizedIdentifierValue: string;
	effectivePeriod: EffectiveRange;
	ignoreCompanyIdentifierId?: CompanyIdentifierId;
	statuses?: readonly CompanyIdentifierStatus[];
}>;

export type CompanyFinancialYearAsOfQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	asOf: CanonicalDate;
	knownAt?: CanonicalInstant | undefined;
}>;

export type CompanyFinancialYearOverlapQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	effectivePeriod: EffectiveRange;
	ignoreCompanyFinancialYearId?: CompanyFinancialYearId;
}>;

export type CompanyActivitiesAsOfQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	asOf: CanonicalDate;
	classification?: CompanyActivityClassification | undefined;
	classificationSystem?: string | undefined;
	jurisdictionCode?: string | undefined;
	regulatorCode?: string | undefined;
	primaryOnly?: boolean | undefined;
	knownAt?: CanonicalInstant | undefined;
}>;

export type CompanyStatusAsOfQuery = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	asOf: CanonicalDate;
	knownAt?: CanonicalInstant | undefined;
}>;

export type CompaniesByStatusQuery = Readonly<{
	organizationId: OrganizationId;
	status: LegalCompanyStatus;
	asOf?: CanonicalDate | undefined;
	knownAt?: CanonicalInstant | undefined;
	pagination: CursorPagination;
}>;

export type LegalCompanyLookupInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	knownAt?: CanonicalInstant | undefined;
}>;

export type ListLegalCompaniesStoreInput = Readonly<{
	organizationId: OrganizationId;
	asOf?: CanonicalDate | undefined;
	knownAt?: CanonicalInstant | undefined;
	pagination: CursorPagination;
}>;

export type UpdateLegalCompanyProfileStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	expectedVersion: number;
	profile: LegalCompanyProfile;
	actorUserId: CorporateAdministrationCommandOptions["actorUserId"];
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type RegisterLegalCompanyDraftStoreInput = Readonly<{
	organizationId: OrganizationId;
	companyCode: string;
	normalizedCompanyCode: string;
	displayName: string;
	masterDataPartyId: string;
	homeJurisdictionCountryCode: string;
	sourceReference: string;
	createdByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	createdAt: CanonicalInstant;
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type SetCompanyJurisdictionProfileStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	jurisdictionCountryCode: string;
	entityType: string;
	effectiveRange: EffectiveRange;
	recordedAt: CanonicalInstant;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	sourceReference: string;
	expectedCompanyVersion: number;
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type InsertJurisdictionProfileStoreInput =
	SetCompanyJurisdictionProfileStoreInput;

export type SupersedeCompanyJurisdictionProfileStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	jurisdictionProfileId: string;
	replacement: Readonly<{
		jurisdictionCountryCode: string;
		entityType: string;
		effectiveRange: EffectiveRange;
		recordedAt: CanonicalInstant;
		sourceReference: string;
	}>;
	expectedProfileVersion: number;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type SupersedeJurisdictionProfileStoreInput =
	SupersedeCompanyJurisdictionProfileStoreInput;

export type AddCompanyNameStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	nameType: CompanyName["nameType"];
	languageCode: string;
	displayName: string;
	normalizedName: string;
	effectivePeriod: EffectiveRange;
	recordedAt: CanonicalInstant;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	sourceDocumentId: string | null;
	correctionReason?: string | undefined;
	expectedCompanyVersion: number;
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type SupersedeCompanyNameStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	companyNameId: CompanyNameId;
	replacement: Readonly<{
		nameType: CompanyName["nameType"];
		languageCode: string;
		displayName: string;
		normalizedName: string;
		effectivePeriod: EffectiveRange;
		recordedAt: CanonicalInstant;
		sourceDocumentId: string | null;
		correctionReason: string;
	}>;
	expectedNameVersion: number;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type RetireCompanyNameStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	companyNameId: CompanyNameId;
	retiredAt: CanonicalInstant;
	retirementReason: string;
	expectedNameVersion: number;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type SetCompanyLegalFormStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	legalFormCode: string;
	jurisdictionCode: string;
	entityTypeCode: string;
	effectivePeriod: EffectiveRange;
	recordedAt: CanonicalInstant;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	sourceDocumentId: string | null;
	correctionReason?: string | undefined;
	expectedCompanyVersion: number;
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type SupersedeCompanyLegalFormStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	companyLegalFormHistoryId: CompanyLegalFormHistoryId;
	replacement: Readonly<{
		legalFormCode: string;
		jurisdictionCode: string;
		entityTypeCode: string;
		effectivePeriod: EffectiveRange;
		recordedAt: CanonicalInstant;
		sourceDocumentId: string | null;
		correctionReason: string;
	}>;
	expectedLegalFormVersion: number;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type RegisterCompanyIdentifierStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	identifierType: CompanyIdentifierType;
	jurisdictionCode: string;
	issuingAuthorityCode: string;
	identifierValue: string;
	normalizedIdentifierValue: string;
	effectivePeriod: EffectiveRange;
	recordedAt: CanonicalInstant;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	sourceDocumentId: string;
	correctionReason?: string | undefined;
	expectedCompanyVersion: number;
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type SupersedeCompanyIdentifierStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	companyIdentifierId: CompanyIdentifierId;
	replacement: Readonly<{
		identifierType: CompanyIdentifierType;
		jurisdictionCode: string;
		issuingAuthorityCode: string;
		identifierValue: string;
		normalizedIdentifierValue: string;
		effectivePeriod: EffectiveRange;
		recordedAt: CanonicalInstant;
		sourceDocumentId: string;
		correctionReason: string;
	}>;
	expectedIdentifierVersion: number;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type RetireCompanyIdentifierStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	companyIdentifierId: CompanyIdentifierId;
	retiredAt: CanonicalInstant;
	retirementReason: string;
	expectedIdentifierVersion: number;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type SetCompanyFinancialYearStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	fiscalYearStartMonth: number;
	fiscalYearStartDay: number;
	reportingCurrencyCode: string;
	effectivePeriod: EffectiveRange;
	recordedAt: CanonicalInstant;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	sourceDocumentId: string;
	correctionReason?: string | undefined;
	expectedCompanyVersion: number;
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type RegisterCompanyActivityStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	activityCode: string;
	classification: CompanyActivityClassification;
	jurisdictionCode: string;
	regulatorCode: string | null;
	description: string;
	effectivePeriod: EffectiveRange;
	recordedAt: CanonicalInstant;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	sourceDocumentId: string;
	expectedCompanyVersion: number;
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type EndCompanyActivityStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	companyActivityId: CompanyActivityId;
	endedAt: CanonicalDate;
	endReason: string;
	expectedActivityVersion: number;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type ChangeLegalCompanyStatusStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	status: LegalCompanyStatus;
	effectiveFrom: CanonicalDate;
	recordedAt: CanonicalInstant;
	recordedByUserId: CorporateAdministrationCommandOptions["actorUserId"];
	reason: string | null;
	sourceDocumentId: string;
	expectedCompanyVersion: number;
	correlationId: CorporateAdministrationCommandOptions["correlationId"];
	causationId?: CorporateAdministrationCommandOptions["causationId"];
	transaction?: CorporateAdministrationTransactionContext;
}>;

export type LegalCompanyTimelineStoreInput = Readonly<{
	organizationId: OrganizationId;
	legalCompanyId: LegalCompanyId;
	knownAt?: CanonicalInstant | undefined;
}>;

export type CompanyNameStore = Readonly<{
	insertCompanyName: (
		record: CompanyNameCreateRecord,
	) => Promise<Result<CompanyName>>;
	addCompanyName: (
		input: AddCompanyNameStoreInput,
	) => Promise<Result<CompanyName>>;
	findCompanyNameById: (
		organizationId: OrganizationId,
		companyNameId: CompanyNameId,
	) => Promise<Result<CompanyName | null>>;
	supersedeCompanyName: (
		command: CompanyNameSupersessionRecord,
	) => Promise<Result<CompanyName>>;
	retireCompanyName: (
		command: CompanyNameRetirementRecord,
	) => Promise<Result<CompanyName>>;
	getCompanyName: (
		input: Readonly<{
			organizationId: OrganizationId;
			legalCompanyId: LegalCompanyId;
			companyNameId: CompanyNameId;
			knownAt?: CanonicalInstant | undefined;
		}>,
	) => Promise<Result<CompanyName | null>>;
	listCompanyNames: (
		query: CompanyNameListQuery,
	) => Promise<Result<CompanyNameListPage>>;
	findCompanyNameAsOf: (
		query: CompanyNameAsOfQuery,
	) => Promise<Result<CompanyName | null>>;
	findOverlappingCompanyName: (
		query: CompanyNameOverlapQuery,
	) => Promise<Result<CompanyName | null>>;
	hasOverlappingCompanyName: (
		input: CompanyNameOverlapQuery,
	) => Promise<Result<boolean>>;
	lockCompanyNameScope: (
		organizationId: OrganizationId,
		legalCompanyId: LegalCompanyId,
		nameType: CompanyNameType,
		languageCode: string,
	) => Promise<Result<void>>;
}>;

export type CompanyLegalFormStore = Readonly<{
	insertCompanyLegalForm: (
		record: CompanyLegalFormCreateRecord,
	) => Promise<Result<CompanyLegalFormHistory>>;
	setCompanyLegalForm: (
		input: SetCompanyLegalFormStoreInput,
	) => Promise<Result<CompanyLegalForm>>;
	supersedeCompanyLegalForm: (
		command: CompanyLegalFormSupersessionRecord,
	) => Promise<Result<CompanyLegalFormHistory>>;
	getCompanyLegalForm: (
		input: Readonly<{
			organizationId: OrganizationId;
			legalCompanyId: LegalCompanyId;
			companyLegalFormHistoryId: CompanyLegalFormHistoryId;
			knownAt?: CanonicalInstant | undefined;
		}>,
	) => Promise<Result<CompanyLegalFormHistory | null>>;
	listCompanyLegalForms: (
		input: Readonly<{
			organizationId: OrganizationId;
			legalCompanyId: LegalCompanyId;
			knownAt?: CanonicalInstant | undefined;
		}>,
	) => Promise<Result<readonly CompanyLegalFormHistory[]>>;
	findCompanyLegalFormAsOf: (
		query: CompanyLegalFormAsOfQuery,
	) => Promise<Result<CompanyLegalFormHistory | null>>;
	findOverlappingCompanyLegalForm: (
		query: CompanyLegalFormOverlapQuery,
	) => Promise<Result<CompanyLegalFormHistory | null>>;
	hasOverlappingCompanyLegalForm: (
		input: CompanyLegalFormOverlapQuery,
	) => Promise<Result<boolean>>;
	lockCompanyLegalFormScope: (
		organizationId: OrganizationId,
		legalCompanyId: LegalCompanyId,
	) => Promise<Result<void>>;
}>;

export type CompanyIdentifierStore = Readonly<{
	registerCompanyIdentifier: (
		input: RegisterCompanyIdentifierStoreInput,
	) => Promise<Result<CompanyIdentifier>>;
	supersedeCompanyIdentifier: (
		input: SupersedeCompanyIdentifierStoreInput,
	) => Promise<Result<CompanyIdentifier>>;
	retireCompanyIdentifier: (
		input: RetireCompanyIdentifierStoreInput,
	) => Promise<Result<CompanyIdentifier>>;
	getCompanyIdentifier: (
		input: Readonly<{
			organizationId: OrganizationId;
			legalCompanyId: LegalCompanyId;
			companyIdentifierId: CompanyIdentifierId;
			knownAt?: CanonicalInstant | undefined;
		}>,
	) => Promise<Result<CompanyIdentifier | null>>;
	listCompanyIdentifiers: (
		query: CompanyIdentifierListQuery,
	) => Promise<Result<CompanyIdentifierListPage>>;
	findCompanyIdentifierAsOf: (
		query: CompanyIdentifierAsOfQuery,
	) => Promise<Result<CompanyIdentifier | null>>;
	findOverlappingCompanyIdentifier: (
		query: CompanyIdentifierOverlapQuery,
	) => Promise<Result<CompanyIdentifier | null>>;
	lockCompanyIdentifierScope: (
		organizationId: OrganizationId,
		legalCompanyId: LegalCompanyId,
		identifierType: CompanyIdentifierType,
		jurisdictionCode: string,
		issuingAuthorityCode: string,
		normalizedIdentifierValue: string,
	) => Promise<Result<void>>;
}>;

export type CompanyFinancialYearStore = Readonly<{
	setCompanyFinancialYear: (
		input: SetCompanyFinancialYearStoreInput,
	) => Promise<Result<CompanyFinancialYear>>;
	findCompanyFinancialYearAsOf: (
		query: CompanyFinancialYearAsOfQuery,
	) => Promise<Result<CompanyFinancialYear | null>>;
	findOverlappingCompanyFinancialYear: (
		query: CompanyFinancialYearOverlapQuery,
	) => Promise<Result<CompanyFinancialYear | null>>;
	lockCompanyFinancialYearScope: (
		organizationId: OrganizationId,
		legalCompanyId: LegalCompanyId,
	) => Promise<Result<void>>;
}>;

export type CompanyActivityStore = Readonly<{
	registerCompanyActivity: (
		input: RegisterCompanyActivityStoreInput,
	) => Promise<Result<CompanyActivity>>;
	endCompanyActivity: (
		input: EndCompanyActivityStoreInput,
	) => Promise<Result<CompanyActivity>>;
	getCompanyActivity: (
		input: Readonly<{
			organizationId: OrganizationId;
			legalCompanyId: LegalCompanyId;
			companyActivityId: CompanyActivityId;
			knownAt?: CanonicalInstant | undefined;
		}>,
	) => Promise<Result<CompanyActivity | null>>;
	listCompanyActivitiesAsOf: (
		query: CompanyActivitiesAsOfQuery,
	) => Promise<Result<readonly CompanyActivity[]>>;
}>;

export type LegalCompanyStore = Readonly<{
	getLegalCompany: (
		input: LegalCompanyLookupInput,
	) => Promise<Result<LegalCompany | null>>;
	listLegalCompanies: (
		input: ListLegalCompaniesStoreInput,
	) => Promise<Result<LegalCompanyListPage>>;
	registerLegalCompanyDraft: (
		input: RegisterLegalCompanyDraftStoreInput,
	) => Promise<Result<LegalCompany>>;
	updateLegalCompanyProfile: (
		input: UpdateLegalCompanyProfileStoreInput,
	) => Promise<Result<LegalCompany>>;
	insertJurisdictionProfile: (
		input: InsertJurisdictionProfileStoreInput,
	) => Promise<Result<CompanyJurisdictionProfile>>;
	supersedeJurisdictionProfile: (
		input: SupersedeJurisdictionProfileStoreInput,
	) => Promise<Result<CompanyJurisdictionProfile>>;
	findJurisdictionProfileAsOf: (
		input: Readonly<{
			organizationId: OrganizationId;
			legalCompanyId: LegalCompanyId;
			asOf: CanonicalDate;
			knownAt?: CanonicalInstant | undefined;
		}>,
	) => Promise<Result<CompanyJurisdictionProfile | null>>;
	listJurisdictionProfiles: (
		input: LegalCompanyLookupInput,
	) => Promise<Result<readonly CompanyJurisdictionProfile[]>>;
	hasOverlappingJurisdictionProfile: (
		input: Readonly<{
			organizationId: OrganizationId;
			legalCompanyId: LegalCompanyId;
			effectiveRange: EffectiveRange;
			ignoreJurisdictionProfileId?: string;
		}>,
	) => Promise<Result<boolean>>;
	lockLegalCompany: (
		input: Readonly<{
			organizationId: OrganizationId;
			legalCompanyId: LegalCompanyId;
			expectedVersion?: number;
		}>,
	) => Promise<Result<LegalCompany | null>>;
	changeLegalCompanyStatus: (
		input: ChangeLegalCompanyStatusStoreInput,
	) => Promise<Result<CompanyStatusHistory>>;
	findCompanyStatusAsOf: (
		query: CompanyStatusAsOfQuery,
	) => Promise<Result<CompanyStatusHistory | null>>;
	listCompaniesByStatus: (
		query: CompaniesByStatusQuery,
	) => Promise<Result<LegalCompanyListPage>>;
	getLegalCompanyTimeline: (
		input: LegalCompanyTimelineStoreInput,
	) => Promise<Result<readonly LegalCompanyTimelineEntry[]>>;
}> &
	Partial<
		Pick<
			CompanyNameStore,
			| "insertCompanyName"
			| "findCompanyNameById"
			| "listCompanyNames"
			| "findCompanyNameAsOf"
			| "findOverlappingCompanyName"
			| "supersedeCompanyName"
			| "retireCompanyName"
			| "lockCompanyNameScope"
		> &
			Pick<
				CompanyLegalFormStore,
				| "insertCompanyLegalForm"
				| "findCompanyLegalFormAsOf"
				| "findOverlappingCompanyLegalForm"
				| "supersedeCompanyLegalForm"
				| "lockCompanyLegalFormScope"
			> &
			Pick<
				CompanyIdentifierStore,
				| "registerCompanyIdentifier"
				| "supersedeCompanyIdentifier"
				| "retireCompanyIdentifier"
				| "getCompanyIdentifier"
				| "listCompanyIdentifiers"
				| "findCompanyIdentifierAsOf"
				| "findOverlappingCompanyIdentifier"
				| "lockCompanyIdentifierScope"
			> &
			Pick<
				CompanyFinancialYearStore,
				| "setCompanyFinancialYear"
				| "findCompanyFinancialYearAsOf"
				| "findOverlappingCompanyFinancialYear"
				| "lockCompanyFinancialYearScope"
			> &
			Pick<
				CompanyActivityStore,
				| "registerCompanyActivity"
				| "endCompanyActivity"
				| "getCompanyActivity"
				| "listCompanyActivitiesAsOf"
			>
	>;

export type CompanyJurisdictionRulePort = Readonly<{
	listEntityTypeRules: (
		input: Readonly<{
			organizationId: OrganizationId;
			jurisdictionCountryCode: string;
		}>,
	) => Promise<Result<readonly JurisdictionEntityTypeRule[]>>;
}>;

export type CompanyPartyReference = PartyReference;

export type CompanyPartyReferencePort = PartyReferencePort;

export type CompanyReferenceDataPort = ReferenceDataPort &
	Readonly<{
		validateLanguage: (
			input: Readonly<{
				organizationId: OrganizationId;
				languageCode: string;
			}>,
		) => Promise<Result<{ languageCode: string; active: boolean } | null>>;
		resolveLanguage: (input: {
			organizationId: OrganizationId;
			languageCode: string;
		}) => Promise<Result<ReferenceResolution | null>>;
		resolveLegalForm: (input: {
			organizationId: OrganizationId;
			jurisdictionCode: string;
			legalFormCode: string;
			effectiveDate: CanonicalDate;
		}) => Promise<Result<LegalFormReferenceResolution | null>>;
		validateLegalFormCompatibility: (input: {
			organizationId: OrganizationId;
			jurisdictionCode: string;
			entityTypeCode: string;
			legalFormCode: string;
			effectiveDate: CanonicalDate;
		}) => Promise<Result<CompatibilityResolution>>;
		resolveCountry: (input: {
			organizationId: OrganizationId;
			countryCode: string;
			effectiveDate?: CanonicalDate | undefined;
		}) => Promise<Result<ReferenceResolution | null>>;
		resolveCurrency: (input: {
			organizationId: OrganizationId;
			currencyCode: string;
			effectiveDate?: CanonicalDate | undefined;
		}) => Promise<Result<CurrencyReferenceResolution | null>>;
		resolveIdentifierAuthority: (input: {
			organizationId: OrganizationId;
			jurisdictionCode: string;
			authorityCode: string;
			effectiveDate: CanonicalDate;
		}) => ReturnType<ReferenceDataPort["resolveIdentifierAuthority"]>;
		resolveActivityClassification: (input: {
			organizationId: OrganizationId;
			classificationSystem: string;
			activityCode: string;
			effectiveDate: CanonicalDate;
		}) => ReturnType<ReferenceDataPort["resolveActivityClassification"]>;
		resolveRegulator: (input: {
			organizationId: OrganizationId;
			jurisdictionCode: string;
			regulatorCode: string;
			effectiveDate: CanonicalDate;
		}) => ReturnType<ReferenceDataPort["resolveRegulator"]>;
		resolveRegisteredActivity: (input: {
			organizationId: OrganizationId;
			activityCode: string;
			jurisdictionCode: string;
			effectiveDate: CanonicalDate;
		}) => Promise<Result<ReferenceResolution | null>>;
		validateSourceDocument: (
			input: Readonly<{
				organizationId: OrganizationId;
				sourceDocumentId: string;
			}>,
		) => Promise<Result<{ sourceDocumentId: string; active: boolean } | null>>;
		listLegalFormCompatibilityRules: (
			input: Readonly<{
				organizationId: OrganizationId;
				jurisdictionCode: string;
			}>,
		) => Promise<Result<readonly LegalFormCompatibilityRule[]>>;
	}>;

export type CompanyDocumentObjectPort = DocumentObjectPort;

export type LegalCompanyCommandDependencies = Readonly<{
	store: LegalCompanyStore;
	jurisdictionRules: CompanyJurisdictionRulePort;
	partyReferences: CompanyPartyReferencePort;
	referenceData: CompanyReferenceDataPort;
}>;

export type LegalCompanyQueryDependencies = Readonly<{
	store: LegalCompanyStore;
}>;

export type CompanyNameCommandDependencies = LegalCompanyCommandDependencies &
	Readonly<{ nameStore: CompanyNameStore }>;

export type CompanyNameQueryDependencies = Readonly<{
	store: LegalCompanyStore;
	nameStore: CompanyNameStore;
}>;

export type CompanyLegalFormCommandDependencies =
	LegalCompanyCommandDependencies &
		Readonly<{ legalFormStore: CompanyLegalFormStore }>;

export type CompanyLegalFormQueryDependencies = Readonly<{
	store: LegalCompanyStore;
	legalFormStore: CompanyLegalFormStore;
}>;

export type CompanyIdentifierCommandDependencies =
	LegalCompanyCommandDependencies &
		Readonly<{ identifierStore: CompanyIdentifierStore }>;

export type CompanyIdentifierQueryDependencies = Readonly<{
	store: LegalCompanyStore;
	identifierStore: CompanyIdentifierStore;
}>;

export type CompanyFinancialYearCommandDependencies =
	LegalCompanyCommandDependencies &
		Readonly<{ financialYearStore: CompanyFinancialYearStore }>;

export type CompanyFinancialYearQueryDependencies = Readonly<{
	store: LegalCompanyStore;
	financialYearStore: CompanyFinancialYearStore;
}>;

export type CompanyActivityCommandDependencies =
	LegalCompanyCommandDependencies &
		Readonly<{ activityStore: CompanyActivityStore }>;

export type CompanyActivityQueryDependencies = Readonly<{
	store: LegalCompanyStore;
	activityStore: CompanyActivityStore;
}>;

export type LegalCompanyLifecycleCommandDependencies =
	LegalCompanyCommandDependencies &
		CompanyNameQueryDependencies &
		CompanyLegalFormQueryDependencies &
		CompanyIdentifierQueryDependencies &
		CompanyFinancialYearQueryDependencies &
		CompanyActivityQueryDependencies &
		Readonly<{ establishmentStore: EstablishmentStore }>;

export type LegalCompanyLifecycleQueryDependencies = Readonly<{
	store: LegalCompanyStore;
	nameStore: CompanyNameStore;
	legalFormStore: CompanyLegalFormStore;
	identifierStore: CompanyIdentifierStore;
	financialYearStore: CompanyFinancialYearStore;
	activityStore: CompanyActivityStore;
	establishmentStore: EstablishmentStore;
}>;

export type LegalCompanyCommandContext = CorporateAdministrationCommandOptions;
export type LegalCompanyQueryContext = CorporateAdministrationQueryOptions;
export type LegalCompanyPaginatedQueryContext =
	CorporateAdministrationPaginatedQueryOptions;

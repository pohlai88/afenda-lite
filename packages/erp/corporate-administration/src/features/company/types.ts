// biome-ignore-all lint/style/noExportedImports: Branded identifiers are both local schema types and public domain contracts.
import type { z } from "zod";

import type {
	CompanyActivityId,
	CompanyFinancialYearId,
	CompanyIdentifierId,
	CompanyLegalFormHistoryId,
	CompanyNameId,
} from "../../kernel/brands";
import type {
	activateLegalCompanyInputSchema,
	addCompanyNameInputSchema,
	archiveLegalCompanyInputSchema,
	companyActivationCompletenessSchema,
	companyActivityClassificationSchema,
	companyActivitySchema,
	companyActivityStatusSchema,
	companyActivityTypeSchema,
	companyFinancialYearSchema,
	companyIdentifierSchema,
	companyIdentifierStatusSchema,
	companyIdentifierTypeSchema,
	companyJurisdictionProfileSchema,
	companyJurisdictionProfileTimelineEntrySchema,
	companyLegalFormSchema,
	companyLegalFormStatusSchema,
	companyNameSchema,
	companyNameStatusSchema,
	companyNameTypeSchema,
	companyStatusHistorySchema,
	dissolveLegalCompanyInputSchema,
	endCompanyActivityInputSchema,
	enterLiquidationInputSchema,
	findCompanyFinancialYearAsOfInputSchema,
	findCompanyIdentifierAsOfInputSchema,
	findCompanyLegalFormAsOfInputSchema,
	findCompanyNameAsOfInputSchema,
	findCompanyStatusAsOfInputSchema,
	getCompanyCompletenessForActivationInputSchema,
	legalCompanyListItemSchema,
	legalCompanyListPageSchema,
	legalCompanyProfileSchema,
	legalCompanySchema,
	legalCompanyStatusSchema,
	legalCompanyTimelineEntrySchema,
	legalCompanyTimelinePageSchema,
	listCompaniesByStatusInputSchema,
	listCompanyActivitiesAsOfInputSchema,
	listCompanyIdentifiersInputSchema,
	listCompanyNamesInputSchema,
	markCompanyStruckOffInputSchema,
	registerCompanyActivityInputSchema,
	registerCompanyIdentifierInputSchema,
	restoreLegalCompanyInputSchema,
	retireCompanyIdentifierInputSchema,
	retireCompanyNameInputSchema,
	setCompanyFinancialYearInputSchema,
	setCompanyLegalFormInputSchema,
	supersedeCompanyIdentifierInputSchema,
	supersedeCompanyLegalFormInputSchema,
	supersedeCompanyNameInputSchema,
	suspendLegalCompanyInputSchema,
} from "./schemas";

export type {
	CompanyActivityId,
	CompanyFinancialYearId,
	CompanyIdentifierId,
	CompanyLegalFormHistoryId,
	CompanyNameId,
};

export type LegalCompanyProfile = z.infer<typeof legalCompanyProfileSchema>;

export type CompanyJurisdictionProfile = z.infer<
	typeof companyJurisdictionProfileSchema
>;

export type CompanyJurisdictionProfileTimelineEntry = z.infer<
	typeof companyJurisdictionProfileTimelineEntrySchema
>;

export type CompanyNameType = z.infer<typeof companyNameTypeSchema>;

export type CompanyNameStatus = z.infer<typeof companyNameStatusSchema>;

export type CompanyLegalFormStatus = z.infer<
	typeof companyLegalFormStatusSchema
>;

export type CompanyIdentifierType = z.infer<typeof companyIdentifierTypeSchema>;

export type CompanyIdentifierStatus = z.infer<
	typeof companyIdentifierStatusSchema
>;

export type CompanyActivityClassification = z.infer<
	typeof companyActivityClassificationSchema
>;

export type CompanyActivityType = z.infer<typeof companyActivityTypeSchema>;

export type CompanyActivityStatus = z.infer<typeof companyActivityStatusSchema>;

export type LegalCompanyStatus = z.infer<typeof legalCompanyStatusSchema>;

export type CompanyName = z.infer<typeof companyNameSchema>;

export type CompanyNameTimelineEntry = CompanyName &
	Readonly<{
		kind: "company_name";
	}>;

export type CompanyNameListItem = Pick<
	CompanyName,
	| "id"
	| "legalCompanyId"
	| "nameType"
	| "languageCode"
	| "displayName"
	| "normalizedName"
	| "effectiveFrom"
	| "effectiveTo"
	| "status"
>;

export type CompanyLegalFormHistory = z.infer<typeof companyLegalFormSchema>;

export type CompanyLegalForm = CompanyLegalFormHistory;

export type CompanyLegalFormTimelineEntry = CompanyLegalFormHistory &
	Readonly<{
		kind: "company_legal_form";
	}>;

export type CompanyIdentifier = z.infer<typeof companyIdentifierSchema>;

export type CompanyIdentifierListItem = Pick<
	CompanyIdentifier,
	| "id"
	| "legalCompanyId"
	| "identifierType"
	| "jurisdictionCode"
	| "issuingAuthorityCode"
	| "identifierValue"
	| "normalizedIdentifierValue"
	| "effectiveFrom"
	| "effectiveTo"
	| "recordedAt"
	| "status"
>;

export type CompanyIdentifierListPage = Readonly<{
	items: readonly CompanyIdentifierListItem[];
	nextCursor: string | null;
}>;

export type CompanyIdentifierTimelineEntry = CompanyIdentifier &
	Readonly<{
		kind: "company_identifier";
	}>;

export type CompanyFinancialYear = z.infer<typeof companyFinancialYearSchema>;

export type CompanyFinancialYearTimelineEntry = CompanyFinancialYear &
	Readonly<{
		kind: "company_financial_year";
	}>;

export type CompanyActivity = z.infer<typeof companyActivitySchema>;

export type CompanyStatusHistory = z.infer<typeof companyStatusHistorySchema>;

export type CompanyActivationCompleteness = z.infer<
	typeof companyActivationCompletenessSchema
>;

export type CompanyActivityListItem = Pick<
	CompanyActivity,
	| "id"
	| "legalCompanyId"
	| "activityCode"
	| "classification"
	| "jurisdictionCode"
	| "regulatorCode"
	| "description"
	| "effectiveFrom"
	| "effectiveTo"
	| "status"
	| "version"
>;

export type CompanyActivityListPage = Readonly<{
	items: readonly CompanyActivityListItem[];
	nextCursor: string | null;
}>;

export type CompanyActivityTimelineEntry = CompanyActivity &
	Readonly<{
		kind: "company_activity";
	}>;

export type AddCompanyNameInput = z.input<typeof addCompanyNameInputSchema>;

export type SupersedeCompanyNameInput = z.input<
	typeof supersedeCompanyNameInputSchema
>;

export type RetireCompanyNameInput = z.input<
	typeof retireCompanyNameInputSchema
>;

export type SetCompanyLegalFormInput = z.input<
	typeof setCompanyLegalFormInputSchema
>;

export type SupersedeCompanyLegalFormInput = z.input<
	typeof supersedeCompanyLegalFormInputSchema
>;

export type RegisterCompanyIdentifierInput = z.input<
	typeof registerCompanyIdentifierInputSchema
>;

export type SupersedeCompanyIdentifierInput = z.input<
	typeof supersedeCompanyIdentifierInputSchema
>;

export type RetireCompanyIdentifierInput = z.input<
	typeof retireCompanyIdentifierInputSchema
>;

export type SetCompanyFinancialYearInput = z.input<
	typeof setCompanyFinancialYearInputSchema
>;

export type RegisterCompanyActivityInput = z.input<
	typeof registerCompanyActivityInputSchema
>;

export type EndCompanyActivityInput = z.input<
	typeof endCompanyActivityInputSchema
>;

export type ActivateLegalCompanyInput = z.input<
	typeof activateLegalCompanyInputSchema
>;

export type SuspendLegalCompanyInput = z.input<
	typeof suspendLegalCompanyInputSchema
>;

export type MarkCompanyStruckOffInput = z.input<
	typeof markCompanyStruckOffInputSchema
>;

export type EnterLiquidationInput = z.input<typeof enterLiquidationInputSchema>;

export type DissolveLegalCompanyInput = z.input<
	typeof dissolveLegalCompanyInputSchema
>;

export type RestoreLegalCompanyInput = z.input<
	typeof restoreLegalCompanyInputSchema
>;

export type ArchiveLegalCompanyInput = z.input<
	typeof archiveLegalCompanyInputSchema
>;

export type ListCompanyNamesInput = z.input<typeof listCompanyNamesInputSchema>;

export type FindCompanyNameAsOfInput = z.input<
	typeof findCompanyNameAsOfInputSchema
>;

export type FindCompanyLegalFormAsOfInput = z.input<
	typeof findCompanyLegalFormAsOfInputSchema
>;

export type ListCompanyIdentifiersInput = z.input<
	typeof listCompanyIdentifiersInputSchema
>;

export type FindCompanyIdentifierAsOfInput = z.input<
	typeof findCompanyIdentifierAsOfInputSchema
>;

export type FindCompanyFinancialYearAsOfInput = z.input<
	typeof findCompanyFinancialYearAsOfInputSchema
>;

export type ListCompanyActivitiesAsOfInput = z.input<
	typeof listCompanyActivitiesAsOfInputSchema
>;

export type FindCompanyStatusAsOfInput = z.input<
	typeof findCompanyStatusAsOfInputSchema
>;

export type ListCompaniesByStatusInput = z.input<
	typeof listCompaniesByStatusInputSchema
>;

export type GetCompanyCompletenessForActivationInput = z.input<
	typeof getCompanyCompletenessForActivationInputSchema
>;

export type LegalCompany = z.infer<typeof legalCompanySchema>;

export type LegalCompanyTimelineEntry = z.infer<
	typeof legalCompanyTimelineEntrySchema
>;

export type LegalCompanyTimelinePage = z.infer<
	typeof legalCompanyTimelinePageSchema
>;

export type LegalCompanyListItem = z.infer<typeof legalCompanyListItemSchema>;

export type LegalCompanyListPage = z.infer<typeof legalCompanyListPageSchema>;

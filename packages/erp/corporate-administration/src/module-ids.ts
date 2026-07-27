export const CORPORATE_ADMINISTRATION_MODULE_ID =
	"corporate-administration" as const;
export const CORPORATE_ADMINISTRATION_PACKAGE_NAME =
	"@afenda/corporate-administration" as const;

export const CORPORATE_ADMINISTRATION_COMMAND_IDS = [
	"registerLegalCompanyDraft",
	"updateLegalCompanyProfile",
	"addCompanyName",
	"supersedeCompanyName",
	"retireCompanyName",
	"setCompanyJurisdictionProfile",
	"supersedeCompanyJurisdictionProfile",
	"setCompanyLegalForm",
	"supersedeCompanyLegalForm",
	"registerCompanyIdentifier",
	"supersedeCompanyIdentifier",
	"retireCompanyIdentifier",
	"setCompanyFinancialYear",
	"registerCompanyActivity",
	"endCompanyActivity",
	"registerLegalEstablishment",
	"updateLegalEstablishment",
	"activateLegalEstablishment",
	"suspendLegalEstablishment",
	"closeLegalEstablishment",
	"setRegisteredAddress",
	"registerPremise",
	"endPremise",
] as const;
export type CorporateAdministrationCommandId =
	(typeof CORPORATE_ADMINISTRATION_COMMAND_IDS)[number];
export const CORPORATE_ADMINISTRATION_QUERY_IDS = [
	"getLegalCompany",
	"listLegalCompanies",
	"listCompanyNames",
	"findCompanyNameAsOf",
	"findCompanyJurisdictionProfileAsOf",
	"findCompanyLegalFormAsOf",
	"listCompanyIdentifiers",
	"findCompanyIdentifierAsOf",
	"findCompanyFinancialYearAsOf",
	"listCompanyActivitiesAsOf",
	"getLegalCompanyTimeline",
	"getLegalEstablishment",
	"listLegalEstablishmentsAsOf",
	"findRegisteredAddressAsOf",
	"listPremisesAsOf",
] as const;
export type CorporateAdministrationQueryId =
	(typeof CORPORATE_ADMINISTRATION_QUERY_IDS)[number];

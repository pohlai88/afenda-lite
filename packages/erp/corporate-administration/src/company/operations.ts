import {
	defineCorporateAdministrationCommand as command,
	defineCorporateAdministrationOptionalApprovalCommand as optionalApprovalCommand,
	defineCorporateAdministrationQuery as query,
	defineCorporateAdministrationRequiredApprovalCommand as requiredApprovalCommand,
} from "../operation-registry/types";

const owner = "company" as const;
const read = "corporate_administration.company.read" as const;
const manage = "corporate_administration.company.manage" as const;

export const companyOperationDefinitions = [
	command({
		id: "registerLegalCompanyDraft",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.register-draft",
		eventType: "corporate_administration.legal_company.draft_registered.v1",
	}),
	command({
		id: "updateLegalCompanyProfile",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.update-profile",
		eventType: "corporate_administration.legal_company.profile_updated.v1",
	}),
	optionalApprovalCommand({
		id: "addCompanyName",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.add-company-name",
		eventType: "corporate_administration.legal_company.name_added.v1",
	}),
	optionalApprovalCommand({
		id: "supersedeCompanyName",
		owner,
		permission: manage,
		commandIdentity:
			"corporate-administration.legal-company.supersede-company-name",
		eventType: "corporate_administration.legal_company.name_superseded.v1",
	}),
	optionalApprovalCommand({
		id: "retireCompanyName",
		owner,
		permission: manage,
		commandIdentity:
			"corporate-administration.legal-company.retire-company-name",
		eventType: "corporate_administration.legal_company.name_retired.v1",
	}),
	command({
		id: "setCompanyJurisdictionProfile",
		owner,
		permission: manage,
		commandIdentity:
			"corporate-administration.legal-company.set-jurisdiction-profile",
		eventType:
			"corporate_administration.legal_company.jurisdiction_profile_set.v1",
	}),
	command({
		id: "supersedeCompanyJurisdictionProfile",
		owner,
		permission: manage,
		commandIdentity:
			"corporate-administration.legal-company.supersede-jurisdiction-profile",
		eventType:
			"corporate_administration.legal_company.jurisdiction_profile_set.v1",
	}),
	optionalApprovalCommand({
		id: "setCompanyLegalForm",
		owner,
		permission: manage,
		commandIdentity:
			"corporate-administration.legal-company.set-company-legal-form",
		eventType: "corporate_administration.legal_company.legal_form_changed.v1",
	}),
	optionalApprovalCommand({
		id: "supersedeCompanyLegalForm",
		owner,
		permission: manage,
		commandIdentity:
			"corporate-administration.legal-company.supersede-company-legal-form",
		eventType: "corporate_administration.legal_company.legal_form_changed.v1",
	}),
	optionalApprovalCommand({
		id: "registerCompanyIdentifier",
		owner,
		permission: manage,
		commandIdentity:
			"corporate-administration.legal-company.register-company-identifier",
		eventType:
			"corporate_administration.legal_company.identifier_registered.v1",
	}),
	optionalApprovalCommand({
		id: "supersedeCompanyIdentifier",
		owner,
		permission: manage,
		commandIdentity:
			"corporate-administration.legal-company.supersede-identifier",
		eventType:
			"corporate_administration.legal_company.identifier_registered.v1",
	}),
	optionalApprovalCommand({
		id: "retireCompanyIdentifier",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.retire-identifier",
		eventType: "corporate_administration.legal_company.identifier_retired.v1",
	}),
	optionalApprovalCommand({
		id: "setCompanyFinancialYear",
		owner,
		permission: manage,
		commandIdentity:
			"corporate-administration.legal-company.set-financial-year",
		eventType: "corporate_administration.legal_company.financial_year_set.v1",
	}),
	optionalApprovalCommand({
		id: "registerCompanyActivity",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.register-activity",
		eventType: "corporate_administration.legal_company.activity_registered.v1",
	}),
	optionalApprovalCommand({
		id: "endCompanyActivity",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.end-activity",
		eventType: "corporate_administration.legal_company.activity_ended.v1",
	}),
	requiredApprovalCommand({
		id: "activateLegalCompany",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.activate",
		eventType: "corporate_administration.legal_company.activated.v1",
	}),
	requiredApprovalCommand({
		id: "suspendLegalCompany",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.suspend",
		eventType: "corporate_administration.legal_company.suspended.v1",
	}),
	requiredApprovalCommand({
		id: "markCompanyStruckOff",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.mark-struck-off",
		eventType: "corporate_administration.legal_company.struck_off_marked.v1",
	}),
	requiredApprovalCommand({
		id: "enterLiquidation",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.enter-liquidation",
		eventType: "corporate_administration.legal_company.liquidation_entered.v1",
	}),
	requiredApprovalCommand({
		id: "dissolveLegalCompany",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.dissolve",
		eventType: "corporate_administration.legal_company.dissolved.v1",
	}),
	requiredApprovalCommand({
		id: "restoreLegalCompany",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.restore",
		eventType: "corporate_administration.legal_company.restored.v1",
	}),
	requiredApprovalCommand({
		id: "archiveLegalCompany",
		owner,
		permission: manage,
		commandIdentity: "corporate-administration.legal-company.archive",
		eventType: "corporate_administration.legal_company.archived.v1",
	}),
	query({ id: "getLegalCompany", owner, permission: read }),
	query({ id: "listLegalCompanies", owner, permission: read }),
	query({ id: "listCompanyNames", owner, permission: read }),
	query({ id: "findCompanyNameAsOf", owner, permission: read }),
	query({ id: "findCompanyJurisdictionProfileAsOf", owner, permission: read }),
	query({ id: "findCompanyLegalFormAsOf", owner, permission: read }),
	query({ id: "listCompanyIdentifiers", owner, permission: read }),
	query({ id: "findCompanyIdentifierAsOf", owner, permission: read }),
	query({ id: "findCompanyFinancialYearAsOf", owner, permission: read }),
	query({ id: "listCompanyActivitiesAsOf", owner, permission: read }),
	query({ id: "findCompanyStatusAsOf", owner, permission: read }),
	query({ id: "listCompaniesByStatus", owner, permission: read }),
	query({ id: "getCompanyCompletenessForActivation", owner, permission: read }),
	query({ id: "getLegalCompanyTimeline", owner, permission: read }),
] as const;

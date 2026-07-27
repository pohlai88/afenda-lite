import type { AfendaModuleManifest } from "@afenda/db/module-manifest";

import {
	CORPORATE_ADMINISTRATION_MODULE_ID,
	CORPORATE_ADMINISTRATION_PACKAGE_NAME,
} from "./module-ids";
import { CORPORATE_ADMINISTRATION_MUTATION_TABLES } from "./mutation-tables";

/**
 * Corporate Administration greenfield module manifest.
 *
 * Declares infrastructure-only mutation ownership while the module remains
 * scaffolded. Runtime infrastructure (clock, transaction, idempotency) is not
 * an ERP module dependency and must not appear here. Optional integrations stay
 * empty until a later governed slice proves the relationship.
 */
export const corporateAdministrationModuleManifest = {
	id: CORPORATE_ADMINISTRATION_MODULE_ID,
	category: "erp",
	packageName: CORPORATE_ADMINISTRATION_PACKAGE_NAME,
	band: "R1-F",
	lifecycle: "scaffolded",
	activationMode: "organization_toggle",
	owns: {
		aggregates: ["legal_company", "legal_establishment", "premise"],
		commandNamespace: "corporate-administration",
		commands: [
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
		],
		queryNamespace: "corporate-administration",
		queries: [
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
		],
	},
	persistence: {
		schemaOwner: "@afenda/db",
		mutationTables: [...CORPORATE_ADMINISTRATION_MUTATION_TABLES],
	},
	events: {
		namespace: "corporate_administration",
		emits: [
			"corporate_administration.legal_company.draft_registered.v1",
			"corporate_administration.legal_company.profile_updated.v1",
			"corporate_administration.legal_company.jurisdiction_profile_set.v1",
			"corporate_administration.legal_company.name_added.v1",
			"corporate_administration.legal_company.name_superseded.v1",
			"corporate_administration.legal_company.legal_form_changed.v1",
			"corporate_administration.legal_company.identifier_registered.v1",
			"corporate_administration.legal_company.financial_year_set.v1",
			"corporate_administration.legal_company.activity_registered.v1",
			"corporate_administration.legal_establishment.registered.v1",
			"corporate_administration.legal_establishment.updated.v1",
			"corporate_administration.legal_establishment.status_changed.v1",
			"corporate_administration.registered_address.set.v1",
			"corporate_administration.premise.registered.v1",
			"corporate_administration.premise.ended.v1",
		],
		consumes: [],
	},
	permissions: {
		namespace: "corporate_administration",
		codes: [
			"corporate_administration.company.read",
			"corporate_administration.company.manage",
			"corporate_administration.establishment.manage",
		],
	},
	authorization: {
		commands: {
			registerLegalCompanyDraft: "corporate_administration.company.manage",
			updateLegalCompanyProfile: "corporate_administration.company.manage",
			addCompanyName: "corporate_administration.company.manage",
			supersedeCompanyName: "corporate_administration.company.manage",
			retireCompanyName: "corporate_administration.company.manage",
			setCompanyJurisdictionProfile: "corporate_administration.company.manage",
			supersedeCompanyJurisdictionProfile:
				"corporate_administration.company.manage",
			setCompanyLegalForm: "corporate_administration.company.manage",
			supersedeCompanyLegalForm: "corporate_administration.company.manage",
			registerCompanyIdentifier: "corporate_administration.company.manage",
			supersedeCompanyIdentifier: "corporate_administration.company.manage",
			retireCompanyIdentifier: "corporate_administration.company.manage",
			setCompanyFinancialYear: "corporate_administration.company.manage",
			registerCompanyActivity: "corporate_administration.company.manage",
			endCompanyActivity: "corporate_administration.company.manage",
			registerLegalEstablishment:
				"corporate_administration.establishment.manage",
			updateLegalEstablishment: "corporate_administration.establishment.manage",
			activateLegalEstablishment:
				"corporate_administration.establishment.manage",
			suspendLegalEstablishment:
				"corporate_administration.establishment.manage",
			closeLegalEstablishment: "corporate_administration.establishment.manage",
			setRegisteredAddress: "corporate_administration.establishment.manage",
			registerPremise: "corporate_administration.establishment.manage",
			endPremise: "corporate_administration.establishment.manage",
		},
		queries: {
			getLegalCompany: "corporate_administration.company.read",
			listLegalCompanies: "corporate_administration.company.read",
			listCompanyNames: "corporate_administration.company.read",
			findCompanyNameAsOf: "corporate_administration.company.read",
			findCompanyJurisdictionProfileAsOf:
				"corporate_administration.company.read",
			findCompanyLegalFormAsOf: "corporate_administration.company.read",
			listCompanyIdentifiers: "corporate_administration.company.read",
			findCompanyIdentifierAsOf: "corporate_administration.company.read",
			findCompanyFinancialYearAsOf: "corporate_administration.company.read",
			listCompanyActivitiesAsOf: "corporate_administration.company.read",
			getLegalCompanyTimeline: "corporate_administration.company.read",
			getLegalEstablishment: "corporate_administration.company.read",
			listLegalEstablishmentsAsOf: "corporate_administration.company.read",
			findRegisteredAddressAsOf: "corporate_administration.company.read",
			listPremisesAsOf: "corporate_administration.company.read",
		},
	},
	moduleDependencies: {
		required: [],
	},
	optionalIntegratesWith: [],
} as const satisfies AfendaModuleManifest;

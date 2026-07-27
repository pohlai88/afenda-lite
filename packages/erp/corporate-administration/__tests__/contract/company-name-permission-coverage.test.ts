import { describe, expect, it } from "vitest";

import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
	corporateAdministrationModuleManifest,
} from "../../src";

describe("company name and legal-form permission coverage", () => {
	it("maps every CA-1.2 mutation to manage and read-only query to read", () => {
		expect(CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS).toMatchObject({
			addCompanyName: "corporate_administration.company.manage",
			supersedeCompanyName: "corporate_administration.company.manage",
			retireCompanyName: "corporate_administration.company.manage",
			setCompanyLegalForm: "corporate_administration.company.manage",
			supersedeCompanyLegalForm: "corporate_administration.company.manage",
		});
		expect(CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS).toMatchObject({
			listCompanyNames: "corporate_administration.company.read",
			findCompanyNameAsOf: "corporate_administration.company.read",
			findCompanyLegalFormAsOf: "corporate_administration.company.read",
		});
		expect(
			corporateAdministrationModuleManifest.authorization.commands,
		).toMatchObject(CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS);
		expect(
			corporateAdministrationModuleManifest.authorization.queries,
		).toMatchObject(CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS);
	});
});

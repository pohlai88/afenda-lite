import { describe, expect, it } from "vitest";

import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
} from "../../src/kernel/authorization/authorization";

describe("company identity permission coverage", () => {
	it("maps CA-1.3 identity commands and queries to manage/read permissions", () => {
		expect(CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS).toMatchObject({
			registerCompanyIdentifier: "corporate_administration.company.manage",
			supersedeCompanyIdentifier: "corporate_administration.company.manage",
			retireCompanyIdentifier: "corporate_administration.company.manage",
			setCompanyFinancialYear: "corporate_administration.company.manage",
			registerCompanyActivity: "corporate_administration.company.manage",
			endCompanyActivity: "corporate_administration.company.manage",
		});
		expect(CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS).toMatchObject({
			listCompanyIdentifiers: "corporate_administration.company.read",
			findCompanyIdentifierAsOf: "corporate_administration.company.read",
			findCompanyFinancialYearAsOf: "corporate_administration.company.read",
			listCompanyActivitiesAsOf: "corporate_administration.company.read",
		});
	});
});

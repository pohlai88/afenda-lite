import {
	CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS,
	CORPORATE_ADMINISTRATION_PERMISSION_CODES,
	CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS,
} from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";

describe("Corporate Administration company permission coverage", () => {
	it("maps every CA-1.1 command to the company manage capability", () => {
		expect(CORPORATE_ADMINISTRATION_COMMAND_PERMISSIONS).toMatchObject({
			updateLegalCompanyProfile: "corporate_administration.company.manage",
			setCompanyJurisdictionProfile: "corporate_administration.company.manage",
			supersedeCompanyJurisdictionProfile:
				"corporate_administration.company.manage",
		});
	});

	it("maps every CA-1.1 query to the company read capability", () => {
		expect(CORPORATE_ADMINISTRATION_QUERY_PERMISSIONS).toMatchObject({
			getLegalCompany: "corporate_administration.company.read",
			listLegalCompanies: "corporate_administration.company.read",
			findCompanyJurisdictionProfileAsOf:
				"corporate_administration.company.read",
			getLegalCompanyTimeline: "corporate_administration.company.read",
		});
	});

	it("publishes the required company and establishment permission codes", () => {
		expect(CORPORATE_ADMINISTRATION_PERMISSION_CODES).toEqual([
			"corporate_administration.company.read",
			"corporate_administration.company.manage",
			"corporate_administration.establishment.manage",
		]);
	});
});

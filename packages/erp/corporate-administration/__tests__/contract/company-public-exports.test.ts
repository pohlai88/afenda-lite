import * as corporateAdministration from "@afenda/corporate-administration";
import { describe, expect, it } from "vitest";

describe("Corporate Administration company public exports", () => {
	it("exports the CA-1.1 commands and queries from the package root", () => {
		for (const exportName of [
			"updateLegalCompanyProfile",
			"setCompanyJurisdictionProfile",
			"supersedeCompanyJurisdictionProfile",
			"getLegalCompany",
			"listLegalCompanies",
			"findCompanyJurisdictionProfileAsOf",
			"getLegalCompanyTimeline",
		]) {
			expect(corporateAdministration).toHaveProperty(exportName);
		}
	});

	it("exports the CA-1.1 schemas from the package root", () => {
		for (const exportName of [
			"updateLegalCompanyProfileInputSchema",
			"setCompanyJurisdictionProfileInputSchema",
			"supersedeCompanyJurisdictionProfileInputSchema",
			"getLegalCompanyInputSchema",
			"listLegalCompaniesInputSchema",
			"findCompanyJurisdictionProfileAsOfInputSchema",
			"getLegalCompanyTimelineInputSchema",
			"legalCompanySchema",
			"legalCompanyListPageSchema",
			"legalCompanyTimelineEntrySchema",
		]) {
			expect(corporateAdministration).toHaveProperty(exportName);
		}
	});
});

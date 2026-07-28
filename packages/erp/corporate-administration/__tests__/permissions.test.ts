import { describe, expect, expectTypeOf, it } from "vitest";
import {
	CORPORATE_ADMINISTRATION_PERMISSION_CODES,
	type CorporateAdministrationPermission,
} from "../src/permissions";

describe("Corporate Administration permissions", () => {
	it("ships the CA-1.4 company and establishment permissions", () => {
		expect(CORPORATE_ADMINISTRATION_PERMISSION_CODES).toEqual([
			"corporate_administration.company.read",
			"corporate_administration.company.manage",
			"corporate_administration.establishment.manage",
			"corporate_administration.governance.read",
			"corporate_administration.governance.manage",
			"corporate_administration.officer.read",
			"corporate_administration.officer.manage",
			"corporate_administration.officer_compliance.read",
			"corporate_administration.officer_compliance.manage",
			"corporate_administration.meeting.read",
			"corporate_administration.meeting.manage",
			"corporate_administration.resolution.read",
			"corporate_administration.resolution.manage",
		]);
		expectTypeOf<CorporateAdministrationPermission>().toEqualTypeOf<
			| "corporate_administration.company.read"
			| "corporate_administration.company.manage"
			| "corporate_administration.establishment.manage"
			| "corporate_administration.governance.read"
			| "corporate_administration.governance.manage"
			| "corporate_administration.officer.read"
			| "corporate_administration.officer.manage"
			| "corporate_administration.officer_compliance.read"
			| "corporate_administration.officer_compliance.manage"
			| "corporate_administration.meeting.read"
			| "corporate_administration.meeting.manage"
			| "corporate_administration.resolution.read"
			| "corporate_administration.resolution.manage"
		>();
	});
});

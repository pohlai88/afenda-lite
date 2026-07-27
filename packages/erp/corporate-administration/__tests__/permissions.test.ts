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
		]);
		expectTypeOf<CorporateAdministrationPermission>().toEqualTypeOf<
			| "corporate_administration.company.read"
			| "corporate_administration.company.manage"
			| "corporate_administration.establishment.manage"
		>();
	});
});

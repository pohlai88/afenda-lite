import { describe, expect, it } from "vitest";
import { corporateAdministrationModuleManifest } from "../src";

describe("@afenda/corporate-administration scaffold", () => {
	it("declares the canonical module manifest", () => {
		expect(corporateAdministrationModuleManifest.id).toBe(
			"corporate-administration",
		);
		expect(corporateAdministrationModuleManifest.packageName).toBe(
			"@afenda/corporate-administration",
		);
	});
});

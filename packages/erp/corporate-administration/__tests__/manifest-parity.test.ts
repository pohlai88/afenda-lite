import { describe, expect, it } from "vitest";
import { corporateAdministrationModuleManifest } from "../src/module.manifest";
import { CA_COMMAND_IDS, CA_QUERY_IDS } from "../src/module-ids";
import { CA_PERMISSION_CODES } from "../src/permissions";

describe("@afenda/corporate-administration manifest parity", () => {
	it("maps every declared command and query to a catalog permission", () => {
		expect(
			Object.keys(
				corporateAdministrationModuleManifest.authorization.commands,
			).toSorted(),
		).toEqual([...CA_COMMAND_IDS].toSorted());
		expect(
			Object.keys(
				corporateAdministrationModuleManifest.authorization.queries,
			).toSorted(),
		).toEqual([...CA_QUERY_IDS].toSorted());

		const catalog = new Set<string>(CA_PERMISSION_CODES);
		for (const permission of Object.values(
			corporateAdministrationModuleManifest.authorization.commands,
		)) {
			expect(catalog.has(permission)).toBe(true);
		}
		for (const permission of Object.values(
			corporateAdministrationModuleManifest.authorization.queries,
		)) {
			expect(catalog.has(permission)).toBe(true);
		}
	});

	it("keeps manifest contracts and permission catalog on the canonical arrays", () => {
		expect(corporateAdministrationModuleManifest.owns.commands).toEqual(
			CA_COMMAND_IDS,
		);
		expect(corporateAdministrationModuleManifest.owns.queries).toEqual(
			CA_QUERY_IDS,
		);
		expect(corporateAdministrationModuleManifest.permissions.codes).toEqual(
			CA_PERMISSION_CODES,
		);
	});
});

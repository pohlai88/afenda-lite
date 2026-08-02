import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("Corporate Administration production runtime composition", () => {
	it("uses the single package runtime facade from the application root", () => {
		const repositoryRoot = fileURLToPath(
			new URL("../../../../", import.meta.url),
		);
		const sourceDirectory = fileURLToPath(new URL("../src/", import.meta.url));
		const appRuntime = readFileSync(
			`${repositoryRoot}/apps/web/lib/erp/corporate-administration-runtime.ts`,
			"utf8",
		);
		const commandComposition = readFileSync(
			`${repositoryRoot}/apps/web/lib/erp/corporate-administration-command-options.ts`,
			"utf8",
		);

		expect(appRuntime).toContain("createCorporateAdministrationRuntime");
		expect(appRuntime).not.toContain(
			"createCorporateAdministrationProductionRuntime",
		);
		expect(existsSync(`${sourceDirectory}/production-ports.ts`)).toBe(false);
		expect(commandComposition).not.toContain(
			"createCorporateAdministrationApprovalDecisionPort",
		);
		expect(commandComposition).not.toContain(
			"verify: async () => errorResult.ok(null)",
		);
	});
});

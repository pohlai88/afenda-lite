import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const packageRoot = join(process.cwd(), "src");

const boundaryFiles = [
	"company/commands/add-company-name.ts",
	"company/commands/supersede-company-name.ts",
	"company/commands/retire-company-name.ts",
	"ports.ts",
] as const;

describe("company-name party boundary", () => {
	it("does not import or write raw md_party for statutory-name mutations", () => {
		for (const relativePath of boundaryFiles) {
			const source = readFileSync(join(packageRoot, relativePath), "utf8");
			expect(source).not.toContain("md_party");
			expect(source).not.toContain("mdParty");
			expect(source).not.toContain("UPDATE md_party");
		}
	});

	it("keeps party reconciliation behind public package ports", () => {
		const ports = readFileSync(join(packageRoot, "ports.ts"), "utf8");
		expect(ports).toContain("PartyReferencePort");
		expect(ports).toContain("MasterDataReconciliationPort");
		expect(ports).toContain("statutoryName");
		expect(ports).toContain("operationalPartyName");
	});
});

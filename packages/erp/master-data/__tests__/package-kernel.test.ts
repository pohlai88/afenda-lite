import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { describe, expect, it } from "vitest";

const packageRoot = join(import.meta.dirname, "..");
const srcRoot = join(packageRoot, "src");
const repositoryRoot = join(packageRoot, "../../..");

const requiredPackageFiles = [
	"package.json",
	"README.md",
	"tsconfig.json",
	"src/index.ts",
	"src/types.ts",
	"src/module-ids.ts",
	"src/module.manifest.ts",
	"src/permissions.ts",
	"src/authorization.ts",
	"src/command-options.ts",
	"src/parse-input.ts",
	"src/ports.ts",
	"src/contracts/context.ts",
	"src/contracts/reasons.ts",
	"src/capabilities/core-organization-masters/normalized-code.ts",
	"src/capabilities/core-organization-masters/version-cas.ts",
	"src/capabilities/core-organization-masters/lifecycle.ts",
] as const;

const forbiddenSourceImports = [
	/from\s+["']next(?:\/[^"']*)?["']/,
	/from\s+["']@\/[^"']*["']/,
	/from\s+["']apps\/[^"']*["']/,
	/from\s+["'][^"']*\/apps\/[^"']*["']/,
	/from\s+["']@afenda\/(?:sales|purchasing|inventory|receiving|fulfillment|receivables|payables|payments|accounting)(?:\/[^"']*)?["']/,
	/from\s+["']transaction-module(?:\/[^"']*)?["']/,
] as const;

function listSourceFiles(root: string): string[] {
	const entries = readdirSync(root, { withFileTypes: true });
	return entries.flatMap((entry) => {
		const path = join(root, entry.name);
		if (entry.isDirectory()) {
			if (
				entry.name === "node_modules" ||
				entry.name === ".turbo" ||
				entry.name === "dist"
			) {
				return [];
			}
			return listSourceFiles(path);
		}
		return entry.name.endsWith(".ts") ? [path] : [];
	});
}

describe("@afenda/master-data package kernel", () => {
	it("keeps the MD-0.1 scaffold under the package src root", () => {
		for (const file of requiredPackageFiles) {
			expect(existsSync(join(packageRoot, file)), `${file} must exist`).toBe(
				true,
			);
		}
	});

	it("keeps the root barrel server-only and away from raw Drizzle exports", () => {
		const source = readFileSync(join(srcRoot, "index.ts"), "utf8");
		expect(source.startsWith('import "server-only";')).toBe(true);
		expect(source).not.toContain('from "./drizzle-store"');
		expect(source).not.toContain('from "./adapters/drizzle"');
		expect(source).not.toContain("DrizzleMasterDataStore");
		expect(source).not.toContain(
			'from "./capabilities/platform-references/queries"',
		);
		expect(source).not.toContain(
			'from "./capabilities/platform-references/policies"',
		);
		expect(source).not.toContain(
			'from "./capabilities/platform-references/reference-errors"',
		);
	});

	it("publishes only justified package subpaths", () => {
		const packageJson = JSON.parse(
			readFileSync(join(packageRoot, "package.json"), "utf8"),
		) as { exports: Record<string, unknown> };

		expect(Object.keys(packageJson.exports).sort()).toEqual(
			[
				".",
				"./adapters/drizzle",
				"./module-manifest",
				"./testing/organization-dimensions",
			].sort(),
		);
	});

	it("keeps package source independent from Next, apps, ERP peers, and transaction-module imports", () => {
		const violations = listSourceFiles(srcRoot).flatMap((file) => {
			const source = readFileSync(file, "utf8");
			return forbiddenSourceImports
				.filter((pattern) => pattern.test(source))
				.map((pattern) => ({
					file: relative(packageRoot, file),
					pattern: pattern.source,
				}));
		});
		expect(violations).toEqual([]);
	});

	it("keeps capabilities as a single implementation directory", () => {
		const duplicateCapabilitiesRoots = listSourceFiles(packageRoot)
			.map((file) => relative(packageRoot, file).split(sep))
			.filter((parts) => parts.includes("capabilities"))
			.map((parts) =>
				parts.slice(0, parts.indexOf("capabilities") + 1).join("/"),
			)
			.filter((root, index, roots) => roots.indexOf(root) === index)
			.filter((root) => root !== "src/capabilities");

		expect(duplicateCapabilitiesRoots).toEqual([]);
	});

	it("keeps historical item-template names inside the schema ingress boundary", () => {
		const allowedIngress = join(
			srcRoot,
			"capabilities/core-organization-masters/schemas.ts",
		);
		const violations = listSourceFiles(srcRoot)
			.filter((file) => file !== allowedIngress)
			.flatMap((file) => {
				const source = readFileSync(file, "utf8");
				return [
					/ITEM_TEMPLATE_ATTRIBUTE_VALUE_KINDS/,
					/legacyValueKindFromDataType/,
					/\bvalueKind:\s*(?:"text"|"option"|legacyValueKindFromDataType)/,
					/\bsortOrder:\s*row\.displayOrder/,
					/\bvalueText:\s*row\.textValue/,
				]
					.filter((pattern) => pattern.test(source))
					.map((pattern) => ({
						file: relative(packageRoot, file),
						pattern: pattern.source,
					}));
			});

		expect(violations).toEqual([]);
	});

	it("prevents web consumers from restoring retired item-template semantics", () => {
		const consumerRoots = [
			join(repositoryRoot, "apps/web/app/actions"),
			join(repositoryRoot, "apps/web/features/master-data"),
		];
		const forbiddenConsumerSemantics = [
			/ITEM_TEMPLATE_ATTRIBUTE_VALUE_KINDS/,
			/listTemplateAttributes/,
			/listTemplateAttributeOptions/,
			/\.valueKind\b/,
			/name=["']valueKind["']/,
			/\bvalueText_\$?\{/,
		];
		const violations = consumerRoots.flatMap((root) =>
			listSourceFiles(root).flatMap((file) => {
				const source = readFileSync(file, "utf8");
				return forbiddenConsumerSemantics
					.filter((pattern) => pattern.test(source))
					.map((pattern) => ({
						file: relative(repositoryRoot, file),
						pattern: pattern.source,
					}));
			}),
		);

		expect(violations).toEqual([]);
	});

	it("keeps retired compatibility APIs out of the package surface", () => {
		const forbiddenCompatibilityApis = [
			/\borgActorContextSchema\b/,
			/\bOrgActorContext\b/,
			/\bPartyExternalIdCaseSensitivity\b/,
			/\bPARTY_EXTERNAL_ID_CASE_SENSITIVITIES\b/,
			/\bNormalizedPartyExternalId\b/,
			/\bnormalizePartyExternalId\b/,
			/\bMasterDataVariantStore\b/,
			/\bItemTemplateVariantStore\b/,
			/\bgetPartyRole\b/,
			/\bfindByExternalIdInputSchema\b/,
			/\blistByParentInputSchema\b/,
			/legacy-queries/,
		];
		const violations = listSourceFiles(srcRoot).flatMap((file) => {
			const source = readFileSync(file, "utf8");
			return forbiddenCompatibilityApis
				.filter((pattern) => pattern.test(source))
				.map((pattern) => ({
					file: relative(packageRoot, file),
					pattern: pattern.source,
				}));
		});

		expect(violations).toEqual([]);
	});
});

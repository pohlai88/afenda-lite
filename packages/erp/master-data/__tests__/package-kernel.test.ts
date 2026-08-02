import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import ts from "typescript";
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
	"src/composition/module.manifest.ts",
	"src/permissions.ts",
	"src/authorization.ts",
	"src/command-options.ts",
	"src/public-capabilities.ts",
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
		const forbiddenRootImplementationSurface = [
			/\bAuditFactPort\b/,
			/\bcreateEmptyDependencyInspector\b/,
			/\bcreateUnavailableDependencyInspector\b/,
			/\bDependencyInspector\b/,
			/\bMutationPorts\b/,
			/\bOutboxPort\b/,
			/\bcreateDrizzleOrganizationDimensionStore\b/,
			/\bcreateProductionMutationPorts\b/,
			/\bcreateSqlAuditFactPort\b/,
			/\bcreateSqlOutboxPort\b/,
			/\bresolveMasterDataStore\b/,
			/from\s+["'][^"']*(?:commercial-master-store|item-store|party-store|warehouse-store)["']/,
			/from\s+["'][^"']*core-organization-masters\/store["']/,
			/from\s+["'][^"']*extensions\/(?:store|template-store)["']/,
		];
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
		for (const forbidden of forbiddenRootImplementationSurface) {
			expect(source).not.toMatch(forbidden);
		}
		expect(source).not.toMatch(/\bMasterCommandOptions\b/);
		expect(source).not.toMatch(/\bMasterQueryOptions\b/);
		expect(source).toMatch(/\bMasterDataCapabilityOptions\b/);
	});

	it("keeps web consumers on the root capability facade", () => {
		const webRoot = join(repositoryRoot, "apps/web");
		const violations = listSourceFiles(webRoot).flatMap((file) => {
			const source = readFileSync(file, "utf8");
			return source.includes("@afenda/master-data/adapters/drizzle")
				? [relative(repositoryRoot, file)]
				: [];
		});

		expect(violations).toEqual([]);
	});

	it("keeps platform and core-master queries on public capability options", () => {
		const queryModules = [
			"capabilities/platform-references/authorized-queries.ts",
			"capabilities/core-organization-masters/item.ts",
			"capabilities/core-organization-masters/item-group.ts",
			"capabilities/core-organization-masters/party.ts",
			"capabilities/core-organization-masters/payment-term.ts",
			"capabilities/core-organization-masters/tax-registration.ts",
			"capabilities/core-organization-masters/warehouse.ts",
		] as const;

		for (const module of queryModules) {
			const source = readFileSync(join(srcRoot, module), "utf8");
			expect(source, module).toContain("MasterDataCapabilityOptions");
			expect(source, module).not.toContain("MasterQueryOptions");
			expect(source, module).not.toMatch(/options\.store\b/);
		}
	});

	it("keeps internal execution options out of every root callable signature", () => {
		const configPath = join(packageRoot, "tsconfig.json");
		const config = ts.readConfigFile(configPath, ts.sys.readFile);
		if (config.error !== undefined) {
			throw new Error(
				ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
			);
		}
		const parsed = ts.parseJsonConfigFileContent(
			config.config,
			ts.sys,
			packageRoot,
		);
		const program = ts.createProgram(parsed.fileNames, parsed.options);
		const checker = program.getTypeChecker();
		const rootSource = program.getSourceFile(join(srcRoot, "index.ts"));
		if (rootSource === undefined) {
			throw new Error("Master-data root source was not loaded.");
		}
		const rootSymbol = checker.getSymbolAtLocation(rootSource);
		if (rootSymbol === undefined) {
			throw new Error("Master-data root module symbol was not resolved.");
		}

		const violations = checker
			.getExportsOfModule(rootSymbol)
			.flatMap((symbol) => {
				const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
				if (declaration === undefined) {
					return [];
				}
				const signatures = checker
					.getTypeOfSymbolAtLocation(symbol, declaration)
					.getCallSignatures()
					.map((signature) =>
						checker.signatureToString(
							signature,
							declaration,
							ts.TypeFormatFlags.NoTruncation,
						),
					);
				return signatures
					.filter((signature) =>
						/Master(?:Command|Query)Options|OrganizationDimensionOptions/.test(
							signature,
						),
					)
					.map((signature) => ({ name: symbol.getName(), signature }));
			});

		expect(violations).toEqual([]);
	}, 30_000);

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

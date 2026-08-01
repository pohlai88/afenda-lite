import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, expectTypeOf, it } from "vitest";
import {
	defineComponentGovernanceRegistry,
	UI_SYSTEM_CATALOG,
} from "../src/metadata/catalog";
import type {
	GovernedCatalogComponent,
	UiRepositorySnapshot,
} from "../src/metadata/contract";
import {
	defineManifestContract,
	UI_COMPONENT_CONTRACT_STANDARD,
} from "../src/metadata/contracts/manifest.contract";
import {
	validateGovernance,
	validateUiCatalog,
} from "../src/metadata/validate";

const packageRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(packageRoot, "../../..");
const contractDirectory = path.join(packageRoot, "src/metadata/contracts");

interface ContractSourceFact {
	readonly component: string;
	readonly exportName: string;
	readonly fileName: string;
	readonly id: string;
}

function parseTypeScript(source: string, fileName: string): ts.SourceFile {
	return ts.createSourceFile(
		fileName,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
}

function contractSourceFact(
	source: string,
	fileName: string,
): ContractSourceFact {
	const sourceFile = parseTypeScript(source, fileName);
	let callsLowLevelFactory = false;
	function inspect(node: ts.Node): void {
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === "defineComponentContract"
		) {
			callsLowLevelFactory = true;
		}
		ts.forEachChild(node, inspect);
	}
	inspect(sourceFile);
	const importsManifestFactory = sourceFile.statements.some(
		(statement) =>
			ts.isImportDeclaration(statement) &&
			statement.moduleSpecifier.getText(sourceFile).slice(1, -1) ===
				"./manifest.contract" &&
			statement.importClause?.namedBindings &&
			ts.isNamedImports(statement.importClause.namedBindings) &&
			statement.importClause.namedBindings.elements.some(
				(element) => element.name.text === "defineManifestContract",
			),
	);
	const bypassesManifest = sourceFile.statements.some(
		(statement) =>
			ts.isImportDeclaration(statement) &&
			statement.importClause?.namedBindings &&
			ts.isNamedImports(statement.importClause.namedBindings) &&
			statement.importClause.namedBindings.elements.some(
				(element) => element.name.text === "defineComponentContract",
			),
	);
	if (!importsManifestFactory || bypassesManifest || callsLowLevelFactory) {
		throw new Error(`${fileName} must use only defineManifestContract.`);
	}

	const definitions: ContractSourceFact[] = [];
	for (const statement of sourceFile.statements) {
		if (
			!(
				ts.isVariableStatement(statement) &&
				statement.modifiers?.some(
					(modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
				)
			)
		) {
			continue;
		}
		for (const declaration of statement.declarationList.declarations) {
			if (
				!(
					ts.isIdentifier(declaration.name) &&
					declaration.initializer &&
					ts.isCallExpression(declaration.initializer) &&
					ts.isIdentifier(declaration.initializer.expression)
				) ||
				declaration.initializer.expression.text !== "defineManifestContract"
			) {
				continue;
			}
			const [argument] = declaration.initializer.arguments;
			if (!(argument && ts.isObjectLiteralExpression(argument))) {
				continue;
			}
			const values = new Map<string, string>();
			for (const property of argument.properties) {
				if (
					ts.isPropertyAssignment(property) &&
					ts.isIdentifier(property.name) &&
					ts.isStringLiteral(property.initializer)
				) {
					values.set(property.name.text, property.initializer.text);
				}
			}
			definitions.push({
				component: values.get("component") ?? "",
				exportName: declaration.name.text,
				fileName,
				id: values.get("id") ?? "",
			});
		}
	}
	if (definitions.length !== 1) {
		throw new Error(
			`${fileName} must export exactly one defineManifestContract definition.`,
		);
	}
	const [definition] = definitions;
	if (!(definition?.id && definition.component)) {
		throw new Error(
			`${fileName} must declare literal id and component values.`,
		);
	}
	return definition;
}

function internalContractExports(source: string): string[] {
	const sourceFile = parseTypeScript(source, "contracts/index.ts");
	return sourceFile.statements.flatMap((statement) => {
		if (
			!(
				ts.isExportDeclaration(statement) &&
				statement.moduleSpecifier &&
				ts.isStringLiteral(statement.moduleSpecifier)
			)
		) {
			return [];
		}
		return [statement.moduleSpecifier.text];
	});
}

function exportedNames(source: string, fileName: string): string[] {
	const sourceFile = ts.createSourceFile(
		fileName,
		source,
		ts.ScriptTarget.Latest,
		true,
		fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	const names = new Set<string>();
	for (const statement of sourceFile.statements) {
		if (
			ts.isExportDeclaration(statement) &&
			statement.exportClause &&
			ts.isNamedExports(statement.exportClause)
		) {
			for (const element of statement.exportClause.elements) {
				names.add(element.name.text);
			}
			continue;
		}
		const exported = statement.modifiers?.some(
			(modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
		);
		if (!exported) {
			continue;
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					names.add(declaration.name.text);
				}
			}
			continue;
		}
		if (
			(ts.isFunctionDeclaration(statement) ||
				ts.isClassDeclaration(statement) ||
				ts.isInterfaceDeclaration(statement) ||
				ts.isTypeAliasDeclaration(statement) ||
				ts.isEnumDeclaration(statement)) &&
			statement.name
		) {
			names.add(statement.name.text);
		}
	}
	return [...names].sort();
}

function sourceFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const absolutePath = path.join(directory, entry.name);
		if (entry.isDirectory()) {
			if (
				[".next", "__tests__", "node_modules", "testing"].includes(entry.name)
			) {
				return [];
			}
			return sourceFiles(absolutePath);
		}
		return entry.isFile() && /\.tsx?$/.test(entry.name) ? [absolutePath] : [];
	});
}

function topLevelDeclarationNames(source: string, fileName: string): string[] {
	const sourceFile = ts.createSourceFile(
		fileName,
		source,
		ts.ScriptTarget.Latest,
		true,
		fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	const names = new Set<string>();
	for (const statement of sourceFile.statements) {
		if (
			(ts.isFunctionDeclaration(statement) ||
				ts.isClassDeclaration(statement)) &&
			statement.name
		) {
			names.add(statement.name.text);
			continue;
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					names.add(declaration.name.text);
				}
			}
		}
	}
	return [...names].sort();
}

function consumerDeclarationSnapshot(): Readonly<
	Record<string, readonly string[]>
> {
	const repositoryRoot = path.resolve(packageRoot, "../../..");
	const featureRoot = path.join(repositoryRoot, "apps/web");
	return Object.fromEntries(
		sourceFiles(featureRoot)
			.sort((left, right) => left.localeCompare(right))
			.map((absolutePath) => {
				const relativePath = path
					.relative(repositoryRoot, absolutePath)
					.replaceAll(path.sep, "/");
				return [
					relativePath,
					topLevelDeclarationNames(
						readFileSync(absolutePath, "utf8"),
						relativePath,
					),
				] as const;
			}),
	);
}

function repositorySnapshot(): UiRepositorySnapshot {
	const componentDirectory = path.join(packageRoot, "src/components/ui");
	const sourceNames = readdirSync(componentDirectory)
		.filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
		.sort();
	const componentSources: Record<string, string> = {};
	const exportsBySource: Record<string, readonly string[]> = {};
	for (const name of sourceNames) {
		const relativePath = `src/components/ui/${name}`;
		const source = readFileSync(path.join(componentDirectory, name), "utf8");
		componentSources[relativePath] = source;
		exportsBySource[relativePath] = exportedNames(source, name);
	}
	for (const component of UI_SYSTEM_CATALOG.components) {
		if (componentSources[component.sourceModule] !== undefined) {
			continue;
		}
		const source = readFileSync(
			path.join(packageRoot, component.sourceModule),
			"utf8",
		);
		componentSources[component.sourceModule] = source;
		exportsBySource[component.sourceModule] = exportedNames(
			source,
			path.basename(component.sourceModule),
		);
	}
	const packageSource = readFileSync(
		path.join(packageRoot, "package.json"),
		"utf8",
	);
	const packageExportKeys = [
		...packageSource.matchAll(/^\t\t"(\.\/?[^"]*)":/gm),
	].map((match) => match[1] ?? "");
	return {
		componentSources,
		consumerDeclarationsBySource: consumerDeclarationSnapshot(),
		exportsBySource,
		barrelSource: readFileSync(path.join(packageRoot, "src/index.ts"), "utf8"),
		packageExportKeys,
		tokenCss: readFileSync(
			path.join(packageRoot, "src/styles/tokens.css"),
			"utf8",
		),
		erpModuleIds: readdirSync(path.resolve(packageRoot, "../../erp"), {
			withFileTypes: true,
		})
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name),
		evidencePaths: readdirSync(path.join(packageRoot, "__tests__"))
			.filter((name) => name.endsWith(".test.ts") || name.endsWith(".test.tsx"))
			.map((name) => `__tests__/${name}`),
	};
}

describe("UI system metadata contract", () => {
	it("authors contracts through the versioned manifest and freezes normalized output", () => {
		const contract = defineManifestContract({
			id: "ui.example.contract",
			component: "ui.example",
			purpose: "  Preserves   punctuation!  ",
			ownership: {
				componentOwns: ["  Primitive   presentation. "],
				consumerOwns: [" Feature policy. "],
			},
			semanticBoundaries: [" Presentation does not decide policy. "],
			approvedVariants: {
				default: {
					meaning: " Default treatment. ",
					allowedWhen: [" Ordinary   presentation. "],
				},
			},
			approvedSizes: {
				sm: {
					meaning: " Compact treatment. ",
					allowedWhen: [" Dense presentation. "],
				},
			},
			rules: [" First   rule. ", " Second rule! "],
			accessibility: [" Preserve semantics. "],
			prohibitedUsage: [" Do not infer authority. "],
		});

		expect(contract.standard).toBe(UI_COMPONENT_CONTRACT_STANDARD);
		expectTypeOf<
			keyof NonNullable<typeof contract.approvedVariants>
		>().toEqualTypeOf<"default">();
		expectTypeOf<
			keyof NonNullable<typeof contract.approvedSizes>
		>().toEqualTypeOf<"sm">();
		expect(contract.purpose).toBe("Preserves punctuation!");
		expect(contract.rules).toEqual(["First rule.", "Second rule!"]);
		expect(Object.isFrozen(contract)).toBe(true);
		expect(Object.isFrozen(contract.ownership)).toBe(true);
		expect(Object.isFrozen(contract.ownership.componentOwns)).toBe(true);
		expect(Object.isFrozen(contract.approvedVariants)).toBe(true);
		expect(Object.isFrozen(contract.approvedVariants?.default)).toBe(true);
		expect(
			Object.isFrozen(contract.approvedVariants?.default?.allowedWhen),
		).toBe(true);
		expect(Object.isFrozen(contract.rules)).toBe(true);
	});

	it("derives governance identity from contracts and rejects registry drift", () => {
		const contract = defineManifestContract({
			id: "ui.registry-fixture.contract",
			component: "ui.registry-fixture",
			purpose: "Prove canonical governance registration.",
			ownership: {
				componentOwns: ["Reusable presentation."],
				consumerOwns: ["Domain policy."],
			},
			semanticBoundaries: ["Presentation does not imply authority."],
			rules: ["Consume through the registered capability."],
			accessibility: ["Preserve native semantics."],
			prohibitedUsage: ["Do not duplicate registry identity."],
		});
		const registry = defineComponentGovernanceRegistry([contract], {
			"ui.registry-fixture": { lifecycle: "approved" },
		});

		expect(registry).toEqual({
			"ui.registry-fixture": { contract, lifecycle: "approved" },
		});
		expect(Object.isFrozen(registry)).toBe(true);
		expect(Object.isFrozen(registry["ui.registry-fixture"])).toBe(true);
		expect(() =>
			defineComponentGovernanceRegistry([contract, contract]),
		).toThrow(
			"Duplicate component governance registration: ui.registry-fixture",
		);
		expect(() =>
			defineComponentGovernanceRegistry([contract], {
				"ui.unregistered-fixture": { lifecycle: "approved" },
			}),
		).toThrow(
			"Governance override references an unregistered component: ui.unregistered-fixture",
		);
	});

	it("rejects empty and normalized duplicate clauses at the authoring gateway", () => {
		const defineWithRules = (rules: readonly [string, ...string[]]) =>
			defineManifestContract({
				id: "ui.example.contract",
				component: "ui.example",
				purpose: "Example contract.",
				ownership: {
					componentOwns: ["Primitive presentation."],
					consumerOwns: ["Feature policy."],
				},
				semanticBoundaries: ["Presentation does not decide policy."],
				rules,
				accessibility: ["Preserve semantics."],
				prohibitedUsage: ["Do not infer authority."],
			});

		expect(() => defineWithRules(["   "])).toThrow(
			"Component contract clauses must not be empty.",
		);
		expect(() =>
			defineWithRules([
				"Feature code owns authorization.",
				" Feature   code owns authorization. ",
			]),
		).toThrow(
			'Duplicate component contract clause: "Feature code owns authorization."',
		);
	});

	it("keeps every authored contract registered internally and out of the public barrel", () => {
		const contractFiles = readdirSync(contractDirectory)
			.filter(
				(name) =>
					name.endsWith(".contract.ts") && name !== "manifest.contract.ts",
			)
			.sort();
		const facts = contractFiles.map((fileName) =>
			contractSourceFact(
				readFileSync(path.join(contractDirectory, fileName), "utf8"),
				fileName,
			),
		);
		const expectedInternalModules = contractFiles.map(
			(fileName) => `./${fileName.replace(/\.ts$/, "")}`,
		);
		const internalModules = internalContractExports(
			readFileSync(path.join(contractDirectory, "index.ts"), "utf8"),
		).sort((left, right) => left.localeCompare(right));
		const catalogContracts = UI_SYSTEM_CATALOG.components.flatMap(
			(component) =>
				component.governance?.contract ? [component.governance.contract] : [],
		);
		const publicBarrel = readFileSync(
			path.join(packageRoot, "src/index.ts"),
			"utf8",
		);

		expect(internalModules).toEqual(expectedInternalModules.sort());
		expect(facts.map((fact) => fact.id).sort()).toEqual(
			catalogContracts.map((contract) => contract.id).sort(),
		);
		expect(facts.map((fact) => fact.component).sort()).toEqual(
			UI_SYSTEM_CATALOG.components.map((component) => component.id).sort(),
		);
		expect(new Set(catalogContracts.map((contract) => contract.id)).size).toBe(
			catalogContracts.length,
		);
		for (const fact of facts) {
			expect(fact.id).toBe(`${fact.component}.contract`);
			expect(publicBarrel).not.toContain(fact.exportName);
		}
		expect(publicBarrel).not.toMatch(/metadata\/contracts?|manifest\.contract/);
	});

	it("keeps the locked ERP baseline synchronized with source, exports, evidence, modules, and tokens", () => {
		expect(validateUiCatalog(UI_SYSTEM_CATALOG, repositorySnapshot())).toEqual(
			[],
		);
	});

	it("rejects feature-local declarations that shadow a contract-owned capability", () => {
		const snapshot = repositorySnapshot();
		const source = "apps/web/features/example/editor.tsx";
		const issues = validateUiCatalog(UI_SYSTEM_CATALOG, {
			...snapshot,
			consumerDeclarationsBySource: {
				...snapshot.consumerDeclarationsBySource,
				[source]: ["FormField"],
			},
		});

		expect(issues).toContainEqual({
			kind: "consumer-drift",
			message: `${source} declares local FormField; consume the canonical ui.form-field capability instead`,
		});
	});

	it("keeps component governance synchronized with catalog variants and sizes", () => {
		expect(validateGovernance(UI_SYSTEM_CATALOG.components)).toEqual({
			ok: true,
			diagnostics: [],
		});
	});

	it("derives candidate lifecycle from name-based governance without duplicating profile evidence", () => {
		const alert = UI_SYSTEM_CATALOG.components.find(
			(entry) => entry.id === "ui.alert",
		);
		const accordion = UI_SYSTEM_CATALOG.components.find(
			(entry) => entry.id === "ui.accordion",
		);
		if (!(alert && accordion)) {
			throw new Error("Component metadata is missing.");
		}

		expect(alert.lifecycle).toBe("candidate");
		expect(alert.governance).toMatchObject({
			lifecycle: "candidate",
			contract: {
				id: "ui.alert.contract",
				component: "ui.alert",
			},
		});
		expect(alert.governance?.evidence).toBeUndefined();
		expect(alert.evidence.length).toBeGreaterThan(0);
		expect(accordion.lifecycle).toBe("candidate");
		expect(accordion.governance).toMatchObject({
			lifecycle: "candidate",
			contract: {
				id: "ui.accordion.contract",
				component: "ui.accordion",
			},
		});
		expect(accordion.governance?.evidence).toBeUndefined();
	});

	it("resolves every verified lifecycle claim to canonical repository evidence", () => {
		const verifiedComponentIds = [
			"ui.button",
			"ui.card",
			"ui.form-field",
			"ui.page-header",
			"ui.workspace-page",
			"ui.data-table",
			"ui.app-shell",
			"ui.chart",
		] as const;
		const requiredKinds = [
			"contract",
			"storybook",
			"unit",
			"interaction",
			"accessibility",
			"responsive",
			"visual",
			"contrast",
			"consumer",
		] as const;

		for (const componentId of verifiedComponentIds) {
			const component = UI_SYSTEM_CATALOG.components.find(
				(entry) => entry.id === componentId,
			);
			if (!component?.governance?.evidence) {
				throw new Error(`${componentId} verified evidence is missing.`);
			}

			expect(component.lifecycle).toBe("verified");
			expect(component.governance.lifecycle).toBe("verified");
			const kinds = new Set(
				component.governance.evidence.map(({ kind }) => kind),
			);
			for (const requiredKind of requiredKinds) {
				expect(
					kinds.has(requiredKind),
					`${componentId} lacks ${requiredKind}`,
				).toBe(true);
			}

			for (const evidence of component.governance.evidence) {
				const evidencePath = path.resolve(workspaceRoot, evidence.file);
				expect(existsSync(evidencePath), evidence.file).toBe(true);
				if (path.extname(evidencePath) === ".png") {
					expect(path.basename(evidencePath)).toBe(evidence.target);
					continue;
				}
				expect(readFileSync(evidencePath, "utf8"), evidence.file).toContain(
					evidence.target,
				);
			}
		}
	});

	it("promotes Storybook-integrated contracts to approved governance", () => {
		const approvedComponentIds = [
			"ui.slider",
			"ui.sonner",
			"ui.spinner",
			"ui.status-badge",
			"ui.stepper",
		] as const;

		for (const componentId of approvedComponentIds) {
			const component = UI_SYSTEM_CATALOG.components.find(
				(entry) => entry.id === componentId,
			);
			if (!component) {
				throw new Error(`${componentId} metadata is missing.`);
			}

			expect(component.lifecycle).toBe("approved");
			expect(component.governance).toMatchObject({
				lifecycle: "approved",
				contract: {
					id: `${componentId}.contract`,
					component: componentId,
				},
			});
		}
	});

	it("detects governance contract drift", () => {
		const component = UI_SYSTEM_CATALOG.components.find(
			(entry) => entry.id === "ui.button",
		);
		if (!component) {
			throw new Error("ui.button metadata is missing.");
		}

		const drifted = {
			...component,
			variants: ["default", "unknown"],
			sizes: ["default", "huge"],
		} satisfies GovernedCatalogComponent;

		const result = validateGovernance([drifted]);
		expect(result.ok).toBe(false);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
			expect.arrayContaining([
				"missing_variant",
				"unexpected_variant",
				"missing_size",
				"unexpected_size",
			]),
		);
	});

	it("detects duplicate and incomplete component-specific evidence", () => {
		const component = UI_SYSTEM_CATALOG.components.find(
			(entry) => entry.id === "ui.button",
		);
		if (!component?.governance) {
			throw new Error("ui.button governance is missing.");
		}

		const result = validateGovernance([
			{
				...component,
				governance: {
					...component.governance,
					evidence: [
						{
							kind: "interaction",
							file: "__tests__/button.test.tsx",
							target: "Button interaction",
						},
						{
							kind: "interaction",
							file: "__tests__/button.test.tsx",
							target: "Button interaction",
						},
						{
							kind: "unit",
							file: "",
							target: "",
						},
					],
				},
			},
		]);
		expect(result.ok).toBe(false);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
			expect.arrayContaining(["unexpected_evidence", "invalid_evidence"]),
		);
	});

	it("permits the same clause in different semantic sections", () => {
		const component = UI_SYSTEM_CATALOG.components.find(
			(entry) => entry.id === "ui.button",
		);
		if (!component?.governance?.contract) {
			throw new Error("ui.button governance is missing.");
		}

		const drifted = structuredClone(component);
		const contract = drifted.governance?.contract;
		if (!contract) {
			throw new Error("Cloned ui.button contract is missing.");
		}
		Reflect.set(contract, "rules", ["Shared contextual clause."]);
		Reflect.set(contract, "accessibility", ["Shared contextual clause."]);

		const result = validateGovernance([drifted]);
		expect(
			result.diagnostics.filter(
				(diagnostic) => diagnostic.code === "duplicate_contract_clause",
			),
		).toEqual([]);
	});

	it("rejects malformed canonical contract sections at runtime", () => {
		const component = UI_SYSTEM_CATALOG.components.find(
			(entry) => entry.id === "ui.button",
		);
		if (!component?.governance?.contract) {
			throw new Error("ui.button governance contract is missing.");
		}

		const drifted = structuredClone(component);
		const contract = drifted.governance?.contract;
		if (!contract) {
			throw new Error("Cloned ui.button contract is missing.");
		}
		Reflect.set(contract, "standard", "afenda.ui-component-contract/v0");
		Reflect.set(contract, "ownership", {
			componentOwns: [],
			consumerOwns: ["   "],
		});
		Reflect.set(contract, "semanticBoundaries", []);
		Reflect.set(contract, "rules", [
			"Preserve native button semantics.",
			" Preserve   native button semantics. ",
			"   ",
		]);

		const result = validateGovernance([drifted]);
		expect(result.ok).toBe(false);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
			expect.arrayContaining([
				"invalid_contract_standard",
				"missing_contract_ownership",
				"missing_semantic_boundary",
				"invalid_contract_clause",
				"duplicate_contract_clause",
			]),
		);
	});

	it("rejects duplicate clauses only within an individual usage-rule section", () => {
		const component = UI_SYSTEM_CATALOG.components.find(
			(entry) => entry.id === "ui.button",
		);
		if (!component?.governance?.contract) {
			throw new Error("ui.button governance contract is missing.");
		}

		const drifted = structuredClone(component);
		const contract = drifted.governance?.contract;
		if (!contract) {
			throw new Error("Cloned ui.button contract is missing.");
		}
		Reflect.set(contract, "approvedVariants", {
			default: {
				meaning: "Default action.",
				allowedWhen: ["Ordinary action.", " Ordinary   action. "],
				prohibitedWhen: ["Shared contextual clause."],
			},
		});
		Reflect.set(contract, "rules", ["Shared contextual clause."]);

		const result = validateGovernance([drifted]);
		expect(
			result.diagnostics.filter(
				(diagnostic) => diagnostic.code === "duplicate_contract_clause",
			),
		).toHaveLength(1);
	});

	it("requires every explicit evidence kind before verified governance", () => {
		const component = UI_SYSTEM_CATALOG.components.find(
			(entry) => entry.id === "ui.button",
		);
		if (!component?.governance) {
			throw new Error("ui.button governance is missing.");
		}

		const result = validateGovernance([
			{
				...component,
				lifecycle: "verified",
				governance: {
					...component.governance,
					lifecycle: "verified",
					evidence: [
						{
							kind: "interaction",
							file: "__tests__/button.interaction.test.tsx",
							target: "Button interaction",
						},
					],
				},
			},
		]);

		expect(result.ok).toBe(false);
		expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
			expect.arrayContaining(["missing_evidence"]),
		);
	});

	it("requires deprecated components to declare deprecatedBy", () => {
		const component = UI_SYSTEM_CATALOG.components.find(
			(entry) => entry.id === "ui.badge",
		);
		if (!component) {
			throw new Error("Governance fixture metadata is missing.");
		}

		const result = validateGovernance([
			{
				...component,
				lifecycle: "deprecated",
				governance: {
					lifecycle: "deprecated",
				},
			},
		]);

		expect(result.ok).toBe(false);
		expect(result.diagnostics).toContainEqual({
			severity: "error",
			code: "missing_deprecation_replacement",
			component: "ui.badge",
			message: "Deprecated components must declare deprecatedBy.",
		});
	});

	it("detects an uncataloged component source", () => {
		const snapshot = repositorySnapshot();
		const issues = validateUiCatalog(UI_SYSTEM_CATALOG, {
			...snapshot,
			componentSources: {
				...snapshot.componentSources,
				"src/components/ui/drift.tsx": "export function Drift() {}",
			},
			exportsBySource: {
				...snapshot.exportsBySource,
				"src/components/ui/drift.tsx": ["Drift"],
			},
		});
		expect(issues).toContainEqual({
			kind: "component-drift",
			message: "Component source is not cataloged: src/components/ui/drift.tsx",
		});
	});

	it("detects package subpath export drift", () => {
		const snapshot = repositorySnapshot();
		const issues = validateUiCatalog(UI_SYSTEM_CATALOG, {
			...snapshot,
			packageExportKeys: [...snapshot.packageExportKeys, "./metadata"],
		});
		expect(issues.some((issue) => issue.kind === "export-drift")).toBe(true);
	});
});

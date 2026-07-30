import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { createStorybookEvidence } from "../.storybook/storybook-evidence";
import { CVA_COVERAGE } from "../src/stories/coverage";

const appRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const uiRoot = path.resolve(appRoot, "../../packages/surfaces/ui-system");
const componentRoot = path.join(uiRoot, "src/components/ui");
const publicBarrel = path.join(uiRoot, "src/index.ts");
const storyRoot = path.join(appRoot, "src/stories");
const interactiveComponents = [
	"accordion",
	"alert-dialog",
	"checkbox",
	"collapsible",
	"combobox",
	"column-visibility-menu",
	"context-menu",
	"dialog",
	"dropdown-menu",
	"drawer",
	"file-upload",
	"menubar",
	"popover",
	"select",
	"saved-view-select",
	"search-field",
	"sheet",
	"switch",
	"tabs",
	"toggle",
	"tooltip",
	"tree-view",
] as const;
const benchmarkComponents = [
	"badge",
	"button",
	"card",
	"data-table",
	"form-field",
	"input",
	"metric-card",
	"page-header",
	"status-badge",
] as const;
const benchmarkPlayComponents = [
	"button",
	"data-table",
	"form-field",
	"input",
] as const;
const standardBenchmarkExports = [
	"Overview",
	"Usage",
	"StatesAndAccessibility",
	"Composition",
	"DoAndDoNot",
] as const;
const cardStoryExports = [
	"Overview",
	"SemanticUsage",
	"AdaptiveLayout",
	"StatesAndAccessibility",
	"Composition",
	"DoAndDoNot",
] as const;
const dataTableStoryExports = [
	"Overview",
	"SemanticUsage",
	"ControlledUsage",
	"AuthorizationAndEligibility",
	"AdaptiveLayout",
	"VariantsAndSizes",
	"StatesAndAccessibility",
	"EmptyAndFilteredStates",
	"Composition",
	"DoAndDoNot",
] as const;
const buttonStoryExports = [
	"Composition",
	"DoAndDoNot",
	"Navigation",
	"Overview",
	"SemanticUsage",
	"Sizes",
	"StatesAndAccessibility",
	"Variants",
] as const;
const statusBadgeStoryExports = [
	"Composition",
	"DoAndDoNot",
	"Overview",
	"Usage",
	"Sizes",
	"StatesAndAccessibility",
	"Variants",
] as const;
const benchmarkStoryExportOverrides: Partial<
	Record<(typeof benchmarkComponents)[number], readonly string[]>
> = {
	button: buttonStoryExports,
	card: cardStoryExports,
	"data-table": dataTableStoryExports,
	"status-badge": statusBadgeStoryExports,
};
const foundationStories: ReadonlySet<string> = new Set(["app-shell", "tokens"]);

function moduleNames(directory: string, suffix: string): string[] {
	return fs
		.readdirSync(directory)
		.filter((file) => file.endsWith(suffix))
		.map((file) => file.slice(0, -suffix.length))
		.sort();
}

function publicComponentNames(): string[] {
	const barrel = fs.readFileSync(publicBarrel, "utf8");
	return [...barrel.matchAll(/from "\.\/components\/ui\/([^"/]+)"/g)]
		.map((match) => match[1])
		.filter((component): component is string => Boolean(component))
		.filter((component) => component !== "sidebar-cookie")
		.sort();
}

function propertyName(node: ts.PropertyName, source: ts.SourceFile): string {
	if (ts.isIdentifier(node) || ts.isStringLiteral(node)) {
		return node.text;
	}
	return node.getText(source).replaceAll('"', "");
}

function cvaAxes(file: string): Record<string, string[]> {
	const sourceText = fs.readFileSync(file, "utf8");
	const source = ts.createSourceFile(
		file,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const result: Record<string, string[]> = {};

	function visit(node: ts.Node): void {
		if (
			ts.isCallExpression(node) &&
			node.expression.getText(source) === "cva"
		) {
			const config = node.arguments.find(ts.isObjectLiteralExpression);
			const variants = config?.properties.find(
				(property) =>
					property.name && propertyName(property.name, source) === "variants",
			);
			if (
				variants &&
				ts.isPropertyAssignment(variants) &&
				ts.isObjectLiteralExpression(variants.initializer)
			) {
				for (const axis of variants.initializer.properties) {
					if (
						axis.name &&
						ts.isPropertyAssignment(axis) &&
						ts.isObjectLiteralExpression(axis.initializer)
					) {
						result[propertyName(axis.name, source)] =
							axis.initializer.properties
								.filter((option) => option.name)
								.map((option) =>
									propertyName(option.name as ts.PropertyName, source),
								);
					}
				}
			}
		}
		ts.forEachChild(node, visit);
	}

	visit(source);
	return result;
}

function sourceFile(file: string): ts.SourceFile {
	return ts.createSourceFile(
		file,
		fs.readFileSync(file, "utf8"),
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
}

function hasExportModifier(node: ts.Node): boolean {
	return Boolean(
		ts.canHaveModifiers(node) &&
			ts
				.getModifiers(node)
				?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
	);
}

function exportedStoryInitializers(
	source: ts.SourceFile,
): ReadonlyMap<string, ts.ObjectLiteralExpression> {
	const stories = new Map<string, ts.ObjectLiteralExpression>();
	for (const statement of source.statements) {
		if (!(ts.isVariableStatement(statement) && hasExportModifier(statement))) {
			continue;
		}
		for (const declaration of statement.declarationList.declarations) {
			if (
				ts.isIdentifier(declaration.name) &&
				declaration.initializer &&
				ts.isObjectLiteralExpression(declaration.initializer)
			) {
				stories.set(declaration.name.text, declaration.initializer);
			}
		}
	}
	return stories;
}

function namedExportNames(source: ts.SourceFile): readonly string[] {
	const names: string[] = [];
	for (const statement of source.statements) {
		if (!hasExportModifier(statement)) {
			continue;
		}
		if (ts.isVariableStatement(statement)) {
			for (const declaration of statement.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					names.push(declaration.name.text);
				}
			}
		} else if (
			(ts.isFunctionDeclaration(statement) ||
				ts.isClassDeclaration(statement) ||
				ts.isInterfaceDeclaration(statement) ||
				ts.isTypeAliasDeclaration(statement) ||
				ts.isEnumDeclaration(statement)) &&
			statement.name
		) {
			names.push(statement.name.text);
		}
	}
	return names.sort((left, right) => left.localeCompare(right));
}

function objectProperty(
	object: ts.ObjectLiteralExpression,
	name: string,
): ts.PropertyAssignment | undefined {
	return object.properties.find(
		(property): property is ts.PropertyAssignment =>
			ts.isPropertyAssignment(property) &&
			propertyName(property.name, object.getSourceFile()) === name,
	);
}

function stringArrayProperty(
	object: ts.ObjectLiteralExpression,
	name: string,
): readonly string[] {
	const property = objectProperty(object, name);
	if (!(property && ts.isArrayLiteralExpression(property.initializer))) {
		return [];
	}
	return property.initializer.elements
		.filter(ts.isStringLiteral)
		.map((element) => element.text);
}

function stringProperty(
	object: ts.ObjectLiteralExpression,
	name: string,
): string | undefined {
	const property = objectProperty(object, name);
	return property && ts.isStringLiteral(property.initializer)
		? property.initializer.text
		: undefined;
}

function buttonAxisValues(
	story: ts.ObjectLiteralExpression,
	axis: "variant" | "size",
): readonly string[] {
	const values = new Set<string>();
	function visit(node: ts.Node): void {
		if (
			(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
			node.tagName.getText() === "Button"
		) {
			const attribute = node.attributes.properties.find(
				(property): property is ts.JsxAttribute =>
					ts.isJsxAttribute(property) && property.name.getText() === axis,
			);
			if (!attribute) {
				values.add("default");
			} else if (
				attribute.initializer &&
				ts.isStringLiteral(attribute.initializer)
			) {
				values.add(attribute.initializer.text);
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(story);
	return [...values].sort();
}

function containsJsxAttribute(
	story: ts.ObjectLiteralExpression,
	tagName: string,
	attributeName: string,
	value?: string,
): boolean {
	let found = false;
	function visit(node: ts.Node): void {
		if (
			(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
			node.tagName.getText() === tagName
		) {
			const attribute = node.attributes.properties.find(
				(property): property is ts.JsxAttribute =>
					ts.isJsxAttribute(property) &&
					property.name.getText() === attributeName,
			);
			if (
				attribute &&
				(value === undefined ||
					(attribute.initializer &&
						ts.isStringLiteral(attribute.initializer) &&
						attribute.initializer.text === value))
			) {
				found = true;
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(story);
	return found;
}

describe("Storybook UI-system coverage", () => {
	it("has one CSF3 suite for every current component module", () => {
		const components = publicComponentNames();
		const allStories = moduleNames(storyRoot, ".stories.tsx");
		const stories = allStories.filter((story) => !foundationStories.has(story));

		expect(components).toHaveLength(73);
		expect(stories).toEqual(components);
		expect(allStories).toEqual(expect.arrayContaining([...foundationStories]));
	});

	it("keeps every suite flat under the UI System root", () => {
		const titles = moduleNames(storyRoot, ".stories.tsx").map((story) => {
			const text = fs.readFileSync(
				path.join(storyRoot, `${story}.stories.tsx`),
				"utf8",
			);
			const title = text.match(/title:\s*"(UI System\/[^"]+)"/)?.[1];
			if (!title) {
				throw new Error(`Missing UI System title for ${story}.`);
			}
			expect(title.split("/")).toHaveLength(2);
			return title;
		});

		expect(new Set(titles).size).toBe(titles.length);
	});

	it("uses the public UI-system barrel and required story tags", () => {
		for (const story of moduleNames(storyRoot, ".stories.tsx")) {
			const text = fs.readFileSync(
				path.join(storyRoot, `${story}.stories.tsx`),
				"utf8",
			);
			expect(text).toContain('from "@afenda/ui-system"');
			expect(text).not.toMatch(/@afenda\/ui-system\//);
			expect(text).toContain('tags: ["autodocs", "test"');
			expect(text).toContain("satisfies Meta<");
		}
	});

	it("matches the live ERP typography and page-density contract", () => {
		const stylesheet = fs.readFileSync(
			path.join(appRoot, "src/storybook.css"),
			"utf8",
		);
		const preview = fs.readFileSync(
			path.join(appRoot, ".storybook/preview.tsx"),
			"utf8",
		);
		const evidenceConnector = fs.readFileSync(
			path.join(appRoot, ".storybook/storybook-evidence.ts"),
			"utf8",
		);
		const packageJson = fs.readFileSync(
			path.join(appRoot, "package.json"),
			"utf8",
		);
		const contractDocs = fs.readFileSync(
			path.join(storyRoot, "contract-docs.tsx"),
			"utf8",
		);
		const tokens = fs.readFileSync(
			path.join(storyRoot, "tokens.stories.tsx"),
			"utf8",
		);
		const importOrder = [
			'@import "tailwindcss"',
			'@import "tw-animate-css"',
			'@import "@afenda/ui-system/styles.css"',
			'@import "@afenda/ui-system/base.css"',
			'@import "@fontsource-variable/geist/wght.css"',
			'@import "@fontsource-variable/geist-mono/wght.css"',
		].map((rule) => stylesheet.indexOf(rule));
		expect(importOrder.every((index) => index >= 0)).toBe(true);
		expect(importOrder).toEqual(
			[...importOrder].sort((left, right) => left - right),
		);
		expect(stylesheet).toContain(
			'@import "@fontsource-variable/geist/wght.css"',
		);
		expect(stylesheet).toContain(
			'@import "@fontsource-variable/geist-mono/wght.css"',
		);
		expect(stylesheet).toContain(
			'--font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif',
		);
		expect(stylesheet).toContain(
			'--font-mono: "Geist Mono Variable", ui-monospace, monospace',
		);
		expect(stylesheet).not.toContain("Inter Variable");
		expect(packageJson).not.toContain("@fontsource-variable/inter");

		expect(preview).toContain('layout: "fullscreen"');
		expect(preview).toContain("min-h-screen bg-background p-6 font-sans");
		expect(preview).toContain(
			'documentElement.classList.remove("light", "dark")',
		);
		expect(preview).toContain("documentElement.classList.add(theme)");
		expect(preview).toContain("return () =>");
		expect(preview).toContain("initialGlobals");
		expect(preview).not.toContain("argTypesRegex");
		expect(preview).not.toContain("data-theme");
		expect(preview).not.toContain('layout: "centered"');
		expect(evidenceConnector).toContain("maxBuffer: 4 * 1024 * 1024");
		expect(packageJson).toContain("tsc -p .storybook/tsconfig.loader.json");
		for (const storyFile of [
			"data-table.stories.tsx",
			"page-header.stories.tsx",
			"tokens.stories.tsx",
		]) {
			const story = fs.readFileSync(path.join(storyRoot, storyFile), "utf8");
			expect(story).not.toContain("layout:");
		}

		expect(contractDocs).toContain("font-semibold text-2xl tracking-tight");
		expect(contractDocs).toContain("font-medium text-lg");
		expect(contractDocs).not.toContain("font-semibold text-xl");
		expect(contractDocs).toContain('<Section title="Public API">');
		expect(contractDocs).toContain('<Section title="Required states">');
		expect(contractDocs).toContain("<Unstyled>");
		expect(contractDocs).toContain("afenda-contract-docs");
		expect(contractDocs).toContain("afenda-contract-api-table overflow-x-auto");
		expect(contractDocs).toContain("<section");
		expect(contractDocs).toContain("keyboardScrollableRegionProps");
		expect(contractDocs).toContain("tabIndex: 0");
		expect(contractDocs).not.toContain("<ArgTypes />");
		expect(contractDocs).not.toContain('title="Props reference"');
		expect(contractDocs).toContain("<Source code={publicImport}");
		expect(contractDocs).toContain("export function contractDocsParameters");
		expect(contractDocs).toContain(
			"page: () => <ContractDocsPage evidence={evidence} title={title} />",
		);
		expect(stylesheet).not.toContain(".afenda-docs");
		expect(stylesheet).not.toContain("border-color: var(--border)");
		expect(stylesheet).not.toContain("background: var(--background)");
		expect(stylesheet).toContain(
			".afenda-contract-docs table.docblock-argstable.sb-unstyled",
		);
		expect(stylesheet).toContain(
			".afenda-contract-docs > #approved-evidence-stories",
		);
		expect(stylesheet).toContain(".afenda-contract-docs > .sb-anchor > h3");
		expect(stylesheet).toContain(
			'.afenda-contract-api-table > [data-slot="table-container"]',
		);
		expect(tokens).toContain("font-semibold text-2xl tracking-tight");
		expect(tokens).not.toContain("font-bold text-3xl tracking-tight");
		const visualSpec = fs.readFileSync(
			path.join(appRoot, "visual-tests/storybook.visual.spec.ts"),
			"utf8",
		);
		expect(visualSpec).toContain("expect(stories).toHaveLength(74)");
		expect(visualSpec).toContain('"ui-system-drawer--overview"');
		expect(visualSpec).toContain('"ui-system-menubar--overview"');
		expect(visualSpec).toContain("ui-system-button--focus-visible-");
	});

	it("projects validated immutable contract evidence for every visual component", async () => {
		const evidence = await createStorybookEvidence();
		expect(Object.keys(evidence)).toHaveLength(73);
		expect(Object.isFrozen(evidence)).toBe(true);
		expect(evidence["ui.sidebar-cookie"]).toBeUndefined();
		for (const [componentId, entry] of Object.entries(evidence)) {
			expect(Object.isFrozen(entry)).toBe(true);
			expect(Object.isFrozen(entry.ownership)).toBe(true);
			expect(Object.isFrozen(entry.publicExports)).toBe(true);
			expect(Object.isFrozen(entry.ownership.componentOwns)).toBe(true);
			expect(Object.isFrozen(entry.ownership.consumerOwns)).toBe(true);
			expect(Object.isFrozen(entry.semanticBoundaries)).toBe(true);
			expect(Object.isFrozen(entry.approvedVariants)).toBe(true);
			expect(Object.isFrozen(entry.approvedSizes)).toBe(true);
			expect(Object.isFrozen(entry.rules)).toBe(true);
			expect(Object.isFrozen(entry.accessibility)).toBe(true);
			expect(Object.isFrozen(entry.prohibitedUsage)).toBe(true);
			expect(Object.isFrozen(entry.variants)).toBe(true);
			expect(Object.isFrozen(entry.sizes)).toBe(true);
			expect(Object.isFrozen(entry.requiredStates)).toBe(true);
			expect(Object.keys(entry).sort()).toEqual(
				[
					"accessibility",
					"approvedSizes",
					"approvedVariants",
					"componentId",
					"contractId",
					"family",
					"layer",
					"ownership",
					"prohibitedUsage",
					"publicExports",
					"purpose",
					"qualityProfile",
					"requiredStates",
					"rules",
					"semanticBoundaries",
					"sizes",
					"variants",
				].sort(),
			);
			expect(entry.componentId).toBe(componentId);
			expect(entry.contractId).toBe(`${componentId}.contract`);
			expect(entry.publicExports.length).toBeGreaterThan(0);
			expect(entry.purpose.trim()).not.toBe("");
			expect(entry.ownership.componentOwns.length).toBeGreaterThan(0);
			expect(entry.ownership.consumerOwns.length).toBeGreaterThan(0);
			expect(entry.semanticBoundaries.length).toBeGreaterThan(0);
			expect(entry.rules.length).toBeGreaterThan(0);
			expect(entry.accessibility.length).toBeGreaterThan(0);
			expect(entry.prohibitedUsage.length).toBeGreaterThan(0);
			for (const rule of [
				...Object.values(entry.approvedVariants),
				...Object.values(entry.approvedSizes),
			]) {
				expect(Object.isFrozen(rule)).toBe(true);
				expect(Object.isFrozen(rule.allowedWhen)).toBe(true);
				expect(Object.isFrozen(rule.prohibitedWhen)).toBe(true);
			}
		}

		const button = evidence["ui.button"];
		if (!button) {
			throw new Error("Missing Button contract evidence.");
		}
		expect(button.publicExports).toEqual(["Button", "buttonVariants"]);
		expect(Object.keys(button.approvedVariants).sort()).toEqual(
			[
				"default",
				"destructive",
				"ghost",
				"link",
				"outline",
				"secondary",
			].sort(),
		);
		expect(Object.keys(button.approvedSizes).sort()).toEqual(
			[
				"default",
				"icon",
				"icon-lg",
				"icon-sm",
				"icon-xs",
				"lg",
				"sm",
				"xs",
			].sort(),
		);
	});

	it("wires contractEvidence for every public component story", async () => {
		const evidence = await createStorybookEvidence();
		for (const component of publicComponentNames()) {
			const text = fs.readFileSync(
				path.join(storyRoot, `${component}.stories.tsx`),
				"utf8",
			);
			expect(text).toContain(`contractEvidence("ui.${component}")`);
			expect(evidence[`ui.${component}`]).toBeDefined();
			expect(text).toContain("contractDocsParameters(evidence,");
			expect(text).toContain('from "./contract-docs"');
			expect(text).not.toMatch(/\/metadata(?:\/|")/);
		}
	});

	it("enforces the Phase 1 evidence shape on benchmark suites only", async () => {
		const evidence = await createStorybookEvidence();
		for (const component of benchmarkComponents) {
			const text = fs.readFileSync(
				path.join(storyRoot, `${component}.stories.tsx`),
				"utf8",
			);
			const componentEvidence = evidence[`ui.${component}`];
			if (!componentEvidence) {
				throw new Error(`Missing evidence for ui.${component}.`);
			}

			expect(text).toContain(`contractEvidence("ui.${component}")`);
			const requiredExports =
				benchmarkStoryExportOverrides[component] ?? standardBenchmarkExports;
			for (const storyExport of requiredExports) {
				expect(text).toContain(`export const ${storyExport}`);
			}
			if (
				component !== "button" &&
				component !== "status-badge" &&
				(componentEvidence.variants.length > 0 ||
					componentEvidence.sizes.length > 0)
			) {
				expect(text).toContain("export const VariantsAndSizes");
			}
			expect(text).toMatch(/export const Overview[\s\S]*?tags: \["visual"\]/);
		}

		for (const component of benchmarkPlayComponents) {
			const text = fs.readFileSync(
				path.join(storyRoot, `${component}.stories.tsx`),
				"utf8",
			);
			expect(text).toMatch(
				/export const StatesAndAccessibility[\s\S]*?play: async/,
			);
		}
	});

	it("enforces the complete Button governance programme through syntax", async () => {
		const buttonFile = path.join(storyRoot, "button.stories.tsx");
		const source = sourceFile(buttonFile);
		const stories = exportedStoryInitializers(source);
		const evidence = (await createStorybookEvidence())["ui.button"];
		if (!evidence) {
			throw new Error("Missing Storybook evidence for ui.button.");
		}

		expect([...stories.keys()].sort()).toEqual([...buttonStoryExports]);
		expect(namedExportNames(source)).toEqual([...buttonStoryExports]);
		expect(source.text).toContain('contractEvidence("ui.button")');
		expect(source.text).toContain('title: "UI System/Button"');
		expect(source.text).not.toContain('from "./catalog"');
		expect(source.text).not.toContain('from "./interactions"');
		expect(source.text).not.toMatch(/@afenda\/ui-system\//);
		expect(source.text).not.toMatch(/\/metadata(?:\/|")/);
		expect(source.text).not.toMatch(/from "next\/(?:link|navigation)"/);

		const metaDeclaration = source.statements
			.filter(ts.isVariableStatement)
			.flatMap((statement) => [...statement.declarationList.declarations])
			.find(
				(declaration) =>
					ts.isIdentifier(declaration.name) && declaration.name.text === "meta",
			);
		if (
			!(
				metaDeclaration?.initializer &&
				ts.isSatisfiesExpression(metaDeclaration.initializer) &&
				ts.isObjectLiteralExpression(metaDeclaration.initializer.expression)
			)
		) {
			throw new Error(
				"Button story meta must use an object satisfies expression.",
			);
		}
		const metaTags = stringArrayProperty(
			metaDeclaration.initializer.expression,
			"tags",
		);
		const title = stringProperty(
			metaDeclaration.initializer.expression,
			"title",
		);
		expect(metaTags).toEqual(["autodocs", "test"]);
		expect(title).toBe("UI System/Button");

		for (const [name, story] of stories) {
			const storyTags = stringArrayProperty(story, "tags");
			const effectiveTags = new Set([...metaTags, ...storyTags]);
			expect(effectiveTags.has("test")).toBe(true);
			expect(effectiveTags.has("visual")).toBe(name === "Overview");
		}
		if (!title) {
			throw new Error("Button story title is required.");
		}
		const titleId = title
			.toLowerCase()
			.replaceAll(/[^a-z0-9]+/g, "-")
			.replace(/^-|-$/g, "");
		expect(`${titleId}--overview`).toBe("ui-system-button--overview");

		const variants = stories.get("Variants");
		const sizes = stories.get("Sizes");
		const semanticUsage = stories.get("SemanticUsage");
		const states = stories.get("StatesAndAccessibility");
		const navigation = stories.get("Navigation");
		const composition = stories.get("Composition");
		if (
			!(
				variants &&
				sizes &&
				semanticUsage &&
				states &&
				navigation &&
				composition
			)
		) {
			throw new Error("Button governance stories are incomplete.");
		}

		expect(buttonAxisValues(variants, "variant")).toEqual(
			[...evidence.variants].sort(),
		);
		expect(buttonAxisValues(sizes, "size")).toEqual([...evidence.sizes].sort());
		for (const story of [semanticUsage, states, navigation, composition]) {
			expect(objectProperty(story, "play")).toBeDefined();
		}
		expect(containsJsxAttribute(navigation, "Button", "asChild")).toBe(true);
		expect(
			containsJsxAttribute(navigation, "a", "href", "/suppliers/SUP-1042"),
		).toBe(true);
		expect(source.text).toContain('include: ["variant", "size", "disabled"]');
		expect(source.text).toContain("ButtonOperationalOverview");
		expect(source.text).not.toContain("Geist Variable");
		expect(source.text).toContain("shadow-none");
		expect(source.text).toContain("Focus remains distinct across surfaces");
		expect(source.text).toContain("Save supplier");
		expect(source.text).toContain("Supplier changes are being saved.");
	});

	it("declares every CVA axis and option without stale entries", () => {
		const expected: Record<
			string,
			Record<string, readonly string[]>
		> = CVA_COVERAGE;
		const discovered: Record<string, Record<string, string[]>> = {};

		for (const component of publicComponentNames()) {
			const axes = cvaAxes(path.join(componentRoot, `${component}.tsx`));
			if (Object.keys(axes).length > 0) {
				discovered[component] = axes;
			}
		}

		expect(Object.keys(expected).sort()).toEqual(
			Object.keys(discovered).sort(),
		);
		for (const [component, axes] of Object.entries(discovered)) {
			expect(Object.keys(expected[component] ?? {}).sort()).toEqual(
				Object.keys(axes).sort(),
			);
			for (const [axis, options] of Object.entries(axes)) {
				expect([...(expected[component]?.[axis] ?? [])].sort()).toEqual(
					options.sort(),
				);
			}
		}
	});

	it("keeps interaction play functions on behavioral component suites", () => {
		for (const component of interactiveComponents) {
			const text = fs.readFileSync(
				path.join(storyRoot, `${component}.stories.tsx`),
				"utf8",
			);
			expect(text).toContain(`play: interactionFor("${component}")`);
		}
	});
});

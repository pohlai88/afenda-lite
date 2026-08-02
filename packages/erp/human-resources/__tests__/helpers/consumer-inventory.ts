import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { z } from "zod";

const consumerClassSchema = z.enum(["production", "testing", "tooling"]);
const entrypointSchema = z.enum([
	".",
	"./testing",
	"deep-internal",
	"filesystem",
	"generated",
]);
const referenceKindSchema = z.enum(["filesystem", "generated", "module"]);
const resolutionSchema = z.enum(["not-applicable", "resolved", "unresolved"]);
const dispositionSchema = z.enum([
	"allowed",
	"allowlisted",
	"forbidden",
	"manual-review",
]);

const consumerReferenceSchema = z.object({
	consumerClass: consumerClassSchema,
	disposition: dispositionSchema,
	entrypoint: entrypointSchema,
	file: z.string().min(1),
	package: z.string().min(1),
	referenceKind: referenceKindSchema,
	resolution: resolutionSchema,
	resolvedTarget: z.string().min(1).optional(),
	symbol: z.string().min(1),
	useMode: z.enum([
		"dynamic",
		"filesystem",
		"generated",
		"runtime",
		"type-only",
	]),
});

const consumerInventorySchema = z.object({
	approvedTestingConsumers: z.array(z.string().min(1)),
	entrypointIsolation: z.object({
		".": z.literal("sole production business facade"),
		"./testing": z.literal("test-only construction and parity harnesses"),
	}),
	packageName: z.literal("@afenda/human-resources"),
	references: z.array(consumerReferenceSchema),
	schemaVersion: z.literal(1),
});

export type ConsumerInventory = z.infer<typeof consumerInventorySchema>;
type ConsumerClass = z.infer<typeof consumerClassSchema>;
type ConsumerReference = z.infer<typeof consumerReferenceSchema>;
type Entrypoint = z.infer<typeof entrypointSchema>;
type ReferenceKind = z.infer<typeof referenceKindSchema>;
type Resolution = z.infer<typeof resolutionSchema>;

interface DispositionInput {
	readonly consumerClass: ConsumerClass;
	readonly entrypoint: Entrypoint;
	readonly referenceKind: ReferenceKind;
	readonly resolution: Resolution;
}

interface ModuleUse {
	readonly specifier: string;
	readonly symbol: string;
	readonly useMode: "dynamic" | "runtime" | "type-only";
}

const packageJsonSchema = z.object({ name: z.string().min(1) });
const SOURCE_EXTENSION = /\.(?:c|m)?(?:j|t)sx?$/;
const HR_PACKAGE = "@afenda/human-resources";
const HR_FILESYSTEM_MARKER = "packages/erp/human-resources/";

function normalizedPath(file: string): string {
	return file.replaceAll("\\", "/");
}

function isWithin(parent: string, candidate: string): boolean {
	const relative = path.relative(parent, candidate);
	return (
		relative === "" || !(relative.startsWith("..") || path.isAbsolute(relative))
	);
}

function workspaceFiles(workspaceRoot: string): readonly string[] {
	return execFileSync(
		"git",
		["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
		{ cwd: workspaceRoot, encoding: "utf8" },
	)
		.split("\0")
		.filter((file) => file.length > 0 && SOURCE_EXTENSION.test(file))
		.filter((file) => ts.sys.fileExists(path.join(workspaceRoot, file)))
		.toSorted();
}

function consumerClass(file: string): ConsumerClass {
	if (
		/(?:^|\/)(?:__tests__|test|tests|testing)(?:\/|$)/.test(file) ||
		/\.(?:test|spec)\.[^.]+$/.test(file)
	) {
		return "testing";
	}
	if (
		file.startsWith("scripts/") ||
		file.startsWith(".cursor/") ||
		file.startsWith("testing/")
	) {
		return "tooling";
	}
	return "production";
}

function nearestPackageName(
	workspaceRoot: string,
	absoluteFile: string,
): string {
	let directory = path.dirname(absoluteFile);
	while (isWithin(workspaceRoot, directory)) {
		const packageJson = path.join(directory, "package.json");
		if (ts.sys.fileExists(packageJson)) {
			return packageJsonSchema.parse(
				JSON.parse(readFileSync(packageJson, "utf8")),
			).name;
		}
		const parent = path.dirname(directory);
		if (parent === directory) {
			break;
		}
		directory = parent;
	}
	return "workspace";
}

function compilerOptionsFor(
	workspaceRoot: string,
	absoluteFile: string,
	cache: Map<string, ts.CompilerOptions>,
): ts.CompilerOptions {
	const configPath = ts.findConfigFile(
		path.dirname(absoluteFile),
		ts.sys.fileExists,
		"tsconfig.json",
	);
	if (configPath === undefined || !isWithin(workspaceRoot, configPath)) {
		return { moduleResolution: ts.ModuleResolutionKind.Bundler };
	}
	const cached = cache.get(configPath);
	if (cached !== undefined) {
		return cached;
	}
	const config = ts.readConfigFile(configPath, ts.sys.readFile);
	if (config.error !== undefined) {
		throw new Error(
			ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
		);
	}
	const parsed = ts.parseJsonConfigFileContent(
		config.config,
		ts.sys,
		path.dirname(configPath),
	);
	cache.set(configPath, parsed.options);
	return parsed.options;
}

function entrypointFor(specifier: string): Entrypoint | undefined {
	if (specifier === HR_PACKAGE) {
		return ".";
	}
	if (specifier === `${HR_PACKAGE}/testing`) {
		return "./testing";
	}
	if (specifier.startsWith(`${HR_PACKAGE}/`)) {
		return "deep-internal";
	}
}

function importClauseUses(node: ts.ImportDeclaration): readonly ModuleUse[] {
	if (!ts.isStringLiteral(node.moduleSpecifier)) {
		return [];
	}
	const specifier = node.moduleSpecifier.text;
	const clause = node.importClause;
	if (clause === undefined) {
		return [{ specifier, symbol: "(side-effect)", useMode: "runtime" }];
	}
	const uses: ModuleUse[] = [];
	if (clause.name !== undefined) {
		uses.push({
			specifier,
			symbol: "default",
			useMode: clause.isTypeOnly ? "type-only" : "runtime",
		});
	}
	if (clause.namedBindings !== undefined) {
		if (ts.isNamespaceImport(clause.namedBindings)) {
			uses.push({
				specifier,
				symbol: "*",
				useMode: clause.isTypeOnly ? "type-only" : "runtime",
			});
		} else {
			for (const element of clause.namedBindings.elements) {
				uses.push({
					specifier,
					symbol: (element.propertyName ?? element.name).text,
					useMode:
						clause.isTypeOnly || element.isTypeOnly ? "type-only" : "runtime",
				});
			}
		}
	}
	return uses;
}

function exportClauseUses(node: ts.ExportDeclaration): readonly ModuleUse[] {
	if (
		node.moduleSpecifier === undefined ||
		!ts.isStringLiteral(node.moduleSpecifier)
	) {
		return [];
	}
	const specifier = node.moduleSpecifier.text;
	if (
		node.exportClause === undefined ||
		ts.isNamespaceExport(node.exportClause)
	) {
		return [
			{
				specifier,
				symbol: "*",
				useMode: node.isTypeOnly ? "type-only" : "runtime",
			},
		];
	}
	return node.exportClause.elements.map((element) => ({
		specifier,
		symbol: (element.propertyName ?? element.name).text,
		useMode: node.isTypeOnly || element.isTypeOnly ? "type-only" : "runtime",
	}));
}

function callUse(node: ts.CallExpression): ModuleUse | undefined {
	const [firstArgument] = node.arguments;
	if (firstArgument === undefined || !ts.isStringLiteral(firstArgument)) {
		return;
	}
	if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
		return { specifier: firstArgument.text, symbol: "*", useMode: "dynamic" };
	}
	if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
		return { specifier: firstArgument.text, symbol: "*", useMode: "runtime" };
	}
	if (
		ts.isPropertyAccessExpression(node.expression) &&
		node.expression.expression.getText() === "vi" &&
		node.expression.name.text === "mock"
	) {
		return { specifier: firstArgument.text, symbol: "*", useMode: "dynamic" };
	}
}

function moduleUses(sourceFile: ts.SourceFile): readonly ModuleUse[] {
	const uses: ModuleUse[] = [];
	function visit(node: ts.Node): void {
		if (ts.isImportDeclaration(node)) {
			uses.push(...importClauseUses(node));
		} else if (ts.isExportDeclaration(node)) {
			uses.push(...exportClauseUses(node));
		} else if (
			ts.isImportTypeNode(node) &&
			ts.isLiteralTypeNode(node.argument) &&
			ts.isStringLiteral(node.argument.literal)
		) {
			uses.push({
				specifier: node.argument.literal.text,
				symbol: "*",
				useMode: "type-only",
			});
		} else if (ts.isCallExpression(node)) {
			const use = callUse(node);
			if (use !== undefined) {
				uses.push(use);
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return uses.filter((use) => entrypointFor(use.specifier) !== undefined);
}

function filesystemReferences(sourceFile: ts.SourceFile): readonly string[] {
	const references = new Set<string>();
	function visit(node: ts.Node): void {
		if (
			(ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
			normalizedPath(node.text).includes(HR_FILESYSTEM_MARKER)
		) {
			references.add(normalizedPath(node.text));
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return [...references].toSorted();
}

function containsGeneratedReference(
	sourceText: string,
	structuredUses: readonly ModuleUse[],
): boolean {
	return (
		sourceText.includes(HR_PACKAGE) &&
		structuredUses.length === 0 &&
		!sourceText.includes(HR_FILESYSTEM_MARKER)
	);
}

export function classifyConsumerDisposition(
	input: DispositionInput,
): ConsumerReference["disposition"] {
	if (
		input.resolution === "unresolved" ||
		input.entrypoint === "deep-internal"
	) {
		return "forbidden";
	}
	if (input.referenceKind !== "module") {
		return "manual-review";
	}
	if (input.entrypoint === "./testing") {
		return input.consumerClass === "testing" ? "allowlisted" : "forbidden";
	}
	return input.consumerClass === "tooling" ? "manual-review" : "allowed";
}

function referenceSortKey(reference: ConsumerReference): string {
	return [
		reference.file,
		reference.entrypoint,
		reference.symbol,
		reference.useMode,
		reference.referenceKind,
	].join(":");
}

export function buildConsumerInventory(
	workspaceRoot: string,
	packageRoot: string,
): ConsumerInventory {
	const references: ConsumerReference[] = [];
	const compilerOptions = new Map<string, ts.CompilerOptions>();
	for (const file of workspaceFiles(workspaceRoot)) {
		const absoluteFile = path.join(workspaceRoot, file);
		if (isWithin(packageRoot, absoluteFile)) {
			continue;
		}
		const sourceText = readFileSync(absoluteFile, "utf8");
		const sourceFile = ts.createSourceFile(
			absoluteFile,
			sourceText,
			ts.ScriptTarget.Latest,
			true,
		);
		const normalizedFile = normalizedPath(file);
		const classification = consumerClass(normalizedFile);
		const packageName = nearestPackageName(workspaceRoot, absoluteFile);
		const uses = moduleUses(sourceFile);
		for (const use of uses) {
			const entrypoint = entrypointFor(use.specifier);
			if (entrypoint === undefined) {
				continue;
			}
			const resolved = ts.resolveModuleName(
				use.specifier,
				absoluteFile,
				compilerOptionsFor(workspaceRoot, absoluteFile, compilerOptions),
				ts.sys,
			).resolvedModule;
			const resolution = resolved === undefined ? "unresolved" : "resolved";
			const base = {
				consumerClass: classification,
				entrypoint,
				file: normalizedFile,
				package: packageName,
				referenceKind: "module" as const,
				resolution,
				symbol: use.symbol,
				useMode: use.useMode,
			};
			references.push({
				...base,
				disposition: classifyConsumerDisposition(base),
				...(resolved === undefined
					? {}
					: {
							resolvedTarget: normalizedPath(
								path.relative(workspaceRoot, resolved.resolvedFileName),
							),
						}),
			});
		}
		for (const filesystemReference of filesystemReferences(sourceFile)) {
			const base = {
				consumerClass: classification,
				entrypoint: "filesystem" as const,
				file: normalizedFile,
				package: packageName,
				referenceKind: "filesystem" as const,
				resolution: "not-applicable" as const,
				symbol: filesystemReference,
				useMode: "filesystem" as const,
			};
			references.push({
				...base,
				disposition: classifyConsumerDisposition(base),
			});
		}
		if (containsGeneratedReference(sourceText, uses)) {
			const base = {
				consumerClass: classification,
				entrypoint: "generated" as const,
				file: normalizedFile,
				package: packageName,
				referenceKind: "generated" as const,
				resolution: "not-applicable" as const,
				symbol: "*",
				useMode: "generated" as const,
			};
			references.push({
				...base,
				disposition: classifyConsumerDisposition(base),
			});
		}
	}
	const uniqueReferences = new Map<string, ConsumerReference>();
	for (const reference of references) {
		uniqueReferences.set(referenceSortKey(reference), reference);
	}
	const sortedReferences = [...uniqueReferences.values()].toSorted(
		(left, right) =>
			referenceSortKey(left).localeCompare(referenceSortKey(right)),
	);
	return consumerInventorySchema.parse({
		approvedTestingConsumers: [
			...new Set(
				sortedReferences
					.filter((reference) => reference.entrypoint === "./testing")
					.map((reference) => reference.file),
			),
		].toSorted(),
		entrypointIsolation: {
			".": "sole production business facade",
			"./testing": "test-only construction and parity harnesses",
		},
		packageName: HR_PACKAGE,
		references: sortedReferences,
		schemaVersion: 1,
	});
}

export function readConsumerInventoryFixture(file: string): ConsumerInventory {
	return consumerInventorySchema.parse(JSON.parse(readFileSync(file, "utf8")));
}

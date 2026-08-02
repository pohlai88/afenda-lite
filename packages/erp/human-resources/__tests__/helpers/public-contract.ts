import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { z } from "zod";

const signatureSchema = z.object({
	minimumArgumentCount: z.number().int().nonnegative(),
	parameters: z.array(
		z.object({
			optional: z.boolean(),
			rest: z.boolean(),
			type: z.string().min(1),
		}),
	),
	resultErrorCodeSet: z.string().min(1).optional(),
	returnType: z.string().min(1),
});

const publicSymbolCategorySchema = z.enum([
	"adapter",
	"capability-factory",
	"composition-constructor",
	"database-record",
	"internal-registry",
	"public-contract",
	"store",
]);

const publicSymbolSchema = z.object({
	category: publicSymbolCategorySchema,
	kind: z.enum(["class", "function", "object", "type", "value"]),
	name: z.string().min(1),
	signatures: z.array(signatureSchema).optional(),
});

const publicCapabilitySchema = z.object({
	callSignatures: z.array(signatureSchema),
	methods: z.array(
		z.object({
			name: z.string().min(1),
			signatures: z.array(signatureSchema),
		}),
	),
	name: z.string().min(1),
});

const publicEntrypointSchema = z.object({
	capabilities: z.array(publicCapabilitySchema).optional(),
	owner: z.enum(["production", "testing", "unclassified"]),
	symbols: z.array(publicSymbolSchema),
});

const publicContractSchema = z.object({
	entrypoints: z.record(z.string(), publicEntrypointSchema),
	errorCodeSets: z.record(z.string(), z.array(z.string())),
	packageName: z.literal("@afenda/human-resources"),
	schemaVersion: z.literal(1),
});

const publicContractFixtureSchema = z.object({
	contractDigest: z.string().regex(/^[a-f0-9]{64}$/),
	entrypoints: z.record(
		z.string(),
		z.object({
			capabilityCount: z.number().int().nonnegative(),
			owner: z.enum(["production", "testing", "unclassified"]),
			symbolCount: z.number().int().nonnegative(),
		}),
	),
	errorCodeSets: z.record(z.string(), z.array(z.string())),
	packageName: z.literal("@afenda/human-resources"),
	schemaVersion: z.literal(1),
});

export type PublicSignature = z.infer<typeof signatureSchema>;
export type PublicSymbolCategory = z.infer<typeof publicSymbolCategorySchema>;
export type PublicContract = z.infer<typeof publicContractSchema>;
export type PublicContractFixture = z.infer<typeof publicContractFixtureSchema>;

export interface PublicContractIssue {
	readonly code:
		| "capability-mismatch"
		| "forbidden-category"
		| "missing-entrypoint"
		| "missing-symbol"
		| "signature-mismatch"
		| "symbol-kind-mismatch"
		| "symbol-owner-mismatch"
		| "unexpected-entrypoint"
		| "unexpected-symbol";
	readonly entrypoint: string;
	readonly symbol?: string;
}

interface ContractBuildContext {
	readonly checker: ts.TypeChecker;
	readonly errorCodeSets: Map<string, readonly string[]>;
	readonly packageRoot: string;
	readonly publicNames: ReadonlySet<string>;
}

const FORBIDDEN_ROOT_CATEGORIES = new Set<PublicSymbolCategory>([
	"adapter",
	"composition-constructor",
	"database-record",
	"internal-registry",
	"store",
]);

function hasCompilerFlag(value: number, flag: number): boolean {
	// biome-ignore lint/suspicious/noBitwiseOperators: TypeScript compiler flags are bitmasks by design.
	return (value & flag) !== 0;
}

function entrypointOwner(
	entrypoint: string,
): z.infer<typeof publicEntrypointSchema>["owner"] {
	if (entrypoint === ".") {
		return "production";
	}
	if (entrypoint === "./testing") {
		return "testing";
	}
	return "unclassified";
}

function loadProgram(packageRoot: string): ts.Program {
	const configPath = path.join(packageRoot, "tsconfig.json");
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
	return ts.createProgram(parsed.fileNames, {
		...parsed.options,
		noEmit: true,
		skipLibCheck: true,
	});
}

function resolveExportSource(packageRoot: string, target: unknown): string {
	const parsed = z
		.object({ types: z.string().min(1) })
		.or(z.string().min(1))
		.parse(target);
	const relative = typeof parsed === "string" ? parsed : parsed.types;
	const unresolved = path.resolve(packageRoot, relative);
	return path.extname(unresolved) === "" ? `${unresolved}.ts` : unresolved;
}

function resolveAliasedSymbol(
	checker: ts.TypeChecker,
	symbol: ts.Symbol,
): ts.Symbol {
	return hasCompilerFlag(symbol.flags, ts.SymbolFlags.Alias)
		? checker.getAliasedSymbol(symbol)
		: symbol;
}

function symbolLocation(symbol: ts.Symbol, fallback: ts.Node): ts.Node {
	return symbol.valueDeclaration ?? symbol.declarations?.[0] ?? fallback;
}

function symbolKind(
	checker: ts.TypeChecker,
	symbol: ts.Symbol,
	fallback: ts.Node,
): z.infer<typeof publicSymbolSchema>["kind"] {
	if (hasCompilerFlag(symbol.flags, ts.SymbolFlags.Class)) {
		return "class";
	}
	if (
		(hasCompilerFlag(symbol.flags, ts.SymbolFlags.Interface) ||
			hasCompilerFlag(symbol.flags, ts.SymbolFlags.TypeAlias) ||
			hasCompilerFlag(symbol.flags, ts.SymbolFlags.TypeParameter)) &&
		symbol.valueDeclaration === undefined
	) {
		return "type";
	}
	const type = checker.getTypeOfSymbolAtLocation(
		symbol,
		symbolLocation(symbol, fallback),
	);
	if (type.getCallSignatures().length > 0) {
		return "function";
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.Object)) {
		return "object";
	}
	return "value";
}

function normalizedDeclarationPaths(
	packageRoot: string,
	symbol: ts.Symbol,
): readonly string[] {
	return (symbol.declarations ?? []).map((declaration) =>
		path
			.relative(packageRoot, declaration.getSourceFile().fileName)
			.replaceAll("\\", "/"),
	);
}

function symbolCategory(
	packageRoot: string,
	symbol: ts.Symbol,
	kind: z.infer<typeof publicSymbolSchema>["kind"],
): PublicSymbolCategory {
	const sources = normalizedDeclarationPaths(packageRoot, symbol);
	const name = symbol.getName();
	if (
		sources.some((source) => source.includes("src/composition/adapters/")) ||
		/^create(?:Drizzle|Memory).*(?:Adapter|Store)$/.test(name)
	) {
		return "adapter";
	}
	if (
		sources.some((source) => source.includes("src/composition/store/")) ||
		name === "HumanResourcesStore" ||
		name === "resolveHumanResourcesStore"
	) {
		return "store";
	}
	if (
		sources.some(
			(source) =>
				source.includes("src/composition/") &&
				!source.includes("src/composition/production/"),
		) &&
		kind === "function" &&
		/^(?:compose|create|resolve)(?:Drizzle|HumanResources|Memory)/.test(name)
	) {
		return "composition-constructor";
	}
	if (
		sources.some(
			(source) =>
				source.includes("src/composition/production/") && kind === "function",
		)
	) {
		return "capability-factory";
	}
	if (
		sources.some(
			(source) =>
				source.includes("/adapters/drizzle/") ||
				/source\/schema\//.test(source),
		)
	) {
		return "database-record";
	}
	if (
		/(?:Registry|REGISTRY)$/.test(name) &&
		sources.some((source) => /\/registry\.ts$/.test(source))
	) {
		return "internal-registry";
	}
	return "public-contract";
}

function namedTypeArguments(
	checker: ts.TypeChecker,
	type: ts.Type,
): readonly ts.Type[] {
	if (type.aliasTypeArguments !== undefined) {
		return type.aliasTypeArguments;
	}
	const reference = type as ts.TypeReference;
	return reference.target === undefined
		? []
		: checker.getTypeArguments(reference);
}

function isDeclarationOutsidePackage(
	packageRoot: string,
	symbol: ts.Symbol,
): boolean {
	return (symbol.declarations ?? []).every(
		(declaration) =>
			!path
				.resolve(declaration.getSourceFile().fileName)
				.startsWith(path.resolve(packageRoot)),
	);
}

function normalizedType(
	context: ContractBuildContext,
	type: ts.Type,
	depth = 0,
	ancestors = new Set<ts.Type>(),
): string {
	if (depth > 6) {
		return "complex";
	}
	if (ancestors.has(type)) {
		return "recursive";
	}
	const nextAncestors = new Set(ancestors).add(type);
	const { checker } = context;
	if (hasCompilerFlag(type.flags, ts.TypeFlags.Any)) {
		return "any";
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.Unknown)) {
		return "unknown";
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.Never)) {
		return "never";
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.Void)) {
		return "void";
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.Undefined)) {
		return "undefined";
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.Null)) {
		return "null";
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.String)) {
		return "string";
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.Number)) {
		return "number";
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.Boolean)) {
		return "boolean";
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.BigInt)) {
		return "bigint";
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.ESSymbol)) {
		return "symbol";
	}
	if (type.isStringLiteral()) {
		return JSON.stringify(type.value);
	}
	if (type.isNumberLiteral()) {
		return String(type.value);
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.BooleanLiteral)) {
		return checker.typeToString(type) === "true" ? "true" : "false";
	}
	const alias = type.aliasSymbol;
	if (alias !== undefined) {
		const arguments_ = namedTypeArguments(checker, type);
		return arguments_.length === 0
			? alias.getName()
			: `${alias.getName()}<${arguments_
					.map((argument) =>
						normalizedType(context, argument, depth + 1, nextAncestors),
					)
					.join(", ")}>`;
	}
	if (type.isUnionOrIntersection()) {
		const separator = type.isUnion() ? " | " : " & ";
		return type.types
			.map((part) => normalizedType(context, part, depth + 1, nextAncestors))
			.toSorted()
			.join(separator);
	}
	if (hasCompilerFlag(type.flags, ts.TypeFlags.TypeParameter)) {
		return type.getSymbol()?.getName() ?? "type-parameter";
	}
	if (checker.isArrayType(type)) {
		const [element] = namedTypeArguments(checker, type);
		return `${element === undefined ? "unknown" : normalizedType(context, element, depth + 1, nextAncestors)}[]`;
	}
	if (checker.isTupleType(type)) {
		return `[${namedTypeArguments(checker, type)
			.map((item) => normalizedType(context, item, depth + 1, nextAncestors))
			.join(", ")}]`;
	}
	const symbol = type.getSymbol();
	if (
		symbol !== undefined &&
		symbol.getName() !== "__type" &&
		symbol.getName() !== "__object" &&
		(context.publicNames.has(symbol.getName()) ||
			isDeclarationOutsidePackage(context.packageRoot, symbol))
	) {
		const arguments_ = namedTypeArguments(checker, type);
		return arguments_.length === 0
			? symbol.getName()
			: `${symbol.getName()}<${arguments_
					.map((argument) =>
						normalizedType(context, argument, depth + 1, nextAncestors),
					)
					.join(", ")}>`;
	}
	const properties = checker
		.getPropertiesOfType(type)
		.toSorted((left, right) => left.getName().localeCompare(right.getName()));
	if (properties.length > 0) {
		const body = properties.map((property) => {
			const location = property.valueDeclaration ?? property.declarations?.[0];
			const propertyType =
				location === undefined
					? checker.getDeclaredTypeOfSymbol(property)
					: checker.getTypeOfSymbolAtLocation(property, location);
			const optional = hasCompilerFlag(property.flags, ts.SymbolFlags.Optional)
				? "?"
				: "";
			return `${property.getName()}${optional}: ${normalizedType(
				context,
				propertyType,
				depth + 1,
				nextAncestors,
			)}`;
		});
		return `{ ${body.join("; ")} }`;
	}
	const calls = type.getCallSignatures();
	if (calls.length > 0) {
		return "callable";
	}
	return "object";
}

function stringLiteralValues(type: ts.Type): readonly string[] {
	if (type.isStringLiteral()) {
		return [type.value];
	}
	if (type.isUnionOrIntersection()) {
		return type.types.flatMap(stringLiteralValues);
	}
	return [];
}

function resultErrorCodes(
	context: ContractBuildContext,
	returnType: ts.Type,
): readonly string[] {
	const { checker } = context;
	const promiseArguments =
		returnType.getSymbol()?.getName() === "Promise"
			? namedTypeArguments(checker, returnType)
			: [];
	const outcome = promiseArguments[0] ?? returnType;
	if (outcome.aliasSymbol?.getName() !== "Result") {
		return [];
	}
	const codes = outcome.isUnion()
		? outcome.types.flatMap((member) => {
				const code = member.getProperty("code");
				const declaration = code?.valueDeclaration ?? code?.declarations?.[0];
				return code === undefined || declaration === undefined
					? []
					: stringLiteralValues(
							checker.getTypeOfSymbolAtLocation(code, declaration),
						);
			})
		: [];
	return [...new Set(codes)].toSorted();
}

function errorCodeSetId(codes: readonly string[]): string {
	return createHash("sha256").update(codes.join("\n")).digest("hex");
}

function publicSignature(
	context: ContractBuildContext,
	signature: ts.Signature,
): PublicSignature {
	const parameters = signature.getParameters().map((parameter, index) => {
		const declaration =
			parameter.valueDeclaration ?? parameter.declarations?.[0];
		const type =
			declaration === undefined
				? context.checker.getDeclaredTypeOfSymbol(parameter)
				: context.checker.getTypeOfSymbolAtLocation(parameter, declaration);
		return {
			optional:
				index >= signature.minArgumentCount ||
				hasCompilerFlag(parameter.flags, ts.SymbolFlags.Optional),
			rest:
				declaration !== undefined &&
				ts.isParameter(declaration) &&
				declaration.dotDotDotToken !== undefined,
			type: normalizedType(context, type),
		};
	});
	const returnType = context.checker.getReturnTypeOfSignature(signature);
	const codes = resultErrorCodes(context, returnType);
	const resultErrorCodeSet =
		codes.length === 0 ? undefined : errorCodeSetId(codes);
	if (resultErrorCodeSet !== undefined) {
		context.errorCodeSets.set(resultErrorCodeSet, codes);
	}
	return {
		minimumArgumentCount: signature.minArgumentCount,
		parameters,
		...(resultErrorCodeSet === undefined ? {} : { resultErrorCodeSet }),
		returnType: normalizedType(context, returnType),
	};
}

function publicCapability(
	context: ContractBuildContext,
	symbol: ts.Symbol,
): z.infer<typeof publicCapabilitySchema> {
	const type = context.checker.getDeclaredTypeOfSymbol(symbol);
	const methods = context.checker
		.getPropertiesOfType(type)
		.flatMap((property) => {
			const declaration =
				property.valueDeclaration ?? property.declarations?.[0];
			if (declaration === undefined) {
				return [];
			}
			const signatures = context.checker
				.getTypeOfSymbolAtLocation(property, declaration)
				.getCallSignatures();
			return signatures.length === 0
				? []
				: [
						{
							name: property.getName(),
							signatures: signatures.map((signature) =>
								publicSignature(context, signature),
							),
						},
					];
		})
		.toSorted((left, right) => left.name.localeCompare(right.name));
	return {
		callSignatures: type
			.getCallSignatures()
			.map((signature) => publicSignature(context, signature)),
		methods,
		name: symbol.getName(),
	};
}

function buildEntrypoint(
	context: ContractBuildContext,
	sourceFile: ts.SourceFile,
	owner: z.infer<typeof publicEntrypointSchema>["owner"],
): z.infer<typeof publicEntrypointSchema> {
	const module = context.checker.getSymbolAtLocation(sourceFile);
	if (module === undefined) {
		throw new Error(`Unable to resolve module ${sourceFile.fileName}.`);
	}
	const exports = context.checker.getExportsOfModule(module);
	const symbols = exports
		.map((exported) => {
			const symbol = resolveAliasedSymbol(context.checker, exported);
			const kind = symbolKind(context.checker, symbol, sourceFile);
			const type = context.checker.getTypeOfSymbolAtLocation(
				symbol,
				symbolLocation(symbol, sourceFile),
			);
			return {
				category: symbolCategory(context.packageRoot, symbol, kind),
				kind,
				name: exported.getName(),
				...(kind === "function"
					? {
							signatures: type
								.getCallSignatures()
								.map((signature) => publicSignature(context, signature)),
						}
					: {}),
			};
		})
		.toSorted((left, right) => left.name.localeCompare(right.name));
	const capabilities = exports
		.map((exported) => resolveAliasedSymbol(context.checker, exported))
		.filter(
			(symbol) =>
				/(?:Capability|Capabilities|CapabilityOptions)$/.test(
					symbol.getName(),
				) &&
				(hasCompilerFlag(symbol.flags, ts.SymbolFlags.Interface) ||
					hasCompilerFlag(symbol.flags, ts.SymbolFlags.TypeAlias)),
		)
		.map((symbol) => publicCapability(context, symbol))
		.toSorted((left, right) => left.name.localeCompare(right.name));
	return {
		...(capabilities.length === 0 ? {} : { capabilities }),
		owner,
		symbols,
	};
}

export function buildPublicContract(packageRoot: string): PublicContract {
	const packageJson = z
		.object({
			exports: z.record(z.string(), z.unknown()),
			name: z.literal("@afenda/human-resources"),
		})
		.parse(
			JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8")),
		);
	const program = loadProgram(packageRoot);
	const checker = program.getTypeChecker();
	const modules = Object.entries(packageJson.exports).map(
		([entrypoint, target]) => {
			const sourcePath = resolveExportSource(packageRoot, target);
			const sourceFile = program.getSourceFile(sourcePath);
			if (sourceFile === undefined) {
				throw new Error(`Unable to load ${entrypoint} from ${sourcePath}.`);
			}
			return { entrypoint, sourceFile };
		},
	);
	const publicNames = new Set(
		modules.flatMap(({ sourceFile }) => {
			const module = checker.getSymbolAtLocation(sourceFile);
			return module === undefined
				? []
				: checker.getExportsOfModule(module).map((symbol) => symbol.getName());
		}),
	);
	const errorCodeSets = new Map<string, readonly string[]>();
	const context: ContractBuildContext = {
		checker,
		errorCodeSets,
		packageRoot,
		publicNames,
	};
	const entrypoints = Object.fromEntries(
		modules.map(({ entrypoint, sourceFile }) => [
			entrypoint,
			buildEntrypoint(context, sourceFile, entrypointOwner(entrypoint)),
		]),
	);
	return publicContractSchema.parse({
		entrypoints,
		errorCodeSets: Object.fromEntries(
			[...errorCodeSets.entries()].toSorted(([left], [right]) =>
				left.localeCompare(right),
			),
		),
		packageName: packageJson.name,
		schemaVersion: 1,
	});
}

function stableValue(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map(stableValue).join(",")}]`;
	}
	if (value !== null && typeof value === "object") {
		return `{${Object.entries(value)
			.toSorted(([left], [right]) => left.localeCompare(right))
			.map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

export function buildPublicContractFixture(
	contract: PublicContract,
): PublicContractFixture {
	return publicContractFixtureSchema.parse({
		contractDigest: createHash("sha256")
			.update(stableValue(contract))
			.digest("hex"),
		entrypoints: Object.fromEntries(
			Object.entries(contract.entrypoints).map(([entrypoint, definition]) => [
				entrypoint,
				{
					capabilityCount: definition.capabilities?.length ?? 0,
					owner: definition.owner,
					symbolCount: definition.symbols.length,
				},
			]),
		),
		errorCodeSets: contract.errorCodeSets,
		packageName: contract.packageName,
		schemaVersion: contract.schemaVersion,
	});
}

export function readPublicContractFixture(file: string): PublicContractFixture {
	return publicContractFixtureSchema.parse(
		JSON.parse(readFileSync(file, "utf8")),
	);
}

function ownerBySymbol(contract: PublicContract): ReadonlyMap<string, string> {
	const owners = new Map<string, string>();
	for (const [entrypoint, definition] of Object.entries(contract.entrypoints)) {
		for (const symbol of definition.symbols) {
			owners.set(symbol.name, entrypoint);
		}
	}
	return owners;
}

export function comparePublicContracts(
	expected: PublicContract,
	actual: PublicContract,
): PublicContractIssue[] {
	const issues: PublicContractIssue[] = [];
	const expectedOwners = ownerBySymbol(expected);
	const actualOwners = ownerBySymbol(actual);
	for (const [name, expectedOwner] of expectedOwners) {
		const actualOwner = actualOwners.get(name);
		if (actualOwner !== undefined && actualOwner !== expectedOwner) {
			issues.push({
				code: "symbol-owner-mismatch",
				entrypoint: actualOwner,
				symbol: name,
			});
		}
	}
	for (const entrypoint of Object.keys(expected.entrypoints)) {
		if (actual.entrypoints[entrypoint] === undefined) {
			issues.push({ code: "missing-entrypoint", entrypoint });
		}
	}
	for (const entrypoint of Object.keys(actual.entrypoints)) {
		if (expected.entrypoints[entrypoint] === undefined) {
			issues.push({ code: "unexpected-entrypoint", entrypoint });
		}
	}
	for (const [entrypoint, expectedDefinition] of Object.entries(
		expected.entrypoints,
	)) {
		const actualDefinition = actual.entrypoints[entrypoint];
		if (actualDefinition === undefined) {
			continue;
		}
		const expectedSymbols = new Map(
			expectedDefinition.symbols.map((symbol) => [symbol.name, symbol]),
		);
		const actualSymbols = new Map(
			actualDefinition.symbols.map((symbol) => [symbol.name, symbol]),
		);
		for (const [name, symbol] of expectedSymbols) {
			const actualSymbol = actualSymbols.get(name);
			if (actualSymbol === undefined) {
				if (actualOwners.get(name) === undefined) {
					issues.push({ code: "missing-symbol", entrypoint, symbol: name });
				}
				continue;
			}
			if (symbol.kind !== actualSymbol.kind) {
				issues.push({
					code: "symbol-kind-mismatch",
					entrypoint,
					symbol: name,
				});
			} else if (
				stableValue(symbol.signatures) !== stableValue(actualSymbol.signatures)
			) {
				issues.push({
					code: "signature-mismatch",
					entrypoint,
					symbol: name,
				});
			}
		}
		for (const name of actualSymbols.keys()) {
			if (expectedSymbols.has(name) || expectedOwners.has(name)) {
				continue;
			}
			issues.push({ code: "unexpected-symbol", entrypoint, symbol: name });
		}
		if (
			stableValue(expectedDefinition.capabilities) !==
			stableValue(actualDefinition.capabilities)
		) {
			issues.push({ code: "capability-mismatch", entrypoint });
		}
	}
	const production = actual.entrypoints["."];
	if (production !== undefined) {
		for (const symbol of production.symbols) {
			if (FORBIDDEN_ROOT_CATEGORIES.has(symbol.category)) {
				issues.push({
					code: "forbidden-category",
					entrypoint: ".",
					symbol: symbol.name,
				});
			}
		}
	}
	return issues.toSorted((left, right) =>
		`${left.code}:${left.entrypoint}:${left.symbol ?? ""}`.localeCompare(
			`${right.code}:${right.entrypoint}:${right.symbol ?? ""}`,
		),
	);
}

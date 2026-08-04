import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import ts from "typescript";
import { z } from "zod";

/**
 * Payroll's public-contract projection is intentionally narrower than HR's
 * TS-compiler-based capability/signature extraction (see
 * `packages/erp/human-resources/__tests__/helpers/public-contract.ts`).
 * Task-5 brief scope: "public-contract = the export names export-surface.test.ts
 * already asserts" — this walks the same root barrel (`src/index.ts`) with the
 * TS compiler API (static analysis, matching `export-surface.test.ts`'s own
 * approach) rather than a runtime import, so `server-only` never executes.
 */

const publicSymbolSchema = z.object({
	kind: z.enum(["function", "type", "value"]),
	name: z.string().min(1),
});

const publicEntrypointSchema = z.object({
	owner: z.literal("production"),
	symbols: z.array(publicSymbolSchema),
});

const publicContractSchema = z.object({
	entrypoints: z.record(z.string(), publicEntrypointSchema),
	errorCodeSets: z.record(z.string(), z.array(z.string())),
	packageName: z.literal("@afenda/payroll"),
	schemaVersion: z.literal(1),
});

const publicContractFixtureSchema = z.object({
	contractDigest: z.string().regex(/^[a-f0-9]{64}$/),
	entrypoints: z.record(
		z.string(),
		z.object({
			owner: z.literal("production"),
			symbolCount: z.number().int().nonnegative(),
		}),
	),
	errorCodeSets: z.record(z.string(), z.array(z.string())),
	packageName: z.literal("@afenda/payroll"),
	schemaVersion: z.literal(1),
});

export type PublicContract = z.infer<typeof publicContractSchema>;
export type PublicContractFixture = z.infer<typeof publicContractFixtureSchema>;

const PACKAGE_NAME = "@afenda/payroll";

function hasCompilerFlag(value: number, flag: number): boolean {
	// biome-ignore lint/suspicious/noBitwiseOperators: TypeScript compiler flags are bitmasks by design.
	return (value & flag) !== 0;
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

function resolveAliasedSymbol(
	checker: ts.TypeChecker,
	symbol: ts.Symbol,
): ts.Symbol {
	return hasCompilerFlag(symbol.flags, ts.SymbolFlags.Alias)
		? checker.getAliasedSymbol(symbol)
		: symbol;
}

function symbolKind(
	checker: ts.TypeChecker,
	symbol: ts.Symbol,
	fallback: ts.Node,
): z.infer<typeof publicSymbolSchema>["kind"] {
	if (
		(hasCompilerFlag(symbol.flags, ts.SymbolFlags.Interface) ||
			hasCompilerFlag(symbol.flags, ts.SymbolFlags.TypeAlias)) &&
		symbol.valueDeclaration === undefined
	) {
		return "type";
	}
	const location =
		symbol.valueDeclaration ?? symbol.declarations?.[0] ?? fallback;
	const type = checker.getTypeOfSymbolAtLocation(symbol, location);
	return type.getCallSignatures().length > 0 ? "function" : "value";
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

export function buildPublicContract(packageRoot: string): PublicContract {
	const packageJson = z
		.object({
			exports: z.record(z.string(), z.unknown()),
			name: z.literal(PACKAGE_NAME),
		})
		.parse(
			JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8")),
		);
	const entrypointNames = Object.keys(packageJson.exports);
	if (entrypointNames.length !== 1 || entrypointNames[0] !== ".") {
		throw new Error(
			"Payroll public-contract generator expects exactly one root entrypoint.",
		);
	}
	const program = loadProgram(packageRoot);
	const checker = program.getTypeChecker();
	const indexPath = path.join(packageRoot, "src/index.ts");
	const sourceFile = program.getSourceFile(indexPath);
	if (sourceFile === undefined) {
		throw new Error(`Unable to load root barrel from ${indexPath}.`);
	}
	const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
	if (moduleSymbol === undefined) {
		throw new Error("Unable to resolve payroll root module symbol.");
	}
	const symbols = checker
		.getExportsOfModule(moduleSymbol)
		.map((exported) => {
			const resolved = resolveAliasedSymbol(checker, exported);
			return {
				kind: symbolKind(checker, resolved, sourceFile),
				name: exported.getName(),
			};
		})
		.toSorted((left, right) => left.name.localeCompare(right.name));

	return publicContractSchema.parse({
		entrypoints: {
			".": {
				owner: "production",
				symbols,
			},
		},
		errorCodeSets: {},
		packageName: PACKAGE_NAME,
		schemaVersion: 1,
	});
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

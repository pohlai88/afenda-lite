import { readdirSync, readFileSync } from "node:fs";
import path, { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const packageRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const srcRoot = join(packageRoot, "src");
const pkgPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../package.json",
);
const indexPath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../src/index.ts",
);

function listTypeScriptFiles(root: string): string[] {
	return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
		const entryPath = join(root, entry.name);
		if (entry.isDirectory()) {
			return listTypeScriptFiles(entryPath);
		}
		return entry.name.endsWith(".ts") ? [entryPath] : [];
	});
}

function listModuleSpecifiers(file: string): string[] {
	const source = ts.createSourceFile(
		file,
		readFileSync(file, "utf8"),
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const specifiers: string[] = [];
	const addStringLiteral = (node: ts.Node | undefined) => {
		if (node !== undefined && ts.isStringLiteralLike(node)) {
			specifiers.push(node.text);
		}
	};
	const visit = (node: ts.Node): void => {
		if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
			addStringLiteral(node.moduleSpecifier);
		} else if (
			ts.isImportEqualsDeclaration(node) &&
			ts.isExternalModuleReference(node.moduleReference)
		) {
			addStringLiteral(node.moduleReference.expression);
		} else if (
			ts.isCallExpression(node) &&
			(node.expression.kind === ts.SyntaxKind.ImportKeyword ||
				(ts.isIdentifier(node.expression) &&
					node.expression.text === "require"))
		) {
			addStringLiteral(node.arguments[0]);
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return specifiers;
}

function typeDeclarationPaths(
	checker: ts.TypeChecker,
	type: ts.Type,
	seen = new Set<ts.Type>(),
): string[] {
	if (seen.has(type)) {
		return [];
	}
	seen.add(type);

	const symbols = [type.aliasSymbol, type.getSymbol()].filter(
		(symbol): symbol is ts.Symbol => symbol !== undefined,
	);
	const ownPaths = symbols.flatMap(
		(symbol) =>
			symbol.declarations?.map((declaration) =>
				declaration.getSourceFile().fileName.replaceAll("\\", "/"),
			) ?? [],
	);
	const constituentPaths = type.isUnionOrIntersection()
		? type.types.flatMap((part) => typeDeclarationPaths(checker, part, seen))
		: [];
	const aliasPaths = (type.aliasTypeArguments ?? []).flatMap((argument) =>
		typeDeclarationPaths(checker, argument, seen),
	);
	const reference = type as ts.TypeReference;
	const referencePaths =
		reference.target === undefined
			? []
			: checker
					.getTypeArguments(reference)
					.flatMap((argument) => typeDeclarationPaths(checker, argument, seen));

	return [...ownPaths, ...constituentPaths, ...aliasPaths, ...referencePaths];
}

function isPrivateImplementationDeclaration(file: string): boolean {
	const normalized = file.replaceAll("\\", "/");
	return (
		/\/src\/(?:composition|testing)\//.test(normalized) ||
		/\/src\/features\/[^/]+\/[^/]+\.(?:store|drizzle|memory)\.ts$/.test(
			normalized,
		) ||
		/\/src\/kernel\/execution\/(?:command-options|ports)\.ts$/.test(normalized)
	);
}

function privateRootSignatureDeclarations(
	program: ts.Program,
	rootPath: string,
): Array<{ readonly name: string; readonly file: string }> {
	const checker = program.getTypeChecker();
	const rootSource = program.getSourceFile(rootPath);
	if (rootSource === undefined) {
		throw new Error("Payroll root source was not loaded.");
	}
	const rootSymbol = checker.getSymbolAtLocation(rootSource);
	if (rootSymbol === undefined) {
		throw new Error("Payroll root module symbol was not resolved.");
	}

	return checker.getExportsOfModule(rootSymbol).flatMap((symbol) => {
		const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
		if (declaration === undefined) {
			return [];
		}
		return checker
			.getTypeOfSymbolAtLocation(symbol, declaration)
			.getCallSignatures()
			.flatMap((signature) => {
				const parameterTypes = signature
					.getParameters()
					.map((parameter) =>
						checker.getTypeOfSymbolAtLocation(parameter, declaration),
					);
				return [...parameterTypes, signature.getReturnType()]
					.flatMap((type) => typeDeclarationPaths(checker, type))
					.filter(isPrivateImplementationDeclaration)
					.map((file) => ({ name: symbol.getName(), file }));
			});
	});
}

describe("@afenda/payroll export surface contract", () => {
	it("root barrel exposes intentional public symbols only", async () => {
		const root = await import("../src/index");

		expect(root.PAYROLL_PERMISSION_SETUP_MANAGE).toBe("payroll.setup.manage");
		expect(root.PAYROLL_PERMISSION_RUN_CREATE).toBe("payroll.run.create");
		expect(typeof root.createPayrollCapabilityOptions).toBe("function");
		expect(typeof root.createPayrollCalendar).toBe("function");
		expect(
			(root as Record<string, unknown>).createDrizzlePayrollStore,
		).toBeUndefined();
		expect(
			(root as Record<string, unknown>).createProductionPayrollRunCalculator,
		).toBeUndefined();
		expect((root as Record<string, unknown>).MutationPorts).toBeUndefined();
	}, 45_000);

	it("publishes the production root and isolated testing entrypoints", () => {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
			exports?: Record<string, unknown>;
		};

		expect(Object.keys(pkg.exports ?? {}).toSorted()).toEqual([
			".",
			"./testing",
		]);
	});

	it("keeps implementation and composition internals out of the root barrel", () => {
		const source = readFileSync(indexPath, "utf8");
		expect(source).not.toMatch(
			/PayrollCommandOptions|MutationPorts|createProductionPayrollRunCalculator|createDrizzlePayrollStore|PayrollStore/,
		);
	});

	it("keeps internal dependency types out of every root callable signature", () => {
		const config = ts.readConfigFile(
			join(packageRoot, "tsconfig.json"),
			ts.sys.readFile,
		);
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
		expect(privateRootSignatureDeclarations(program, indexPath)).toEqual([]);
	}, 30_000);

	it("rejects a feature-owned store type leaked through a root callable", () => {
		const config = ts.readConfigFile(
			join(packageRoot, "tsconfig.json"),
			ts.sys.readFile,
		);
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
		const host = ts.createCompilerHost(parsed.options);
		const readFile = host.readFile.bind(host);
		host.readFile = (fileName) => {
			const content = readFile(fileName);
			if (
				path.resolve(fileName).toLowerCase() !== indexPath.toLowerCase() ||
				content === undefined
			) {
				return content;
			}
			return `${content}\nexport declare function __privateStoreLeakFixture(): import("./features/employee-assignments/assignments.store").PayrollAssignmentsStore;\n`;
		};
		const program = ts.createProgram({
			rootNames: parsed.fileNames,
			options: parsed.options,
			host,
		});

		expect(privateRootSignatureDeclarations(program, indexPath)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: "__privateStoreLeakFixture",
					file: expect.stringMatching(
						/\/src\/features\/employee-assignments\/assignments\.store\.ts$/,
					),
				}),
			]),
		);
	}, 30_000);

	it("keeps package source independent from apps and peer ERP implementations", () => {
		const violations = listTypeScriptFiles(srcRoot).flatMap((file) =>
			listModuleSpecifiers(file)
				.filter((specifier) => {
					if (specifier.startsWith(".")) {
						const target = path.resolve(path.dirname(file), specifier);
						const fromPackage = relative(packageRoot, target);
						return fromPackage.startsWith("..") || path.isAbsolute(fromPackage);
					}
					return (
						specifier === "next" ||
						specifier.startsWith("next/") ||
						specifier.startsWith("@/") ||
						specifier.startsWith("apps/") ||
						/^@afenda\/(?:master-data|sales|purchasing|inventory|receiving|fulfillment|receivables|payables|payments|accounting|human-resources|corporate-administration)(?:\/|$)/.test(
							specifier,
						)
					);
				})
				.map((specifier) => ({
					file: relative(packageRoot, file).replaceAll("\\", "/"),
					specifier,
				})),
		);

		expect(violations).toEqual([]);
	});

	it("adopts registered Audit and Events capabilities through package roots", () => {
		const imports = listTypeScriptFiles(srcRoot).flatMap((file) =>
			listModuleSpecifiers(file).map((specifier) => ({
				file: relative(packageRoot, file).replaceAll("\\", "/"),
				specifier,
			})),
		);
		const capabilityImports = imports.filter(({ specifier }) =>
			/^@afenda\/(?:audit|events)(?:\/|$)/.test(specifier),
		);
		const violations = capabilityImports.filter(
			({ specifier }) =>
				specifier !== "@afenda/audit" &&
				specifier !== "@afenda/events" &&
				specifier !== "@afenda/events/schemas",
		);

		expect(capabilityImports).toContainEqual({
			file: "src/composition/production/ports.ts",
			specifier: "@afenda/audit",
		});
		expect(capabilityImports).toContainEqual({
			file: "src/composition/production/ports.ts",
			specifier: "@afenda/events",
		});
		expect(violations).toEqual([]);
	});

	it("enforces feature-first ownership across every payroll farm", () => {
		const allowedRoots = [
			"composition",
			"facade",
			"features",
			"index.ts",
			"kernel",
			"testing",
		] as const;
		expect(readdirSync(srcRoot).toSorted()).toEqual(
			[...allowedRoots].toSorted(),
		);

		const requiredFeatures = [
			"calculation",
			"employee-assignments",
			"payroll-runs",
			"payroll-setup",
			"payslips",
			"privacy",
			"reconciliation",
			"settlement-ingress",
			"statutory-rules",
			"variable-inputs",
			"workforce-ingress",
		] as const;
		const featuresRoot = join(srcRoot, "features");
		expect(readdirSync(featuresRoot).toSorted()).toEqual(
			[...requiredFeatures].toSorted(),
		);

		const violations = listTypeScriptFiles(featuresRoot).flatMap((file) => {
			const source = readFileSync(file, "utf8");
			const upwardImports = listModuleSpecifiers(file).filter((specifier) => {
				if (!specifier.startsWith(".")) {
					return false;
				}
				const target = path.resolve(path.dirname(file), specifier);
				return ["composition", "facade", "testing"].some((root) =>
					target.startsWith(join(srcRoot, root)),
				);
			});
			return [
				...upwardImports.map((specifier) => ({
					file: relative(packageRoot, file).replaceAll("\\", "/"),
					violation: specifier,
				})),
				...(/\b(?:PayrollStore|MemoryPayrollStoreState)\b/.test(source)
					? [
							{
								file: relative(packageRoot, file).replaceAll("\\", "/"),
								violation: "broad-store",
							},
						]
					: []),
			];
		});
		expect(violations).toEqual([]);
	});
});

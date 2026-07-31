/**
 * @afenda/config repository boundary
 * Contract: CONFIG-KERNEL-001
 * Protected target changes require compatibility checks.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = resolve(SCRIPT_DIRECTORY, "..");
const CONFIG_PACKAGE = "packages/foundation/config";
const PERMANENT_EXPORTS = new Set([
	"./biome.json",
	"./tsconfig/base.json",
	"./tsconfig/nextjs.json",
	"./tsconfig/node-library.json",
	"./tsconfig/react-library.json",
]);
const SOURCE_ROOTS = ["apps", "e2e", "packages", "scripts", "testing"];
const SOURCE_EXTENSIONS = new Set([
	".cts",
	".js",
	".mjs",
	".mts",
	".ts",
	".tsx",
]);
const SKIPPED_DIRECTORIES = new Set([
	".git",
	".next",
	".turbo",
	"build",
	"coverage",
	"dist",
	"node_modules",
]);

function toPosix(value) {
	return value.replaceAll("\\", "/");
}

function readJson(file, violations) {
	try {
		return JSON.parse(readFileSync(file, "utf8"));
	} catch (error) {
		violations.push(
			`${toPosix(file)}: invalid JSON (${error instanceof Error ? error.message : String(error)})`,
		);
	}
}

function walk(directory, visit) {
	let entries;
	try {
		entries = readdirSync(directory);
	} catch {
		return;
	}
	for (const name of entries) {
		if (SKIPPED_DIRECTORIES.has(name)) {
			continue;
		}
		const file = join(directory, name);
		const stats = statSync(file);
		if (stats.isDirectory()) {
			walk(file, visit);
		} else if (stats.isFile()) {
			visit(file);
		}
	}
}

function configSpecifier(node) {
	if (
		ts.isImportDeclaration(node) ||
		ts.isExportDeclaration(node) ||
		ts.isImportEqualsDeclaration(node)
	) {
		let expression;
		if (ts.isImportEqualsDeclaration(node)) {
			expression = ts.isExternalModuleReference(node.moduleReference)
				? node.moduleReference.expression
				: undefined;
		} else {
			expression = node.moduleSpecifier;
		}
		return expression && ts.isStringLiteral(expression)
			? expression.text
			: undefined;
	}
	if (!ts.isCallExpression(node) || node.arguments.length === 0) {
		return;
	}
	const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
	const isRequire =
		ts.isIdentifier(node.expression) && node.expression.text === "require";
	const [argument] = node.arguments;
	return (isDynamicImport || isRequire) &&
		argument &&
		ts.isStringLiteral(argument)
		? argument.text
		: undefined;
}

function checkSource(file, root, violations) {
	const relativeFile = toPosix(relative(root, file));
	if (relativeFile.startsWith(`${CONFIG_PACKAGE}/`)) {
		return;
	}
	const source = ts.createSourceFile(
		file,
		readFileSync(file, "utf8"),
		ts.ScriptTarget.Latest,
		true,
	);
	function visit(node) {
		const specifier = configSpecifier(node);
		if (
			specifier === "@afenda/config" ||
			specifier?.startsWith("@afenda/config/")
		) {
			violations.push(
				`${relativeFile}: runtime @afenda/config reference ${specifier}`,
			);
		}
		ts.forEachChild(node, visit);
	}
	visit(source);
}

function checkPackageManifest(file, root, violations) {
	const manifest = readJson(file, violations);
	if (manifest?.dependencies?.["@afenda/config"] !== undefined) {
		violations.push(
			`${toPosix(relative(root, file))}: @afenda/config must be a devDependency`,
		);
	}
}

function checkConfigPackage(root, violations) {
	const packageFile = join(root, CONFIG_PACKAGE, "package.json");
	const manifest = readJson(packageFile, violations);
	const exports = manifest?.exports ?? {};
	const exportKeys = Object.keys(exports);
	for (const exportPath of exportKeys) {
		if (!PERMANENT_EXPORTS.has(exportPath)) {
			violations.push(
				`${CONFIG_PACKAGE}/package.json: prohibited export ${exportPath}`,
			);
		}
		if (exports[exportPath] !== exportPath) {
			violations.push(
				`${CONFIG_PACKAGE}/package.json: export ${exportPath} must target itself`,
			);
		}
	}
	for (const exportPath of PERMANENT_EXPORTS) {
		if (exports[exportPath] !== exportPath) {
			violations.push(
				`${CONFIG_PACKAGE}/package.json: missing export ${exportPath}`,
			);
		}
	}
}

export function checkConfigBoundary(root) {
	const violations = [];
	checkConfigPackage(root, violations);
	for (const sourceRoot of SOURCE_ROOTS) {
		walk(join(root, sourceRoot), (file) => {
			if (extname(file) === ".json" && file.endsWith("package.json")) {
				checkPackageManifest(file, root, violations);
			}
			if (SOURCE_EXTENSIONS.has(extname(file))) {
				checkSource(file, root, violations);
			}
		});
	}
	return violations.toSorted();
}

function main() {
	const violations = checkConfigBoundary(REPOSITORY_ROOT);
	if (violations.length > 0) {
		console.error("check-config-boundary: FAIL");
		for (const violation of violations) {
			console.error(`  - ${violation}`);
		}
		process.exitCode = 1;
		return;
	}
	console.log("check-config-boundary: ok");
}

const entryFile = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (entryFile && import.meta.url === pathToFileURL(entryFile).href) {
	main();
}

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "../../../..");
export const PROTECTION_FILE_NAME = ".protected.sha256";
export const EDIT_TOKEN_ENV = "AFENDA_PROTECTED_EDIT_TOKEN";

const INCLUDED_ROOT_FILES = new Set(["package.json", "README.md", "tsconfig.json"]);
const CONFIG_PACKAGE_ROOT_FILES = new Set(["biome.json"]);
const INCLUDED_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".json",
	".md",
	".mdx",
	".css",
]);
const INCLUDED_DIRECTORIES = new Set(["src", "__tests__", "test"]);
const CONFIG_PACKAGE_DIRECTORIES = new Set(["tsconfig"]);
const HEADER_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const HEADER_SCAN_LINES = 8;

export function resolvePackageRoot(inputPath = ".") {
	const resolved = path.resolve(process.cwd(), inputPath);
	const relative = path.relative(repoRoot, resolved);

	if (
		relative.startsWith("..") ||
		path.isAbsolute(relative) ||
		relative.length === 0
	) {
		throw new Error(`Package path must be inside the repository: ${inputPath}`);
	}

	return resolved;
}

export function protectionFilePathFor(packageRoot) {
	return path.join(packageRoot, PROTECTION_FILE_NAME);
}

async function readDotenvToken() {
	const envPath = path.join(repoRoot, ".env.local");
	const content = await readFile(envPath, "utf8").catch(() => undefined);
	if (content === undefined) {
		return undefined;
	}

	for (const line of content.split(/\r?\n/u)) {
		const trimmed = line.trim();
		if (trimmed.length === 0 || trimmed.startsWith("#")) {
			continue;
		}

		const separatorIndex = trimmed.indexOf("=");
		if (separatorIndex < 0) {
			continue;
		}

		const key = trimmed.slice(0, separatorIndex).trim();
		if (key !== EDIT_TOKEN_ENV) {
			continue;
		}

		return trimmed.slice(separatorIndex + 1).trim();
	}

	return undefined;
}

export async function assertEditToken() {
	const token = process.env[EDIT_TOKEN_ENV];
	if (typeof token === "string" && token.trim().length > 0) {
		return;
	}

	const dotenvToken = await readDotenvToken();
	if (typeof dotenvToken === "string" && dotenvToken.trim().length > 0) {
		return;
	}

	throw new Error(
		`Refusing to update package protection without ${EDIT_TOKEN_ENV}. Set it locally in .env.local or the current shell for intentional edits.`,
	);
}

async function collectFiles(packageRoot, directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];
	const isConfigPackage = path.relative(repoRoot, packageRoot).replaceAll(path.sep, "/") ===
		"packages/foundation/config";

	for (const entry of entries) {
		const fullPath = path.join(directory, entry.name);
		const relativePath = path.relative(packageRoot, fullPath).replaceAll(path.sep, "/");
		const topLevel = relativePath.split("/")[0];

		if (entry.isDirectory()) {
			if (
				INCLUDED_DIRECTORIES.has(topLevel) ||
				(isConfigPackage && CONFIG_PACKAGE_DIRECTORIES.has(topLevel))
			) {
				files.push(...(await collectFiles(packageRoot, fullPath)));
			}
			continue;
		}

		if (!entry.isFile() || entry.name === PROTECTION_FILE_NAME) {
			continue;
		}

		const isRootFile =
			!relativePath.includes("/") &&
			(INCLUDED_ROOT_FILES.has(entry.name) ||
				(isConfigPackage && CONFIG_PACKAGE_ROOT_FILES.has(entry.name)));
		const isIncludedFile =
			INCLUDED_DIRECTORIES.has(topLevel) &&
			INCLUDED_EXTENSIONS.has(path.extname(entry.name));
		const isConfigPackageFile =
			isConfigPackage &&
			CONFIG_PACKAGE_DIRECTORIES.has(topLevel) &&
			INCLUDED_EXTENSIONS.has(path.extname(entry.name));

		if (isRootFile || isIncludedFile || isConfigPackageFile) {
			files.push(fullPath);
		}
	}

	return files;
}

async function hashFile(filePath) {
	const content = await readFile(filePath);
	return createHash("sha256").update(content).digest("hex");
}

function shouldRequireProtectionHeader(packageRoot, filePath) {
	const relativePath = path.relative(packageRoot, filePath).replaceAll(path.sep, "/");
	const topLevel = relativePath.split("/")[0];
	return (
		INCLUDED_DIRECTORIES.has(topLevel) &&
		HEADER_EXTENSIONS.has(path.extname(filePath))
	);
}

async function readPackageName(packageRoot) {
	const packageJsonPath = path.join(packageRoot, "package.json");
	const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
	if (typeof packageJson.name !== "string" || packageJson.name.trim().length === 0) {
		throw new Error(`${path.relative(repoRoot, packageJsonPath)} must define a package name.`);
	}
	return packageJson.name;
}

function hasProtectionHeader(content, packageName) {
	const header = content.split(/\r?\n/u).slice(0, HEADER_SCAN_LINES).join("\n");
	return (
		header.startsWith("/**") &&
		header.includes(`* ${packageName}`) &&
		header.includes("* Contract:") &&
		header.includes("* Protected:")
	);
}

export async function assertProtectedHeaders(packageRoot) {
	const packageName = await readPackageName(packageRoot);
	const files = (await collectFiles(packageRoot, packageRoot)).filter((file) =>
		shouldRequireProtectionHeader(packageRoot, file),
	);
	const missing = [];

	for (const file of files) {
		const content = await readFile(file, "utf8");
		if (!hasProtectionHeader(content, packageName)) {
			missing.push(path.relative(repoRoot, file).replaceAll(path.sep, "/"));
		}
	}

	if (missing.length > 0) {
		throw new Error(
			[
				`${path.relative(repoRoot, packageRoot)} has protected source files without the required header:`,
				...missing.map((file) => `- ${file}`),
			].join("\n"),
		);
	}
}

export async function packageProtectionHash(packageRoot) {
	const files = (await collectFiles(packageRoot, packageRoot)).sort((left, right) =>
		path
			.relative(packageRoot, left)
			.localeCompare(path.relative(packageRoot, right)),
	);
	const hash = createHash("sha256");

	for (const file of files) {
		const relativePath = path.relative(packageRoot, file).replaceAll(path.sep, "/");
		hash.update(`${relativePath}\0${await hashFile(file)}\n`);
	}

	return `${hash.digest("hex")}\n`;
}

/**
 * Discover living ERP packages and their module-manifest paths for validate-modules.
 * Replaces the retired turbo/generators ERP manifest authority surface.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ERP_ROOT = "packages/erp";
const CANONICAL_MANIFEST_PATH = "src/composition/module.manifest.ts";
const HISTORICAL_MANIFEST_PATH = "src/module.manifest.ts";
const AUTHORIZATION_CANDIDATES = Object.freeze([
	"src/authorization.ts",
	"src/kernel/authorization/contextual-authorization.ts",
	"src/kernel/authorization/authorization.ts",
	"src/kernel/execution/authorization.ts",
]);

/**
 * @param {string} packageName
 * @returns {string}
 */
const toManifestExportName = (packageName) => {
	const moduleName = packageName.replace(/^@afenda\//, "");
	const [firstSegment = "", ...remainingSegments] = moduleName.split("-");
	const suffix = remainingSegments
		.map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
		.join("");
	return `${firstSegment}${suffix}ModuleManifest`;
};

/**
 * @param {string} packageDir
 * @returns {string | null}
 */
const findAuthorizationPath = (packageDir) => {
	for (const candidate of AUTHORIZATION_CANDIDATES) {
		if (existsSync(join(packageDir, candidate))) {
			return candidate;
		}
	}
	return null;
};

/**
 * @param {string} repositoryRoot
 * @returns {Promise<readonly {
 *   authorizationPath: string | null,
 *   dir: string,
 *   id: string,
 *   manifestExport: string,
 *   manifestPath: string,
 *   packageName: string,
 *   state: "canonical" | "historical" | "missing" | "duplicate-identical" | "duplicate-conflict",
 * }[]>}
 */
export const listErpManifestPackageAuthority = (repositoryRoot) => {
	const erpRoot = join(repositoryRoot, ERP_ROOT);
	if (!(existsSync(erpRoot) && statSync(erpRoot).isDirectory())) {
		return Object.freeze([]);
	}

	/** @type {Array<{
	 *   authorizationPath: string | null,
	 *   dir: string,
	 *   id: string,
	 *   manifestExport: string,
	 *   manifestPath: string,
	 *   packageName: string,
	 *   state: "canonical" | "historical" | "missing" | "duplicate-identical" | "duplicate-conflict",
	 * }>} */
	const packages = [];
	/** @type {string[]} */
	const blocked = [];

	for (const entry of readdirSync(erpRoot, { withFileTypes: true })) {
		if (!entry.isDirectory()) {
			continue;
		}
		const packagePath = `${ERP_ROOT}/${entry.name}`;
		const absolutePackagePath = join(repositoryRoot, packagePath);
		const packageJsonPath = join(absolutePackagePath, "package.json");
		if (!existsSync(packageJsonPath)) {
			continue;
		}
		const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
		const packageName =
			typeof packageJson.name === "string" ? packageJson.name : null;
		if (packageName === null || !packageName.startsWith("@afenda/")) {
			continue;
		}

		const hasCanonical = existsSync(
			join(absolutePackagePath, CANONICAL_MANIFEST_PATH),
		);
		const hasHistorical = existsSync(
			join(absolutePackagePath, HISTORICAL_MANIFEST_PATH),
		);

		/** @type {"canonical" | "historical" | "missing" | "duplicate-identical" | "duplicate-conflict"} */
		let state;
		/** @type {string | null} */
		let manifestPath = null;

		if (hasCanonical && hasHistorical) {
			const canonical = readFileSync(
				join(absolutePackagePath, CANONICAL_MANIFEST_PATH),
				"utf8",
			);
			const historical = readFileSync(
				join(absolutePackagePath, HISTORICAL_MANIFEST_PATH),
				"utf8",
			);
			const normalizedHistorical = historical.replaceAll(
				/(from\s+["'])\.\//g,
				"$1../",
			);
			state =
				canonical === normalizedHistorical
					? "duplicate-identical"
					: "duplicate-conflict";
			manifestPath = CANONICAL_MANIFEST_PATH;
			if (state === "duplicate-conflict") {
				blocked.push(`${packagePath}:${state}`);
			}
		} else if (hasCanonical) {
			state = "canonical";
			manifestPath = CANONICAL_MANIFEST_PATH;
		} else if (hasHistorical) {
			state = "historical";
			manifestPath = HISTORICAL_MANIFEST_PATH;
		} else {
			state = "missing";
			blocked.push(`${packagePath}:${state}`);
		}

		if (manifestPath === null) {
			continue;
		}

		packages.push({
			id: packageName.replace(/^@afenda\//, ""),
			packageName,
			dir: packagePath,
			manifestPath,
			manifestExport: toManifestExportName(packageName),
			authorizationPath: findAuthorizationPath(absolutePackagePath),
			state,
		});
	}

	if (blocked.length > 0) {
		throw new Error(`ERP manifest authority is blocked: ${blocked.join(", ")}`);
	}

	packages.sort((left, right) => left.dir.localeCompare(right.dir));
	return Object.freeze(packages.map((entry) => Object.freeze(entry)));
};

/**
 * pnpm validate:modules — Phase 2 module governance entrypoint.
 *
 * Usage:
 *   pnpm validate:modules
 *   pnpm validate:modules --write
 *   pnpm validate:modules --fixtures
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	LIVING_ERP_MANIFEST_PACKAGES,
	loadRoadmapModules,
	SCHEMA_SYMBOL_TO_TABLE,
	validateCandidatePackagesAbsent,
	validateCommandsQueries,
	validateDeepImports,
	validateDependencyDag,
	validateErpAuthorizationPorts,
	validateEventContracts,
	validateEvents,
	validateCatalogDiskParity,
	validateForeignSchemaImports,
	validateMetricsImports,
	validateModuleIdentity,
	validateModuleReferences,
	validateMutationTablesExist,
	validatePermissions,
	validatePersistenceOwnership,
	validateSoleMutatorBoundary,
	validateWorkspaceEdges,
} from "./validate-modules/checks.mjs";
import {
	buildGeneratedRegisters,
	diffGeneratedRegisters,
} from "./validate-modules/generate-registers.mjs";
import { runNegativeFixtures } from "./validate-modules/negative-fixtures.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const modulesDir = join(root, "docs-V2", "modules");
const write = process.argv.includes("--write");
const fixturesOnly = process.argv.includes("--fixtures");

/**
 * @param {string} message
 * @param {number} code
 */
function fail(message, code = 1) {
	console.error(`validate:modules FAIL: ${message}`);
	process.exit(code);
}

async function loadLivingManifests() {
	/** @type {import("../packages/data-plane/db/src/module-manifest-contract.ts").AfendaModuleManifest[]} */
	const manifests = [];
	for (const meta of LIVING_ERP_MANIFEST_PACKAGES) {
		const manifestPath = join(root, meta.dir, "src", "module.manifest.ts");
		if (!existsSync(manifestPath)) {
			fail(`missing manifest: ${meta.dir}/src/module.manifest.ts`);
		}
		const mod = await import(pathToFileURL(manifestPath).href);
		const manifest = mod[meta.manifestExport];
		if (!manifest || typeof manifest !== "object") {
			fail(
				`manifest export ${meta.manifestExport} missing from ${meta.dir}/src/module.manifest.ts`,
			);
		}
		manifests.push(manifest);
	}
	return manifests;
}

async function loadPlatformPermissionCodes() {
	const catalogPath = join(
		root,
		"packages",
		"data-plane",
		"db",
		"src",
		"platform-permission-catalog.ts",
	);
	const mod = await import(pathToFileURL(catalogPath).href);
	return new Set(mod.PLATFORM_PERMISSION_CODES_V1);
}

async function main() {
	if (fixturesOnly) {
		const result = runNegativeFixtures();
		if (!result.ok) {
			fail(result.message);
		}
		console.log(result.message);
		return;
	}

	const manifests = await loadLivingManifests();
	const platformCodes = await loadPlatformPermissionCodes();
	const roadmap = loadRoadmapModules(
		join(modulesDir, "MODULE-ROADMAP.yaml"),
	);
	const knownTables = new Set(Object.values(SCHEMA_SYMBOL_TO_TABLE));
	const eventsMod = await import(
		pathToFileURL(join(root, "packages/data-plane/events/src/schemas/index.ts")).href
	);
	const knownEvents = new Set(Object.keys(eventsMod.AllEventSchemas));

	/** @type {string[]} */
	const errors = [];

	errors.push(...validateModuleIdentity(manifests));
	errors.push(...validatePersistenceOwnership(manifests));
	errors.push(...validateMutationTablesExist(manifests, knownTables));
	errors.push(...validateCommandsQueries(manifests));
	errors.push(...validateEvents(manifests));
	errors.push(...validateEventContracts(manifests, knownEvents));
	errors.push(...validatePermissions(manifests, platformCodes));
	errors.push(...validateModuleReferences(manifests, roadmap));
	errors.push(...validateDependencyDag(manifests));
	errors.push(
		...validateWorkspaceEdges(
			root,
			join(modulesDir, "WORKSPACE-EDGE-REGISTER.yaml"),
		),
	);
	errors.push(...validateDeepImports(root));
	errors.push(...validateMetricsImports(root));
	errors.push(...validateForeignSchemaImports(root, manifests));
	errors.push(
		...validateSoleMutatorBoundary(
			root,
			manifests,
			join(modulesDir, "SCHEMA-OWNERSHIP-MANIFEST.yaml"),
		),
	);
	errors.push(...validateCatalogDiskParity(root));
	errors.push(...validateErpAuthorizationPorts(root));
	errors.push(...validateCandidatePackagesAbsent(root, roadmap));

	const rendered = buildGeneratedRegisters(manifests, modulesDir, { write });
	errors.push(
		...diffGeneratedRegisters(modulesDir, rendered, (path) => {
			if (!existsSync(path)) {
				return null;
			}
			return readFileSync(path, "utf8");
		}),
	);

	const fixtureResult = runNegativeFixtures();
	if (!fixtureResult.ok) {
		errors.push(fixtureResult.message);
	}

	if (errors.length > 0) {
		for (const error of errors) {
			console.error(` - ${error}`);
		}
		fail(`${errors.length} gate(s) failed`);
	}

	console.log("validate:modules OK");
	console.log(
		` manifests: ${manifests.map((m) => m.id).join(", ")}`,
	);
	console.log(
		` generated registers: ${Object.keys(rendered).length} files${write ? " (written)" : " (matched)"}`,
	);
	console.log(` negative fixtures: ${fixtureResult.message}`);
}

main().catch((error) => {
	fail(error instanceof Error ? error.message : String(error));
});

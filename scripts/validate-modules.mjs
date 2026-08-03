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
import { database } from "@afenda/db";
import {
	loadLivingErpManifestPackages,
	loadRoadmapModules,
	SCHEMA_SYMBOL_TO_TABLE,
	validateCandidatePackagesAbsent,
	validateCatalogDiskParity,
	validateCommandsQueries,
	validateDeepImports,
	validateDependencyDag,
	validateErpAuthorizationPorts,
	validateEventContracts,
	validateEvents,
	validateForeignSchemaImports,
	validateMetricsImports,
	validateModuleIdentity,
	validateModuleReferences,
	validateMutationTablesExist,
	validateOpenApiImports,
	validatePermissions,
	validatePersistenceOwnership,
	validateSchemaPrefixReservations,
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

if (!(fixturesOnly || existsSync(modulesDir))) {
	console.log(
		"validate:modules: skipped — docs-V2 removed, no module roadmap to validate",
	);
	process.exit(0);
}

/**
 * @param {string} message
 * @param {number} code
 */
function fail(message, code = 1) {
	console.error(`validate:modules FAIL: ${message}`);
	process.exit(code);
}

async function loadLivingManifests(erpPackages) {
	const entries = erpPackages.map((meta) => ({
		meta,
		manifestPath: join(root, meta.dir, meta.manifestPath),
	}));
	for (const entry of entries) {
		if (!existsSync(entry.manifestPath)) {
			fail(`missing manifest: ${entry.meta.dir}/${entry.meta.manifestPath}`);
		}
	}
	const modules = await Promise.all(
		entries.map((entry) => import(pathToFileURL(entry.manifestPath).href)),
	);

	return modules.map((mod, index) => {
		const { meta } = entries[index];
		const manifest = mod[meta.manifestExport];
		if (!manifest || typeof manifest !== "object") {
			fail(
				`manifest export ${meta.manifestExport} missing from ${meta.dir}/${meta.manifestPath}`,
			);
		}
		return manifest;
	});
}

function loadPlatformPermissionCodes() {
	return new Set(database.permissions.codes);
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

	const erpPackages = await loadLivingErpManifestPackages(root);
	const manifests = await loadLivingManifests(erpPackages);
	const platformCodes = loadPlatformPermissionCodes();
	const roadmap = loadRoadmapModules(join(modulesDir, "MODULE-ROADMAP.yaml"));
	const knownTables = new Set(Object.values(SCHEMA_SYMBOL_TO_TABLE));
	// Declared entrypoint, not internal source. `@afenda/events` exports
	// `./schemas` for exactly this file — resolving it by path bypassed the
	// exports map and was invisible to static import checks.
	const eventsMod = await import("@afenda/events/schemas");
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
			erpPackages,
		),
	);
	errors.push(...validateDeepImports(root));
	errors.push(...validateMetricsImports(root));
	errors.push(...validateOpenApiImports(root));
	errors.push(...validateForeignSchemaImports(root, manifests, erpPackages));
	errors.push(
		...validateSoleMutatorBoundary(
			root,
			manifests,
			join(modulesDir, "SCHEMA-OWNERSHIP-MANIFEST.yaml"),
		),
	);
	errors.push(
		...validateSchemaPrefixReservations(
			manifests,
			join(modulesDir, "SCHEMA-OWNERSHIP-MANIFEST.yaml"),
		),
	);
	errors.push(...validateCatalogDiskParity(root));
	errors.push(...validateErpAuthorizationPorts(root, manifests, erpPackages));
	errors.push(...validateCandidatePackagesAbsent(root, roadmap, erpPackages));

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
	console.log(` manifests: ${manifests.map((m) => m.id).join(", ")}`);
	console.log(
		` generated registers: ${Object.keys(rendered).length} files${write ? " (written)" : " (matched)"}`,
	);
	console.log(` negative fixtures: ${fixtureResult.message}`);
}

main().catch((error) => {
	fail(error instanceof Error ? error.message : String(error));
});

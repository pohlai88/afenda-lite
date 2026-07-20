/**
 * Negative fixtures — each Phase 2 stop gate must fail intentionally.
 * Prefer calling real validators; synthetic strings only when the gate needs
 * a hostile on-disk tree that Living checkout must not contain.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	diffGeneratedRegisters,
} from "./generate-registers.mjs";
import {
	reconcileWorkspaceEdges,
	validateCandidatePackagesAbsent,
	validateCommandsQueries,
	validateDeepImports,
	validateDependencyDag,
	validateErpAuthorizationPorts,
	validateEventContracts,
	validateEvents,
	validateForeignSchemaImports,
	validateModuleIdentity,
	validateModuleReferences,
	validateMutationTablesExist,
	validatePermissions,
	validatePersistenceOwnership,
} from "./checks.mjs";

/**
 * @returns {{ ok: boolean, message: string, matrix: { gate: string, expected: string, actual: string[] }[] }}
 */
export function runNegativeFixtures() {
	/** @type {{ gate: string, expected: string, actual: string[] }[]} */
	const matrix = [];
	/** @type {string[]} */
	const misses = [];

	/**
	 * @param {string} gate
	 * @param {string} expectedSubstring
	 * @param {string[]} actual
	 */
	function expectFail(gate, expectedSubstring, actual) {
		const hit = actual.some((line) => line.includes(expectedSubstring));
		matrix.push({ gate, expected: expectedSubstring, actual });
		if (!hit) {
			return `negative fixture missed for ${gate}: expected "${expectedSubstring}", got [${actual.join("; ")}]`;
		}
		return null;
	}

	misses.push(
		expectFail(
			"duplicate module id",
			"duplicate module id: sales",
			validateModuleIdentity([
				baseManifest({ id: "sales", packageName: "@afenda/sales" }),
				baseManifest({ id: "sales", packageName: "@afenda/sales-dup" }),
			]),
		) ?? "",
	);

	misses.push(
		expectFail(
			"duplicate mutation-table authority",
			"duplicate mutation-table authority: sales_order",
			validatePersistenceOwnership([
				baseManifest({
					id: "sales",
					packageName: "@afenda/sales",
					mutationTables: ["sales_order"],
				}),
				baseManifest({
					id: "master-data",
					packageName: "@afenda/master-data",
					mutationTables: ["sales_order"],
				}),
			]),
		) ?? "",
	);

	misses.push(
		expectFail(
			"mutation table missing from DDL",
			"mutation table missing from @afenda/db DDL: not_a_real_table",
			validateMutationTablesExist(
				[
					baseManifest({
						id: "sales",
						packageName: "@afenda/sales",
						mutationTables: ["not_a_real_table"],
					}),
				],
				new Set(["sales_order"]),
			),
		) ?? "",
	);

	misses.push(
		expectFail(
			"duplicate command id",
			"duplicate command id: shared.cmd",
			validateCommandsQueries([
				baseManifest({
					id: "sales",
					packageName: "@afenda/sales",
					commands: ["shared.cmd"],
					authorizationCommands: { "shared.cmd": "sales.manage" },
					permissions: ["sales.manage"],
				}),
				baseManifest({
					id: "master-data",
					packageName: "@afenda/master-data",
					commands: ["shared.cmd"],
					authorizationCommands: { "shared.cmd": "master_data.manage" },
					permissions: ["master_data.manage"],
				}),
			]),
		) ?? "",
	);

	misses.push(
		expectFail(
			"duplicate query id",
			"duplicate query id: shared.q",
			validateCommandsQueries([
				baseManifest({
					id: "sales",
					packageName: "@afenda/sales",
					queries: ["shared.q"],
					authorizationQueries: { "shared.q": "sales.read" },
					permissions: ["sales.read"],
				}),
				baseManifest({
					id: "master-data",
					packageName: "@afenda/master-data",
					queries: ["shared.q"],
					authorizationQueries: { "shared.q": "master_data.read" },
					permissions: ["master_data.read"],
				}),
			]),
		) ?? "",
	);

	misses.push(
		expectFail(
			"duplicate event id",
			"duplicate event id: shared.event.v1",
			validateEvents([
				baseManifest({
					id: "sales",
					packageName: "@afenda/sales",
					emits: ["shared.event.v1"],
				}),
				baseManifest({
					id: "master-data",
					packageName: "@afenda/master-data",
					emits: ["shared.event.v1"],
				}),
			]),
		) ?? "",
	);

	misses.push(
		expectFail(
			"emitted event not in contracts",
			"emitted event not in @afenda/events contracts: sales.unknown.v1",
			validateEventContracts(
				[
					baseManifest({
						id: "sales",
						packageName: "@afenda/sales",
						emits: ["sales.unknown.v1"],
					}),
				],
				new Set(["sales.order.created.v1"]),
			),
		) ?? "",
	);

	misses.push(
		expectFail(
			"duplicate permission code",
			"duplicate permission code: sales.read",
			validatePermissions(
				[
					baseManifest({
						id: "sales",
						packageName: "@afenda/sales",
						permissions: ["sales.read"],
					}),
					baseManifest({
						id: "master-data",
						packageName: "@afenda/master-data",
						permissions: ["sales.read"],
					}),
				],
				new Set(["sales.read"]),
			),
		) ?? "",
	);

	misses.push(
		expectFail(
			"unresolved moduleId",
			"unresolved moduleId: does-not-exist",
			validateModuleReferences(
				[
					baseManifest({
						id: "sales",
						packageName: "@afenda/sales",
						required: ["does-not-exist"],
					}),
				],
				[{ id: "inventory" }],
			),
		) ?? "",
	);

	misses.push(
		expectFail(
			"public ERP operation without authorization mapping",
			"public ERP operation without authorization mapping: command sales.order.create",
			validateCommandsQueries([
				baseManifest({
					id: "sales",
					packageName: "@afenda/sales",
					commands: ["sales.order.create"],
					authorizationCommands: {},
					permissions: ["sales.manage"],
				}),
			]),
		) ?? "",
	);

	misses.push(
		expectFail(
			"DAG cycle",
			"DAG cycle involving moduleId",
			validateDependencyDag([
				baseManifest({
					id: "sales",
					packageName: "@afenda/sales",
					required: ["master-data"],
				}),
				baseManifest({
					id: "master-data",
					packageName: "@afenda/master-data",
					required: ["sales"],
				}),
			]),
		) ?? "",
	);

	const tmpRoot = mkdtempSync(join(tmpdir(), "afenda-validate-modules-"));
	try {
		mkdirSync(join(tmpRoot, "packages", "inventory"), { recursive: true });
		misses.push(
			expectFail(
				"candidate module represented as an on-disk package",
				"candidate module represented as an on-disk package: packages/inventory",
				validateCandidatePackagesAbsent(tmpRoot, [{ id: "inventory" }]),
			) ?? "",
		);

		mkdirSync(join(tmpRoot, "packages", "erp", "sales", "src"), {
			recursive: true,
		});
		writeFileSync(
			join(tmpRoot, "packages", "erp", "sales", "src", "bad.ts"),
			`import { x } from "@afenda/master-data/src/party";\n`,
			"utf8",
		);
		misses.push(
			expectFail(
				"deep @afenda/*/src/* import",
				"deep @afenda/*/src/* import",
				validateDeepImports(tmpRoot),
			) ?? "",
		);

		writeFileSync(
			join(tmpRoot, "packages", "erp", "sales", "src", "foreign.ts"),
			`import { mdParty } from "@afenda/db";\n`,
			"utf8",
		);
		misses.push(
			expectFail(
				"foreign DB schema write-surface import",
				"foreign DB schema write-surface import",
				validateForeignSchemaImports(tmpRoot, [
					baseManifest({
						id: "sales",
						packageName: "@afenda/sales",
						mutationTables: ["sales_order"],
					}),
					baseManifest({
						id: "master-data",
						packageName: "@afenda/master-data",
						mutationTables: ["md_party"],
					}),
				]),
			) ?? "",
		);

		mkdirSync(join(tmpRoot, "packages", "erp", "master-data", "src"), {
			recursive: true,
		});
		mkdirSync(join(tmpRoot, "apps", "web", "lib", "erp"), {
			recursive: true,
		});
		misses.push(
			expectFail(
				"missing ERP authorization port",
				"missing ERP authorization",
				validateErpAuthorizationPorts(tmpRoot),
			) ?? "",
		);
	} finally {
		rmSync(tmpRoot, { recursive: true, force: true });
	}

	misses.push(
		expectFail(
			"undeclared workspace dependency",
			"undeclared workspace dependency: @afenda/sales→@afenda/purchasing",
			reconcileWorkspaceEdges({
				approved: ["@afenda/sales→@afenda/master-data"],
				realized: new Map([
					[
						"@afenda/sales",
						new Set(["@afenda/master-data", "@afenda/purchasing"]),
					],
				]),
				erpPackages: ["@afenda/sales", "@afenda/master-data"],
				governedOnly: true,
			}),
		) ?? "",
	);

	misses.push(
		expectFail(
			"approved edge missing from package.json",
			"approved edge missing from package.json: @afenda/sales→@afenda/master-data",
			reconcileWorkspaceEdges({
				approved: ["@afenda/sales→@afenda/master-data"],
				realized: new Map([["@afenda/sales", new Set(["@afenda/db"])]]),
				erpPackages: ["@afenda/sales", "@afenda/master-data"],
				governedOnly: true,
			}),
		) ?? "",
	);

	misses.push(
		expectFail(
			"peer ERP import without approved edge",
			"peer ERP import without approved edge: @afenda/master-data→@afenda/sales",
			reconcileWorkspaceEdges({
				approved: [],
				realized: new Map([
					["@afenda/master-data", new Set(["@afenda/sales"])],
				]),
				erpPackages: ["@afenda/sales", "@afenda/master-data"],
				governedOnly: true,
			}),
		) ?? "",
	);

	misses.push(
		expectFail(
			"manifest/register drift",
			"manifest/register drift",
			diffGeneratedRegisters(
				"/nonexistent",
				{ "MODULE-CATALOG.generated.yaml": "expected\n" },
				() => "actual\n",
			),
		) ?? "",
	);

	const cleanMisses = misses.filter(Boolean);
	if (cleanMisses.length > 0) {
		return { ok: false, message: cleanMisses.join(" | "), matrix };
	}

	return {
		ok: true,
		message: `all ${matrix.length} expected failures proven`,
		matrix,
	};
}

/**
 * @param {{
 *   id: string,
 *   packageName: `@afenda/${string}`,
 *   mutationTables?: string[],
 *   commands?: string[],
 *   queries?: string[],
 *   emits?: string[],
 *   permissions?: string[],
 *   authorizationCommands?: Record<string, string>,
 *   authorizationQueries?: Record<string, string>,
 *   required?: string[],
 * }} input
 */
function baseManifest(input) {
	return {
		id: input.id,
		category: "test",
		packageName: input.packageName,
		band: "R1-F",
		lifecycle: "active",
		activationMode: "core",
		owns: {
			aggregates: [],
			commandNamespace: input.id,
			commands: input.commands ?? [],
			queryNamespace: input.id,
			queries: input.queries ?? [],
		},
		persistence: {
			schemaOwner: "@afenda/db",
			mutationTables: input.mutationTables ?? [],
		},
		events: {
			namespace: input.id,
			emits: input.emits ?? [],
			consumes: [],
		},
		permissions: {
			namespace: input.id,
			codes: input.permissions ?? [],
		},
		authorization: {
			commands: input.authorizationCommands ?? {},
			queries: input.authorizationQueries ?? {},
		},
		moduleDependencies: {
			required: input.required ?? [],
		},
		optionalIntegratesWith: [],
	};
}

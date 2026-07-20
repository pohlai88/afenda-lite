/**
 * Phase 2 module validators — stop gates from packages_refactor_v2.3 / Living monorepo.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parse as parseYaml } from "yaml";

/** @typedef {import("../../packages/data-plane/db/src/module-manifest-contract.ts").AfendaModuleManifest} AfendaModuleManifest */

export const LIVING_ERP_MANIFEST_PACKAGES = [
	{
		id: "master-data",
		packageName: "@afenda/master-data",
		dir: "packages/erp/master-data",
		manifestExport: "masterDataModuleManifest",
	},
	{
		id: "sales",
		packageName: "@afenda/sales",
		dir: "packages/erp/sales",
		manifestExport: "salesModuleManifest",
	},
];

export const FORBIDDEN_PHASE_PACKAGE_DIRS = [
	"purchasing",
	"inventory",
	"receiving",
	"fulfillment",
	"receivables",
	"payables",
	"payments",
	"accounting",
	"module-catalog",
	"authorization",
	"jobs",
	"workflow",
	"transaction-core",
];

/** Dev / tooling workspace deps that dual-control does not govern. */
export const WORKSPACE_EDGE_IGNORE_TO = new Set(["@afenda/config"]);

/** Schema table symbols allowed for platform outbox/audit adapters. */
export const PLATFORM_SCHEMA_SYMBOLS = new Set([
	"platformAuditLog",
	"platformDomainEvent",
	"platformNotification",
	"platformSearchDocument",
	"platformPermission",
	"platformRole",
	"platformRoleAssignment",
	"platformRolePermission",
	"platformRbacAudit",
]);

/** Global reference tables — master-data may read; never claimed as foreign ERP write. */
export const REF_SCHEMA_SYMBOLS = new Set([
	"refCountry",
	"refCurrency",
	"refLanguage",
	"refTimeZone",
	"refUom",
	"refUomDimension",
]);

export const SCHEMA_SYMBOL_TO_TABLE = {
	mdParty: "md_party",
	mdItemGroup: "md_item_group",
	mdItem: "md_item",
	mdWarehouse: "md_warehouse",
	mdPaymentTerm: "md_payment_term",
	mdTaxRegistration: "md_tax_registration",
	mdPartyRole: "md_party_role",
	mdPartyAddress: "md_party_address",
	mdPartyContact: "md_party_contact",
	mdPartyExternalId: "md_party_external_id",
	mdPartyRelationship: "md_party_relationship",
	mdItemUom: "md_item_uom",
	mdItemBarcode: "md_item_barcode",
	mdItemExternalId: "md_item_external_id",
	mdItemAlias: "md_item_alias",
	mdWarehouseExternalId: "md_warehouse_external_id",
	mdItemTemplate: "md_item_template",
	mdItemTemplateAttribute: "md_item_template_attribute",
	mdItemTemplateAttributeOption: "md_item_template_attribute_option",
	mdItemVariant: "md_item_variant",
	mdItemVariantAttributeValue: "md_item_variant_attribute_value",
	mdChangeRequest: "md_change_request",
	salesOrder: "sales_order",
	salesOrderLine: "sales_order_line",
	refCountry: "ref_country",
	refCurrency: "ref_currency",
	refLanguage: "ref_language",
	refTimeZone: "ref_time_zone",
	refUom: "ref_uom",
	refUomDimension: "ref_uom_dimension",
};

/**
 * @param {AfendaModuleManifest[]} manifests
 * @returns {string[]}
 */
export function validateModuleIdentity(manifests) {
	/** @type {string[]} */
	const errors = [];
	const ids = new Map();
	const packages = new Map();
	for (const m of manifests) {
		if (ids.has(m.id)) {
			errors.push(`duplicate module id: ${m.id}`);
		}
		ids.set(m.id, m.packageName);
		if (packages.has(m.packageName)) {
			errors.push(`duplicate packageName: ${m.packageName}`);
		}
		packages.set(m.packageName, m.id);
		if (m.band !== "R1-F") {
			errors.push(`module ${m.id} band must be R1-F (got ${m.band})`);
		}
		const expectedPkg = `@afenda/${m.id}`;
		if (m.packageName !== expectedPkg) {
			errors.push(
				`module ${m.id} packageName mismatch: ${m.packageName} !== ${expectedPkg}`,
			);
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 */
export function validatePersistenceOwnership(manifests) {
	/** @type {string[]} */
	const errors = [];
	const owners = new Map();
	for (const m of manifests) {
		if (m.persistence.schemaOwner !== "@afenda/db") {
			errors.push(
				`module ${m.id} schemaOwner must be @afenda/db (got ${m.persistence.schemaOwner})`,
			);
		}
		for (const table of m.persistence.mutationTables) {
			if (owners.has(table)) {
				errors.push(
					`duplicate mutation-table authority: ${table} (${owners.get(table)} and ${m.id})`,
				);
			} else {
				owners.set(table, m.id);
			}
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 */
export function validateCommandsQueries(manifests) {
	/** @type {string[]} */
	const errors = [];
	const commands = new Map();
	const queries = new Map();
	for (const m of manifests) {
		for (const id of m.owns.commands) {
			if (commands.has(id)) {
				errors.push(
					`duplicate command id: ${id} (${commands.get(id)} and ${m.id})`,
				);
			} else {
				commands.set(id, m.id);
			}
			if (!(id in m.authorization.commands)) {
				errors.push(
					`public ERP operation without authorization mapping: command ${id}`,
				);
			}
		}
		for (const id of m.owns.queries) {
			if (queries.has(id)) {
				errors.push(
					`duplicate query id: ${id} (${queries.get(id)} and ${m.id})`,
				);
			} else {
				queries.set(id, m.id);
			}
			if (!(id in m.authorization.queries)) {
				errors.push(
					`public ERP operation without authorization mapping: query ${id}`,
				);
			}
		}
		for (const [op, permission] of Object.entries(m.authorization.commands)) {
			if (!m.owns.commands.includes(/** @type {never} */ (op))) {
				errors.push(
					`authorization command map references undeclared command: ${op}`,
				);
			}
			if (!m.permissions.codes.includes(/** @type {never} */ (permission))) {
				errors.push(
					`authorization maps to undeclared permission: ${permission} (${op})`,
				);
			}
		}
		for (const [op, permission] of Object.entries(m.authorization.queries)) {
			if (!m.owns.queries.includes(/** @type {never} */ (op))) {
				errors.push(
					`authorization query map references undeclared query: ${op}`,
				);
			}
			if (!m.permissions.codes.includes(/** @type {never} */ (permission))) {
				errors.push(
					`authorization maps to undeclared permission: ${permission} (${op})`,
				);
			}
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 */
export function validateEvents(manifests) {
	/** @type {string[]} */
	const errors = [];
	const events = new Map();
	for (const m of manifests) {
		for (const id of m.events.emits) {
			if (events.has(id)) {
				errors.push(
					`duplicate event id: ${id} (${events.get(id)} and ${m.id})`,
				);
			} else {
				events.set(id, m.id);
			}
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 * @param {ReadonlySet<string>} platformPermissionCodes
 */
export function validatePermissions(manifests, platformPermissionCodes) {
	/** @type {string[]} */
	const errors = [];
	const codes = new Map();
	for (const m of manifests) {
		for (const code of m.permissions.codes) {
			if (codes.has(code)) {
				errors.push(
					`duplicate permission code: ${code} (${codes.get(code)} and ${m.id})`,
				);
			} else {
				codes.set(code, m.id);
			}
			if (!platformPermissionCodes.has(code)) {
				errors.push(
					`permission code not in platform catalog: ${code} (module ${m.id})`,
				);
			}
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 * @param {{ id: string }[]} roadmapModules
 */
export function validateModuleReferences(manifests, roadmapModules) {
	/** @type {string[]} */
	const errors = [];
	const known = new Set([
		...manifests.map((m) => m.id),
		...roadmapModules.map((m) => m.id),
	]);
	for (const m of manifests) {
		for (const dep of m.moduleDependencies.required) {
			if (!known.has(dep)) {
				errors.push(`unresolved moduleId: ${dep} (required by ${m.id})`);
			}
		}
		for (const row of m.optionalIntegratesWith) {
			if (!known.has(row.moduleId)) {
				errors.push(
					`unresolved moduleId: ${row.moduleId} (optionalIntegratesWith of ${m.id})`,
				);
			}
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 */
export function validateDependencyDag(manifests) {
	/** @type {string[]} */
	const errors = [];
	const byId = new Map(manifests.map((m) => [m.id, m]));
	/** @type {Map<string, number>} */
	const visiting = new Map();

	/**
	 * @param {string} id
	 * @param {string[]} stack
	 */
	function visit(id, stack) {
		const state = visiting.get(id) ?? 0;
		if (state === 1) {
			errors.push(`DAG cycle involving moduleId: ${[...stack, id].join(" → ")}`);
			return;
		}
		if (state === 2) {
			return;
		}
		visiting.set(id, 1);
		const mod = byId.get(id);
		if (mod) {
			for (const dep of mod.moduleDependencies.required) {
				if (byId.has(dep)) {
					visit(dep, [...stack, id]);
				}
			}
		}
		visiting.set(id, 2);
	}

	for (const m of manifests) {
		visit(m.id, []);
	}
	return errors;
}

/**
 * @param {string} root
 * @param {string} edgeRegisterPath
 */
export function validateWorkspaceEdges(root, edgeRegisterPath) {
	/** @type {string[]} */
	const errors = [];
	const raw = readFileSync(edgeRegisterPath, "utf8");
	const doc = parseYaml(raw);
	const edges = Array.isArray(doc?.edges) ? doc.edges : [];
	/** @type {string[]} */
	const approved = [];
	for (const edge of edges) {
		if (edge?.status === "approved" && edge.from && edge.to) {
			approved.push(`${edge.from}→${edge.to}`);
		}
	}

	const packageDirs = listPackageDirs(root);
	/** @type {Map<string, Set<string>>} */
	const realized = new Map();

	for (const dir of packageDirs) {
		const pkgPath = join(root, "packages", dir, "package.json");
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
		const name = pkg.name;
		if (typeof name !== "string" || !name.startsWith("@afenda/")) {
			continue;
		}
		const deps = {
			...(pkg.dependencies ?? {}),
			...(pkg.optionalDependencies ?? {}),
		};
		const targets = new Set();
		for (const dep of Object.keys(deps)) {
			if (!dep.startsWith("@afenda/")) {
				continue;
			}
			if (WORKSPACE_EDGE_IGNORE_TO.has(dep)) {
				continue;
			}
			targets.add(dep);
		}
		realized.set(name, targets);
	}

	return reconcileWorkspaceEdges({
		approved,
		realized,
		erpPackages: LIVING_ERP_MANIFEST_PACKAGES.map((p) => p.packageName),
		governedOnly: true,
	});
}

/**
 * Living ERP packages must ship package authorization ports and web
 * composition-root adapters (Phase 2 operating law §4).
 *
 * @param {string} root
 */
export function validateErpAuthorizationPorts(root) {
	/** @type {string[]} */
	const errors = [];
	for (const meta of LIVING_ERP_MANIFEST_PACKAGES) {
		const packageAuth = join(meta.dir, "src", "authorization.ts");
		if (!existsSync(join(root, packageAuth))) {
			errors.push(`missing ERP authorization.ts: ${packageAuth}`);
		}
		const webPort = join(
			"apps",
			"web",
			"lib",
			"erp",
			`${meta.id}-authorization-port.ts`,
		);
		if (!existsSync(join(root, webPort))) {
			errors.push(`missing ERP authorization-port: ${webPort}`);
		}
	}
	return errors;
}

/**
 * @param {string} root
 */
export function validateDeepImports(root) {
	/** @type {string[]} */
	const errors = [];
	const deep = /from\s+["']@afenda\/[^"']+\/src\//;
	const scanRoots = [
		join(root, "packages"),
		join(root, "apps", "web"),
	];
	for (const scanRoot of scanRoots) {
		if (!existsSync(scanRoot)) {
			continue;
		}
		for (const file of walkTsFiles(scanRoot)) {
			const text = readFileSync(file, "utf8");
			if (deep.test(text)) {
				errors.push(
					`deep @afenda/*/src/* import: ${relative(root, file).replaceAll("\\", "/")}`,
				);
			}
		}
	}
	return errors;
}

/**
 * @param {string} root
 * @param {AfendaModuleManifest[]} manifests
 */
export function validateForeignSchemaImports(root, manifests) {
	/** @type {string[]} */
	const errors = [];
	const tableOwner = new Map();
	for (const m of manifests) {
		for (const table of m.persistence.mutationTables) {
			tableOwner.set(table, m.id);
		}
	}
	const pkgByDir = new Map(
		LIVING_ERP_MANIFEST_PACKAGES.map((p) => [p.dir, p]),
	);

	for (const meta of LIVING_ERP_MANIFEST_PACKAGES) {
		const srcDir = join(root, meta.dir, "src");
		const manifest = manifests.find((m) => m.id === meta.id);
		if (!manifest) {
			continue;
		}
		const owned = new Set(manifest.persistence.mutationTables);
		for (const file of walkTsFiles(srcDir)) {
			if (file.endsWith("module.manifest.ts")) {
				continue;
			}
			const text = readFileSync(file, "utf8");
			const importMatch = text.matchAll(
				/import\s*\{([^}]+)\}\s*from\s*["']@afenda\/db["']/g,
			);
			for (const match of importMatch) {
				const names = match[1]
					.split(",")
					.map((s) => s.trim().split(/\s+as\s+/)[0]?.trim())
					.filter(Boolean);
				for (const name of names) {
					if (!Object.hasOwn(SCHEMA_SYMBOL_TO_TABLE, name)) {
						continue;
					}
					if (PLATFORM_SCHEMA_SYMBOLS.has(name)) {
						continue;
					}
					if (REF_SCHEMA_SYMBOLS.has(name) && meta.id === "master-data") {
						continue;
					}
					const table = SCHEMA_SYMBOL_TO_TABLE[name];
					if (owned.has(table)) {
						continue;
					}
					const owner = tableOwner.get(table);
					if (owner && owner !== meta.id) {
						errors.push(
							`foreign DB schema write-surface import: ${relative(root, file).replaceAll("\\", "/")} imports ${name} (owned by ${owner})`,
						);
					} else if (!owned.has(table) && !REF_SCHEMA_SYMBOLS.has(name)) {
						errors.push(
							`foreign DB schema write-surface import: ${relative(root, file).replaceAll("\\", "/")} imports ${name} (not in ${meta.id} mutationTables)`,
						);
					}
				}
			}
		}
	}

	void pkgByDir;
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 * @param {ReadonlySet<string>} knownTables
 */
export function validateMutationTablesExist(manifests, knownTables) {
	/** @type {string[]} */
	const errors = [];
	for (const m of manifests) {
		for (const table of m.persistence.mutationTables) {
			if (!knownTables.has(table)) {
				errors.push(
					`mutation table missing from @afenda/db DDL: ${table} (module ${m.id})`,
				);
			}
		}
	}
	return errors;
}

/**
 * @param {AfendaModuleManifest[]} manifests
 * @param {ReadonlySet<string>} knownEvents
 */
export function validateEventContracts(manifests, knownEvents) {
	/** @type {string[]} */
	const errors = [];
	for (const m of manifests) {
		for (const id of m.events.emits) {
			if (!knownEvents.has(id)) {
				errors.push(
					`emitted event not in @afenda/events contracts: ${id} (module ${m.id})`,
				);
			}
		}
		for (const id of m.events.consumes) {
			if (!knownEvents.has(id)) {
				errors.push(
					`consumed event not in @afenda/events contracts: ${id} (module ${m.id})`,
				);
			}
		}
	}
	return errors;
}

/**
 * Pure dual-control edge reconcile — used by Living validate + negative fixtures.
 * @param {{
 *   approved: Iterable<string>,
 *   realized: Map<string, Set<string>>,
 *   erpPackages: Iterable<string>,
 *   governedOnly?: boolean,
 * }} input
 */
export function reconcileWorkspaceEdges(input) {
	/** @type {string[]} */
	const errors = [];
	const approved = new Set(input.approved);
	const erpPackages = new Set(input.erpPackages);
	const governedFrom = input.governedOnly === false
		? new Set([...input.realized.keys()])
		: new Set([...approved].map((key) => key.split("→")[0]).filter(Boolean));

	for (const [from, targets] of input.realized) {
		if (!governedFrom.has(from)) {
			continue;
		}
		for (const to of targets) {
			const key = `${from}→${to}`;
			if (!approved.has(key)) {
				errors.push(`undeclared workspace dependency: ${key}`);
			}
		}
	}

	for (const key of approved) {
		const [from, to] = key.split("→");
		const targets = input.realized.get(from);
		if (!targets || !targets.has(to)) {
			errors.push(`approved edge missing from package.json: ${key}`);
		}
	}

	for (const [from, targets] of input.realized) {
		if (!erpPackages.has(from)) {
			continue;
		}
		for (const to of targets) {
			if (!erpPackages.has(to) || to === from) {
				continue;
			}
			const key = `${from}→${to}`;
			if (!approved.has(key)) {
				errors.push(`peer ERP import without approved edge: ${key}`);
			}
		}
	}

	return errors;
}

/**
 * @param {string} root
 * @param {{ id: string }[]} roadmapModules
 */
export function validateCandidatePackagesAbsent(root, roadmapModules) {
	/** @type {Set<string>} */
	const errors = new Set();
	const livingIds = new Set(LIVING_ERP_MANIFEST_PACKAGES.map((p) => p.id));
	const packageDirs = listPackageDirs(root);
	const packageLeafNames = new Set(
		packageDirs.map((rel) => rel.split(/[/\\]/).at(-1) ?? rel),
	);

	/**
	 * @param {string} name
	 */
	function flagCandidate(name) {
		if (packageLeafNames.has(name) || existsSync(join(root, "packages", name))) {
			errors.add(
				`candidate module represented as an on-disk package: packages/${name}`,
			);
		}
	}

	for (const name of FORBIDDEN_PHASE_PACKAGE_DIRS) {
		flagCandidate(name);
	}
	for (const row of roadmapModules) {
		if (livingIds.has(row.id)) {
			continue;
		}
		flagCandidate(row.id);
	}
	return [...errors];
}

/**
 * Relative package dirs under packages/ (one-level category nesting).
 * Examples: `foundation/env`, `erp/sales`.
 *
 * @param {string} root
 * @returns {string[]}
 */
function listPackageDirs(root) {
	const packagesRoot = join(root, "packages");
	if (!existsSync(packagesRoot)) {
		return [];
	}
	/** @type {string[]} */
	const out = [];
	for (const entry of readdirSync(packagesRoot)) {
		const full = join(packagesRoot, entry);
		if (!statSync(full).isDirectory()) {
			continue;
		}
		if (existsSync(join(full, "package.json"))) {
			out.push(entry);
			continue;
		}
		for (const child of readdirSync(full)) {
			const childFull = join(full, child);
			if (
				statSync(childFull).isDirectory() &&
				existsSync(join(childFull, "package.json"))
			) {
				out.push(`${entry}/${child}`);
			}
		}
	}
	return out;
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walkTsFiles(dir) {
	/** @type {string[]} */
	const out = [];
	if (!existsSync(dir)) {
		return out;
	}
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (
				entry.name === "node_modules" ||
				entry.name === "dist" ||
				entry.name === ".turbo"
			) {
				continue;
			}
			out.push(...walkTsFiles(full));
			continue;
		}
		if (entry.isFile() && /\.(ts|tsx|mts|cts)$/.test(entry.name)) {
			out.push(full);
		}
	}
	return out;
}

/**
 * @param {string} roadmapPath
 */
export function loadRoadmapModules(roadmapPath) {
	const doc = parseYaml(readFileSync(roadmapPath, "utf8"));
	const modules = Array.isArray(doc?.modules) ? doc.modules : [];
	return modules
		.filter((m) => m && typeof m.id === "string")
		.map((m) => ({ id: m.id }));
}

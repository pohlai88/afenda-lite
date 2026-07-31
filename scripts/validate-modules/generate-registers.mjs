/**
 * Phase 2 — generate MODULE registers from on-disk ERP manifests.
 * Authority: docs-V2/monorepo · LAYERS · packages_refactor_v2.3 accepted reference.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";

export { dirname } from "node:path";

const TABLE_AGGREGATE_BY_TABLE = new Map([
	["ca_legal_company", "legal_company"],
	["ca_company_jurisdiction_profile", "legal_company"],
	["ca_company_name", "legal_company"],
	["ca_company_legal_form_history", "legal_company"],
	["ca_company_identifier", "legal_company"],
	["ca_company_financial_year", "legal_company"],
	["ca_company_activity", "legal_company"],
]);

/**
 * @typedef {import("@afenda/db/module-manifest").AfendaModuleManifest} AfendaModuleManifest
 */

/**
 * @param {AfendaModuleManifest[]} manifests
 * @param {string} modulesDir
 * @param {{ write: boolean }} options
 */
export function buildGeneratedRegisters(manifests, modulesDir, options) {
	const sorted = [...manifests].sort((a, b) => a.id.localeCompare(b.id));
	const generatedAt = "phase-2/2026-07-20";

	const catalog = {
		version: generatedAt,
		source: "on-disk-module-manifests",
		modules: sorted.map((m) => ({
			id: m.id,
			packageName: m.packageName,
			category: m.category,
			band: m.band,
			lifecycle: m.lifecycle,
			activationMode: m.activationMode,
			aggregates: [...m.owns.aggregates],
		})),
	};

	const dependency = {
		version: generatedAt,
		source: "on-disk-module-manifests",
		modules: sorted.map((m) => ({
			id: m.id,
			required: [...m.moduleDependencies.required],
			optionalIntegratesWith: m.optionalIntegratesWith.map((row) => ({
				moduleId: row.moduleId,
				style: row.style,
			})),
		})),
	};

	const tableOwnership = {
		version: generatedAt,
		source: "on-disk-module-manifests",
		tables: sorted.flatMap((m) =>
			m.persistence.mutationTables.map((table) => {
				const aggregate = TABLE_AGGREGATE_BY_TABLE.get(table);
				return {
					table,
					moduleId: m.id,
					packageName: m.packageName,
					schemaOwner: m.persistence.schemaOwner,
					...(aggregate ? { aggregate } : {}),
				};
			}),
		),
	};

	const commandRegister = {
		version: generatedAt,
		source: "on-disk-module-manifests",
		commands: sorted.flatMap((m) =>
			m.owns.commands.map((id) => ({
				id,
				moduleId: m.id,
				permission: m.authorization.commands[id] ?? null,
			})),
		),
	};

	const queryRegister = {
		version: generatedAt,
		source: "on-disk-module-manifests",
		queries: sorted.flatMap((m) =>
			m.owns.queries.map((id) => ({
				id,
				moduleId: m.id,
				permission: m.authorization.queries[id] ?? null,
			})),
		),
	};

	const eventRegister = {
		version: generatedAt,
		source: "on-disk-module-manifests",
		events: sorted.flatMap((m) =>
			m.events.emits.map((id) => ({
				id,
				moduleId: m.id,
				direction: "emits",
			})),
		),
	};

	const permissionRegister = {
		version: generatedAt,
		source: "on-disk-module-manifests",
		permissions: sorted.flatMap((m) =>
			m.permissions.codes.map((code) => ({
				code,
				moduleId: m.id,
				namespace: m.permissions.namespace,
			})),
		),
	};

	const files = {
		"MODULE-CATALOG.generated.yaml": catalog,
		"MODULE-DEPENDENCY.generated.yaml": dependency,
		"TABLE-OWNERSHIP.generated.yaml": tableOwnership,
		"COMMAND-REGISTER.generated.yaml": commandRegister,
		"QUERY-REGISTER.generated.yaml": queryRegister,
		"EVENT-REGISTER.generated.yaml": eventRegister,
		"PERMISSION-REGISTER.generated.yaml": permissionRegister,
	};

	/** @type {Record<string, string>} */
	const rendered = {};
	for (const [name, doc] of Object.entries(files)) {
		rendered[name] =
			"# GENERATED — do not edit by hand. Source: ERP module.manifest.ts\n" +
			"# Regenerate: pnpm validate:modules --write\n" +
			stringifyYaml(doc, { lineWidth: 100, sortMapEntries: true });
	}

	if (options.write) {
		mkdirSync(modulesDir, { recursive: true });
		for (const [name, body] of Object.entries(rendered)) {
			writeFileSync(join(modulesDir, name), body, "utf8");
		}
	}

	return rendered;
}

/**
 * @param {string} modulesDir
 * @param {Record<string, string>} rendered
 * @param {(path: string) => string | null} readText
 */
export function diffGeneratedRegisters(modulesDir, rendered, readText) {
	/** @type {string[]} */
	const drifts = [];
	for (const [name, expected] of Object.entries(rendered)) {
		const path = join(modulesDir, name);
		const actual = readText(path);
		if (actual === null) {
			drifts.push(`missing generated register: ${name}`);
			continue;
		}
		if (normalizeYamlText(actual) !== normalizeYamlText(expected)) {
			drifts.push(`manifest/register drift: ${name}`);
		}
	}
	return drifts;
}

/** @param {string} text */
function normalizeYamlText(text) {
	return `${text.replace(/\r\n/g, "\n").trimEnd()}\n`;
}

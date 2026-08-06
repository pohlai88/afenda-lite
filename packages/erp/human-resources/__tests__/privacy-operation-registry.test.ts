import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { humanResourcesModuleManifest } from "../src/composition/module.manifest";
import {
	HUMAN_RESOURCES_PRIVACY_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_PRIVACY_COMMANDS,
	HUMAN_RESOURCES_PRIVACY_QUERIES,
	HUMAN_RESOURCES_PRIVACY_QUERY_AUTHORIZATION,
} from "../src/features/privacy/operation-registry";
import { HUMAN_RESOURCES_PRIVACY_EXPORT_STORE_METHODS } from "../src/features/privacy/store";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/kernel/authorization/registry";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/kernel/emissions/registry";
import {
	HUMAN_RESOURCES_PRIVACY_COMMAND_IDS,
	HUMAN_RESOURCES_PRIVACY_QUERY_IDS,
} from "../src/kernel/operations/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/kernel/operations/registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_PRIVACY_COMMANDS),
	...Object.values(HUMAN_RESOURCES_PRIVACY_QUERIES),
];
const source = (relativePath: string) =>
	readFileSync(path.resolve(import.meta.dirname, `../${relativePath}`), "utf8");

describe("Privacy operation registry", () => {
	it("owns every public privacy operation exactly once", () => {
		expect(definitions).toHaveLength(9);
		expect(new Set(definitions.map(({ id }) => id)).size).toBe(9);
		expect(new Set(definitions.map(({ publicName }) => publicName)).size).toBe(
			9,
		);
		const facade = source("src/facade/capabilities.ts");
		for (const definition of definitions) {
			expect(definition.owner).toBe("privacy");
			expect(facade).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("derives IDs, authorization, emissions, and central composition", () => {
		expect(HUMAN_RESOURCES_PRIVACY_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_PRIVACY_COMMANDS).map(({ id }) => id),
		);
		expect(HUMAN_RESOURCES_PRIVACY_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_PRIVACY_QUERIES).map(({ id }) => id),
		);
		for (const id of HUMAN_RESOURCES_PRIVACY_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				id,
			);
		}
		for (const [id, permission] of Object.entries(
			HUMAN_RESOURCES_PRIVACY_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(id, permission);
		}
		for (const [id, permission] of Object.entries(
			HUMAN_RESOURCES_PRIVACY_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				id,
				permission,
			);
		}
		const registered = new Set(
			HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.map(({ id }) => id),
		);
		for (const { id } of definitions) {
			expect(registered).toContain(id);
		}
	});

	it("declares the complete privacy-export read projection once", () => {
		expect(HUMAN_RESOURCES_PRIVACY_EXPORT_STORE_METHODS).toHaveLength(28);
		expect(new Set(HUMAN_RESOURCES_PRIVACY_EXPORT_STORE_METHODS).size).toBe(28);
		const collector = source("src/features/privacy/subject-data-collector.ts");
		for (const method of HUMAN_RESOURCES_PRIVACY_EXPORT_STORE_METHODS) {
			expect(collector).toContain(`input.store.${method}`);
		}
	});
});

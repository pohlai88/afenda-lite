import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/emissions/registry";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import {
	HUMAN_RESOURCES_PRIVACY_COMMAND_IDS,
	HUMAN_RESOURCES_PRIVACY_QUERY_IDS,
} from "../src/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/operation-registry/registry";
import {
	HUMAN_RESOURCES_PRIVACY_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_PRIVACY_COMMANDS,
	HUMAN_RESOURCES_PRIVACY_QUERIES,
	HUMAN_RESOURCES_PRIVACY_QUERY_AUTHORIZATION,
} from "../src/privacy/operation-registry";
import { HUMAN_RESOURCES_PRIVACY_EXPORT_STORE_METHODS } from "../src/privacy/store";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_PRIVACY_COMMANDS),
	...Object.values(HUMAN_RESOURCES_PRIVACY_QUERIES),
];
const source = (relativePath: string) =>
	readFileSync(path.resolve(import.meta.dirname, `../${relativePath}`), "utf8");

describe("Privacy operation registry", () => {
	it("owns every public privacy operation exactly once", () => {
		expect(definitions).toHaveLength(7);
		expect(new Set(definitions.map(({ id }) => id)).size).toBe(7);
		expect(new Set(definitions.map(({ publicName }) => publicName)).size).toBe(
			7,
		);
		const facade = source("src/public-capabilities.ts");
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
		expect(HUMAN_RESOURCES_PRIVACY_EXPORT_STORE_METHODS).toHaveLength(26);
		expect(new Set(HUMAN_RESOURCES_PRIVACY_EXPORT_STORE_METHODS).size).toBe(26);
		const collector = source("src/privacy/subject-data-collector.ts");
		for (const method of HUMAN_RESOURCES_PRIVACY_EXPORT_STORE_METHODS) {
			expect(collector).toContain(`input.store.${method}`);
		}
	});
});

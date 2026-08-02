import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/emissions/registry";
import { humanResourcesModuleManifest } from "../src/module.manifest";
import {
	HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS,
	HUMAN_RESOURCES_PERFORMANCE_QUERY_IDS,
} from "../src/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/operation-registry/registry";
import {
	HUMAN_RESOURCES_PERFORMANCE_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_PERFORMANCE_COMMANDS,
	HUMAN_RESOURCES_PERFORMANCE_QUERIES,
	HUMAN_RESOURCES_PERFORMANCE_QUERY_AUTHORIZATION,
} from "../src/performance/operation-registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/shared/authorization-policy-registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_PERFORMANCE_COMMANDS),
	...Object.values(HUMAN_RESOURCES_PERFORMANCE_QUERIES),
];
const source = (relativePath: string) =>
	readFileSync(path.resolve(import.meta.dirname, `../${relativePath}`), "utf8");
const handlers = [
	"goal.ts",
	"improvement-plan.ts",
	"performance-cycle.ts",
	"review.ts",
].map((file) => source(`src/performance/${file}`));

describe("Performance operation registry", () => {
	it("owns every public operation exactly once", () => {
		expect(definitions).toHaveLength(54);
		expect(new Set(definitions.map(({ id }) => id)).size).toBe(54);
		expect(new Set(definitions.map(({ publicName }) => publicName)).size).toBe(
			54,
		);
		const facade = source("src/public-capabilities.ts");
		for (const definition of definitions) {
			expect(definition.owner).toBe("performance-talent");
			expect(facade).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("derives IDs, authorization, emissions, and central composition", () => {
		expect(HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_PERFORMANCE_COMMANDS).map(({ id }) => id),
		);
		expect(HUMAN_RESOURCES_PERFORMANCE_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_PERFORMANCE_QUERIES).map(({ id }) => id),
		);
		for (const id of HUMAN_RESOURCES_PERFORMANCE_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				id,
			);
		}
		for (const [id, permission] of Object.entries(
			HUMAN_RESOURCES_PERFORMANCE_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(id, permission);
		}
		for (const [id, permission] of Object.entries(
			HUMAN_RESOURCES_PERFORMANCE_QUERY_AUTHORIZATION,
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

	it("gives every operation one exact execution-store declaration", () => {
		expect(
			handlers.reduce(
				(count, body) => count + (body.match(/storeMethods:/g)?.length ?? 0),
				0,
			),
		).toBe(54);
		expect(handlers.join("\n")).not.toContain("HumanResourcesStore");
		expect(source("src/performance/store.ts")).toContain(
			"HumanResourcesPerformanceAuthorizationStore",
		);
	});
});

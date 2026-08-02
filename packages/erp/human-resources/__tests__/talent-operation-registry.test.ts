import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { humanResourcesModuleManifest } from "../src/composition/module.manifest";
import {
	HUMAN_RESOURCES_TALENT_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_TALENT_COMMANDS,
	HUMAN_RESOURCES_TALENT_QUERIES,
	HUMAN_RESOURCES_TALENT_QUERY_AUTHORIZATION,
} from "../src/features/talent/operation-registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/kernel/authorization/registry";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/kernel/emissions/registry";
import {
	HUMAN_RESOURCES_TALENT_COMMAND_IDS,
	HUMAN_RESOURCES_TALENT_QUERY_IDS,
} from "../src/kernel/operations/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/kernel/operations/registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_TALENT_COMMANDS),
	...Object.values(HUMAN_RESOURCES_TALENT_QUERIES),
];
const source = (relativePath: string) =>
	readFileSync(path.resolve(import.meta.dirname, `../${relativePath}`), "utf8");
const handlers = [
	"career-plan.ts",
	"competency.ts",
	"critical-role-readiness.ts",
	"succession-plan.ts",
	"talent-pool.ts",
	"talent-profile-mobility.ts",
	"talent-profile.ts",
].map((file) => source(`src/features/talent/${file}`));

describe("Talent operation registry", () => {
	it("owns every public operation exactly once", () => {
		expect(definitions).toHaveLength(49);
		expect(new Set(definitions.map(({ id }) => id)).size).toBe(49);
		expect(new Set(definitions.map(({ publicName }) => publicName)).size).toBe(
			49,
		);
		const facade = source("src/facade/capabilities.ts");
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
		expect(HUMAN_RESOURCES_TALENT_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_TALENT_COMMANDS).map(({ id }) => id),
		);
		expect(HUMAN_RESOURCES_TALENT_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_TALENT_QUERIES).map(({ id }) => id),
		);
		for (const id of HUMAN_RESOURCES_TALENT_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				id,
			);
		}
		for (const [id, permission] of Object.entries(
			HUMAN_RESOURCES_TALENT_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(id, permission);
		}
		for (const [id, permission] of Object.entries(
			HUMAN_RESOURCES_TALENT_QUERY_AUTHORIZATION,
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
		).toBe(49);
		expect(handlers.join("\n")).not.toContain("HumanResourcesStore");
		expect(source("src/features/talent/store.ts")).toContain(
			"HumanResourcesTalentAuthorizationStore",
		);
	});
});

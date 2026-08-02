import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { humanResourcesModuleManifest } from "../src/composition/module.manifest";
import {
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS,
	HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES,
	HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERY_AUTHORIZATION,
} from "../src/features/workforce-planning/operation-registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/kernel/authorization/registry";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/kernel/emissions/registry";
import {
	HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS,
	HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERY_IDS,
} from "../src/kernel/operations/module-ids";
import { HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS } from "../src/kernel/operations/registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS),
	...Object.values(HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/facade/capabilities.ts"),
	"utf8",
);
const moduleIdsSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/kernel/operations/module-ids.ts"),
	"utf8",
);
const handlerSources = [
	"headcount-plan.ts",
	"headcount-plan-line.ts",
	"headcount-reservation.ts",
].map((fileName) =>
	readFileSync(
		path.resolve(
			import.meta.dirname,
			`../src/features/workforce-planning/${fileName}`,
		),
		"utf8",
	),
);
const runnerSource = readFileSync(
	path.resolve(
		import.meta.dirname,
		"../src/features/workforce-planning/run-operation.ts",
	),
	"utf8",
);

describe("Workforce Planning operation registry", () => {
	it("owns every Workforce Planning operation exactly once", () => {
		expect(definitions).toHaveLength(20);
		expect(new Set(definitions.map((definition) => definition.id)).size).toBe(
			definitions.length,
		);
		expect(
			new Set(definitions.map((definition) => definition.publicName)).size,
		).toBe(definitions.length);

		for (const definition of definitions) {
			expect(definition.owner).toBe("workforce-planning");
			expect(publicCapabilitiesSource).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("derives IDs, authorization, and mutation emission coverage", () => {
		expect(HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERIES).map(
				(definition) => definition.id,
			),
		);

		for (const commandId of HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				commandId,
			);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_WORKFORCE_PLANNING_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_WORKFORCE_PLANNING_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				operationId,
				permission,
			);
		}
	});

	it("composes with all registered capabilities without collisions", () => {
		expect(
			new Set(
				HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.map(
					(definition) => definition.id,
				),
			).size,
		).toBe(HUMAN_RESOURCES_REGISTERED_OPERATION_DEFINITIONS.length);
	});

	it("confines handlers to exact Workforce Planning store projections", () => {
		const source = handlerSources.join("\n");
		const storeProjectionCount = handlerSources.reduce(
			(count, handlerSource) =>
				count + (handlerSource.match(/storeMethods:/g)?.length ?? 0),
			0,
		);

		expect(storeProjectionCount).toBe(17);
		expect(source).not.toContain("HumanResourcesStore");
		expect(source).not.toContain("runWorkforcePlanningCommand");
		expect(source).not.toContain("runWorkforcePlanningQuery");
		expect(runnerSource).toMatch(
			/Pick<\s*HumanResourcesWorkforcePlanningCapabilityStore,\s*TMethods\[number\]\s*>/,
		);
		expect(runnerSource).not.toContain("HumanResourcesStore");
		expect(moduleIdsSource).not.toMatch(
			/human-resources\.(?:headcount-plan|headcount-plan-line|headcount|headcount-reservation|recruitment\.headcount-handoff|workforce-plan)\./,
		);
	});
});

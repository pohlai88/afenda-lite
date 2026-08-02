import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { humanResourcesModuleManifest } from "../src/composition/module.manifest";
import {
	HUMAN_RESOURCES_OVERTIME_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_OVERTIME_COMMAND_IDS,
	HUMAN_RESOURCES_OVERTIME_COMMANDS,
	HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERIES,
	HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERY_AUTHORIZATION,
	HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERY_IDS,
} from "../src/features/time/operation-registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/kernel/authorization/registry";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/kernel/emissions/registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_OVERTIME_COMMANDS),
	...Object.values(HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/facade/capabilities.ts"),
	"utf8",
);
const handlerSource = [
	readFileSync(
		path.resolve(import.meta.dirname, "../src/features/time/overtime.ts"),
		"utf8",
	),
	readFileSync(
		path.resolve(
			import.meta.dirname,
			"../src/features/time/handoff/approved-time-handoff.ts",
		),
		"utf8",
	),
].join("\n");
const moduleIdsSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/kernel/operations/module-ids.ts"),
	"utf8",
);

describe("overtime and approved-time handoff operation registry", () => {
	it("owns each operation exactly once with valid policy resolution", () => {
		expect(definitions).toHaveLength(10);
		expect(new Set(definitions.map((definition) => definition.id)).size).toBe(
			definitions.length,
		);

		for (const definition of definitions) {
			expect(definition.owner).toBe("time-attendance");
			expect(publicCapabilitiesSource).toMatch(
				new RegExp(`export const ${definition.publicName}\\s*=`),
			);
			expect(resolveHumanResourcesAuthorizationPolicy(definition.id).id).toBe(
				definition.authorizationPolicy,
			);
		}
	});

	it("derives ids, authorization, and command emission coverage", () => {
		expect(HUMAN_RESOURCES_OVERTIME_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_OVERTIME_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERIES).map(
				(definition) => definition.id,
			),
		);
		for (const commandId of HUMAN_RESOURCES_OVERTIME_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				commandId,
			);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_OVERTIME_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_OVERTIME_HANDOFF_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				operationId,
				permission,
			);
		}
	});

	it("confines every operation to an exact store projection", () => {
		expect(handlerSource.match(/storeMethods:/g)).toHaveLength(
			definitions.length,
		);
		expect(handlerSource).not.toContain("HumanResourcesStore");
		expect(handlerSource).not.toContain("runTimeCommand");
		expect(handlerSource).not.toContain("runTimeQuery");
		expect(moduleIdsSource).not.toContain("human-resources.overtime-request.");
		expect(moduleIdsSource).not.toContain(
			"human-resources.approved-time-handoff.",
		);
	});
});

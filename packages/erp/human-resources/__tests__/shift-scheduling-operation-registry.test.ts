import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { humanResourcesModuleManifest } from "../src/composition/module.manifest";
import {
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMAND_IDS,
	HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS,
	HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES,
	HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERY_AUTHORIZATION,
	HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERY_IDS,
} from "../src/features/time/operation-registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/kernel/authorization/registry";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/kernel/emissions/registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS),
	...Object.values(HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/facade/capabilities.ts"),
	"utf8",
);
const shiftSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/features/time/shift.ts"),
	"utf8",
);
const schedulingSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/features/time/scheduling.ts"),
	"utf8",
);
const moduleIdsSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/kernel/operations/module-ids.ts"),
	"utf8",
);

describe("shift and scheduling operation registry", () => {
	it("owns each canonical operation exactly once with valid policy resolution", () => {
		expect(definitions).toHaveLength(20);
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
		expect(HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERIES).map(
				(definition) => definition.id,
			),
		);

		for (const commandId of HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				commandId,
			);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_SHIFT_SCHEDULING_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_SHIFT_SCHEDULING_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				operationId,
				permission,
			);
		}
	});

	it("gives segment listing its own canonical query contract", () => {
		expect(publicCapabilitiesSource).toMatch(
			/export const listShiftAssignmentSegments\s*=/,
		);
		expect(schedulingSource).toMatch(
			/listShiftAssignmentSegments[\s\S]*?query:\s*HUMAN_RESOURCES_QUERY_SHIFT_ASSIGNMENT_SEGMENTS_LIST/,
		);
	});

	it("confines every callable to an exact store projection", () => {
		expect(shiftSource.match(/storeMethods:/g)).toHaveLength(10);
		expect(schedulingSource.match(/storeMethods:/g)).toHaveLength(10);
		expect(`${shiftSource}${schedulingSource}`).not.toContain(
			"HumanResourcesStore",
		);
		expect(`${shiftSource}${schedulingSource}`).not.toContain("runTimeCommand");
		expect(`${shiftSource}${schedulingSource}`).not.toContain("runTimeQuery");
		expect(moduleIdsSource).not.toContain("human-resources.shift.");
		expect(moduleIdsSource).not.toContain("human-resources.shift-assignment.");
	});
});

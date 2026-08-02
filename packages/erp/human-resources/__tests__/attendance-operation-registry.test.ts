import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { humanResourcesModuleManifest } from "../src/composition/module.manifest";
import {
	HUMAN_RESOURCES_ATTENDANCE_COMMAND_AUTHORIZATION,
	HUMAN_RESOURCES_ATTENDANCE_COMMAND_IDS,
	HUMAN_RESOURCES_ATTENDANCE_COMMANDS,
	HUMAN_RESOURCES_ATTENDANCE_QUERIES,
	HUMAN_RESOURCES_ATTENDANCE_QUERY_AUTHORIZATION,
	HUMAN_RESOURCES_ATTENDANCE_QUERY_IDS,
} from "../src/features/time/operation-registry";
import { resolveHumanResourcesAuthorizationPolicy } from "../src/kernel/authorization/registry";
import { HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD } from "../src/kernel/emissions/registry";

const definitions = [
	...Object.values(HUMAN_RESOURCES_ATTENDANCE_COMMANDS),
	...Object.values(HUMAN_RESOURCES_ATTENDANCE_QUERIES),
];
const publicCapabilitiesSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/facade/capabilities.ts"),
	"utf8",
);
const attendanceSources = [
	"events.ts",
	"import.ts",
	"sessions.ts",
	"break-waivers.ts",
	"exceptions.ts",
	"summary.ts",
].map((fileName) =>
	readFileSync(
		path.resolve(
			import.meta.dirname,
			`../src/features/time/attendance/${fileName}`,
		),
		"utf8",
	),
);
const moduleIdsSource = readFileSync(
	path.resolve(import.meta.dirname, "../src/kernel/operations/module-ids.ts"),
	"utf8",
);

describe("attendance operation registry", () => {
	it("owns each canonical operation exactly once with valid policy resolution", () => {
		expect(definitions).toHaveLength(26);
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
		expect(HUMAN_RESOURCES_ATTENDANCE_COMMAND_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_ATTENDANCE_COMMANDS).map(
				(definition) => definition.id,
			),
		);
		expect(HUMAN_RESOURCES_ATTENDANCE_QUERY_IDS).toEqual(
			Object.values(HUMAN_RESOURCES_ATTENDANCE_QUERIES).map(
				(definition) => definition.id,
			),
		);

		for (const commandId of HUMAN_RESOURCES_ATTENDANCE_COMMAND_IDS) {
			expect(HUMAN_RESOURCES_MUTATION_EMISSION_REGISTRY_RECORD).toHaveProperty(
				commandId,
			);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_ATTENDANCE_COMMAND_AUTHORIZATION,
		)) {
			expect(
				humanResourcesModuleManifest.authorization.commands,
			).toHaveProperty(operationId, permission);
		}
		for (const [operationId, permission] of Object.entries(
			HUMAN_RESOURCES_ATTENDANCE_QUERY_AUTHORIZATION,
		)) {
			expect(humanResourcesModuleManifest.authorization.queries).toHaveProperty(
				operationId,
				permission,
			);
		}
	});

	it("gives each attendance recording convenience a canonical operation identity", () => {
		for (const publicName of [
			"recordClockIn",
			"recordClockOut",
			"recordBreakStart",
			"recordBreakEnd",
			"recordManualAttendance",
		]) {
			expect(publicCapabilitiesSource).toMatch(
				new RegExp(`export const ${publicName}\\s*=`),
			);
		}
		expect(attendanceSources[0]?.match(/storeMethods:/g)).toHaveLength(8);
		for (const commandConstant of [
			"HUMAN_RESOURCES_COMMAND_ATTENDANCE_CLOCK_IN",
			"HUMAN_RESOURCES_COMMAND_ATTENDANCE_CLOCK_OUT",
			"HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_START",
			"HUMAN_RESOURCES_COMMAND_ATTENDANCE_BREAK_END",
			"HUMAN_RESOURCES_COMMAND_ATTENDANCE_MANUAL_RECORD",
		]) {
			expect(attendanceSources[0]).toContain(`command: ${commandConstant}`);
		}
	});

	it("confines every callable to an exact store projection", () => {
		const source = attendanceSources.join("\n");
		expect(source.match(/storeMethods:/g)).toHaveLength(23);
		expect(source).not.toContain("HumanResourcesStore");
		expect(source).not.toContain("runTimeCommand");
		expect(source).not.toContain("runTimeQuery");
		expect(moduleIdsSource).not.toMatch(/human-resources\.attendance(?:-|\.)/);
	});
});
